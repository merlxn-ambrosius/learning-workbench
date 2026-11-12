import { COURSE_LINKS } from './logic.mjs';

// Every public lesson has one catalogue entry. Historic Guide/Lab URLs still
// open the corresponding activity, including when a v1 journal is restored.
const units = [
  {
    key: 'agent', source: 'Stanford CS329Z · HW1', title: '一句 maybe，该怎么进入摘要？',
    description: '把同一批邮件交给两份处理规则，追踪判断在哪一步发生改变。',
    guide: 'learn/agent', lab: 'lab/agent', reference: COURSE_LINKS.cs329zAssignment, referenceName: '原作业 §4.1–4.2',
    kind: 'Agent 工程', example: '<code>“maybe”</code><span>↓</span><small>解析器</small>',
  },
  {
    key: 'micrograd', source: 'Karpathy · Zero to Hero', title: '两个相等的数，是同一个输入吗？',
    description: '改变一个输入，比较两段乘法程序，再把你的解释写成 Python 求导器。',
    guide: 'learn/micrograd', lab: 'learn/micrograd', reference: 'https://www.youtube.com/watch?v=VMj-3S1tku0&t=4948s', referenceName: '原课片段',
    kind: '自动微分', example: '<code>x × x</code><span>↕</span><code>x × c</code>',
  },
  {
    key: 'kl', source: 'Hinton 等 · 知识蒸馏', title: '都猜对了猫，学生还要怎么改？',
    description: '固定学生输出，对照正确标签与教师分布，检验两种目标给出的更新方向。',
    guide: 'learn/kl', lab: 'lab/kl', reference: 'https://arxiv.org/abs/1503.02531', referenceName: '蒸馏原论文',
    kind: '概率与梯度', example: '<small>教师</small><code>80%</code><small>学生</small><code>95%</code>',
  },
];

const destinations = [
  ['home', '学习工作台'], ['atlas', '知识航图'], ['journal', '学习记录'], ['sync', '协作与备份'],
];
const catalogueUrls = new Set(['home', 'learn', 'lab']);
const unitAt = path => units.find(unit => unit.lab === path || unit.guide === path);

export function isLearningUnit(path) {
  return Boolean(unitAt(path));
}

export function routeTitle(path, atlas) {
  const unit = unitAt(path);
  if (unit) return unit.title;
  if (catalogueUrls.has(path)) return '学习工作台';
  if (path.startsWith('atlas/node/')) {
    return atlas?.nodes?.find(node => path === 'atlas/node/' + node.id)?.title || '知识节点';
  }
  return destinations.find(([key]) => key === path)?.[1] || '未找到页面';
}

export function renderWorkspaceShell(path, body) {
  const area = isLearningUnit(path) || catalogueUrls.has(path) ? 'home' : path.split('/')[0];
  const nav = destinations.map(([key, title]) => {
    const current = area === key ? ' aria-current="' + (key === path ? 'page' : 'location') + '"' : '';
    return `<a href="#/${key}"${current}>${title}</a>`;
  }).join('');
  return `<header class="mast"><div class="mast-inner">
      <a class="wordmark" href="#/home" aria-label="LEARN 首页">LEARN<span>Workbench</span></a>
      <nav aria-label="学习工作台导航">${nav}</nav>
    </div></header><main class="content" id="page-content" tabindex="-1">${body}</main>`;
}

export function workbenchIndex(path, lastRoute, atlas, escapeHtml) {
  const last = String(lastRoute ?? '').replace(/^#\//, '');
  const lastUnit = unitAt(last);
  const nodeId = /^atlas\/node\/([A-Z][0-9]{2})$/.exec(last)?.[1];
  const lastNode = atlas ? atlas.nodes.find(node => node.id === nodeId) :
    nodeId && { title: '知识节点 ' + nodeId };
  const resume = lastUnit || lastNode
    ? `<a class="resume-link" href="#/${escapeHtml(last)}"><span>继续上次打开的${lastNode ? '节点' : '单元'}</span><strong>${escapeHtml((lastUnit || lastNode).title)} →</strong></a>`
    : '';
  const rows = units.map(unit => {
    const enter = path === 'lab' ? unit.lab : unit.guide;
    const alternative = unit.guide !== unit.lab && enter !== unit.lab
      ? `<a href="#/${unit.lab}">直接做实验</a>` : '';
    return `<article class="study-row">
        <div aria-hidden="true" class="study-sample sample-${unit.key}">${unit.example}</div>
        <div class="study-copy">
          <p class="study-source">${unit.kind}<span> / </span>${unit.source}</p>
          <h2><a href="#/${enter}">${unit.title}</a></h2><p>${unit.description}</p>
          <div class="study-links"><a class="study-enter" href="#/${enter}">${enter === unit.lab ? '打开实验' : '从问题开始'} →</a>${alternative}
          <a href="${unit.reference}" target="_blank" rel="noopener noreferrer">${unit.referenceName} ↗</a></div>
        </div></article>`;
  }).join('');
  return `<section aria-labelledby="workbench-title" class="desk"><header class="desk-head">
      <div><p class="desk-label">学习工作台</p><h1 id="workbench-title">今天想弄懂哪个问题？</h1>
      <p>选一个问题亲手试一试，也可以直接回到原作业。</p></div>${resume}
    </header><div class="study-list">${rows}</div></section>`;
}

export function missingPage() {
  return '<h1 class="page-title">找不到这个页面</h1><p class="lead">这个学习链接可能已经过期。</p><a class="btn btn-primary" href="#/home">返回学习工作台</a>';
}
