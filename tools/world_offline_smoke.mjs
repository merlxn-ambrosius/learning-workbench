import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.argv[3]?pathToFileURL(process.argv[3]).href:'playwright');
const file=process.argv[2];if(!file)throw new Error('Pass the generated offline HTML path.');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const checks=[];
try {
 const context=await browser.newContext({viewport:{width:1280,height:900}});await context.setOffline(true);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=pathToFileURL(file).href;await page.goto(base+'#/home');await page.locator('.world-home').waitFor();
 assert.equal(await page.locator('.xp-subject-links a').count(),6);checks.push('offline home and all six disciplines');
 await page.goto(base+'#/maps');await page.locator('[data-km-locate]').selectOption('zero-to-hero');
 await page.locator('[data-km-inspector] a[href="#/course/zero-to-hero"]').click();await page.locator('.xp-course').waitFor();
 await page.goto(base+'#/learn/micrograd');
 await page.locator('#mg-measure').click();assert.ok(await page.locator('#mg-results').isVisible());checks.push('embedded map to course to real calculation');
 await page.locator('#fieldnote-body').fill('离线合成检查：共享路径仍可继续研究');await page.locator('#fieldnote-next').fill('换一个表达式');await page.locator('[data-field-exit]').click();await page.locator('.world-home').waitFor();
 assert.match(await page.locator('.world-return').innerText(),/换一个表达式/);await page.reload();await page.locator('.xp-continue .xp-button').click();await page.locator('#mg-results').waitFor();checks.push('offline notebook save, exit, refresh, resume latest experiment');
 await page.goto(base+'#/workshop');const [download]=await Promise.all([page.waitForEvent('download'),page.locator('.project-download').click()]);
 assert.equal(download.suggestedFilename(),'engine.py');assert.match(await fs.readFile(await download.path(),'utf8'),/class Value/);checks.push('real starter download remains available offline');
 await page.goto(base+'#/studio/segment');await page.locator('[data-action="run"]').click();assert.ok(await page.locator('[data-field-composer]').isVisible());checks.push('Studio rendering preserves shared notebook offline');
 assert.deepEqual(errors,[]);checks.push('no uncaught errors while network is disabled');
 const report={file,at:new Date().toISOString(),checks,errors};
 if(process.argv[4])await fs.writeFile(process.argv[4],JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
