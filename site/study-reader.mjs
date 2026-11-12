import {escapeHtml as h, external} from './html.mjs';
import {choices,comparisons} from './study-choices.mjs';
import {tracks, studyRoute, studyPath, connections, chapterId} from './study-index.mjs';
import {renderFrontierLab, bindFrontiers} from './topics/frontiers.mjs';
import {renderSeamLab, bindSeamLab} from './topics/seam.mjs';

const fetchTrack={
  'shortest-paths':()=>import('./topics/shortest-paths.mjs'),
  'dynamic-programming':()=>import('./topics/dynamic-programming.mjs'),
  'segment-tree':()=>import('./topics/segment-tree.mjs'),
  'bit-manipulation':()=>import('./topics/bit-manipulation.mjs'),
};
const cache=new Map();
export function studyShelf(only=tracks) {
  return `<section class="study-shelf"><h2>算法精读</h2><div>${only.map(t=>`<a href="#/${studyPath(t.id)}"><strong>${h(t.title)} <span aria-hidden="true">↗</span></strong><span>${h(t.question)}</span></a>`).join('')}</div></section>`;
}
const readingHref=(track,unit,proof)=>'#/'+studyPath(track,unit)+(proof?'?view=proof':'');
const links=sources=>sources.map(s=>external(s.url,s.title,'study-ref')).join('');
function alternatives(t,u){
  const key=t.id+'/'+u.id;
  return connections.filter(([a,b])=>a===key||b===key).map(([a,b,reason])=>{
    const to=a===key?b:a, other=studyRoute('topic/'+to);
    return `<li><a href="#/topic/${to}">${h(other.track.title)} · ${h(other.row[1])} →</a><p>${h(reason)}</p></li>`;
  }).join('');
}
function topicHome(track,topic){
  const items=track.units.map(([id,label])=>
    `<a class="study-choice" data-study-unit href="${readingHref(track.id,id,false)}"><strong>${h(label)} <span aria-hidden="true">→</span></strong><span>${h(choices[track.id+'/'+id])}</span></a>`).join('');
  return `<article class="study-reader study-topic-home"><nav class="crumbs" aria-label="当前位置"><a href="#/topics">算法专题</a><i aria-hidden="true">/</i><span class="study-subject">${h(track.title)}</span></nav>
    <header class="study-header"><h1>${h(track.title)}</h1><p>${h(topic.summary)}</p></header>
    <div class="study-contrast"><h2>${h(track.question)}</h2><p>${h(comparisons[track.id])}</p></div>
    <section class="study-choice-list"><h2>按问题选择变式</h2><div>${items}</div></section>
    <details class="study-sources"><summary>专题参考资料</summary><div>${links(topic.sources)}</div></details></article>`;
}
function overview(t,u,isSeam){
  const opening=isSeam ? renderSeamLab() : `<h2>这个方法解决什么问题？</h2><p>${h(u.overview)}</p>
    <div class="study-case"><h3>走一个例子</h3><p>${h(u.example)}</p></div>
    ${t.id==='shortest-paths'&&u.id==='bidirectional'?renderFrontierLab():''}
    <div class="study-challenge"><h3>自己试一遍</h3><p>${h(u.challenge)}</p></div>`;
  const derivation = isSeam ? `<details class="seam-derivation"><summary>从接缝推导合并规则</summary>
    <p>取拼起来以后最好的一段。它只有三个位置可去：完全在左，完全在右，或者横跨接缝。在第三种位置，连续性把左边的终点和右边的起点钉在了接缝两侧。</p>
    <p>于是可以分别挑最好的左后缀和右前缀，再加起来。前两种位置已经有各自的最佳值。这就给出了整段的最佳值。现在把拼好的大段再当作下一次的左孩子：它自己还能报出最佳后缀吗？试着写出这个合并式，再和伪代码对照。</p></details>` : '';
  return `<section class="study-text">${opening}${derivation}
    ${isSeam?'<details class="seam-derivation"><summary>对照自己的伪代码</summary>':'<h2>伪代码</h2>'}<pre class="study-pseudo" tabindex="0" aria-label="伪代码"><code>${h(u.pseudo)}</code></pre>${isSeam?'</details>':''}
    <details class="study-solution"><summary>展开 C++17 参考实现</summary><pre tabindex="0" aria-label="C++17 参考实现"><code>${h(u.code)}</code></pre></details>
    ${isSeam?`<p class="seam-transfer"><strong>自己改一条规则</strong> ${h(u.challenge)}</p>`:''}
    <a class="study-switch" href="${readingHref(t.id,u.id,true)}">为什么这样做一定正确？阅读证明 →</a></section>`;
}
function proof(t,u){
  return `<section class="study-text"><h2>命题与不变量</h2><div class="study-case"><p>${h(u.invariant)}</p></div>
    <h2>证明</h2><ol class="study-proof">${u.proof.map(p=>'<li>'+h(p)+'</li>').join('')}</ol>
    <h3>复杂度</h3><p>${h(u.cost)}</p><h3>适用边界</h3><p>${h(u.boundary)}</p>
    <a class="study-switch" href="${readingHref(t.id,u.id,false)}">回看例子与伪代码 →</a></section>`;
}
function article(track,topic,unit,isProof){
  const t=track, u=unit, rel=alternatives(t,u);
  const isSeam=t.id==='segment-tree' && u.id==='boundary-summary';
  const nav=t.units.map(([id,short])=>`<a href="${readingHref(t.id,id,isProof)}" ${id===u.id?'aria-current="page"':''}>${h(short)}</a>`).join('');
  const options=t.units.map(([id,short])=>`<option value="${readingHref(t.id,id,isProof)}" ${id===u.id?'selected':''}>${h(short)}</option>`).join('');
  const refs=[...new Map([...u.sources,...topic.sources].map(s=>[s.url,s])).values()];
  return `<article class="study-reader${isSeam?' study-seam-reader':''}" data-study-reader>
    <nav class="crumbs" aria-label="当前位置">${isSeam?'':'<a href="#/block/algorithms">竞技编程与算法</a><i aria-hidden="true">/</i>'}<a href="#/topic/${t.id}">${h(t.title)} · 专题总览</a><i aria-hidden="true">/</i><a href="#/course/${chapterId(t.units.find(row=>row[0]===u.id)[2])}">原书章节与星图</a></nav>
    <header class="study-header"><div>${isSeam?'':`<span class="study-subject">${h(t.title)}</span>`}<h1>${h(u.title)}</h1></div></header>
    <div class="study-layout">${isSeam?'':`<aside class="study-outline"><h2>${h(t.title)} · 知识点</h2><nav aria-label="本专题知识点">${nav}</nav></aside>
    <label class="study-mobile">选择知识点<select data-study-select>${options}</select></label>`}
    <div class="study-body"><nav class="study-tabs" aria-label="阅读方式">
    <a href="${readingHref(t.id,u.id,false)}" ${!isProof?'aria-current="page"':''}>概览与实现</a><a href="${readingHref(t.id,u.id,true)}" ${isProof?'aria-current="page"':''}>证明与边界</a></nav>
    ${isProof?proof(t,u):overview(t,u,isSeam)}
    <section class="study-judges"><h2>去评测站练习</h2><ul>${u.problems.map(p=>`<li>${external(p.url,p.title,'study-task')}<p>${h(p.focus)}</p></li>`).join('')}</ul></section>
    ${rel?`<section class="study-related"><h2>同一个想法还出现在哪里？</h2><ul>${rel}</ul></section>`:''}
    <details class="study-sources"><summary>教材与参考资料</summary><div>${links(refs)}</div></details>
    ${isSeam?`<details class="study-sources seam-units"><summary>线段树的其他知识点</summary><nav aria-label="本专题知识点">${nav}</nav></details>` : ''}</div></div></article>`;
}
export function studyPage(path,params,onReady){
  if(path==='topics')return '<header class="page-intro"><h1>算法专题</h1><p>选一个你想自己推出来的知识点。</p></header>'+studyShelf();
  const dest=studyRoute(path);
  if(!dest)return null;
  const {track,row}=dest;
  let state=cache.get(track.id);
  if(!state){
    state={};cache.set(track.id,state);
    fetchTrack[track.id]().then(module=>{state.data=module.default;},()=>{state.failed=true;}).finally(()=>onReady(track.id));
  }
  if(state.failed)return '<h1>专题暂时没有载入</h1><button class="btn btn-outline" data-study-retry>重新载入</button>';
  if(!state.data)return '<p role="status">正在载入'+h(track.title)+'…</p>';
  if(path===studyPath(track.id))return topicHome(track,state.data);
  return article(track,state.data,state.data.units.find(u=>u.id===row[0]),params.get('view')==='proof');
}
export function bindStudy(root,path,retry) {
  root.querySelector('[data-study-select]')?.addEventListener('change',e=>{location.hash=e.target.value;});
  root.querySelector('[data-study-retry]')?.addEventListener('click',()=>{cache.delete(studyRoute(path).track.id);retry();});
  bindFrontiers(root);
  bindSeamLab(root);
}
