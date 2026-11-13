import {escapeHtml as h} from './html.mjs';
import {seamResult} from './topics/seam.mjs';
import {traceFrontiers} from './topics/frontiers.mjs';
import {measureSharedInput} from './micrograd.mjs';

// These are fixed public teaching observations, never a saved trial or an
// independent assessment. Keep explanatory rules in the optional main view.
const fmt = value => Number.isFinite(value) ? String(Math.round(value * 10000) / 10000) : '∞';
const outputNumber = value => String(Number(value.toFixed(6)));
const grid = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr));gap:1rem;align-items:start';
const card = 'margin:0;padding:1rem;border:1px solid var(--d-line,#d4dacf);border-radius:8px;min-width:0';

function segmentRow(name, left, x) {
  const values = [...left, x], best = seamResult(left, [x]).best;
  const selected = values.slice(best.start, best.end).map(fmt).join(', ');
  return `<div class="d-array-row"><b>${h(name)}</b><div class="d-array" aria-label="${h(`${name}：[${left.join(', ')}] 接 [${x}]`)}">${values.map((value, i) => `${i === left.length ? '<i class="d-seam" aria-hidden="true"></i>' : ''}<span${i >= best.start && i < best.end ? ' class="selected"' : ''}>${h(fmt(value))}</span>`).join('')}</div><small>最大和 ${h(fmt(best.sum))}；一段达到它的连续选择：[${h(selected)}]</small></div>`;
}

function segmentEvidence() {
  return `<div class="d-task-caption"><span>同一输入的两组观察</span><span>允许空段，其和为 0</span></div>
    <h2>接上同一个数，两行的最大和还相同吗？</h2>
    <p>接缝左侧，A = [5, −6, 1]，B = [1, −6, 5]。两行总和都是 0，最大连续子段和都是 5。下面把两个不同邻居的结果并列。</p>
    <div style="${grid}">${[3, -3].map(x => `<figure style="${card}"><figcaption><strong>共同接上 x = ${h(fmt(x))}</strong></figcaption>${segmentRow('A', [5, -6, 1], x)}${segmentRow('B', [1, -6, 5], x)}</figure>`).join('')}</div>
    <p class="d-meta">深色只标出一段达到当前最大和的区间；结果可以直接逐段求和检查。它不是应该保存哪些信息的答案。</p>
    <p>哪些观察支持或推翻了你的判断？如果下一次不能保留全部数字，你想留下什么信息，又会怎样尝试证明它足够？可以先在笔记写出方案，再按需打开提示或完整解释。</p>`;
}

function routeDiagram(frame, step) {
  const names = ['s', 'a', 'b', 't'], positions = [[30, 115], [125, 35], [245, 35], [340, 115]];
  const label = `第${step}步。边s到a为4，a到b为1，b到t为4，s到t为10。${frame.note}各点距离和展开状态见下表。`;
  return `<svg class="d-graph" viewBox="0 0 370 165" role="img" aria-label="${h(label)}"><defs><marker id="d-static-arrow-${step}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10z" fill="currentColor"/></marker></defs>
    <g fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#d-static-arrow-${step})"><path d="M44 103 110 48"/><path d="M143 35h83"/><path d="M260 48 326 103"/><path d="M48 115h273"/></g>
    <g><text x="70" y="65">4</text><text x="179" y="24">1</text><text x="293" y="65">4</text><text x="174" y="106">10</text></g>
    ${positions.map(([x, y], i) => `<g><circle cx="${x}" cy="${y}" r="17" class="${frame.done[0].includes(i) ? 'd-forward' : frame.done[1].includes(i) ? 'd-backward' : ''}"/><text x="${x}" y="${y + 6}" text-anchor="middle">${h(names[i])}</text><text class="d-node-distance" x="${x}" y="${y + 38}" text-anchor="middle">${h(fmt(frame.dist[0][i]))} / ${h(fmt(frame.dist[1][i]))}</text></g>`).join('')}</svg>`;
}

