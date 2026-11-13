import { COURSE_LINKS } from './logic.mjs';
import { getLegacyEntry } from './content-model.mjs';
export { fullCourses, learningPaths, listCourses, getCourse, getKnowledge, resolveOccurrence, getRouteContext, getLegacyEntry } from './content-model.mjs';
import { handbookCourses, handbookEdges, handbookBlocks } from './handbook-catalog.mjs';

export const subjects = [
  { id: 'math', title: '数学', description: '从变化率、线性关系与概率出发，推导能够检验的结论。' },
  { id: 'computing', title: '计算机科学', description: '理解程序如何表示问题，以及怎样检验程序的行为。' },
  { id: 'ai', title: '人工智能', description: '沿模型训练或 Agent 工程深入，连接数学、实验与代码。' },
  { id: 'finance', title: '金融', description: '研究收益、风险与资产之间的关系。' },
  { id: 'physics', title: '物理学', description: '从力学与电磁学出发，连接数学模型和可观测现象。' },
  { id: 'engineering', title: '工程学', description: '研究约束下的系统设计、测量与验证。' },
];

const ocw = 'https://ocw.mit.edu/courses/';
const python = ocw + '6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/';
const calculus = ocw + '18-01sc-single-variable-calculus-fall-2010/';
const differentiation = calculus + 'pages/1.-differentiation/part-a-definition-and-basic-rules/';
const linear = ocw + '18-06-linear-algebra-spring-2010/';
const probability = ocw + 'res-6-012-introduction-to-probability-spring-2018/';
const software = 'https://web.mit.edu/6.102/www/sp24/';
const finance = ocw + '15-401-finance-theory-i-fall-2008/';
const distillation = 'https://arxiv.org/abs/1503.02531';

function lesson(id, title, description, href) {
  const status = href.startsWith('#/') ? 'available' : 'external';
  return { id, title, description, href, status };
}

function requires(from, to, reason) {
  return { from, to, kind: 'required', reason };
}

function recommends(from, to, reason) {
  return { from, to, kind: 'recommended', reason };
}

