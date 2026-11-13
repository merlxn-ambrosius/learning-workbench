import {renderKnowledgeMap,bindKnowledgeMap} from './knowledge-map.mjs';
import {experiencePage,experienceResults,experienceContext,experienceRibbon,bindExperience} from './experience-view.mjs';
import {openLearningLedger} from './learning-ledger.mjs';
import {renderLearningProgress,renderLearningSummary,bindLearningProgress} from './progress-view.mjs';
import {getCourse,getKnowledge,listCourseActivities} from './content-model.mjs';
import {studyPage,bindStudy} from './study-reader.mjs';
import {discoveryPage,bindDiscovery} from './discovery-view.mjs';
import {openFieldbook} from './fieldbook.mjs';
import {worldPage,worldJournal,learningContext,learningRibbon,noteComposer,bindWorld} from './world-view.mjs';
import {studyRoute} from './study-index.mjs';
import { renderWorkspaceShell, platformPage, resultList, bindPlatform, routeTitle, isLearningUnit, missingPage } from './workbench.mjs';
import { renderAgentGuide, renderAgentLab, agentPolicyNames, agentScenarioNames } from './agent-view.mjs';
import { renderKLGuide, renderKLLab, renderKLExplanation, renderKLMetrics, klAnswerNames } from './kl-view.mjs';
import { escapeHtml, external, svg } from './html.mjs';
import { openProgressStore } from './progress-store.mjs';
import { atlasListing } from './atlas.mjs';
import { microgradPage, mountMicrograd } from './micrograd-view.mjs';
import {
  NOTE_LIMIT, normalizeAgent, normalizeProgress, backupFileName,
} from './logic.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const progressStore = openProgressStore(() => localStorage);
let progress = progressStore.initial;
const fieldbook = openFieldbook(() => localStorage);
const learningLedger = openLearningLedger(() => localStorage);
let atlas = null;
let atlasStatus = 'idle';
const session = {studentCat:95, klRevealed:false, atlasQuery:'', atlasRoute:'all'};

