import {listCourses, listKnowledge, getCourse, getLegacyEntry, getKnowledge, knowledgeDependencies, courseOccurrences, knowledgeHref} from './content-model.mjs';
import {escapeHtml as h} from './html.mjs';
import {learningIcon} from './learning-icons.mjs';
import {legacyUnits} from './knowledge-catalog.mjs';

// One layout for every lens. Course membership is deliberately not a dependency.
const anchors = {
  'mit-6-0001': [150, 170], 'mit-6-102': [150, 465],
  'competitive-programmers-handbook': [150, 770],
  'zero-to-hero': [550, 140], 'learn-optimization-path': [1050, 170],
  'mit-15-401': [1370, 455], 'mit-18-01sc': [550, 865],
  'mit-18-06': [950, 900], 'mit-res-6-012': [1370, 900],
  'local-derivative': [515, 450], 'computational-graph': [950, 450],
  'autodiff-gradient-accumulation': [1250, 620],
};
anchors['mit-15-401']=[1370,350];
const bridges=legacyUnits.filter(unit=>['assignment-bridge','paper-bridge'].includes(unit.kind));
const shortTitles = {
  'mit-6-0001': 'Python 程序设计', 'mit-6-102': '软件构造',
  'competitive-programmers-handbook': '竞赛算法手册',
  'zero-to-hero': '神经网络 · Zero to Hero', 'learn-optimization-path': '从求导到参数更新',
  'mit-15-401': '金融理论', 'mit-18-01sc': '单变量微积分',
  'mit-18-06': '线性代数', 'mit-res-6-012': '概率论',
};
const iconIds = {'mit-6-0001':'code','mit-6-102':'system','mit-15-401':'finance','mit-18-01sc':'calculus','mit-18-06':'matrix','mit-res-6-012':'probability','local-derivative':'calculus','computational-graph':'graph','autodiff-gradient-accumulation':'neural'};
const subjects = [['','全部领域'],['computing','计算机科学'],['math','数学'],['ai','人工智能'],['finance','金融']];
const kindLabel = kind => ({course:'来源主干','curated-path':'LEARN 选编',knowledge:'知识点'})[kind] || kind;
const readOption = (options, key) => options?.get ? options.get(key) : options?.[key];
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const attr = value => h(String(value ?? ''));
const courseHref = id => '#/course/' + encodeURIComponent(id);

/** Canonical identities only: CPH chapters are never promoted to courses. */
export function buildKnowledgeMapModel() {
  const courses = listCourses().map(course => ({
    id:course.id, kind:course.kind, title:course.title, label:shortTitles[course.id] || course.title,
    description:course.description, subjectIds:[...course.subjectIds], href:courseHref(course.id),
    author:course.author, chapterCount:course.chapters.length, source:course.source,
  }));
  const knowledge = listKnowledge().map(item => ({
    id:item.id, kind:'knowledge', title:item.title, label:item.title, description:item.summary,
    subjectIds:[...item.subjectIds], href:knowledgeHref(item.id), version:item.version,
  }));
  const nodes = [...courses,...knowledge].map((node,index) => {
    // Stable ID-derived fallback; adding a lens can never rearrange a node.
    const hash = [...node.id].reduce((n,ch)=>(Math.imul(n,31)+ch.charCodeAt(0))>>>0,7);
    const [x,y] = anchors[node.id] || [1700+(hash%4)*340,120+Math.floor(hash/4)%4*250];
    return {...node,x,y};
  });
  const ids = new Set(nodes.map(node=>node.id));
  return {
    nodes,
    edges:knowledgeDependencies.filter(edge=>ids.has(edge.from)&&ids.has(edge.to)).map(edge=>({...edge})),
    occurrences:courseOccurrences.map(item=>({...item})),
  };
}

export function resolveMapTarget(id, model=buildKnowledgeMapModel()) {
  const key=String(id || '');
  if(model.nodes.some(node=>node.id===key))return {nodeId:key,chapterId:null,legacyId:null};
  const knowledge=getKnowledge(key);
  if(knowledge)return {nodeId:knowledge.id,chapterId:null,legacyId:null};
  const legacy=getLegacyEntry(key);
  if(legacy?.parentCourseId)return {nodeId:legacy.parentCourseId,chapterId:legacy.chapterId || null,legacyId:key};
  return {nodeId:null,chapterId:null,legacyId:legacy?.id || null};
}