// Legacy map entries retain their IDs and coordinates. These include chapters,
// selected units and activity collections. New course navigation uses fullCourses
// from content-model.mjs; membership is never a knowledge-dependency edge.
const existingCourses = [
  {
    id: 'agent', title: 'Agent 工程入门', subjectIds: ['ai', 'computing'], status: 'available',
    description: '从一条模型回复追到最终摘要，写出可以验证的处理规则。配套 Stanford CS329Z 作业的前两个问题。',
    keywords: '智能体 代理 agent harness llm 大语言模型 软件工程',
    source: { label: 'Stanford CS329Z · HW1', url: COURSE_LINKS.cs329zAssignment },
    lessons: [
      lesson('boundary', '一次请求的边界', '画出请求经过的组件，定位模型返回文本的位置。', '#/atlas/node/F01'),
      lesson('contract', '从回复到程序状态', '在导学中区分原始回复、解析状态和下游决定。', '#/learn/agent'),
      lesson('experiment', '比较两份处理规则', '固定相同邮件，只改未分类回复的去向，检查两份轨迹。', '#/lab/agent'),
      lesson('assignment', '实现分类与摘要', '回到固定版本的原作业，在 §4.1–4.2 实现 priority 和 daily_digest。', COURSE_LINKS.cs329zAssignment),
    ],
    lessonEdges: [
      recommends('boundary', 'contract', '先认出模型与程序的交界，会更容易定位谁负责解释回复。'),
      requires('contract', 'experiment', '要解释两份轨迹的差别，需区分解析结果与处理规则。'),
      requires('contract', 'assignment', '实现两个函数，需要分别读懂返回值与下游输入的合同。'),
      recommends('experiment', 'assignment', '用未分类回复试过两种去向后，更容易为自己的实现挑出测试用例。'),
    ],
  },
  {
    id: 'micrograd', title: '自动微分与反向传播', subjectIds: ['ai', 'computing', 'math'], status: 'available',
    description: '跟随 Karpathy 的 micrograd，从共享输入的一次乘法走到自己的标量求导器。',
    keywords: 'micrograd 深度学习 计算图 neural networks backprop autodiff 梯度 自动求导 机器学习',
    source: { label: 'Karpathy · Zero to Hero', url: 'https://karpathy.ai/zero-to-hero.html' },
    lessons: [
      lesson('hand', '手算局部变化率', '原课第一讲 32:10 起，用手算跟踪一个标量计算。', 'https://www.youtube.com/watch?v=VMj-3S1tku0&t=1930s'),
      lesson('measure', '共享输入的扰动实验', '比较 x × x 和 x × c，观察同一个输入出现两次时的变化。', '#/learn/micrograd'),
      lesson('build', '实现标量求导器', '下载 Python 起步文件，实现 grad 并构造一个有共享输入的反例。', '#/learn/micrograd?section=mg-build-title'),
    ],
    lessonEdges: [
      recommends('hand', 'build', '手算导数可以为求导器提供一个独立的检查值。'),
      recommends('measure', 'build', '两条路径读到同一个输入的例子，可以揭露梯度覆盖错误。'),
    ],
  },
  {
    id: 'kl', title: '知识蒸馏与 KL 散度', subjectIds: ['ai', 'math'], status: 'available',
    description: '比较硬标签与教师分布给出的训练信号，追踪同一个 logit 的更新方向。',
    keywords: 'distillation knowledge kl softmax 机器学习 llm 大模型 概率 梯度 后训练',
    source: { label: 'Hinton 等 · 知识蒸馏', url: distillation },
    lessons: [
      lesson('targets', '两种训练目标', '从同一张猫的照片出发，分清硬标签和教师分布给出的目标。', '#/learn/kl'),
      lesson('gradient', '比较损失与梯度', '改变学生分布，检查两种目标要求猫的概率如何变化。', '#/lab/kl'),
      lesson('paper', '读蒸馏原论文', '阅读第二节，找出温度如何改变软目标，以及原文如何组合两种损失。', distillation),
    ],
    lessonEdges: [
      requires('targets', 'gradient', '解释两个更新方向，需先知道每个损失中的目标分布。'),
      recommends('targets', 'paper', '先分清两种目标，再读原文对二者加权的讨论。'),
    ],
  },
  {
    id: 'python', title: 'Python 程序设计', subjectIds: ['computing'], status: 'external',
    description: 'MIT 6.0001 选读。把一条处理规则写成条件分支，再封装成函数。',
    keywords: 'programming coding 编程 程序语言 入门 基础',
    source: { label: 'MIT · 6.0001', url: python },
    lessons: [
      lesson('branches', '条件与循环', '原课第 2 讲，跟踪条件判断怎样改变程序执行路径。', python + 'resources/lecture-2-branching-and-iteration/'),
      lesson('functions', '函数与分解', '原课第 4 讲，为一段行为界定输入和返回值。', python + 'resources/lecture-4-decomposition-abstraction-and-functions/'),
    ],
    lessonEdges: [recommends('branches', 'functions', '已有的一段分支程序可以直接拿来练习函数分解。')],
  },
  {
    id: 'calculus', title: '单变量微积分', subjectIds: ['math'], status: 'external',
    description: 'MIT 18.01SC 选读。从切线斜率理解导数，再分别研究乘积和复合函数。',
    keywords: 'calculus differentiation 导数 求导 高数 微分',
    source: { label: 'MIT · 18.01SC', url: calculus },
    lessons: [
      lesson('derivative', '导数的含义', '第 1 节，从切线的斜率解释瞬时变化率。', differentiation + 'session-1-introduction-to-derivatives/'),
      lesson('product', '乘积法则', '第 9 节，研究两个同时变化的因子。', differentiation + 'session-9-product-rule/'),
      lesson('chain', '链式法则', '第 11 节，追踪经过函数复合传播的变化。', differentiation + 'session-11-chain-rule/'),
    ],
    lessonEdges: [
      requires('derivative', 'product', '两个因子的变化率都用到导数。'),
      requires('derivative', 'chain', '解释复合函数的导数需要理解局部变化率。'),
    ],
  },
  {
    id: 'linear-algebra', title: '线性代数', subjectIds: ['math'], status: 'external',
    description: 'MIT 18.06 选读。从线性方程的几何图像进入矩阵乘法。',
    keywords: 'linear algebra 向量 矩阵 线代',
    source: { label: 'MIT · 18.06', url: linear },
    lessons: [
      lesson('equations', '线性方程的几何', '原课第 1 讲，用行与列两种视角理解同一个方程组。', linear + 'resources/lecture-1-the-geometry-of-linear-equations/'),
      lesson('multiplication', '矩阵的乘法', '原课第 3 讲，把矩阵乘法与线性方程组联系起来。', linear + 'resources/lecture-3-multiplication-and-inverse-matrices/'),
    ],
    lessonEdges: [recommends('equations', 'multiplication', '列组合的图像提供一种理解矩阵乘法的途径。')],
  },
  {
    id: 'probability', title: '概率论', subjectIds: ['math'], status: 'external',
    description: 'MIT 概率课选读。用概率分布描述不确定性，计算期望和方差。',
    keywords: 'probability expectation variance 概统 概率分布 随机变量 基础',
    source: { label: 'MIT · RES.6-012', url: probability },
    lessons: [
      lesson('distribution', '离散概率分布', '原课 5.3 节，为离散随机变量的各个取值分配概率。', probability + 'resources/probability-mass-functions/'),
      lesson('mean', '期望', '原课 5.8 节，按各取值的概率计算加权平均。', probability + 'resources/expectation/'),
      lesson('variance', '方差', '原课 6.2 节，衡量随机变量相对于均值的波动。', probability + 'resources/variance/'),
    ],
    lessonEdges: [requires('distribution', 'mean', '期望用分布中的概率给各个取值加权。'), requires('mean', 'variance', '方差是相对均值的平方偏差的期望。')],
  },
  {
    id: 'contracts', title: '软件规格与测试', subjectIds: ['computing'], status: 'external',
    description: 'MIT 6.102 选读。为软件写出输入输出约定，设计能够区分行为的用例。',
    keywords: '软件工程 software testing debugging specification 合同 接口 行为测试',
    source: { label: 'MIT · 6.102', url: software },
    lessons: [
      lesson('specs', '写出行为规格', '阅读 04，给调用者和实现方各自的责任划出边界。', software + 'classes/04-specifications/'),
      lesson('tests', '设计测试用例', '阅读 02，从输入空间的分区中选择不同的用例。', software + 'classes/02-testing/'),
    ],
    lessonEdges: [recommends('specs', 'tests', '已经写清的输入约定有助于寻找会产生不同行为的分区。')],
  },
  {
    id: 'portfolio', title: '投资组合与风险', subjectIds: ['finance'], status: 'external',
    description: 'MIT 15.401 选读。比较单项资产与投资组合的收益、波动和相关性。',
    keywords: 'portfolio risk finance investment quant 量化 金融 风险管理 协方差',
    source: { label: 'MIT Sloan · 15.401', url: finance },
    lessons: [
      lesson('risk', '收益与风险', '进入原课 Risk and Return，分别计算收益的均值与波动。', finance + 'pages/video-lectures-and-slides/risk-and-return/'),
      lesson('basket', '组合中的相关性', '进入 Portfolio Theory，考察权重与相关性怎样改变整体风险。', finance + 'pages/video-lectures-and-slides/portfolio-theory/'),
    ],
    lessonEdges: [requires('risk', 'basket', '计算组合风险，需要掌握均值、方差和相关性的含义。')],
  },
  {
    id: 'backtesting', title: '投资策略回测', subjectIds: ['finance', 'computing'], status: 'planned',
    description: '计划用历史数据检验一条策略，区分当时可用的信息与事后可见的数据。',
    keywords: 'quant quantitative finance 量化 backtest backtesting 数据 回测',
    source: null, lessons: [], lessonEdges: [],
  },
];

