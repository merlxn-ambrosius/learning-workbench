import { COURSE_LINKS, SCENARIOS, NOTE_LIMIT, runHarness } from './logic.mjs';
import { escapeHtml, external, svg } from './html.mjs';

export function renderAgentGuide() {
  return `<p class="eyebrow">STANFORD CS329Z / INTRODUCTORY BRIDGE</p><h1 class="page-title">从模型回复到可控程序</h1><p class="lead">模型返回了一个字符串。怎样让程序处理它，又能在出错时追到判断的来源？</p>
    <div class="actions guide-entry"><a class="btn btn-primary" href="#/lab/agent">直接比较两份规则 →</a>${external(COURSE_LINKS.cs329zAssignment,'打开原作业 §4.1–4.2')}</div>
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
export const agentPolicyNames = {low:'按 low 送入摘要', drop:'不送入摘要'};
export const agentScenarioNames = {changed:'含未分类回复', baseline:'全部可分类'};
export function renderAgentLab(state, note, storageWarning) {
  const selected = SCENARIOS[state.scenario];
  const a = state.shown ? runHarness(state.scenario, 'keep') : null;
  const b = state.shown ? runHarness(state.scenario, state.policy) : null;
  const route = row => !row.included ? '不进入摘要输入' : `进入 · ${row.routedCategory === 'unclassified' ? '未分类' : row.routedCategory}`;
  return `<section class="agent-unit" aria-labelledby="agent-title">
    <p class="eyebrow">Agent 工程 · 同一输入，两份规则</p><h1 class="page-title" id="agent-title">一条无法分类的回复，后来去了哪里？</h1>
    <p class="lead">固定模型回复和解析器，只改变未分类记录的下游处理。观察去向，再判断这次改变提供了什么信息。</p>
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
      <p>只看 B 的摘要输入，哪些解析信息还能恢复？切换输入情境，再检查你的判断。</p><button class="btn btn-outline" id="agent-record" type="button">把本次对比记入学习记录</button><p class="tiny subtle">只记录观察条件，不判分，也不标记独立掌握。</p></article>`:''}
      <article class="card"><details data-agent-detail="explanationOpen" ${state.explanationOpen?'open':''}><summary>完整解释与课程合同</summary>
        <p>在“含未分类回复”中，<code>" HIGH "</code> 被归一化为 <code>high</code>；<code>"maybe"</code> 仍是 <code>unclassified</code>。A 保留该标记。B 选择 low 时，这条记录按 LOW 进入摘要输入；选择不送入时，摘要输入少一条，但轨迹仍保留原回复及解析状态。</p>
        <p>因此三种处理可以改变下游看到的内容，却没有增加上游分类证据。全部可分类时，这三种规则的摘要输入相同：不存在触发不同处理的记录。相同结果不证明规则相同，需找能区分它们的输入。</p>
        <p>回退策略本身并非错误。${external(COURSE_LINKS.cs329zAssignment,'CS329Z HW1 v26.1.0 §4.1–4.2')} 要求 P1 在回复没有标签时返回 unknown，P2 将 unknown 按 normal 处理。那是下游合同，不是新获得的分类证据。本例的 high / low 不与官方 urgent / normal / ignore 一一对应，也没有实现官方的理由解析、邮件聚合及生成约束。</p>
        <p>原作业还分别检查输出合同和模型判断。让本地模拟器按规则运行，无法证明真实模型准确。完成这里后，回到原仓库实现并检验自己的 P1 → P2。</p></details>
      <details class="agent-transfer" data-agent-detail="transferOpen" ${state.transferOpen?'open':''}><summary>换个场景，检验自己的解释</summary><p>工单分流器收到一条无法解析的回复。程序甲保存“未判定”并送入人工队列；程序乙保存“已批准”也送入人工队列。当前两边队列完全相同。这两个程序是否等价？构造一个后续操作，让你的判断可以被检查。</p><p class="tiny subtle">公开练习，无自动评分。可暂时离开本页再作答；若参考了解释或借助 AI，请在笔记中说明。</p></details></article>
      <article class="card"><label class="field-label" for="agent-notes">我的解释、反例或下一步</label><textarea maxlength="${NOTE_LIMIT}" id="agent-notes" data-note="agent" placeholder="可选：写下自己注意到的关系或尚未解决的问题。">${escapeHtml(note)}</textarea><p class="tiny subtle">整个 Agent 单元共用这份笔记；切换条件不会清空。</p><div id="save-status" class="status-line" role="status">${storageWarning ? '此页暂时无法保存到浏览器，请导出草稿。' : '修改后自动保存到本地浏览器（每栏最多 12000 字符）'}</div><a class="source-link" href="#/learn/agent">回到导学与原作业 →</a></article>
    </div></section>`;
}
