// Observable learning actions, never a mastery score. Existing stores are not
// read, migrated, rewritten or included in a new-format import.
export const LEARNING_LEDGER_KEY = 'learn-workbench.learning-ledger.v1';
export const LEDGER_LIMIT = 12000;
const KINDS = ['visited', 'read', 'self-reported', 'practice', 'note', 'help', 'transfer'];
const HELP = ['none', 'unknown', 'hint', 'solution'];
const VERIFICATION = ['self-report', 'local-check', 'external-evidence'];
const OUTCOMES = ['submitted', 'passed', 'failed'];
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(message); };
const boundedText = (value, max, optional = false) => {
  if (optional && (value === undefined || value === null)) return '';
  if (typeof value !== 'string' || value.length > max) fail('学习记录中的文字无效或过长。');
  return value;
};
const identifier = (value, optional = false) => {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:@/-]{0,159}$/.test(value)) fail('学习记录中的标识无效。');
  return value;
};
function zoneName(value) {
  if (typeof value !== 'string' || value.length > 80) fail('学习记录中的时区无效。');
  try { new Intl.DateTimeFormat('en', {timeZone:value}).format(); } catch { fail('学习记录中的时区无效。'); }
  return value;
}
export function learningDay(date = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) fail('学习日期无效。');
  const parts = new Intl.DateTimeFormat('en', {timeZone:zoneName(timeZone), year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(date);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function dayNumber(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) fail('学习记录中的日期无效。');
  const n = Date.parse(day + 'T00:00:00.000Z');
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0,10) !== day) fail('学习记录中的日期无效。');
  return n / 86400000;
}
function normalizeContext(raw) {
  if (!isObject(raw)) fail('学习上下文无效。');
  const courseId = identifier(raw.courseId ?? raw.course);
  const activityId = identifier(raw.activityId, true);
  const route = boundedText(raw.route, 500, true);
  if (route && !/^#\/[a-zA-Z0-9/_-]+(?:\?[a-zA-Z0-9%=&._:-]*)?$/.test(route)) fail('学习记录中的链接无效。');
  return {courseId, activityId, route, title:boundedText(raw.title, 200, true)};
}
export const emptyLearningLedger = () => ({version:1, events:[], last:null});
function normalizeEvent(raw) {
  if (!isObject(raw) || !KINDS.includes(raw.kind)) fail('学习记录中的事件类型无效。');
  const ref = normalizeContext(raw);
  if (raw.kind !== 'visited' && !ref.activityId) fail('学习动作必须对应一个具体活动。');
  const at = boundedText(raw.at, 40);
  const date = new Date(at);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== at) fail('学习记录中的时间无效。');
  const timeZone = zoneName(raw.timeZone);
  const day = boundedText(raw.day, 10);
  dayNumber(day);
  if (learningDay(date, timeZone) !== day) fail('学习日期与时区不一致。');
  if (!HELP.includes(raw.help) || !VERIFICATION.includes(raw.verification) || !OUTCOMES.includes(raw.outcome)) fail('学习记录中的帮助或核验条件无效。');
  const event = {...ref, id:identifier(raw.id), kind:raw.kind, at, day, timeZone,
    help:raw.help, verification:raw.verification, outcome:raw.outcome,
    attemptId:identifier(raw.attemptId, true), evidence:boundedText(raw.evidence, 3000, true)};
  if (event.kind === 'note' && !event.evidence.trim()) fail('研究笔记不能为空。');
  if (['practice','transfer','help'].includes(event.kind) && !event.attemptId) fail('练习和帮助记录需要保留尝试标识。');
  if (event.kind === 'transfer' && !event.evidence.trim()) fail('迁移记录需要描述新情境和作品证据。');
  if (event.verification !== 'self-report' && !event.evidence.trim()) fail('核验记录需要保留具体证据。');
  return event;
}
export function normalizeLearningLedger(raw) {
  if (!isObject(raw) || raw.version !== 1 || !Array.isArray(raw.events) || !Object.hasOwn(raw,'last')) fail('这不是兼容的学习进度备份。');
  if (raw.events.length > LEDGER_LIMIT) fail('学习记录过多，请保留原始备份。');
  const ids = new Set();
  const events = raw.events.map(row => {
    const event = normalizeEvent(row);
    if (ids.has(event.id)) fail('学习备份包含重复事件，未恢复。');
    ids.add(event.id);
    return event;
  });
  return {version:1, events, last:raw.last === null ? null : normalizeContext(raw.last)};
}
// Help belongs to an attempt, not its last submitted answer. A later event
// saying "none" can never erase an earlier hint/solution on the same attempt.
function attemptHelp(events) {
  const result = new Map();
  for (const e of events) if (e.attemptId) {
    const key = e.activityId + '\n' + e.attemptId;
    result.set(key, Math.max(result.get(key) ?? 0, HELP.indexOf(e.help)));
  }
  return result;
}
function activitySummary(activityId, events, helpByAttempt) {
  const rows = events.filter(e => e.activityId === activityId);
  const result = {activityId, visited:false, read:false, selfReported:false, attempted:false,
    assisted:false, independent:false, transfer:false, verifiedTransfer:false, notes:0, events:rows.length};
  for (const e of rows) {
    if (e.kind === 'visited') result.visited = true;
    if (e.kind === 'read') result.read = true;
    if (e.kind === 'self-reported') result.selfReported = true;
    if (e.kind === 'note') result.notes++;
    if (!['practice','transfer'].includes(e.kind)) continue;
    result.attempted = true;
    const help = helpByAttempt.get(e.activityId + '\n' + e.attemptId) ?? HELP.indexOf(e.help);
    if (help >= HELP.indexOf('hint')) result.assisted = true;
    const independent = help === 0 && e.outcome === 'passed' && e.verification !== 'self-report' && Boolean(e.evidence.trim());
    if (e.kind === 'practice' && independent) result.independent = true;
    if (e.kind === 'transfer') {
      result.transfer = true;
      if (independent) result.verifiedTransfer = true;
    }
  }
  return result;
}
export function courseLearningProgress(state, courseId, activityIds) {
  identifier(courseId);
  if (!Array.isArray(activityIds) || activityIds.length > 3000) fail('需要明确的课程活动目录。');
  const unique = [...new Set(activityIds.map(id => identifier(typeof id === 'string' ? id : id.id)))];
  const help = attemptHelp(state.events);
  // Same canonical activity can occur in two courses; its evidence remains one
  // record with its original course context, shared by these exact activity IDs.
  const activities = unique.map(id => activitySummary(id, state.events, help));
  const result = {courseId, total:unique.length, activities};
  for (const key of ['visited','read','selfReported','attempted','assisted','independent','transfer','verifiedTransfer']) result[key] = activities.filter(a => a[key]).length;
  result.withLearningEvidence = activities.filter(a => a.read || a.attempted || a.notes).length;
  return result;
}
const learningAction = e => ['read','note','practice','transfer'].includes(e.kind);
export function learningStreak(state, date = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const today = learningDay(date, timeZone), todayN = dayNumber(today);
  // Captured local days are retained across travel/timezone changes. Future
  // records in an imported backup cannot increase today's learning history.
  const days = [...new Set(state.events.filter(e => learningAction(e) && Date.parse(e.at) <= date.getTime() && dayNumber(e.day) <= todayN).map(e => e.day))].sort();
  const numbers = days.map(dayNumber);
  let best = 0, latestRun = 0, previous = null;
  for (const n of numbers) { latestRun = n === previous + 1 ? latestRun + 1 : 1; best = Math.max(best,latestRun); previous = n; }
  const lastLearningDay = days.at(-1) ?? null;
  const current = previous !== null && todayN - previous <= 1 ? latestRun : 0;
  const week = Array.from({length:7}, (_, i) => {
    const day = new Date((todayN - 6 + i)*86400000).toISOString().slice(0,10);
    return {day, active:days.includes(day)};
  });
  return {today, days, totalDays:days.length, current, best, latestRun, lastLearningDay,
    activeToday:days.includes(today), thisWeek:week.filter(d => d.active).length, week};
}
export function openLearningLedger(adapter, {now = () => new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone} = {}) {
  zoneName(timeZone);
  const storage = typeof adapter === 'function' ? adapter : () => adapter;
  let original, invalid = false, warning = '', state = emptyLearningLedger(), sequence = 0;
  try { original = storage().getItem(LEARNING_LEDGER_KEY); if (original !== null) state = normalizeLearningLedger(JSON.parse(original)); }
  catch { invalid = true; warning = '学习进度暂时无法读取，已暂停保存。原始记录会保留；可下载原文或导出本页草稿。'; }
  function write(next, replaceUnreadable = false) {
    if (invalid && !replaceUnreadable) return false;
    try {
      const target = storage();
      if (original === undefined || target.getItem(LEARNING_LEDGER_KEY) !== original) {
        warning = '另一页面已改变学习进度，已暂停写入。请先导出本页草稿，再刷新。';
        return false;
      }
      const serialized = JSON.stringify(next);
      if (serialized !== original) target.setItem(LEARNING_LEDGER_KEY,serialized);
      original = serialized; invalid = false; warning = ''; return true;
    } catch { warning = '学习进度未能保存到本机。请导出本页草稿后再离开。'; return false; }
  }
  const api = {
    get state() { return structuredClone(state); },
    get warning() { return warning; },
    get raw() { return original; },
    get unreadable() { return invalid; },
    visit(ref) {
      const context = normalizeContext(ref), at = now();
      const last = state.events.at(-1);
      // Repainting an exercise is not another visit. Preserve its saved context.
      if (last?.kind === 'visited' && last.day === learningDay(at,timeZone) &&
          JSON.stringify(state.last) === JSON.stringify(context)) return warning ? api.save() : true;
      return api.record({...context, kind:'visited'});
    },
    record(action) {
      if (state.events.length >= LEDGER_LIMIT) { warning = '学习进度已有 12000 条，请先导出归档。'; return false; }
      const at = now(), iso = at.toISOString();
      const event = normalizeEvent({...action, id:action.id ?? ('event-' + (globalThis.crypto?.randomUUID?.() ?? `${at.getTime()}-${++sequence}-${Math.random().toString(36).slice(2)}`)),
        at:iso, day:learningDay(at,timeZone), timeZone, help:action.help ?? 'unknown',
        verification:action.verification ?? 'self-report', outcome:action.outcome ?? 'submitted'});
      const existing = state.events.find(e => e.id === event.id);
      if (existing) {
        // Explicit IDs make callback delivery idempotent, while conflicts never
        // silently overwrite evidence or change its assistance condition.
        const content = e => JSON.stringify({...e,at:null,day:null,timeZone:null});
        if (content(existing) !== content(event)) fail('事件标识已存在，不能改写原来的学习证据。');
        return warning ? api.save() : true;
      }
      // Keep unsaved actions exportable on quota errors and stale-tab conflicts.
      state = {...state, last:normalizeContext(event), events:[...state.events,event]};
      return write(state);
    },
    save() { return write(state); },
    courseProgress(courseId, activityIds) { return courseLearningProgress(state,courseId,activityIds); },
    streak(date = now()) { return learningStreak(state,date,timeZone); },
    summary() {
      const activityIds = [...new Set(state.events.map(e => e.activityId).filter(Boolean))];
      const progress = courseLearningProgress(state,'all',activityIds);
      return {...progress, events:state.events.length, last:state.last ? {...state.last} : null, streak:api.streak()};
    },
    export() { return JSON.stringify(state,null,2); },
    restore(raw) {
      const next = normalizeLearningLedger(typeof raw === 'string' ? JSON.parse(raw) : raw);
      if (!write(next,true)) return false;
      state = next; return true;
    },
  };
  return api;
}
