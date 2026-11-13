// Map view state is navigation context, never evidence of learning or mastery.
export const UNIVERSE_VIEW_KEY = 'learn-workbench.universe-view.v1';
export const UNIVERSE_LEVELS = { regions: '01 · 全域地形', courses: '02 · 课程关系', activities: '03 · 学习节点' };

export function semanticLevel({ ratio = 1, scopeId = '', selectedId = '', expanded = false, previousLevel = 'regions' } = {}) {
  if (expanded && selectedId) return 'activities';
  if (scopeId || selectedId) return 'courses';
  // Different entering/leaving thresholds prevent flickering near a boundary.
  return ratio >= (previousLevel === 'courses' ? 1.25 : 1.65) ? 'courses' : 'regions';
}

function safeCamera(camera) {
  if (!camera || !['x', 'y', 'k'].every(key => typeof camera[key] === 'number' && Number.isFinite(camera[key]))) return null;
  if (Math.abs(camera.x) > 100000 || Math.abs(camera.y) > 100000 || camera.k < .02 || camera.k > 100) return null;
  return { x: camera.x, y: camera.y, k: camera.k };
}

export function normalizeUniverseView(model, candidate = {}) {
  if (!candidate || typeof candidate !== 'object') candidate = {};
  const node = model.nodes.find(n => n.id === candidate.selectedId);
  const scope = model.scopes.find(s => s.id === candidate.scopeId);
  const selectedId = node && (!scope || scope.nodeIds.includes(node.id)) ? node.id : '';
  const expanded = Boolean(selectedId && candidate.expanded === true && node.children?.length);
  return {
    scopeId: scope?.id || '', selectedId, expanded,
    childId: expanded && node.children.some(c => c.id === candidate.childId) ? candidate.childId : '',
    camera: safeCamera(candidate.camera),
    returnCamera: expanded ? safeCamera(candidate.returnCamera) : null,
    // Camera values are in the chart's oriented coordinates.
    rotated: candidate.rotated === true,
    fit: typeof candidate.fit === 'number' && Number.isFinite(candidate.fit) && candidate.fit >= .02 && candidate.fit <= 100 ? candidate.fit : null,
    level: candidate.level === 'courses' ? 'courses' : 'regions',
  };
}

export function resolveUniverseView(model, saved, explicit = {}) {
  const restored = normalizeUniverseView(model, saved);
  const explicitNode = model.nodes.some(n => n.id === explicit.selectedId);
  const explicitScope = model.scopes.some(s => s.id === explicit.scopeId);
  // replaceState writes node/scope in the URL. The same URL should restore its
  // camera; a different authored link must win over a previous map session.
  if ((explicitNode && explicit.selectedId !== restored.selectedId) ||
      (explicitScope && explicit.scopeId !== restored.scopeId)) {
    return normalizeUniverseView(model, { scopeId: explicitScope ? explicit.scopeId : '', selectedId: explicitNode ? explicit.selectedId : '' });
  }
  return normalizeUniverseView(model, {
    ...restored,
    ...(explicitScope ? { scopeId: explicit.scopeId } : {}),
    ...(explicitNode ? { selectedId: explicit.selectedId } : {}),
  });
}

export function nextUniverseNode({ currentId, direction, positions, visibleIds }) {
  const origin = positions.get(currentId);
  if (!origin) return [...visibleIds][0] || '';
  const vector = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[direction];
  if (!vector) return '';
  let best = '', score = Infinity;
  for (const id of visibleIds) {
    const p = positions.get(id);
    if (!p || id === currentId) continue;
    const dx = p.x - origin.x, dy = p.y - origin.y;
    const forward = dx * vector[0] + dy * vector[1];
    if (forward <= .01) continue;
    const sideways = Math.abs(dx * vector[1] - dy * vector[0]);
    const candidate = Math.hypot(dx, dy) + sideways * 2;
    if (candidate < score) { best = id; score = candidate; }
  }
  return best;
}
