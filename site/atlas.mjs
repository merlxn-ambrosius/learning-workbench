// The Atlas stores its catalogue and its suggested reading sequences separately.
export function atlasListing(atlas, routeId, query) {
  const route = atlas.routes.find(item => item.id === routeId);
  const byId = new Map(atlas.nodes.map(node => [node.id, node]));
  const ordered = route ? route.nodes.map(id => byId.get(id)).filter(Boolean) : atlas.nodes;
  const needle = query.trim().toLowerCase();
  const nodes = ordered.filter(node =>
    [node.id, node.title, node.summary, node.role, node.application]
      .join(' ').toLowerCase().includes(needle)
  );
  return { route, nodes };
}
