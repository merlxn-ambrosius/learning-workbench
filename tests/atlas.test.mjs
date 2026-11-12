import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { atlasListing } from '../site/atlas.mjs';

const atlas = JSON.parse(await readFile(new URL('../site/data/atlas.json', import.meta.url), 'utf8'));
const ids = nodes => nodes.map(node => node.id);

test('Every suggested route displays its authored sequence; all catalogue IDs remain addressable', () => {
  for (const route of atlas.routes) {
    assert.deepEqual(ids(atlasListing(atlas, route.id, '').nodes), route.nodes);
  }
  assert.deepEqual(ids(atlasListing(atlas, 'all', '').nodes), ids(atlas.nodes));
});

test('Searching remains within the selected route and handles empty and cleared queries', () => {
  assert.deepEqual(ids(atlasListing(atlas, 'people', ' h02 ').nodes), ['H02']);
  assert.deepEqual(atlasListing(atlas, 'people', 'O03').nodes, []);
  assert.deepEqual(ids(atlasListing(atlas, 'all', 'O03').nodes), ['O03']);
  assert.deepEqual(atlasListing(atlas, 'people', '  ').nodes[0].id, 'H01');
});

// Exercise production rendering and registered handlers at a small DOM boundary.
// Navigation, native focus, and CSS layout still require a browser walkthrough.
test('Atlas list and node pages keep filter scope, deep links and alternatives distinct', async t => {
  const elements = new Map();
  const listeners = {};
  const location = { hash: '#/atlas' };
  const document = {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, {});
      return elements.get(selector);
    },
    addEventListener(name, callback) { listeners[name] = callback; },
  };
  const window = {
    addEventListener(name, callback) { listeners[name] = callback; },
    scrollTo() {},
  };
  const records = new Map();
  const localStorage = {
    getItem: key => records.get(key) ?? null,
    setItem: (key, value) => records.set(key, value),
  };
  for (const [key, value] of Object.entries({ document, window, location, localStorage,
    fetch: async () => ({ ok: true, json: async () => atlas }) })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
  }

  await import('../site/app.js');
  await new Promise(resolve => setImmediate(resolve));
  const html = () => elements.get('#app').innerHTML;
  assert.match(html(), /id="atlas-route"/);

  listeners.change({ target: { id: 'atlas-route', value: 'people' } });
  const routeLinks = [...elements.get('#atlas-nodes').innerHTML.matchAll(/#\/atlas\/node\/([A-Z0-9]+)/g)];
  assert.deepEqual(routeLinks.map(match => match[1]), atlas.routes.find(route => route.id === 'people').nodes);
  listeners.input({ target: { id: 'atlas-search', value: 'O03', matches: () => false } });
  assert.match(elements.get('#atlas-nodes').innerHTML, /没有匹配/);
  assert.equal(elements.get('#atlas-count').textContent, '找到 0 个节点');
  assert.doesNotMatch(html(), /id="atlas-detail"/);

  location.hash = '#/atlas/node/X02';
  listeners.hashchange();
  const detail = html();
  assert.match(detail, /任选一项作为准备/);
  for (const id of ['D04', 'R03', 'O02', 'H02']) assert.ok(detail.includes(`href="#/atlas/node/${id}"`));
  assert.match(detail, /怎样检查我的尝试/);
  assert.doesNotMatch(detail, /steps-bar|原作业提示/);
  location.hash = '#/atlas/node/NOPE';
  listeners.hashchange();
  assert.match(html(), /未找到这个节点/);
  location.hash = '#/atlas';
  listeners.hashchange();
  assert.match(html(), /value="O03"/);
  assert.match(html(), /value="people" selected/);
});
