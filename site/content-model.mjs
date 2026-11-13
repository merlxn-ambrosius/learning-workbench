import { handbookCourses, handbookSource } from './handbook-catalog.mjs';
import { knowledgeDefinitions, occurrenceExtensions, activities, contentSources } from './knowledge-content.mjs';
export { evaluateOptimization } from './knowledge-content.mjs';

export const CONTENT_MODEL_VERSION = 1;
const original = { author: 'LEARN', license: 'MIT', sourceIds: ['learn-original'] };
const externalRights = 'External materials remain under their original terms; this site links to them.';
const zeroSource = contentSources['karpathy-zero-to-hero'];
const video = id => 'https://www.youtube.com/watch?v=' + id;
const lectureRows = [
  ['micrograd', '构建 micrograd：神经网络与反向传播', 'VMj-3S1tku0', '从标量计算构建自动微分与小型神经网络。', ['micrograd-derivative', 'micrograd-graph', 'micrograd-autodiff']],
  ['makemore', '构建 makemore：语言模型入门', 'PaCmpygFfXo', '字符二元模型、张量、采样与损失。', []],
  ['makemore-mlp', 'makemore 第二部分：MLP', 'TCH_1BHY58I', '多层感知机、训练与验证。', []],
  ['makemore-batchnorm', 'makemore 第三部分：激活、梯度与 BatchNorm', 'P6sfmUTpUmc', '观察深层模型中激活和梯度的尺度。', []],
  ['makemore-backprop', 'makemore 第四部分：手工反向传播', 'q8SA3rM6ckI', '在张量层面手工传播梯度。', []],
  ['makemore-wavenet', 'makemore 第五部分：WaveNet', 't3YJ5hKiMQ0', '从 MLP 扩展到层次结构。', []],
  ['build-gpt', '从零构建 GPT', 'kCc8FmEb1nY', '实现自回归 Transformer。', []],
  ['gpt-tokenizer', '构建 GPT 分词器', 'zduSFxRajkE', '实现编码、解码与字节对合并。', []],
];
const zeroChapters = lectureRows.map(([id, title, videoId, description, occurrenceIds], index) => ({
  id, title, kind: 'chapter', number: index + 1, description, occurrenceIds,
  source: { title: `Zero to Hero · Lecture ${index + 1}`, url: video(videoId), author: 'Andrej Karpathy', license: externalRights },
  activities: [{ id: `zero-to-hero:${id}:lecture`, title: '观看原课', kind: 'source-reading', href: video(videoId), chapterId: id, provenance: { author: 'Andrej Karpathy', license: externalRights, sourceIds: ['karpathy-zero-to-hero'] } }],
}));
const cphChapters = handbookCourses.map(unit => ({
  id: unit.id, title: unit.title, description: unit.description, kind: 'chapter', number: unit.chapter, part: unit.part,
  legacyUnitId: unit.id, source: { ...unit.source, title: unit.source.label, author: 'Antti Laaksonen', license: externalRights }, occurrenceIds: [],
  activities: unit.lessons.map(item => ({ ...item, id: unit.id + ':' + item.id, legacyActivityId: item.id, chapterId: unit.id, kind: item.id === 'exercise' ? 'practice' : item.status === 'external' ? 'source-reading' : 'activity', provenance: item.status === 'external' ? { author: item.id === 'judge' ? 'CSES' : 'Antti Laaksonen', license: externalRights, sourceUrl: item.href } : original })),
}));
const ocw = 'https://ocw.mit.edu/courses/';
const sourceCourses = [
  ['mit-6-0001', 'MIT 6.0001 · Python 程序设计', ['computing'], ocw + '6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/', 'Fall 2016', '计算机科学与 Python 编程的完整原课。站内旧入口只选读条件、循环和函数。', 'python'],
  ['mit-18-01sc', 'MIT 18.01SC · 单变量微积分', ['math'], ocw + '18-01sc-single-variable-calculus-fall-2010/', 'Fall 2010', '单变量微积分完整原课。站内旧入口只选读导数、乘积法则和链式法则。', 'calculus'],
  ['mit-18-06', 'MIT 18.06 · 线性代数', ['math'], ocw + '18-06-linear-algebra-spring-2010/', 'Spring 2010', '线性代数完整原课。站内旧入口只选读线性方程与矩阵乘法。', 'linear-algebra'],
  ['mit-res-6-012', 'MIT RES.6-012 · 概率论', ['math'], ocw + 'res-6-012-introduction-to-probability-spring-2018/', 'Spring 2018', '概率论完整原课。站内旧入口只选读离散分布、期望和方差。', 'probability'],
  ['mit-6-102', 'MIT 6.102 · Software Construction', ['computing'], 'https://web.mit.edu/6.102/www/sp24/', 'Spring 2024', '软件构造完整原课。站内旧入口只选读规格与测试。', 'contracts'],
  ['mit-15-401', 'MIT 15.401 · Finance Theory I', ['finance', 'math'], ocw + '15-401-finance-theory-i-fall-2008/', 'Fall 2008', '金融理论完整原课。站内旧入口只选读收益风险与投资组合。', 'portfolio'],
].map(([id, title, subjectIds, url, edition, description, legacyId]) => ({
  id, title, kind: 'course', origin: 'external-course', subjectIds, description, author: 'MIT',
  source: { title, label: title, url, version: edition, author: 'MIT', license: externalRights },
  coverage: { outline: 'source-only', localContent: 'selected-bridges', label: '完整原课在 MIT；站内仅提供选读入口' },
  chapters: [], sequence: [], occurrenceSequence: [], legacyIds: [legacyId],
  // A selected bridge is an activity of the course, not a fabricated chapter.
  activities: [{ id: `${id}:selected-bridge`, title: '打开站内选读', kind: 'selected-bridge', href: '#/course/' + legacyId, provenance: original }, { id: `${id}:source`, title: '打开完整原课', kind: 'source-reading', href: url, provenance: { author: 'MIT', license: externalRights, sourceUrl: url } }],
}));

