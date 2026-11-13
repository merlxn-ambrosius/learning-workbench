import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fullCourses, learningPaths, listCourses, getCourse, getLegacyEntry, getKnowledge, listKnowledge,
  resolveOccurrence, composeKnowledge, courseOccurrences, getRouteContext, listCourseActivities,
  knowledgeDependencies, validateContentModel, evaluateOptimization,
} from '../site/content-model.mjs';
import { courses as legacyUnits } from '../site/knowledge-catalog.mjs';

test('full courses, chapters, knowledge and activities have separate identities; legacy IDs survive', () => {
  assert.equal(legacyUnits.length, 40);
  assert.equal(fullCourses.some(course => course.id === 'micrograd' || /^cph-\d+$/.test(course.id)), false);
  assert.equal(getCourse('micrograd').id, 'zero-to-hero');
  assert.equal(getLegacyEntry('micrograd').kind, 'chapter');
  const zero = getCourse('zero-to-hero');
  assert.equal(zero.chapters.length, 8);
  assert.equal(zero.chapters[0].id, 'micrograd');
  assert.equal(zero.chapters[7].id, 'gpt-tokenizer');
  assert.equal(zero.source.url, 'https://karpathy.ai/zero-to-hero.html');
  assert.ok(zero.source.version.includes('ongoing'));
  const book = getCourse('competitive-programmers-handbook');
  assert.equal(book.chapters.length, 30);
  for (let n = 1; n <= 30; n++) {
    const id = `cph-${String(n).padStart(2, '0')}`;
    assert.equal(getLegacyEntry(id).parentCourseId, book.id);
    assert.equal(legacyUnits.find(unit => unit.id === id).kind, 'chapter');
    assert.ok(book.chapters.find(ch => ch.id === id).activities.some(activity => activity.id === id + ':exercise'));
  }
  assert.ok(learningPaths.every(course => course.kind === 'curated-path'));
  assert.ok(!listCourses({ includePaths: false }).includes(learningPaths[0]));
  assert.ok(listCourses({ query: 'micrograd', subjectId: 'ai' }).includes(zero));
  assert.equal(listCourses({ subjectId: 'physics' }).length, 0);
});

test('a concept has complete default teaching content without needing a course', () => {
  for (const knowledge of listKnowledge()) {
    for (const type of ['explanation', 'worked-example', 'hint', 'activity', 'sources']) {
      assert.ok(knowledge.blocks.some(block => block.type === type && block.title && block.body), knowledge.id + ':' + type);
    }
    assert.ok(knowledge.sources.every(source => source.url && source.license && source.author));
    assert.equal(knowledge.provenance.license, 'MIT');
  }
  assert.equal(getKnowledge('unknown'), null);
  assert.equal(getKnowledge('shared-input-gradient').id, 'autodiff-gradient-accumulation');
  assert.throws(() => getKnowledge('autodiff-gradient-accumulation', { version: '99.0.0' }), /never silently upgrade/);
});

test('two course occurrences resolve the same pinned concept with isolated additive teaching content', () => {
  const defaults = resolveOccurrence('zero-to-hero', 'micrograd-autodiff');
  const enhanced = resolveOccurrence('learn-optimization-path', 'optimization-autodiff');
  assert.equal(defaults.knowledge.id, enhanced.knowledge.id);
  assert.equal(defaults.occurrence.version, '1.0.0');
  assert.equal(enhanced.occurrence.version, defaults.occurrence.version);
  assert.equal(defaults.variant, 'default');
  assert.equal(enhanced.variant, 'extended');
  assert.deepEqual(enhanced.blocks.slice(0, defaults.blocks.length), defaults.blocks);
  assert.ok(enhanced.blocks.some(block => block.id === 'optimization-example'));
  assert.ok(enhanced.activities.some(activity => activity.id === 'optimization-shared-step'));
  assert.ok(!defaults.activities.some(activity => activity.id === 'optimization-shared-step'));
  assert.throws(() => { enhanced.blocks[0].body = 'mutation'; }, TypeError);
  assert.deepEqual(getKnowledge(defaults.knowledge.id).blocks, defaults.blocks);
  assert.equal(resolveOccurrence('zero-to-hero', 'optimization-autodiff'), null);
  assert.equal(resolveOccurrence('unknown', 'micrograd-autodiff'), null);
});

