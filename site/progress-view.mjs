import {escapeHtml as h} from './html.mjs';
import {normalizeLearningLedger} from './learning-ledger.mjs';

const counts = progress => `<dl class="learning-evidence-counts"><div><dt>确认已读</dt><dd>${progress.read} / ${progress.total}</dd></div><div><dt>自己标记完成</dt><dd>${progress.selfReported} / ${progress.total}</dd></div><div><dt>提交过练习</dt><dd>${progress.attempted}</dd></div><div><dt>使用帮助的练习</dt><dd>${progress.assisted}</dd></div><div><dt>无帮助通过核验</dt><dd>${progress.independent}</dd></div><div><dt>新情境迁移记录</dt><dd>${progress.transfer}</dd></div></dl>`;
const refContext = context => context && {...context, courseId:context.courseId ?? context.course};

// The caller supplies the catalog's exact IDs. A course page visit, following an
// external link, or opening an answer never becomes course completion.
export function renderLearningProgress(ledger, context, activityIds = null) {
  const ref = refContext(context);
  if (!ref?.courseId) return '';
  const ids = activityIds ?? (ref.activityId ? [ref.activityId] : []);
  const progress = ledger.courseProgress(ref.courseId,ids);
  const current = progress.activities.find(a => a.activityId === ref.activityId);
  return `<section class="learning-progress" data-learning-progress aria-label="本机学习记录"><div class="learning-progress-heading"><span class="world-kicker">学习足迹 · 只存在当前浏览器</span><h2>${ref.activityId?'留下这次学习的状态':'这门课的学习记录'}</h2><p>访问、阅读和练习分别保留。完成情况由你说明，独立核验只描述具体任务，不代表整门课的掌握。</p></div><details class="learning-progress-counts"><summary>查看${ref.activityId?'这一活动':'这门课'}的记录：已读 ${progress.read} / ${progress.total}，自报完成 ${progress.selfReported} / ${progress.total}</summary>${counts(progress)}</details>${ref.activityId?`<div class="learning-progress-actions"><button type="button" class="world-button secondary" data-learning-read ${current?.read?'disabled':''}>${current?.read?'已确认读过':'我已读过这一活动'}</button><details><summary>记录自己的完成情况${current?.selfReported?'（已有自报）':''}</summary><form data-learning-completion><label>这次使用了什么帮助？<select name="help"><option value="unknown">没有确认帮助情况</option><option value="none">我没有使用提示或解答</option><option value="hint">使用了提示</option><option value="solution">查看过解答或参考实现</option></select></label><label>想留下的说明（可选）<input name="evidence" maxlength="3000" placeholder="例如：做完原课作业，代码保存在自己的项目里。"></label><button type="submit" class="world-button secondary">自己标记为完成</button><p>这是一条自报记录。它不会自动变成独立通过或迁移证据。</p></form></details></div>`:progress.total?'':'<p>这门课尚无可计数的活动目录。</p>'}<p data-learning-status role="status">${h(ledger.warning)}</p></section>`;
}

export function renderLearningSummary(ledger) {
  const summary = ledger.summary(), streak = summary.streak;
  return `<section class="learning-progress learning-history" aria-label="学习足迹总览"><span class="world-kicker">YOUR LEARNING TRACE</span><h2>每次回来，都可以接着走。</h2><p>累计留下学习行动的 ${streak.totalDays} 天，最近七天中的 ${streak.thisWeek} 天。休息不会删去已有证据；没有补签、扣分或解锁要求。</p><ol class="learning-week" aria-label="最近七天的学习记录">${streak.week.map(d=>`<li class="${d.active?'active':'quiet'}"><span>${h(d.day.slice(5))}</span><span aria-label="${d.active?'有学习行动':'未记录学习行动'}">${d.active?'●':'·'}</span></li>`).join('')}</ol><p>确认读过活动、提交练习或保存有内容的研究笔记会留下学习日。访问页面、展开提示、自己标记完成不会增加学习日。</p>${counts(summary)}<p>“无帮助通过核验”仅指已保存具体核验依据的那一次任务；公开练习与真实迁移仍分别记录。</p>${renderLearningBackups(ledger)}</section>`;
}