/** Only whole-course / whole-book spines belong here; local completeness is explicit. */
export const fullCourses = [
  {
    id: 'zero-to-hero', title: 'Neural Networks: Zero to Hero', subtitle: '从零构建神经网络', kind: 'course', origin: 'external-course',
    author: 'Andrej Karpathy', subjectIds: ['ai', 'computing', 'math'],
    description: '沿 Karpathy 的完整公开课程，从 micrograd、语言模型走到 GPT 与分词器。micrograd 是第一讲。',
    source: { ...zeroSource, label: 'Karpathy · 官方课程目录' },
    coverage: { outline: 'complete-published-syllabus', localContent: 'selected-bridges', label: '已列出官方当前公开的 8 讲；原课仍在更新，站内补充第一讲' },
    chapters: zeroChapters, sequence: zeroChapters.map(ch => ch.id), occurrenceSequence: ['micrograd-derivative', 'micrograd-graph', 'micrograd-autodiff'], legacyIds: ['micrograd'], activities: [],
  },
  {
    id: 'competitive-programmers-handbook', title: 'Competitive Programmer’s Handbook', subtitle: '竞赛算法 · 整书学习', kind: 'course', origin: 'book-study',
    author: 'Antti Laaksonen', subjectIds: ['computing', 'math'],
    description: '把一本手册作为连续学习主干：3 部分、30 章、118 个编号小节。每章保留原书定位与 LEARN 练习。',
    source: { title: handbookSource.title, label: 'Antti Laaksonen · 2018-07-03 草稿', url: handbookSource.pdfUrl, author: handbookSource.author, version: handbookSource.edition, sha256: handbookSource.sha256, license: externalRights },
    coverage: { outline: 'complete-book', localContent: 'chapter-practice-and-selected-concepts', label: '整书 30 章；这是基于书籍的学习主干，原作者未将其命名为一门课程' },
    chapters: cphChapters, sequence: cphChapters.map(ch => ch.id), occurrenceSequence: [], legacyIds: cphChapters.map(ch => ch.id), activities: [],
  },
  ...sourceCourses,
];

