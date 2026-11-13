import {subjects,courses,blocks,courseEdges,coursesForSubject,blocksForSubject} from './knowledge-catalog.mjs';
import {tracks,studyRoute} from './study-index.mjs';
import {renderKnowledgeUniverse} from './knowledge-universe.mjs';
import {renderKnowledgeGraph} from './knowledge-graphs.mjs';
import {universe} from './universe-model.mjs';
import {resultList} from './workbench.mjs';
import {escapeHtml as h} from './html.mjs';
import {normalizeFieldbook} from './fieldbook.mjs';
import {normalizeStudio,STUDIO_KEY} from './discovery-model.mjs';

const byId=new Map(courses.map(c=>[c.id,c]));
const subjectNames={math:'MATHEMATICS',computing:'COMPUTER SCIENCE',ai:'ARTIFICIAL INTELLIGENCE',finance:'FINANCE',physics:'PHYSICS',engineering:'ENGINEERING'};
const subjectQuestions={math:'变化之中，什么保持不变？',computing:'一个想法，怎样成为可靠的程序？',ai:'机器的学习，从哪里开始？',finance:'不确定之中，怎样作出判断？',physics:'世界运行的规律，如何被发现？',engineering:'把理解变成能工作的东西。'};
const arrow='<span aria-hidden="true">↗</span>';
const button=(href,label,secondary=false)=>`<a class="world-button ${secondary?'secondary':''}" href="${h(href)}">${label} ${arrow}</a>`;
const kicker=(n,label)=>`<span class="world-kicker"><i>${n}</i> ${label}</span>`;
const search=(q='',label='搜索课程、主题、原课编号')=>`<form role="search" id="catalog-search-form" class="catalog-search world-search"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg><input type="search" maxlength="150" id="catalog-query" aria-label="搜索课程" placeholder="${label}" value="${h(q)}" autocomplete="off"><button type="submit">搜索</button></form>`;

