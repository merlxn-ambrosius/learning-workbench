import {escapeHtml as h} from './html.mjs';
import {renderStaticEvidence} from './discovery-static.mjs';
import {ACTIVITY_IDS, defaultTrial, openStudioStore, normalizeStudio, seamResult, summarize, challengeSummary, traceFrontiers, measureSharedInput} from './discovery-model.mjs';

const activities={
  segment:{no:'01',name:'接缝处，丢了什么？',subject:'算法 · 表示与合并',intro:'两段数的总和与最大和都一样。接上同一个邻居，还能一样吗？',prereq:'知道连续子数组；本题允许空段，其和为 0。',source:'#/topic/segment-tree/boundary-summary'},
  routes:{no:'02',name:'找到一条路，就能停吗？',subject:'算法 · 证据与停止',intro:'当两端搜索接通时，能停下来了吗？试着区分“找到路线”与“证明最短”。',prereq:'了解非负边权与单向 Dijkstra。反向搜索沿反图；距离标签代表已找到的路线。',source:'#/topic/shortest-paths/bidirectional'},
  gradient:{no:'03',name:'两个 2，是同一个输入吗？',subject:'机器学习 · 结构与变化',intro:'两个程序都输出 4。轻轻移动输入，它们还会走在一起吗？',prereq:'会乘法和变化率；可从测量开始，不要求先掌握反向传播。',source:'#/learn/micrograd'}
};
let store;
const getStore=()=>store||(store=openStudioStore(()=>localStorage));
const number=n=>Number.isFinite(n)?String(Math.round(n*1e6)/1e6):'∞';
const array=xs=>'['+xs.map(number).join(', ')+']';
const btn=(text,action,extra='')=>`<button type="button" data-action="${action}" ${extra}>${text}</button>`;
const link=(id,options='')=>'#/studio/'+id+options;
function miniArt(id) {
  if(id==='segment')return `<svg viewBox="0 0 300 104" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 22h118v60H22zM160 22h118v60H160z"/><path d="M150 8v88" stroke-dasharray="3 5"/></g><g fill="currentColor" font-size="22" text-anchor="middle"><text x="80" y="60">5 −6 1</text><text x="220" y="60">+ 3</text></g></svg>`;
  if(id==='routes')return `<svg viewBox="0 0 300 104" aria-hidden="true"><path d="M28 64 112 25 194 25 272 64M28 64h244" fill="none" stroke="currentColor" stroke-width="2"/><g fill="var(--d-surface)" stroke="currentColor" stroke-width="2"><circle cx="28" cy="64" r="12"/><circle cx="112" cy="25" r="9"/><circle cx="194" cy="25" r="9"/><circle cx="272" cy="64" r="12"/></g><g fill="currentColor" font-size="17"><text x="65" y="30">4</text><text x="147" y="18">1</text><text x="233" y="31">4</text><text x="140" y="89">10 ?</text></g></svg>`;
  return `<svg viewBox="0 0 300 104" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M53 52q50-60 100 0M53 52q50 60 100 0M169 52h80"/><circle cx="41" cy="52" r="16"/><circle cx="162" cy="52" r="16"/></g><g fill="currentColor" font-size="21" text-anchor="middle"><text x="41" y="59">x</text><text x="162" y="59">×</text><text x="269" y="59">4</text></g></svg>`;
}
function hub(state,warning) {
  const active=ACTIVITY_IDS.filter(id=>state.trials[id]);
  return `<article class="discovery d-hub ${state.reduced?'d-reduced':''}"><header class="d-hero"><p class="d-eyebrow">LEARN / 反例工作台</p><h1>留一个问题，<br>让下一次发现接着发生。</h1><p class="d-lead">选一个看似显然的判断，亲手试着推翻它。<br>一轮之后，可以继续，也可以带着想法离开。</p><a class="d-primary d-start" href="${link(state.last)}">${active.length?'回到我的问题':'从一条路开始'} <span aria-hidden="true">↗</span></a><span class="d-meta">无需解锁 · 随时看解释 · 仅存本机</span></header>
  ${warning?`<p class="d-warning" role="status">${h(warning)}</p>`:''}
  ${active.length?`<section class="d-resume"><p class="d-eyebrow">上次留下的线索</p>${active.map(id=>`<a href="${link(id)}"><span>${h(activities[id].name)}</span><small>${h(state.trials[id].reflection||state.trials[id].reason||state.trials[id].prediction||'回到上次的输入与画面')} →</small></a>`).join('')}</section>`:''}
  <section aria-labelledby="d-choose"><div class="d-section-head"><h2 id="d-choose">从一个小小的矛盾开始</h2><span>三种判断 · 一张工作台</span></div><div class="d-cards">${ACTIVITY_IDS.map(id=>`<a class="d-card d-${id}" href="${link(id)}"><div class="d-card-top"><span>${activities[id].no}</span><small>${activities[id].subject}</small></div>${miniArt(id)}<h3>${activities[id].name}</h3><p>${activities[id].intro}</p><span class="d-card-cta">打开这个问题 <b aria-hidden="true">↗</b></span></a>`).join('')}</div></section>
  <footer class="d-footer"><p>原课程提供完整路径，这里只搭一座小桥。操作完成不代表已经学会。</p><a href="#/courses">回到课程目录 →</a>${storageControls()}</footer></article>`;
}
function storageControls(){return `<details class="d-backup"><summary>实验记录与恢复</summary><p>预测、解释和帮助背景仅存此浏览器。与原有学习记录分开保存，无自动上传。</p><div class="d-actions">${btn('导出实验草稿','export')}${btn('下载原始记录','raw')}</div><label>选择实验备份（只预览，不立即覆盖）<input type="file" data-import accept=".json,application/json"></label><div data-import-preview></div></details>`;}
function tileRow(name,left,right,reveal) {
  const best=seamResult(left,right).best, all=[...left,...right];
  return `<div class="d-array-row"><b>${name}</b><div class="d-array" aria-label="${h(array(left)+' 接 '+array(right))}">${all.map((x,i)=>`${i===left.length?'<i class="d-seam" aria-hidden="true"></i>':''}<span class="${reveal&&i>=best.start&&i<best.end?'selected':''}">${number(x)}</span>`).join('')}</div><small>${reveal?'最大和 '+best.sum:'待检验'}</small></div>`;
}
function segmentView(t,staticMode) {
  const r=[t.x], a=seamResult([5,-6,1],r).best.sum,b=seamResult([1,-6,5],r).best.sum;
  return `<div class="d-task-caption"><span>相同摘要，不同次序</span><span>可取空段</span></div><h2>接上同一个数，两行的最大和还相同吗？</h2><p>接缝左侧，两行总和都是 0，最大连续子段和都是 5。</p>
    <div class="d-arrays">${tileRow('A',[5,-6,1],r,t.revealed||staticMode)}${tileRow('B',[1,-6,5],r,t.revealed||staticMode)}</div>
    ${staticMode?'<p>静态对照：x=3 时 A=5、B=8；x=−3 时 A=B=5。把两组结果与图对照，再写下需要保留的信息。</p>':`<label class="d-inline">共同接上的数 x <input data-field="x" type="number" min="-20" max="20" step="1" value="${t.x}"></label><p class="d-meta">改变 x 会收起结果，给下一次判断留出空间。</p>`}
    ${t.revealed?`<div class="d-observation" role="status"><b>观察到：A = ${a}，B = ${b}</b><p>${t.prediction?(t.prediction===(a===b?'same':'different')?'你的判断与这一次结果一致。':'这一次结果与刚才的判断不同。'):''}这只检验了当前输入。若以后只能保留几个数字，你想记住什么？</p></div>`:''}`;
}
function graph(t) {
  const s=traceFrontiers(t.weight)[t.step], names=['s','a','b','t'];
  const positions=[[48,150],[170,53],[320,53],[442,150]];
  return `<svg class="d-graph" viewBox="0 0 490 235" role="img" aria-label="有向图：s到a为4，a到b为1，b到t为4，s到t为${t.weight}。正向已展开${s.done[0].map(i=>names[i]).join(',')||'无'}；反向已展开${s.done[1].map(i=>names[i]).join(',')||'无'}。"><defs><marker id="d-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="currentColor"/></marker></defs><g fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#d-arrow)"><path d="M67 134 151 68"/><path d="M194 53h100"/><path d="M339 68 422 134"/><path d="M73 150h342"/></g><g class="d-edge-label"><text x="99" y="89">4</text><text x="241" y="39">1</text><text x="385" y="89">4</text><text x="240" y="140">${t.weight}</text></g>${positions.map(([x,y],i)=>`<g><circle cx="${x}" cy="${y}" r="24" class="${s.done[0].includes(i)?'d-forward':s.done[1].includes(i)?'d-backward':''}"/><text x="${x}" y="${y+6}" text-anchor="middle">${names[i]}</text><text class="d-node-distance" x="${x}" y="${y+47}" text-anchor="middle">${number(s.dist[0][i])} / ${number(s.dist[1][i])}</text></g>`).join('')}</svg><p class="d-legend"><span>● 正向展开</span><span>● 反向展开</span><span>点下：从 s / 到 t 的标签</span></p>`;
}
function routeView(t,staticMode) {
  const steps=traceFrontiers(t.weight),s=steps[t.step];
  return `<div class="d-task-caption"><span>两端推进，同一张图</span><span>第 ${t.step} 步</span></div><h2>这一刻，你愿意停止搜索吗？</h2>${graph(t)}<div class="d-readings"><div><span>已找到的最短完整路线</span><strong>${number(s.best)}</strong></div><div><span>正向 / 反向队首</span><strong>${s.mins.map(number).join(' / ')}</strong></div></div><p class="d-meta">${h(s.note)} 队首是未展开标签中的最小值；∞ 表示尚未发现。</p>
  ${staticMode?`<p>静帧对照：直达边 10 时，展开 s 后已有路线 10，队首 4 / 0；再展开 t 后为 4 / 4；展开 a 后已有路线 9，队首 5 / 4。请在纸上标注你首次能保证最短的一帧。</p>`:`<div class="d-actions">${btn('上一步','prev',t.step===0?'disabled':'')}${btn('展开下一步','next',t.step===steps.length-1?'disabled':'')}<label>直达边 <select data-field="weight">${[8,9,10,13].map(w=>`<option ${w===t.weight?'selected':''}>${w}</option>`).join('')}</select></label></div>`}
  ${t.revealed?`<div class="d-observation" role="status"><b>${t.decision==='stop'?'你选择了现在停下。':t.decision==='continue'?'你选择了继续寻找依据。':'你查看了当前证据。'}</b><p>${s.stop?'当前最优路线已经可被保证。接下来请解释：为什么仍未展开的部分不能再改善它？':Number.isFinite(s.best)?`若在此停下，会报告 ${s.best}。整张图的路线检查得到 ${Math.min(9,t.weight)}。${s.best>Math.min(9,t.weight)?'一条更短的路线 s→a→b→t 推翻了这次停止。':'数值恰好正确仍不足以证明一个通用停止规则。继续比较队首与已知路线。'}`:'还没有找到完整路线，不能报告有限的路径长度。'}</p></div>`:''}`;
}
function gradientView(t,staticMode) {
  const m=measureSharedInput(t.x,t.h);
  return `<div class="d-task-caption"><span>相同值，不同依赖</span><span>x = ${t.x}</span></div><h2>同样输出 ${t.x*t.x}，变化率会相同吗？</h2><div class="d-programs"><div><b>A · 同一个输入</b><code>y = x * x</code><p>两处 x 都跟着移动。</p></div><div><b>B · 固定一个因子</b><code>c = ${t.x}<br>y = x * c</code><p>c 在测量前固定。</p></div></div>
  ${staticMode?'<p>静态对照：x=2、h=0.1 时，两次输出为 4.41 / 4.2，差商 4.1 / 2；h=0.001 时差商 4.001 / 2。x=0 的两极限都为 0，不能凭这个例子区分程序。</p>':`<div class="d-actions"><label>起点 x <select data-field="x">${[-2,0,2].map(x=>`<option ${x===t.x?'selected':''}>${x}</option>`).join('')}</select></label><label>扰动 h <select data-field="h">${[1,0.1,0.001,-0.1].map(x=>`<option ${x===t.h?'selected':''}>${x}</option>`).join('')}</select></label></div>`}
  ${t.revealed?`<div class="d-observation" role="status"><b>真实重算：A ${number(m.sharedAfter)} / B ${number(m.fixedAfter)}</b><p>差商 (新输出 − 原输出) / h：A <strong>${number(m.sharedSlope)}</strong>，B <strong>${number(m.fixedSlope)}</strong>。有限步长的差商还不是极限导数；换一个 h 再比较。</p></div>`:''}`;
}
const hints={segment:['请把 A、B 中靠近接缝的数放在一起比较。总和相同，哪些连续选择不同？','跨过接缝的连续段必须贴住两个端点。再想：合并后的摘要怎样继续和第三段合并？'],routes:['已经找到的路线说明“有这么长”。你还需要哪一种证据才能排除更短？','比较两端尚未展开的最小距离，与已经找到的完整路线。一个真正更短的路径能躲过哪些展开？'],gradient:['把 x 增加同样的一小步。两段程序里，到底哪些位置跟着变了？','同一个对象经过两个乘法入口收到贡献。逐条列出它们，检查后一条更新会不会抹掉前一条。']};
const explanations={
 segment:`<p>跨界最优段由左侧最佳后缀和右侧最佳前缀组成。为继续合并，摘要还需总和与内部最佳值。允许空段时四项都可用 0 初始化。</p><pre>sum = L.sum + R.sum
prefix = max(L.prefix, L.sum + R.prefix)
suffix = max(R.suffix, R.sum + L.suffix)
best = max(L.best, R.best, L.suffix + R.prefix)</pre><p>证明按最佳区间完全在左、完全在右、跨界三类穷尽。前后缀的推导也须分“停在本侧”与“穿过整侧”。只有多个算例都对，尚未证明合并闭合。</p>`,
 routes:`<p>记已发现完整路线的最小长度为 μ；前后向有效队首为 α、β。非负边权、反向沿反图、每次松弛都更新可拼接路线时，α + β ≥ μ 是充分停止条件。</p><p>若有更短路径仍穿过两侧未处理部分，它需要至少 α + β；若它已跨过两侧处理边界，相遇处的松弛已把它记入 μ。两种情形都不能漏掉一条小于 μ 的路线。空队列、s=t 和陈旧堆项须另行正确处理。</p><p>第一次找到有限 μ 只给上界。队首之和不是所有路径的统一下界，而是尚可能改善 μ 的未解决部分的界。此原型采用较小队首先展开、平手选正向。</p>`,
 gradient:`<p>共享输入的展开是 (x+h)² = x²+2xh+h²，差商为 2x+h，极限为 2x。固定 c 的差商恒为 c。前向数值相同，计算图仍可能不同。</p><p>反向传播中，一个节点沿不同使用位置收到的贡献应相加。对 y=x*x，每条边的局部贡献为 x×上游梯度，两条相加为 2x；以赋值覆盖会只留下 x。</p><p>图拓扑去重与贡献累加是两回事：同一节点可以只访问一次，仍要累加每条边。每次新的反向调用前还应明确梯度清零策略。</p>`
};
function construction(id,t) {
  if(id==='segment') {
    let result='';
    if(t.challenge){const c=challengeSummary(t.fields);result=c?`<p>找到一对摘要相同的区间：A=${array(c.a)}，B=${array(c.b)}。${c.side==='right'?'右接':'左接'} ${array(c.c)}${c.d?'，另一侧再接 '+array(c.d):''} 后，最大和分别为 ${c.aBest}、${c.bBest}。这个反例说明当前保存的信息仍不足。</p>`:'<p>这个小搜索未找到反例。四项摘要有闭合合并公式；请用三种区间位置分类证明。有限枚举本身不保证一般正确。</p>';}
    return `<details class="d-build" data-help="2"><summary>构造一个可继续合并的摘要</summary><p>这一步会提供四种候选量。若想先独立命名，可以只在下方笔记写下你的方案。勾选你认为必须留下的信息，再尝试找反例。</p><fieldset><legend>摘要保存哪些量？</legend>${[['sum','总和'],['best','内部最大子段和'],['prefix','贴左端的最大和'],['suffix','贴右端的最大和']].map(([key,title])=>`<label><input type="checkbox" data-summary="${key}" ${t.fields.includes(key)?'checked':''}>${title}</label>`).join('')}</fieldset>${btn('寻找反例','challenge')}<div role="status">${result}</div></details>`;
  }
  if(id==='gradient')return `<details class="d-build" data-help="2"><summary>把发现变成一次程序修改</summary><p>设上游梯度为 1，每条边依次贡献 x。选择两条语句的更新方式，再对照测量。</p><pre>x.grad <span data-op-text>${t.operator==='add'?'+=':'='}</span> x
x.grad <span data-op-text>${t.operator==='add'?'+=':'='}</span> x</pre><label>更新方式 <select data-field="operator"><option value="assign" ${t.operator==='assign'?'selected':''}>赋值 =</option><option value="add" ${t.operator==='add'?'selected':''}>累加 +=</option></select></label>${btn('运行这两条更新','challenge')}${t.challenge?`<p role="status">得到 x.grad = ${t.operator==='add'?2*t.x:t.x}；共享输入的极限导数为 ${2*t.x}。${t.x===0?'此输入无法区分两种更新，请自选非零输入。':t.operator==='add'?'当前例子吻合。再检查 x*x+x，哪个节点收到几条贡献？':'当前输入暴露了覆盖贡献的问题。'}</p>`:''}<p><a href="./materials/micrograd/engine.py" download>下载 Python 求导器起步文件</a> · <a href="./materials/micrograd/check_example.py" download>下载公开检查例</a></p></details>`;
  return `<details class="d-build"><summary>挑战你的停止规则</summary><p>不先看解释，写下一个可执行的停止条件。改变直达边为 8、9、13，检查规则是否把“碰巧最优”当成“已被证明”。这张四点图只适合反例练习，不能独自验证所有图。</p><p>更进一步：若后向搜索误沿原图，或边可以为负，推理中的哪一步不再成立？</p></details>`;
}
function lesson(id,state,options,warning) {
  const a=activities[id],t=state.trials[id]||defaultTrial(id),isStatic=options.get('mode')==='static', invite=options.has('invite')?(options.get('invite')==='plain'?'plain':'question'):t.invite;
  return `<article class="discovery d-lesson ${options.get('look')==='paper'?'d-paper':''} ${state.reduced?'d-reduced':''}" data-studio="${id}" data-invite="${invite}"><nav class="d-breadcrumb"><a href="#/studio">← 反例工作台</a><span>${a.no} / ${a.subject}</span></nav><header class="d-lesson-head"><p class="d-eyebrow">${isStatic?'静态讲义 · 同一问题':'试着推翻一个想法'}</p><h1>${a.name}</h1><p>${a.intro}</p></header>
  ${warning?`<p class="d-warning" role="status">${h(warning)}</p>`:''}<div class="d-layout"><section class="d-canvas" aria-label="实验与证据">${isStatic?renderStaticEvidence(id):id==='segment'?segmentView(t,false):id==='routes'?routeView(t,false):gradientView(t,false)}</section>
  <aside class="d-notebook"><p class="d-eyebrow">你的判断</p><h2>${id==='routes'?'此刻，停还是继续？':id==='segment'?'相同，还是不同？':'预测两种变化率'}</h2>${id==='gradient'?`<label>我的预测<input data-field="prediction" maxlength="2000" placeholder="例如：A 约为…，B 约为…" value="${h(t.prediction)}"></label>`:`<div class="d-choices" role="group" aria-label="预测">${(id==='segment'?[['same','相同'],['different','不同']]:[['stop','现在停'],['continue','继续找']]).map(([v,label])=>btn(label,'choose',`data-choice="${v}" aria-pressed="${(id==='segment'?t.prediction:t.decision)===v}"`)).join('')}</div>`}
  ${t.previous?`<p class="d-prior">上次的想法：${h(t.previous)}</p>`:""}<label>我这样判断的理由（可跳过）<textarea data-field="reason" maxlength="2000" rows="3" placeholder="先留下一个可以被推翻的想法">${h(t.reason)}</textarea></label>${btn(isStatic?'记录这次判断':'检验这次判断','run','class="d-primary"')}<p class="d-meta">可以直接检验，也可以随时看解释。</p><details data-help="1" class="d-help"><summary>给我一点提示</summary><p>${hints[id][0]}</p><details data-help="2"><summary>再具体一些</summary><p>${hints[id][1]}</p></details></details><details class="d-prereq"><summary>需要哪些基础？</summary><p>${a.prereq}</p><a href="${a.source}">打开原有课程与准备材料 →</a></details><label class="d-motion"><input type="checkbox" data-motion ${state.reduced?'checked':''}>减少动态效果</label></aside></div>
  <section class="d-reasoning"><details data-help="2" class="d-explanation"><summary>直接阅读完整解释</summary>${explanations[id]}<a href="${a.source}">回到课程，继续证明与实现 →</a></details>${isStatic?`<details class="d-build" data-help="2"><summary>在纸上独立构造</summary><p>${id==='segment'?'写出可以继续合并的摘要，说明跨界、前缀与后缀三种关系；尝试删除其中一个量并构造反例。':id==='routes'?'为三张静帧写出停止判断，再把直达边改为8、9、13，尝试推翻你提出的规则。':'独立推导 x*x+x，并为共享节点写出反向更新；用非零输入和数值扰动检查。'}</p></details>`:construction(id,t)}<label class="d-reflection">现在的规则，以及还没想通的地方<textarea data-field="reflection" maxlength="2000" rows="3" placeholder="什么证据改变了你的想法？换一个问题时，你会维护什么？">${h(t.reflection)}</textarea></label>
  ${!t.finished?`<div class="d-actions">${btn('把这一轮留在这里','finish','class="d-primary"')}${btn('保存实验并返回','leave')}</div>`:`<section class="d-ending"><p class="d-eyebrow">一个自然的停靠点</p><h2>这一次，你留下了一个可再检验的想法。</h2><blockquote>${h(t.reflection||t.reason||'还没有写下规则，也可以留待下次。')}</blockquote><p class="d-next-prompt">${invite==='question'?(id==='routes'?`下一轮只把直达边改为 ${t.weight===10?8:10}。你的停止判断还站得住吗？`:id==='segment'?`下一轮只把邻居改为 ${t.x===3?-3:3}。你保存的信息还够用吗？`:'下一轮只改变输入起点。你刚刚的解释还能预测变化吗？'):'下一轮：同一问题，改变一个输入。'}</p><p class="d-meta">${id==='routes'?'下一题直达边：'+(t.weight===10?8:10):id==='segment'?'下一题 x：'+(t.x===3?-3:3):'下一题 x：'+(t.x===2?-2:2)}。其余规则相同。</p><div class="d-actions">${btn('继续一轮','again','class="d-primary"')}${btn('保存实验并返回','leave')}</div><p class="d-meta">没有连续打卡，也没有过期惩罚。你的草稿会留在这里。</p></section>`}
  <p class="d-save-status" role="status" data-save-status>${warning?h(warning):'当前草稿仅保存到本机。'}</p>${storageControls()}</section></article>`;
}
export function discoveryPage(path,options=new URLSearchParams()) {
  if(path!=='studio'&&!path.startsWith('studio/'))return null;
  const id=path.split('/')[1],s=getStore();
  if(!id)return hub(s.state,s.warning);
  if(!activities[id])return `<article class="discovery"><h1>没有这个实验</h1><a href="#/studio">返回反例工作台</a></article>`;
  return lesson(id,s.state,options,s.warning);
}
export function bindDiscovery(root,path,options) {
  if(path!=='studio'&&!path.startsWith('studio/'))return;
  const s=getStore(),id=path.split('/')[1];
  let t=activities[id]?(s.state.trials[id]??=defaultTrial(id)):null;
  const invite=options.has('invite')?(options.get('invite')==='plain'?'plain':'question'):(t?.invite||'question');
  if(t){s.state.last=id;t.invite=invite;}
  function save(){const ok=s.save(s.state);const status=root.querySelector('[data-save-status]');if(status)status.textContent=ok?'已保存到本机。':s.warning;return ok;}
  function event(kind){s.state.events.push({id,kind,at:new Date().toISOString(),help:t.help,invite,round:t.round});}
  function repaint(focus) {const open=[...root.querySelectorAll('.discovery details[open]')].map(d=>d.className||d.dataset.help);const article=root.querySelector('.discovery');if(article)article.outerHTML=discoveryPage(path,options);else root.innerHTML=discoveryPage(path,options);bindDiscovery(root,path,options);for(const d of root.querySelectorAll('.discovery details'))if(open.includes(d.className||d.dataset.help))d.open=true;if(focus)root.querySelector(focus)?.focus();}
  root.querySelectorAll('[data-field]').forEach(el=>el.addEventListener(['reason','prediction','reflection'].includes(el.dataset.field)?'input':'change',()=>{
    const k=el.dataset.field;
    if(['reason','prediction','reflection'].includes(k)){t[k]=el.value;save();return;}
    if(k==='operator'){t.operator=el.value;t.challenge=false;root.querySelectorAll('[data-op-text]').forEach(n=>n.textContent=t.operator==='add'?'+=':'=');}
    else {const v=Number(el.value);if(!el.checkValidity()||el.value==='')return;t[k]=v;t.revealed=false;t.challenge=false;if(k==='weight')t.step=0;}
    save();repaint(`[data-field="${k}"]`);
  }));
  root.querySelectorAll('[data-summary]').forEach(el=>el.addEventListener('change',()=>{t.fields=[...root.querySelectorAll('[data-summary]:checked')].map(x=>x.dataset.summary);t.challenge=false;save();repaint(`[data-summary="${el.dataset.summary}"]`);}));
  root.querySelectorAll('[data-help]').forEach(el=>el.addEventListener('toggle',()=>{if(el.open){t.help=Math.max(t.help,Number(el.dataset.help));save();}}));
  root.querySelector('[data-motion]')?.addEventListener('change',e=>{s.state.reduced=e.target.checked;root.querySelector('.discovery').classList.toggle('d-reduced',s.state.reduced);save();});
  const download=(content,name)=>{const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  root.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{
    const action=el.dataset.action;
    if(action==='export'){download(JSON.stringify(s.state,null,2),'learn-experiment-'+new Date().toISOString().replaceAll(':','-')+'.json');return;}
    if(action==='raw'){download(s.raw??'null','learn-experiment-original.json');return;}
    if(!t)return;
    if(action==='choose'){if(id==='segment')t.prediction=el.dataset.choice;else t.decision=el.dataset.choice;t.revealed=false;}
    if(action==='run'){t.revealed=true;event(t.prediction.trim()||t.decision||t.reason.trim()?'prediction-check':'inspect');}
    if(action==='prev'||action==='next'){t.step+=action==='next'?1:-1;t.revealed=false;t.decision='';}
    if(action==='challenge'){t.challenge=true;event('construction-check');}
    if(action==='finish'){t.finished=true;event('finish');}
    if(action==='leave'){event('save-exit');if(save())location.hash='/studio';return;}
    if(action==='again'){
      event('continue');const previous=t.reflection||t.reason;
      s.state.history.push({id,trial:JSON.parse(JSON.stringify(t))});
      const next=defaultTrial(id);next.round=t.round+1;next.x=id==='segment'?(t.x===3?-3:3):t.x===2?-2:2;next.weight=t.weight===10?8:10;
      next.previous=previous.slice(0,2000);next.help=t.help;next.invite=invite;s.state.trials[id]=next;t=next;
    }
    save();repaint(action==='finish'?'[data-action="again"]':action==='again'?'[data-choice], [data-field="prediction"]':`[data-action="${action}"]${action==='choose'?`[data-choice="${el.dataset.choice}"]`:''}`);
  }));
  root.querySelector('[data-import]')?.addEventListener('change',async e=>{
    const area=root.querySelector('[data-import-preview]');try{
      const file=e.target.files?.[0];if(!file)return;if(file.size>2e6)throw new Error('文件过大');
      const candidate=normalizeStudio(JSON.parse(await file.text()));
      area.innerHTML=`<p>备份含 ${Object.keys(candidate.trials).length} 个活动、${candidate.events.length} 条操作记录。恢复会替换本机实验草稿；请先导出当前草稿。</p>${btn('确认恢复这份实验备份','confirm-import')}`;
      area.querySelector('button').addEventListener('click',()=>{if(s.save(candidate,{replaceUnreadable:true})){s.state=candidate;repaint();}else area.textContent=s.warning;});
    }catch{area.textContent='无法读取这份备份，现有记录未被替换。';}
  });
}