export const learningPaths = [{
  id: 'learn-optimization-path', title: '从求导到参数更新', subtitle: 'LEARN 选编路径', kind: 'curated-path', origin: 'learn-curation', author: 'LEARN', subjectIds: ['ai', 'math', 'computing'],
  description: '把共享输入的梯度带入一次真实参数更新，检查“损失下降”能否证明求导正确。由 LEARN 选编，不是另一门原课的完整复刻。',
  source: { ...contentSources['learn-original'], label: 'LEARN 原创选编 · v1.0.0' },
  coverage: { outline: 'curated-selection', localContent: 'complete-path', label: '短选编路径 · 复用同一知识节点并补充优化视角' },
  chapters: [{ id: 'optimization-basics', title: '共享梯度如何改变更新', kind: 'chapter', number: 1, description: '先理解局部变化，再比较实际的一步更新。', occurrenceIds: ['optimization-derivative', 'optimization-autodiff'], activities: [] }],
  sequence: ['optimization-basics'], occurrenceSequence: ['optimization-derivative', 'optimization-autodiff'], activities: [], legacyIds: [],
}];

const occurrence = (id, courseId, chapterId, knowledgeId, extensions = []) => ({
  id, courseId, chapterId, knowledgeId, version: '1.0.0', extensions, overrides: [], provenance: original,
});
export const courseOccurrences = [
  occurrence('micrograd-derivative', 'zero-to-hero', 'micrograd', 'local-derivative'),
  occurrence('micrograd-graph', 'zero-to-hero', 'micrograd', 'computational-graph'),
  occurrence('micrograd-autodiff', 'zero-to-hero', 'micrograd', 'autodiff-gradient-accumulation'),
  occurrence('optimization-derivative', 'learn-optimization-path', 'optimization-basics', 'local-derivative'),
  occurrence('optimization-autodiff', 'learn-optimization-path', 'optimization-basics', 'autodiff-gradient-accumulation', ['optimization-perspective@1.0.0']),
];

/** Edges express knowledge dependency, never lecture sequence or enrollment gates. */
export const knowledgeDependencies = [
  { from: 'local-derivative', to: 'computational-graph', kind: 'recommended', reason: '把局部变化率沿复合计算传播时，需要知道每一步导数的含义。', provenance: original },
  { from: 'computational-graph', to: 'autodiff-gradient-accumulation', kind: 'required', reason: '要识别同一变量的多条贡献路径，需分清计算节点、输入边与反向传播次序。', provenance: original },
];

export const legacyEntries = [
  { id: 'micrograd', kind: 'chapter', parentCourseId: 'zero-to-hero', chapterId: 'micrograd', occurrenceId: 'micrograd-autodiff' },
  ...handbookCourses.map(unit => ({ id: unit.id, kind: 'chapter', parentCourseId: 'competitive-programmers-handbook', chapterId: unit.id })),
  ...sourceCourses.map(course => ({ id: course.legacyIds[0], kind: 'selected-unit', parentCourseId: course.id })),
  { id: 'agent', kind: 'assignment-bridge', parentCourseId: null, sourceCourseTitle: 'Stanford CS329Z', sourceScope: 'HW1 §4.1–4.2' },
  { id: 'kl', kind: 'paper-bridge', parentCourseId: null },
  { id: 'backtesting', kind: 'planned-unit', parentCourseId: null },
];

