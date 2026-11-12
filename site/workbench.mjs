import { subjects, courses, blocks, coursesForSubject, blocksForSubject, searchCourses } from './knowledge-catalog.mjs';
import { renderKnowledgeGraph, bindKnowledgeGraph } from './knowledge-graphs.mjs';
import { escapeHtml as h } from './html.mjs';
import { universe } from './universe-model.mjs';
import { renderKnowledgeUniverse, renderUniverseThumbnail, bindKnowledgeUniverses } from './knowledge-universe.mjs';
import { renderChapterPractice, bindChapterPractice } from './chapter-practice.mjs';
import { renderRangeLab, bindRangeLab } from './algorithm-lab.mjs';

const subjectsById = new Map(subjects.map(item => [item.id, item]));
const coursesById = new Map(courses.map(item => [item.id, item]));
const blocksById = new Map(blocks.map(item => [item.id, item]));
const activityCourses = new Map();
for (const course of courses) {
  for (const lesson of course.lessons) {
    const path = lesson.href?.split('?')[0];
    if (path && /^#\/(learn|lab|practice)\//.test(path)) activityCourses.set(path.slice(2), course);
  }
}
const statusLabels = { available: '站内可学', external: '开放原课', planned: '规划中' };
const navItems = [['home','学科探索'], ['courses','课程目录'], ['maps','知识图谱'], ['journal','学习记录']];
const url = (path, params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([,value]) => Boolean(value)));
  return '#/' + path + (query.size ? '?' + query : '');
};
const arrow = '<span aria-hidden="true">↗</span>';
const searchIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="10.5" cy="10.5" r="6.6"/><path d="m16 16 5 5"/></svg>';
function subjectArt(id) {
  const g = {
    math: '<g transform="rotate(-24 67 52)"><circle cx="67" cy="52" r="36"/><ellipse cx="67" cy="52" rx="15" ry="36"/><ellipse cx="67" cy="52" rx="27" ry="36"/><ellipse cx="67" cy="52" rx="36" ry="12"/><path d="M35 36q32 14 64 0M35 68q32-14 64 0"/></g>',
    computing: '<g><path d="m29 53 38-22 38 22-38 22zM29 63l38 22 38-22M29 73l38 22 38-22M29 43l38-22 38 22-38 22z"/><path d="m57 43 10-6 10 6-10 6z" fill="currentColor"/></g>',
    ai: '<g><path d="M25 39 58 20 96 34 63 55 25 39 46 82 63 55 99 78 96 34M58 20l5 35m-17 27 53-4"/><g fill="currentColor"><circle cx="25" cy="39" r="4"/><circle cx="58" cy="20" r="5"/><circle cx="96" cy="34" r="4"/><circle cx="63" cy="55" r="7"/><circle cx="46" cy="82" r="4"/><circle cx="99" cy="78" r="5"/></g></g>',
    finance: '<g><path d="M23 85h84M36 52v28m18-48v36m18-21v31m18-61v41"/><path d="M31 61h10v11H31zM49 39h10v19H49zM67 55h10v10H67zM85 26h10v23H85z" fill="currentColor"/></g>',
    physics: '<g transform="rotate(-23 65 53)"><ellipse cx="65" cy="53" rx="50" ry="19"/><ellipse cx="65" cy="53" rx="35" ry="13" transform="rotate(79 65 53)"/><circle cx="65" cy="53" r="6" fill="currentColor"/><circle cx="111" cy="60" r="4" fill="currentColor"/></g>',
    engineering: '<g><path d="m20 77 14-42 31 42 31-42 14 42H20Zm14-42h62M20 77l45-42 45 42M65 35v42M34 35l31 42 31-42"/><g fill="currentColor"><circle cx="34" cy="35" r="3.5"/><circle cx="65" cy="35" r="3.5"/><circle cx="96" cy="35" r="3.5"/><circle cx="65" cy="77" r="3.5"/></g></g>'
  };
  return '<svg class="subject-art" aria-hidden="true" viewBox="0 0 130 110" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">' + (g[id] || '') + '</svg>';
}
const homeTitles = {home:'学科探索', courses:'课程目录', learn:'课程目录', lab:'课程目录', maps:'知识图谱', atlas:'专题练习索引', journal:'学习记录', sync:'协作与备份'};
export function isLearningUnit(path) { return activityCourses.has(path); }
export function routeTitle(path, atlas) {
  if (homeTitles[path]) return homeTitles[path];
  if (activityCourses.has(path)) return activityCourses.get(path).title;
  const [area,id] = path.split('/');
  if (area === 'atlas') return atlas?.nodes.find(node => node.id === path.split('/')[2])?.title || '知识节点';
  return ({subject:subjectsById, block:blocksById, course:coursesById}[area]?.get(id)?.title) || '未找到页面';
}
export function renderWorkspaceShell(path, body, revision) {
  const area = path.split('/')[0];
  const active = ({subject:'home', block:'maps', atlas:'maps', course:'courses', learn:'courses', lab:'courses', practice:'courses'})[area] || area;
  const nav = navItems.map(([key, title]) => `<a href="#/${key}" ${active === key ? 'aria-current="' + (key === path ? 'page':'location') + '"' : ''}>${title}</a>`).join('');
  const course = activityCourses.get(path);
  const crumb = course ? breadcrumbs([['课程目录','#/courses'],[course.title,url('course/'+course.id)],['学习活动']]) : '';
  const version = /^[a-f0-9]{40}$/.test(revision) ? `<a class="release-id" href="https://github.com/merlxn-ambrosius/learning-workbench/commit/${revision}">版本 ${revision.slice(0,7)}</a>` : '';
  return `<header class="mast"><div class="mast-inner"><a class="brand" href="#/home" aria-label="LEARN Workbench 首页"><svg aria-hidden="true" viewBox="0 0 34 34" fill="none"><rect width="34" height="34" rx="8" fill="#253d82"/><path d="m7 12 9.5 4 10-5v12l-10 5-9.5-4z" stroke="#fff" stroke-width="1.5"/><path d="m7 8 9.5 4 10-5M16.5 16v12" stroke="#c7e89c" stroke-width="1.6"/></svg>LEARN<span>Workbench</span></a><nav aria-label="工作台导航">${nav}</nav></div></header><main class="content" id="page-content" tabindex="-1">${crumb}${body}</main><footer class="bench-footer"><span>LEARN Workbench</span>${version}<a href="#/sync">协作与备份</a></footer>`;
}
function breadcrumbs(parts) {
  return `<nav class="crumbs" aria-label="当前位置">${parts.map(([name,href])=>href?`<a href="${h(href)}">${h(name)}</a>`:`<span aria-current="page">${h(name)}</span>`).join('<i aria-hidden="true">/</i>')}</nav>`;
}
function searchForm(q, home=false) {
  return `<form role="search" id="catalog-search-form" class="catalog-search">${searchIcon}<input type="search" maxlength="150" id="catalog-query" name="q" value="${h(q)}" aria-label="搜索课程" placeholder="搜索课程、主题或关键词" autocomplete="off"><button type="submit">${home?'搜索课程':'搜索'}</button></form>`;
}
function resumeLink(lastRoute, atlas) {
  const path = String(lastRoute || '').replace(/^#\//,'');
  const nodeId = /^atlas\/node\/([A-Z][0-9]{2})$/.exec(path)?.[1];
  const last = activityCourses.get(path)?.title || (nodeId && (atlas?.nodes.find(n=>n.id===nodeId)?.title || nodeId));
  return last ? `<a class="resume-link" href="${h(url(path))}">继续上次学习 · ${h(last)} →</a>` : '';
}
function subjectCard(s) {
  const items = coursesForSubject(s.id);
  const hasContent = items.some(c=>c.status !== 'planned');
  return `<a class="subject-card subject-${h(s.id)}" href="#/subject/${h(s.id)}"><div><h2>${h(s.title)}</h2><p>${h(s.description)}</p><small>${hasContent?'浏览课程 →':'建设中 · 查看学科'}</small></div>${subjectArt(s.id)}</a>`;
}
function blockCard(b, sid) {
  return `<a class="block-card" href="${h(url('block/'+b.id,{subject:sid}))}"><h3>${h(b.title)}</h3><span aria-hidden="true" class="block-arrow">↗</span><p>${h(b.description)}</p><small>${b.courseIds.length} 个课程节点</small></a>`;
}
function blockShelf(items, sid) {
  return `<div class="block-grid">${items.map(b=>blockCard(b,sid)).join('')}</div>`;
}
function home(lastRoute, atlas) {
  const principalBlocks=blocks.filter(b=>!b.id.startsWith('alg-'));
  return `<header class="catalog-hero"><div><h1 id="workbench-title">学科探索</h1><p>按学科发现课程，也可以从一个问题追到它的来处。</p></div>${searchForm('',true)}</header>
  <a href="#/maps" class="universe-entry" aria-label="打开全局知识星图"><div><h2>知识星图</h2><p>放大一个方向，沿着连线寻找下一门课。</p><span class="map-cta">打开全局星图 <b aria-hidden="true">↗</b></span></div>${renderUniverseThumbnail(universe)}</a>
  <div class="subject-grid">${subjects.map(subjectCard).join('')}</div>${resumeLink(lastRoute,atlas)}
  <section class="shelf"><div class="shelf-head"><div><h2>聚焦一个板块</h2><p>选择学习方向，在同一张星图中查看它的课程。</p></div></div>${blockShelf(principalBlocks)}</section>`;
}
function tags(c) {return c.subjectIds.map(id=>`<a class="subject-tag" href="#/subject/${h(id)}">${h(subjectsById.get(id).title)}</a>`).join('');}
function status(c) {return `<span class="course-status st-${h(c.status)}">${h(statusLabels[c.status])}</span>`;}
export function resultList(q='', sid='') {
  const found = searchCourses(q,sid || undefined);
  return `<p class="catalog-total" role="status">${found.length} 门课程</p>${found.length ? `<div class="course-list">${found.map(c=>`<article class="course-row"><div>${status(c)}<h3><a href="${h(url('course/'+c.id,{subject:sid}))}">${h(c.title)} ${arrow}</a></h3><p>${h(c.description)}</p></div><div class="course-tags">${tags(c)}</div></article>`).join('')}</div>` : `<p class="catalog-empty">${q?'没有匹配的课程。可以换一个关键词，或清空搜索。':'这个学科还没有收录课程。'} <a href="#/courses">浏览全部课程 →</a></p>`}`;
}
function directory(s, q) {
  const subjectBlocks = s ? blocksForSubject(s.id).filter(b=>!b.id.startsWith('alg-')) : [];
  return `${s?breadcrumbs([['学科探索','#/home'],[s.title]]):''}<header class="page-intro"><h1>${s?h(s.title):'课程目录'}</h1><p>${s?h(s.description):'按学科筛选，也可以直接查找课程与主题。'}</p></header>
  ${subjectBlocks.length ? `<aside class="subject-maps"><a class="map-link-button" href="${h(url('maps',{scope:'subject-'+s.id}))}">进入学科星图 ↗</a><div>${subjectBlocks.map(b=>`<a href="${h(url('block/'+b.id,{subject:s.id}))}">${h(b.title)} →</a>`).join('')}</div></aside>`:''}
  <section class="shelf"><div class="shelf-head"><h2>${s?'学科课程':'全部课程'}</h2></div>${searchForm(q)}
  ${!s?`<nav class="filter-strip" aria-label="按学科浏览">${subjects.map(d=>`<a href="#/subject/${h(d.id)}">${h(d.title)}</a>`).join('')}</nav>`:''}
  <div id="catalog-results" data-subject="${h(s?.id || '')}">${resultList(q,s?.id)}</div></section>`;
}
function chapterList(block) {
  const parts = block.id === 'algorithms' ? blocks.filter(b=>b.id.startsWith('alg-')) : [block];
  return `<section class="shelf handbook-directory"><h2>章节与练习</h2>${parts.map(part=>`<details ${parts.length===1?'open':''}><summary>${h(part.title)} <small>${part.courseIds.length} 章</small></summary>
  <ol>${part.courseIds.map(id=>coursesById.get(id)).map(c=>`<li><a href="${h(url('course/'+c.id,{block:block.id}))}"><small>第 ${c.chapter} 章</small> ${h(c.title)} →</a></li>`).join('')}</ol></details>`).join('')}</section>`;
}
function maps(scopeId,selected) {
  const scope = universe.scopes.find(s=>s.id===scopeId);
  return `<header class="page-intro universe-intro"><h1>知识星图</h1><p>每颗星是一门课程。选择课程查看先修与后续，也可以展开它的学习节点。</p></header>
    ${renderKnowledgeUniverse(universe,{mode:'global',scopeId:scope?.id,selectedId:selected})}
    <div class="map-directory-links"><a href="#/block/algorithms">竞赛算法 · 手册与章节目录 →</a><a href="#/atlas">早期专题练习索引 →</a></div>`;
}
function blockPage(b, s, selected) {
  const isBook = b.id === 'algorithms' || b.id.startsWith('alg-');
  return `${breadcrumbs([s?[s.title,'#/subject/'+s.id]:['知识星图','#/maps'],[b.title]])}
    <header class="page-intro universe-intro"><h1>${h(b.title)}</h1><p>${h(b.description)}</p></header>
    ${renderKnowledgeUniverse(universe,{mode:'scope',scopeId:b.id,selectedId:selected})}
    ${isBook ? chapterList(b) : ''}`;
}
function coursePage(c, b, s, selected) {
  const back = b ? [b.title,url('block/'+b.id,{subject:s?.id,node:c.id})] : s?[s.title,'#/subject/'+s.id]:['课程目录','#/courses'];
  const nodes = c.lessons.map(n=>({...n,actionLabel:n.href?.startsWith('https:')?'打开原始材料':'进入学习活动'}));
  const mapHref = url('maps',{node:c.id});
  const directTask = c.practice ? `<a class="map-link-button" href="#/practice/${h(c.id)}">尝试本章练习 →</a>` : '';
  const chapter = c.chapter ? `<span class="chapter-kicker">Competitive Programmer’s Handbook · 第 ${c.chapter} 章</span>` : '';
  return `${breadcrumbs([back,[c.title]])}<header class="page-intro"><div class="course-meta">${status(c)}${tags(c)}${chapter}</div><h1>${h(c.title)}</h1><p>${h(c.description)}</p>
    <div class="course-actions">${directTask}${c.id==='cph-09'?'<a class="map-link-button" href="#/lab/range-queries">打开区间查询实验 →</a>':''}
    ${c.source?`<a href="${h(c.source.url)}" target="_blank" rel="noopener noreferrer">${h(c.source.label)} ↗</a>`:''}</div></header>
    <section class="course-surround"><h2>这门课在知识星图中的位置</h2>
    ${renderKnowledgeUniverse(universe,{mode:'neighborhood',selectedId:c.id,fullHref:mapHref})}</section>
    <section class="course-contents" id="course-activities"><h2>课内学习图</h2>
    ${nodes.length ? renderKnowledgeGraph({id:c.id,title:c.title,type:'course',nodes,edges:c.lessonEdges},selected) : '<p class="catalog-empty">课程内容规划中，发布后会在这里显示学习节点。</p>'}</section>`;
}
export function platformPage(path, last, atlas, options) {
  const [area,id,extra] = path.split('/');
  if (extra) return null;
  const subject = subjectsById.get(options.get('subject'));
  const selected = options.get('node');
  if (path === 'home') return home(last,atlas);
  if (['courses','learn','lab'].includes(path)) return directory(null,options.get('q') || '');
  if (path === 'maps') return maps(options.get('scope'),selected);
  if (area === 'practice' && coursesById.get(id)?.practice) return renderChapterPractice(coursesById.get(id));
  if (path === 'lab/range-queries') return renderRangeLab();
  if (area === 'subject' && subjectsById.has(id)) return directory(subjectsById.get(id),options.get('q') || '');
  if (area === 'block' && blocksById.has(id)) {
    const b=blocksById.get(id);
    return blockPage(b,b.subjectIds.includes(subject?.id)?subject:null,selected);
  }
  if (area === 'course' && coursesById.has(id)) {
    const c=coursesById.get(id);
    const candidate=blocksById.get(options.get('block'));
    const b=candidate?.courseIds.includes(id) ? candidate : null;
    const viaSubject=c.subjectIds.includes(subject?.id) || b?.subjectIds.includes(subject?.id);
    return coursePage(c,b,viaSubject?subject:null,selected);
  }
  return null;
}
export function bindPlatform(path, root, save) {
  if (path === 'maps' || path.startsWith('course/') || path.startsWith('block/')) bindKnowledgeUniverses(root);
  if (path.startsWith('course/')) bindKnowledgeGraph(root);
  if (path === 'lab/range-queries') bindRangeLab(root);
  const c = path.startsWith('practice/') && coursesById.get(path.slice('practice/'.length));
  if (c?.practice) bindChapterPractice(root,c,save);
}
export function missingPage() {
  return '<h1 class="page-title">找不到这个页面</h1><a class="btn btn-primary" href="#/home">返回学科探索</a>';
}
