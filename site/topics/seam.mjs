const trials = [
  {name: 'A', left: [5, -6, 1]},
  {name: 'B', left: [1, -6, 5]},
];
const defaultRight = [3, -4];

// Empty intervals are allowed. Keep the first maximum so tied optima have a stable witness.
function bestInterval(values) {
  let best = {sum: 0, start: 0, end: 0};
  for (let start = 0; start < values.length; start++) {
    let sum = 0;
    for (let end = start + 1; end <= values.length; end++) {
      sum += values[end - 1];
      if (sum > best.sum) best = {sum, start, end};
    }
  }
  return best;
}

function bestPrefix(values) {
  let sum = 0, best = 0, length = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (sum > best) {
      best = sum;
      length = i + 1;
    }
  }
  return {sum: best, length};
}

// Three candidates correspond to the three terms of join(L,R). A crossing
// candidate can degenerate to one side if the opposite prefix/suffix is empty.
export function seamResult(left, right) {
  const suffix = bestPrefix([...left].reverse()), prefix = bestPrefix(right);
  const leftBest = bestInterval(left), rightLocal = bestInterval(right);
  const cross = {sum: suffix.sum + prefix.sum, start: left.length - suffix.length, end: left.length + prefix.length};
  const rightBest = {sum: rightLocal.sum, start: left.length + rightLocal.start, end: left.length + rightLocal.end};
  const best = [leftBest, rightBest, cross].reduce((a, b) => b.sum > a.sum ? b : a);
  return {suffix, prefix, cross, best};
}

const digits = n => String(n).replace('-', '−');
function rowMarkup({name, left}, right, reveal) {
  const values = [...left, ...right], {best} = seamResult(left, right);
  const cells = values.map((value, i) => {
    const seam = i === left.length ? '<span class="seam-divider" aria-hidden="true">│</span>' : '';
    const selected = reveal && i >= best.start && i < best.end ? ' data-chosen' : '';
    return seam + '<span class="seam-cell"' + selected + '>' + digits(value) + '</span>';
  }).join('');
  const selected = values.slice(best.start, best.end);
  const note = selected.length ? '取 ' + selected.map(digits).join('、') + '，和为 ' + digits(best.sum) + '。' : '取空段，和为 0。';
  const description = '左段 ' + left.map(digits).join('，') + '。接缝。右段 ' + right.map(digits).join('，') + '。';
  return `<div class="seam-row" data-seam-row="${name}"><strong class="seam-name">${name}</strong>
    <span class="seam-array" role="img" aria-label="${description}">${cells}</span>
    <span class="seam-row-note"${reveal ? '' : ' hidden'}>${reveal ? note : ''}</span></div>`;
}

function explanation(results) {
  const [a, b] = results;
  const near = '从接缝向左连着取，A 最多可取 ' + a.suffix.sum + '，B 最多可取 ' + b.suffix.sum + '。';
  const right = a.prefix.length ? '右段从接缝向右最多可取 ' + a.prefix.sum + '。' : '右段若从接缝取数，开头的负数拖低了和，这次以空前缀的 0 最好。';
  return `<p>${near}${right}拼在接缝处，A 可得 ${a.suffix.sum} + ${a.prefix.sum} = ${a.cross.sum}，B 可得 ${b.suffix.sum} + ${b.prefix.sum} = ${b.cross.sum}。</p>
    <p>所以，合并时还要问左段“贴着右端能给我多少”，问右段“贴着左端能给我多少”。再和各段内部的最佳值比较。</p>`;
}

