import { BASE_VALUES, STEP_VALUES, MICROGRAD_TEXT_LIMIT, measureSharedInput } from './micrograd.mjs';

const numbers = new Intl.NumberFormat('zh-CN', { useGrouping: false, maximumFractionDigits: 9 });
const format = value => numbers.format(Object.is(value, -0) ? 0 : value);
const signed = value => (value > 0 ? '+' : '') + format(value);
const trialKey = (x, h) => `${x}/${h}`;

export function microgradPage() {
  return `<article class="mg-unit">
    <p class="eyebrow">Zero to Hero · 第一讲 / micrograd</p>
    <h1 class="page-title">同样的乘积，输入动一下会怎样？</h1>
    <p class="lead">两段程序起初算出同一个数。给它们的输入加上同一个小量，看看一次乘法里的两个位置怎样影响结果。</p>

    <section class="mg-bench" aria-label="比较两段乘法程序">
      <div class="mg-programs">
        <div class="mg-program"><h2>程序 A · 共用输入</h2>
          <code>f(x) = x × x</code><p>两个位置都读取 x。</p></div>
        <div class="mg-program"><h2>程序 B · 固定一个因子</h2>
          <code>g(x) = x × c</code><p>c 取本次的起点值，测量期间保持不动。</p></div>
      </div>
      <div class="mg-workspace">
        <fieldset class="mg-settings"><legend>给输入一个扰动</legend>
          <div class="mg-controls">
            <label>起点 x<select id="mg-x">${BASE_VALUES.map(x => `<option value="${x}">${format(x)}</option>`).join('')}</select></label>
            <label>输入改变量 h<select id="mg-h">${STEP_VALUES.map(h => `<option value="${h}">${signed(h)}</option>`).join('')}</select></label>
          </div>
        </fieldset>
        <p id="mg-condition" class="mg-condition"></p>
        <details id="mg-draft" class="mg-fold">
          <summary>写下我的预测（可选）</summary>
          <div class="mg-fold-body"><label id="mg-prediction-label" for="mg-prediction">你预计哪个输出会怎样改变？依据是什么？</label>
            <textarea id="mg-prediction" rows="2" maxlength="${MICROGRAD_TEXT_LIMIT}" aria-describedby="mg-prediction-note"></textarea>
            <small id="mg-prediction-note">文字只保存在本浏览器。也可以在心里预测，直接测量。</small></div>
        </details>
        <div class="mg-run"><button class="btn btn-primary" id="mg-measure" type="button">测量两段程序</button>
          <span class="mg-save-error" role="status" id="mg-save-error"></span></div>
        <p class="mg-sr" id="mg-status" role="status" aria-atomic="true"></p>

        <section id="mg-results" class="mg-results" aria-labelledby="mg-result-title" hidden>
          <h2 id="mg-result-title">这一次的测量</h2>
          <table class="mg-table"><caption id="mg-caption"></caption>
            <thead><tr><th scope="col">观测量</th><th scope="col">A · x × x</th><th scope="col">B · x × c</th></tr></thead>
            <tbody id="mg-result-rows"></tbody></table>
          <p class="mg-reading">最后一行把输出变化除以同一个 h，得到这一步的平均变化率。可以换一个更小的步长，再看两列如何变化。</p>
          <div class="mg-reflection"><label for="mg-explanation">观察后，你会怎样解释两列数值？（可选）</label>
            <textarea id="mg-explanation" rows="2" maxlength="${MICROGRAD_TEXT_LIMIT}"></textarea></div>
        </section>
        <section id="mg-history" class="mg-history" aria-labelledby="mg-history-title" hidden>
          <h2 id="mg-history-title">同一起点，换个步长</h2>
          <table class="mg-table"><caption id="mg-history-caption"></caption>
            <thead><tr><th scope="col">已测 h</th><th scope="col">A · Δy/h</th><th scope="col">B · Δy/h</th></tr></thead>
            <tbody id="mg-history-rows"></tbody></table>
        </section>
      </div>
    </section>

    <div class="mg-help" aria-label="按需查看的帮助">
      <details id="mg-hint" class="mg-fold"><summary>给我一个观察角度</summary>
        <div class="mg-fold-body"><p>两个位置最初显示相同的数。输入变化以后，是什么决定了一个位置要不要重新取值？</p></div></details>
      <details id="mg-derivation" class="mg-fold"><summary>看完整推导</summary>
        <div class="mg-fold-body"><p>记起点为 a，每次都令 c = a。两个起点输出都等于 a²。</p>
          <p>A 扰动后的输出是 (a + h)²，展开后比起点多 2ah + h²，除以 h 得到 <strong>2a + h</strong>。乘法的两个位置都会随输入改变。</p>
          <p>B 扰动后的输出是 (a + h)a，比起点多 ah，除以 h 得到 <strong>a</strong>。第二个位置仍读取常数 c。</p>
          <p>让 h 趋向 0，得到 A 在起点的导数 2a、B 在起点的导数 a。当 a = 0 时两个导数都为零，但任何允许的非零 h 仍能让两次测量不同。</p></div></details>
    </div>

    <section class="mg-next" aria-labelledby="mg-build-title">
      <h2 id="mg-build-title">把这个区别写进一个求导器</h2>
      <p>下载两个文件到同一目录。在 <code>engine.py</code> 中实现 <code>grad(output, inputs)</code>，让同一个输入被多次使用时也能得到正确的导数。用 <code>python3 check_example.py</code> 跑公开样例，再自己构造一个会暴露错误的表达式。</p>
      <div class="mg-links"><a href="./materials/micrograd/engine.py" download>下载 engine.py</a>
        <a href="./materials/micrograd/check_example.py" download>下载 check_example.py</a></div>
      <p class="mg-source">本页是第一讲的配套实验，浏览器只进行有限步长的数值测量。Python 练习在本地运行。</p>
      <div class="mg-links"><a href="https://www.youtube.com/watch?v=VMj-3S1tku0&amp;t=1930s" target="_blank" rel="noopener noreferrer">Karpathy 第一讲 · 32:10 手算片段 ↗</a>
        <a href="https://colab.research.google.com/drive/1FPTx1RXtBfc4MaTkf7viZZD4U2F9gtKN?usp=sharing" target="_blank" rel="noopener noreferrer">第一讲原版练习 ↗</a>
        <a href="https://karpathy.ai/zero-to-hero.html" target="_blank" rel="noopener noreferrer">完整八讲与原始材料 ↗</a></div>
      <details class="mg-fold mg-onward"><summary>这个小实验在 GPT 里还会用到吗？</summary>
        <div class="mg-fold-body"><p>模型对一句话里的每个位置使用同一套参数。第 5 讲有一个可亲自检查的例子：当同一个字符在一个 batch 里出现两次，它会两次读到 embedding 表里的同一行。你可以先预测改动这一行会影响哪些位置，再与 PyTorch 的梯度核对。</p>
          <p>把今天的标量求导器留作小例子的对照。沿第 2–6 讲构造字符模型并保留数据切分和评价代码，第 7 讲把它们接到因果 Transformer，第 8 讲再换入自己的 tokenizer。</p>
          <a class="source-link" href="https://github.com/karpathy/nn-zero-to-hero/blob/master/lectures/makemore/makemore_part4_backprop.ipynb" target="_blank" rel="noopener noreferrer">第 5 讲原始 notebook ↗</a></div></details>
    </section>
  </article>`;
}