// A presentation projection, not another hierarchy or duplicated content store.
// A module groups chapters; its lessons reference the same chapter objects.
for (const course of [...fullCourses, ...learningPaths]) {
  course.outcomes = course.id === 'zero-to-hero'
    ? ['从标量操作构建反向传播', '训练和诊断字符级语言模型', '实现 Transformer 与分词器']
    : course.id === 'competitive-programmers-handbook'
      ? ['按数据规模选用算法', '解释实现的不变量与边界', '在原站独立实现并检验解法']
      : course.id === 'learn-optimization-path'
        ? ['解释共享参数的梯度为什么相加', '区分求导正确与某一步损失下降'] : ['沿完整原课学习并完成原课练习'];
  course.skills = [...course.outcomes];
  course.prerequisites = course.id === 'zero-to-hero'
    ? ['熟练 Python 编程', '入门数学：导数、概率分布；已有经验可以替代选读']
    : course.id === 'competitive-programmers-handbook' ? ['能用一种语言编写和运行程序']
      : course.id === 'learn-optimization-path' ? ['能够代入简单代数表达式'] : ['请在原课目录核对准备要求；站内选读始终可直接打开'];
  course.modules = course.id === 'competitive-programmers-handbook'
    ? [1, 2, 3].map(part => ({ id: 'part-' + part, title: ['基础算法', '图算法', '进阶专题'][part - 1], lessons: course.chapters.filter(ch => ch.part === part) }))
    : course.chapters.length ? [{ id: 'published-syllabus', title: course.kind === 'curated-path' ? '选编学习路径' : '公开课程大纲', lessons: course.chapters }] : [];
}

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
[fullCourses, learningPaths, courseOccurrences, knowledgeDependencies, legacyEntries, knowledgeDefinitions, activities, occurrenceExtensions, contentSources].forEach(freeze);
const copy = value => structuredClone(value);
const allCourses = [...fullCourses, ...learningPaths];
const byCourse = new Map(allCourses.map(item => [item.id, item]));
const byKnowledge = new Map(knowledgeDefinitions.map(item => [item.id, item]));

export function getLegacyEntry(id) { return legacyEntries.find(item => item.id === id) || null; }
export function getCourse(id) { return byCourse.get(id) || byCourse.get(getLegacyEntry(id)?.parentCourseId) || null; }
export function listCourses({ subjectId, includePaths = true, query = '' } = {}) {
  const words = String(query).normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
  return (includePaths ? allCourses : fullCourses).filter(course => (!subjectId || course.subjectIds.includes(subjectId)) && words.every(word =>
    [course.id, course.title, course.subtitle, course.description, course.author, ...course.legacyIds, ...course.chapters.map(ch => ch.title)].join(' ').toLowerCase().includes(word)));
}
export function listKnowledge() { return knowledgeDefinitions.map(definition => getKnowledge(definition.id)); }
export function getKnowledge(id, { version } = {}) {
  const definition = byKnowledge.get(id) || knowledgeDefinitions.find(item => item.aliases.includes(id));
  if (!definition) return null;
  const pin = version || definition.currentVersion;
  const edition = definition.versions.find(item => item.version === pin);
  if (!edition) throw new RangeError(`Unknown version ${definition.id}@${pin}; pins never silently upgrade.`);
  return freeze({ id: definition.id, title: definition.title, subjectIds: definition.subjectIds, currentVersion: definition.currentVersion, ...edition,
    provenance: original, sources: edition.sourceIds.map(sourceId => contentSources[sourceId]) });
}
export function getActivity(id) { return activities.find(item => item.id === id) || allCourses.flatMap(course => [...course.activities, ...course.chapters.flatMap(ch => ch.activities)]).find(item => item.id === id) || null; }