function routeEvidence() {
  const trace = traceFrontiers(10, true), names = ['s', 'a', 'b', 't'];
  return `<div class="d-task-caption"><span>相同地图，三个取样画面</span><span>直达边固定为 10</span></div>
    <h2>哪些画面只找到了路线，哪些已经有理由停下？</h2>
    <p>有向边为 s→a：4，a→b：1，b→t：4，s→t：10。两端从距离 0 开始；后向沿反图搜索。以下是第 1、2、3 次展开后的状态，不是完整过程，也不把最后一张指定为停止答案。</p>
    <div style="${grid}">${[1, 2, 3].map(step => {
      const frame = trace[step];
      return `<figure style="${card}"><figcaption><strong>第 ${step} 步</strong><p class="d-meta">${h(frame.note)}</p></figcaption>${routeDiagram(frame, step)}
        <table style="width:100%;font-size:.8rem"><caption>点下数字：从 s / 到 t 的已知距离</caption><thead><tr><th scope="col">点</th><th scope="col">从 s</th><th scope="col">到 t</th></tr></thead><tbody>${names.map((name, i) => `<tr><th scope="row">${h(name)}</th><td>${h(fmt(frame.dist[0][i]))}</td><td>${h(fmt(frame.dist[1][i]))}</td></tr>`).join('')}</tbody></table>
        <p class="d-meta">已展开：正向 ${h(frame.done[0].map(i => names[i]).join(', ') || '无')}；反向 ${h(frame.done[1].map(i => names[i]).join(', ') || '无')}。∞ 表示尚未发现。</p>
        <p>已找到的最短完整路线：<strong>${h(fmt(frame.best))}</strong><br>正向 / 反向队首：<strong>${h(frame.mins.map(fmt).join(' / '))}</strong></p></figure>`;
    }).join('')}</div>
    <p class="d-meta">队首是相应方向尚未展开的最小距离标签。颜色仅辅助标记已展开点，状态也逐帧写出；表格、距离和路线长度都是算法运行的观察值。</p>
    <p>分别写下三帧的停止判断和依据。找到一条路线后，还有什么可能没有被排除？试把直达边改为 8、9 或 13，在纸上重算并挑战自己的规则；需要时可打开同一套提示与完整解释。</p>`;
}

function gradientEvidence() {
  const x = 2;
  return `<div class="d-task-caption"><span>相同起点，相同扰动</span><span>x = 2，c = 2</span></div>
    <h2>同样输出 4，变化率会相同吗？</h2>
    <div class="d-programs"><div><b>A · 同一个输入</b><code>y = x * x</code><p>两处 x 都跟着移动。</p></div><div><b>B · 固定一个因子</b><code>c = 2<br>y = x * c</code><p>c 在测量前固定，测量时不变。</p></div></div>
    <p>两段程序的原输出都是 4。差商按“新输出减去原输出，再除以 h”直接计算；它是有限步长的测量，还不是极限导数。</p>
    <div style="${grid}">${[0.1, 0.001].map(step => {
      const m = measureSharedInput(x, step);
      return `<figure style="${card}"><figcaption><strong>共同扰动 h = ${h(fmt(step))}</strong><p class="d-meta">x 从 2 变为 ${h(fmt(x + step))}，c 仍为 2。</p></figcaption>
        <table style="width:100%;font-size:.85rem"><caption>相同输入改动后的重算结果</caption><thead><tr><th scope="col">观察</th><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody>
        <tr><th scope="row">原输出</th><td>4</td><td>4</td></tr>
        <tr><th scope="row">新输出</th><td>${h(outputNumber(m.sharedAfter))}</td><td>${h(outputNumber(m.fixedAfter))}</td></tr>
        <tr><th scope="row">差商</th><td>${h(fmt(m.sharedSlope))}</td><td>${h(fmt(m.fixedSlope))}</td></tr></tbody></table></figure>`;
    }).join('')}</div>
    <p>步长变小时，哪些测量发生变化？你能从程序中解释原因吗？先写出自己的推导，再尝试改变起点或加入一次对 x 的使用。需要时可打开提示与完整解释；这里没有提供一般导数或反向更新规则。</p>`;
}

export function renderStaticEvidence(id) {
  if (id === 'segment') return segmentEvidence();
  if (id === 'routes') return routeEvidence();
  if (id === 'gradient') return gradientEvidence();
  return '';
}
