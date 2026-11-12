import { microgradPage, mountMicrograd } from './micrograd-view.mjs';
import {
  COURSE_LINKS, SCENARIOS, TEACHER_DIST, STORAGE_KEY,
  studentDistribution, klDivergence, klLogitGradient,
  runHarness, normalizeAgent, defaultProgress, normalizeProgress, backupFileName,
} from './logic.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const escapeHtml = (input) => String(input ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const external = (url, label, cls = 'source-link') =>
  `<a class="${cls}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`;
const fmt = number => Number(number).toFixed(4);

const icons = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  flask:'<path d="M9 3h6M10 3v7l-5.6 8.7A2 2 0 0 0 6.1 22h11.8a2 2 0 0 0 1.7-3.3L14 10V3"/><path d="M8 16h8"/>',
  network:'<rect x="2" y="2" width="7" height="7" rx="1"/><rect x="15" y="15" width="7" height="7" rx="1"/><path d="M8 8l8 8M16 4h6v6M6 14v8h8"/>',
  journal:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  sync:'<path d="M8 7h8m-3-3 3 3-3 3M16 17H8m3-3-3 3 3 3"/><path d="M4 4h3M20 20h-3"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
};
const svg = (name) => `<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;

const nav = [
  ['home','Home','首页'],['learn','Learn','交互课程'],['lab','Lab','实验工作室'],
  ['atlas','Atlas','知识航图'],['journal','Journal','学习记录'],['sync','Sync','协作与备份'],
];

let progress;
try { progress = normalizeProgress(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')); }
catch { progress = defaultProgress(); }
let atlas = null;
const session = {studentCat:95, klRevealed:false, atlasQuery:'', atlasRoute:'all', atlasNode:'F01', notices:[]};

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); return true; }
  catch { showToast('浏览器存储失败。请使用 Journal 导出备份，或检查隐私浏览模式。'); return false; }
}
function record(kind, summary, help = '未记录') {
  progress.evidence.push({kind, summary, help, date: new Date().toISOString()});
  progress.evidence = progress.evidence.slice(-80);
  return persist();
}
function showToast(message) {
  let box = $('#toast');
  if (!box) {box = document.createElement('div');box.id='toast';box.setAttribute('role','status');box.style.cssText='position:fixed;bottom:20px;right:20px;z-index:20;max-width:min(90vw,400px);padding:14px 18px;border-radius:12px;background:#143b37;color:#fff;box-shadow:0 18px 45px #102c3540;font-size:13px;line-height:1.7';document.body.appendChild(box);}
  box.textContent = message;
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => box?.remove(), 4200);
}
function getPath() {
  const path = location.hash.replace(/^#\/?/,'').replace(/\?.*$/,'');
  return path || 'home';
}
function navRoute(path) { return path.split('/')[0]; }
function shell(route, body) {
  const family=navRoute(route);
  const current=nav.find(item=>item[0]===family)||nav[0];
  return `<div class="app">
    <aside class="sidebar" aria-label="主导航">
      <a class="brand" href="#/home" aria-label="LEARN 首页"><div class="brand-mark">L</div><div><span class="brand-word">LEARN</span><span class="brand-sub">WORKBENCH / ALPHA</span></div></a>
      <div class="nav-label">YOUR WORKSPACE</div>
      <nav class="side-nav" aria-label="学习工作台导航">${nav.map(([key,label,zh])=>`<a href="#/${key}" class="side-link ${family===key?'active':''}" ${family===key?'aria-current="page"':''}>${svg(key)}<span>${label} · ${zh}</span></a>`).join('')}</nav>
      <div class="side-spacer"></div><div class="side-foot"><span class="status-dot"></span>本地模式 · 零 API 调用<br>个人数据默认留在此浏览器<br>开源课程与真实作品优先</div>
    </aside>
    <div class="workspace"><header class="topbar"><div class="crumb">LEARN <span style="color:#b0bfbd">/</span> <strong>${current[1]}</strong></div><div class="top-actions"><span class="private-tag">◉ &nbsp; 本地私有记录</span><a class="icon-btn" href="#/journal" aria-label="打开学习记录" title="记录与备份">${svg('journal')}</a></div></header><main class="content" id="page-content" tabindex="-1">${body}<div class="foot-note">LEARN Workbench · alpha / 学习材料与测评结论分开记录 · 无登录、无追踪、无外部模型调用</div></main></div>
  </div>`;
}
function section(title, caption='') {return `<div class="section-header"><h2>${title}</h2><span>${caption}</span></div>`;}
function moduleCard({tag, icon, title, text, href, foot, color=''}) {
  return `<a class="card card-click" href="${href}"><div class="type-icon ${color}">${icon}</div><h3>${title}</h3><p>${text}</p><div class="card-foot"><span>${tag} · ${foot}</span>${svg('arrow')}</div></a>`;
}
function microgradCard() {
  return moduleCard({
    tag: 'Zero to Hero', icon: '×', title: 'micrograd · 两个相等的输入',
    text: '同时扰动两段乘法程序的输入，追踪每个因子，再把你的解释写成求导器。',
    href: '#/learn/micrograd', foot: '第一讲 · 数值实验与 Python 构造', color: 'warm',
  });
}
function home() {
  const resume = progress.lastRoute || '#/learn/agent';
  return `<section class="hero"><p class="eyebrow">YOUR LEARNING, IN PROGRESS</p><h1>继续思考，<br><strong>而不是重新开始。</strong></h1><p>一处工作台，连接成熟课程、真实实验和你自己的推导。没有必须逐页生啃的文件，也没有强制通关。</p><div class="hero-actions"><a class="btn btn-primary" href="${escapeHtml(resume)}">继续上次学习 ${svg('arrow')}</a><a class="btn btn-ghost-dark" href="#/learn">浏览学习单元</a></div></section>
    <div class="stats"><div class="stat"><strong>03</strong><span>可用的交互学习试点</span></div><div class="stat"><strong>${atlas?.nodes?.length ?? '20'}</strong><span>继承 Atlas 的知识节点</span></div><div class="stat"><strong>${progress.evidence.length}</strong><span>本地记录的学习事件</span></div></div>
    ${section('当前学习方向','一门连续主课 + 按需机制补桥')}
    <div class="grid2">
      ${moduleCard({tag:'主线课程',icon:'↗',title:'从模型回复到可控程序',text:'Stanford CS329Z 导学：观察分类、程序合同与摘要流程如何协作。浏览器内是教学模拟；真正作业仍来自原仓库。',href:'#/learn/agent',foot:'Agent Engineering'})}
      ${moduleCard({tag:'机制补桥',icon:'∂',title:'KL 散度与知识蒸馏',text:'直接调整学生概率，观察损失和梯度。先预测，再验证“学生该往哪里更新”。',href:'#/learn/kl',foot:'Model Fundamentals',color:'blue'})}
    ${microgradCard()}
    </div>
    ${section('工作台的三个承诺','不把页面浏览算作真正掌握')}
    <div class="grid3"><div class="card"><div class="type-icon">01</div><h3>先理解</h3><p>从清晰的问题与原始课程材料出发。你可以独立探索，也可以直接看解释。</p></div><div class="card"><div class="type-icon warm">02</div><h3>亲自构造</h3><p>课程原作业与实验工作台相互补充。可运行结果不等同于机制理解。</p></div><div class="card"><div class="type-icon blue">03</div><h3>带走能力</h3><p>记录预测、修订和陌生变化，不用装饰性的掌握百分比代替证据。</p></div></div>
    <div class="light-panel" style="margin-top:22px"><h3>从其他学习对话继续建设</h3><p>其他 ChatGPT 对话可以通过 GitHub 提交课程组件；个人笔记则只进入私有备份。<a class="source-link" href="#/sync">查看协作与备份方式 →</a></p></div>`;
}
function learnIndex() {
  return `<p class="eyebrow">CURATED LEARNING</p><h1 class="page-title">交互课程</h1><p class="lead">成熟课程负责连续教学。这个平台负责把必要的机制可视化、把困难拆解清楚，并把思考和实际作业连接起来。下面是可用试点，不是完整课程认证。</p><div class="grid2">
    ${moduleCard({tag:'Agent · 导学',icon:'↗',title:'CS329Z — Harness 的最小机制',text:'区分模型给出的文本、程序允许的状态，以及结果进入摘要的过程。包含真正作业入口。',href:'#/learn/agent',foot:'1 个导学单元'})}
    ${moduleCard({tag:'Math · 探索',icon:'∂',title:'知识蒸馏 — 为什么梯度这样走',text:'从教师 80% 与学生 95% 的猫概率出发，推导 KL 损失和更新方向。',href:'#/learn/kl',foot:'1 个交互实验',color:'blue'})}
    ${microgradCard()}
    </div><div class="light-panel" style="margin-top:20px"><h3>课程版权与完整性</h3><p>我们链接外部课程的原始作业、视频与代码；不假装已复刻完整教学和评分服务。本站的模拟器是原创的形成性练习，不是 CS329Z 官方判题环境。</p></div>`;
}
function learnAgent() {
  return `<p class="eyebrow">STANFORD CS329Z / INTRODUCTORY BRIDGE</p><h1 class="page-title">从模型回复到可控程序</h1><p class="lead">你真正需要理解的不是“写两段 Prompt”，而是程序如何把不可靠的文本变成可以推理、验证和处理异常的状态。</p>
    <div class="two-columns"><div>
      <article class="lesson-block"><div class="step-tag">01 / 观察现象</div><h2>模型说了 high，意味着什么？</h2><p>一条邮件进入程序。模型被要求给出优先级，它可能回复 <span class="inline-code">high</span>、<span class="inline-code">low</span>，也可能回复 <span class="inline-code">maybe</span>。程序面对的首先是文本，而不是可靠的枚举值。</p>
        <div class="diagram"><span>输入邮件</span><i>→</i><span>模型文本</span><i>→</i><span>校验 / 归一化</span><i>→</i><span>程序状态</span></div><blockquote>如果模型给出的回复不是合同允许的类别，这意味着“优先级低”，还是意味着“目前不知道”？两种解释会如何改变后面的摘要？</blockquote>
        <details class="hint"><summary>提示 · 只指出关键矛盾</summary><p>两条记录去了同一个地方，是否意味着它们包含同样的信息？</p></details></article>
      <article class="lesson-block"><div class="step-tag">02 / 进入第二个阶段</div><h2>处理规则与分类证据</h2><p>第二步要把分类记录汇总成 daily digest。程序可以为无法识别的回复指定去向；但“按某类处理”与“解析出了某类”不是同一件事。保留原始状态，才能检查这条记录为什么进入摘要。</p><p>正确的软件合同只能保证程序按约定处理状态，不能保证模型判断某封邮件真的重要。区分这两种正确性，是这次练习的核心。</p>
        <div class="diagram"><span>分类记录</span><i>→</i><span>明确的异常语义</span><i>→</i><span>摘要输入</span><i>→</i><span>最终内容</span></div></article>
      <article class="lesson-block"><div class="step-tag">03 / 亲自验证</div><h2>运行一个确定性的变化实验</h2><p>实验室提供预设模型回复，整个过程无需 API。同一批回复交给两份处理规则，比较它们的执行轨迹。你可以先想一想，也可以直接运行；提示和完整解释随时可看。最后返回 Stanford 原作业，完成真实的代码、接口和测试。</p><a class="btn btn-primary" href="#/lab/agent">打开 Agent 实验室 ${svg('arrow')}</a></article>
    </div><aside class="stack lesson-side"><div class="card"><h3>学习目标</h3><ol><li>区分输出文本与程序状态</li><li>解释异常值如何传播</li><li>提出自己的处理合同并验证</li></ol><p>不宣称完成模型训练、完整 Agent loop 或生产部署。</p></div>
      <div class="card"><h3>原始资料</h3><p>${external(COURSE_LINKS.cs329z,'CS329Z HW1 仓库')}</p><p>${external(COURSE_LINKS.cs329zAssignment,'作业 PDF · v26.1.0（固定版本）')}</p><p>建议按课程材料完成 Problem 1 <span class="inline-code">priority</span> 与 Problem 2 <span class="inline-code">daily_digest</span>。该版本 P1 在没有标签时返回 <code>unknown</code>，P2 要求把它按 <code>normal</code> 处理。本站 <code>high / low / unclassified</code> 是教学用词，解析器和摘要输入均为简化例子，不是官方实现。请按原题的完整签名、理由、长度与内容要求完成作业。</p></div>
      <div class="warning-panel">本站练习使用独立构造的邮件和 scripted replies。不会调用真实模型，也不会改动你的 Python 作业仓库。</div></aside></div>`;
}
function learnKL() {
  return `<p class="eyebrow">MODEL FUNDAMENTALS / CONCEPT BRIDGE</p><h1 class="page-title">为什么 KL 梯度会让猫的概率下降？</h1><p class="lead">从一个已经很接近正确答案、但还不等于教师的学生模型开始。问题不是“谁更自信”，而是两种概率分布到底哪里不一致。</p>
    <div class="two-columns"><div>
      <article class="lesson-block"><div class="step-tag">01 / 一个具体矛盾</div><h2>教师 80%，学生 95%</h2><p>教师把猫设为 80% 的概率，学生却给了 95%。普通 one-hot 监督学习通常鼓励正确类别概率继续上升；只考虑教师到学生的 KL 散度，情况不同。</p><blockquote>教师不是在说“猫一定正确”，而是在给出一整个分布。把学生的猫概率推到 99%，不一定更像教师。</blockquote></article>
      <article class="lesson-block"><div class="step-tag">02 / 从分布到梯度</div><h2>KL(P || Q) 到底惩罚了什么？</h2><p>教师分布是 <span class="inline-code">P</span>，学生分布是 <span class="inline-code">Q</span>。教师权重较大的结果，在损失里更重要；但这并不意味着只要最大类别一样，损失就会降低。</p><p><strong>KL(P || Q) = Σ Pᵢ · ln(Pᵢ / Qᵢ)</strong></p><p>如果 Q 来自 softmax logits，关于学生 logit zᵢ 的导数是 <strong>Qᵢ − Pᵢ</strong>。因此当学生猫概率高于教师，梯度下降会降低猫对应的 logit；概率之间的耦合由 softmax 处理。</p><details class="hint"><summary>展开 · 为什么不能只看 P(cat)/Q(cat)？</summary><p>概率需要一起归一化。增加一个类别的概率会压低其他类别。KL 比较完整分布，单个概率的比值不能独自决定整个参数更新。</p></details></article>
      <article class="lesson-block"><div class="step-tag">03 / 用实验检查</div><h2>自己移动学生分布</h2><p>把学生猫概率从 95% 向 80% 移动，观察 KL 如何变化；之后试着反向移动，验证自己的预测。这里其余两个类别会按固定比例分配剩余概率，所以这是一个受控切片，不是完整模型训练。</p><a class="btn btn-primary" href="#/lab/kl">打开 KL 实验室 ${svg('arrow')}</a></article>
      </div><aside class="stack lesson-side"><div class="card"><h3>这次只学习一件事</h3><p>为什么在教师猫概率 80% 、学生猫概率 95% 时，KL 蒸馏与 one-hot 监督可能要求不同的更新方向。</p><p>之后才需要讨论温度 T、混合损失和真实语言模型训练。</p></div><div class="card"><h3>推荐原始资料</h3><p>${external(COURSE_LINKS.karpathy,'Karpathy · Zero to Hero')}</p><p>这个概念补桥不是 Karpathy 视频中的原文转载或完整课程复刻。</p></div></aside></div>`;
}
function labIndex() {
  return `<p class="eyebrow">EXPERIMENT STUDIO</p><h1 class="page-title">实验工作室</h1><p class="lead">可以先作预测再运行，也可以直接看演示。实验结果会标明帮助条件，不能自动升级为独立能力证明。</p><div class="grid2">
    ${moduleCard({tag:'控制流程',icon:'↗',title:'Scripted Agent Replies',text:'不调用模型 API，清楚观察字符串、类别、未知状态和摘要之间的关系。',href:'#/lab/agent',foot:'确定性模拟器'})}
    ${moduleCard({tag:'概率机制',icon:'∂',title:'KL · 分布与梯度',text:'滑动概率，实时计算 KL(P || Q) 和 softmax logit 梯度。',href:'#/lab/kl',foot:'交互计算实验',color:'blue'})}
    ${microgradCard()}
  </div>`;
}
const agentPolicyNames = {low:'按 low 送入摘要', drop:'不送入摘要'};
const agentScenarioNames = {changed:'含未分类回复', baseline:'全部可分类'};
function labAgent() {
  const state = progress.agent;
  const selected = SCENARIOS[state.scenario];
  const a = state.shown ? runHarness(state.scenario, 'keep') : null;
  const b = state.shown ? runHarness(state.scenario, state.policy) : null;
  const route = row => !row.included ? '不进入摘要输入' : `进入 · ${row.routedCategory === 'unclassified' ? '未分类' : row.routedCategory}`;
  return `<section class="agent-unit" aria-labelledby="agent-title">
    <p class="eyebrow">LAB 01 / 同一输入，两份规则</p><h1 class="page-title" id="agent-title">一条无法分类的回复，后来去了哪里？</h1>
    <p class="lead">固定模型回复和解析器，只改变未分类记录的下游处理。观察去向，再判断这次改变提供了什么信息。无需填写预测即可运行。</p>
    <div class="stack">
      <article class="card"><h2>先看输入</h2><div class="field"><label for="agent-scenario">输入情境</label><select id="agent-scenario">${Object.entries(agentScenarioNames).map(([key,label])=>`<option value="${key}" ${state.scenario===key?'selected':''}>${label}</option>`).join('')}</select></div>
      <div class="agent-table-scroll" role="region" aria-label="固定输入" tabindex="0"><table class="case-table"><caption>两份规则使用完全相同的三条输入；引号保留回复中的空格。</caption><thead><tr><th scope="col">邮件</th><th scope="col">主题</th><th scope="col">脚本回复</th></tr></thead><tbody>${selected.items.map(item=>`<tr><th scope="row">${item.id}</th><td>${escapeHtml(item.subject)}</td><td><code>${escapeHtml(JSON.stringify(item.reply))}</code></td></tr>`).join('')}</tbody></table></div>
      <p class="tiny subtle">固定解析器：去首尾空白、转小写；恰好等于 high 或 low 才接收，否则记为 unclassified（未分类）。这是本地示例合同，不判断邮件实际是否重要。</p></article>
      <article class="card"><h2>只改一条处理规则</h2><p>已识别的 high / low 都原样进入摘要输入。下面只约定未分类记录的去向，不修改脚本回复或解析结果。</p>
      <div class="agent-pair"><div class="light-panel"><h3>A · 固定规则</h3><p>保留未分类标记，送入摘要。</p></div><div class="light-panel"><label class="field-label" for="agent-policy">B · 未分类记录怎样处理</label><select id="agent-policy">${Object.entries(agentPolicyNames).map(([key,label])=>`<option value="${key}" ${state.policy===key?'selected':''}>${label}</option>`).join('')}</select></div></div>
      <div class="actions agent-actions"><button class="btn btn-primary" id="agent-run" type="button">运行两份规则</button><button class="btn btn-outline" id="agent-reset" type="button">恢复起始条件</button></div><p class="tiny subtle">切换条件会收起旧结果；条件与展开状态自动保存。恢复起始条件保留笔记和历史记录。</p>
      <details class="hint" data-agent-detail="hintOpen" ${state.hintOpen?'open':''}><summary>一点提示</summary><p>两条记录去了同一个地方，是否意味着它们包含同样的信息？</p></details></article>
      ${a?`<article class="card" id="agent-result" tabindex="-1" aria-labelledby="agent-result-title"><h2 id="agent-result-title">对比结果 · ${agentScenarioNames[state.scenario]}</h2><p>A 保留未分类；B ${agentPolicyNames[state.policy]}。这是确定性的摘要输入拼装，不是模型生成的摘要。</p>
      <div class="agent-table-scroll" role="region" aria-label="两份规则的逐条去向" tabindex="0"><table class="case-table"><caption>解析状态单独保留；下游去向由规则决定。</caption><thead><tr><th scope="col">邮件</th><th scope="col">共同解析状态</th><th scope="col">A 的去向</th><th scope="col">B 的去向</th></tr></thead><tbody>${a.rows.map((row,i)=>`<tr><th scope="row">${row.id}</th><td><code>${row.category}</code></td><td>${route(row)}</td><td>${route(b.rows[i])}</td></tr>`).join('')}</tbody></table></div>
      <div class="agent-pair agent-output">${[['A',a],['B',b]].map(([name,result])=>`<section><h3>${name} · 摘要输入（${result.includedCount} 条）</h3><pre class="agent-digest">${escapeHtml(result.digest || '（空）')}</pre></section>`).join('')}</div>
      <p>只看 B 的摘要输入，哪些解析信息还能恢复？切换输入情境，再检查你的判断。</p><button class="btn btn-outline" id="agent-record" type="button">把本次对比记入 Journal</button><p class="tiny subtle">只记录观察条件，不判分，也不标记独立掌握。</p></article>`:''}
      <article class="card"><details data-agent-detail="explanationOpen" ${state.explanationOpen?'open':''}><summary>完整解释与课程合同</summary>
        <p>在“含未分类回复”中，<code>" HIGH "</code> 被归一化为 <code>high</code>；<code>"maybe"</code> 仍是 <code>unclassified</code>。A 保留该标记。B 选择 low 时，这条记录按 LOW 进入摘要输入；选择不送入时，摘要输入少一条，但轨迹仍保留原回复及解析状态。</p>
        <p>因此三种处理可以改变下游看到的内容，却没有增加上游分类证据。全部可分类时，这三种规则的摘要输入相同：不存在触发不同处理的记录。相同结果不证明规则相同，需找能区分它们的输入。</p>
        <p>回退策略本身并非错误。${external(COURSE_LINKS.cs329zAssignment,'CS329Z HW1 v26.1.0 §4.1–4.2')} 要求 P1 在回复没有标签时返回 unknown，P2 将 unknown 按 normal 处理。那是下游合同，不是新获得的分类证据。本例的 high / low 不与官方 urgent / normal / ignore 一一对应，也没有实现官方的理由解析、邮件聚合及生成约束。</p>
        <p>原作业还分别检查输出合同和模型判断。让本地模拟器按规则运行，无法证明真实模型准确。完成这里后，回到原仓库实现并检验自己的 P1 → P2。</p></details>
      <details class="agent-transfer" data-agent-detail="transferOpen" ${state.transferOpen?'open':''}><summary>换个场景，检验自己的解释</summary><p>工单分流器收到一条无法解析的回复。程序甲保存“未判定”并送入人工队列；程序乙保存“已批准”也送入人工队列。当前两边队列完全相同。这两个程序是否等价？构造一个后续操作，让你的判断可以被检查。</p><p class="tiny subtle">公开练习，无自动评分。可暂时离开本页再作答；若参考了解释或借助 AI，请在笔记中说明。</p></details></article>
      <article class="card"><label class="field-label" for="agent-notes">我的解释、反例或下一步</label><textarea id="agent-notes" data-note="agent" placeholder="可选：写下自己注意到的关系或尚未解决的问题。">${escapeHtml(progress.notes.agent)}</textarea><p class="tiny subtle">整个 Agent 单元共用这份笔记；切换条件不会清空。</p><div id="save-status" class="status-line" role="status">修改后自动保存到本地浏览器</div><a class="source-link" href="#/learn/agent">回到导学与原作业 →</a></article>
    </div></section>`;
}
const klAnswerNames = {down:'下降', up:'上升', same:'保持不变'};
function bars(q, showGradient) {
  const student = studentDistribution(q);
  const names = ['Cat · 猫','Dog · 狗','Bird · 鸟'];
  const series=(data,kind)=>data.map((prob,i)=>`<div class="dist-row"><b>${names[i]}</b><div class="bar-track"><div class="bar ${kind}" style="width:${(prob*100).toFixed(4)}%"></div></div><span>${(prob*100).toFixed(1)}%</span></div>`).join('');
  const kl = klDivergence(TEACHER_DIST, student);
  const gradient = klLogitGradient(TEACHER_DIST, student)[0];
  const gradientMetric = showGradient ? `<div class="metric"><div class="big">${gradient>0?'+':''}${fmt(gradient)}</div><div class="metric-label">此处猫 logit 的梯度 · 学生猫概率 ${Math.round(q*100)}%<br>${gradient>0?'梯度下降会降低猫 logit':gradient<0?'梯度下降会提高猫 logit':'这一点的梯度为零'}</div></div>` : '';
  return `<div class="grid2"><div><div class="legend"><span>教师 P</span></div>${series(TEACHER_DIST,'teacher')}</div><div><div class="legend"><span class="student">学生 Q</span></div>${series(student,'student')}</div></div><div class="metric-row"><div class="metric"><div class="big">${fmt(kl)}</div><div class="metric-label">KL(P || Q) · nats<br>测量当前学生分布与教师分布的差异</div></div>${gradientMetric}</div>`;
}

function klExplanation(answer) {
  const comparison = answer === 'down' ? '你的判断与这个起点的更新一致。'
    : Object.hasOwn(klAnswerNames,answer) ? '可以把滑块从 95% 向两侧各移一步，比较哪一侧的损失更低。' : '';
  return `<div class="result"><h3>95% 起点的更新</h3><p>对于 softmax，∂KL / ∂z_cat = Q_cat − P_cat。起点的值是 0.95 − 0.80 = +0.15。只调整猫 logit 时，沿负梯度走一小步，猫 logit 降低，猫的概率也随之下降。</p><p>在下面移动滑块，可以对照不同位置的损失和该位置的 logit 梯度。${comparison}</p></div>`;
}

function labKL() {
  const savedAnswer = progress.decisions.klPrediction;
  const answer = Object.hasOwn(klAnswerNames,savedAnswer) ? savedAnswer : '';
  return `<p class="eyebrow">KNOWLEDGE DISTILLATION</p><h1 class="page-title">让学生的分布靠近教师</h1>
  <p class="lead">教师给猫 80%，学生给猫 95%。如果只用教师分布做蒸馏，一次很小的梯度更新会把学生带向哪里？</p>
  <div class="two-columns"><section class="stack">
    <div class="card"><h2>在 95% 的起点作判断</h2><p>只调整学生的猫 logit，狗和鸟的 logits 保持固定。你可以先写下判断，也可以直接看解释。</p>
      <div class="field"><label for="kl-prediction">这一步之后，学生的猫概率会怎样变化？</label><select id="kl-prediction"><option value="">选择方向</option>${Object.entries(klAnswerNames).map(([key,name])=>`<option value="${key}" ${answer===key?'selected':''}>${name}</option>`).join('')}</select></div>
      <div class="actions"><button type="button" id="kl-save" class="btn btn-outline">${answer?'更新判断':'记录判断'}</button><button type="button" id="kl-reveal" class="btn btn-primary" aria-controls="kl-explanation" aria-expanded="${session.klRevealed}">${session.klRevealed?'收起解释':'查看机制解释'}</button></div>
      <p class="status-line" id="kl-saved" role="status">${answer?`上次记录的 95% 起点判断 · ${klAnswerNames[answer]}`:''}</p>
      <div id="kl-explanation">${session.klRevealed?klExplanation(answer):''}</div>
    </div>
    <div class="card"><h2>移动学生分布，比较损失</h2><p>教师分布固定为猫 80%、狗 15%、鸟 5%。滑块只改变学生分布，余下的概率按狗与鸟 3 比 1 分配。</p>
      <div class="field"><label for="student-cat">当前学生猫概率 · <strong id="cat-percent">${session.studentCat}%</strong></label><input type="range" id="student-cat" min="51" max="99" value="${session.studentCat}" step="1" aria-valuetext="${session.studentCat}%" aria-describedby="dist-method"/><span id="dist-method" class="tiny subtle">可用方向键微调。上方的问题始终指 95% 的起点。</span></div>
      <div id="distribution" class="dist-wrap">${bars(session.studentCat/100,session.klRevealed)}</div><button type="button" id="kl-reset" class="btn btn-outline btn-small">滑块回到 95%</button>
    </div></section><aside class="stack lesson-side"><div class="card"><h3>这个滑块怎样对应模型？</h3><p>猫 logit 改变，softmax 会重新分配三个类别的概率。其他两个 logits 固定时，狗和鸟的概率之比保持不变。滑块让你直接选取这条曲线上的一个分布。</p><p>想核对自己的判断，可以在起点附近选两个位置，比较各自的损失。</p></div></aside></div>`;
}
function atlasIndex() {
  if (!atlas) return `<h1 class="page-title">知识航图</h1><p class="lead">Atlas 数据尚未载入。请在本地 HTTP 服务器打开，而非直接双击 HTML 文件。</p>`;
  const id = getPath().match(/^atlas\/node\/([A-Z0-9]+)$/)?.[1];
  if (id && atlas.nodes.some(n=>n.id===id)) session.atlasNode=id;
  const courses = new Map(atlas.courses.map(course=>[course.id, course]));
  return `<p class="eyebrow">OPTIONAL KNOWLEDGE MAP / LEGACY ATLAS</p><h1 class="page-title">知识航图</h1><p class="lead">保留原来的 20 个概念及能力节点、6 组课程规格和 4 条示范路线。它们是导航和待办线索，<strong>不是已经完成的 20 节互动课程</strong>。可以跨过前置关系直接探索。</p>
  <div class="search-row"><label class="tiny" for="atlas-route">路线</label><select id="atlas-route" class="search-input" style="max-width:230px"><option value="all">全部节点</option>${atlas.routes.map(route=>`<option value="${escapeHtml(route.id)}" ${session.atlasRoute===route.id?'selected':''}>${escapeHtml(route.title)}</option>`).join('')}</select><input type="search" class="search-input" id="atlas-search" placeholder="搜索概念、节点编号或关键词" aria-label="搜索知识节点" value="${escapeHtml(session.atlasQuery)}"/></div>
  <div class="atlas-layout"><div class="node-list" id="atlas-nodes">${renderNodeList()}</div><div class="node-detail card" id="atlas-detail">${renderNodeDetail(courses)}</div></div>
  <div class="light-panel" style="margin-top:22px"><h3>学习证据不等于导航关系</h3><p>概念前置、课程作业准备、建议背景和实际掌握必须分开。这个航图不会根据一次答对自动点亮所有上游节点。</p></div>`;
}
function renderNodeList() {
  if (!atlas) return '';
  const route=atlas.routes.find(r=>r.id===session.atlasRoute);
  const list=atlas.nodes.filter(n=> (!route||route.nodes.includes(n.id)) && `${n.id} ${n.title} ${n.summary} ${n.role}`.toLowerCase().includes(session.atlasQuery.toLowerCase()));
  return list.length?list.map(n=>`<a href="#/atlas/node/${n.id}" class="node-row ${n.id===session.atlasNode?'selected':''}" aria-label="查看 ${escapeHtml(n.id)} ${escapeHtml(n.title)}"><b>${escapeHtml(n.id)} · ${escapeHtml(n.title)}</b><small>${escapeHtml(n.course)} · ${escapeHtml(n.kind)} · ${escapeHtml(n.summary.slice(0,42))}</small></a>`).join(''):'<div class="empty">没有找到匹配的知识节点。可以清空关键词。</div>';
}
function renderNodeDetail(courses = new Map(atlas?.courses?.map(c=>[c.id,c]) || [])) {
  if (!atlas) return '';
  const node=atlas.nodes.find(n=>n.id===session.atlasNode)||atlas.nodes[0];
  const relations=(ids)=>(ids||[]).map(id=>`<a href="#/atlas/node/${id}">${id}</a>`).join('');
  const sourceList=(node.resource||[]).map(id=>atlas.sources.find(s=>s.id===id)).filter(Boolean);
  return `<div class="step-tag">${escapeHtml(node.id)} / ${escapeHtml(courses.get(node.course)?.title||node.course)}</div><h3 style="margin-top:12px">${escapeHtml(node.title)}</h3><p>${escapeHtml(node.summary)}</p>
  <div class="steps-bar"><div class="done"></div><div></div><div></div></div><div class="step-tag">知识要点</div><p>${escapeHtml(node.lesson||node.role)}</p>
  <div class="step-tag" style="margin-top:15px">原作业提示</div><p>${escapeHtml(node.exercise)}</p>
  ${node.required?.length?`<div class="step-tag">直接需要</div><div class="pill-list">${relations(node.required)}</div>`:''}
  ${node.related?.length?`<div class="step-tag" style="margin-top:15px">相关概念</div><div class="pill-list">${relations(node.related)}</div>`:''}
  ${sourceList.length?`<div class="step-tag" style="margin-top:16px">原始来源</div><p>${sourceList.map(s=>external(s.url,s.title)).join('<br>')}</p>`:''}
  <p class="tiny subtle" style="border-top:1px solid #e2e8e5;padding-top:14px;margin-top:18px">当前为旧 Atlas 迁移数据；尚未经过本站课程级复核。</p>`;
}
const CHAT_SYNC_PROMPT = [
  '请把本次学习对话中已经确认、适合共享的教学成果集成到 GitHub 仓库 merlxn-ambrosius/learning-workbench，而不是给我一个 ZIP 或单独的 Markdown 文件。',
  '先通过 GitHub 连接器实际读取该仓库的 README.md、AGENTS.md、PROJECT_STATE.md、DECISIONS.md、SYNC.md 和相关源码；不能只凭记忆推断当前版本。',
  '保持成熟课程主干，不为了增加节点或界面而造课。从本次真实学习困难出发，优先复用现有解释、练习和交互组件。保留原始课程出处及版本，遵守版权。',
  '只同步适合公开的课程、代码和教学实验；不要把我的个人笔记、私人对话、学习进度、未公开评价题、凭据或敏感内容放进公开仓库或公开 Issue。私有备份应进入单独的 private 仓库，且只在我明确提供数据并授权时操作。',
  '把用户已确认的判断、AI 建议和未验证假设区分开。先检查现有实现，创建独立分支，完成最小有用变更，运行可执行测试并实测能测的交互，然后创建 PR；不要直接覆盖 main。',
  '最后给我 PR 链接、改动内容、实测证据与未验证项。只有合并后，GitHub Pages 才会自动更新。若当前对话没有足够可公开的成果或 GitHub 不可用，请如实说明，不要假装已同步。',
].join('\n\n');

function syncPage() {
  return `<p class="eyebrow">SHARED BUILD · PRIVATE PROGRESS</p><h1 class="page-title">协作与备份</h1>
  <p class="lead">课程更新走公开 GitHub Pull Request，个人学习记录走私有仓库。两条通道刻意分开；一个对话不会自动读取另一个对话的历史。</p>
  <div class="grid2">
    <article class="card"><div class="step-tag">PUBLIC · 教学与代码</div><h3>让另一个学习 Chat 更新平台</h3>
      <p>在那个对话中打开 GitHub 连接，给出下面的协作指令。它会先检查仓库现状，然后以分支和 PR 方式提交实际成果。审核并合并 PR 后，网站才会部署新内容。</p>
      <p><a class="source-link" target="_blank" rel="noopener noreferrer" href="https://github.com/merlxn-ambrosius/learning-workbench">公开课程仓库 ↗</a></p>
      <label class="field-label" for="chat-sync-instructions">复制到其他学习对话（可按任务调整）</label>
      <textarea class="sync-instructions" id="chat-sync-instructions" readonly aria-label="跨对话 GitHub 协作指令">${escapeHtml(CHAT_SYNC_PROMPT)}</textarea>
      <div class="actions" style="margin-top:13px"><button id="copy-sync-prompt" class="btn btn-primary btn-small" type="button">复制协作指令</button>
      <a class="btn btn-outline btn-small" target="_blank" rel="noopener noreferrer" href="https://github.com/merlxn-ambrosius/learning-workbench/blob/main/SYNC.md">查看完整流程 ↗</a></div></article>
    <article class="card"><div class="step-tag">PRIVATE · 个人记录</div><h3>备份到私人 GitHub 仓库</h3>
      <p>当前网站不会上传浏览器记录。先到 Journal 导出 JSON，然后把文件上传到你自己的 <strong>private</strong> 仓库；需要恢复时，下载该文件并从 Journal 导入。</p>
      <div class="sync-steps"><p><b>1.</b> <a class="source-link" href="#/journal">Journal → 导出我的记录</a></p>
      <p><b>2.</b> 在 GitHub 新建 private 仓库 <code>learning-workbench-private</code>，不要启用 Pages</p>
      <p><b>3.</b> 仓库中的 <b>Add file → Upload files</b> 上传 JSON；不同日期的备份分别保留</p>
      <p><b>4.</b> 授权连接的 GitHub App 访问该仓库后，其他对话也可在你明确提供备份文件时协助整理</p></div>
      <div class="actions"><a class="btn btn-outline btn-small" target="_blank" rel="noopener noreferrer" href="https://github.com/new">创建私人仓库 ↗</a><a class="btn btn-outline btn-small" href="#/journal">打开 Journal ↗</a></div>
      <p class="tiny subtle" style="margin-top:19px">Private 表示限制访问，不等于端到端加密。不要提交 API Key、密码或其他秘密；不要把 private 备份复制进公开仓库。未来如需真正一键同步，应另外设计安全授权和冲突处理，不能把 Token 写进公开前端。</p>
    </article>
  </div>`;
}

function journal() {
  const evidence = [...progress.evidence].reverse();
  const firstDate = date=>{try{return new Date(date).toLocaleString('zh-CN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return date;}};
  return `<p class="eyebrow">PRIVATE WORK & EVIDENCE</p><h1 class="page-title">学习记录</h1><p class="lead">保存自己的推导和实验痕迹，而不是伪精确的掌握分数。信息仅存于当前浏览器；换设备或清除数据前请导出备份。</p>
  <div class="two-columns"><section class="stack"><div class="card"><div class="step-tag">NOTEBOOK / AUTOSAVE</div><h3>我的思考</h3>
    <div class="field"><label for="note-agent">Agent 工程</label><textarea data-note="agent" id="note-agent" placeholder="写下你独立发现的机制、没解决的问题…">${escapeHtml(progress.notes.agent)}</textarea></div>
    <div class="field"><label for="note-kl">模型与梯度</label><textarea data-note="kl" id="note-kl" placeholder="今天最关键的推导或反例…">${escapeHtml(progress.notes.kl)}</textarea></div>
    <div class="field"><label for="note-general">其他想法</label><textarea data-note="general" id="note-general" placeholder="下一次学习要从哪里继续？">${escapeHtml(progress.notes.general)}</textarea></div><div id="save-status" class="status-line" role="status">修改后自动保存到本地浏览器</div></div>
    ${Object.values(progress.micrograd.trials).some(trial => trial.ran || trial.prediction || trial.explanation)
      ? '<div class="card"><h3>自动微分实验草稿</h3><p>测量前的判断和观察后的解释随各组条件保存在本机，也会进入 JSON 备份。</p><a class="source-link" href="#/learn/micrograd">回到上次的实验条件 →</a></div>' : ''}
    <div class="card"><div class="step-tag">LEARNING EVIDENCE</div><h3>最近的预测与实验</h3>${evidence.length?`<ul class="timeline">${evidence.map(item=>`<li><span class="timeline-dot"></span><div class="detail"><b>${escapeHtml(item.kind)}</b> · <small>${escapeHtml(firstDate(item.date))}</small><p>${escapeHtml(item.summary)}</p><small>帮助条件：${escapeHtml(item.help)}</small></div></li>`).join('')}</ul>`:'<div class="empty">还没有实验记录。打开 Lab，做一次预测或观察，学习事件就会出现在这里。</div>'}</div>
    </section><aside class="stack lesson-side"><div class="card"><h3>数据备份</h3><p>导出 JSON 可备份和迁移。导入之前会提示确认，以免覆盖现有记录。若要保存到 GitHub，请使用额外的 private 仓库。</p><div class="actions"><button id="export-progress" class="btn btn-primary btn-small">${svg('download')} 导出我的记录</button><button id="import-progress" class="btn btn-outline btn-small">导入备份</button><input id="import-file" type="file" accept=".json,application/json" hidden /></div><p style="margin-top:12px"><a class="source-link" href="#/sync">怎样备份到 private 仓库，以及让其他 Chat 同步课程 →</a></p></div>
      <div class="warning-panel"><strong>隐私说明</strong><p>本网站没有注册、数据库、分析脚本和第三方 AI 调用。浏览器数据并不自动同步到 GitHub。公开网站意味着课程页面可以被其他人访问，但个人笔记不会因此被上传。</p></div>
      <div class="card"><h3>三种不同证据</h3><p><strong>AI 协作：</strong>借助工具完成的作品。</p><p><strong>独立解释：</strong>本人能预测、推导和修改。</p><p><strong>陌生变化：</strong>面对新题仍能迁移。</p><p>本站目前只记录形成性事件，不自动认证任何一种能力。</p></div></aside></div>`;
}
function render() {
  const route = getPath();
  const body = route==='home'?home():
    route==='learn/micrograd'?microgradPage():route==='learn'?learnIndex():route==='learn/agent'?learnAgent():route==='learn/kl'?learnKL():
    route==='lab'?labIndex():route==='lab/agent'?labAgent():route==='lab/kl'?labKL():
    route==='atlas'||route.startsWith('atlas/node/')?atlasIndex():route==='journal'?journal():route==='sync'?syncPage():home();
  $('#app').innerHTML = shell(route,body);
  if (route === 'learn/micrograd') {
    mountMicrograd($('.mg-unit'), progress.micrograd, next => {
      progress.micrograd = next;
      return persist();
    });
  }
  if (/^(learn\/(agent|kl|micrograd)|lab\/(agent|kl)|atlas\/node\/)/.test(route)) {
    progress.lastRoute=`#/${route}`;persist();
  }
  document.title = `${nav.find(n=>n[0]===navRoute(route))?.[1]||'LEARN'} · LEARN Workbench`;
}