export function mapLensNodes(model, subjectId='') {
  return subjectId ? model.nodes.filter(node=>node.subjectIds.includes(subjectId)) : [...model.nodes];
}

export function fitMapCamera(nodes, width, height, padding=100) {
  if(!nodes.length)return {x:760,y:520,k:1};
  const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);
  const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
  const k=clamp(Math.min(Math.max(80,width-padding*2)/Math.max(280,right-left),Math.max(80,height-padding*2)/Math.max(220,bottom-top)),.16,1.35);
  return {x:(left+right)/2,y:(top+bottom)/2,k};
}

/** Zoom keeps the world point beneath the pointer fixed. */
export function zoomMapAt(camera, factor, point, width, height) {
  const k=clamp(camera.k*factor,.16,2.4);
  const dx=point.x-width/2,dy=point.y-height/2;
  return {k,x:camera.x+dx/camera.k-dx/k,y:camera.y+dy/camera.k-dy/k};
}

function nodeButton(node, selected) {
  const mark=iconIds[node.id] || node.id;
  const detail=node.kind==='knowledge' ? '可在多门课程复用' : node.kind==='curated-path' ? '原创选编路径' : node.chapterCount ? `${node.chapterCount} 章 · ${node.author}` : `${node.author} · 原课目录`;
  return `<button type="button" class="km-node km-${attr(node.kind)}" data-km-node="${attr(node.id)}" data-x="${node.x}" data-y="${node.y}" aria-pressed="${selected===node.id}" aria-label="${attr(kindLabel(node.kind)+'：'+node.title)}" style="left:${node.x}px;top:${node.y}px">${learningIcon(mark)}<span class="km-node-copy"><span class="km-node-kind">${kindLabel(node.kind)}</span><strong>${h(node.label)}</strong><small>${h(detail)}</small></span></button>`;
}

function relationRows(model,id) {
  const related=model.edges.filter(edge=>edge.from===id||edge.to===id);
  if(!related.length)return '';
  return `<section class="km-related"><h3>知识依赖</h3>${related.map(edge=>{
    const incoming=edge.to===id,other=model.nodes.find(node=>node.id===(incoming?edge.from:edge.to));
    return `<article><span class="km-relation-label">${incoming?'前置知识':'后续知识'} · ${edge.kind==='required'?'必要依赖':'建议准备'}</span><button type="button" data-km-select="${attr(other.id)}">${h(other.title)} ${incoming?'↖':'↗'}</button><p>${h(edge.reason)}</p></article>`;
  }).join('')}</section>`;
}

function chapterCard(course,chapter) {
  if(!chapter)return '';
  const chapterRoute=courseHref(course.id)+'?chapter='+encodeURIComponent(chapter.id);
  return `<section class="km-chapter-card" data-km-chapter-detail="${attr(chapter.id)}"><span class="km-eyebrow">第 ${chapter.number} 章 · 属于本课程</span><h3>${h(chapter.title)}</h3><p>${h(chapter.description || '')}</p><a class="km-primary" href="${attr(chapterRoute)}">查看这一章 <span aria-hidden="true">↗</span></a>${chapter.source?.url?`<a class="km-text-link" href="${attr(chapter.source.url)}" target="_blank" rel="noopener noreferrer">原始材料 ↗</a>`:''}</section>`;
}

