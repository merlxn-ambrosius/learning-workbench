import test from 'node:test';
import assert from 'node:assert/strict';
import { bindKnowledgeGraph, rankKnowledgeNodes, renderKnowledgeGraph } from '../site/knowledge-graphs.mjs';
import { handbookCourses } from '../site/handbook-catalog.mjs';

const nodes = [
  { id: 'apply', title: '实施', description: '亲自实现', status: 'available', href: '#/course/apply' },
  { id: 'eval', title: '评估', description: '检查', status: 'planned', href: '#/course/eval' },
  { id: 'math', title: '数学', status: 'external', href: 'https://example.edu/math' },
  { id: 'code', title: '编程', status: 'planned' },
];
const edges = [
  { from: 'math', to: 'apply', kind: 'recommended', reason: '比较两种输出。' },
  { from: 'code', to: 'apply', kind: 'required', reason: '实现两种策略。' },
  { from: 'apply', to: 'eval', kind: 'required', reason: '用试验结果做判断。' },
  { from: 'math', to: 'eval', kind: 'recommended', reason: '记下不确定性。' },
];
const graph = { id: 'demo', type: 'block', title: '示例', nodes, edges };

test('one rank per causal step preserves authored order among peers and independent roots', () => {
  assert.deepEqual(rankKnowledgeNodes(nodes, edges).map(level => level.map(n => n.id)), [['math', 'code'], ['apply'], ['eval']]);
  assert.throws(() => rankKnowledgeNodes(nodes, [...edges, {from:'eval', to:'code'}]), /Cycle/);
  assert.throws(() => rankKnowledgeNodes(nodes, [{ from:'ghost',to:'math'}]), /Unknown endpoint/);
  assert.throws(() => rankKnowledgeNodes([...nodes, nodes[0]], []), /Duplicate/);
});

test('independent branches keep their arrows adjacent even if the catalogue lists their children in reverse', () => {
  const items = ['a', 'b', 'y', 'x'].map(id => ({ id }));
  const levels = rankKnowledgeNodes(items, [{from:'a',to:'x'}, {from:'b',to:'y'}]);
  assert.deepEqual(levels.map(level => level.map(node => node.id)), [['a','b'],['x','y']]);
});

test('both graph layouts encode every directed edge, and descriptions expose its direction and reason', () => {
  const html = renderKnowledgeGraph(graph, 'apply');
  assert.equal((html.match(/class="kg-node /g) || []).length, nodes.length);
  for (const edge of edges) {
    assert.equal(html.split(`data-kg-from="${edge.from}" data-kg-to="${edge.to}"`).length - 1, 2);
  }
  const selected = html.split('data-kg-detail="apply"')[1].split('</section>')[0];
  assert.ok(!selected.split('>')[0].includes('hidden'));
  assert.ok(selected.includes('先修准备') && selected.includes('接下来可学'));
  assert.ok(selected.includes('实现两种策略。') && selected.includes('用试验结果做判断。'));
  assert.ok(selected.includes('href="#/course/apply"'));
  const planned = html.split('data-kg-detail="code"')[1].split('</section>')[0];
  assert.ok(planned.includes('规划中') && !planned.includes('class="kg-open"'));
});

test('external links and text are bounded, blank maps do not simulate data', () => {
  const single = { ...graph, nodes: [{ id: 'test', title:'<b>概念</b>', href:'javascript:alert(1)' }], edges: [] };
  const html = renderKnowledgeGraph(single);
  assert.ok(html.includes('&lt;b&gt;概念&lt;/b&gt;'));
  assert.ok(!html.includes('javascript:') && !html.includes('箭头从准备指向后续'));
  assert.match(renderKnowledgeGraph({ ...graph, nodes: [], edges: [] }), /规划中/);
});

test('six parallel sections in the dynamic programming chapter have readable, separated mobile cards', () => {
  const chapter = handbookCourses.find(course => course.id === 'cph-07');
  const html = renderKnowledgeGraph({ ...chapter, type: 'course', nodes: chapter.lessons, edges: chapter.lessonEdges });
  const minWidth = Number(html.match(/--small-min-width:([\d.]+)px/)[1]);
  assert.ok(minWidth <= 280, 'both prerequisite ranks should fit on a phone');
  const cards = new Map([...html.matchAll(/data-kg-node="([^"]+)"[^>]+--small-x:([\d.]+)%;--small-y:([\d.]+)px;--small-w:([\d.]+)%;--small-h:([\d.]+)px/g)]
    .map(([, id, x, y, w, h]) => [id, { x: Number(x), y: Number(y), w: Number(w), h: Number(h) }]));
  const peers = ['s1','s2','s3','s4','s5','s6'].map(id => cards.get(id));
  assert.equal(new Set(peers.map(card => card.x)).size, 1);
  peers.forEach((card, i) => {
    assert.ok(card.w * minWidth / 100 >= 100, 'node title has room to wrap');
    if (i) assert.ok(card.y - peers[i - 1].y >= card.h);
  });
  assert.ok(cards.get('exercise').x - peers[0].x > peers[0].w, 'subsequent rank has its own column');
});

test('a selection switches the inspector, highlights incident links and keeps the subject in its shareable URL', t => {
  let updates = 0;
  let handler;
  let url;
  const links = edges.map(edge => ({
    dataset: {kgFrom: edge.from, kgTo: edge.to},
    classList: { toggle(name, state) { this.highlighted = state; } },
  }));
  const buttons = nodes.map(node => ({
    dataset: {kgNode: node.id}, pressed: node.id === 'apply',
    getAttribute() { return String(this.pressed); },
    setAttribute(name, value) { this.pressed = value === 'true'; },
    hasAttribute() { return false; },
  }));
  const details = nodes.map(node => ({dataset: {kgDetail: node.id}, hidden: node.id !== 'apply'}));
  const container = {
    dataset: {},
    querySelectorAll(selector) {
      return { '[data-kg-node]': buttons, '[data-kg-detail]': details, '[data-kg-from]': links }[selector];
    },
    addEventListener(name, callback) { handler = callback; updates++; },
  };
  const globals = {
    window: {location: {hash: '#/block/demo?subject=math'}, history: { replaceState(state, title, next) { url = next; } }},
    getComputedStyle: () => ({getPropertyValue: () => '0'}),
  };
  for (const [name, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, {configurable: true, value});
    t.after(() => descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]);
  }
  const root = {querySelectorAll: () => [container]};
  bindKnowledgeGraph(root);
  bindKnowledgeGraph(root);
  assert.equal(updates, 1);
  handler({target: {closest: () => buttons.find(button => button.dataset.kgNode === 'math')}});
  assert.equal(url, '#/block/demo?subject=math&node=math');
  assert.deepEqual(details.filter(detail => !detail.hidden).map(detail => detail.dataset.kgDetail), ['math']);
  assert.deepEqual(buttons.filter(button => button.pressed).map(button => button.dataset.kgNode), ['math']);
  assert.deepEqual(links.map(link => link.classList.highlighted), [true, false, false, true]);
});