/** Only examples, optional hints and activities may be replaced, with an explanation. */
const overridableTypes = new Set(['worked-example', 'hint', 'activity']);
export function composeKnowledge(knowledge, { extensions = [], overrides = [] } = {}) {
  if (!knowledge) throw new TypeError('A pinned knowledge edition is required.');
  const blocks = copy(knowledge.blocks);
  const changes = [];
  const replacements = [...overrides];
  for (const reference of extensions) {
    const extension = occurrenceExtensions[reference];
    if (!extension) throw new RangeError(`Unknown pinned extension: ${reference}`);
    for (const addition of extension.appendBlocks) {
      if (blocks.some(item => item.id === addition.id)) throw new Error(`Duplicate block: ${addition.id}`);
      blocks.push({ ...copy(addition), origin: { kind: 'extension', id: extension.id, version: extension.version } });
    }
    replacements.push(...extension.overrides);
    changes.push({ kind: 'extension', id: extension.id, version: extension.version, provenance: extension.provenance });
  }
  const replaced = new Set();
  for (const replacement of replacements) {
    if (replaced.has(replacement.blockId)) throw new Error(`Block overridden twice: ${replacement.blockId}`);
    const index = blocks.findIndex(item => item.id === replacement.blockId);
    if (index < 0 || !overridableTypes.has(blocks[index].type)) throw new Error(`Protected or unknown block: ${replacement.blockId}`);
    const next = replacement.block;
    if (!next || next.id !== replacement.blockId || next.type !== blocks[index].type || !replacement.reason?.trim() || !replacement.provenance?.author || !replacement.provenance?.license || !next.title || !next.body) throw new Error('Overrides retain block identity/type and require content, reason, author and license.');
    if (next.type === 'activity' && !getActivity(next.activityId)) throw new Error('Override references an unknown activity.');
    blocks[index] = { ...copy(next), provenance: copy(replacement.provenance), origin: { kind: 'override', reason: replacement.reason } };
    replaced.add(replacement.blockId);
    changes.push({ kind: 'override', blockId: replacement.blockId, reason: replacement.reason, provenance: replacement.provenance });
  }
  return freeze({ ...knowledge, blocks, changes });
}

export function resolveOccurrence(courseId, occurrenceId) {
  const course = getCourse(courseId);
  if (!course) return null;
  const entry = courseOccurrences.find(item => item.courseId === course.id && item.id === occurrenceId);
  if (!entry) return null;
  const knowledge = getKnowledge(entry.knowledgeId, { version: entry.version });
  const resolved = composeKnowledge(knowledge, entry);
  const chapter = course.chapters.find(item => item.id === entry.chapterId);
  return freeze({ course, chapter, occurrence: entry, knowledge, blocks: resolved.blocks, changes: resolved.changes,
    variant: entry.extensions.length || entry.overrides.length ? 'extended' : 'default',
    activities: resolved.blocks.filter(item => item.type === 'activity').map(item => getActivity(item.activityId)),
    sources: knowledge.sources, provenance: { default: knowledge.provenance, occurrence: entry.provenance, changes: resolved.changes },
    context: getRouteContext({ courseId: course.id, occurrenceId: entry.id, knowledgeId: knowledge.id }),
  });
}

export function knowledgeHref(knowledgeId, { courseId, occurrenceId } = {}) {
  const base = '#/knowledge/' + encodeURIComponent(knowledgeId);
  if (!courseId || !occurrenceId) return base;
  return base + '?course=' + encodeURIComponent(courseId) + '&occurrence=' + encodeURIComponent(occurrenceId);
}
export function getRouteContext({ courseId, occurrenceId, knowledgeId } = {}) {
  const course = getCourse(courseId);
  const entry = courseOccurrences.find(item => item.courseId === course?.id && item.id === occurrenceId && (!knowledgeId || item.knowledgeId === getKnowledge(knowledgeId)?.id));
  const knowledge = getKnowledge(knowledgeId || entry?.knowledgeId, entry ? { version: entry.version } : {});
  const standalone = { course: null, chapter: null, occurrence: null, knowledge, canonicalHref: knowledge ? knowledgeHref(knowledge.id) : null, returnHref: '#/courses', previous: null, next: null };
  if (!entry) return standalone;
  const index = course.occurrenceSequence.indexOf(entry.id);
  const neighbor = offset => {
    const id = course.occurrenceSequence[index + offset];
    const item = courseOccurrences.find(node => node.courseId === course.id && node.id === id);
    return item ? { ...item, title: getKnowledge(item.knowledgeId).title, href: knowledgeHref(item.knowledgeId, { courseId: course.id, occurrenceId: item.id }) } : null;
  };
  return { course, chapter: course.chapters.find(ch => ch.id === entry.chapterId), occurrence: entry, knowledge,
    canonicalHref: knowledgeHref(entry.knowledgeId, { courseId: course.id, occurrenceId: entry.id }), returnHref: '#/course/' + course.id,
    previous: index >= 0 ? neighbor(-1) : null, next: index >= 0 ? neighbor(1) : null };
}

