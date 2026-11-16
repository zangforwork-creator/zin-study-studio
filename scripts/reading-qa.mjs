import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});page.setDefaultTimeout(15000);
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const assert=(v,m)=>{if(!v)throw Error(m);};
async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS '+name);}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+e.message);}}
await page.goto('http://127.0.0.1:4173');await page.locator('#home .feature-story').waitFor({timeout:25000});
await check('removed home shelf; real sourced news and dated case panel appear',async()=>{
 assert(await page.locator('#home .courses-section,#home .book-volume').count()===0,'Duplicate shelf remains');
 assert(await page.locator('#library .book-volume').count()===10,'Main bookshelf missing');
 assert(await page.locator('#home .sourced-story').count()===5,'Home needs five briefs');
 assert(await page.locator('#case-study-panel [data-action="case-open"]').count()===1,'Daily case missing');
 assert((await page.locator('#home .reading-status').innerText()).includes('Cập nhật thành công'),'No update timestamp');
});
await check('images are unobscured and preserve proportions inside their frame',async()=>{
 assert(await page.locator('#home .story-image').count()>0,'No feed images');
 assert(await page.locator('#home .story-image').evaluateAll(xs=>xs.every(x=>getComputedStyle(x).objectFit==='contain'&&getComputedStyle(x).position==='static')),'Images are cropped or covered');
 assert(await page.locator('#home .sourced-story').evaluateAll(xs=>xs.every(x=>getComputedStyle(x,'::after').display==='none')),'Opaque overlay remains');
});
await check('case navigation changes the source and saving reading is idempotent',async()=>{
 const before=await page.locator('#case-study-panel h3').innerText();
 await page.locator('[data-action="case-next"]').click();assert(await page.locator('#case-study-panel h3').innerText()!==before,'Next case did not change');
 await page.locator('#case-study-panel [data-action="case-open"]').click();
 assert((await page.locator('#modal a[target="_blank"]').getAttribute('href')).includes('brandsvietnam.com/campaign/'),'Case lacks a primary source');
 await page.locator('#case-reflection').fill('Insight and strategy need separate evidence.');
 await page.locator('[data-action="case-save-note"]').click();
 await page.locator('[data-action="case-read"]').dblclick();
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')));
 assert(state.caseRead.length===1&&state.attempts.length===0,'Reading duplicated or raised mastery');
 assert(Object.entries(state.notes).some(([k,v])=>k.startsWith('case:')&&v.includes('evidence')),'Case reflection missing');
 await page.locator('[data-action="close-modal"]').click();await page.reload();await page.locator('#case-study-panel').waitFor();
 assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')).caseRead.length)===1,'Reload lost case activity');
});
await check('document cases use extracted source text and reopen the exact source page',async()=>{
 await page.locator('[data-action="case-tab"][data-id="documents"]').click();
 assert((await page.locator('#case-study-panel').innerText()).includes('Chỉ phần đọc được'),'Document limitation not explained');
 assert(await page.locator('#case-study-panel [data-action="upload"]').count()===1,'Upload recovery missing');
 await page.locator('#case-study-panel [data-action="upload"]').click();
 await page.locator('#document-file').setInputFiles(resolve('dist/assets/marketing-source-pages.pdf'));
 await page.locator('#upload-form button[type="submit"]').click();await page.locator('#pdf-canvas').waitFor();
 await page.locator('#extract-form button').click();await page.locator('#extract-status').filter({hasText:'Saved'}).waitFor();
 await page.locator('[data-action="case-tab"][data-id="documents"]').click();
 assert(await page.locator('#case-document-section option').count()>0,'Extracted pages did not become available');
 await page.locator('#case-study-panel [data-action="case-open"]').click();
 assert((await page.locator('#modal .case-body').innerText()).length>60,'No original extracted text shown');
 const source=page.locator('#modal [data-action="case-source-page"]'),expected=await source.getAttribute('data-page');
 await source.click();await page.locator('#modal').waitFor({state:'hidden'});await page.waitForFunction(value=>document.querySelector('#reader-page')?.value===value,expected);assert(await page.locator('#reader-page').inputValue()===expected,'Incorrect source page');
 await page.locator('[data-action="case-tab"][data-id="web"]').click();
});
await check('refresh preserves lesson drafts and existing learning controls',async()=>{
 await page.goto('http://127.0.0.1:4173/#lesson/needs-wants-demands');await page.locator('#lesson-note').fill('Unsaved lesson draft');
 await page.locator('#home [data-action="refresh-news"]').click();await page.waitForFunction(()=>!document.querySelector('#home [data-action="refresh-news"]').disabled,null,{timeout:22000});
 assert(await page.locator('#lesson-note').inputValue()==='Unsaved lesson draft','News refresh erased draft');
});
await check('news outages preserve cached reading and do not break lessons',async()=>{
 await page.route('**/api/reading',route=>route.abort());await page.reload();await page.locator('#lesson-note').waitFor();
 await page.waitForFunction(()=>document.querySelector('#home .reading-status').textContent.includes('Không tải được'),null,{timeout:22000});
 assert(await page.locator('#home .feature-story').count()===1,'Cached news disappeared');
 assert(await page.locator('#lesson [data-action="practice-lesson"]').count()===1,'Learning is blocked by news failure');
 await page.unroute('**/api/reading');
});
for(const theme of ['light','dark'])for(const width of [390,768,1440])await check('reading layout '+theme+' '+width+'px',async()=>{
 await page.setViewportSize({width,height:1100});await page.goto('http://127.0.0.1:4173/#home');await page.locator('#home .feature-story').waitFor({timeout:25000});
 await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.waitForTimeout(250);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
 if(width===1440)assert(await page.locator('#case-study-panel').evaluate(el=>el.getBoundingClientRect().left>innerWidth/2),'Case panel is not on the right');
 await page.screenshot({path:'.preview/reading-'+theme+'-'+width+'.png'});
});
await check('no runtime errors',async()=>assert(!errors.length,errors.join('\n')));
await writeFile('.preview/reading-qa.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify(results,null,2));
await browser.close();if(results.some(x=>!x.pass))process.exitCode=1;
