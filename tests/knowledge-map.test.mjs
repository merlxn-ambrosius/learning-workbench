import test from 'node:test';
import assert from 'node:assert/strict';
import {fullCourses, learningPaths, listKnowledge, knowledgeDependencies} from '../site/content-model.mjs';
import {buildKnowledgeMapModel,resolveMapTarget,mapLensNodes,fitMapCamera,zoomMapAt,renderKnowledgeMap,renderLocalKnowledge} from '../site/knowledge-map.mjs';

test('map keeps whole-course, chapter and reusable knowledge identities separate',()=>{
  const model=buildKnowledgeMapModel();
  assert.equal(model.nodes.filter(n=>n.kind==='course').length,fullCourses.length);
  assert.equal(model.nodes.filter(n=>n.kind==='curated-path').length,learningPaths.length);
  assert.equal(model.nodes.filter(n=>n.kind==='knowledge').length,listKnowledge().length);
  assert(!model.nodes.some(n=>n.id==='cph-13'||n.id==='micrograd'));
  assert.deepEqual(resolveMapTarget('cph-13',model),{nodeId:'competitive-programmers-handbook',chapterId:'cph-13',legacyId:'cph-13'});
  assert.equal(resolveMapTarget('micrograd',model).nodeId,'zero-to-hero');
  assert.equal(resolveMapTarget('shared-input-gradient',model).nodeId,'autodiff-gradient-accumulation');
  assert.equal(resolveMapTarget('unknown',model).nodeId,null);
});

test('lenses preserve coordinates and edges contain actual reasons rather than course sequence',()=>{
  const model=buildKnowledgeMapModel(),snapshot=new Map(model.nodes.map(n=>[n.id,[n.x,n.y]]));
  for(const subject of ['math','computing','ai','finance'])for(const node of mapLensNodes(model,subject))assert.deepEqual([node.x,node.y],snapshot.get(node.id));
  assert.deepEqual(model.edges,knowledgeDependencies);
  for(const edge of model.edges){assert(edge.reason.length>10);assert.equal(model.nodes.find(n=>n.id===edge.from).kind,'knowledge');assert.equal(model.nodes.find(n=>n.id===edge.to).kind,'knowledge');}
  assert.equal(model.nodes.filter(n=>n.id==='autodiff-gradient-accumulation').length,1);
  assert.equal(new Set(model.occurrences.filter(n=>n.knowledgeId==='autodiff-gradient-accumulation').map(n=>n.courseId)).size,2);
});

test('zoom remains anchored and fit is finite for small or empty views',()=>{
  const camera={x:500,y:300,k:.7},point={x:170,y:130},width=900,height=620;
  const before={x:camera.x+(point.x-width/2)/camera.k,y:camera.y+(point.y-height/2)/camera.k};
  const next=zoomMapAt(camera,1.3,point,width,height);
  assert(Math.abs(next.x+(point.x-width/2)/next.k-before.x)<1e-9);
  assert(Math.abs(next.y+(point.y-height/2)/next.k-before.y)<1e-9);
  for(const nodes of [[],[{x:1,y:1}],buildKnowledgeMapModel().nodes]){
    const fit=fitMapCamera(nodes,320,465);assert([fit.x,fit.y,fit.k].every(Number.isFinite));assert(fit.k>=.16&&fit.k<=1.35);
  }
});

test('legacy deep link opens the real parent course and inspectable chapter',()=>{
  const html=renderKnowledgeMap(new URLSearchParams('node=cph-13'));
  assert.match(html,/data-km-selected="competitive-programmers-handbook"/);
  assert.match(html,/data-km-chapter-detail="cph-13"/);
  assert.match(html,/#\/course\/competitive-programmers-handbook\?chapter=cph-13/);
  assert.match(html,/阅读次序/);
  assert(!html.includes('40 门课程'));
  assert.match(renderLocalKnowledge('micrograd'),/maps\?node=micrograd/);
  assert.equal(renderLocalKnowledge('missing'),'');
});

test('shared knowledge inspector links both contextual occurrences without duplicating nodes',()=>{
  const html=renderKnowledgeMap({node:'autodiff-gradient-accumulation'});
  assert.match(html,/course=zero-to-hero/);assert.match(html,/course=learn-optimization-path/);
  assert.match(html,/含课程扩展/);assert.match(html,/知识依赖/);
  assert.equal((html.match(/data-km-node="autodiff-gradient-accumulation"/g)||[]).length,1);
});

test('old Agent and KL map URLs retain their actual learning units without inventing courses',()=>{
  const model=buildKnowledgeMapModel();
  assert(!model.nodes.some(node=>node.id==='agent'||node.id==='kl'));
  for(const id of ['agent','kl']){
    const html=renderKnowledgeMap({node:id});
    assert.match(html,new RegExp(`data-km-selected="${id}"`));
    assert.match(html,new RegExp(`href="#/course/${id}"`));
    assert.match(html,/不计入完整课程数量/);
  }
});
