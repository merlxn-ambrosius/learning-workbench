import { normalizeMicrograd } from './micrograd.mjs';

/** Core educational mechanics. Pure functions keep experiments independently testable. */

export const COURSE_LINKS = Object.freeze({
  cs329z: 'https://github.com/cs329z/assignment1-harness',
  cs329zAssignment: 'https://github.com/cs329z/assignment1-harness/blob/95f4cb7bfe28a27a7cf5bcb1eccb1aaaf1385eb3/cs329z_assignment1_harness.pdf',
  karpathy: 'https://github.com/karpathy/nn-zero-to-hero',
});

export const SCENARIOS = Object.freeze({
  baseline: {
    label: '原始记录',
    items: [
      { id: 'M-301', subject: '线上服务发生故障', reply: 'high' },
      { id: 'M-302', subject: '本周书单分享', reply: 'low' },
      { id: 'M-303', subject: '客户等待上线确认', reply: 'high' },
    ],
  },
  changed: {
    label: '陌生变化：不规范回复',
    items: [
      { id: 'M-401', subject: '部署回滚请求', reply: ' HIGH ' },
      { id: 'M-402', subject: '项目会议信息', reply: 'maybe' },
      { id: 'M-403', subject: '技术周报', reply: 'low' },
    ],
  },
});

export function classifyScriptedReply(raw) {
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return normalized === 'high' || normalized === 'low' ? normalized : 'unclassified';
}

/**
 * An explicitly local teaching simulation, NOT Stanford's original assignment solution.
 * Policy changes the downstream route, never the evidence in the parsed category.
 * Even a dropped input remains in rows so its original text and state are inspectable.
 */
export function processScriptedItems(items, policy = 'keep') {
  if (!['keep', 'low', 'drop'].includes(policy)) throw new RangeError(`Unknown routing policy: ${policy}`);
  if (!Array.isArray(items)) throw new TypeError('items must be an array');
  const rows = items.map(item => {
    const category = classifyScriptedReply(item.reply);
    const routedCategory = category !== 'unclassified' || policy === 'keep'
      ? category
      : policy === 'low' ? 'low' : null;
    return { ...item, category, routedCategory, included: routedCategory !== null };
  });
  const counts = {
    high: rows.filter(item => item.category === 'high').length,
    low: rows.filter(item => item.category === 'low').length,
    unclassified: rows.filter(item => item.category === 'unclassified').length,
  };
  const included = rows.filter(item => item.included);
  return {
    policy,
    rows,
    counts,
    includedCount: included.length,
    digest: included.map(item => `${item.id} · ${item.routedCategory === 'unclassified' ? '未分类（需处理）' : item.routedCategory.toUpperCase()} · ${item.subject}`).join('\n'),
  };
}

export function runHarness(scenario = 'baseline', policy = 'keep') {
  if (!Object.hasOwn(SCENARIOS, scenario)) throw new Error(`Unknown scenario: ${scenario}`);
  return { scenario, ...processScriptedItems(SCENARIOS[scenario].items, policy) };
}

export const TEACHER_DIST = Object.freeze([0.8, 0.15, 0.05]);

export function studentDistribution(catProbability) {
  const q = Number(catProbability);
  if (!Number.isFinite(q) || q <= 0 || q >= 1) throw new RangeError('catProbability must be in (0, 1)');
  return [q, (1 - q) * 0.75, (1 - q) * 0.25];
}

/** KL(P||Q): teacher P, student Q, natural log (nats). */
export function klDivergence(teacher, student) {
  if (!Array.isArray(teacher) || !Array.isArray(student) || teacher.length !== student.length || teacher.length === 0) {
    throw new Error('distributions must be arrays of equal nonzero length');
  }
  for (const distribution of [teacher, student]) {
    if (distribution.some(n => !Number.isFinite(n) || n <= 0)) throw new Error('all probabilities must be finite and positive');
    const total = distribution.reduce((a, b) => a + b, 0);
    if (Math.abs(total - 1) > 1e-8) throw new Error('probabilities must sum to one');
  }
  return teacher.reduce((sum, p, i) => sum + p * Math.log(p / student[i]), 0);
}