test('limited overrides preserve identity, explanations and source blocks, and require provenance', () => {
  const knowledge = getKnowledge('autodiff-gradient-accumulation');
  const replacement = {
    blockId: 'worked-example', reason: 'Adapt the numbers for a concrete course task',
    provenance: { author: 'LEARN', license: 'MIT' },
    block: { id: 'worked-example', type: 'worked-example', title: '另一个起点', body: 'x=2 时，x² 的两条路径各贡献 2，导数为 4。' },
  };
  const changed = composeKnowledge(knowledge, { overrides: [replacement] });
  assert.equal(changed.blocks[1].body, replacement.block.body);
  assert.equal(changed.id, knowledge.id);
  assert.equal(changed.version, knowledge.version);
  assert.equal(changed.blocks[0].body, knowledge.blocks[0].body);
  assert.notEqual(knowledge.blocks[1].body, changed.blocks[1].body);
  assert.throws(() => composeKnowledge(knowledge, { overrides: [{ ...replacement, blockId: 'explanation' }] }), /Protected/);
  assert.throws(() => composeKnowledge(knowledge, { overrides: [{ ...replacement, blockId: 'sources' }] }), /Protected/);
  assert.throws(() => composeKnowledge(knowledge, { overrides: [{ ...replacement, reason: '' }] }), /require/);
  assert.throws(() => composeKnowledge(knowledge, { overrides: [replacement, replacement] }), /twice/);
  assert.throws(() => composeKnowledge(knowledge, { extensions: ['optimization-perspective@99'] }), /Unknown pinned extension/);
});

test('course route context is explicit and follows the course sequence, never prerequisite edges', () => {
  const context = getRouteContext({ courseId: 'zero-to-hero', occurrenceId: 'micrograd-autodiff', knowledgeId: 'autodiff-gradient-accumulation' });
  assert.equal(context.chapter.id, 'micrograd');
  assert.equal(context.previous.id, 'micrograd-graph');
  assert.equal(context.next, null);
  assert.equal(context.returnHref, '#/course/zero-to-hero');
  assert.ok(context.canonicalHref.includes('course=zero-to-hero&occurrence=micrograd-autodiff'));
  const path = getRouteContext({ courseId: 'learn-optimization-path', occurrenceId: 'optimization-autodiff' });
  assert.equal(path.previous.id, 'optimization-derivative');
  assert.equal(getRouteContext({ knowledgeId: 'autodiff-gradient-accumulation' }).course, null);
  assert.equal(getRouteContext({ courseId: 'learn-optimization-path', occurrenceId: 'micrograd-autodiff', knowledgeId: 'autodiff-gradient-accumulation' }).course, null);
  assert.ok(knowledgeDependencies.every(edge => edge.reason && !edge.from.startsWith('micrograd-')));
});

test('activity denominator contains exact unique stable activities; unknown courses have none', () => {
  for (const course of listCourses()) {
    const activities = listCourseActivities(course.id);
    assert.equal(new Set(activities.map(activity => activity.id)).size, activities.length);
    assert.ok(activities.every(activity => activity.title && activity.href && activity.provenance.author && activity.provenance.license));
  }
  assert.ok(listCourseActivities('zero-to-hero').some(activity => activity.id === 'autodiff-build-engine'));
  const reading = listCourseActivities('zero-to-hero').find(activity => activity.id === 'knowledge:autodiff-gradient-accumulation');
  assert.equal(reading.kind, 'concept-reading');
  assert.ok(reading.href.includes('course=zero-to-hero'));
  assert.ok(listCourseActivities('learn-optimization-path').some(activity => activity.id === reading.id));
  assert.ok(!listCourseActivities('zero-to-hero').some(activity => activity.id === 'optimization-shared-step'));
  assert.ok(listCourseActivities('learn-optimization-path').some(activity => activity.id === 'optimization-shared-step'));
  assert.deepEqual(listCourseActivities('unknown'), []);
});

test('optimization experiment computes actual updates and gradient agrees with central difference', () => {
  const initial = evaluateOptimization();
  assert.equal(initial.correct.gradient, 24);
  assert.equal(initial.overwritten.gradient, 12);
  assert.ok(Math.abs(initial.correct.nextWeight - 0.8) < 1e-12);
  assert.ok(Math.abs(initial.correct.lossAfter - 0.1296) < 1e-12);
  assert.ok(Math.abs(initial.overwritten.lossAfter - 0.9216) < 1e-12);
  assert.ok(initial.correct.lossAfter < initial.correct.lossBefore && initial.overwritten.lossAfter < initial.overwritten.lossBefore);
  const loss = w => (w * w - 1) ** 2;
  for (const weight of [-2.8, -1, -0.3, 0, 0.7, 1, 2.5]) {
    const result = evaluateOptimization({ weight, learningRate: 0.02 });
    const h = 1e-5;
    const numeric = (loss(weight + h) - loss(weight - h)) / (2 * h);
    assert.ok(Math.abs(result.correct.gradient - numeric) < 1e-7);
  }
  assert.ok(evaluateOptimization({ weight: 2, learningRate: 0.2 }).correct.lossAfter > 9, 'even a correct gradient can overshoot');
  assert.throws(() => evaluateOptimization({ weight: Infinity }), RangeError);
  assert.throws(() => evaluateOptimization({ learningRate: -0.1 }), RangeError);
});

test('all references resolve and the knowledge graph is an independently validated DAG', () => {
  assert.deepEqual(validateContentModel(), { valid: true, errors: [] });
  assert.ok(courseOccurrences.every(item => item.version && item.provenance.author));
});