export function fieldMark() {return '<svg viewBox="0 0 40 40" aria-hidden="true" fill="none"><path d="M5 29 20 5l15 24-15 7Z" stroke="currentColor" stroke-width="1.5"/><path d="m11 27 9-15 9 15-9 4Z" stroke="currentColor"/><path d="M20 5v31M5 29h30" stroke="currentColor" opacity=".45"/><circle cx="20" cy="23" r="3.2" fill="currentColor"/></svg>';}
function contourArt() {
  return Array.from({length:19},(_,i)=>{
    const rx=34+i*12,ry=21+i*8,cx=345-i*1.3,cy=200+i*.7;
    return `<path d="M ${cx-rx} ${cy} C ${cx-rx-45} ${cy-ry}, ${cx-70} ${cy-ry-40}, ${cx+rx*.46} ${cy-ry} S ${cx+rx+53} ${cy+ry*.1}, ${cx+rx*.72} ${cy+ry} S ${cx-rx*.85} ${cy+ry+30}, ${cx-rx} ${cy} Z"/>`;
  }).join('');
}
const lenses={
  learning:{label:'从变化到学习',tag:'数学 × 人工智能',nodes:[['calculus',99,270],['python',126,112],['micrograd',328,197],['kl',513,106]],focus:'micrograd',question:'同一个输入出现两次，梯度会怎样？',caption:'从变化率到自己的求导器。',action:'#/course/micrograd'},
  algorithms:{label:'从问题到算法',tag:'计算机科学',nodes:[['cph-12',108,160],['cph-13',319,240],['cph-09',483,120],['cph-07',130,314]],focus:'cph-13',question:'两边已经相遇，为什么还不能停？',caption:'在图、状态与边界之间寻找关系。',action:'#/course/cph-13'},
  systems:{label:'从程序到系统',tag:'计算机科学 × 人工智能',nodes:[['python',105,246],['contracts',304,128],['agent',496,233]],focus:'agent',question:'程序处理了一个回答，就等于理解了吗？',caption:'把模糊的回复变成可检查的规则。',action:'#/course/agent'},
};
function terrain(lens) {
  const nodes=lens.nodes,points=new Map(nodes.map(([id,x,y])=>[id,{x,y}]));
  const lines=courseEdges.filter(e=>points.has(e.from)&&points.has(e.to)).map(e=>{
    const a=points.get(e.from),b=points.get(e.to);
    return `<path class="terrain-dependency ${e.kind}" d="M${a.x} ${a.y} Q${(a.x+b.x)/2} ${Math.min(a.y,b.y)-30} ${b.x} ${b.y}" marker-end="url(#terrain-arrow)"><title>${h(e.reason)}</title></path>`;
  }).join('');
  return `<div class="terrain-plate"><div class="terrain-caption"><span>关系切片 / ${h(lens.tag)}</span><span aria-hidden="true">+ 01 : 06</span></div><svg class="terrain-art" viewBox="0 0 620 400" role="group" aria-label="${h(lens.label)}的精选课程关系示意，非全图坐标；选择课程节点可打开课程"><defs><marker id="terrain-arrow" viewBox="0 0 10 10" refX="17" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="m0 0 10 5-10 5" fill="#4a6e5e"/></marker></defs><g class="terrain-contours" aria-hidden="true">${contourArt()}</g><g class="terrain-grid" aria-hidden="true"><path d="M20 80h580M20 320h580M100 30v335M520 30v335"/><path d="M28 40h16m-8-8v16M576 358h16m-8-8v16"/></g>${lines}${nodes.map(([id,x,y])=>`<a href="#/course/${id}" aria-label="打开${h(byId.get(id).title)}"><g class="terrain-node ${id===lens.focus?'selected':''}" transform="translate(${x} ${y})"><circle r="${id===lens.focus?17:8}"/><circle class="terrain-core" r="3"/><text y="${id===lens.focus?37:28}" text-anchor="middle">${h(byId.get(id).title)}</text></g></a>`).join('')}</svg><div class="terrain-bottom"><span>${h(lens.caption)}</span><a href="#/maps?node=${lens.focus}">在全图定位 ${arrow}</a></div></div>`;
}
function subjectArt(id) {
 const paths={math:'M24 70Q60-30 96 70M24 45Q60 110 96 45M60 15v70M20 55h80',computing:'m20 37 40-22 40 22-40 22Z M20 52l40 22 40-22M20 67l40 22 40-22M60 59v30',ai:'M20 28 60 18 96 43 74 82 30 77 20 28 74 82 60 18 30 77 96 43 20 28',finance:'M22 85V60h13v25M44 85V40h13v45M66 85V50h13v35M88 85V15h13v70',physics:'M12 52q24-62 48 0t48 0M12 52q24 62 48 0t48 0M12 52h96',engineering:'M15 80 37 25 61 80 85 25 108 80H15M37 25h48M15 80 61 25 108 80M61 25v55'};
 return `<svg viewBox="0 0 120 100" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3"><path d="${paths[id]}"/><circle cx="60" cy="52" r="3" fill="currentColor"/></svg>`;
}
function subjectTiles() {
 return subjects.map((s,i)=>`<a class="subject-card field-subject subject-${s.id}" href="#/subject/${s.id}"><div class="field-subject-top"><span>0${i+1}</span>${arrow}</div><div class="field-subject-art">${subjectArt(s.id)}</div><h3>${h(s.title)}</h3><small>${subjectNames[s.id]}</small><p>${subjectQuestions[s.id]}</p><span class="subject-availability">${coursesForSubject(s.id).length?'探索课程与关系':'尚未收录 · 查看规划'}</span></a>`).join('');
}
function resume(book,last) {
 const ref=book.state.last || (last?learningContext(last.replace(/^#\//,''),new URLSearchParams()):null);
 if(!ref)return `<div class="world-return empty-return"><span class="return-icon" aria-hidden="true">⌁</span><div><b>你的下一页，现在还是空白。</b><p>在课程里留下一条发现，它会成为下次回来的起点。</p></div><a href="#/journal">打开研究簿 ${arrow}</a></div>`;
 const note=[...book.state.entries].reverse().find(e=>e.route===ref.route),draft=book.state.drafts[ref.route];
 return `<div class="world-return"><span class="return-icon" aria-hidden="true">↶</span><div><span class="world-kicker">接着上次的线索</span><b>${h(ref.title)}</b><p>${h(draft?.next||note?.next||draft?.body||note?.body||'回到原来的活动，继续你的观察和推导。')}</p></div>${button(ref.route,'继续探索')}<a class="return-notes" href="#/journal">查看研究簿</a></div>`;
}
function home(options,book,last) {
 const lensId=Object.hasOwn(lenses,options.get('lens'))?options.get('lens'):'learning',lens=lenses[lensId],returning=Boolean(book.state.last||last);
 return `<div class="world-home">${returning?resume(book,last):''}<section class="world-hero"><div class="hero-copy">${kicker('↟','LEARN · 开放的知识原野')}<h1 id="workbench-title">世界很大。<br>从一个<span>好奇</span>开始。</h1><p class="hero-intro">沿着知识的来处，走向自己的发现。<br>在这里读、想、试，也造一点新的东西。</p><div class="hero-actions">${button('#/maps','探索知识地图')}${button('#/workshop','从一个作品开始',true)}</div><div class="hero-search">${search()}<span>已有目标？直接寻找课程，随时选择起点。</span></div></div><div class="hero-map">${terrain(lens)}<div class="terrain-tabs" aria-label="选择探索方向">${Object.entries(lenses).map(([id,item])=>`<a href="#/home?lens=${id}" ${id===lensId?'aria-current="true"':''}>${item.label}</a>`).join('')}</div></div></section>
 ${returning?'':resume(book,last)}
 <section class="world-section field-subjects"><div class="world-section-head"><div>${kicker('01','选择一片原野')}<h2>不必知道终点，先选一个方向。</h2></div><a href="#/courses">全部课程 ${arrow}</a></div><div class="field-subject-grid">${subjectTiles()}</div></section>
 <section class="world-section curiosity-shelf"><div class="world-section-head"><div>${kicker('02','值得停下来的问题')}<h2>让一个问题，打开一整片知识。</h2></div><a href="#/topics">算法精读 ${arrow}</a></div><div class="curiosity-grid">${questionCard('01','同一个 x，<br>为什么要算两次？','改动一个输入，观察两条路径怎样共同改变输出。','#/course/micrograd','数学 / AI','gradient')}${questionCard('02','两边已经相遇，<br>为什么还不能停？','从一张小图出发，找出最短路径真正的停止条件。','#/course/cph-13','计算机科学','routes')}${questionCard('03','只记住答案，<br>为什么还不够？','试着拼接两个区间，看看边界藏起了什么。','#/course/cph-09','计算机科学 / 数学','segment')}</div></section>
 <section class="world-closing"><span class="world-kicker">LEARNING, WITH ROOM TO WANDER.</span><h2>有些收获，是一个更好的问题。</h2><p>没有连胜要守护。原课、实验和你的研究簿，都留在这里。</p><a href="#/studio">也可以直接做一个小实验 ${arrow}</a></section></div>`;
}
function questionCard(n,title,desc,href,tag,art) {
 const drawing=art==='gradient'?'<path d="M40 72 120 26 200 72 120 118Z M120 26v92"/><circle cx="120" cy="26" r="7"/><circle cx="40" cy="72" r="7"/><circle cx="200" cy="72" r="7"/><circle cx="120" cy="118" r="7"/>':art==='routes'?'<path d="m32 73 56-45 64 78 57-33M32 73h177"/><circle cx="32" cy="73" r="8"/><circle cx="209" cy="73" r="8"/><circle cx="88" cy="28" r="6"/><circle cx="152" cy="106" r="6"/>':'<path d="M30 82h180M30 82V42h30v40m0 0v33h30V82m0 0V58h30v24m0 0v-52h30v52m0 0v20h30V82"/><path d="M120 14v115" stroke-dasharray="3 5"/>';
 return `<a class="curiosity-card ${art}" href="${href}"><span class="world-kicker">${n} / ${tag}</span><svg viewBox="0 0 240 145" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4">${drawing}</svg><h3>${title}</h3><p>${desc}</p><span class="curiosity-enter">进入课程 ${arrow}</span></a>`;
}
function directory(route,options) {
 const sid=route.startsWith('subject/')?route.slice(8):'',s=subjects.find(s=>s.id===sid);if(sid&&!s)return null;
 const chosen=s?blocksForSubject(s.id).filter(b=>!b.id.startsWith('alg-')):[],q=options.get('q')||'';
 return `<div class="world-directory">${s?`<nav class="crumbs" aria-label="当前位置"><a href="#/home">学科探索</a><i>/</i><span aria-current="page">${h(s.title)}</span></nav>`:''}<header class="field-directory-hero"><div>${kicker(s?subjectNames[s.id]:'COURSE LIBRARY',s?'一片原野，许多种走法':'成熟课程 · 自由选择')}<h1>${s?h(s.title):'找到你的下一程。'}</h1><p>${s?subjectQuestions[s.id]:'从原始课程与真实作品出发，选择你需要的部分。'}</p></div>${s?subjectArt(s.id):fieldMark()}</header>
 ${chosen.length?`<div class="subject-launch"><div><span class="world-kicker">先看关系，再选起点</span><p>${h(s.description)}</p></div>${button('#/maps?scope=subject-'+s.id,'探索学科地图',true)}</div><div class="field-block-links">${chosen.map(b=>`<a href="#/block/${b.id}?subject=${s.id}"><span>${h(b.title)}</span>${arrow}</a>`).join('')}</div>`:''}
 <section class="world-section directory-results"><div class="world-section-head"><h2>${s?'这片原野的课程':'课程目录'}</h2><a href="#/maps">在地图上寻找 ${arrow}</a></div>${search(q)}<nav class="filter-strip" aria-label="按学科浏览"><a href="#/courses" ${!s?'aria-current="page"':''}>全部</a>${subjects.map(d=>`<a href="#/subject/${d.id}" ${d.id===sid?'aria-current="page"':''}>${h(d.title)}</a>`).join('')}</nav><div id="catalog-results" data-subject="${sid}">${resultList(q,sid)}</div></section></div>`;
}
function course(c,options) {
 const start=c.lessons.find(l=>l.status==='available'),b=blocks.find(b=>b.id===options.get('block')&&b.courseIds.includes(c.id));
 const selected=options.get('node'),nodes=c.lessons.map(n=>({...n,actionLabel:n.href?.startsWith('https:')?'打开原始材料':'进入学习活动'}));
 const bridge={micrograd:['共享输入实验','#/learn/micrograd','比较一次真实扰动，随后实现自己的标量求导器。'], 'cph-13':['双向 Dijkstra','#/topic/shortest-paths/bidirectional','从首次相遇的反例，推导什么时候才可以停止。'],'cph-09':['区间摘要实验','#/topic/segment-tree/boundary-summary','拼接两段数组，判断哪些边界信息必须留下。'],agent:['检查一份处理规则','#/lab/agent','在同一份输入上，比较解析失败后的两种去向。'],kl:['比较损失与梯度','#/lab/kl','固定学生分布，检查两个目标给出的更新方向。']}[c.id];
 return `<div class="world-course"><nav class="crumbs" aria-label="当前位置"><a href="#/courses">课程目录</a><i>/</i>${b?`<a href="#/block/${b.id}">${h(b.title)}</a><i>/</i>`:''}<span>${h(c.title)}</span></nav><header class="world-course-head"><div><div class="course-meta">${c.subjectIds.map(id=>`<a class="subject-tag" href="#/subject/${id}">${h(subjects.find(s=>s.id===id).title)}</a>`).join('')}<span class="world-kicker">${c.status==='planned'?'内容规划中':c.status==='external'?'原课选读':'原课 + 站内活动'}</span></div><h1>${h(c.title)}</h1><p>${h(c.description)}</p>${c.source?`<a class="world-source" href="${h(c.source.url)}" target="_blank" rel="noopener noreferrer">原始主干 / ${h(c.source.label)} ${arrow}</a>`:''}</div><div class="course-compass" aria-hidden="true">${fieldMark()}<span>FOLLOW A QUESTION</span></div></header>
 ${bridge?`<section class="course-invitation"><div>${kicker('动手入口','一扇进入课程的门')}<h2>${bridge[0]}</h2><p>${bridge[2]}</p></div>${button(bridge[1],'开始探索')}</section>`:start?`<div class="course-invitation"><div><h2>从这里开始，或选择其他节点。</h2><p>${h(start.description)}</p></div>${button(start.href,'进入学习活动')}</div>`:''}
 <section class="course-route-shelf"><div class="world-section-head"><h2>选择自己的走法</h2><span>已有经验，可以直接跳入。</span></div><div class="course-doors">${c.lessons.map((l,i)=>`<a href="${h(l.href)}" ${l.href.startsWith('https:')?'target="_blank" rel="noopener noreferrer"':''}><span class="world-kicker">${String(i+1).padStart(2,'0')} / ${l.status==='external'?'原始材料':'站内活动'}</span><h3>${h(l.title)} ${arrow}</h3><p>${h(l.description)}</p></a>`).join('')||'<p>这门课程仍在规划。现在可以浏览其他课程与原始材料。</p>'}</div></section>
 <section class="course-surround"><div class="world-section-head"><div>${kicker('放回地图','从哪里来，可以走向哪里')}<h2>这门课在知识地图中的位置</h2></div><a href="#/maps?node=${c.id}">展开全图 ${arrow}</a></div>${renderKnowledgeUniverse(universe,{mode:'neighborhood',selectedId:c.id,fullHref:'#/maps?node='+c.id})}</section>
 <details class="course-contents" id="course-activities" ${selected?'open':''}><summary>查看课内学习关系与理由</summary>${nodes.length?renderKnowledgeGraph({id:c.id,title:c.title,type:'course',nodes,edges:c.lessonEdges},selected):'<p>尚无发布的活动。</p>'}</details></div>`;
}
function projectBlueprint(id) {
 const drawings={
 micrograd:'<path d="M32 60Q60 8 106 41M32 60Q60 110 106 64M128 53h38M187 53h45"/><circle cx="24" cy="60" r="13"/><rect x="106" y="33" width="25" height="38" rx="3"/><rect x="166" y="35" width="22" height="35" rx="3"/><text x="24" y="65">x</text><text x="119" y="59">×</text><text x="177" y="58">+</text><text x="245" y="58">L</text><path d="M24 47V15h152v20" stroke-dasharray="3 4"/><text class="blueprint-caption" x="135" y="111">同一个对象 · 多条贡献路径</text>',
 'cph-13':'<path d="M31 59 99 27 169 87 238 59M31 59h207"/><circle cx="25" cy="59" r="12"/><circle cx="245" cy="59" r="12"/><circle cx="99" cy="27" r="7"/><circle cx="169" cy="87" r="7"/><text x="25" y="64">s</text><text x="245" y="64">t</text><text x="67" y="30">4</text><text x="157" y="75">1</text><text x="209" y="92">4</text><text x="135" y="51">10</text><text class="blueprint-caption" x="135" y="121">已有路线 · 尚未排除的可能</text>',
 agent:'<rect x="7" y="34" width="55" height="38" rx="3"/><path d="M63 53h30m34 0h33m33 0h40M176 73v23H108V73"/><path d="m91 53 18-20 20 20-20 20ZM156 53l20-20 20 20-20 20Z"/><rect x="230" y="34" width="34" height="38" rx="3"/><text x="34" y="57">reply</text><text x="109" y="59">?</text><text x="176" y="59">?</text><text x="248" y="59">out</text><text class="blueprint-caption" x="135" y="121">文本 → 解析状态 → 下游规则</text>'
 };
 return `<svg viewBox="0 0 275 140" fill="none" stroke="currentColor" stroke-width="1.2">${drawings[id]}</svg>`;
}
function workshop() {
 return `<div class="world-workshop"><nav class="crumbs"><a href="#/home">学科探索</a><i>/</i><span>构造工坊</span></nav><header><span class="world-kicker">THE CONSTRUCTION ROOM / 另一种起点</span><h1>让理解，<br>变成能工作的东西。</h1><p>先选择一个想拥有的作品。遇到缺口，再去寻找需要的知识。</p><a href="#/home">回到开放探索 ${arrow}</a></header><div class="project-grid">${[
 ['01','一个会求导的程序','标量自动微分器','实现 backward，构造共享输入，检查数值梯度。','micrograd','#/learn/micrograd?section=mg-build-title','x → × → L'],
 ['02','一份有证据的停止规则','最短路径算法','写出不变量，在相遇但仍非最短的图上检验它。','cph-13','#/topic/shortest-paths/bidirectional','s → · ← t'],
 ['03','一个守住边界的系统','Agent 处理规则','给模型回复定义合同，验证失败如何进入下游。','agent','#/lab/agent','input → ? → output']
 ].map(([n,title,kind,desc,id,href,art])=>`<article class="project-brief"><span class="world-kicker">PROJECT ${n} / ${kind}</span><div class="project-diagram" aria-hidden="true">${projectBlueprint(id)}</div><h2>${title}</h2><p>${desc}</p><ol><li>查看任务与原始材料</li><li>实现或写出自己的规则</li><li>留下反例、代码位置与下一步</li></ol><div>${button(href,'打开工作台')}<a href="#/course/${id}">需要的知识 ${arrow}</a>${id==='micrograd'?'<a class="project-download" href="./materials/micrograd/engine.py" download>下载真实 Python 起步文件 ↓</a>':''}</div></article>`).join('')}</div><div class="workshop-note"><h2>作品由你完成，也由你拥有。</h2><p>站内提供起步代码、实验与证明材料。真实代码在你自己的编辑器运行；研究簿保存你愿意留下的观察和作品位置，不替你认证掌握。</p>${button('#/journal','打开我的研究簿',true)}</div></div>`;
}
export function worldPage(route,options,book,last) {
 if(route==='home')return home(options,book,last);
 if(route==='workshop')return workshop();
 if(route==='courses'||route.startsWith('subject/'))return directory(route,options);
 if(route.startsWith('course/')&&byId.has(route.slice(7)))return course(byId.get(route.slice(7)),options);
 return null;
}

export function learningContext(route,options=new URLSearchParams()) {
 const raw=route.split('?')[0],study=studyRoute(raw);let c,title;
 if(raw.startsWith('course/'))c=byId.get(raw.slice(7));
 else if(study)c=byId.get('cph-'+String(study.row[2]).padStart(2,'0'));
 else if(raw.startsWith('studio/'))c=byId.get({segment:'cph-09',routes:'cph-13',gradient:'micrograd'}[raw.slice(7)]);
 else c=courses.find(c=>c.lessons.some(l=>l.href?.split('?')[0]==='#/'+raw));
 if(!c)return null;
 title=study?study.row[1]:raw.startsWith('studio/')?({segment:'拼接区间摘要',routes:'双向搜索实验',gradient:'共享梯度实验'}[raw.slice(7)]):c.title;
 const query=options.toString();
 return {route:'#/'+raw+(query?'?'+query:''),title,course:c.id};
}
export function learningRibbon(ref) {
 if(!ref || ref.route.startsWith('#/course/'))return '';
 const c=byId.get(ref.course);
 return `<nav class="learning-ribbon" aria-label="学习上下文"><a href="#/course/${c.id}">← ${h(c.title)}</a><span>探索 / ${h(ref.title)}</span><a href="#/maps?node=${c.id}">放回知识地图 ${arrow}</a></nav>`;
}
export function noteComposer(book,ref) {
 if(!ref)return '';
 const d=book.state.drafts[ref.route]||{body:'',next:'',kind:'finding'};
 return `<section class="field-composer" data-field-composer data-route="${h(ref.route)}"><div class="composer-heading">${kicker('FIELDNOTE','把这一刻，留给未来的自己')}<h2>这次，你带走了什么？</h2><p>${ref.route.startsWith('#/studio/')?'实验中的判断仍留在原处。这里可以另选一条发现，带回自己的研究簿。':'可以是一条发现、一个未解问题，或你刚完成的作品。无需给今天打分。'}</p></div><form id="fieldnote-form"><div class="field-kind"><label for="fieldnote-kind">留下一条</label><select id="fieldnote-kind"><option value="finding" ${d.kind==='finding'?'selected':''}>发现</option><option value="question" ${d.kind==='question'?'selected':''}>未解问题</option><option value="artifact" ${d.kind==='artifact'?'selected':''}>作品记录</option></select></div><label for="fieldnote-body">我的思考</label><textarea id="fieldnote-body" maxlength="3000" placeholder="哪一个观察改变了你的想法？也可以只留下卡住的地方。">${h(d.body)}</textarea><label for="fieldnote-next">下次从哪里继续 <span>可选</span></label><input id="fieldnote-next" maxlength="600" value="${h(d.next)}" placeholder="一个具体的小动作，例如：换一个有共享输入的式子检验。"><div class="composer-actions"><button class="world-button" type="submit">保存到研究簿 ↗</button><button class="world-button secondary" type="button" data-field-exit>收进研究簿并回首页</button><a href="#/home">先休息一下</a></div><p class="field-save-status" data-field-status role="status">${h(book.warning||'草稿随输入保存在本机，不会上传。')}</p></form></section>`;
}
function studioShelf() {
 try {
  const raw=localStorage.getItem(STUDIO_KEY);if(!raw)return '';
  const state=normalizeStudio(JSON.parse(raw)),ids=Object.keys(state.trials);
  if(!ids.length)return '';
  return `<div class="field-studio-shelf"><h3>实验里留下的线索</h3><p>这些条件与猜想仍保存在原实验中。</p>${ids.map(id=>{const t=state.trials[id];return `<a href="#/studio/${id}"><b>${{segment:'区间摘要',routes:'双向搜索',gradient:'共享梯度'}[id]}</b><span>${h(t.reflection||t.reason||t.previous||'回到保存的实验条件')}</span>${arrow}</a>`;}).join('')}<a href="#/studio">导出或恢复实验记录 ${arrow}</a></div>`;
 }catch{return '<p class="warning-panel">实验草稿暂时无法读取。请到反例工作台检查原始记录。</p>';}
}
export function worldJournal(book) {
 const entries=book.state.entries.slice().reverse();
 return `<section class="field-journal"><div class="world-section-head"><div>${kicker('MY FIELDNOTES','自己的发现，会慢慢连成路')}<h2>我的研究簿</h2></div><a href="#/workshop">开始一个作品 ${arrow}</a></div>${resume(book)}<div class="field-journal-tools"><button class="world-button secondary" data-field-export>导出研究簿</button><label class="world-button secondary field-file-label">恢复研究簿<input type="file" accept=".json,application/json" data-field-import></label>${book.unreadable&&typeof book.raw==='string'?'<button class="world-button secondary" data-field-raw>下载无法读取的原文</button>':''}<p>研究簿、旧学习记录与实验草稿分别备份；恢复一种不会覆盖另外两种。</p></div><div data-field-import-preview hidden></div><p data-field-status role="status">${h(book.warning)}</p><div class="field-note-grid">${entries.length?entries.map((e,i)=>`<article class="field-note"><div class="world-kicker"><span>${{finding:'发现',question:'未解问题',artifact:'作品记录'}[e.kind]}</span><time>${h(e.at.slice(0,10))}</time></div><h3>${h(e.title)}</h3><p class="field-note-body">${h(e.body)}</p>${e.next?`<div class="field-next"><b>下次的线索</b><p>${h(e.next)}</p></div>`:''}<a href="${h(e.route)}">继续探索这一页 ${arrow}</a></article>`).join(''):'<div class="field-empty"><span aria-hidden="true">↟</span><h3>还没有收进研究簿的发现。</h3><p>在任意课程或实验下方，写下你的思考。一个好问题，也值得留一页。</p><a href="#/home">去找一个感兴趣的问题 ↗</a></div>'}</div>${studioShelf()}</section>`;
}
export function bindWorld(root,book,ref,onSaved=()=>{}) {
 if(!root?.querySelectorAll)return;
 const status=message=>{for(const el of root.querySelectorAll('[data-field-status]'))el.textContent=message;};
 const form=root.querySelector('#fieldnote-form');
 const draft=()=>({body:form.querySelector('#fieldnote-body').value,next:form.querySelector('#fieldnote-next').value,kind:form.querySelector('#fieldnote-kind').value});
 if(form&&ref) {
  const saveDraft=()=>{const ok=book.draft(ref.route,draft());status(ok?'草稿已留在本机。':book.warning);};
  form.addEventListener('input',saveDraft);form.addEventListener('change',saveDraft);
  const save=exit=>{
   const d=draft();
   if(!d.body.trim()){status('先留下一句话，就可以保存。');form.querySelector('#fieldnote-body').focus();return;}
   if(!book.add(ref,d)){status(book.warning);return;}
   onSaved(book.state.entries.at(-1));
   form.querySelector('#fieldnote-body').value='';form.querySelector('#fieldnote-next').value='';
   if(exit){location.hash='/home';return;}
   status('已收进研究簿。可以继续探索，也可以安心离开。');
   const s=root.querySelector('[data-field-status]');s.tabIndex=-1;s.focus({preventScroll:true});
  };
  form.addEventListener('submit',e=>{e.preventDefault();save(false);});
  form.querySelector('[data-field-exit]').addEventListener('click',()=>save(true));
 }
 const download=(value,name,type='application/json')=>{
  const blob=new Blob([value],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-');
 for(const b of root.querySelectorAll('[data-field-export]'))b.addEventListener('click',()=>download(JSON.stringify(book.state,null,2),'learn-fieldbook-'+stamp()+'.json'));
 root.querySelector('[data-field-raw]')?.addEventListener('click',()=>download(book.raw,'learn-fieldbook-unreadable-'+stamp()+'.json'));
 root.querySelector('[data-field-import]')?.addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  const panel=root.querySelector('[data-field-import-preview]');panel.hidden=false;
  try {
   if(file.size>8_000_000)throw new Error('文件超过 8 MB，请先检查备份。');
   const candidate=normalizeFieldbook(JSON.parse(await file.text()));
   panel.innerHTML=`<div class="field-restore"><h3>确认恢复研究簿</h3><p>文件含 ${candidate.entries.length} 条记录、${Object.keys(candidate.drafts).length} 份草稿，将替换当前研究簿的 ${book.state.entries.length} 条记录。旧学习记录与实验条件不受影响。建议先导出当前研究簿。</p><button class="world-button" data-field-confirm>确认替换研究簿</button><button class="world-button secondary" data-field-cancel>取消</button></div>`;
   panel.querySelector('[data-field-cancel]').addEventListener('click',()=>{panel.hidden=true;e.target.value='';});
   panel.querySelector('[data-field-confirm]').addEventListener('click',()=>{if(book.restore(candidate))location.reload();else status(book.warning);});
   panel.querySelector('[data-field-confirm]').focus();
  }catch(error){panel.textContent=error instanceof SyntaxError?'未恢复：文件格式有误，请选择本站导出的研究簿备份。原有记录没有改变。':'未恢复：'+error.message;e.target.value='';}
 });
}