function persist(next = progress, options) {
  const saved = progressStore.save(next, options);
  const notice = $('#storage-notice');
  if (notice) {
    notice.hidden = !progressStore.warning;
    notice.textContent = progressStore.warning;
  }
  if (!saved) showToast(progressStore.warning);
  return saved;
}
function record(kind, summary, help = '未记录') {
  const date=new Date().toISOString();
  progress.evidence.push({kind, summary, help, date});
  const saved=persist();
  const context=experienceContext(getPath(),routeOptions());
  if(saved&&context?.activityId){
    const helpKind=/解释|推导/.test(help)?'solution':/提示/.test(help)?'hint':'unknown';
    if(!learningLedger.record({...context,kind:kind==='KL 推导'?'help':'practice',attemptId:'legacy:'+date,help:helpKind,outcome:'submitted',verification:'self-report',evidence:summary}))showToast(learningLedger.warning);
  }
  return saved;
}
function saveChapterAttempt(attempt) {
  if (!progress.evidence.includes(attempt)) progress.evidence.push(attempt);
  const saved=persist(),context=experienceContext(getPath(),routeOptions());
  if(saved&&context?.activityId){
    if(!learningLedger.record({...context,kind:'practice',attemptId:'chapter:'+attempt.date,help:/已看推导/.test(attempt.help)?'solution':/已看提示/.test(attempt.help)?'hint':'unknown',outcome:/与参考值一致/.test(attempt.summary)?'passed':'failed',verification:'local-check',evidence:attempt.summary}))showToast(learningLedger.warning);
  }
  return saved;
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
function routeOptions() {
  return new URLSearchParams(location.hash.split('?')[1] || '');
}
function atlasIndex() {
  if (!atlas) {
    return atlasStatus === 'failed'
      ? '<h1 class="page-title">知识航图</h1><p role="status">航图数据暂时无法读取。</p><button class="btn btn-outline" id="atlas-retry">重新载入航图</button>'
      : '<h1 class="page-title">知识航图</h1><p role="status">正在载入节点与路线…</p>';
  }
  const path = getPath();
  if (path.startsWith('atlas/node/')) {
    const id = path.slice('atlas/node/'.length);
    const node = atlas.nodes.find(item => item.id === id);
    return node ? atlasNodePage(node)
      : '<h1 class="page-title">未找到这个节点</h1><a class="source-link" href="#/atlas">返回知识航图</a>';
  }
  const listing = atlasListing(atlas, session.atlasRoute, session.atlasQuery);
  return `<article class="atlas-page"><h1 class="page-title">知识航图</h1>
    <p class="lead">按你想解决的问题选择路线，或直接查找概念。每个节点附有练习与参考材料，可以从任意一站开始。</p>
    <div class="atlas-filters">
      <div class="field"><label for="atlas-route">浏览路线</label><select id="atlas-route">
        <option value="all">全部节点</option>${atlas.routes.map(route =>
          `<option value="${escapeHtml(route.id)}" ${session.atlasRoute === route.id ? 'selected' : ''}>${escapeHtml(route.title)}</option>`).join('')}
      </select></div>
      <div class="field"><label for="atlas-search">搜索本路线</label><input type="search" id="atlas-search" placeholder="输入概念或节点编号" value="${escapeHtml(session.atlasQuery)}"></div>
    </div>
    <p id="atlas-count" class="tiny" role="status">${atlasResultCount(listing.nodes.length)}</p>
    <div id="atlas-nodes">${renderNodeList(listing)}</div></article>`;
}

function atlasResultCount(count) {
  return `找到 ${count} 个节点`;
}

function renderNodeList({ route, nodes }) {
  if (!nodes.length) return '<p class="empty">当前范围内没有匹配的节点。可以更换路线或清空搜索。</p>';
  const description = route ? `<p class="atlas-route-intro">${escapeHtml(route.who)} ${escapeHtml(route.why)}</p>` : '';
  const listTag = route ? 'ol' : 'ul';
  const rows = nodes.map(node => {
    const position = route ? ` value="${route.nodes.indexOf(node.id) + 1}"` : '';
    return `<li${position}><a class="node-row" href="#/atlas/node/${escapeHtml(node.id)}"><b>${escapeHtml(node.title)}</b>
      <small>${escapeHtml(node.id)} · ${escapeHtml(node.summary)}</small></a></li>`;
  }).join('');
  return `${description}<${listTag} class="atlas-results">${rows}</${listTag}>`;
}

function refreshAtlasList() {
  const listing = atlasListing(atlas, session.atlasRoute, session.atlasQuery);
  $('#atlas-nodes').innerHTML = renderNodeList(listing);
  $('#atlas-count').textContent = atlasResultCount(listing.nodes.length);
}

function atlasNodePage(node) {
  const course = atlas.courses.find(item => item.id === node.course);
  const nodeLink = id => {
    const target = atlas.nodes.find(item => item.id === id);
    return target ? `<a class="source-link" href="#/atlas/node/${escapeHtml(id)}">${escapeHtml(target.title)}（${escapeHtml(id)}）</a>` : '';
  };
  const links = ids => ids.map(nodeLink).join('、');
  const relation = (label, ids) => ids?.length ? `<p><strong>${label}</strong>　${links(ids)}</p>` : '';
  const alternatives = (node.alternatives || []).map(group => relation('任选一项作为准备', group)).join('');
  const sources = (node.resource || []).map(id => atlas.sources.find(item => item.id === id)).filter(Boolean);
  return `<article class="atlas-page atlas-reading">
    <a class="source-link" href="#/atlas">← 返回节点列表</a>
    <p class="atlas-location">${escapeHtml(course?.title || node.course)} · ${escapeHtml(node.id)}</p>
    <h1 class="page-title">${escapeHtml(node.title)}</h1><p class="lead">${escapeHtml(node.summary)}</p>
    <section class="lesson-block"><h2>知识要点</h2><p>${escapeHtml(node.lesson || node.role)}</p></section>
    <section class="lesson-block"><h2>航图练习</h2><p>${escapeHtml(node.exercise)}</p>
      ${node.evidence ? `<details><summary>怎样检查我的尝试？</summary><p>${escapeHtml(node.evidence)}</p></details>` : ''}
    </section>
    <section class="lesson-block"><h2>已有经验与相关节点</h2>
      ${relation('直接需要', node.required)}${alternatives}${relation('建议准备', node.recommended)}
      ${node.priorEvidence ? `<p>${escapeHtml(node.priorEvidence)}</p>` : ''}
      ${relation('相关概念', node.related)}</section>
    ${sources.length ? `<section class="lesson-block"><h2>参考材料</h2><ul>${sources.map(src =>
      `<li>${external(src.url, src.title)}</li>`).join('')}</ul><p class="tiny">练习来自项目早期的 Atlas。外部链接供查阅；原课程作业请以课程发布的版本为准。</p></section>` : ''}
  </article>`;
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
      <p><b>2.</b> 确认备份目标 <code>learning-workbench-private</code> 仍为 private，并核对当前访问权限</p>
      <p><b>3.</b> 仓库中的 <b>Add file → Upload files</b> 上传 JSON；不同日期的备份分别保留</p>
      <p><b>4.</b> 授权连接的 GitHub App 访问该仓库后，其他对话也可在你明确提供备份文件时协助整理</p></div>
      <div class="actions"><a class="btn btn-outline btn-small" target="_blank" rel="noopener noreferrer" href="https://github.com/merlxn-ambrosius/learning-workbench-private">打开私人备份仓库 ↗</a><a class="btn btn-outline btn-small" href="#/journal">打开学习记录 →</a></div>
      <p class="tiny subtle" style="margin-top:19px">Private 表示限制访问，不等于端到端加密。不要提交 API Key、密码或其他秘密；不要把 private 备份复制进公开仓库。未来如需真正一键同步，应另外设计安全授权和冲突处理，不能把 Token 写进公开前端。</p>
    </article>
  </div>`;
}

function journal() {
  const evidence = progress.evidence.slice(-80).reverse();
  const firstDate = date=>{try{return new Date(date).toLocaleString('zh-CN',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return date;}};
  return `<p class="eyebrow">本地笔记与实验</p><h1 class="page-title">学习记录</h1><p class="lead">保存自己的推导和实验痕迹，而不是伪精确的掌握分数。信息仅存于当前浏览器；换设备或清除数据前请导出备份。</p>
  ${renderLearningSummary(learningLedger)}${worldJournal(fieldbook)}<h2 class="legacy-journal-title">课程笔记与原有学习记录</h2><div class="two-columns"><section class="stack"><div class="card"><div class="step-tag">NOTEBOOK / AUTOSAVE</div><h3>我的思考</h3>
    <div class="field"><label for="note-agent">Agent 工程</label><textarea maxlength="${NOTE_LIMIT}" data-note="agent" id="note-agent" placeholder="写下你独立发现的机制、没解决的问题…">${escapeHtml(progress.notes.agent)}</textarea></div>
    <div class="field"><label for="note-kl">模型与梯度</label><textarea maxlength="${NOTE_LIMIT}" data-note="kl" id="note-kl" placeholder="今天最关键的推导或反例…">${escapeHtml(progress.notes.kl)}</textarea></div>
    <div class="field"><label for="note-general">其他想法</label><textarea maxlength="${NOTE_LIMIT}" data-note="general" id="note-general" placeholder="下一次学习要从哪里继续？">${escapeHtml(progress.notes.general)}</textarea></div><div id="save-status" class="status-line" role="status">${progressStore.warning ? '此页暂时无法保存到浏览器，请导出草稿。' : '修改后自动保存到本地浏览器（每栏最多 12000 字符）'}</div></div>
    ${Object.values(progress.micrograd.trials).some(trial => trial.ran || trial.prediction || trial.explanation)
      ? '<div class="card"><h3>自动微分实验草稿</h3><p>测量前的判断和观察后的解释随各组条件保存在本机，也会进入 JSON 备份。</p><a class="source-link" href="#/learn/micrograd">回到上次的实验条件 →</a></div>' : ''}
    <div class="card"><div class="step-tag">本地事件</div><h3>最近的预测与实验</h3>${progress.evidence.length > evidence.length ? `<p>显示最近 ${evidence.length} 条。全部 ${progress.evidence.length} 条可随备份导出。</p>` : ''}${evidence.length?`<ul class="timeline">${evidence.map(item=>`<li><span class="timeline-dot"></span><div class="detail"><b>${escapeHtml(item.kind)}</b> · <small>${escapeHtml(firstDate(item.date))}</small><p>${escapeHtml(item.summary)}</p><small>帮助条件：${escapeHtml(item.help)}</small></div></li>`).join('')}</ul>`:'<div class="empty">还没有事件。你可以在 Agent 实验里记录一次规则对比，或在 KL 实验里保存对更新方向的判断。</div>'}</div>
    </section><aside class="stack lesson-side"><div class="card"><h3>数据备份</h3><p>导出 JSON 可备份和迁移。导入之前会提示确认，以免覆盖现有记录。若要保存到 GitHub，请使用额外的 private 仓库。</p><div class="actions"><button id="export-progress" class="btn btn-primary btn-small">${svg('download')} 导出我的记录</button><button id="import-progress" class="btn btn-outline btn-small">导入备份</button>${progressStore.unreadableRecord !== null ? '<button id="export-unreadable" class="btn btn-outline btn-small">下载无法读取的原始记录</button>' : ''}<input id="import-file" type="file" accept=".json,application/json" hidden /></div><p style="margin-top:12px"><a class="source-link" href="#/sync">怎样备份到 private 仓库，以及让其他 Chat 同步课程 →</a></p></div>
      <div class="warning-panel"><strong>隐私说明</strong><p>本网站没有注册、数据库、分析脚本和第三方 AI 调用。浏览器数据并不自动同步到 GitHub。公开网站意味着课程页面可以被其他人访问，但个人笔记不会因此被上传。</p></div>
      <div class="card"><h3>三种不同证据</h3><p><strong>AI 协作：</strong>借助工具完成的作品。</p><p><strong>独立解释：</strong>本人能预测、推导和修改。</p><p><strong>陌生变化：</strong>面对新题仍能迁移。</p><p>本站目前只记录形成性事件，不自动认证任何一种能力。</p></div></aside></div>`;
}
function render() {
  const route = getPath();
  if ((route === 'atlas' || route.startsWith('atlas/node/')) && atlasStatus === 'idle') loadAtlas();
  const options = routeOptions();
  const context = experienceContext(route,options) || learningContext(route,options);
  if (context) fieldbook.remember(context);
  if (context?.activityId) learningLedger.visit(context);
  const platform = (route==='maps' && options.get('legacy')!=='1' ? renderKnowledgeMap(options) : null) ?? experiencePage(route,options,fieldbook,learningLedger,progress.lastRoute) ?? worldPage(route,options,fieldbook,progress.lastRoute) ?? discoveryPage(route, options) ?? studyPage(route, options, id=>{
    if(studyRoute(getPath())?.track.id===id)render();
  }) ?? platformPage(route, progress.lastRoute, atlas, options);
  const body = platform ?? (
    route==='learn/micrograd'?microgradPage():route==='learn/agent'?renderAgentGuide():route==='learn/kl'?renderKLGuide():
    route==='lab/agent'?renderAgentLab(progress.agent, progress.notes.agent, progressStore.warning):route==='lab/kl'?renderKLLab({
      savedAnswer:progress.decisions.klPrediction, studentCat:session.studentCat,
      revealed:session.klRevealed, storageWarning:progressStore.warning,
    }):
    route==='atlas'||route.startsWith('atlas/node/')?atlasIndex():route==='journal'?journal():route==='sync'?syncPage():missingPage());
  const storageNotice = `<p class="warning-panel" id="storage-notice" role="status" ${progressStore.warning ? '' : 'hidden'}>${escapeHtml(progressStore.warning)}</p>`;
  $('#app').innerHTML = renderWorkspaceShell(route,storageNotice + experienceRibbon(context) + body + (context?.activityId ? renderLearningProgress(learningLedger,context,[context.activityId]) : '') + noteComposer(fieldbook,context), document.querySelector('meta[name="learn-revision"]')?.content);
  bindPlatform(route, $('#page-content'), saveChapterAttempt);
  bindDiscovery($('#page-content'),route,options);
  bindWorld($('#page-content'),fieldbook,context, note=>{
    if(context && !learningLedger.record({...context,activityId:context.activityId||'course-note:'+context.course,kind:'note',evidence:note.body,id:note.id}))showToast(learningLedger.warning);
  });
  bindExperience($('#page-content'),learningLedger,context,render);
  if(route==='maps' && options.get('legacy')!=='1')bindKnowledgeMap($('#page-content'));
  bindLearningProgress($('#page-content'),learningLedger,context,{onChange:render,onError:showToast});
  if (studyRoute(route)) bindStudy($('#page-content'),route,render);
  if (route === 'learn/micrograd') {
    mountMicrograd($('.mg-unit'), progress.micrograd, next => {
      progress.micrograd = next;
      return persist();
    });
  }
  if (isLearningUnit(route) || atlas?.nodes.some(node => route === 'atlas/node/' + node.id)) {
    if (progress.lastRoute !== `#/${route}`) {
      progress.lastRoute=`#/${route}`;
      persist();
    }
  }
  document.title = `${route.startsWith('course/') ? getCourse(route.slice(7))?.title || routeTitle(route,atlas) : route.startsWith('knowledge/') ? getKnowledge(route.slice(10))?.title || '共享知识' : route==='problems' ? 'Problem Set' : route==='home' ? '我的学习' : routeTitle(route, atlas)} · LEARN Workbench`;
}

