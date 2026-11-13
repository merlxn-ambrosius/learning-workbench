// Development-only real-browser checks. Uses disposable profiles and synthetic navigation.
// Usage: node tools/knowledge_map_smoke.mjs <private-output-directory> <playwright-index.mjs>
// LEARN_PREVIEW_URL selects the local preview; CHROME_PATH can select an installed browser.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {buildKnowledgeMapModel, resolveMapTarget} from '../site/knowledge-map.mjs';

const out=path.resolve(process.argv[2]||'/tmp/learn-knowledge-map-smoke');
const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(out===repository||out.startsWith(repository+path.sep))throw new Error('Choose a local output directory outside the repository.');
const {chromium}=await import(process.argv[3]?pathToFileURL(path.resolve(process.argv[3])).href:'playwright');
const base=(process.env.LEARN_PREVIEW_URL||'http://127.0.0.1:4174/').replace(/\/?$/,'/');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[],pageErrors=[],networkErrors=[];
const model=buildKnowledgeMapModel();
const record=(name,pass,details='')=>results.push({name,pass:Boolean(pass),...(details?{details}:{})});
const checkpoint=async(name,fn)=>{try{await fn();}catch(error){record(name,false,error.message);}};
const go=async(page,query='')=>{
  await page.goto(base+'#/maps'+(query?'?'+query:''));
  try{await page.locator('[data-knowledge-map][data-km-bound="true"]').waitFor();}
  catch(error){const diagnostic=await page.evaluate(()=>({url:location.href,title:document.title,mapPresent:!!document.querySelector('[data-knowledge-map]'),bound:document.querySelector('[data-knowledge-map]')?.dataset.kmBound,body:document.body.innerText.slice(0,450)}));throw new Error(error.message+'\n'+JSON.stringify(diagnostic));}
  await page.waitForTimeout(80);
};
const selected=page=>page.locator('[data-knowledge-map]').getAttribute('data-km-selected');
const checkOverflow=async(page,name)=>{const sizes=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));record(name,sizes.scroll<=sizes.viewport+1,JSON.stringify(sizes));};
await fs.mkdir(out,{recursive:true});
try{
  for(const width of [1440,820,390,320]){
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<500,isMobile:width<500,reducedMotion:'reduce'});
    const page=await context.newPage();page.setDefaultTimeout(5000);
    page.on('pageerror',error=>pageErrors.push({width,url:page.url(),message:error.message}));
    page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)networkErrors.push({width,status:response.status(),url:response.url()});});
    await checkpoint(`global map ${width}`,async()=>{
      await go(page);
      record(`global ${width}: page has its own heading`,await page.locator('#page-content h1').count()===1);
      record(`identity ${width}: canonical node count`,await page.locator('[data-km-node]').count()===model.nodes.length);
      record(`identity ${width}: chapter aliases are not course nodes`,await page.locator('[data-km-node="cph-13"],[data-km-node="micrograd"]').count()===0);
      record(`dependency ${width}: only authored knowledge edges`,await page.locator('[data-km-edge]').count()===model.edges.length);
      await checkOverflow(page,`global ${width}: no page overflow`);
      await page.screenshot({path:path.join(out,`map-global-${width}.png`),fullPage:true});
      const coordinates=await page.locator('[data-km-node]').evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>[node.dataset.kmNode,[node.dataset.x,node.dataset.y]])));
      await page.locator('[data-km-filter="finance"]').click();
      record(`lens ${width}: only financial source is visible`,await page.locator('[data-km-node]:visible').count()===model.nodes.filter(n=>n.subjectIds.includes('finance')).length);
      record(`lens ${width}: unrelated edges hidden`,await page.locator('[data-km-edge]:visible').count()===0);
      const after=await page.locator('[data-km-node]').evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>[node.dataset.kmNode,[node.dataset.x,node.dataset.y]])));
      record(`lens ${width}: global coordinates unchanged`,JSON.stringify(coordinates)===JSON.stringify(after));
      await page.locator('[data-km-action="all"]').click();
      await page.locator('[data-km-locate]').selectOption('autodiff-gradient-accumulation');
      record(`shared ${width}: one canonical node selected`,await selected(page)==='autodiff-gradient-accumulation'&&await page.locator('[data-km-node="autodiff-gradient-accumulation"]').count()===1);
      record(`shared ${width}: both course occurrences are available`,await page.locator('[data-km-inspector] a[href*="occurrence="]').count()===2);
      record(`dependency ${width}: selected reason is inspectable`,(await page.locator('.km-related').innerText()).includes('多条贡献路径'));
      await page.locator('[data-km-node="autodiff-gradient-accumulation"]').focus();await page.keyboard.press('ArrowLeft');
      record(`keyboard ${width}: directional node focus`,await page.evaluate(()=>Boolean(document.activeElement?.dataset.kmNode)&&document.activeElement.dataset.kmNode!=='autodiff-gradient-accumulation'));
      const stage=page.locator('[data-km-stage]');await stage.focus();
      const scale=Number(await page.locator('[data-knowledge-map]').getAttribute('data-km-zoom'));await page.keyboard.press('+');
      record(`keyboard ${width}: zoom`,Number(await page.locator('[data-knowledge-map]').getAttribute('data-km-zoom'))>scale);
      const transform=await page.locator('[data-km-scene]').getAttribute('style');await page.keyboard.press('ArrowRight');
      record(`keyboard ${width}: pan`,await page.locator('[data-km-scene]').getAttribute('style')!==transform);
      await page.keyboard.press('Home');
      record(`keyboard ${width}: fit remains finite`,Number.isFinite(Number(await page.locator('[data-knowledge-map]').getAttribute('data-km-zoom'))));
      await go(page,'node=autodiff-gradient-accumulation');
      await page.screenshot({path:path.join(out,`map-shared-${width}.png`),fullPage:true});
      await page.locator('[data-km-inspector] a[href*="course=learn-optimization-path"]').click();
      record(`context ${width}: shared node opens selected course occurrence`,page.url().includes('occurrence=optimization-autodiff')&&(await page.locator('body').innerText()).includes('参数更新'));
    });
    await checkpoint(`chapter alias ${width}`,async()=>{
      await go(page,'node=cph-13');
      record(`chapter ${width}: parent is whole book`,await selected(page)==='competitive-programmers-handbook');
      record(`chapter ${width}: original chapter is expanded`,await page.locator('[data-km-chapter-detail="cph-13"]').count()===1);
      record(`chapter ${width}: source material retained`,await page.locator('[data-km-chapter-detail] a[target="_blank"]').count()===1);
      await checkOverflow(page,`chapter ${width}: no page overflow`);
      await page.screenshot({path:path.join(out,`map-chapter-${width}.png`),fullPage:true});
      await page.locator('[data-km-chapter-detail] a.km-primary').click();
      await page.locator('#chapter-cph-13').waitFor();
      record(`chapter ${width}: actual course chapter route opens`,page.url().includes('#/course/competitive-programmers-handbook?chapter=cph-13')&&await page.locator('#chapter-cph-13').getAttribute('open')!==null);
    });
    await checkpoint(`legacy bridges ${width}`,async()=>{
      for(const [id,scope] of [['agent','作业补桥'],['kl','论文专题']]){
        await go(page,'node='+id);
        record(`bridge ${width}: ${id} has correct identity`,await selected(page)===id&&(await page.locator('[data-km-inspector]').innerText()).includes(scope));
        record(`bridge ${width}: ${id} is not a course node`,await page.locator(`[data-km-node="${id}"]`).count()===0);
        await page.locator('[data-km-inspector] .km-primary').click();
        record(`bridge ${width}: ${id} learning unit remains reachable`,page.url().includes('#/course/'+id));
      }
    });
    if(width===1440)await checkpoint('all supported legacy aliases',async()=>{
      for(const alias of ['micrograd','cph-01','cph-13','cph-30','python','calculus','linear-algebra','probability','contracts','portfolio']){
        await go(page,'node='+alias);
        record('alias: '+alias,await selected(page)===resolveMapTarget(alias,model).nodeId);
      }
    });
    if(width<500)await checkpoint(`real touch ${width}`,async()=>{
      await go(page,'node=cph-13');const stage=page.locator('[data-km-stage]');await stage.scrollIntoViewIfNeeded();
      const box=await stage.boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
      const scale=Number(await page.locator('[data-knowledge-map]').getAttribute('data-km-zoom'));
      const cdp=await context.newCDPSession(page);
      for(const [type,radius] of [['touchStart',20],['touchMove',47]])await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[{x:x-radius,y,id:1},{x:x+radius,y,id:2}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(160);
      record(`touch ${width}: two-finger pinch over node`,Number(await page.locator('[data-knowledge-map]').getAttribute('data-km-zoom'))>scale);
      await stage.focus();await page.keyboard.press('Home');await page.locator('[data-km-node="computational-graph"]').tap();
      record(`touch ${width}: node tap selects`,await selected(page)==='computational-graph');
      const transform=await page.locator('[data-km-scene]').getAttribute('style'),pan=await stage.boundingBox();
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pan.x+25,y:pan.y+25,id:1}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pan.x+70,y:pan.y+80,id:1}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      record(`touch ${width}: one-finger pan`,await page.locator('[data-km-scene]').getAttribute('style')!==transform);
    });
    await context.close();
  }
  for(const mode of ['malformed','blocked'])await checkpoint(`optional navigation storage: ${mode}`,async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await context.addInitScript(mode=>{
      if(mode==='blocked')Object.defineProperty(window,'sessionStorage',{configurable:true,get(){throw new DOMException('blocked','SecurityError');}});
      else sessionStorage.setItem('learn-workbench.knowledge-map.view.v1','{broken');
    },mode);
    const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',error=>pageErrors.push({mode,message:error.message}));
    await go(page);record(`storage ${mode}: map still operates`,await page.locator('[data-km-node]').count()===model.nodes.length);
    await page.locator('[data-km-locate]').selectOption('zero-to-hero');record(`storage ${mode}: selection works`,await selected(page)==='zero-to-hero');await context.close();
  });
  record('all map routes: no uncaught JavaScript error',pageErrors.length===0,JSON.stringify(pageErrors));
  record('all map routes: no missing local asset',networkErrors.length===0,JSON.stringify(networkErrors));
}finally{
  await browser.close();
  const report={at:new Date().toISOString(),base,checks:results.length,passed:results.filter(item=>item.pass).length,failed:results.filter(item=>!item.pass),results,pageErrors,networkErrors};
  await fs.writeFile(path.join(out,'knowledge-map-results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks:report.checks,passed:report.passed,failed:report.failed,pageErrors,networkErrors},null,2));
  if(report.failed.length)process.exitCode=1;
}