// Compatibility export: 40 historic graph nodes, not a count of full courses.
export const courses = [...existingCourses, ...handbookCourses].map(unit => ({ ...unit, ...getLegacyEntry(unit.id) }));
export const legacyUnits = courses;

// A single authored relationship is shared by every block where both ends appear.
// Reasons name the particular task and prerequisite knowledge; no edge gates access.
export const courseEdges = [
  ...handbookEdges,
  recommends('linear-algebra', 'cph-23', '矩阵快速幂把多步转移合并为乘法；熟悉矩阵乘法后，可以直接关注转移矩阵的构造。'),
  recommends('probability', 'cph-24', '离散分布和期望为分析随机算法的平均开销提供了计算工具。'),
  recommends('cph-16', 'micrograd', '实现反向传播时需要先处理后继再累加前驱的梯度；已掌握有向无环图的拓扑序会更容易设计这个遍历。'),
  recommends('python', 'contracts', '能读懂带参数和返回值的函数，更容易跟上软件规格示例。原课示例使用 TypeScript。'),
  requires('python', 'agent', '实现 Stanford 原作业需要会编写 Python 函数和分支。站内对照实验可以直接运行。'),
  recommends('contracts', 'agent', '理解程序的输入输出约定，便于解释一次模型回复该如何传给下一步。'),
  requires('python', 'micrograd', '独立实现求导器用到 Python 函数和对象，数值实验可以直接体验。'),
  recommends('calculus', 'micrograd', '乘积法则与链式法则可以用来核对反向传播得到的导数。'),
  requires('probability', 'kl', '比较教师分布和学生分布，需要知道各类别的概率怎样分配。'),
  recommends('micrograd', 'kl', '理解梯度如何从损失传回参数，有助于解释蒸馏实验的更新方向。'),
  recommends('calculus', 'probability', '继续读原课的连续型分布时，计算区间概率会用到积分。这里选读的离散分布可直接开始。'),
  requires('probability', 'portfolio', '计算组合风险会用到期望、方差与协方差。'),
  recommends('linear-algebra', 'portfolio', '资产数增多后，向量和矩阵使权重与协方差的计算更清楚。'),
  requires('python', 'backtesting', '规划中的编程练习需要按时间顺序处理历史数据。'),
  recommends('portfolio', 'backtesting', '理解收益与风险，才能选出适合评价策略的指标。'),
];