function inspectContent(model,selected,chapterId) {
  const node=model.nodes.find(item=>item.id===selected);
  const bridge=bridges.find(unit=>unit.id===selected);
  if(bridge)return `<span class="km-eyebrow">${bridge.kind==='assignment-bridge'?'作业补桥':'论文专题'} · 站内活动</span><h2>${h(bridge.title)}</h2><p>${h(bridge.description)}</p><a class="km-primary" href="${attr(courseHref(bridge.id))}">打开这个专题 ↗</a><p class="km-coverage">这是围绕原始材料的补充学习单元；不计入完整课程数量。</p><section class="km-bridge-activities"><h3>从一项活动开始</h3>${bridge.lessons.map(item=>`<a href="${attr(item.href)}"><strong>${h(item.title)}</strong><small>${h(item.description)}</small><span aria-hidden="true">↗</span></a>`).join('')}</section><a class="km-text-link" href="${attr(bridge.source.url)}" target="_blank" rel="noopener noreferrer">${h(bridge.source.label)} ↗</a>`;
  if(!node)return `<div class="km-inspector-welcome"><span class="km-eyebrow">找到你的下一站</span><h2>让关系，变得清楚。</h2><p>选一门完整课程，展开章节；或选一个知识点，查看它在不同课程中的位置。</p><div class="km-shape-key"><i class="km-key-course"></i><span>来源主干</span><i class="km-key-knowledge"></i><span>共享知识点</span></div><p class="km-inspector-note">箭头表示学习依赖，点开知识点可以查看原因。课程和章节可在目录中展开。</p><button type="button" class="km-primary" data-km-select="zero-to-hero">从神经网络开始 ↗</button></div>`;
  if(node.kind==='knowledge') {
    const knowledge=getKnowledge(node.id);
    const appearances=model.occurrences.filter(item=>item.knowledgeId===node.id);
    return `<span class="km-eyebrow">共享知识点 · v${h(knowledge.version)}</span><h2>${h(node.title)}</h2><p>${h(node.description)}</p><a class="km-primary" href="${attr(node.href)}">打开知识点 ↗</a>${relationRows(model,node.id)}<section class="km-appearances"><h3>在这些课程中学习</h3><p class="km-inspector-note">同一个知识点，各自保留课程上下文。</p>${appearances.map(item=>{
      const course=getCourse(item.courseId),chapter=course.chapters.find(ch=>ch.id===item.chapterId);
      return `<a href="${attr(knowledgeHref(node.id,{courseId:item.courseId,occurrenceId:item.id}))}"><strong>${h(course.subtitle||course.title)}</strong><small>${h(chapter?.title||'')} · ${item.extensions.length?'含课程扩展':'默认讲解'}</small><span aria-hidden="true">↗</span></a>`;
    }).join('')}</section>`;
  }
  const course=getCourse(node.id),chapter=course.chapters.find(item=>item.id===chapterId);
  const occurrenceIds=[...new Set(model.occurrences.filter(item=>item.courseId===course.id).map(item=>item.knowledgeId))];
  return `<span class="km-eyebrow">${kindLabel(course.kind)} · ${h(course.author)}</span><h2>${h(course.subtitle||course.title)}</h2>${course.subtitle?`<p class="km-original-title">${h(course.title)}</p>`:''}<p>${h(course.description)}</p><a class="km-primary" href="${attr(courseHref(course.id))}">查看完整课程 ↗</a><p class="km-coverage">${h(course.coverage.label)}</p>${chapterCard(course,chapter)}${occurrenceIds.length?`<section class="km-shared"><h3>已收录的知识点</h3>${occurrenceIds.map(id=>`<button type="button" data-km-select="${attr(id)}"><i class="km-key-knowledge"></i>${h(getKnowledge(id).title)} <span aria-hidden="true">↗</span></button>`).join('')}<p class="km-inspector-note">课程包含这些知识点；它们之间的箭头才表示依赖。</p></section>`:''}${course.chapters.length?`<details class="km-chapters" ${chapter?'open':''}><summary>章节目录 <span>${course.chapters.length} 章</span></summary><p class="km-inspector-note">这里按原课/原书阅读次序列出，不是知识依赖。</p><ol>${course.chapters.map(ch=>`<li><button type="button" data-km-chapter="${attr(ch.id)}" aria-current="${ch.id===chapterId?'true':'false'}"><span>${String(ch.number).padStart(2,'0')}</span>${h(ch.title)}</button></li>`).join('')}</ol></details>`:`<a class="km-text-link" href="${attr(course.source.url)}" target="_blank" rel="noopener noreferrer">在原站浏览完整目录 ↗</a>`}`;
}

function inspect(model,selected,chapterId){return inspectContent(model,selected,chapterId)+`<nav class="km-bridge-nav" aria-label="既有专题与补桥"><h3>专题与补桥</h3><p class="km-inspector-note">保留原来的学习入口，分别标明材料范围。</p>${bridges.map(unit=>`<button type="button" data-km-select="${attr(unit.id)}" aria-pressed="${selected===unit.id}"><span>${unit.kind==='assignment-bridge'?'作业补桥':'论文专题'}</span>${h(unit.title)} <b aria-hidden="true">↗</b></button>`).join('')}</nav>`;}