export function listCourseActivities(courseId) {
  const course = getCourse(courseId);
  if (!course) return [];
  const entries = [...course.activities, ...course.chapters.flatMap(ch => ch.activities)];
  for (const occurrenceId of course.occurrenceSequence) {
    const resolved = resolveOccurrence(course.id, occurrenceId);
    entries.push({ ...getActivity('knowledge:' + resolved.knowledge.id), href: resolved.context.canonicalHref, courseId: course.id, chapterId: resolved.chapter.id, occurrenceId, version: resolved.occurrence.version });
    entries.push(...resolved.activities.map(activity => ({ ...activity, courseId: course.id, chapterId: resolved.chapter.id, occurrenceId, version: resolved.occurrence.version })));
  }
  return [...new Map(entries.map(item => [item.id, item])).values()];
}

/** This validator is usable by future content imports, not only the fixture tests. */
export function validateContentModel() {
  const errors = [];
  const unique = (items, label) => { if (new Set(items.map(item => item.id)).size !== items.length) errors.push(`Duplicate ${label} identity`); };
  unique(allCourses, 'course'); unique(knowledgeDefinitions, 'knowledge'); unique(courseOccurrences, 'occurrence'); unique(activities, 'activity');
  for (const course of allCourses) {
    unique(course.chapters, `chapter in ${course.id}`);
    if (new Set(course.sequence).size !== course.sequence.length || course.sequence.length !== course.chapters.length || course.sequence.some(id => !course.chapters.some(ch => ch.id === id))) errors.push(`Invalid chapter sequence in ${course.id}`);
    for (const id of course.occurrenceSequence) if (!courseOccurrences.some(item => item.id === id && item.courseId === course.id)) errors.push(`Unknown occurrence ${id}`);
  }
  for (const item of courseOccurrences) {
    try {
      const resolved = resolveOccurrence(item.courseId, item.id);
      if (!resolved?.chapter || !resolved.chapter.occurrenceIds.includes(item.id) || !resolved.course.occurrenceSequence.includes(item.id)) errors.push(`Orphan occurrence ${item.id}`);
      if (!resolved || resolved.activities.some(activity => !activity)) errors.push(`Unknown activity in ${item.id}`);
    } catch (error) { errors.push(error.message); }
  }
  for (const item of knowledgeDefinitions) for (const edition of item.versions) {
    unique(edition.blocks, `block in ${item.id}@${edition.version}`);
    for (const type of ['explanation', 'worked-example', 'hint', 'activity', 'sources']) if (!edition.blocks.some(block => block.type === type)) errors.push(`Incomplete default ${item.id}: ${type}`);
    if (edition.sourceIds.some(id => !contentSources[id])) errors.push(`Unknown source in ${item.id}`);
  }
  const neighbors = new Map(knowledgeDefinitions.map(item => [item.id, []]));
  for (const edge of knowledgeDependencies) {
    if (!neighbors.has(edge.from) || !neighbors.has(edge.to) || !edge.reason.trim() || !['required', 'recommended'].includes(edge.kind) || !edge.provenance?.author) errors.push(`Invalid dependency ${edge.from} → ${edge.to}`);
    else neighbors.get(edge.from).push(edge.to);
  }
  const active = new Set(), visited = new Set();
  function visit(id) {
    if (active.has(id)) { errors.push(`Dependency cycle at ${id}`); return; }
    if (visited.has(id)) return;
    active.add(id); neighbors.get(id).forEach(visit); active.delete(id); visited.add(id);
  }
  neighbors.forEach((_, id) => visit(id));
  return { valid: errors.length === 0, errors };
}
