/** Original LEARN teaching content. Source materials are linked, never copied. */
export const contentSources = {
  'karpathy-zero-to-hero': {
    id: 'karpathy-zero-to-hero', title: 'Neural Networks: Zero to Hero', author: 'Andrej Karpathy',
    url: 'https://karpathy.ai/zero-to-hero.html', checkedAt: '2026-11-13',
    version: 'Public syllabus observed 2026-11-13; 8 lectures, ongoing',
    license: 'External course: rights remain with the author; linked only.',
  },
  'karpathy-micrograd-lecture': {
    id: 'karpathy-micrograd-lecture', title: 'Building micrograd · Zero to Hero lecture 1', author: 'Andrej Karpathy',
    url: 'https://www.youtube.com/watch?v=VMj-3S1tku0&t=4948s', checkedAt: '2026-11-13',
    version: 'Video VMj-3S1tku0 · shared-variable backpropagation',
    license: 'External video: rights remain with the author; linked only.',
  },
  'learn-original': {
    id: 'learn-original', title: 'LEARN 原创解释、例子与活动', author: 'LEARN',
    url: 'https://github.com/merlxn-ambrosius/learning-workbench', version: '1.0.0',
    license: 'MIT',
  },
};

const authored = { author: 'LEARN', license: 'MIT', sourceIds: ['learn-original'] };
const block = (id, type, title, body, extra = {}) => ({ id, type, title, body, ...extra, provenance: { ...authored, ...(extra.provenance || {}) } });
const sourceBlock = () => block('sources', 'sources', '继续读原材料', '本页解释和数值例子由 LEARN 独立编写。原课第一讲讨论标量求导器；回到讲解和代码核对自己的实现。', { sourceIds: ['karpathy-micrograd-lecture', 'learn-original'] });

/** Identity is independent of course position and teaching edition. */
export const knowledgeDefinitions = [
  {
    id: 'local-derivative', title: '局部变化率', subjectIds: ['math', 'ai'], currentVersion: '1.0.0', aliases: [],
    versions: [{ version: '1.0.0', summary: '用可测量的输出变化解释某一点的导数。', sourceIds: ['learn-original', 'karpathy-micrograd-lecture'], blocks: [
      block('explanation', 'explanation', '只看这一次小变化', '导数描述输入在当前点变化一点时，输出变化多少。对 f(x)=x²，比较 f(x+h) 和 f(x)：差商是 2x+h；h 趋近零时，局部变化率是 2x。数值差商是近似检查，不是对所有输入的证明。'),
      block('worked-example', 'worked-example', '在 x=3 附近测一次', 'h=0.01 时，(3.01²−3²)/0.01=6.01。缩小 h 会接近 6；不是因为函数的值是 9，而是因为此处每单位输入引起约 6 单位输出变化。', { steps: ['f(3)=9，f(3.01)=9.0601。', '输出增加 0.0601，输入增加 0.01。', '比值 6.01 近似导数 6。'] }),
      block('hint', 'hint', '可选提示', '先分别写出两个函数值，再相减。不要用 f(x)/x 代替变化量的比值。'),
      block('activity', 'activity', '自己换一个起点', '令 x=−2、h=0.01，手算差商并解释它的负号。然后用原实验改变起点核对。', { activityId: 'derivative-check' }),
      sourceBlock(),
    ] }],
  },
  {
    id: 'computational-graph', title: '计算图与反向次序', subjectIds: ['computing', 'ai'], currentVersion: '1.0.0', aliases: [],
    versions: [{ version: '1.0.0', summary: '把计算拆成局部操作，沿依赖的逆序传播变化率。', sourceIds: ['learn-original', 'karpathy-micrograd-lecture'], blocks: [
      block('explanation', 'explanation', '一个节点是一项中间结果', '对 y=(a+b)×c，先计算 s=a+b，再计算 y=s×c。反向计算从 dy/dy=1 开始，先得到 s 和 c 对输出的影响，再把 s 的影响传给 a 和 b。这里的依赖决定计算次序，课程的讲授顺序是另一件事。'),
      block('worked-example', 'worked-example', '沿两层图回传', '取 a=2、b=3、c=4，则 s=5、y=20。局部导数 dy/ds=4、dy/dc=5；因为 ds/da=ds/db=1，最终 dy/da=dy/db=4。', { steps: ['前向：s=5，y=20。', '反向：s.grad=4，c.grad=5。', '把 s.grad 乘以加法的局部导数 1，得到 a.grad=b.grad=4。'] }),
      block('hint', 'hint', '可选提示', '先标出每个操作的输入和输出。要传播一个节点的梯度，必须先知道所有下游分支对它的贡献。'),
      block('activity', 'activity', '画出依赖，再倒过来走', '画出 y=(a+b)×c 的图；将 c 改为 −1，独立预测三个输入的梯度。', { activityId: 'graph-trace' }),
      sourceBlock(),
    ] }],
  },
  {
    id: 'autodiff-gradient-accumulation', title: '共享输入的梯度累加', subjectIds: ['ai', 'computing', 'math'], currentVersion: '1.0.0', aliases: ['shared-input-gradient'],
    versions: [{ version: '1.0.0', summary: '同一个变量沿多条路径影响输出时，把每条路径的梯度贡献相加。', sourceIds: ['learn-original', 'karpathy-micrograd-lecture'], blocks: [
      block('explanation', 'explanation', '相同数值与同一个变量', 'y=x×x 的两个输入引用同一个变量。改变 x 时两个因子一起改变；y=x×c 中 c 虽然也可能等于 x 的当前值，却保持固定。反向传播要沿每条输入路径计算贡献，再用 += 累加到同一个变量。直接赋值会把先前路径的贡献覆盖。'),
      block('worked-example', 'worked-example', '同样从 3×3 开始', '共享输入 x=3 时，y=x²=9。两条乘法输入路径各贡献 3，总导数为 6。固定 c=3 时，y=x×c 同样是 9，但只有 x 的一条路径在变化，导数为 3。相同前向值不代表相同导数。', { steps: ['共享：y(3.01)−y(3)=0.0601，差商为 6.01。', '固定：y(3.01,3)−y(3,3)=0.03，差商为 3。', '乘法反向：left.grad += right.value × out.grad；right.grad += left.value × out.grad。两端是同一对象时，两次加法都必须发生。'] }),
      block('hint', 'hint', '可选提示', '不要先合并两条边。把乘法的左右输入分别命名，在纸上写出两份贡献，最后再检查它们是否指向同一个变量。'),
      block('activity', 'activity', '比较两个程序', '先改变起点或扰动，比较共享输入与固定因子的差商；再写下什么会一起变化。可直接进入实验，不需要先回答。', { activityId: 'autodiff-shared-input' }),
      block('implementation', 'activity', '把规则放进求导器', '在自己的标量求导器中实现梯度累加。至少检验 x×x 和 x×x+x；每次新反向传播前明确清零梯度。公开样例通过不等于对任意图都正确。', { activityId: 'autodiff-build-engine' }),
      sourceBlock(),
    ] }],
  },
];

