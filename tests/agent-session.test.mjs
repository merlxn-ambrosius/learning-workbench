import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as logic from '../site/logic.mjs';
import * as workspace from '../site/workbench.mjs';
import * as agentView from '../site/agent-view.mjs';
import * as klView from '../site/kl-view.mjs';
import * as html from '../site/html.mjs';
import { openProgressStore } from '../site/progress-store.mjs';
import { atlasListing } from '../site/atlas.mjs';
import { microgradPage, mountMicrograd } from '../site/micrograd-view.mjs';

// Runs actual app renderers/handlers against tiny boundary stubs. This is NOT a
// browser, DOM parser, accessibility test or substitute for a rendered walkthrough.
// Keeping it here catches cross-route ReferenceErrors and persistence regressions.
const source = (await readFile(new URL('../site/app.js',import.meta.url),'utf8'))
  .replace(/^import[\s\S]*?from '\.\/[^']+';\n/gm,'');

async function session(saved, {blocked=false, route='#/lab/agent'}={}) {
  let storage = saved ? JSON.stringify(saved) : null;
  const listeners = new Map();
  const elements = new Map();
  const focus = [];
  function element(id) {
    if(!elements.has(id)) elements.set(id, {
      id, innerHTML:'',textContent:'',style:{},
      setAttribute(){}, focus(){focus.push(id)},remove(){elements.delete(id)},
    });
    return elements.get(id);
  }
  const document = {
    querySelector(selector){return element(selector.slice(1));},
    addEventListener(type,handler){listeners.set(type,handler)},
    createElement(){return {setAttribute(){},style:{}}},
    body:{appendChild(node){elements.set(node.id,node)}},
  };
  const context = vm.createContext({
    ...logic, ...workspace, ...agentView, ...klView, ...html, openProgressStore, atlasListing, microgradPage,mountMicrograd,document,console,URLSearchParams,
    location:{hash:route},
    localStorage:{getItem(){return storage},setItem(key,value){if(blocked)throw new Error('blocked');storage=value}},
    confirm:()=>true,
    window:{addEventListener(){},scrollTo(){}},
    fetch:async()=>({ok:true,json:async()=>({nodes:[],courses:[],routes:[],sources:[]})}),
    setTimeout:()=>0,clearTimeout(){},
  });
  vm.runInContext(source,context);
  await new Promise(resolve=>setImmediate(resolve));
  return {
    html:()=>element('app').innerHTML,
    saved:()=>JSON.parse(storage),
    toast:()=>element('toast').textContent,
    focus, element,
    route(hash) { context.location.hash=hash; vm.runInContext('render()',context); },
    async restore(value) {
      await vm.runInContext('importBackup',context)({size:100, text:async()=>JSON.stringify(value)});
    },
    guideHelp() {listeners.get('toggle')({target:{dataset:{klGuideHelp:''},open:true,isConnected:true}})},
    async click(id) {await listeners.get('click')({target:{closest(selector){return selector==='button'?element(id):null}}})},
    change(id,value) {listeners.get('change')({target:{id,value}})},
    note(value){listeners.get('input')({target:{value,dataset:{note:'agent'},matches:s=>s==='[data-note]'}})},
    toggle(key,open){listeners.get('toggle')({target:{dataset:{agentDetail:key},open,isConnected:true}})},
  };
}