function block(id, title, description, subjectIds, courseIds) {
  const edges = courseEdges.filter(({ from, to }) => courseIds.includes(from) && courseIds.includes(to));
  return { id, title, description, subjectIds, courseIds, edges };
}

export const blocks = [
  ...handbookBlocks.map(b => block(b.id,b.title,b.description,b.subjectIds,b.courseIds)),
  block('foundations', '通用基础', '按目标选用大学基础课。从程序、微积分、线性代数和概率进入不同分支。',
    ['math', 'computing', 'ai', 'finance'], ['python', 'calculus', 'linear-algebra', 'probability', 'contracts', 'micrograd']),
  block('agents', 'Agent 工程', '从函数和软件规格出发，理解模型回复怎样成为可检查的程序行为。',
    ['ai', 'computing'], ['python', 'contracts', 'agent']),
  block('learning', '模型与学习', '对照两种模型训练目标，沿需要的分支补充概率、求导和程序实现。',
    ['ai', 'computing', 'math'], ['python', 'calculus', 'probability', 'micrograd', 'kl']),
  block('quant', '量化与金融', '从概率和矩阵走向投资组合，再看如何用历史数据检验策略。',
    ['finance', 'math', 'computing'], ['probability', 'linear-algebra', 'python', 'portfolio', 'backtesting']),
];

export function coursesForSubject(subjectId) {
  return courses.filter(course => course.subjectIds.includes(subjectId));
}

export function blocksForSubject(subjectId) {
  return blocks.filter(block => block.subjectIds.includes(subjectId));
}

function normalizeQuery(text) {
  return text.normalize('NFKC').trim().toLowerCase();
}

export function searchCourses(query = '', subjectId) {
  const words = normalizeQuery(query).split(/[\s,，]+/).filter(Boolean);
  // Short ASCII abbreviations (AI, KL) must not match the middle of a longer name.
  const matchers = words.map(word => /^[a-z]{1,2}$/.test(word)
    ? new RegExp('(?:^|[^a-z0-9])'+word+'(?:$|[^a-z0-9])')
    : word);
  const candidates = subjectId ? coursesForSubject(subjectId) : courses;
  return candidates.filter(course => {
    const names = subjects.filter(subject => course.subjectIds.includes(subject.id)).map(subject => subject.title);
    const text = [course.id, course.title, course.description, course.keywords, course.source?.label, ...course.subjectIds, ...names, ...course.lessons.map(node => node.title)].join(' ');
    const haystack = normalizeQuery(text);
    return matchers.every(matcher => typeof matcher === 'string' ? haystack.includes(matcher) : matcher.test(haystack));
  });
}
