import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyScriptedReply, runHarness, studentDistribution,
  TEACHER_DIST, klDivergence, klLogitGradient,
  defaultProgress, normalizeProgress, backupFileName,
} from '../site/logic.mjs';

test('Scripted reply normalization preserves ambiguity', () => {
  assert.equal(classifyScriptedReply(' HIGH '), 'high');
  assert.equal(classifyScriptedReply('maybe'), 'unclassified');
  assert.equal(classifyScriptedReply(null), 'unclassified');
});

test('Harness keeps every original input in the digest', () => {
  for (const name of ['baseline','changed']) {
    const result = runHarness(name);
    assert.equal(result.rows.length, 3);
    assert.equal(result.counts.high + result.counts.low + result.counts.unclassified, 3);
    for (const row of result.rows) assert.match(result.digest, new RegExp(row.id));
  }
  assert.equal(runHarness('changed').counts.unclassified, 1);
});

test('KL is zero at identical distributions and positive otherwise', () => {
  assert.ok(Math.abs(klDivergence(TEACHER_DIST, TEACHER_DIST)) < 1e-12);
  assert.ok(klDivergence(TEACHER_DIST, studentDistribution(0.95)) > 0);
  assert.ok(klDivergence(TEACHER_DIST, studentDistribution(0.8)) < 1e-12);
});

test('Student distribution and gradient are normalized', () => {
  const q = studentDistribution(0.95);
  assert.ok(Math.abs(q.reduce((a,b) => a+b,0) - 1) < 1e-12);
  const grad = klLogitGradient(TEACHER_DIST, q);
  assert.ok(grad[0] > 0); // descent lowers cat logit when student cat > teacher cat
  assert.ok(Math.abs(grad.reduce((a,b) => a+b,0)) < 1e-12);
});

test('Import validation disallows unsupported and unbounded data', () => {
  assert.throws(() => normalizeProgress({version: 2}));
  assert.deepEqual(normalizeProgress(defaultProgress()), defaultProgress());
  const huge = normalizeProgress({version: 1, notes:{general:'A'.repeat(20000)}, lastRoute:'https://bad.example', evidence:[]});
  assert.equal(huge.notes.general.length, 12000);
  assert.equal(huge.lastRoute, defaultProgress().lastRoute);
});

test('Backup snapshots have unique timestamped, safe filenames', () => {
  assert.equal(backupFileName(new Date('2026-11-11T07:00:05.123Z')), 'learn-progress-2026-11-11T07-00-05-123Z.json');
  assert.notEqual(backupFileName(new Date('2026-11-11T07:00:05.123Z')), backupFileName(new Date('2026-11-11T07:00:06.123Z')));
  assert.throws(() => backupFileName(new Date('invalid')));
});

test('Sync route remains compatible with existing progress export', () => {
  assert.equal(normalizeProgress({...defaultProgress(),lastRoute:'#/sync'}).lastRoute, '#/sync');
});
