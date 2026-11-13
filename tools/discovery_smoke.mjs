// Development-only real Chrome checks; synthetic records in isolated profiles.
// node tools/discovery_smoke.mjs [screenshot-dir] [path-to-playwright-index.mjs]
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.argv[3]?pathToFileURL(resolve(process.argv[3])).href:'playwright');
const out=resolve(process.argv[2]||'/tmp/learn-discovery-check');await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=process.env.LEARN_PREVIEW_URL||'http://127.0.0.1:4173/';
const errors=[],results=[];
const check=(ok,msg)=>{assert.ok(ok,msg);results.push(msg);};
async function text(page,selector){return page.locator(selector).innerText();}
async function width(page){check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow');}
async function act(page,name){await page.locator(`[data-action="${name}"]`).click();}
try {
  for(const w of [1280,390,320]){
    const context=await browser.newContext({viewport:{width:w,height:900},reducedMotion:'reduce',acceptDownloads:true});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'#/home');
    // Studio remains a directly addressable research prototype. The new course
    // homepage need not present it as the learner's primary starting point.
    const studioEntry=page.locator('a[href="#/studio"]');
    if(await studioEntry.count())await studioEntry.first().click();else await page.goto(base+'#/studio');
    await page.locator('.d-cards').waitFor({state:'visible'});check(await page.locator('.d-cards .d-card').count()===3,`${w}: three activity entrypoints`);await width(page);
    if(w===1280)await page.screenshot({path:out+'/hub-1280.png',fullPage:true});
    // A meaningful wrong prediction, no hint first, then keyboard hint and recovery.
    await page.locator('a[href="#/studio/segment"]').click();
    await page.locator('[data-choice="same"]').press('Enter');await act(page,'run');
    check((await text(page,'.d-observation')).includes('与刚才的判断不同'),`${w}: segment wrong prediction is explained`);
    check((await text(page,'.d-observation')).includes('B = 8'),`${w}: segment computed witness`);
    await page.locator('[data-help="1"]>summary').press('Enter');
    await page.locator('[data-field="reflection"]').fill('合成检查：我想保留接缝贡献。');
    await act(page,'finish');check(await page.locator('[data-action="again"]').evaluate(e=>e===document.activeElement),`${w}: completion focus stays in activity`);await act(page,'again');
    check(await page.locator('[data-choice]').first().evaluate(e=>e===document.activeElement),`${w}: new round focus reaches prediction`);
    check(await page.locator('[data-field="x"]').inputValue()==='-3',`${w}: next segment changes only x`);
    await page.locator('[data-choice="same"]').click();await act(page,'run');
    check((await text(page,'.d-observation')).includes('A = 5，B = 5'),`${w}: segment tie is computed`);
    await page.locator('.d-build>summary').click();await act(page,'challenge');
    check((await text(page,'.d-build')).includes('找到一对摘要相同'),`${w}: incomplete summary has genuine counterexample`);
    await page.locator('[data-summary="prefix"]').check();check(!(await text(page,'.d-build')).includes('找到一对摘要相同'),`${w}: stale summary feedback cleared`);await page.locator('[data-summary="suffix"]').check();await act(page,'challenge');
    check((await text(page,'.d-build')).includes('有限枚举本身不保证'),`${w}: full summary avoids claiming empirical proof`);
    await width(page);await act(page,'leave');
    await page.locator('a[href="#/studio/segment"]').first().click();
    check(await page.locator('[data-field="x"]').inputValue()==='-3',`${w}: segment input resumes`);
    check((await text(page,'.d-prior')).includes('合成检查'),`${w}: prior reasoning is carried`);
    await page.reload();check(await page.locator('[data-field="x"]').inputValue()==='-3',`${w}: reload restores segment`);
    if(w===320)await page.screenshot({path:out+'/segment-320.png',fullPage:true});
    // Dijkstra: first connection is wrong at 10, correct number at 8 is not a proof.
    await page.goto(base+'#/studio/routes?invite=question');await act(page,'next');
    await page.locator('[data-choice="stop"]').press('Space');await act(page,'run');
    check((await text(page,'.d-observation')).includes('会报告 10'),`${w}: early stopping reports 10`);
    check((await text(page,'.d-observation')).includes('路线检查得到 9'),`${w}: counterexample reports 9`);
    check(!await page.locator('.d-explanation').evaluate(e=>e.open),`${w}: rule not auto-opened`);
    await act(page,'next');await act(page,'next');await page.locator('[data-choice="stop"]').click();await act(page,'run');
    check(await page.locator('[data-action="next"]').isEnabled(),`${w}: next remains available after sufficient stop`);check((await text(page,'.d-observation')).includes('已经可被保证'),`${w}: certified final state`);
    await page.locator('[data-field="reflection"]').fill('合成检查：队首与当前路线比较。');await act(page,'finish');
    if(w===1280)await page.screenshot({path:out+'/routes-ending-question.png',fullPage:true});
    await act(page,'leave');await page.locator('a[href="#/studio/routes"]').first().click();
    check((await text(page,'.d-ending')).includes('合成检查'),`${w}: saved end state restores`);
    await act(page,'again');check(await page.locator('[data-field="weight"]').inputValue()==='8',`${w}: single changed edge`);
    await act(page,'next');await page.locator('[data-choice="stop"]').click();await act(page,'run');
    check((await text(page,'.d-observation')).includes('数值恰好正确'),`${w}: lucky correct output not certified`);await width(page);
    // micrograd: finite difference then wrong operator, fix, nondiscriminating zero.
    await page.goto(base+'#/studio/gradient');await page.locator('[data-field="prediction"]').fill('A 与 B 都是2');await act(page,'run');
    check((await text(page,'.d-observation')).includes('4.1'),`${w}: real shared finite difference`);
    await page.locator('.d-build>summary').press('Enter');await act(page,'challenge');
    check((await text(page,'.d-build')).includes('覆盖贡献'),`${w}: assignment bug exposed`);
    await page.locator('[data-field="operator"]').selectOption('add');await act(page,'challenge');
    check((await text(page,'.d-build')).includes('当前例子吻合'),`${w}: accumulation fix checked`);
    await page.locator('[data-field="x"]').selectOption('0');await act(page,'challenge');
    check((await text(page,'.d-build')).includes('无法区分'),`${w}: zero is explicitly nondiscriminating`);
    await page.locator('[data-field="x"]').selectOption('-2');await act(page,'run');
    check((await text(page,'.d-observation')).includes('-3.9'),`${w}: signed counterexample`);
    await page.locator('[data-motion]').check();await page.reload();check(await page.locator('[data-motion]').isChecked(),`${w}: reduced motion setting restores`);
    await width(page);if(w===1280)await page.screenshot({path:out+'/gradient-1280.png',fullPage:true});
    const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('learn-discovery-v1')));
    check(state.trials.segment.help===2&&state.trials.gradient.help===2,`${w}: construction assistance is recorded`);
    check(state.history.length>=2,`${w}: old rounds preserved`);
    check(state.events.every(e=>e.at&&e.help!==undefined),`${w}: observable help context persists`);
    // Guard against xss in restored learner text.
    await page.locator('[data-field="reason"]').fill('<img src=x onerror=alert(1)>');await page.reload();
    check(await page.locator('.discovery img').count()===0,`${w}: note markup remains text`);
    await context.close();
  }
  // Both invitation variants use fresh same-start profiles; only end invitation differs.
  const variants=[];
  for(const invite of ['plain','question']){
    const context=await browser.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();
    await page.goto(base+`#/studio/routes?invite=${invite}`);variants.push(await text(page,'.d-canvas'));
    await page.locator('[data-field="reflection"]').fill('同起点合成想法');await act(page,'finish');
    await page.screenshot({path:out+`/invitation-${invite}.png`,fullPage:true});
    await act(page,'leave');await page.locator('a[href="#/studio/routes"]').first().click();
    check(await page.locator('[data-studio]').getAttribute('data-invite')===invite,`${invite}: assigned invitation survives exit`);check((await text(page,'.d-ending')).includes('同起点'),`${invite}: save/exit/restoration`);await act(page,'again');
    check(await page.locator('[data-field="weight"]').inputValue()==='8',`${invite}: equivalent continuation`);
    await context.close();
  }
  check(variants[0]===variants[1],'invitation experiment begins with exactly identical task');
  // Visual single-factor pair, same task at initial state.
  for(const look of ['ink','paper']){
    const context=await browser.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();
    await page.goto(base+`#/studio/routes?look=${look}`);await page.screenshot({path:out+`/visual-${look}.png`,fullPage:true});await context.close();
  }
  // Existing records survive corruption/conflict; no personal data is used.
  const context=await browser.newContext();const p=await context.newPage();await p.goto(base);
  await p.evaluate(()=>localStorage.setItem('learn-discovery-v1','{corrupt'));await p.goto(base+'#/studio/segment');
  await p.locator('[data-choice="different"]').click();await act(p,'run');
  check(await p.evaluate(()=>localStorage.getItem('learn-discovery-v1'))==='{corrupt','corrupt original survives clicks');
  check((await text(p,'.d-warning')).includes('暂停写入'),'corruption warning visible');
  await p.locator('.d-backup>summary').click();
  const rawDownload=p.waitForEvent('download');await act(p,'raw');const raw=await rawDownload;await raw.saveAs(out+'/synthetic-corrupt-original.json');
  await p.locator('[data-import]').setInputFiles({name:'synthetic-recovery.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,last:'routes',trials:{routes:{weight:8,reason:'restored synthetic'}},events:[]}))});
  // Import preview follows asynchronous File.text(); wait for the required
  // content rather than racing the file reader after setting the input.
  await p.waitForFunction(()=>document.querySelector('[data-import-preview]')?.textContent.includes('备份含 1 个活动'));
  check((await text(p,'[data-import-preview]')).includes('备份含 1 个活动'),'valid recovery preview is displayed');
  await act(p,'confirm-import');check(await p.evaluate(()=>JSON.parse(localStorage.getItem('learn-discovery-v1')).trials.routes.reason)==='restored synthetic','explicit import recovers corrupt storage');
  await context.close();
  const multi=await browser.newContext();const a=await multi.newPage(),b=await multi.newPage();
  await a.goto(base+'#/studio/segment');await b.goto(base+'#/studio/gradient');
  await a.locator('[data-field="reason"]').fill('first tab');await b.locator('[data-field="reason"]').fill('second tab');
  check((await text(b,'[data-save-status]')).includes('另一标签页'),'cross-tab conflict visible');
  check((await a.evaluate(()=>JSON.parse(localStorage.getItem('learn-discovery-v1')))).trials.segment.reason==='first tab','conflicting tab does not overwrite');await multi.close();
  for(const id of ['segment','routes','gradient']){
    const c=await browser.newContext({viewport:{width:320,height:900}});const page=await c.newPage();await page.goto(base+`#/studio/${id}?mode=static`);
    check(await page.locator('.d-canvas figure').count()===(id==='routes'?3:2),`${id}: strong baseline contains real fixed figures`);
    check(await page.locator('.d-canvas button').count()===0,`${id}: static figures have no interactive runner`);
    await width(page);await page.screenshot({path:out+`/static-${id}-320.png`,fullPage:true});await c.close();
  }
  check(errors.length===0,'no page JavaScript errors');
  await writeFile(out+'/results.json',JSON.stringify({date:'2026-11-13',checks:results.length,results,errors},null,2));
  console.log(`PASS: ${results.length} browser assertions; screenshots: ${out}`);
} finally {await browser.close();}