/** For softmax logits, d KL(P||Q) / d z_i = Q_i - P_i. */
export function klLogitGradient(teacher, student) {
  return student.map((q, i) => q - teacher[i]);
}

export const STORAGE_KEY = 'learn-workbench.progress.v1';
export const FORMAT_VERSION = 1;
export const NOTE_LIMIT = 12000;

/** Optional v1 extension: never infer a new observation from a legacy prediction. */
export function normalizeAgent(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const validCondition = ['baseline', 'changed'].includes(source.scenario) && ['low', 'drop'].includes(source.policy);
  return {
    scenario: ['baseline', 'changed'].includes(source.scenario) ? source.scenario : 'changed',
    policy: ['low', 'drop'].includes(source.policy) ? source.policy : 'low',
    shown: validCondition && source.shown === true,
    hintOpen: source.hintOpen === true,
    explanationOpen: source.explanationOpen === true,
    transferOpen: source.transferOpen === true,
  };
}

export function defaultProgress() {
  return {
    version: FORMAT_VERSION,
    lastRoute: '#/home',
    notes: { agent: '', kl: '', general: '' },
    evidence: [],
    decisions: {},
    micrograd: normalizeMicrograd(null),
    agent: normalizeAgent(null),
  };
}

/** Strictly normalize imports: avoid accidentally persisting hostile or huge objects. */
export function normalizeProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== FORMAT_VERSION) {
    throw new Error('这不是兼容版本的 LEARN 学习记录。');
  }
  // Existing v1 backups may predate the lab fields. A version number alone
  // (or an invalid core container) cannot establish a restorable snapshot.
  const objectFields = ['notes', 'decisions'];
  if (![...objectFields, 'evidence', 'micrograd', 'agent', 'lastRoute'].some(key => Object.hasOwn(value, key)) ||
      objectFields.some(key => key in value && (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key]))) ||
      ('evidence' in value && !Array.isArray(value.evidence))) {
    throw new Error('学习记录结构不完整。请检查原文件或选择其他备份。');
  }
  const output = defaultProgress();
  output.micrograd = normalizeMicrograd(value.micrograd);
  output.agent = normalizeAgent(value.agent);
  const route = String(value.lastRoute ?? '');
  if (/^#\/(home|learn(?:\/(?:agent|kl|micrograd))?|lab(?:\/(?:agent|kl|range-queries))?|practice\/cph-(?:0[1-9]|[12][0-9]|30)|atlas(?:\/node\/[A-Z0-9]+)?|journal|sync)$/.test(route)) {
    output.lastRoute = route;
  }
  if (value.notes && typeof value.notes === 'object') {
    for (const name of Object.keys(output.notes)) {
      const text = value.notes[name];
      if (typeof text === 'string') output.notes[name] = text.slice(0, NOTE_LIMIT);
    }
  }
  if (value.decisions && typeof value.decisions === 'object' && !Array.isArray(value.decisions)) {
    for (const [key, decision] of Object.entries(value.decisions).slice(0, 100)) {
      if (!/^[a-z0-9_-]{1,40}$/i.test(key)) continue;
      if (typeof decision === 'string') output.decisions[key] = decision.slice(0, 500);
    }
  }
  if (Array.isArray(value.evidence)) {
    output.evidence = value.evidence.filter(entry =>
      entry && typeof entry === 'object' &&
      typeof entry.kind === 'string' && typeof entry.summary === 'string' &&
      typeof entry.date === 'string'
    ).map(entry => ({
      kind: String(entry.kind).slice(0, 32),
      summary: String(entry.summary).slice(0, 500),
      date: String(entry.date).slice(0, 50),
      help: String(entry.help ?? '未记录').slice(0, 40),
    }));
  }
  return output;
}

/** Unique, sortable snapshot filename; no private data in filename. */
export function backupFileName(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new TypeError('Invalid backup date');
  return `learn-progress-${date.toISOString().replace(/[:.]/g, '-')}.json`;
}