function resultRow(label, left, right) {
  return `<tr><th scope="row">${label}</th><td>${format(left)}</td><td>${format(right)}</td></tr>`;
}

export function mountMicrograd(root, initial, onSave) {
  const get = selector => root.querySelector(selector);
  const state = { ...initial, trials: { ...initial.trials } };
  state.trials[trialKey(state.x, state.h)] = {
    prediction: state.prediction, ran: state.ran, explanation: state.explanation,
  };
  const xSelect = get('#mg-x');
  const hSelect = get('#mg-h');
  const draft = get('#mg-draft');
  const prediction = get('#mg-prediction');
  const explanation = get('#mg-explanation');
  const run = get('#mg-measure');
  const status = get('#mg-status');

  function save() {
    const { x, h, prediction, ran, explanation } = state;
    state.trials[trialKey(x, h)] = { prediction, ran, explanation };
    const saved = onSave({ ...state, trials: { ...state.trials } });
    get('#mg-save-error').textContent = saved === false ? '未能保存到浏览器，本页仍可继续实验。' : '';
  }

  function showTrial() {
    const { x, h, ran } = state;
    xSelect.value = String(x);
    hSelect.value = String(h);
    get('#mg-condition').textContent = `两段程序的输入都从 ${format(x)} 变到 ${format(x + h)}。B 的 c 固定为 ${format(x)}。`;
    draft.querySelector('summary').textContent = ran
      ? (state.prediction ? '查看测量前的预测' : '这次没有写下预测')
      : (state.prediction ? '继续编辑我的预测' : '写下我的预测（可选）');
    get('#mg-prediction-label').textContent = ran
      ? '测量前留下的判断'
      : '你预计哪个输出会怎样改变？依据是什么？';
    prediction.value = state.prediction;
    prediction.readOnly = ran;
    get('#mg-prediction-note').textContent = ran
      ? '这里保留测量前的文字。新想法可以写在观测结果下方。'
      : '文字只保存在本浏览器。也可以在心里预测，直接测量。';
    explanation.value = state.explanation;
    run.textContent = ran ? '选择另一个步长' : '测量两段程序';
    get('#mg-results').hidden = !ran;
    if (ran) {
      const result = measureSharedInput(x, h);
      get('#mg-caption').textContent = `起点 x = ${format(x)}，输入改变量 h = ${signed(h)}`;
      const moved = format(x + h);
      get('#mg-result-rows').innerHTML =
        resultRow('起点输出', result.base, result.base) +
        `<tr><th scope="row">扰动后两个因子</th><td>${moved} × ${moved}</td><td>${moved} × ${format(x)}</td></tr>` +
        resultRow('扰动后输出', result.sharedAfter, result.fixedAfter) +
        resultRow('输出变化 Δy', result.sharedAfter - result.base, result.fixedAfter - result.base) +
        resultRow('平均变化率 Δy/h', result.sharedSlope, result.fixedSlope);
    }
    const measuredSteps = STEP_VALUES.filter(step => state.trials[trialKey(x, step)]?.ran);
    get('#mg-history').hidden = measuredSteps.length < (ran ? 2 : 1);
    get('#mg-history-caption').textContent = `起点 x = ${format(x)} 时已测得的平均变化率`;
    get('#mg-history-rows').innerHTML = measuredSteps.map(step => {
      const result = measureSharedInput(x, step);
      return resultRow(signed(step), result.sharedSlope, result.fixedSlope);
    }).join('');
  }

  function changeCondition() {
    state.x = Number(xSelect.value);
    state.h = Number(hSelect.value);
    const trial = state.trials[trialKey(state.x, state.h)];
    state.prediction = trial?.prediction ?? '';
    state.ran = trial?.ran ?? false;
    state.explanation = trial?.explanation ?? '';
    save();
    showTrial();
    status.textContent = state.ran ? '已恢复这组条件的测量。' : '条件已改变，可重新预测或直接测量。';
  }

  xSelect.addEventListener('change', changeCondition);
  hSelect.addEventListener('change', changeCondition);
  prediction.addEventListener('input', () => {
    if (state.ran) return;
    state.prediction = prediction.value;
    save();
  });
  explanation.addEventListener('input', () => {
    state.explanation = explanation.value;
    save();
  });
  run.addEventListener('click', () => {
    if (state.ran) {
      hSelect.focus();
      return;
    }
    state.ran = true;
    save();
    showTrial();
    const { sharedSlope, fixedSlope } = measureSharedInput(state.x, state.h);
    status.textContent = `测量完成。平均变化率 A 为 ${format(sharedSlope)}，B 为 ${format(fixedSlope)}。下方可查看各步数值。`;
  });
  for (const [selector, level] of [['#mg-hint', 1], ['#mg-derivation', 2]]) {
    const detail = get(selector);
    detail.addEventListener('toggle', () => {
      if (detail.open && state.help < level) {
        state.help = level;
        save();
      }
    });
  }
  showTrial();
}
