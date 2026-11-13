import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize,mergeSummary,challengeSummary,summaries,traceFrontiers,measureSharedInput,emptyStudio,normalizeStudio,openStudioStore,STUDIO_KEY} from '../site/discovery-model.mjs';

function arrays(n) {const out=[[]];let layer=[[]];for(let k=0;k<n;k++){layer=layer.flatMap(a=>[-2,0,2].map(x=>[...a,x]));out.push(...layer);}return out;}
function brute(xs) {let best=0;for(let i=0;i<xs.length;i++)for(let j=i+1;j<=xs.length;j++)best=Math.max(best,xs.slice(i,j).reduce((a,b)=>a+b,0));return best;}
test('every split agrees with independently enumerated intervals, including empty and negative arrays',()=>{
  for(const xs of arrays(6))for(let cut=0;cut<=xs.length;cut++){
    const got=mergeSummary(summarize(xs.slice(0,cut)),summarize(xs.slice(cut)));
    assert.equal(got.best,brute(xs));assert.deepEqual(got,summarize(xs));
  }
  for(const a of arrays(2))for(const b of arrays(2))for(const c of arrays(2))assert.deepEqual(mergeSummary(mergeSummary(summarize(a),summarize(b)),summarize(c)),mergeSummary(summarize(a),mergeSummary(summarize(b),summarize(c))));
});
test('all incomplete summary subsets yield genuine indistinguishable-input counterexamples',()=>{
  for(let mask=0;mask<15;mask++){
    const keys=summaries.filter((_,i)=>mask&(1<<i)),c=challengeSummary(keys);assert.ok(c,keys.join(','));
    for(const k of keys)assert.equal(summarize(c.a)[k],summarize(c.b)[k]);
    const context=x=>c.side==='right'?[...(c.d||[]),...x,...c.c]:[...c.c,...x,...(c.d||[])];
    assert.equal(c.aBest,brute(context(c.a)));assert.equal(c.bBest,brute(context(c.b)));assert.notEqual(c.aBest,c.bBest);
  }
  assert.equal(challengeSummary(summaries),null);
});
test('frontier traces distinguish connection from certification over all public weights and zero ties',()=>{
  for(let w=0;w<=30;w++){
    const trace=traceFrontiers(w),end=trace.at(-1);assert.equal(end.best,Math.min(w,4+1+4));assert.equal(end.stop,true);
    for(const s of trace){assert.ok(s.best>=Math.min(w,9));if(s.stop)assert.equal(s.best,Math.min(w,9));}
  }
  assert.equal(traceFrontiers(10)[1].best,10);assert.equal(traceFrontiers(10)[1].stop,false);
  assert.equal(traceFrontiers(8)[1].best,8);assert.equal(traceFrontiers(8)[1].stop,false);
});
test('shared-input finite differences approach the independently expanded polynomial derivative',()=>{
  for(const x of [-2,0,2])for(const h of [1,.1,.001,-.1]){
    const m=measureSharedInput(x,h);assert.ok(Math.abs(m.sharedSlope-(2*x+h))<1e-9);assert.ok(Math.abs(m.fixedSlope-x)<1e-9);
  }
});
test('normalization preserves public drafts and help context but rejects incompatible backups',()=>{
  const raw=emptyStudio();raw.trials.routes={prediction:'<script>',help:2,weight:13,step:500,reason:'r'.repeat(3000)};
  raw.history=[{id:'segment',trial:{x:-3,reflection:'earlier reasoning',help:1}}];
  const s=normalizeStudio(raw);assert.equal(s.trials.routes.help,2);assert.equal(s.trials.routes.reason.length,2000);
  assert.equal(s.trials.routes.step,traceFrontiers(13).length-1);assert.equal(s.history[0].trial.reflection,'earlier reasoning');
  assert.throws(()=>normalizeStudio({...raw,version:9}));
});
test('corruption, unavailable storage, write failures, and other tabs never overwrite prior records',()=>{
  let value='{broken';const storage={getItem:()=>value,setItem:(_,v)=>{value=v;}};
  const corrupt=openStudioStore(()=>storage);assert.equal(corrupt.save(emptyStudio()),false);assert.equal(value,'{broken');
  assert.equal(corrupt.save(emptyStudio(),{replaceUnreadable:true}),true);assert.equal(JSON.parse(value).version,1);
  value=null;const a=openStudioStore(()=>storage),b=openStudioStore(()=>storage);const draft=emptyStudio();draft.last='gradient';
  assert.equal(a.save(draft),true);const original=value;assert.equal(b.save(emptyStudio()),false);assert.equal(value,original);
  const missing=openStudioStore(()=>{throw Error('denied');});assert.equal(missing.save(emptyStudio()),false);
  const failed=openStudioStore(()=>({getItem:()=>null,setItem:()=>{throw Error('quota');}}));assert.equal(failed.save(emptyStudio()),false);
  assert.equal(STUDIO_KEY,'learn-discovery-v1');
});
