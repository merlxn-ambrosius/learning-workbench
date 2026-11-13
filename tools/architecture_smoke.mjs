// Disposable, synthetic end-to-end checks. Never uses a personal browser profile.
// Usage: node tools/architecture_smoke.mjs <private-output-directory> <playwright-index.mjs>
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {courses as legacyUnits} from '../site/knowledge-catalog.mjs';
import {listCourses, listKnowledge, courseOccurrences, knowledgeHref} from '../site/content-model.mjs';
const out = path.resolve(process.argv[2] || '/tmp/learn-architecture-smoke');
const {chromium} = await import(process.argv[3] ? pathToFileURL(process.argv[3]).href : 'playwright');
const base = process.env.LEARN_PREVIEW_URL || 'http://127.0.0.1:4174/';
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results = [], pageErrors = [], networkErrors = [];
const key = 'learn-workbench.learning-ledger.v1';
await fs.mkdir(out, {recursive:true});
const record = (name, pass, details = '') => results.push({name, pass:Boolean(pass), ...(details ? {details} : {})});
const checkpoint = async (name, fn) => {try {await fn();} catch (error) {record(name, false, error.message);}};
const defaultRoute = 'knowledge/autodiff-gradient-accumulation?course=zero-to-hero&occurrence=micrograd-autodiff';
const enhancedRoute = 'knowledge/autodiff-gradient-accumulation?course=learn-optimization-path&occurrence=optimization-autodiff';
const snapshot = async page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const go = async (page, route) => {await page.goto(base + '#/' + route);await page.locator('#page-content').waitFor();await page.waitForTimeout(80);};
const overflow = async page => page.evaluate(() => ({width:innerWidth, scroll:document.documentElement.scrollWidth, offenders:[...document.querySelectorAll('#page-content *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.right>innerWidth+2&&getComputedStyle(el).position!=='fixed';}).slice(0,8).map(el=>({tag:el.tagName,class:el.className,id:el.id}))}));
const isPageHealthy = async page => page.evaluate(() => Boolean(document.querySelector('#page-content h1')) && !document.querySelector('#page-content').textContent.includes('找不到这个页面'));
try {
  for (const width of [1440,820,390,320]) {
    const context = await browser.newContext({viewport:{width,height:1000}, reducedMotion:'reduce', acceptDownloads:true});
    const page = await context.newPage();page.setDefaultTimeout(5000);
    page.on('pageerror', error => pageErrors.push({width, route:page.url(), message:error.message}));
    page.on('response', response => {if(response.url().startsWith(base)&&response.status()>=400)networkErrors.push({status:response.status(),url:response.url()});});
    await checkpoint(`journey ${width}`, async () => {
      await go(page,'home');
      record(`first visit ${width}: first lecture invitation`, (await page.locator('.xp-continue').innerText()).includes('开始第一讲'));
      record(`first visit ${width}: no fabricated learning day`,(await page.locator('.xp-week-strip').innerText()).includes('每一点真实进展'));
      const initialLedger=await snapshot(page);record(`first visit ${width}: no read/completion event`,!initialLedger||initialLedger.events.every(e=>e.kind==='visited'));
      await page.screenshot({path:path.join(out,`home-${width}.png`),fullPage:true});
      await page.getByLabel('搜索课程',{exact:true}).fill('micrograd');await page.locator('#catalog-search-form button').click();
      await page.waitForURL('**/#/courses?q=micrograd');await page.locator('#catalog-results .xp-course-tile').first().waitFor();
      record(`search ${width}: micrograd resolves to whole parent course`,await page.locator('.xp-course-tile[href="#/course/zero-to-hero"]').count()===1&&await page.locator('.xp-course-tile').count()===1);
      await go(page,'course/zero-to-hero');
      record(`course ${width}: eight real lectures`,await page.locator('.xp-module').count()===8);
      const summary=page.locator('#chapter-gpt-tokenizer summary');await summary.focus();await page.keyboard.press('Enter');
      record(`keyboard ${width}: chapter summary opens by Enter`,await page.locator('#chapter-gpt-tokenizer').getAttribute('open')!==null);
      await go(page,defaultRoute);
      record(`default ${width}: standalone teaching content and no extension`,await page.locator('[data-origin="default"]').count()>=6&&await page.locator('[data-optimization-lab]').count()===0);
      await page.locator('.xp-concept-block summary').first().focus();await page.keyboard.press('Enter');
      record(`keyboard ${width}: optional hint expands`,await page.locator('details.xp-concept-block').first().getAttribute('open')!==null);
      await page.waitForTimeout(50);const hintState=await snapshot(page);
      record(`help ${width}: reading hint is explicitly retained`,hintState.events.some(e=>e.kind==='help'&&e.help==='hint'&&e.activityId==='knowledge:autodiff-gradient-accumulation'));
      await page.locator('[data-learning-read]').click();await page.locator('[data-learning-read][disabled]').waitFor();
      const read=await snapshot(page);
      record(`reading ${width}: explicit canonical identity`,read.events.some(e=>e.kind==='read'&&e.activityId==='knowledge:autodiff-gradient-accumulation'&&e.courseId==='zero-to-hero'));
      record(`reading ${width}: no invented pass`,read.events.every(e=>e.kind!=='practice'&&e.kind!=='transfer'));
      await go(page,enhancedRoute);
      record(`enhanced ${width}: shared default plus three additions`,await page.locator('[data-origin="extension"]').count()===3);
      record(`shared progress ${width}: read default is recognized in other course`,await page.locator('[data-learning-read]').isDisabled());
      record(`shared help ${width}: prior hint evidence remains`,(await snapshot(page)).events.some(e=>e.kind==='help'&&e.courseId==='zero-to-hero'&&e.help==='hint'));
      const originalOutput=await page.locator('[data-opt-result]').innerText();
      record(`calculation ${width}: default update is real`,originalOutput.includes('24')&&originalOutput.includes('0.1296')&&originalOutput.includes('0.9216'));
      await page.locator('#opt-weight').focus();await page.keyboard.press('ArrowLeft');
      record(`keyboard ${width}: slider changes computed result`,await page.locator('[data-opt-result]').innerText()!==originalOutput);
      await page.locator('#opt-rate').fill('0.2');await page.locator('#opt-rate').dispatchEvent('input');
      await page.screenshot({path:path.join(out,`enhanced-${width}.png`),fullPage:true});
      // The displayed page must preserve the selected course when opening a reused activity.
      await page.locator('#knowledge-activity a').click();await page.locator('#mg-measure').waitFor();
      record(`course context ${width}: reused experiment retains selected course`,await page.locator('.learning-ribbon a[href="#/course/learn-optimization-path"]').count()===1&&(await snapshot(page)).last.courseId==='learn-optimization-path');
      await go(page,enhancedRoute);await go(page,'home');
      record(`return ${width}: continue restores course occurrence`,(await page.locator('.xp-continue a.xp-button').getAttribute('href')).includes('course=learn-optimization-path'));
      await page.reload();await page.locator('.xp-continue').waitFor();
      record(`reload ${width}: return context survives`,(await page.locator('.xp-continue a.xp-button').getAttribute('href')).includes('occurrence=optimization-autodiff'));
      await go(page,'course/learn-optimization-path');
      record(`course progress ${width}: read counted separately from completion`,(await page.locator('.xp-progress-caption').innerText()).includes('确认读过 1')&&(await page.locator('.xp-progress-caption').innerText()).includes('自报完成 0'));
    });
    for(const route of ['home','courses','course/zero-to-hero','course/competitive-programmers-handbook','course/micrograd','course/cph-13',defaultRoute,enhancedRoute,'problems','journal']) {
      await checkpoint(`layout ${width}: ${route}`,async()=>{
        await go(page,route);const state=await overflow(page);
        record(`layout ${width}: ${route} healthy`,await isPageHealthy(page));
        record(`layout ${width}: ${route} no page overflow`,state.scroll<=width+1,state.scroll>width+1?JSON.stringify(state):'');
      });
    }
    if(width===1440) {
      await checkpoint('legacy and canonical direct links',async()=>{
        const routes=new Set(['course/backtesting','learn/micrograd?section=mg-build-title','learn/agent','lab/agent','learn/kl','lab/kl','atlas','atlas/node/F01','studio/gradient',...legacyUnits.map(c=>'course/'+c.id),...legacyUnits.flatMap(c=>c.lessons.filter(a=>a.href.startsWith('#/')).map(a=>a.href.slice(2))),...listCourses().map(c=>'course/'+c.id),...listKnowledge().map(k=>'knowledge/'+k.id),...courseOccurrences.map(o=>knowledgeHref(o.knowledgeId,{courseId:o.courseId,occurrenceId:o.id}).slice(2))]);
        for(const route of routes){const before=pageErrors.length;await go(page,route);record(`direct link: ${route}`,await isPageHealthy(page)&&pageErrors.length===before);}
      });
      await checkpoint('standalone reading and invalid course context',async()=>{
        await go(page,'knowledge/autodiff-gradient-accumulation');
        record('standalone knowledge: previous explicit read remains visible',await page.locator('[data-learning-read]').isDisabled());
        await go(page,'home');
        record('standalone return: overview points to real concept',await page.locator('.xp-continue a[href="#/course/shared-knowledge"]').count()===0&&await page.locator('.xp-continue a[href="#/knowledge/autodiff-gradient-accumulation"]').count()===2);
        record('standalone return: map selects real concept',await page.locator('.xp-nearby a[href="#/maps?node=autodiff-gradient-accumulation"]').count()===1);
        await go(page,'knowledge/autodiff-gradient-accumulation?course=learn-optimization-path&occurrence=micrograd-autodiff');
        record('invalid occurrence: rendered default and recorded standalone agree',(await snapshot(page)).last.courseId==='shared-knowledge'&&await page.locator('[data-optimization-lab]').count()===0);
      });
      await checkpoint('source readings and exact course resumption',async()=>{
        await go(page,'course/mit-18-06');
        record('source-only course: both advertised activities are recordable',await page.locator('[data-course-read]').count()===2);
        await page.locator('[data-course-read="mit-18-06:source"]').click();
        record('source-only course: count updates immediately',(await page.locator('.xp-progress-caption').innerText()).includes('确认读过 1 / 2'));
        record('source-only course: exact outline location is retained',(await snapshot(page)).last.route==='#/course/mit-18-06?section=course-outline');
        await go(page,'home');await page.locator('.xp-continue a.xp-button').click();await page.waitForTimeout(100);
        record('source-only return: focus reaches outline',await page.evaluate(()=>document.activeElement.id)==='course-outline');
        await go(page,'course/competitive-programmers-handbook?chapter=cph-24');
        await page.locator('[data-course-read="cph-24:s1"]').click();
        record('book reading: retained later chapter route',(await snapshot(page)).last.route.includes('chapter=cph-24&section=chapter-cph-24'));
        await go(page,'home');await page.locator('.xp-continue a.xp-button').click();await page.waitForTimeout(100);
        record('book return: later chapter is open',await page.locator('#chapter-cph-24').getAttribute('open')!==null);
        record('book return: focus reaches later chapter',await page.evaluate(()=>document.activeElement.id)==='chapter-cph-24');
        await go(page,'course/cph-13?node=s1');
        record('legacy chapter node: focus reaches preserved first section',await page.evaluate(()=>document.activeElement.id)==='lesson-s1');
      });
      await checkpoint('ledger export and restore',async()=>{
        await go(page,'journal');await page.locator('.learning-backups summary').click();
        const [download]=await Promise.all([page.waitForEvent('download'),page.locator('[data-ledger-export]').click()]);
        const backup=JSON.parse(await fs.readFile(await download.path(),'utf8'));
        record('export: selected ledger schema only',backup.version===1&&Array.isArray(backup.events)&&!('entries' in backup)&&!('notes' in backup));
        const before=await page.evaluate(key=>localStorage.getItem(key),key);
        await page.locator('[data-ledger-import]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
        record('restore: invalid file preserves original bytes',await page.evaluate(key=>localStorage.getItem(key),key)===before);
        const otherStores=await page.evaluate(()=>Object.fromEntries(['learn-fieldbook-v1','learn-workbench.progress.v1','learn-studio-v1'].map(k=>[k,localStorage.getItem(k)])));
        await page.locator('[data-ledger-import]').setInputFiles({name:'synthetic-ledger.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
        await page.locator('[data-ledger-confirm]').waitFor();
        record('restore: preview does not write',await page.evaluate(key=>localStorage.getItem(key),key)===before);
        await page.locator('[data-ledger-confirm]').click();
        record('restore: confirmed backup retains read identity',(await snapshot(page)).events.some(e=>e.kind==='read'&&e.activityId==='knowledge:autodiff-gradient-accumulation'));
        const afterOther=await page.evaluate(()=>Object.fromEntries(['learn-fieldbook-v1','learn-workbench.progress.v1','learn-studio-v1'].map(k=>[k,localStorage.getItem(k)])));
        record('restore: fieldbook and older progress unchanged',JSON.stringify(afterOther)===JSON.stringify(otherStores));
      });
    }
    await context.close();
  }
  record('all routes: no uncaught JavaScript error',pageErrors.length===0,JSON.stringify(pageErrors));
  record('all routes: no local missing asset',networkErrors.length===0,JSON.stringify(networkErrors));
} finally {
  await browser.close();
  const report={at:new Date().toISOString(),base,checks:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass),results,pageErrors,networkErrors};
  await fs.writeFile(path.join(out,'architecture-results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks:report.checks,passed:report.passed,failures:report.failed,pageErrors},null,2));
  if(report.failed.length)process.exitCode=1;
}
