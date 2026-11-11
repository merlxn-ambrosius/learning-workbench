import { normalizeMicrograd } from './micrograd.mjs';

/** Core educational mechanics. Pure functions keep experiments independently testable. */

export const COURSE_LINKS = Object.freeze({
  cs329z: 'https://github.com/cs329z/assignment1-harness',
  cs329zAssignment: 'https://github.com/cs329z/assignment1-harness/blob/main/cs329z_assignment1_harness.pdf',
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
 * A missing/unknown classification remains visible instead of inventing a label.
 */
export function runHarness(scenario = 'baseline') {
  const selected = SCENARIOS[scenario];
  if (!selected) throw new Error(`Unknown scenario: ${scenario}`);
  const rows = selected.items.map(item => ({
    ...item,
    category: classifyScriptedReply(item.reply),
  }));
  const counts = {
    high: rows.filter(item => item.category === 'high').length,
    low: rows.filter(item => item.category === 'low').length,
    unclassified: rows.filter(item => item.category === 'unclassified').length,
  };
  return {
    scenario,
    rows,
    counts,
    digest: rows.map(item => `${item.id} · ${item.category === 'unclassified' ? '未分类（需处理）' : item.category.toUpperCase()} · ${item.subject}`).join('\n'),
  };
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

export function defaultProgress() {
  return {
    version: FORMAT_VERSION,
    lastRoute: '#/learn/agent',
    notes: { agent: '', kl: '', general: '' },
    evidence: [],
    decisions: {},
    micrograd: normalizeMicrograd(null),
  };
}

/** Strictly normalize imports: avoid accidentally persisting hostile or huge objects. */
export function normalizeProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== FORMAT_VERSION) {
    throw new Error('这不是兼容版本的 LEARN 学习记录。');
  }
  const output = defaultProgress();
  output.micrograd = normalizeMicrograd(value.micrograd);
  const route = String(value.lastRoute ?? '');
  if (/^#\/(home|learn(?:\/(?:agent|kl|micrograd))?|lab(?:\/(?:agent|kl))?|atlas(?:\/node\/[A-Z0-9]+)?|journal|sync)$/.test(route)) {
    output.lastRoute = route;
  }
  if (value.notes && typeof value.notes === 'object') {
    for (const name of Object.keys(output.notes)) {
      const text = value.notes[name];
      if (typeof text === 'string') output.notes[name] = text.slice(0, 12000);
    }
  }
  if (value.decisions && typeof value.decisions === 'object' && !Array.isArray(value.decisions)) {
    for (const [key, decision] of Object.entries(value.decisions).slice(0, 100)) {
      if (!/^[a-z0-9_-]{1,40}$/i.test(key)) continue;
      if (typeof decision === 'string') output.decisions[key] = decision.slice(0, 500);
    }
  }
  if (Array.isArray(value.evidence)) {
    output.evidence = value.evidence.slice(-80).filter(entry =>
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
