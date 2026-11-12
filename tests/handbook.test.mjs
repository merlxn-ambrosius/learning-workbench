import assert from 'node:assert/strict';
import test from 'node:test';
import { handbookBlocks, handbookCourses, handbookEdges, handbookSource } from '../site/handbook-catalog.mjs';

// Printed TOC in the July 3, 2018 PDF. The ten cover and front-matter pages
// count towards a #page URL. Some embedded bookmarks fall on the preceding page.
const chapterStarts = [3,17,25,35,47,57,65,77,83,95,109,117,123,133,141,149,157,163,173,181,197,207,217,225,235,243,251,257,265,275];
const sectionCounts = [6,4,3,6,5,5,6,3,4,5,2,3,3,4,3,4,2,4,4,4,4,5,3,5,3,4,3,4,4,3];

test('handbook chapters and numbered sections resolve to actual printed-page locations', () => {
  assert.deepEqual(handbookCourses.map(c => c.printedPage), chapterStarts);
  assert.equal(handbookSource.physicalPages, 296);
  for (const [index, course] of handbookCourses.entries()) {
    assert.equal(course.chapter, index + 1);
    assert.equal(course.source.url, handbookSource.pdfUrl + '#page=' + (chapterStarts[index] + 10));
    const sections = course.lessons.filter(l => l.section);
    assert.equal(sections.length, sectionCounts[index]);
    for (const [j, section] of sections.entries()) {
      assert.equal(section.section, (index + 1) + '.' + (j + 1));
      assert.ok(section.printedPage >= chapterStarts[index] && section.printedPage < (chapterStarts[index + 1] || 281));
      const params = new URLSearchParams(new URL(section.href).hash.slice(1));
      assert.equal(Number(params.get('page')), section.printedPage + 10);
      assert.match(params.get('view'), /^FitH,\d+$/);
    }
  }
  const { lessons } = handbookCourses[1];
  assert.equal(lessons[2].printedPage, lessons[3].printedPage);
  assert.notEqual(lessons[2].href, lessons[3].href, 'Two headings on printed p.21 need distinct top coordinates');
  assert.match(handbookCourses[8].lessons[2].href, /#page=99&view=/, 'segment tree heading appears on printed p.89');
});

test('each chapter offers an independently addressable original task and a specific external programming problem', () => {
  const judges = new Set();
  for (const c of handbookCourses) {
    assert.ok(c.practice.title && c.practice.prompt && c.practice.hint && c.practice.explanation);
    assert.ok(c.practice.accepted.includes(c.practice.answer));
    const exercise = c.lessons.find(l => l.id === 'exercise');
    const judge = c.lessons.find(l => l.id === 'judge');
    assert.equal(exercise.href, '#/practice/' + c.id);
    assert.match(judge.href, /^https:\/\/cses\.fi\/problemset\/task\/\d+\/$/);
    assert.ok(c.lessonEdges.some(e => e.to === 'judge' && e.reason));
    judges.add(judge.href);
  }
  assert.equal(judges.size, handbookCourses.length);
  assert.equal(handbookCourses[8].lessons.find(l => l.id === 'lab').href, '#/lab/range-queries');
});

test('book regions project the same course IDs and edges, including dependencies that cross the three printed parts', () => {
  const whole = handbookBlocks.find(b => b.id === 'algorithms');
  assert.deepEqual(whole.courseIds, handbookCourses.map(c => c.id));
  assert.deepEqual(whole.edges, handbookEdges);
  assert.equal(handbookBlocks.slice(1).flatMap(b => b.courseIds).join(), whole.courseIds.join());
  for (const b of handbookBlocks.slice(1)) {
    assert.equal(b.courseIds.length, 10);
    assert.deepEqual(b.edges, handbookEdges.filter(e => b.courseIds.includes(e.from) && b.courseIds.includes(e.to)));
  }
  const rangeToTree = whole.edges.find(e => e.from === 'cph-09' && e.to === 'cph-18');
  assert.equal(rangeToTree.kind, 'recommended');
  assert.ok(whole.edges.some(e => e.from === 'cph-09' && e.to === 'cph-28' && e.kind === 'required'));
});
