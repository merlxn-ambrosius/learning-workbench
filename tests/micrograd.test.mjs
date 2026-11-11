import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_VALUES, STEP_VALUES, MICROGRAD_TEXT_LIMIT, measureSharedInput, normalizeMicrograd } from '../site/micrograd.mjs';
import { defaultProgress, normalizeProgress } from '../site/logic.mjs';

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} vs ${expected}`);
}

test('a forward measurement agrees with both independently expanded polynomials', () => {
  for (const x of BASE_VALUES) {
    for (const h of STEP_VALUES) {
      const result = measureSharedInput(x, h);
      close(result.base, x ** 2);
      close(result.sharedAfter, x ** 2 + 2 * x * h + h ** 2);
      close(result.fixedAfter, x ** 2 + x * h);
      close(result.sharedSlope, 2 * x + h);
      close(result.fixedSlope, x);
    }
  }
});

test('a zero starting value can hide the difference between the limiting derivatives', () => {
  const sample = measureSharedInput(0, -0.1);
  close(sample.sharedAfter, 0.01);
  close(sample.sharedSlope, -0.1);
  assert.equal(sample.fixedSlope, 0);
  assert.throws(() => measureSharedInput(2, 0), RangeError);
});

test('a v1 backup from before the new bridge restores its existing notes and route', () => {
  const legacy = {version: 1, lastRoute: '#/lab/kl', notes: {general: 'example'}, decisions: {klPrediction: 'up'}};
  const recovered = normalizeProgress(legacy);
  assert.equal(recovered.lastRoute, legacy.lastRoute);
  assert.equal(recovered.notes.general, 'example');
  assert.deepEqual(recovered.decisions, legacy.decisions);
  assert.deepEqual(recovered.micrograd, defaultProgress().micrograd);
});

test('round trips keep two condition-specific accounts and optional help separate', () => {
  const a = {prediction: 'first draft', ran: true, explanation: 'after observing'};
  const b = {prediction: '', ran: true, explanation: 'direct observation'};
  const state = normalizeMicrograd({x: 0, h: -0.1, help: 2, trials: {'2/0.1': a, '0/-0.1': b}});
  const progress = {...defaultProgress(), lastRoute: '#/learn/micrograd', micrograd: state};
  assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(progress))), progress);
  assert.equal(state.prediction, '');
  assert.equal(state.explanation, b.explanation);
  assert.deepEqual(state.trials['2/0.1'], a);
});

test('imports are constrained to the available experiments and bounded local text', () => {
  const input = {x: 'invalid', h: 0, help: 42, trials: {'9/9': {}, '2/0.1': {ran: 'true', prediction: 'X'.repeat(3000)}}};
  const recovered = normalizeMicrograd(input);
  assert.equal(recovered.x, 2);
  assert.equal(recovered.h, 0.1);
  assert.equal(recovered.ran, false);
  assert.equal(recovered.help, 0);
  assert.equal(recovered.prediction.length, MICROGRAD_TEXT_LIMIT);
  assert.deepEqual(Object.keys(recovered.trials), ['2/0.1']);
});