test('Agent controls change actual downstream results, clear stale output and restore conditions',async()=>{
  const app=await session();
  assert.doesNotMatch(app.html(),/id="agent-result"/);
  await app.click('agent-run');
  assert.match(app.html(),/B · 摘要输入（3 条）/);
  assert.match(app.html(),/M-402 · LOW/);
  assert.match(app.html(),/<code>unclassified<\/code>/);
  assert.equal(app.focus.at(-1),'agent-result');
  app.change('agent-policy','drop');
  assert.doesNotMatch(app.html(),/id="agent-result"/);
  assert.equal(app.focus.at(-1),'agent-policy');
  await app.click('agent-run');
  assert.match(app.html(),/B · 摘要输入（2 条）/);
  assert.match(app.html(),/不进入摘要输入/);
  app.note('测试笔记：<script>不能成为标签</script>');
  app.toggle('hintOpen',true);
  await app.click('agent-record');
  assert.match(app.saved().evidence.at(-1).help,/观察结果/);
  const restored=await session(app.saved());
  assert.match(restored.html(),/value="drop" selected/);
  assert.match(restored.html(),/B · 摘要输入（2 条）/);
  assert.match(restored.html(),/data-agent-detail="hintOpen" open/);
  assert.match(restored.html(),/&lt;script&gt;/);
  await restored.click('agent-reset');
  assert.doesNotMatch(restored.html(),/id="agent-result"/);
  assert.equal(restored.saved().notes.agent,app.saved().notes.agent);
  assert.deepEqual(restored.saved().evidence,app.saved().evidence);
});

test('All-valid control and both policies keep three records; assistance never becomes independence',async()=>{
  const app=await session();
  app.change('agent-scenario','baseline');
  for(const policy of ['low','drop']) {
    app.change('agent-policy',policy);
    await app.click('agent-run');
    assert.match(app.html(),/A · 摘要输入（3 条）/);
    assert.match(app.html(),/B · 摘要输入（3 条）/);
  }
  app.toggle('explanationOpen',true);
  await app.click('agent-record');
  app.toggle('explanationOpen',false);
  await app.click('agent-record');
  assert.match(app.saved().evidence[0].help,/当前展开完整解释/);
  assert.match(app.saved().evidence[1].help,/此前展开过完整解释/);
  assert.doesNotMatch(JSON.stringify(app.saved().evidence),/独立|掌握/);
});

test('Blocked persistence is never overwritten by an Agent success toast',async()=>{
  const app=await session(null,{blocked:true});
  await app.click('agent-run');
  await app.click('agent-record');
  assert.match(app.toast(),/存储失败/);
  await app.click('agent-reset');
  assert.match(app.toast(),/存储失败/);
});

test('Shared-file edits keep KL rendering and its explanation functional',async()=>{
  const app=await session(null,{route:'#/lab/kl'});
  assert.match(app.html(),/下降/);
  await app.click('kl-reveal');
  assert.equal(app.saved().decisions.klSawExplanation,'yes');
});

test('failed import preserves original notes in the page and in storage',async()=>{
  const original={...logic.defaultProgress(),notes:{agent:'original',kl:'',general:''}};
  const app=await session(original,{blocked:true,route:'#/journal'});
  await app.restore({...original,notes:{...original.notes,agent:'replacement'}});
  app.route('#/journal');
  assert.equal(app.saved().notes.agent,'original');
  assert.match(app.html(),/original/);
  assert.doesNotMatch(app.html(),/replacement/);
  assert.match(app.toast(),/存储失败/);
});

test('KL explains failed saves and records optional guide exposure on later judgments',async()=>{
  const app=await session(null,{route:'#/learn/kl'});
  app.guideHelp();
  app.route('#/lab/kl');
  app.element('kl-prediction').value='down';
  await app.click('kl-save');
  assert.match(app.saved().evidence.at(-1).help,/导学页中的机制解释/);
  const blocked=await session(null,{blocked:true,route:'#/lab/kl'});
  blocked.element('kl-prediction').value='down';
  await blocked.click('kl-save');
  assert.match(blocked.element('kl-saved').textContent,/仅保留在本页/);
});

test('recording an 81st event keeps earlier work in exports and after reload',async()=>{
  const initial=logic.defaultProgress();
  initial.evidence=Array.from({length:80},(_,i)=>({kind:'原记录',summary:'第'+i+'条',help:'未记录',date:'2026-11-01'}));
  const app=await session(initial);
  await app.click('agent-run');await app.click('agent-record');
  assert.equal(app.saved().evidence.length,81);
  const restored=await session(app.saved(),{route:'#/journal'});
  assert.match(restored.html(),/显示最近 80 条。全部 81 条/);
  assert.equal(logic.normalizeProgress(app.saved()).evidence[0].summary,'第0条');
});
