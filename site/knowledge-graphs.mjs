import { escapeHtml } from './html.mjs';

const statusLabels = { available: '站内学习', external: '外部资源', planned: '规划中' };
const nodeGlyphs = {
  available: '<path d="M3 4.25c1.4-.45 3.1-.25 4.5.55v7.1c-1.4-.85-3.1-1-4.5-.55zM12 4.25c-1.4-.45-3.1-.25-4.5.55v7.1c1.4-.85 3.1-1 4.5-.55z"/>',
  external: '<path d="M8 3.5h4v4M12 3.5 6.5 9M6 4.75H3.5v7h7v-2"/>',
  planned: '<rect x="2.75" y="3.5" width="9.5" height="8" rx="1.5" stroke-dasharray="2.2 1.8"/><path d="M5.5 7.5h4"/>',
};
const marking = (status) => `<svg aria-hidden="true" viewBox="0 0 15 15" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${nodeGlyphs[status] || nodeGlyphs.available}</svg>`;

// Derive ranks from prerequisites; keep the author's order when peer positions tie.
// Reject cycles or unresolved IDs so an invalid map cannot silently suggest a path.
export function rankKnowledgeNodes(nodes, edges) {
  const incoming = new Map(nodes.map(node => [node.id, []]));
  if (incoming.size !== nodes.length) throw new Error('Duplicate knowledge node');
  for (const { from, to } of edges) {
    if (!incoming.has(from) || !incoming.has(to)) throw new Error(`Unknown endpoint: ${from} → ${to}`);
    incoming.get(to).push(from);
  }
  const ranked = new Map();
  const active = new Set();
  function rank(id) {
    if (ranked.has(id)) return ranked.get(id);
    if (active.has(id)) throw new Error(`Cycle at ${id}`);
    active.add(id);
    const depth = incoming.get(id).reduce((result, parent) => Math.max(result, rank(parent) + 1), 0);
    active.delete(id);
    ranked.set(id, depth);
    return depth;
  }
  const levels = [];
  for (const node of nodes) (levels[rank(node.id)] ??= []).push(node);
  // Place each successor near its parents. For example, two independent university
  // foundations can feed different branches without their arrows crossing needlessly.
  const slots = new Map();
  for (const level of levels) {
    const center = new Map(level.map(node => {
      const parents = incoming.get(node.id);
      return [node.id, parents.length ? parents.reduce((sum, id) => sum + slots.get(id), 0) / parents.length : 0];
    }));
    level.sort((a, b) => center.get(a.id) - center.get(b.id));
    level.forEach((node, i) => slots.set(node.id, (i + 0.5) / level.length));
  }
  return levels;
}

function graphLayout(levels, compact, bypassCount) {
  const width = 1000; // Scales to container width. The vertical scale remains in CSS pixels.
  const cardHeight = compact ? 90 : 70;
  const breadth = Math.max(...levels.map(level => level.length));
  // Four or more peers would squeeze labels into slivers on a phone. Stack
  // those peers vertically and keep successive prerequisite ranks in columns.
  const vertical = compact && breadth < 4;
  const height = vertical ? levels.length * 138 + 12 : Math.max(178, breadth * (cardHeight + 29) + 22 + bypassCount * 7);
  const inset = vertical && bypassCount ? 34 + 8 * bypassCount : 12;
  const headroom = vertical ? 0 : 10 + bypassCount * 7;
  const points = new Map();
  levels.forEach((level, depth) => level.forEach((node, index) => {
    const rankWidth = vertical ? level.length : levels.length;
    const slotWidth = (width - 2 * inset) / rankWidth;
    const x = inset + ((vertical ? index : depth) + 0.5) * slotWidth;
    const y = vertical ? 56 + depth * 138 : headroom + (index + 0.5) / level.length * (height - headroom - 10);
    const cardWidth = Math.min(compact ? 630 : 330, slotWidth * (vertical ? 0.93 : 0.79));
    points.set(node.id, { x, y, cardWidth, cardHeight, depth });
  }));
  return { points, height, vertical };
}

