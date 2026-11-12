import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { subjects, courses, blocks, coursesForSubject, blocksForSubject, searchCourses } from '../site/knowledge-catalog.mjs';

const ids = items => items.map(item => item.id);
const catalog = new Map(courses.map(course => [course.id, course]));

function checkGraph(nodeIds, edges) {
  const neighbors = new Map(nodeIds.map(id => [id, []]));
  assert.equal(neighbors.size, nodeIds.length, 'node IDs are unique');
  for (const edge of edges) {
    assert.ok(neighbors.has(edge.from) && neighbors.has(edge.to), `Unknown endpoint on ${edge.from} → ${edge.to}`);
    assert.ok(['required', 'recommended'].includes(edge.kind));
    assert.ok(edge.reason.trim(), 'prerequisites explain which knowledge will be used');
    const next = neighbors.get(edge.from);
    assert.ok(!next.includes(edge.to), `Duplicate edge ${edge.from} → ${edge.to}`);
    next.push(edge.to);
  }
  const visited = new Set();
  const visiting = new Set();
  function checkNode(id) {
    if (visited.has(id)) return;
    assert.ok(!visiting.has(id), `Prerequisite cycle at ${id}`);
    visiting.add(id);
    for (const next of neighbors.get(id)) checkNode(next);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of nodeIds) checkNode(id);
}

test('one canonical course belongs to one to three real subjects, including cross-listed courses and deliberately empty subjects', () => {
  assert.equal(catalog.size, courses.length);
  assert.equal(new Set(ids(subjects)).size, subjects.length);
  for (const course of courses) {
    assert.ok(course.subjectIds.length >= 1 && course.subjectIds.length <= 3);
    assert.equal(new Set(course.subjectIds).size, course.subjectIds.length);
    for (const id of course.subjectIds) {
      assert.ok(subjects.some(subject => subject.id === id));
      assert.ok(coursesForSubject(id).includes(course));
    }
  }
  assert.ok(coursesForSubject('computing').includes(catalog.get('agent')));
  assert.ok(coursesForSubject('ai').includes(catalog.get('agent')));
  assert.deepEqual(coursesForSubject('physics'), []);
  assert.deepEqual(blocksForSubject('physics'), []);
});

test('block and lesson DAGs have valid endpoints and explain directed relationships consistently across blocks', () => {
  assert.equal(new Set(ids(blocks)).size, blocks.length);
  const sharedEdges = new Map();
  const coverage = new Set();
  for (const group of blocks) {
    for (const subject of group.subjectIds) assert.ok(ids(subjects).includes(subject));
    for (const id of group.courseIds) {
      assert.ok(catalog.has(id));
      coverage.add(id);
    }
    checkGraph(group.courseIds, group.edges);
    for (const edge of group.edges) {
      const key = `${edge.from}/${edge.to}`;
      if (sharedEdges.has(key)) assert.deepEqual(edge, sharedEdges.get(key));
      sharedEdges.set(key, edge);
    }
  }
  assert.deepEqual(coverage, new Set(catalog.keys()));
  checkGraph(ids(courses), [...sharedEdges.values()]);
  for (const course of courses) checkGraph(ids(course.lessons), course.lessonEdges);
  assert.ok(blocksForSubject('ai').some(group => group.id === 'foundations'));
});

test('catalogue states lead to distinct real activities, external material or a visibly empty planned course', () => {
  const legacyNodes = JSON.parse(readFileSync(new URL('../site/data/atlas.json', import.meta.url))).nodes;
  const localActivities = new Set(['#/learn/agent', '#/lab/agent', '#/learn/kl', '#/lab/kl', '#/learn/micrograd']);
  const microgradSource = readFileSync(new URL('../site/micrograd-view.mjs', import.meta.url), 'utf8');
  for (const course of courses) {
    if (course.status === 'planned') {
      assert.equal(course.source, null);
      assert.deepEqual(course.lessons, []);
      continue;
    }
    assert.ok(course.lessons.length && course.source.url.startsWith('https://'));
    assert.equal(new Set(course.lessons.map(item => item.href)).size, course.lessons.length);
    const local = course.lessons.filter(item => item.status === 'available');
    assert.equal(course.status, local.length ? 'available' : 'external');
    for (const item of course.lessons) {
      if (item.href.startsWith('https://')) {
        assert.equal(item.status, 'external');
      } else if (item.href.startsWith('#/atlas/node/')) {
        assert.ok(legacyNodes.some(node => item.href === `#/atlas/node/${node.id}`));
      } else {
        const [route, query] = item.href.split('?');
        assert.ok(localActivities.has(route), route);
        if (query) {
          const section = new URLSearchParams(query).get('section');
          assert.equal(route, '#/learn/micrograd');
          assert.ok(section && microgradSource.includes(`id="${section}"`));
        }
      }
    }
  }
});

test('search is subject-scoped, normalizes full-width Latin characters, and can find original course codes or lesson topics', () => {
  assert.deepEqual(ids(searchCourses('  ＫＬ  ')), ['kl']);
  assert.deepEqual(ids(searchCourses('CS329Z Agent')), ['agent']);
  assert.deepEqual(searchCourses('AI'), coursesForSubject('ai'));
  assert.deepEqual(ids(searchCourses('量化 回测', 'finance')), ['backtesting']);
  assert.deepEqual(ids(searchCourses('MIT 18.06', 'math')), ['linear-algebra']);
  assert.deepEqual(searchCourses('CS329Z', 'finance'), []);
  assert.deepEqual(searchCourses('  ', 'computing'), coursesForSubject('computing'));
  assert.deepEqual(searchCourses('unlikely-no-such-course'), []);
});
