import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSeamLab, seamResult} from '../site/topics/seam.mjs';

const a = [5, -6, 1], b = [1, -6, 5];
test('two identical left summaries need distinct boundary contributions', () => {
  for (const left of [a, b]) {
    assert.equal(left.reduce((p, n) => p + n, 0), 0);
    assert.equal(seamResult(left, []).best.sum, 5);
  }
  const right = [3, -4], first = seamResult(a, right), second = seamResult(b, right);
  assert.deepEqual([first.suffix.sum, second.suffix.sum, first.prefix.sum], [1, 5, 3]);
  assert.deepEqual([first.cross.sum, second.cross.sum], [4, 8]);
  assert.deepEqual(first.best, {sum: 5, start: 0, end: 1});
  assert.deepEqual(second.best, {sum: 8, start: 2, end: 4});
});

test('changing only the right order produces a tie, with an empty prefix and real single-side witnesses', () => {
  const first = seamResult(a, [-4, 3]), second = seamResult(b, [-4, 3]);
  assert.deepEqual(first.prefix, {sum: 0, length: 0});
  assert.deepEqual(first.cross, {sum: 1, start: 2, end: 3});
  assert.deepEqual(second.cross, {sum: 5, start: 2, end: 3});
  assert.deepEqual([first.best, second.best], [{sum: 5, start: 0, end: 1}, {sum: 5, start: 2, end: 3}]);
});

test('highlight witnesses agree with all contiguous sums, including empties and tied optima', () => {
  const arrays = [[], [-2], [0], [-2, -1], [5, -6, 1], [-1, 2], [1, 0, -1], [1, -1, 1]];
  for (const left of arrays) for (const right of arrays) {
    const values = [...left, ...right], sums = [0];
    for (let start = 0; start < values.length; start++)
      for (let end = start + 1; end <= values.length; end++)
        sums.push(values.slice(start, end).reduce((p, n) => p + n, 0));
    const {best, cross} = seamResult(left, right);
    assert.equal(best.sum, Math.max(...sums));
    for (const {start, end, sum} of [best, cross]) {
      assert.ok(0 <= start && start <= end && end <= values.length);
      assert.equal(values.slice(start, end).reduce((p, n) => p + n, 0), sum);
    }
  }
});

test('initial comparison and voluntary controls are available without revealing an answer', () => {
  const html = renderSeamLab();
  assert.deepEqual([...html.matchAll(/data-seam-row="([AB])"/g)].map(x => x[1]), ['A', 'B']);
  assert.equal([...html.matchAll(/class="seam-cell"/g)].length, 10);
  assert.match(html, /data-seam-reveal[^>]*aria-expanded="false"/);
  assert.match(html, /data-seam-flip/);
  assert.match(html, /<details class="seam-derivation seam-create" data-seam-create>/);
  assert.match(html, /type="number" min="-20" max="20" step="1" required/);
  assert.match(html, /<details class="seam-hint" data-seam-hint><summary>/);
  assert.doesNotMatch(html, /data-chosen|和为 8|disabled/);
});

test('learner-constructed single-cell probes produce both possible outcomes across all accepted values', () => {
  for (let x = -20; x <= 20; x++) {
    const first = seamResult(a, [x]).best.sum, second = seamResult(b, [x]).best.sum;
    assert.equal(first, Math.max(5, 1 + x));
    assert.equal(second, Math.max(5, 5 + x));
    assert.equal(first === second, x <= 0);
  }
});