document.addEventListener('input', event=>{
  const el=event.target;
  if (el.matches('[data-note]')) {
    progress.notes[el.dataset.note]=el.value.slice(0,12000);
    const ok = persist();
    const status=$('#save-status');
    if(status)status.textContent=ok?'已保存于本地浏览器':'本地保存失败，请先导出备份';
  }
  if (el.id==='student-cat') {
    session.studentCat=Number(el.value);
    const amount=$('#cat-percent');if(amount)amount.textContent=`${session.studentCat}%`;
    el.setAttribute('aria-valuetext', `${session.studentCat}%`);
    const graph=$('#distribution');if(graph)graph.innerHTML=bars(session.studentCat/100,session.klRevealed);
  }
  if (el.id==='atlas-search') {
    session.atlasQuery=el.value;
    const list=$('#atlas-nodes');if(list)list.innerHTML=renderNodeList();
  }
});
document.addEventListener('change', event=>{
  const el=event.target;
  if(el.id==='agent-scenario' || el.id==='agent-policy') {
    const key = el.id === 'agent-scenario' ? 'scenario' : 'policy';
    progress.agent = normalizeAgent({...progress.agent, [key]:el.value, shown:false});
    persist();render();$(`#${el.id}`)?.focus({preventScroll:true});
  }
  if(el.id==='atlas-route') {session.atlasRoute=el.value;const list=$('#atlas-nodes');if(list)list.innerHTML=renderNodeList();}
  if(el.id==='import-file' && el.files?.length) importBackup(el.files[0]);
});
document.addEventListener('click', async event=>{
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    $('#page-content')?.focus();
    return;
  }
  const button=event.target.closest('button');if(!button)return;
  if(button.id==='agent-run') {
    progress.agent.shown=true;persist();render();
    $('#agent-result')?.focus();
  }
  if(button.id==='agent-reset') {
    progress.agent=normalizeAgent(null);
    const saved=persist();render();
    $('#agent-reset')?.focus({preventScroll:true});
    if(saved)showToast('已恢复起始条件；笔记和历史记录保留。');
  }
  if(button.id==='agent-record' && progress.agent.shown) {
    const state=progress.agent;
    const saved=record('Agent 规则对比', `${agentScenarioNames[state.scenario]}；A 保留未分类，B ${agentPolicyNames[state.policy]}。`,
      state.explanationOpen ? '观察结果；当前展开完整解释' : state.hintOpen ? '观察结果；当前展开提示' : '观察结果；其他帮助未确认');
    if(saved)showToast('已记录比较条件。笔记继续自动保存。');
  }
  if(button.id==='kl-save') {
    const prediction=$('#kl-prediction');
    const answer=prediction.value;
    if(!answer) {
      $('#kl-saved').textContent='请先选择方向，或直接查看机制解释。';
      prediction.focus();
      return;
    }
    const previous=progress.decisions.klPrediction;
    progress.decisions.klPrediction=answer;
    record('KL 判断', `教师猫 80%、学生猫 95%，判断猫概率${klAnswerNames[answer]}${previous?'（修订）':''}。`,
      session.klRevealed ? '记录时已展开解释'
        : progress.decisions.klSawExplanation === 'yes' ? '此浏览器记录显示曾查看解释' : '帮助情况未确认');
    button.textContent='更新判断';
    $('#kl-saved').textContent=`已记录 95% 起点的判断 · ${klAnswerNames[answer]}`;
    if(session.klRevealed) $('#kl-explanation').innerHTML=klExplanation(answer);
  }
  if(button.id==='kl-reveal') {
    session.klRevealed=!session.klRevealed;
    button.setAttribute('aria-expanded', String(session.klRevealed));
    button.textContent=session.klRevealed?'收起解释':'查看机制解释';
    $('#kl-explanation').innerHTML=session.klRevealed?klExplanation(progress.decisions.klPrediction):'';
    $('#distribution').innerHTML=bars(session.studentCat/100,session.klRevealed);
    if (session.klRevealed) {
      progress.decisions.klSawExplanation = 'yes';
      record('KL 推导','查看 95% 起点的机制解释与当前分布的猫 logit 梯度。','查看解释');
    }
  }
  if(button.id==='kl-reset') {
    const slider=$('#student-cat');
    slider.value='95';
    slider.dispatchEvent(new Event('input',{bubbles:true}));
    showToast('滑块已回到 95%。');
  }
  if(button.id==='copy-sync-prompt') {
    try {
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(CHAT_SYNC_PROMPT);
      showToast('协作指令已复制。到其他学习对话中粘贴即可。');
    } catch {
      const field=$('#chat-sync-instructions');
      if(field){field.focus();field.select();}
      showToast('未能自动复制，请手动复制已选中的文字。');
    }
  }
  if(button.id==='export-progress')exportBackup();
  if(button.id==='import-progress')$('#import-file')?.click();
});
function exportBackup(){
  const blob=new Blob([JSON.stringify(progress,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const link=document.createElement('a');
  link.href=url;link.download=backupFileName();
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  showToast('学习记录备份已生成。请保存在可信的位置。');
}
async function importBackup(file) {
  try {
    if(file.size>2_000_000)throw new Error('文件超过 2 MB 限制。');
    const text=await file.text();const parsed=normalizeProgress(JSON.parse(text));
    if(!confirm('导入将替换本浏览器现有的笔记与实验记录。请确认已备份原数据。确定继续吗？'))return;
    progress=parsed;persist();render();showToast('备份已导入。');
  }catch(error){showToast(`无法导入：${error.message}`);}
  finally {const input=$('#import-file');if(input)input.value='';}
}
// Native details stay keyboard-operable without replacing the focused element.
document.addEventListener('toggle', event=>{
  const key=event.target.dataset?.agentDetail;
  if (!['hintOpen','explanationOpen','transferOpen'].includes(key) || !event.target.isConnected) return;
  progress.agent[key]=event.target.open;
  persist();
}, true);
window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0,behavior:'instant'});});
async function start() {
  try {
    const response=await fetch('./data/atlas.json');
    if(!response.ok)throw new Error(`${response.status}`);
    atlas=await response.json();
  } catch(error) {console.warn('Atlas unavailable:',error);}
  if(!location.hash)location.hash='#/home';
  render();
}
start();