export function renderKnowledgeMap(options={}) {
  const model=buildKnowledgeMapModel();
  const target=resolveMapTarget(readOption(options,'node') || readOption(options,'course') || readOption(options,'courseId'),model);
  if(!target.nodeId&&bridges.some(unit=>unit.id===target.legacyId))target.nodeId=target.legacyId;
  const subject=String(readOption(options,'subject') || readOption(options,'subjectId') || '');
  const chapter=readOption(options,'chapter') || target.chapterId || '';
  return `<section class="km" data-knowledge-map data-km-selected="${attr(target.nodeId||'')}" data-km-chapter-id="${attr(chapter)}" data-km-subject="${attr(subjects.some(([id])=>id===subject)?subject:'')}" aria-label="课程与共享知识地图"><header class="km-page-head"><span class="km-eyebrow">COURSES / CONNECTIONS</span><h1>知识地图</h1><p>从完整课程走向具体知识。选择一站，看看它连接着什么。</p></header><div class="km-toolbar"><div class="km-lenses" role="group" aria-label="按领域浏览">${subjects.map(([id,title])=>`<button type="button" data-km-filter="${id}" aria-pressed="${subject===id}">${title}</button>`).join('')}</div><label class="km-locate">定位节点<select data-km-locate aria-label="直接定位课程或知识点"><option value="">选择课程或知识点…</option><optgroup label="完整来源主干与选编路径">${model.nodes.filter(n=>n.kind!=='knowledge').map(n=>`<option value="${attr(n.id)}">${h(n.label)}</option>`).join('')}</optgroup><optgroup label="共享知识点">${model.nodes.filter(n=>n.kind==='knowledge').map(n=>`<option value="${attr(n.id)}">${h(n.title)}</option>`).join('')}</optgroup></select></label></div><div class="km-workspace"><div class="km-map"><div class="km-map-top"><span><b data-km-count>${model.nodes.filter(n=>n.kind==='course').length} 来源主干 · ${model.nodes.filter(n=>n.kind==='curated-path').length} 选编 · ${model.nodes.filter(n=>n.kind==='knowledge').length} 知识点</b><small>每个起点，都可以直接进入</small></span><button type="button" data-km-action="all">全图 <span aria-hidden="true">↗</span></button></div><div class="km-stage" data-km-stage tabindex="0" role="group" aria-label="可平移缩放地图。方向键平移，加减键缩放，Home适应视图。节点上方向键切换，回车选择。"><div class="km-scene" data-km-scene><div class="km-region km-region-computing" style="left:0;top:75px;width:295px;height:800px"><span>代码与算法</span></div><div class="km-region km-region-learning" style="left:390px;top:30px;width:850px;height:700px"><span>从变化到学习</span></div><div class="km-region km-region-math" style="left:375px;top:760px;width:1170px;height:240px"><span>数学与应用</span></div><svg class="km-edges" viewBox="0 0 1650 1050" aria-hidden="true"><defs><marker id="km-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 9 5 1 9"/></marker></defs>${model.edges.map(edge=>{const from=model.nodes.find(n=>n.id===edge.from),to=model.nodes.find(n=>n.id===edge.to);return `<path data-km-edge="${attr(edge.from+'--'+edge.to)}" data-from="${attr(edge.from)}" data-to="${attr(edge.to)}" class="km-edge km-edge-${attr(edge.kind)}" d="M${from.x+75},${from.y} L${to.x-92},${to.y}" marker-end="url(#km-arrow)"/>`;}).join('')}</svg>${model.nodes.map(node=>nodeButton(node,target.nodeId)).join('')}</div><div class="km-map-hud"><button type="button" data-km-action="out" aria-label="缩小">−</button><output data-km-zoom aria-label="缩放比例">100%</output><button type="button" data-km-action="in" aria-label="放大">+</button><button type="button" data-km-action="fit" aria-label="适应当前范围">⌖</button></div><span class="km-pan-hint">拖动平移 · 双指缩放</span></div><div class="km-map-legend"><span><i class="km-key-course"></i>来源主干</span><span><i class="km-key-path"></i>选编路径</span><span><i class="km-key-knowledge"></i>共享知识点</span><span class="km-edge-key">实线：必要 · 虚线：建议 →</span></div></div><aside class="km-inspector" data-km-inspector aria-label="选中节点详情">${inspect(model,target.nodeId,chapter)}</aside></div><p class="km-status" data-km-status role="status" aria-live="polite">${target.nodeId?'已定位：'+h(model.nodes.find(n=>n.id===target.nodeId)?.title||''):'选择一个节点，查看原课、章节与真实依赖。'}</p></section>`;
}

