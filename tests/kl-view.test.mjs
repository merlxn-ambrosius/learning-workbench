import test from 'node:test';
import assert from 'node:assert/strict';
import { renderKLMetrics, renderKLLab } from '../site/kl-view.mjs';

// Vary just the cat logit; the ratio between dog and bird stays fixed.
// Both distributions allocate their non-cat mass in the same 3:1 ratio,
// so the KL loss reduces to the binary cat/non-cat KL in this experiment.
function referenceLosses(q, change) {
  const catWeight = q * Math.exp(change);
  const cat = catWeight / (catWeight + 1 - q);
  return [-Math.log(cat), 0.8 * Math.log(0.8 / cat) + 0.2 * Math.log(0.2 / (1 - cat))];
}

test('rendered losses, signed gradients and descent directions agree with a local logit perturbation', () => {
  for (const q of [0.95, 0.80, 0.60]) {
    const current = referenceLosses(q, 0);
    const h = 0.00001;
    const before = referenceLosses(q, -h);
    const after = referenceLosses(q, h);
    const output = renderKLMetrics(q, true);
    const rows = [...output.matchAll(/class="metric"><b>([^<]+)<\/b><div class="big">([^<]+)<\/div>\s*<div class="metric-label">[^<]+<br>猫 logit 的梯度 <strong>([^<]+)<\/strong><br>\s*([^<]+)/g)];
    assert.deepEqual(rows.map(row => row[1]), ['正确标签 · 交叉熵', '教师分布 · KL(P ∥ Q)']);
    rows.forEach(([, , loss, gradient, direction], index) => {
      assert.ok(Math.abs(Number(loss) - current[index]) < 0.00005);
      const slope = (after[index] - before[index]) / (2 * h);
      assert.ok(Math.abs(Number(gradient) - slope) < 0.00005);
      assert.equal(direction, Math.abs(slope) < 1e-7 ? '此处无需调节' : slope < 0 ? '下一小步向上调' : '下一小步向下调');
    });
  }
});

test('moving the slider before revealing the derivation exposes both losses and withholds signed directions', () => {
  for (const studentCat of [95, 80, 60]) {
    const options = {studentCat, savedAnswer:'', storageWarning:'', revealed:false};
    const closed = renderKLLab(options);
    assert.match(closed, /正确标签 · 交叉熵/);
    assert.match(closed, /教师分布 · KL\(P ∥ Q\)/);
    assert.match(closed, /id="kl-explanation"><\/div>/);
    assert.doesNotMatch(closed, /猫 logit 的梯度 <strong>|下一小步向|此处无需调节|\+0\.15/);
    const open = renderKLLab({...options, revealed:true});
    assert.match(open, /id="kl-explanation"><div class="result">/);
    assert.match(open, /猫 logit 的梯度 <strong>/);
  }
});