function edgePath(from, to, vertical, rail) {
  if (vertical) {
    const start = from.y + from.cardHeight / 2;
    const end = to.y - to.cardHeight / 2 - 3;
    if (to.depth > from.depth + 1) {
      const side = 12 + rail * 9;
      return `M${from.x},${start} V${start + 12} H${side} V${end - 15} H${to.x} V${end}`;
    }
    const middle = (start + end) / 2;
    return `M${from.x},${start} C${from.x},${middle} ${to.x},${middle} ${to.x},${end}`;
  }
  const start = from.x + from.cardWidth / 2;
  const end = to.x - to.cardWidth / 2 - 4;
  if (to.depth > from.depth + 1) {
    const top = 9 + rail * 7;
    return `M${start},${from.y} H${start + 12} V${top} H${end - 12} V${to.y} H${end}`;
  }
  const middle = (start + end) / 2;
  return `M${start},${from.y} C${middle},${from.y} ${middle},${to.y} ${end},${to.y}`;
}

function drawEdges(layout, edges, compact, base) {
  const name = compact ? 'compact' : 'wide';
  const marker = `${base}-arrow-${name}`;
  let rail = 0;
  const paths = edges.map(({ from, to, kind }) => {
    const start = layout.points.get(from);
    const end = layout.points.get(to);
    const d = edgePath(start, end, layout.vertical, end.depth > start.depth + 1 ? rail++ : 0);
    return `<path class="kg-edge ${kind === 'required' ? 'kg-required' : 'kg-recommended'}" data-kg-from="${escapeHtml(from)}" data-kg-to="${escapeHtml(to)}" d="${d}" vector-effect="non-scaling-stroke" marker-end="url(#${marker})"/>`;
  });
  return `<svg class="kg-edges kg-edges-${name}" aria-hidden="true" viewBox="0 0 1000 ${layout.height}" preserveAspectRatio="none">
    <defs><marker id="${marker}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="${layout.vertical ? 8 : 12}" markerHeight="${layout.vertical ? 22 : 8}" markerUnits="userSpaceOnUse" orient="auto" preserveAspectRatio="none"><path d="M0 0 8 4 0 8 2 4z" fill="#405d89"/></marker></defs>
    ${paths.join('')}</svg>`;
}

function nodeButton(node, selected, wide, compact, panelId) {
  const attrs = (point, axis) => `--${axis}-x:${point.x / 10}%;--${axis}-y:${point.y}px;--${axis}-w:${point.cardWidth / 10}%;--${axis}-h:${point.cardHeight}px`;
  const status = statusLabels[node.status] ? node.status : 'available';
  return `<button type="button" class="kg-node kg-${status}" data-kg-node="${escapeHtml(node.id)}" aria-pressed="${selected}" aria-controls="${panelId}"
    style="${attrs(wide, 'wide')};${attrs(compact, 'small')}">
    <span class="kg-nstatus">${marking(status)}${statusLabels[status]}</span>
    <span class="kg-ntitle">${escapeHtml(node.title)}</span></button>`;
}

function nodeDetail(node, graph, selected, nodesById, panelId) {
  function relations(direction) {
    const prior = direction === 'before';
    const edges = graph.edges.filter(edge => (prior ? edge.to : edge.from) === node.id);
    if (!edges.length) return prior ? '<p class="kg-map-start">可以从这个节点进入本图。</p>' : '';
    const entries = edges.map(edge => {
      const peer = nodesById.get(prior ? edge.from : edge.to);
      return `<li><button type="button" class="kg-relation" data-kg-select="${escapeHtml(peer.id)}">${escapeHtml(peer.title)}</button>
        <span class="kg-kind">${edge.kind === 'required' ? '前置' : '建议'}</span>
        ${edge.reason ? `<p>${escapeHtml(edge.reason)}</p>` : ''}</li>`;
    }).join('');
    return `<div class="kg-related"><h4>${prior ? '先修准备' : '接下来可学'}</h4><ul>${entries}</ul></div>`;
  }
  const status = statusLabels[node.status] ? node.status : 'available';
  const titleId = panelId + '-title';
  const external = node.href?.startsWith('https://');
  const action = node.href && (external || node.href.startsWith('#/')) ?
    `<a class="kg-open" href="${escapeHtml(node.href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(node.actionLabel || (graph.type === 'block' ? '查看课程图' : external ? '打开原课资料' : '进入学习'))}<span aria-hidden="true">${external ? ' ↗' : ' →'}</span></a>` : '';
  return `<section class="kg-detail" id="${panelId}" data-kg-detail="${escapeHtml(node.id)}" aria-labelledby="${titleId}" ${selected ? '' : 'hidden'}>
    <span class="kg-detail-status">${marking(status)}${statusLabels[status]}</span>
    <h3 id="${titleId}" tabindex="-1">${escapeHtml(node.title)}</h3>
    ${node.description ? `<p class="kg-summary">${escapeHtml(node.description)}</p>` : ''}${action}
    ${relations('before')}${relations('after')}
    <button type="button" class="kg-back" data-kg-back="${escapeHtml(node.id)}">返回图中节点 ↑</button></section>`;
}

