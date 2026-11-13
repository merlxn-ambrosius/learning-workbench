import {seamResult} from './topics/seam.mjs';
import {traceFrontiers as originalTrace} from './topics/frontiers.mjs';
import {measureSharedInput} from './micrograd.mjs';

export {seamResult, measureSharedInput};
// Learners may continue after a valid stopping point. A disabled Next button
// must not reveal the earliest sufficient stopping condition.
export const traceFrontiers = direct => originalTrace(direct, true);
export const STUDIO_KEY = 'learn-discovery-v1';
export const ACTIVITY_IDS = ['segment', 'routes', 'gradient'];
export const summaries = ['sum', 'best', 'prefix', 'suffix'];

export function summarize(xs) {
  let sum = 0, prefix = 0, suffix = 0, best = 0, ending = 0, tail = 0;
  for (const x of xs) { sum += x; prefix = Math.max(prefix, sum); ending = Math.max(0, ending + x); best = Math.max(best, ending); }
  for (const x of [...xs].reverse()) { tail += x; suffix = Math.max(suffix, tail); }
  return {sum, best, prefix, suffix};
}
export function mergeSummary(l, r) {
  return {sum:l.sum+r.sum, best:Math.max(l.best,r.best,l.suffix+r.prefix),
    prefix:Math.max(l.prefix,l.sum+r.prefix), suffix:Math.max(r.suffix,r.sum+l.suffix)};
}
// A public practice counterexample, not a held-out assessment. Compare the whole
// merged summary: storing just best/prefix/suffix fails at the NEXT merge.
export function challengeSummary(keys) {
  const pool = [];
  function build(xs, n) { if (xs.length) pool.push(xs); if (n) for (const x of [-2,0,2]) build([...xs,x],n-1); }
  build([],3);
  const buckets = new Map();
  for (const a of pool) {
    const sa = summarize(a), signature = keys.map(k=>sa[k]).join('/');
    for (const b of buckets.get(signature) || []) {
      for (const c of pool) for (const side of ['right','left']) {
        const ac = side==='right'?[...a,...c]:[...c,...a];
        const bc = side==='right'?[...b,...c]:[...c,...b];
        if (summarize(ac).best !== summarize(bc).best) return {a,b,c,side,sa,sb:summarize(b),aBest:summarize(ac).best,bBest:summarize(bc).best};
        // Expose failures that need a second surrounding interval.
        for (const d of [[2],[2,2],[2,2,2]]) {
          const ad = side==='right'?[...d,...ac]:[...ac,...d];
          const bd = side==='right'?[...d,...bc]:[...bc,...d];
          if (summarize(ad).best !== summarize(bd).best) return {a,b,c,d,side,sa,sb:summarize(b),aBest:summarize(ad).best,bBest:summarize(bd).best};
        }
      }
    }
    buckets.set(signature,[...(buckets.get(signature)||[]),a]);
  }
  return null;
}

export function defaultTrial(id) {
  return {prediction:'',reason:'',reflection:'',previous:'',invite:'question',help:0,revealed:false,finished:false,round:0,
    x:id==='segment'?3:2,h:0.1,weight:10,step:0,decision:'',fields:['sum','best'],operator:'assign',challenge:false};
}
export function emptyStudio() { return {version:1,last:'routes',trials:{},history:[],events:[],reduced:false}; }
const bounded = (v,allowed,fallback)=>allowed.includes(v)?v:fallback;
export function normalizeStudio(raw) {
  if (!raw || raw.version!==1 || !raw.trials || typeof raw.trials!=='object' || !Array.isArray(raw.events)) throw new Error('不兼容的实验存档');
  const state = emptyStudio();
  state.last=bounded(raw.last,ACTIVITY_IDS,'routes'); state.reduced=raw.reduced===true;
  for (const id of ACTIVITY_IDS) if(raw.trials[id]) {
    const r=raw.trials[id], t=defaultTrial(id);
    for (const key of ['prediction','reason','reflection','previous']) t[key]=typeof r[key]==='string'?r[key].slice(0,2000):'';
    for (const key of ['revealed','finished','challenge']) t[key]=r[key]===true;
    t.help=bounded(r.help,[0,1,2],0); t.round=Number.isInteger(r.round)&&r.round>=0?Math.min(r.round,1000):0;
    t.invite=bounded(r.invite,['plain','question'],'question');
    t.x=id==='segment'?(Number.isInteger(r.x)&&r.x>=-20&&r.x<=20?r.x:3):bounded(r.x,[-2,0,2],2);
    t.h=bounded(r.h,[1,0.1,0.001,-0.1],0.1); t.weight=bounded(r.weight,[8,9,10,13],10);
    t.step=Number.isInteger(r.step)?Math.max(0,Math.min(r.step,traceFrontiers(t.weight).length-1)):0;
    t.decision=bounded(r.decision,['stop','continue',''],'');
    t.fields=Array.isArray(r.fields)?summaries.filter(k=>r.fields.includes(k)):['sum','best'];
    t.operator=bounded(r.operator,['assign','add'],'assign'); state.trials[id]=t;
  }
  // Only our finite event schema is imported; never render imported HTML or run code.
  state.events=raw.events.filter(e=>e&&ACTIVITY_IDS.includes(e.id)&&typeof e.kind==='string'&&typeof e.at==='string')
    .map(e=>({id:e.id,kind:e.kind.slice(0,40),at:e.at.slice(0,40),help:bounded(e.help,[0,1,2],0),
      invite:bounded(e.invite,['plain','question'],'plain'),round:Number.isInteger(e.round)?e.round:0}));
  state.history=Array.isArray(raw.history)?raw.history.filter(e=>e&&ACTIVITY_IDS.includes(e.id)&&e.trial).map(e=>({id:e.id,
    trial:normalizeStudio({version:1,trials:{[e.id]:e.trial},events:[]}).trials[e.id]})):[];
  return state;
}

export function openStudioStore(storage) {
  let original, blocked=false, warning='', state=emptyStudio();
  try {original=storage().getItem(STUDIO_KEY); if(original!==null)state=normalizeStudio(JSON.parse(original));}
  catch {blocked=true;warning='无法读取实验记录，已暂停写入。请下载原始记录；本页仍可尝试和导出草稿。';}
  return {
    state,
    get warning(){return warning;},
    get raw(){return original;},
    save(next, {replaceUnreadable=false}={}) {
      if(blocked&&!(replaceUnreadable&&typeof original==='string'))return false;
      try {
        if(original===undefined||storage().getItem(STUDIO_KEY)!==original){warning='另一标签页已修改实验记录。写入暂停；请导出草稿，再刷新。';return false;}
        const serialized=JSON.stringify(next);storage().setItem(STUDIO_KEY,serialized);original=serialized;blocked=false;warning='';return true;
      }catch{warning='浏览器未能保存。请导出草稿后离开。';return false;}
    }
  };
}
