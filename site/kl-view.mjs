import { TEACHER_DIST, studentDistribution, klDivergence, klLogitGradient } from './logic.mjs';
import { external } from './html.mjs';

const fmt = number => Number(number).toFixed(4);

export function renderKLGuide() {
  return `<article class="reading-unit"><p class="eyebrow">知识蒸馏 · 概率与梯度</p>
    <h1 class="page-title">都猜对了猫，学生还要怎么改？</h1>
    <p class="lead">同一张猫的照片，学生给猫 95%，教师给猫 80%。如果训练信号来自标准答案「猫」或来自教师的整个分布，下一步调整会一样吗？</p>
    <section class="lesson-block"><h2>只动一个量</h2><p>想象模型有三个旋钮，分别控制猫、狗和鸟的原始分数（logit）。这次只动猫的旋钮，再通过 softmax 把三个分数换算成概率。两种训练方法看到的是同一个学生。</p>
    <div class="actions"><a class="btn btn-primary" href="#/lab/kl">比较两种训练目标 →</a></div></section>
    <details class="lesson-block hint" data-kl-guide-help><summary>我想先读推导</summary>
      <p>记学生给猫的概率为 q。若标准答案是猫，交叉熵为 −ln(q)，对猫 logit 的梯度是 q − 1。若教师给猫的概率为 p，KL(P ∥ Q) 对同一个 logit 的梯度是 q − p。</p>
      <p>在 q = 0.95、p = 0.80 时，两个梯度分别为 −0.05 和 +0.15。梯度下降沿反方向调节同一个旋钮，于是硬标签使猫的概率上升，教师分布使它下降。</p>
    </details><p class="reading-source">原始材料 · ${external('https://arxiv.org/abs/1503.02531', 'Hinton 等，Distilling the Knowledge in a Neural Network')}。此处取温度 1，并单独比较两种目标。</p></article>`;
}
export const klAnswerNames = {down:'下降', up:'上升', same:'保持不变'};
export function renderKLMetrics(q, showGradient) {
  const student = studentDistribution(q);
  const names = ['Cat · 猫','Dog · 狗','Bird · 鸟'];
  const series=(data,kind)=>data.map((prob,i)=>`<div class="dist-row"><b>${names[i]}</b><div class="bar-track"><div class="bar ${kind}" style="width:${(prob*100).toFixed(4)}%"></div></div><span>${(prob*100).toFixed(1)}%</span></div>`).join('');
  const kl = klDivergence(TEACHER_DIST, student);
  const gradient = klLogitGradient(TEACHER_DIST, student)[0];
  const hardGradient = q - 1;
  const signed = value => (value > 0 ? '+' : '') + fmt(value);
  const metric = (label, loss, slope) => `<div class="metric"><b>${label}</b><div class="big">${fmt(loss)}</div>
    <div class="metric-label">损失 · nats${showGradient ? `<br>猫 logit 的梯度 <strong>${signed(slope)}</strong><br>
    ${slope > 0 ? '下一小步向下调' : slope < 0 ? '下一小步向上调' : '此处无需调节'}` : ''}</div></div>`;
  return `<div class="grid2"><div><div class="legend">教师 P</div>${series(TEACHER_DIST,'teacher')}</div>
    <div><div class="legend">学生 Q</div>${series(student,'student')}</div></div>
    <div class="metric-row">${metric('正确标签 · 交叉熵', -Math.log(q), hardGradient)}${metric('教师分布 · KL(P ∥ Q)', kl, gradient)}</div>`;

}

export function renderKLExplanation(answer) {
  const comparison = answer === 'down' ? '你的判断与这个起点的更新一致。'
    : Object.hasOwn(klAnswerNames,answer) ? '可以把滑块从 95% 向两侧各移一步，比较哪一侧的损失更低。' : '';
  return `<div class="result"><h3>95% 起点的更新</h3><p>对于 softmax，∂KL / ∂z_cat = Q_cat − P_cat。起点的值是 0.95 − 0.80 = +0.15。只调整猫 logit 时，沿负梯度走一小步，猫 logit 降低，猫的概率也随之下降。</p><p>在下面移动滑块，可以对照不同位置的损失和该位置的 logit 梯度。${comparison}</p></div>`;
}

export function renderKLLab({savedAnswer, studentCat, revealed, storageWarning}) {
  const answer = Object.hasOwn(klAnswerNames,savedAnswer) ? savedAnswer : '';
  return `<p class="eyebrow">KNOWLEDGE DISTILLATION</p><h1 class="page-title">同一个学生，两种训练目标</h1>
  <p class="lead">教师给猫 80%，学生给猫 95%。如果只用教师分布做蒸馏，一次很小的梯度更新会把学生带向哪里？</p>
  <div class="two-columns"><section class="stack">
    <div class="card"><h2>在 95% 的起点作判断</h2><p>只调整学生的猫 logit，狗和鸟的 logits 保持固定。你可以先写下判断，也可以直接看解释。</p>
      <div class="field"><label for="kl-prediction">这一步之后，学生的猫概率会怎样变化？</label><select id="kl-prediction"><option value="">选择方向</option>${Object.entries(klAnswerNames).map(([key,name])=>`<option value="${key}" ${answer===key?'selected':''}>${name}</option>`).join('')}</select></div>
      <div class="actions"><button type="button" id="kl-save" class="btn btn-outline">${answer?'更新判断':'记录判断'}</button><button type="button" id="kl-reveal" class="btn btn-primary" aria-controls="kl-explanation" aria-expanded="${revealed}">${revealed?'收起解释':'查看机制解释'}</button></div>
      <p class="status-line" id="kl-saved" role="status">${answer?`${storageWarning ? '本页的' : '上次记录的'} 95% 起点判断 · ${klAnswerNames[answer]}`:''}</p>
      <div id="kl-explanation">${revealed?renderKLExplanation(answer):''}</div>
    </div>
    <div class="card"><h2>移动学生分布，比较损失</h2><p>教师分布固定为猫 80%、狗 15%、鸟 5%。滑块只改变学生分布，余下的概率按狗与鸟 3 比 1 分配。</p>
      <div class="field"><label for="student-cat">当前学生猫概率 · <strong id="cat-percent">${studentCat}%</strong></label><input type="range" id="student-cat" min="51" max="99" value="${studentCat}" step="1" aria-valuetext="${studentCat}%" aria-describedby="dist-method"/><span id="dist-method" class="tiny subtle">可用方向键微调。上方的问题始终指 95% 的起点。</span></div>
      <div id="distribution" class="dist-wrap">${renderKLMetrics(studentCat/100,revealed)}</div><button type="button" id="kl-reset" class="btn btn-outline btn-small">滑块回到 95%</button>
    </div></section><aside class="stack lesson-side"><div class="card"><h3>这个滑块怎样对应模型？</h3><p>猫 logit 改变，softmax 会重新分配三个类别的概率。其他两个 logits 固定时，狗和鸟的概率之比保持不变。滑块让你直接选取这条曲线上的一个分布。</p><p>把滑块从 95% 移到 94%。分别查看两种损失相对移动前的变化。接着试试 80%；在这一点上，两种训练方法还会给出同样的建议吗？</p></div></aside></div>`;
}