export function renderLearningBackups(ledger) {
  return `<details class="learning-backups"><summary>导出或恢复学习进度</summary><p>这一份备份只包含学习足迹。研究簿、原有课程笔记和 Studio 实验仍使用各自的备份入口，恢复这里不会改写它们。记录只留在本机，没有自动上传。</p><div class="actions"><button type="button" class="world-button secondary" data-ledger-export>导出学习进度</button><label class="world-button secondary">选择进度备份<input type="file" data-ledger-import accept=".json,application/json"></label>${ledger.unreadable && typeof ledger.raw === 'string'?'<button type="button" class="world-button secondary" data-ledger-raw>下载无法读取的原文</button>':''}</div><div data-ledger-import-preview hidden></div><p data-learning-status role="status">${h(ledger.warning)}</p></details>`;
}

function download(value, name) {
  const url = URL.createObjectURL(new Blob([value],{type:'application/json'}));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}
export function bindLearningProgress(root, ledger, context = null, {onChange = () => {}, onError = () => {}, downloadFile = download} = {}) {
  if (!root?.querySelectorAll || !root?.addEventListener) return;
  const ref = refContext(context);
  const currentRoot = () => root.isConnected === false && root.ownerDocument ? (root.id && root.ownerDocument.getElementById(root.id)) || root.ownerDocument : root;
  const status = (text, focus = false) => {
    const nodes = currentRoot().querySelectorAll('[data-learning-status]');
    nodes.forEach(el => {el.textContent = text;});
    if (focus && nodes[0]) {nodes[0].tabIndex = -1;nodes[0].focus({preventScroll:true});}
  };
  const commit = (action, focus = false) => {
    try {
      if (!ledger.record({...ref,...action})) {status(ledger.warning,focus);onError(ledger.warning);return false;}
      onChange();status('学习记录已保存到本机。',focus);return true;
    } catch (error) {status(error.message,focus);onError(error.message);return false;}
  };
  root.querySelector('[data-learning-read]')?.addEventListener('click',() => commit({kind:'read'},true));
  root.querySelector('[data-learning-completion]')?.addEventListener('submit',event => {
    event.preventDefault();
    const form = event.currentTarget;
    commit({kind:'self-reported',help:form.elements.help.value,evidence:form.elements.evidence.value},true);
  });
  // Optional integration boundary for real submitted exercises. The emitting
  // activity must supply its attempt/help/outcome and verification provenance.
  root.addEventListener('learn:record',event => { if (event.detail && typeof event.detail === 'object') commit(event.detail); });
  const stamp = () => new Date().toISOString().replace(/[:.]/g,'-');
  root.querySelectorAll('[data-ledger-export]').forEach(button => button.addEventListener('click',() => downloadFile(ledger.export(),'learn-learning-ledger-'+stamp()+'.json')));
  root.querySelector('[data-ledger-raw]')?.addEventListener('click',() => downloadFile(ledger.raw,'learn-learning-ledger-original-'+stamp()+'.json'));
  root.querySelector('[data-ledger-import]')?.addEventListener('change',async event => {
    const file = event.target.files?.[0], area = root.querySelector('[data-ledger-import-preview]');
    if (!file || !area) return;
    area.hidden = false;
    try {
      // The upper bound covers every valid 12000-event ledger, including full
      // Unicode notes, so our own export is never rejected merely for its size.
      if (file.size > 256_000_000) throw new Error('文件超过 256 MB，请保留原文件并检查备份。');
      const candidate = normalizeLearningLedger(JSON.parse(await file.text()));
      area.innerHTML = `<h3>确认恢复学习进度</h3><p>备份有 ${candidate.events.length} 条动作，将替换当前 ${ledger.state.events.length} 条动作。请先导出当前进度。研究簿、旧记录与实验条件保持原样。</p><button type="button" class="world-button" data-ledger-confirm>确认替换学习进度</button><button type="button" class="world-button secondary" data-ledger-cancel>取消</button>`;
      area.querySelector('[data-ledger-cancel]').addEventListener('click',() => {area.hidden=true;event.target.value='';});
      area.querySelector('[data-ledger-confirm]').addEventListener('click',() => {
        if (ledger.restore(candidate)) {area.hidden=true;event.target.value='';onChange();status('学习进度已恢复到本机。',true);}
        else {status(ledger.warning);onError(ledger.warning);}
      });
      area.querySelector('[data-ledger-confirm]').focus();
    } catch (error) {
      area.textContent = error instanceof SyntaxError ? '未恢复：文件不是有效的进度备份。已有记录没有改变。' : '未恢复：'+error.message;
      event.target.value = '';
    }
  });
}