function filterCatalog(input) {
  const results = $('#catalog-results');
  if (!results) return;
  const q = input.value.slice(0,150);
  results.innerHTML = experienceResults(q, results.dataset.subject || undefined);
  const options = routeOptions();
  if (q) options.set('q',q); else options.delete('q');
  const query = options.toString();
  history.replaceState(null,'','#/' + getPath() + (query ? '?' + query : ''));
}
document.addEventListener('submit', event => {
  if (event.target.id !== 'catalog-search-form') return;
  event.preventDefault();
  const input = $('#catalog-query');
  if (getPath() === 'home') {
    location.hash = '/courses' + (input.value.trim() ? '?q=' + encodeURIComponent(input.value.trim()) : '');
  } else {
    filterCatalog(input);
  }
});
document.addEventListener('input', event=>{
  const el=event.target;
  if (el.id === 'catalog-query' && getPath() !== 'home') filterCatalog(el);
  if (el.matches('[data-note]')) {
    progress.notes[el.dataset.note]=el.value.slice(0,NOTE_LIMIT);
    const ok = persist();
    const status=$('#save-status');
    if(status)status.textContent=ok?'已保存于本地浏览器':'本地保存失败，请先导出备份';
  }
  if (el.id==='student-cat') {
    session.studentCat=Number(el.value);
    const amount=$('#cat-percent');if(amount)amount.textContent=`${session.studentCat}%`;
    el.setAttribute('aria-valuetext', `${session.studentCat}%`);
    const graph=$('#distribution');if(graph)graph.innerHTML=renderKLMetrics(session.studentCat/100,session.klRevealed);
  }
  if (el.id==='atlas-search') {
    session.atlasQuery=el.value;
    refreshAtlasList();
  }
});
document.addEventListener('change', event=>{
  const el=event.target;
  if(el.id==='agent-scenario' || el.id==='agent-policy') {
    const key = el.id === 'agent-scenario' ? 'scenario' : 'policy';
    progress.agent = normalizeAgent({...progress.agent, [key]:el.value, shown:false});
    persist();render();$(`#${el.id}`)?.focus({preventScroll:true});
  }
  if(el.id==='atlas-route') {session.atlasRoute=el.value;refreshAtlasList();}
  if(el.id==='import-file' && el.files?.length) importBackup(el.files[0]);
});
document.addEventListener('click', async event=>{
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    $('#page-content')?.focus();
    return;
  }
  const button=event.target.closest('button');if(!button)return;
  if (button.id === 'atlas-retry') { atlasStatus = 'idle'; render(); }
  if(button.id==='agent-run') {
    progress.agent.shown=true;persist();render();
    $('#agent-result')?.focus();
  }
  if(button.id==='agent-reset') {
    if (progress.agent.explanationOpen) progress.decisions.agentHelpSeen = 'explanation';
    else if (progress.agent.hintOpen && !progress.decisions.agentHelpSeen) progress.decisions.agentHelpSeen = 'hint';
    progress.agent=normalizeAgent(null);
    const saved=persist();render();
    $('#agent-reset')?.focus({preventScroll:true});
    if(saved)showToast('已恢复起始条件；笔记和历史记录保留。');
  }
  if(button.id==='agent-record' && progress.agent.shown) {
    const state=progress.agent;
    const saved=record('Agent 规则对比', `${agentScenarioNames[state.scenario]}；A 保留未分类，B ${agentPolicyNames[state.policy]}。`,
      state.explanationOpen ? '观察结果；当前展开完整解释'
        : progress.decisions.agentHelpSeen === 'explanation' ? '观察结果；此前展开过完整解释'
          : state.hintOpen ? '观察结果；当前展开提示'
            : progress.decisions.agentHelpSeen === 'hint' ? '观察结果；此前展开过提示' : '观察结果；其他帮助未确认');
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
    const saved = record('KL 判断', `教师猫 80%、学生猫 95%，判断猫概率${klAnswerNames[answer]}${previous?'（修订）':''}。`,
      session.klRevealed ? '记录时已展开解释'
        : progress.decisions.klSawExplanation === 'yes' ? '此浏览器记录显示曾查看解释'
          : progress.decisions.klSawGuide === 'yes' ? '此前展开过导学页中的机制解释' : '帮助情况未确认');
    button.textContent='更新判断';
    $('#kl-saved').textContent=saved ? `已记录 95% 起点的判断 · ${klAnswerNames[answer]}` : '判断仅保留在本页，浏览器保存失败。';
    if(session.klRevealed) $('#kl-explanation').innerHTML=renderKLExplanation(answer);
  }
  if(button.id==='kl-reveal') {
    session.klRevealed=!session.klRevealed;
    button.setAttribute('aria-expanded', String(session.klRevealed));
    button.textContent=session.klRevealed?'收起解释':'查看机制解释';
    $('#kl-explanation').innerHTML=session.klRevealed?renderKLExplanation(progress.decisions.klPrediction):'';
    $('#distribution').innerHTML=renderKLMetrics(session.studentCat/100,session.klRevealed);
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
  if(button.id==='export-progress')exportBackup(JSON.stringify(progress,null,2), backupFileName());
  if(button.id==='export-unreadable' && progressStore.unreadableRecord !== null) {
    exportBackup(progressStore.unreadableRecord, backupFileName().replace('.json','-original.txt'));
  }
  if(button.id==='import-progress')$('#import-file')?.click();
});
function exportBackup(text, filename){
  const blob=new Blob([text],{type:'application/octet-stream'});
  const url=URL.createObjectURL(blob);const link=document.createElement('a');
  link.href=url;link.download=filename;
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  showToast('学习记录备份已生成。请保存在可信的位置。');
}
async function importBackup(file) {
  try {
    if(file.size>32 * 1024 * 1024)throw new Error('备份超过 32 MiB 限制。');
    const text=await file.text();const parsed=normalizeProgress(JSON.parse(text));
    if(!confirm('导入将替换本浏览器现有的笔记与实验记录。请确认已备份原数据。确定继续吗？'))return;
    if (!persist(parsed, {replaceUnreadable:true})) return;
    progress=parsed;
    session.klRevealed=false;session.studentCat=95;
    render();showToast('备份已导入。');
  }catch(error){showToast(`无法导入：${error.message}`);}
  finally {const input=$('#import-file');if(input)input.value='';}
}
// Native details stay keyboard-operable without replacing the focused element.
document.addEventListener('toggle', event=>{
  if (event.target.dataset?.klGuideHelp !== undefined && event.target.isConnected && event.target.open && progress.decisions.klSawGuide !== 'yes') {
    progress.decisions.klSawGuide = 'yes';
    persist();
    return;
  }
  const key=event.target.dataset?.agentDetail;
  if (!['hintOpen','explanationOpen','transferOpen'].includes(key) || !event.target.isConnected) return;
  if (key === 'explanationOpen' && (event.target.open || progress.agent.explanationOpen)) {
    progress.decisions.agentHelpSeen = 'explanation';
  } else if (key === 'hintOpen' && (event.target.open || progress.agent.hintOpen) && !progress.decisions.agentHelpSeen) {
    progress.decisions.agentHelpSeen = 'hint';
  }
  progress.agent[key]=event.target.open;
  persist();
}, true);
function focusLinkedSection() {
  const route=getPath();
  const options=routeOptions();
  const node=options.get('node');
  let target;
  if (route.startsWith('course/') && node && /^[a-zA-Z0-9._-]{1,80}$/.test(node)) {
    target=document.getElementById('kg-course-'+route.slice(7)+'-'+node+'-title') || document.getElementById('lesson-'+node);
  } else {
    const id=options.get('section');
    if (!id || (!isLearningUnit(route) && !route.startsWith('course/')) || !/^[a-z][a-z0-9-]{1,80}$/.test(id)) return false;
    target=document.getElementById(id);
  }
  if (!target || !target.closest('#page-content')) return false;
  target.setAttribute('tabindex','-1');
  target.focus({preventScroll:true});
  target.scrollIntoView({block:'start'});
  return true;
}
window.addEventListener('hashchange', () => {
  render();
  if (!focusLinkedSection()) {
    $('#page-content')?.focus?.({preventScroll:true});
    window.scrollTo({top:0, behavior:'instant'});
  }
});

// Atlas is optional. A slow/offline catalogue must never block a lesson or
// replace a draft on another page when its request eventually finishes.
async function loadAtlas() {
  atlasStatus = 'loading';
  try {
    const response = await fetch('./data/atlas.json');
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    if (!['nodes', 'routes', 'courses', 'sources'].every(key => Array.isArray(data[key]))) {
      throw new Error('Invalid Atlas catalogue');
    }
    atlas = data;
    atlasStatus = 'ready';
  } catch {
    atlasStatus = 'failed';
  }
  const path = getPath();
  if (path === 'atlas' || path.startsWith('atlas/node/')) render();
}
render();
focusLinkedSection();