/** Course additions retain the same concept identity; no copied default body. */
export const occurrenceExtensions = {
  'optimization-perspective@1.0.0': {
    id: 'optimization-perspective', version: '1.0.0', title: '从梯度到一次参数更新', provenance: authored,
    appendBlocks: [
      block('optimization-example', 'worked-example', '漏掉一条路径，会怎样更新参数？', '设 L(w)=(w²−1)²，w=2 时 L=9。链式法则给出 dL/dw=2(w²−1)×2w=24。学习率 η=0.05 时，w′=0.8，新的损失为 0.1296。若共享输入的一条贡献被覆盖，错误梯度是 12，w′=1.4，损失为 0.9216。一次损失下降不能证明求导器正确；两个实现都可能下降。', { steps: ['先算残差 r=w²−1。', '损失传回残差的梯度为 2r。', '平方的两条输入路径各贡献 w×2r，必须相加。', '用 w′=w−ηg 更新后，重新计算损失。'] }),
      block('optimization-hint', 'hint', '可选提示：下降是否足够？', '比较正确梯度与只保留一条路径的梯度。再调大学习率：即使梯度正确，有限的一步也可能越过低谷。'),
      block('optimization-activity', 'activity', '比较两次实际更新', '改变初始参数和学习率，观察正确累加与覆盖一条贡献产生的参数、损失。找出一个两者都下降的例子，再解释为什么这不能验证梯度正确。', { activityId: 'optimization-shared-step' }),
    ],
    overrides: [],
  },
};

export const activities = [
  ...knowledgeDefinitions.map(item => ({ id: 'knowledge:' + item.id, title: '阅读：' + item.title, kind: 'concept-reading', href: '#/knowledge/' + item.id, knowledgeId: item.id, provenance: authored })),
  { id: 'derivative-check', title: '换一个起点检查变化率', kind: 'experiment', href: '#/learn/micrograd', knowledgeId: 'local-derivative', provenance: authored },
  { id: 'graph-trace', title: '画出依赖并手算梯度', kind: 'independent-task', href: '#/knowledge/computational-graph', knowledgeId: 'computational-graph', provenance: authored },
  { id: 'autodiff-shared-input', title: '共享输入的扰动实验', kind: 'experiment', href: '#/learn/micrograd', knowledgeId: 'autodiff-gradient-accumulation', provenance: authored },
  { id: 'autodiff-build-engine', title: '实现标量求导器', kind: 'implementation', href: '#/learn/micrograd?section=mg-build-title', knowledgeId: 'autodiff-gradient-accumulation', provenance: authored },
  { id: 'optimization-shared-step', title: '比较梯度累加与覆盖的一步更新', kind: 'interactive', href: '#/knowledge/autodiff-gradient-accumulation?course=learn-optimization-path&occurrence=optimization-autodiff', knowledgeId: 'autodiff-gradient-accumulation',
    controls: [{ id: 'weight', label: '初始参数 w', min: -3, max: 3, step: 0.1, default: 2 }, { id: 'learningRate', label: '学习率 η', min: 0, max: 0.2, step: 0.005, default: 0.05 }], provenance: authored },
];

/** Both cases execute the stated expression; this is not a recorded animation. */
export function evaluateOptimization({ weight = 2, learningRate = 0.05 } = {}) {
  const w = Number(weight), eta = Number(learningRate);
  if (!Number.isFinite(w) || !Number.isFinite(eta) || w < -3 || w > 3 || eta < 0 || eta > 0.2) {
    throw new RangeError('Use a finite weight in [-3,3] and learning rate in [0,0.2].');
  }
  const loss = value => (value * value - 1) ** 2;
  const residual = w * w - 1;
  const contribution = 2 * residual * w;
  const result = (id, gradient) => {
    const nextWeight = w - eta * gradient;
    return { id, gradient, nextWeight, lossBefore: loss(w), lossAfter: loss(nextWeight) };
  };
  return { weight: w, learningRate: eta, residual, pathContributions: [contribution, contribution],
    correct: result('accumulate', contribution * 2), overwritten: result('overwrite', contribution) };
}
