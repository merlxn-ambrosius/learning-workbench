import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutUniverse,frameUniverse,zoomUniverseAt,localNeighborhood,renderKnowledgeUniverse,renderUniverseThumbnail } from '../site/knowledge-universe.mjs';

const groups=[{id:'a',title:'基础'},{id:'b',title:'树结构'},{id:'c',title:'图'}];
const nodes=['v','w','x','y','z'].map((id,i)=>({
  id,title:'节点 '+id,groupId:groups[i%3].id,href:'#/course/'+id,
  children:[{id:'one',title:'一',href:'#/learn/'+id}],childEdges:[],
}));
const edges = [
  {from:'v',to:'x',kind:'required',reason:'用到输入约定'},
  {from:'x',to:'y',kind:'recommended',reason:'可复用相同表示'},
  {from:'z',to:'y',kind:'required',reason:'说明遍历的次序'},
];
const scopes=[{id:'slice',title:'所选板块',nodeIds:['v','y']}];
const model={groups,nodes,edges,scopes};
test('one set of course positions serves the entire chart, independent of scope order or filtered views',()=>{
  const a=layoutUniverse(model);
  const b=layoutUniverse({...model,scopes:[]});
  assert.deepEqual(a,b);
  assert.equal(a.positions.size,nodes.length);
  assert.equal(new Set([...a.positions.values()].map(p=>p.x+':'+p.y)).size,nodes.length);
  assert.deepEqual(localNeighborhood(model,'x'),['v','x','y']);
  assert.deepEqual(localNeighborhood(model,'w'),['w']);
  assert.deepEqual(localNeighborhood(model,'missing'),[]);
});
test('fitting keeps both varied aspect ratios in frame and zoom keeps the world point under the cursor stationary',()=>{
  const points=[...layoutUniverse(model).positions.values()];
  for(const [w,h] of [[320,366],[1030,480]]) {
    const cam=frameUniverse(points,w,h,25);
    const screen=(p,c)=>({x:(p.x-c.x)*c.k+w/2,y:(p.y-c.y)*c.k+h/2});
    for(const p of points){const s=screen(p,cam);assert.ok(s.x>=24 && s.x<=w-24);assert.ok(s.y>=24 && s.y<=h-24);}
    const anchor={x:w*.2,y:h*.7};
    const point={x:cam.x+(anchor.x-w/2)/cam.k,y:cam.y+(anchor.y-h/2)/cam.k};
    const zoomed=zoomUniverseAt(cam,1.7,anchor,w,h,.02,20);
    assert.ok(Math.abs(screen(point,zoomed).x-anchor.x)<1e-6);
    assert.ok(Math.abs(screen(point,zoomed).y-anchor.y)<1e-6);
  }
});
test('thumbnail draws the canonical edges, and each mode exposes the controls appropriate to its scope',()=>{
  const thumb=renderUniverseThumbnail(model);
  assert.equal((thumb.match(/<path d=/g)||[]).length,edges.length);
  assert.equal(renderUniverseThumbnail({groups:[],nodes:[],edges:[],scopes:[]}),'');
  const map=renderKnowledgeUniverse(model);
  assert.match(map,/data-uv-locate/);assert.match(map,/data-uv-scope/);
  assert.match(map,/data-uv-action="in"/);
  const near=renderKnowledgeUniverse(model,{mode:'neighborhood',selectedId:'x',fullHref:'#/maps?node=x'});
  assert.match(near,/data-uv-full href="#\/maps\?node=x"/);
  assert.doesNotMatch(near,/data-uv-locate/);
});
test('configuration cannot terminate its non-executable script or leak extra authored or learner fields',()=>{
  const malicious={...nodes[0],title:'</script><img src=x onerror=1>',secretNote:'PRIVATE-FIELD'};
  const html=renderKnowledgeUniverse({...model,nodes:[malicious]});
  assert.equal((html.match(/<\/script>/g)||[]).length,1);
  assert.doesNotMatch(html,/<img src=x|PRIVATE-FIELD/);
  const data=JSON.parse(html.match(/class="uv-config">(.*?)<\/script>/s)[1]);
  assert.equal(data.model.nodes[0].title,malicious.title);
});
