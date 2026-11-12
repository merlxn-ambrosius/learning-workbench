import test from 'node:test';
import assert from 'node:assert/strict';
import { courses, blocks, courseEdges } from '../site/knowledge-catalog.mjs';
import { universe } from '../site/universe-model.mjs';
import { platformPage } from '../site/workbench.mjs';
import { normalizedAnswer } from '../site/chapter-practice.mjs';
import { normalizeProgress } from '../site/logic.mjs';

test('one map spans every canonical course and retains edges across subject and block boundaries', () => {
  const groupIds=new Set(universe.groups.map(g=>g.id));
  assert.equal(universe.nodes.length,courses.length);
  assert.deepEqual(new Set(universe.nodes.map(n=>n.id)),new Set(courses.map(c=>c.id)));
  assert.ok(universe.nodes.every(n=>groupIds.has(n.groupId)));
  assert.equal(universe.edges,courseEdges);
  assert.ok(universe.edges.some(e=>e.from==='cph-16' && e.to==='micrograd'));
  for (const b of blocks) assert.deepEqual(universe.scopes.find(s=>s.id===b.id).nodeIds,b.courseIds);
  for (const n of universe.nodes) {
    const c = courses.find(c=>c.id===n.id);
    assert.deepEqual(n.children.map(l=>l.id),c.lessons.map(l=>l.id));
    for (const l of n.children) {
      const href=c.lessons.find(s=>s.id===l.id).href;
      assert.equal(l.href,href?.startsWith('#/topic/')?href:'#/course/'+n.id+'?node='+l.id);
    }
  }
});

test('courses offer both their global neighborhood and a separate activity graph, including planned courses', () => {
  for (const id of ['kl','cph-09','backtesting']) {
    const html=platformPage('course/'+id,null,null,new URLSearchParams());
    assert.match(html,/data-uv-full/);
    assert.ok(html.includes('#/maps?node='+id));
    assert.match(html,/课内学习图/);
  }
});

test('chapter practice links, normalized answers and resume records use the same chapter identifiers', () => {
  assert.equal(normalizedAnswer(' ４，−２ '),'4 -2');
  for (let i=1;i<=30;i++) {
    const id='cph-'+String(i).padStart(2,'0');
    const course=courses.find(c=>c.id===id);
    assert.ok(course.practice.accepted.map(normalizedAnswer).includes(normalizedAnswer(course.practice.answer)));
    assert.match(platformPage('practice/'+id,null,null,new URLSearchParams()),/data-chapter-practice/);
    assert.equal(normalizeProgress({version:1,lastRoute:'#/practice/'+id}).lastRoute,'#/practice/'+id);
  }
  assert.equal(normalizeProgress({version:1,lastRoute:'#/practice/cph-31'}).lastRoute,'#/home');
  assert.equal(normalizeProgress({version:1,lastRoute:'#/lab/range-queries'}).lastRoute,'#/lab/range-queries');
});
