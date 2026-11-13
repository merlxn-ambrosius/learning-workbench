import test from 'node:test';
import assert from 'node:assert/strict';
import { semanticLevel, normalizeUniverseView, resolveUniverseView, nextUniverseNode } from '../site/universe-navigation.mjs';
const model = { nodes: [{id:'a',children:[{id:'one'}]},{id:'b',children:[]}], scopes:[{id:'part',nodeIds:['a']}] };

test('semantic layers aggregate at a distance, expose real courses on focus, and require explicit activity expansion', () => {
  assert.equal(semanticLevel(), 'regions');
  assert.equal(semanticLevel({ratio:2}), 'courses');
  assert.equal(semanticLevel({ratio:1.4,previousLevel:'courses'}), 'courses');
  assert.equal(semanticLevel({ratio:1.4}), 'regions');
  assert.equal(semanticLevel({ratio:.2,scopeId:'part'}), 'courses');
  assert.equal(semanticLevel({ratio:20,selectedId:'a'}), 'courses');
  assert.equal(semanticLevel({selectedId:'a',expanded:true}), 'activities');
});
test('view restoration rejects unknown IDs, incompatible children and non-finite or extreme camera values', () => {
  const valid={selectedId:'a',expanded:true,childId:'one',camera:{x:2,y:3,k:1.2},fit:.4};
  assert.deepEqual(normalizeUniverseView(model,valid).camera, valid.camera);
  assert.equal(normalizeUniverseView(model,valid).childId,'one');
  assert.equal(normalizeUniverseView(model,{...valid,childId:'foreign'}).childId,'');
  for(const camera of [{x:NaN,y:0,k:1},{x:0,y:0,k:Infinity},{x:0,y:0,k:0},{x:'0',y:0,k:1},{x:1e9,y:0,k:1}]) {
    assert.equal(normalizeUniverseView(model,{...valid,camera}).camera,null);
  }
  assert.equal(normalizeUniverseView(model,{...valid,selectedId:'b',scopeId:'part'}).selectedId,'');
  assert.equal(normalizeUniverseView(model,null).selectedId,'');
});
test('a different explicit URL node wins; the same URL restores its prior camera and expanded node', () => {
  const saved={selectedId:'a',expanded:true,childId:'one',camera:{x:2,y:3,k:1.2}};
  assert.equal(resolveUniverseView(model,saved,{selectedId:'b'}).selectedId,'b');
  assert.equal(resolveUniverseView(model,saved,{selectedId:'b'}).camera,null);
  assert.equal(resolveUniverseView(model,saved,{selectedId:'a'}).expanded,true);
  assert.deepEqual(resolveUniverseView(model,saved).camera,saved.camera);
  assert.equal(resolveUniverseView(model,saved,{scopeId:'part'}).camera,null);
});
test('directional focus chooses a nearby candidate in the requested half-plane, excluding hidden nodes', () => {
  const positions=new Map([['a',{x:0,y:0}],['b',{x:50,y:5}],['c',{x:1,y:100}],['hidden',{x:1,y:0}]]);
  assert.equal(nextUniverseNode({currentId:'a',direction:'ArrowRight',positions,visibleIds:['a','b','c']}),'b');
  assert.equal(nextUniverseNode({currentId:'a',direction:'ArrowDown',positions,visibleIds:['a','b','c']}),'c');
  assert.equal(nextUniverseNode({currentId:'a',direction:'ArrowLeft',positions,visibleIds:['a','b','c']}),'');
});
