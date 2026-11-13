// Learner-owned research notes. Separate from existing v1 learning records and
// Studio trials; importing this notebook never replaces either of those stores.
export const FIELDBOOK_KEY = 'learn-fieldbook-v1';
export const emptyFieldbook = () => ({version:1, entries:[], drafts:{}, last:null});
const text = (x,n=3000) => typeof x==='string' ? x.slice(0,n) : '';
export function safeLearningRoute(value) {
  return typeof value==='string' && /^#\/(?:course|knowledge|topic|learn|lab|practice|studio|atlas\/node)\/[a-zA-Z0-9/_-]+(?:\?[a-zA-Z0-9%=&._-]*)?$/.test(value) && value.length<500 ? value : null;
}
function context(raw) {
  const route=safeLearningRoute(raw?.route);
  return route ? {route,title:text(raw.title,150),course:text(raw.course,80)} : null;
}
export function normalizeFieldbook(raw) {
  if (!raw || raw.version!==1 || !Array.isArray(raw.entries) || !raw.drafts || typeof raw.drafts!=='object' || Array.isArray(raw.drafts)) throw new Error('不是兼容的研究簿备份');
  if (raw.entries.length>3000 || Object.keys(raw.drafts).length>500) throw new Error('记录过多，请保留原文件并分开整理');
  const result=emptyFieldbook();
  result.last=context(raw.last);
  for(const row of raw.entries) {
    const ref=context(row);
    if(!ref || !text(row.id,100) || !text(row.body).trim()) throw new Error('研究簿中有无法读取的条目');
    result.entries.push({...ref,id:text(row.id,100),body:text(row.body),next:text(row.next,600),kind:['question','finding','artifact'].includes(row.kind)?row.kind:'finding',at:text(row.at,40)});
  }
  for(const [route,draft] of Object.entries(raw.drafts)) {
    if(safeLearningRoute(route) && draft && typeof draft==='object') result.drafts[route]={body:text(draft.body),next:text(draft.next,600),kind:['question','finding','artifact'].includes(draft.kind)?draft.kind:'finding'};
  }
  return result;
}
export function openFieldbook(storage) {
  let original, invalid=false, state=emptyFieldbook(), warning='';
  try {original=storage().getItem(FIELDBOOK_KEY);if(original!==null)state=normalizeFieldbook(JSON.parse(original));}
  catch {invalid=true;warning='研究簿暂时无法读取。原记录不会被覆盖；可下载原文或导出本页草稿。';}
  const write=(next,{replaceUnreadable=false}={})=>{
    if(invalid&&!replaceUnreadable)return false;
    try {
      const target=storage();
      if(original===undefined || target.getItem(FIELDBOOK_KEY)!==original) {warning='另一页面已改变研究簿，已暂停写入。请先导出本页草稿，再刷新。';return false;}
      const normalized=normalizeFieldbook(next),serialized=JSON.stringify(normalized);
      target.setItem(FIELDBOOK_KEY,serialized);original=serialized;invalid=false;warning='';return true;
    } catch {warning='研究簿未能保存到本机。请导出草稿后再离开。';return false;}
  };
  return {
    get state(){return state;},get warning(){return warning;},get raw(){return original;},get unreadable(){return invalid;},
    remember(ref) {if(!context(ref))return false;if(JSON.stringify(state.last)===JSON.stringify(context(ref)))return true;state={...state,last:context(ref)};return write(state);},
    draft(route,draft) {if(!safeLearningRoute(route))return false;state={...state,drafts:{...state.drafts,[route]:draft}};return write(state);},
    add(ref,draft,at=new Date().toISOString()) {
      if(!context(ref) || !text(draft.body).trim())return false;
      if(state.entries.length>=3000){warning='研究簿已有 3000 条，请先导出归档。';return false;}
      const entry={...context(ref),...draft,id:'note-'+at+'-'+state.entries.length,at};
      const drafts={...state.drafts};delete drafts[ref.route];
      const next=normalizeFieldbook({...state,last:context(ref),entries:[...state.entries,entry],drafts});
      // Keep the draft until the durable write succeeds; failed writes must not
      // display a success card or silently empty the learner's text fields.
      if(!write(next))return false;
      state=next;return true;
    },
    restore(raw) {const next=normalizeFieldbook(raw);if(!write(next,{replaceUnreadable:true}))return false;state=next;return true;},
  };
}
