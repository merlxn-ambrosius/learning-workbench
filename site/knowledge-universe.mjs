import { escapeHtml as h } from './html.mjs';

const NS = 'http://www.w3.org/2000/svg';
const colors = ['#aab7ff','#f6c984','#7ce3ce','#e6a7cf','#a8d5ff','#d8b2ff','#a8dfa9'];
const anchors = [[-440,-65],[-442,187],[-220,-255],[-178,263],[35,-10],[345,-200],[430,160]];
const icons = {
  fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  in:'<path d="M5 12h14M12 5v14"/>', out:'<path d="M5 12h14"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  expand:'<circle cx="5" cy="12" r="2"/><circle cx="17" cy="5" r="2"/><circle cx="18" cy="18" r="2"/><path d="m7 11 8-5m-8 7 9 4"/>',
};
const icon = (key) => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+icons[key]+'</svg>';
const linkOK = href => typeof href === 'string' && (href.startsWith('#/') || href.startsWith('https://'));
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

function seed(text) {
  let value = 2166136261;
  for (const ch of text) value = Math.imul(value ^ ch.codePointAt(0),16777619);
  return value >>> 0;
}
function stars(count) {
  let state = 424242;
  const next = () => ((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  return Array.from({length:count},() => {
    const x=(next()*1000).toFixed(1), y=(next()*600).toFixed(1), r=(.45+next()**3*1.15).toFixed(2);
    return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" opacity="'+(.13+next()*.49).toFixed(2)+'"/>';
  }).join('');
}
const backdrop = '<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" class="uv-sky"><g fill="#d2dcff">'+stars(185)+'</g></svg>';

function regionAnchor(index) {
  if (index < anchors.length) return anchors[index];
  const angle=index*2.4, radius=620+Math.sqrt(index-anchors.length)*110;
  return [Math.cos(angle)*radius,Math.sin(angle)*radius*.72];
}

// All views crop these same course coordinates. Filters never run a second layout.
export function layoutUniverse(model) {
  const ids=[...new Set([...model.groups.map(g=>g.id), ...model.nodes.map(n=>n.groupId)])];
  const positions = new Map();
  const regions=ids.map((id,index)=>{
    const items=model.nodes.filter(n=>n.groupId===id);
    const [cx,cy]=regionAnchor(index);
    const rotation=(seed(String(id))%360)*Math.PI/180;
    const color=colors[index%colors.length];
    for (const [i,node] of items.entries()) {
      const radius=items.length===1 ? 0 : 44*Math.sqrt(i+.55);
      const theta=rotation+i*2.399963;
      positions.set(node.id,{x:cx+1.15*radius*Math.cos(theta),y:cy+.84*radius*Math.sin(theta),color,group:id});
    }
    const members=items.map(n=>positions.get(n.id));
    return {id,title:model.groups.find(g=>g.id===id)?.title || String(id),cx,cy,color,items:items.map(n=>n.id),
      labelY:members.length ? Math.min(...members.map(p=>p.y))-37 : cy-30,
      glow:80+Math.sqrt(items.length)*36};
  }).filter(g=>g.items.length);
  return {positions,regions};
}

export function frameUniverse(points,width,height,padding=45) {
  if (!points.length) return {x:0,y:0,k:1};
  const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
  const left=Math.min(...xs), right=Math.max(...xs), top=Math.min(...ys), bottom=Math.max(...ys);
  const k=Math.min(Math.max(30,width-padding*2)/Math.max(120,right-left),Math.max(35,height-padding*2)/Math.max(80,bottom-top));
  return {x:(left+right)/2,y:(top+bottom)/2,k:clamp(k,.09,3.3)};
}

export function zoomUniverseAt(camera,factor,anchor,width,height,minK,maxK) {
  const k=clamp(camera.k*factor,minK,maxK);
  const dx=anchor.x-width/2, dy=anchor.y-height/2;
  return {k,x:camera.x+dx/camera.k-dx/k,y:camera.y+dy/camera.k-dy/k};
}

export function localNeighborhood(model,id) {
  if (!model.nodes.some(n=>n.id===id)) return [];
  const ids=new Set([id]);
  for (const edge of model.edges) {
    if (edge.from===id) ids.add(edge.to);
    if (edge.to===id) ids.add(edge.from);
  }
  return model.nodes.filter(n=>ids.has(n.id)).map(n=>n.id);
}

function arc(a,b) {
  return 'M'+a.x+','+a.y+' L'+b.x+','+b.y;
}

export function renderUniverseThumbnail(model) {
  const {positions,regions}=layoutUniverse(model);
  if (!positions.size) return '';
  const points=[...positions.values()];
  const camera=frameUniverse(points,900,365,25);
  const project=p=>({x:(p.x-camera.x)*camera.k+450,y:(p.y-camera.y)*camera.k+182.5});
  const paths=model.edges.filter(e=>positions.has(e.from)&&positions.has(e.to)).map(e=>{
    const a=positions.get(e.from), b=positions.get(e.to);
    return '<path d="'+arc(project(a),project(b))+'" stroke="'+a.color+'" opacity=".48"/>';
  }).join('');
  const beacons=points.map(p=>{
    const v=project(p);
    return '<circle cx="'+v.x+'" cy="'+v.y+'" r="5.5" fill="'+p.color+'" opacity=".13"/><circle cx="'+v.x+'" cy="'+v.y+'" r="2.8" fill="'+p.color+'"/>';
  }).join('');
  const haze=regions.map(g=>{
    const p=project({x:g.cx,y:g.cy});
    return '<circle cx="'+p.x+'" cy="'+p.y+'" r="'+g.glow*camera.k*.8+'" fill="'+g.color+'" opacity=".08"/>';
  }).join('');
  return '<svg class="uv-thumb" aria-hidden="true" viewBox="0 0 900 365" preserveAspectRatio="xMidYMid meet"><g fill="#bacdf8" transform="scale(.9 .61)">'+stars(75)+'</g><g class="uv-thumb-glow">'+haze+'</g><g fill="none">'+paths+'</g>'+beacons+'</svg>';
}

const control=(action,label)=>'<button type="button" data-uv-action="'+action+'" aria-label="'+label+'" title="'+label+'">'+icon(action)+'</button>';
function panelHeader(model,opts) {
  if (opts.mode==='neighborhood') return '';
  return '<div class="uv-toolbar"><label>聚焦范围<select data-uv-scope><option value="">全部知识</option>'+
    model.scopes.map(s=>'<option value="'+h(s.id)+'"'+(s.id===opts.scopeId?' selected':'')+'>'+h(s.title)+'</option>').join('')+
    '</select></label><label>定位课程<select data-uv-locate></select></label><button type="button" data-uv-action="all">返回全图</button></div>';
}

export function renderKnowledgeUniverse(model, options={}) {
  const mode=options.mode || 'global';
  const opts={...options,mode};
  // Avoid exposing course bodies, private notes, or other unrelated data in the map configuration.
  const nodes=model.nodes.map(({id,title,description,href,groupId,status,children,childEdges})=>({
    id,title,description,href,groupId,status,
    children:(children || []).map(({id,title,href,description})=>({id,title,href,description})),childEdges:childEdges || [],
  }));
  const data={nodes,groups:model.groups,scopes:model.scopes,edges:model.edges};
  const serialized=JSON.stringify({model:data,options:opts}).replace(/</g,'\\u003c');
  const image=mode==='neighborhood'?'':'<img class="uv-galaxy" src="./assets/milky-way-eso0932a.jpg" alt="" aria-hidden="true" draggable="false">';
  const credit=mode==='neighborhood'?'':'<span class="uv-credit">星空摄影 <a href="https://www.eso.org/public/images/eso0932a/" target="_blank" rel="noopener noreferrer">ESO/S. Brunier</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></span>';
  const full=mode==='neighborhood' && linkOK(opts.fullHref) ? '<a class="uv-full" data-uv-full href="'+h(opts.fullHref)+'">'+icon('expand')+'在知识全图中展开 '+icon('arrow')+'</a>' : '';
  return '<section class="uv uv-'+mode+'" data-knowledge-universe aria-label="'+(mode==='neighborhood'?'本课程的前置和后续课程':'可交互的全域知识图')+'">'+panelHeader(data,opts)+
    '<div class="uv-space"><div class="uv-plane">'+image+backdrop+
    '<svg class="uv-chart" data-uv-stage tabindex="0" role="group" aria-label="课程依赖图，可用方向键平移，加减键缩放，Home 适应视图"></svg>'+
    '<div class="uv-view-info"><span data-uv-caption></span><span data-uv-count></span></div>'+
    '<div class="uv-hud"><output data-uv-scale aria-label="相对全图缩放比例"></output>'+control('out','缩小')+control('in','放大')+control('fit','适应当前视图')+'</div></div>'+
    '<div class="uv-legend"><span>先修 → 后续</span><span><i></i>必要前置</span><span><i class="uv-dash"></i>建议准备</span><span class="uv-hint">拖动平移 · 滚轮或双指缩放</span>'+credit+'</div></div>'+
    '<div data-uv-inspector class="uv-inspector"></div>'+full+
    '<script type="application/json" class="uv-config">'+serialized+'</script></section>';
}

function el(name,attrs={},text) {
  const element=document.createElementNS(NS,name);
  for (const [key,value] of Object.entries(attrs)) element.setAttribute(key,value);
  if (text!==undefined) element.textContent=text;
  return element;
}
function matchesScope(model,scopeId) {
  const scope=model.scopes.find(s=>s.id===scopeId);
  return scope ? new Set(scope.nodeIds) : new Set(model.nodes.map(n=>n.id));
}
function inspect(model,selection,expanded,childId,mode,homeId) {
  const n=model.nodes.find(n=>n.id===selection);
  if (!n) return '<p class="uv-empty">点选图上的课程，可查看前置、后续和学习入口。</p>';
  const child=n.children.find(c=>c.id===childId);
  const current=child || n;
  const open=linkOK(current.href) && (child || mode!=='neighborhood' || homeId!==n.id)
    ? '<a class="uv-open" data-uv-open href="'+h(current.href)+'"'+(current.href.startsWith('https://')?' target="_blank" rel="noopener noreferrer"':'')+'>'+(child?'进入学习节点':'进入课程')+' '+icon('arrow')+'</a>' : '';
  const expand=mode!=='neighborhood' && n.children.length ? (expanded ?
    '<button type="button" class="uv-expand" data-uv-action="collapse">收起课内节点</button>' :
    '<button type="button" class="uv-expand" data-uv-expand>'+icon('expand')+'展开课内节点（'+n.children.length+'）</button>') : '';
  const courseById=new Map(model.nodes.map(item=>[item.id,item]));
  const fromChild=expanded && child;
  const nodes=fromChild ? new Map(n.children.map(c=>[c.id,c])) : courseById;
  const edges=fromChild ? n.childEdges : model.edges;
  const id=fromChild ? child.id : n.id;
  function relations(backwards) {
    const matching=edges.filter(e=>(backwards?e.to:e.from)===id && nodes.has(backwards?e.from:e.to));
    return '<div class="uv-rel"><h4>'+(backwards?'先修准备':'接下来可学')+'</h4>'+
      (matching.length?'<ul>'+matching.map(e=>{
        const related=nodes.get(backwards?e.from:e.to);
        return '<li><button type="button" '+(fromChild?'data-uv-child-pick':'data-uv-pick')+'="'+h(related.id)+'">'+h(related.title)+'</button> <small>'+(e.kind==='required'?'前置':'建议')+'</small>'+
          (e.reason?'<p>'+h(e.reason)+'</p>':'')+'</li>';
      }).join('')+'</ul>':'<p>当前图中没有标注'+(backwards?'前置。':'后续。')+'</p>')+'</div>';
  }
  return '<div class="uv-detail-intro"><h3>'+h(current.title)+'</h3>'+
    (current.description?'<p>'+h(current.description)+'</p>':'')+
    '<div class="uv-detail-actions">'+open+expand+'</div></div>'+relations(true)+relations(false);
}

function childPoints(node,center) {
  const nodes=node.children || [];
  return new Map(nodes.map((n,i)=>{
    const angle=(i/nodes.length)*Math.PI*2-Math.PI/2;
    const radius=40+Math.sqrt(nodes.length)*5;
    return [n.id,{x:center.x+Math.cos(angle)*radius*1.09, y:center.y+Math.sin(angle)*radius*.80,color:center.color}];
  }));
}

function bindOne(host) {
  if (host.dataset.uvBound) return;
  host.dataset.uvBound='true';
  const {model,options}=JSON.parse(host.querySelector('.uv-config').textContent);
  const svg=host.querySelector('[data-uv-stage]');
  const scopeControl=host.querySelector('[data-uv-scope]');
  const locate=host.querySelector('[data-uv-locate]');
  const inspector=host.querySelector('[data-uv-inspector]');
  const caption=host.querySelector('[data-uv-caption]');
  const count=host.querySelector('[data-uv-count]');
  const scaleOutput=host.querySelector('[data-uv-scale]');
  const {positions,regions}=layoutUniverse(model);
  const nodes=new Map(model.nodes.map(n=>[n.id,n]));
  const homeId=options.mode==='neighborhood' ? options.selectedId : null;
  let selection=nodes.has(options.selectedId) ? options.selectedId : '';
  let scope=model.scopes.some(s=>s.id===options.scopeId) ? options.scopeId : '';
  let visible=new Set(homeId ? localNeighborhood(model,homeId) : matchesScope(model,scope));
  if (!visible.has(selection)) selection='';
  let expanded=false, childId='', subPositions=new Map(), frameTarget=null, returnCamera=null;
  let width=1000,height=510,camera={x:0,y:0,k:1},globalFit=1,dirty=0;
  const degree=new Map(model.nodes.map(n=>[n.id,0]));
  for (const e of model.edges) {
    degree.set(e.from,(degree.get(e.from)||0)+1); degree.set(e.to,(degree.get(e.to)||0)+1);
  }
  const regionById=new Map(regions.map(r=>[r.id,r]));
  // Portrait screens turn the same chart a quarter turn, using the longer dimension for its long axis.
  let rotated=false;
  const orient = p=>rotated ? {x:-p.y,y:p.x} : p;
  const projection = p=>{
    const placed=orient(p);
    return {x:(placed.x-camera.x)*camera.k+width/2,y:(placed.y-camera.y)*camera.k+height/2};
  };
  const markerId='uv-arrow-'+(homeId || options.scopeId || options.mode || 'global').replace(/[^\w-]/g,'');
  const defs=el('defs');
  const marker=el('marker',{id:markerId,viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:5.3,markerHeight:5.3,orient:'auto',markerUnits:'userSpaceOnUse'});
  marker.append(el('path',{d:'M0 0 8 4 0 8 2 4Z',fill:'#e3ebff'}));defs.append(marker);
  const mist=el('g',{'aria-hidden':'true'}), linkLayer=el('g',{'aria-hidden':'true'}), courseLayer=el('g'), regionLayer=el('g'), childLayer=el('g');
  svg.append(defs,mist,linkLayer,regionLayer,courseLayer,childLayer);
  const regionEls=new Map();
  for(const [i,r] of regions.entries()) {
    const gradientId=markerId+'-nebula-'+i;
    const grad=el('radialGradient',{id:gradientId});
    for (const [offset,opacity] of [[0,.17],[.39,.077],[1,0]]) grad.append(el('stop',{offset,'stop-color':r.color,'stop-opacity':opacity}));
    defs.append(grad);
    const haze=el('ellipse',{fill:'url(#'+gradientId+')'});
    const label=el('g',{'data-uv-group':r.id,class:'uv-region'});
    const dot=el('path',{d:'M-3 0 0-3 3 0 0 3Z',fill:r.color});
    label.append(dot,el('text',{x:10,y:4,fill:r.color},r.title));
    label.append(el('title',{},'聚焦 '+r.title));
    mist.append(haze);regionLayer.append(label);
    regionEls.set(r.id,{label,haze});
  }
  const edgeEls=model.edges.filter(e=>positions.has(e.from)&&positions.has(e.to)).map(edge=>{
    const path=el('path',{class:'uv-edge '+(edge.kind==='required'?'uv-required':'uv-suggested'),
      'data-uv-from':edge.from,'data-uv-to':edge.to,stroke:positions.get(edge.from).color});
    linkLayer.append(path);
    return {edge,path};
  });
  function pointElement(n,p,isChild) {
    const group=el('g',{class:'uv-point',role:'button',tabindex:'-1','aria-label':n.title,[isChild?'data-uv-child':'data-uv-node']:n.id});
    const target=el('circle',{r:15,fill:'transparent',class:'uv-hit'});
    const halo=el('circle',{r:10,fill:p.color,opacity:.15,class:'uv-halo'});
    const band=el('circle',{r:10,fill:'none',stroke:p.color,'stroke-width':1.35,class:'uv-ring'});
    const core=el('circle',{r:isChild?3.1:3.1+Math.min(2,(degree.get(n.id)||0)*.23),fill:p.color});
    const cross=el('path',{d:'M-8 0h16M0-8v16',stroke:p.color,'stroke-width':.72,class:'uv-spark'});
    const label=el('text',{class:'uv-name',x:12,y:4},n.title);
    group.append(el('title',{},n.title),target,halo,core,cross,band,label);
    return {n,p,group,label};
  }
  const nodeEls=model.nodes.map(n=>{
    const item=pointElement(n,positions.get(n.id),false); courseLayer.append(item.group); return item;
  });
  let childEls=[], childPaths=[];
  function buildChildren() {
    childLayer.replaceChildren();childEls=[];childPaths=[];subPositions=new Map();
    const n=nodes.get(selection);
    if (!expanded || !n) return;
    subPositions=childPoints(n,positions.get(n.id));
    // Fine spokes indicate membership. Only explicit prerequisite edges carry arrows.
    for(const point of subPositions.values()){
      const line=el('path',{class:'uv-member-link',fill:'none'});
      childLayer.append(line);childPaths.push({line,from:positions.get(n.id),to:point});
    }
    for(const e of n.childEdges){
      if (!subPositions.has(e.from)||!subPositions.has(e.to)) continue;
      const line=el('path',{class:'uv-child-edge '+(e.kind==='required'?'uv-required':'uv-suggested'),fill:'none','marker-end':'url(#'+markerId+')'});
      childLayer.append(line);childPaths.push({line,from:subPositions.get(e.from),to:subPositions.get(e.to),directed:true});
    }
    for(const child of n.children){
      const item=pointElement(child,subPositions.get(child.id),true);childEls.push(item);childLayer.append(item.group);
    }
  }
  function optionsForVisible() {
    if(!locate) return;
    locate.innerHTML='<option value="">选择课程…</option>'+model.nodes.filter(n=>visible.has(n.id)).map(n=>'<option value="'+h(n.id)+'">'+h(n.title)+'</option>').join('');
  }
  function updatePanel() {
    inspector.innerHTML=inspect(model,selection,expanded,childId,options.mode,homeId);
    if(locate) locate.value=selection;
    if(scopeControl) scopeControl.value=scope;
    const allBtn=host.querySelector('[data-uv-action="all"]');
    if(allBtn) allBtn.disabled=!(scope||selection||expanded);
    const where=homeId ? '课程邻域' : (model.scopes.find(s=>s.id===scope)?.title || '知识全图');
    const current=nodes.get(selection);
    caption.textContent=expanded ? current.title+' · 课内展开' : current ? where+' / '+current.title : where;
    const edgeCount=edgeEls.filter(({edge})=>visible.has(edge.from)&&visible.has(edge.to)).length;
    count.textContent=expanded ? subPositions.size+' 个课内节点' : visible.size+' 门课程 · '+edgeCount+' 条关系';
    host.dataset.uvActiveScope=scope;host.dataset.uvSelected=selection;host.dataset.uvExpanded=String(expanded);
  }
  function viewportFit(ids) {
    const world=[...ids].map(id=>positions.get(id)).filter(Boolean);
    if (expanded) world.push(...subPositions.values());
    const padding=width<520 || homeId ? 34 : 65;
    return frameUniverse(world.map(orient),width,height,padding);
  }
  function fit() {
    camera=viewportFit(expanded ? [selection] : frameTarget || visible);
    if (expanded) camera.k=Math.min(camera.k,width/154);
    schedule();
  }
  function shortenedLine(from,to) {
    const d=Math.hypot(to.x-from.x,to.y-from.y) || 1;
    const gap=Math.min(9,d/3);
    return arc({x:from.x+(to.x-from.x)*gap/d,y:from.y+(to.y-from.y)*gap/d},
      {x:to.x-(to.x-from.x)*gap/d,y:to.y-(to.y-from.y)*gap/d});
  }
  function paint() {
    dirty=0;
    const ratio=camera.k/globalFit;
    const w=width,hgt=height;
    scaleOutput.textContent=Math.round(100*ratio)+'%';
    const connected=new Set();
    for(const {edge,path} of edgeEls) {
      const drawn=visible.has(edge.from)&&visible.has(edge.to)&&!expanded;
      path.style.display=drawn?'':'none';
      if(!drawn) continue;
      const a=projection(positions.get(edge.from)), b=projection(positions.get(edge.to));
      const incident=edge.from===selection||edge.to===selection;
      if(incident){connected.add(edge.from);connected.add(edge.to);}
      path.setAttribute('d',shortenedLine(a,b));
      path.classList.toggle('uv-linked',incident);
      path.classList.toggle('uv-dim',!!selection&&!incident);
      if(incident || homeId || (!selection && ratio>1.6)) path.setAttribute('marker-end','url(#'+markerId+')');
      else path.removeAttribute('marker-end');
    }
    const boxes=[];
    const fits=(b)=>b.x>=3&&b.y>=3&&b.x+b.w<w-3&&b.y+b.h<hgt-3 &&
      !boxes.some(c=>b.x<c.x+c.w+4&&b.x+b.w+4>c.x&&b.y<c.y+c.h+3&&b.y+b.h+3>c.y);
    for(const r of regions) {
      const {label,haze}=regionEls.get(r.id), on=r.items.some(id=>visible.has(id));
      const p=projection({x:r.cx,y:r.cy});
      const lp=rotated ? {x:p.x,y:Math.min(...r.items.map(id=>projection(positions.get(id)).y))-16} : projection({x:r.cx,y:r.labelY});
      haze.style.display=on?'':'none';haze.setAttribute('cx',p.x);haze.setAttribute('cy',p.y);
      haze.setAttribute('rx',Math.min(700,Math.max(68,r.glow*camera.k*1.8)));
      haze.setAttribute('ry',Math.min(420,Math.max(45,r.glow*camera.k*1.05)));
      const box={x:lp.x-8,y:lp.y-12,w:r.title.length*12+20,h:18};
      const show=on&&!homeId&&!expanded&&(ratio<1.65||scope)&&fits(box);
      label.style.display=show?'':'none';
      if(show){label.setAttribute('transform','translate('+lp.x+' '+lp.y+')');boxes.push(box);}
    }
    for(const rec of childPaths) {
      const a=projection(rec.from),b=projection(rec.to);
      rec.line.setAttribute('d',rec.directed ? shortenedLine(a,b) : arc(a,b));
    }
    const ordered=[];
    const first=selection || [...visible][0];
    for(const item of [...nodeEls,...childEls]) {
      const child=item.group.hasAttribute('data-uv-child');
      const selected=child ? item.n.id===childId : item.n.id===selection;
      const p=projection(item.p);
      const present=child || (visible.has(item.n.id)&&(!expanded||selected));
      item.group.style.display=present?'':'none';
      if(!present)continue;
      item.group.setAttribute('transform','translate('+p.x+' '+p.y+')');
      item.group.setAttribute('aria-pressed',String(selected));
      item.group.setAttribute('tabindex', (child || homeId || item.n.id===first)?'0':'-1');
      item.group.classList.toggle('uv-selected',selected);
      item.group.classList.toggle('uv-unrelated',!child&&!!selection&&!selected&&!connected.has(item.n.id));
      item.group.classList.toggle('uv-major',(degree.get(item.n.id)||0)>=4);
      item.label.style.display='none';
      if(p.x<4||p.x>w-4||p.y<4||p.y>hgt-4) continue;
      ordered.push({item,p,child,selected,priority:(selected?1000:0)+(child?150:0)+(connected.has(item.n.id)?100:0)+(degree.get(item.n.id)||0)});
    }
    ordered.sort((a,b)=>b.priority-a.priority);
    const firstOfRegion=new Set();
    for(const {item,p,child,selected} of ordered) {
      const limited=!scope&&!homeId&&!child&&!expanded&&ratio<1.45&&!selected&&!connected.has(item.n.id);
      if(limited&&firstOfRegion.has(item.p.group))continue;
      const txt=item.n.title;
      const cw=Array.from(txt).reduce((sum,c)=>sum+(/[\x00-\x7F]/u.test(c)?7.2:12.5),0);
      const offsets=[[12,3],[-cw-12,3],[-cw/2,20],[-cw/2,-12]];
      for(const [dx,dy] of offsets) {
        const box={x:p.x+dx-1,y:p.y+dy-12,w:cw+2,h:15};
        if(!fits(box)) continue;
        item.label.setAttribute('x',dx);item.label.setAttribute('y',dy);item.label.style.display='';
        boxes.push(box);firstOfRegion.add(item.p.group);break;
      }
    }
  }
  function schedule() {
    svg.dataset.zoom=camera.k.toFixed(4);svg.dataset.centerX=camera.x.toFixed(2);svg.dataset.centerY=camera.y.toFixed(2);
    if(!dirty) dirty=requestAnimationFrame(paint);
  }
  function syncLocation() {
    if(homeId) return;
    const [path, query] = location.hash.split('?');
    if(path!=='#/maps'&&!path.startsWith('#/block/'))return;
    const params=new URLSearchParams(query);
    if(path==='#/maps') {
      if(scope)params.set('scope',scope);else params.delete('scope');
    }
    if(selection)params.set('node',selection);else params.delete('node');
    const suffix=params.toString(), next=path+(suffix?'?'+suffix:'');
    if(next!==location.hash) {
      try {history.replaceState(history.state,'',next);}
      catch(error){if(error.name!=='SecurityError')throw error;}
    }
  }
  function changed() {buildChildren();updatePanel();schedule();syncLocation();}
  function selectCourse(id,center=false) {
    if(!nodes.has(id)) return;
    if(!visible.has(id)){
      if(homeId) return;
      if (options.mode==='scope') {location.hash='/maps?node='+encodeURIComponent(id);return;}
      scope='';visible=matchesScope(model,'');optionsForVisible();
    }
    selection=id;expanded=false;childId='';frameTarget=null;
    if(center){
      const p=orient(positions.get(id));
      camera={x:p.x,y:p.y,k:Math.max(camera.k,globalFit*2.15)};
    }
    changed();
  }
  function selectChild(id) {
    if(!subPositions.has(id))return;
    childId=id;updatePanel();schedule();
  }
  function chooseScope(id) {
    if(homeId || (id&&!model.scopes.some(s=>s.id===id)))return;
    if (options.mode==='scope' && options.scopeId!==id) {
      location.hash = '/maps'+(id?'?scope='+encodeURIComponent(id):'');
      return;
    }
    scope=id;selection='';expanded=false;childId='';frameTarget=null;
    visible=matchesScope(model,scope);optionsForVisible();changed();fit();
  }
  function expand() {
    if(!nodes.get(selection)?.children.length)return;
    returnCamera={...camera};expanded=true;childId='';changed();fit();
  }
  function collapse() {expanded=false;childId='';if(returnCamera)camera=returnCamera;returnCamera=null;changed();}
  function zoom(factor,anchor={x:width/2,y:height/2}) {
    camera=zoomUniverseAt(camera,factor,anchor,width,height,globalFit*.45,Math.max(8,globalFit*12));
    schedule();
  }
  function resized() {
    const bounds=svg.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    const first=!svg.hasAttribute('viewBox');
    if(!first&&Math.abs(bounds.width-width)<.5&&Math.abs(bounds.height-height)<.5)return;
    const previous=globalFit;
    width=bounds.width;height=bounds.height;
    const portrait=width<460;
    if(portrait!==rotated){
      camera=portrait?{x:-camera.y,y:camera.x,k:camera.k}:{x:camera.y,y:-camera.x,k:camera.k};
      rotated=portrait;
    }
    svg.setAttribute('viewBox','0 0 '+width+' '+height);
    globalFit=viewportFit(positions.keys()).k;
    if(first) fit();
    else {camera.k*=globalFit/previous;schedule();}
  }
  optionsForVisible();changed();
  if(selection&&!homeId&&!scope)frameTarget=localNeighborhood(model,selection);
  resized();
  if(typeof ResizeObserver!=='undefined') {
    const observer=new ResizeObserver(resized);observer.observe(svg);
  }
  const toggle=(action)=>{
    if(action==='all')chooseScope('');
    if(action==='fit')fit();
    if(action==='in')zoom(1.45);
    if(action==='out')zoom(1/1.45);
    if(action==='collapse')collapse();
  };
  host.addEventListener('change',event=>{
    if(event.target===scopeControl)chooseScope(scopeControl.value);
    if(event.target===locate&&locate.value)selectCourse(locate.value,true);
  });
  host.addEventListener('click',event=>{
    const action=event.target.closest('[data-uv-action],[data-uv-expand],[data-uv-pick],[data-uv-child-pick]');
    if(!action)return;
    if(action.hasAttribute('data-uv-expand'))expand();
    else if(action.hasAttribute('data-uv-pick')){
      const id=action.dataset.uvPick;
      // An off-crop relation is still usable from a course page.
      if(homeId&&!visible.has(id)){
        const href=nodes.get(id)?.href;
        if(linkOK(href)) location.href=href;
      }else selectCourse(id,true);
    }
    else if(action.hasAttribute('data-uv-child-pick'))selectChild(action.dataset.uvChildPick);
    else toggle(action.dataset.uvAction);
    if(event.detail===0&&!action.isConnected) {
      if(expanded&&!childId) childEls[0]?.group.focus();
      else if(selection) {
        const heading=inspector.querySelector('h3');
        if(heading){heading.tabIndex=-1;heading.focus();}
      }
    }
  });
  function activate(pick) {
    if(!pick)return;
    if(pick.hasAttribute('data-uv-node')){
      const id=pick.dataset.uvNode;
      if(expanded&&id===selection){childId='';updatePanel();schedule();}
      else selectCourse(id);
    }
    else if(pick.hasAttribute('data-uv-child'))selectChild(pick.dataset.uvChild);
    else {
      const group=regionById.get(pick.dataset.uvGroup);
      if(!group)return;
      const ref=model.scopes.find(s=>s.id===group.id);
      if(ref)chooseScope(ref.id);
      else {frameTarget=group.items;fit();}
    }
  }
  const pickSelector='[data-uv-node],[data-uv-child],[data-uv-group]';
  let cancelClick=false;
  svg.addEventListener('click',event=>{if(!cancelClick)activate(event.target.closest(pickSelector));});
  svg.addEventListener('keydown',event=>{
    const key=event.key;
    if(['Enter',' '].includes(key)){
      const target=event.target.closest(pickSelector);
      if(target){event.preventDefault();activate(target);}return;
    }
    if(!['+','=','-','Home','ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Escape'].includes(key))return;
    event.preventDefault();
    if(key==='Home')fit();
    else if(key==='Escape'&&expanded)collapse();
    else if(key==='+'||key==='=')zoom(1.4);
    else if(key==='-')zoom(1/1.4);
    else {
      const delta=60/camera.k;
      camera.x+=key==='ArrowRight'?delta:key==='ArrowLeft'?-delta:0;
      camera.y+=key==='ArrowDown'?delta:key==='ArrowUp'?-delta:0;
      schedule();
    }
  });
  const local=event=>{const b=svg.getBoundingClientRect();return {x:event.clientX-b.left,y:event.clientY-b.top};};
  svg.addEventListener('wheel',event=>{
    event.preventDefault();
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?height:1);
    zoom(Math.exp(-clamp(delta,-280,280)*.002),local(event));
  },{passive:false});
  const pointers=new Map();
  let down=null;
  svg.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    const p=local(event);
    if(!pointers.size){cancelClick=false;down=p;}
    else {cancelClick=true;svg.classList.add('uv-dragging');}
    pointers.set(event.pointerId,p);
    // Capture on the original target so a click still resolves to its actual course node.
    event.target.setPointerCapture(event.pointerId);
  });
  const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  svg.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;
    const old=pointers.get(event.pointerId),next=local(event);
    const other=[...pointers].find(([id])=>id!==event.pointerId)?.[1];
    pointers.set(event.pointerId,next);
    if(other) {
      const oldMid=midpoint(old,other),newMid=midpoint(next,other);
      const distance=Math.hypot(old.x-other.x,old.y-other.y);
      const nextDistance=Math.hypot(next.x-other.x,next.y-other.y);
      if(distance>2&&nextDistance>2)zoom(nextDistance/distance,oldMid);
      camera.x-=(newMid.x-oldMid.x)/camera.k;camera.y-=(newMid.y-oldMid.y)/camera.k;
    } else {
      if(!cancelClick && down && Math.hypot(next.x-down.x,next.y-down.y)<4)return;
      cancelClick=true;svg.classList.add('uv-dragging');
      camera.x-=(next.x-old.x)/camera.k;camera.y-=(next.y-old.y)/camera.k;
    }
    schedule();
  });
  function release(event) {
    pointers.delete(event.pointerId);
    if(!pointers.size){svg.classList.remove('uv-dragging');down=null;}
  }
  svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);svg.addEventListener('lostpointercapture',release);
}
export function bindKnowledgeUniverses(root=document) {
  for(const host of root.querySelectorAll('[data-knowledge-universe]')) bindOne(host);
}