export function renderLocalKnowledge(courseId) {
  const model=buildKnowledgeMapModel(),target=resolveMapTarget(courseId,model),course=getCourse(target.nodeId);
  if(!course)return '';
  const ids=[...new Set(model.occurrences.filter(item=>item.courseId===course.id).map(item=>item.knowledgeId))];
  return `<div class="km-local"><span class="km-eyebrow">一门课程，多处连接</span><div class="km-local-body">${learningIcon(iconIds[course.id]||course.id)}<div><strong>${h(course.subtitle||course.title)}</strong><p>${ids.length?ids.map(id=>h(getKnowledge(id).title)).join(' · '):h(course.author+' · '+(course.chapters.length?course.chapters.length+' 章':'完整原课目录'))}</p></div></div><a href="#/maps?node=${attr(courseId)}">在知识地图中定位 ↗</a></div>`;
}

export function bindKnowledgeMap(root=document) {
  const maps=[...(root.matches?.('[data-knowledge-map]')?[root]:[]),...root.querySelectorAll('[data-knowledge-map]')];
  maps.forEach(map=>{
    if(map.dataset.kmBound)return;map.dataset.kmBound='true';
    const model=buildKnowledgeMapModel(),stage=map.querySelector('[data-km-stage]'),scene=map.querySelector('[data-km-scene]'),inspector=map.querySelector('[data-km-inspector]');
    let selected=map.dataset.kmSelected||'',chapter=map.dataset.kmChapterId||'',subject=map.dataset.kmSubject||'',camera={x:760,y:520,k:1};
    let initialized=false,drag=null,clickBlockUntil=0;const pointers=new Map();
    const size=()=>({width:stage.clientWidth,height:stage.clientHeight});
    const visible=()=>mapLensNodes(model,subject);
    function remember(){try{sessionStorage.setItem('learn-workbench.knowledge-map.view.v1',JSON.stringify({selected,chapter,subject,camera}));}catch{}}
    function draw(){
      const {width,height}=size();scene.style.transform=`translate(${width/2-camera.x*camera.k}px,${height/2-camera.y*camera.k}px) scale(${camera.k})`;
      const mini=camera.k<.4;map.classList.toggle('km-overview',mini);map.dataset.kmZoom=String(camera.k);map.dataset.kmSelected=selected;map.dataset.kmChapterId=chapter;map.dataset.kmSubject=subject;
      const included=new Set(visible().map(node=>node.id));
      for(const button of scene.querySelectorAll('[data-km-node]')){button.hidden=!included.has(button.dataset.kmNode);button.style.transform=`translate(-50%,-50%) scale(${1/camera.k})`;button.setAttribute('aria-pressed',String(selected===button.dataset.kmNode));}
      for(const path of scene.querySelectorAll('[data-km-edge]')){
        path.toggleAttribute('hidden',!(included.has(path.dataset.from)&&included.has(path.dataset.to)));
        path.classList.toggle('km-edge-active',path.dataset.from===selected||path.dataset.to===selected);
        const from=model.nodes.find(n=>n.id===path.dataset.from),to=model.nodes.find(n=>n.id===path.dataset.to),dx=to.x-from.x,dy=to.y-from.y;
        const radiusX=(mini?44:99)/camera.k,radiusY=(mini?31:41)/camera.k;
        const t=Math.min(radiusX/Math.max(.1,Math.abs(dx)),radiusY/Math.max(.1,Math.abs(dy)),.42);
        path.setAttribute('d',`M${from.x+dx*t},${from.y+dy*t} L${to.x-dx*t},${to.y-dy*t}`);
      }
      map.querySelector('[data-km-zoom]').value=Math.round(camera.k*100)+'%';
      const nodes=visible();map.querySelector('[data-km-count]').textContent=`${nodes.filter(n=>n.kind==='course').length} 来源主干 · ${nodes.filter(n=>n.kind==='curated-path').length} 选编 · ${nodes.filter(n=>n.kind==='knowledge').length} 知识点`;
      for(const button of map.querySelectorAll('[data-km-filter]'))button.setAttribute('aria-pressed',String(button.dataset.kmFilter===subject));
      for(const option of map.querySelector('[data-km-locate]').options)option.disabled=!!option.value&&!included.has(option.value);
      map.querySelector('[data-km-locate]').value=included.has(selected)?selected:'';
    }
    function announce(text){map.querySelector('[data-km-status]').textContent=text;}
    function updateURL(id){if(globalThis.location?.hash?.startsWith('#/maps')){const params=new URLSearchParams();if(id)params.set('node',id);if(subject)params.set('subject',subject);try{history.replaceState(null,'','#/maps'+(params.size?'?'+params:''));}catch{}}}
    function select(id,{focus=false,recenter=true}={}){
      const target=resolveMapTarget(id,model);
      const bridge=bridges.find(unit=>unit.id===target.legacyId);
      if(!target.nodeId&&bridge){selected=bridge.id;chapter='';inspector.innerHTML=inspect(model,selected,chapter);draw();remember();updateURL(selected);announce('已选择补充单元：'+bridge.title);return;}
      if(!target.nodeId)return;
      const node=model.nodes.find(item=>item.id===target.nodeId);
      if(subject&&!node.subjectIds.includes(subject))subject='';
      selected=node.id;chapter=target.chapterId||'';
      inspector.innerHTML=inspect(model,selected,chapter);
      if(recenter){camera={x:node.x,y:node.y,k:Math.max(.75,camera.k)};}
      draw();remember();updateURL(chapter||selected);announce('已选择'+kindLabel(node.kind)+'：'+node.title+(chapter?'，已展开章节':''));
      if(focus)scene.querySelector(`[data-km-node="${selected}"]`)?.focus({preventScroll:true});
    }
    function fit(){const {width,height}=size();camera=fitMapCamera(visible(),width,height,width<500?55:105);draw();remember();}
    function zoom(factor,point){const {width,height}=size();camera=zoomMapAt(camera,factor,point||{x:width/2,y:height/2},width,height);draw();remember();}
    map.addEventListener('click',event=>{
      if(Date.now()<clickBlockUntil){event.preventDefault();return;}
      const node=event.target.closest('[data-km-node],[data-km-select]');if(node){select(node.dataset.kmNode||node.dataset.kmSelect);return;}
      const chapterButton=event.target.closest('[data-km-chapter]');if(chapterButton){chapter=chapterButton.dataset.kmChapter;inspector.innerHTML=inspect(model,selected,chapter);map.dataset.kmChapterId=chapter;remember();updateURL(chapter);announce('已展开章节：'+getCourse(selected).chapters.find(ch=>ch.id===chapter)?.title);inspector.querySelector('[data-km-chapter-detail]')?.scrollIntoView({block:'nearest',behavior:'instant'});return;}
      const filter=event.target.closest('[data-km-filter]');if(filter){subject=filter.dataset.kmFilter;if(!visible().some(n=>n.id===selected)){selected='';chapter='';inspector.innerHTML=inspect(model,'','');}fit();updateURL(chapter||selected);announce((subjects.find(([id])=>id===subject)?.[1]||'全部领域')+'，位置保持不变');return;}
      const action=event.target.closest('[data-km-action]')?.dataset.kmAction;
      if(action==='in')zoom(1.25);if(action==='out')zoom(.8);if(action==='fit')fit();if(action==='all'){subject='';selected='';chapter='';inspector.innerHTML=inspect(model,'','');fit();updateURL('');announce('已返回全图');}
    });
    map.querySelector('[data-km-locate]').addEventListener('change',event=>{if(event.target.value)select(event.target.value);});
    stage.addEventListener('wheel',event=>{event.preventDefault();const box=stage.getBoundingClientRect();zoom(Math.exp(-event.deltaY*.0015),{x:event.clientX-box.left,y:event.clientY-box.top});},{passive:false});
    stage.addEventListener('keydown',event=>{
      const button=event.target.closest('[data-km-node]');
      if(['+','=','-','_','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')fit();else zoom(event.key==='+'||event.key==='='?1.25:.8);return;}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();
      if(button){
        const from=model.nodes.find(n=>n.id===button.dataset.kmNode),dx=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0,dy=event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0;
        const candidates=visible().filter(n=>n.id!==from.id&&(dx?(n.x-from.x)*dx>10:(n.y-from.y)*dy>10)).map(n=>({node:n,score:Math.hypot(n.x-from.x,n.y-from.y)+Math.abs(dx?n.y-from.y:n.x-from.x)*1.5})).sort((a,b)=>a.score-b.score);
        if(candidates[0]){const next=candidates[0].node;camera={...camera,x:next.x,y:next.y};draw();scene.querySelector(`[data-km-node="${next.id}"]`)?.focus({preventScroll:true});}
      }else{const amount=70/camera.k;if(event.key==='ArrowLeft')camera.x-=amount;if(event.key==='ArrowRight')camera.x+=amount;if(event.key==='ArrowUp')camera.y-=amount;if(event.key==='ArrowDown')camera.y+=amount;draw();remember();}
    });
    stage.addEventListener('pointerdown',event=>{
      if(event.pointerType==='mouse'&&event.button!==0)return;
      const node=event.target.closest('[data-km-node]');
      if(event.target.closest('[data-km-action],output')||(node&&event.pointerType!=='touch'))return;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,nodeId:node?.dataset.kmNode});stage.setPointerCapture(event.pointerId);
      drag={x:event.clientX,y:event.clientY,camera:{...camera},moved:false};stage.classList.add('km-dragging');
    });
    stage.addEventListener('pointermove',event=>{
      if(!pointers.has(event.pointerId)||!drag)return;
      const old=[...pointers.values()];pointers.set(event.pointerId,{...pointers.get(event.pointerId),x:event.clientX,y:event.clientY});const next=[...pointers.values()];
      if(next.length===2&&old.length===2){
        const oldDistance=Math.hypot(old[0].x-old[1].x,old[0].y-old[1].y),distance=Math.hypot(next[0].x-next[1].x,next[0].y-next[1].y);
        const oldMid={x:(old[0].x+old[1].x)/2,y:(old[0].y+old[1].y)/2},mid={x:(next[0].x+next[1].x)/2,y:(next[0].y+next[1].y)/2},box=stage.getBoundingClientRect(),{width,height}=size();
        if(oldDistance>4)camera=zoomMapAt(camera,distance/oldDistance,{x:oldMid.x-box.left,y:oldMid.y-box.top},width,height);
        camera.x-=(mid.x-oldMid.x)/camera.k;camera.y-=(mid.y-oldMid.y)/camera.k;drag.moved=true;
      }else{const dx=event.clientX-drag.x,dy=event.clientY-drag.y;camera={...camera,x:drag.camera.x-dx/camera.k,y:drag.camera.y-dy/camera.k};if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;}
      draw();
    });
    function endPointer(event){const point=pointers.get(event.pointerId),tap=event.type==='pointerup'&&!drag?.moved&&pointers.size===1&&point?.nodeId;pointers.delete(event.pointerId);if(drag?.moved)clickBlockUntil=Date.now()+120;if(pointers.size===1){const next=[...pointers.values()][0];drag={x:next.x,y:next.y,camera:{...camera},moved:true};}else if(!pointers.size){drag=null;stage.classList.remove('km-dragging');}if(tap)select(tap);remember();}
    stage.addEventListener('pointerup',endPointer);stage.addEventListener('pointercancel',endPointer);
    const observer=new ResizeObserver(()=>{
      if(!initialized){initialized=true;const node=model.nodes.find(n=>n.id===selected);if(node){camera={x:node.x,y:node.y,k:stage.clientWidth<500?.8:1};draw();}else fit();}
      else draw();
    });observer.observe(stage);
    // Navigation state is optional; explicit URLs always win. No learner records are read.
    if(!selected&&!subject){try{const saved=JSON.parse(sessionStorage.getItem('learn-workbench.knowledge-map.view.v1')||'null');if(saved&&model.nodes.some(n=>n.id===saved.selected)&&[saved.camera?.x,saved.camera?.y,saved.camera?.k].every(Number.isFinite)&&saved.camera.k>=.16&&saved.camera.k<=2.4){selected=saved.selected;chapter=typeof saved.chapter==='string'?saved.chapter:'';subject=subjects.some(([id])=>id===saved.subject)?saved.subject:'';camera=saved.camera;inspector.innerHTML=inspect(model,selected,chapter);initialized=true;draw();}}catch{}}
    draw();
  });
}