export function renderKnowledgeGraph(graph, selectedId) {
  const { nodes, edges } = graph;
  if (!nodes.length) return '<p class="kg-empty">课程节点正在规划中。</p>';
  const levels = rankKnowledgeNodes(nodes, edges);
  const rank = new Map(levels.flatMap((level, i) => level.map(node => [node.id, i])));
  const bypasses = edges.filter(edge => rank.get(edge.to) > rank.get(edge.from) + 1).length;
  const wide = graphLayout(levels, false, bypasses);
  const compact = graphLayout(levels, true, bypasses);
  const byId = new Map(nodes.map(node => [node.id, node]));
  const initial = byId.get(selectedId) ||
    (graph.type === 'block' && levels.flat().filter(node => node.status === 'available').at(-1)) || levels[0][0];
  // IDs in the domain catalog are stable slugs. A graph-local prefix separates block/lesson views.
  const base = 'kg-' + escapeHtml(graph.type) + '-' + escapeHtml(graph.id);
  const buttons = levels.flat().map(node => nodeButton(node, node.id === initial.id,
    wide.points.get(node.id), compact.points.get(node.id), `${base}-${escapeHtml(node.id)}`));
  const details = nodes.map(node => nodeDetail(node, graph, node.id === initial.id, byId, `${base}-${escapeHtml(node.id)}`));
  const hasRequired = edges.some(edge => edge.kind === 'required');
  const hasSuggested = edges.some(edge => edge.kind !== 'required');
  return `<div class="kg" data-knowledge-graph${compact.vertical ? '' : ' data-kg-dense'}>
    <div class="kg-workarea"><div class="kg-diagram" role="group" aria-label="${escapeHtml(graph.title)} 知识依赖图">
      <div class="kg-legend">${edges.length ? '<span>箭头从准备指向后续</span>' : ''}${hasRequired ? '<span><i class="kg-keyline"></i>前置</span>' : ''}${hasSuggested ? '<span><i class="kg-keyline kg-key-suggested"></i>建议准备</span>' : ''}</div>
      <div class="kg-stage" style="--wide-height:${wide.height}px;--small-height:${compact.height}px;--small-min-width:${compact.vertical ? 0 : levels.length * 132}px">
        ${drawEdges(wide, edges, false, base)}${drawEdges(compact, edges, true, base)}${buttons.join('')}
      </div>
    </div><div class="kg-inspector">${details.join('')}</div></div>
    </div>`;
}

export function bindKnowledgeGraph(root = document) {
  for (const graph of root.querySelectorAll('[data-knowledge-graph]')) {
    if (graph.dataset.bound) continue;
    graph.dataset.bound = 'true';
    const nodes = [...graph.querySelectorAll('[data-kg-node]')];
    const details = [...graph.querySelectorAll('[data-kg-detail]')];
    const edges = [...graph.querySelectorAll('[data-kg-from]')];
    function highlight(id) {
      for (const edge of edges) edge.classList.toggle('kg-neighbour', edge.dataset.kgFrom === id || edge.dataset.kgTo === id);
    }
    highlight(nodes.find(node => node.getAttribute('aria-pressed') === 'true')?.dataset.kgNode);
    graph.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-kg-back')) {
        nodes.find(node => node.dataset.kgNode === button.dataset.kgBack)?.focus();
        return;
      }
      const id = button.dataset.kgNode || button.dataset.kgSelect;
      if (!id) return;
      for (const node of nodes) node.setAttribute('aria-pressed', String(node.dataset.kgNode === id));
      for (const detail of details) detail.hidden = detail.dataset.kgDetail !== id;
      highlight(id);
      const [path, query] = window.location.hash.split('?');
      if (/^#\/(block|course)\//.test(path)) {
        const params = new URLSearchParams(query);
        params.set('node', id);
        // A selection stays on this page; Back still returns to the preceding page.
        try { window.history.replaceState(window.history.state, '', path + '?' + params); }
        catch (error) { if (error.name !== 'SecurityError') throw error; } // Opaque/offline file origins.
      }
      const current = details.find(detail => !detail.hidden);
      // When the inspector sits below the map, move to it, keeping a return path to the same node.
      if (button.dataset.kgSelect || getComputedStyle(graph).getPropertyValue('--kg-stacked').trim() === '1')
        current.querySelector('h3').focus();
    });
  }
}