export function renderSeamLab() {
  return `<section class="seam-lab" data-seam aria-labelledby="seam-question">
    <h2 id="seam-question" data-seam-title>接上同一段数，两行的最大和还相同吗？</h2>
    <p class="seam-prompt">单看接缝左侧，两行的总和都是 0，最大连续子段和都是 5。现在右侧接上了相同的两格。你可以从每行取任意一段连续的数，也可以取空段，和为 0。</p>
    <figure class="seam-figure"><figcaption>竖线标出两段的接缝</figcaption>
      <div data-seam-rows>${trials.map(trial => rowMarkup(trial, defaultRight, false)).join('')}</div></figure>
    <details class="seam-hint" data-seam-hint><summary>给我一点提示</summary><p>只看总和与最大和，你分不出这两个左段。接上一位邻居之后，原来哪一点差别可能变得重要？</p></details>
    <div class="seam-controls">
      <div class="seam-predict" role="group" aria-label="你的判断，可跳过">
        <button type="button" data-prediction="same" aria-pressed="false">相同</button>
        <button type="button" data-prediction="different" aria-pressed="false">不同</button></div>
      <button type="button" class="seam-reveal" data-seam-reveal aria-controls="seam-reason" aria-expanded="false">查看最佳区间</button>
      <button type="button" class="seam-flip" data-seam-flip aria-pressed="false">反转右边两格</button></div>
    <p class="seam-feedback" data-seam-feedback role="status"></p>
    <div class="seam-explanation" data-seam-explanation id="seam-reason" hidden></div>
    <details class="seam-derivation seam-create" data-seam-create>
      <summary>自己出一个右段</summary>
      <p>保留 A、B 的左段，把右段都换成一个整数 x。你能找出一个让两行打平的 x，再找一个让 B 占优的 x 吗？试着用自己的话说出分界在哪里。</p>
      <form data-seam-trial-form>
        <label for="seam-right-x">右段唯一的数 x（−20 到 20）</label>
        <input id="seam-right-x" name="x" type="number" min="-20" max="20" step="1" required>
        <button type="submit">比较这两个最大和</button>
        <output for="seam-right-x" data-seam-trial-result aria-live="polite"></output>
      </form></details></section>`;
}

export function bindSeamLab(root) {
  const lab = root.querySelector('[data-seam]');
  if (!lab) return;
  let flipped = false, revealed = false, prediction = null;
  const rows = lab.querySelector('[data-seam-rows]');
  const feedback = lab.querySelector('[data-seam-feedback]');
  const reason = lab.querySelector('[data-seam-explanation]');
  const reveal = lab.querySelector('[data-seam-reveal]');
  const flip = lab.querySelector('[data-seam-flip]');
  const choices = lab.querySelectorAll('[data-prediction]');

  function paint(message) {
    const right = flipped ? [...defaultRight].reverse() : defaultRight;
    rows.innerHTML = trials.map(trial => rowMarkup(trial, right, revealed)).join('');
    for (const button of choices) button.setAttribute('aria-pressed', String(button.dataset.prediction === prediction));
    flip.setAttribute('aria-pressed', String(flipped));
    reveal.setAttribute('aria-expanded', String(revealed));
    reveal.textContent = revealed ? '收起最佳区间' : '查看最佳区间';
    reason.hidden = !revealed;
    if (revealed) {
      const results = trials.map(trial => seamResult(trial.left, right));
      const [a, b] = results.map(result => result.best.sum);
      const verdict = a === b ? 'same' : 'different';
      const intro = !prediction ? '' : prediction === verdict ? '你的判断与结果一致。' :
        verdict === 'different' ? '两段原来的总和和最佳值相同，接上右段后出现了差异。' :
        '反转右边两格后，两行各有一段可以取得同样的最大和。';
      feedback.textContent = intro + 'A 的最大和为 ' + a + '，B 为 ' + b + '。';
      reason.innerHTML = `<p>看看两行选中的数。若要替每个左段多记一条信息，你想记下什么？</p>
        <details class="seam-derivation" data-seam-contributions><summary>看看接缝两侧怎样贡献</summary>${explanation(results)}</details>`;
    } else {
      feedback.textContent = message;
      reason.replaceChildren();
    }
  }

  const trialForm = lab.querySelector('[data-seam-trial-form]');
  const trialInput = trialForm.elements.namedItem('x');
  const trialOutput = trialForm.querySelector('[data-seam-trial-result]');
  trialInput.addEventListener('input', () => { trialOutput.value = ''; });
  trialForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!trialForm.reportValidity()) return;
    const x = trialInput.valueAsNumber;
    const [a, b] = trials.map(trial => seamResult(trial.left, [x]).best.sum);
    trialOutput.value = '右段为 [' + digits(x) + '] 时，A 的最大和为 ' + a + '，B 为 ' + b + '。';
  });

  for (const button of choices) {
    button.addEventListener('click', () => {
      revealed = false;
      prediction = prediction === button.dataset.prediction ? null : button.dataset.prediction;
      paint(prediction ? '已选“' + button.textContent + '”。可查看最佳区间。' : '判断已撤回。');
    });
  }
  reveal.addEventListener('click', () => {
    revealed = !revealed;
    paint('已收起最佳区间。');
  });
  flip.addEventListener('click', () => {
    flipped = !flipped;
    revealed = false;
    prediction = null;
    paint('现在的右段是 ' + (flipped ? [...defaultRight].reverse() : defaultRight).map(digits).join('，') + '。两行的最大和还相同吗？');
  });
}
