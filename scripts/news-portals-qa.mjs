import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080}});page.setDefaultTimeout(15000);
const results=[],errors=[];page.on('pageerror',error=>errors.push(error.message));
const assert=(value,message)=>{if(!value)throw Error(message);};
async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS '+name);}catch(error){results.push({name,pass:false,error:error.message});console.log('FAIL '+name+': '+error.message);}}
await page.goto('http://127.0.0.1:4173');await page.locator('#home .feature-story').waitFor();
await check('one article at a time on Daily and Market Pulse; next, previous and wrap preserve complete titles in photos',async()=>{
 for(const scope of ['home','news']){
  const deck=page.locator('[data-news-scope="'+scope+'"]');await deck.scrollIntoViewIfNeeded();
  assert(await deck.locator('.sourced-story').count()===1,'More than one article');
  const before=await deck.locator('h3').innerText();await deck.locator('[data-action="news-next"]').click();assert(await deck.locator('h3').innerText()!==before,'Next did not change story');
  await deck.locator('[data-action="news-prev"]').click();assert(await deck.locator('h3').innerText()===before,'Previous did not restore story');
  assert(await deck.locator('.news-cover h3').evaluate(h=>{const a=h.getBoundingClientRect(),b=h.closest('.news-cover').getBoundingClientRect();return a.top>=b.top&&a.bottom<=b.bottom&&a.left>=b.left&&a.right<=b.right;}),'Headline escapes cover');
 }
});
await check('all 10 course collections expose 11 real originals; PDFs support byte-range reading and PPT downloads',async()=>{
 const catalog=await (await page.request.get('http://127.0.0.1:4173/data/reference.json')).json();let total=0;
 for(const course of catalog.courses){
  await page.goto('http://127.0.0.1:4173/#course/'+course.id);await page.locator('#course .source-material a').first().waitFor();
  const downloads=page.locator('#course .source-material a[href*="download=1"]');assert(await downloads.count()===course.books.length,'Missing attachment for '+course.name);total+=await downloads.count();
  assert(await page.locator('#course .course-portal').count()===1,'Missing course website slot');
  for(const book of course.books){const response=await page.request.get('http://127.0.0.1:4173/api/materials/'+book.id,{headers:{Range:'bytes=0-31'}});assert(response.status()===206,'Original not readable');assert((await response.body()).length===32,'Wrong range');if(book.legacy)assert(response.headers()['content-disposition'].startsWith('attachment'),'PPT should download');else assert(response.headers()['content-type']==='application/pdf','Incorrect PDF type');}
 }
 assert(total===11,'Incorrect number of originals');
});
await check('course URL create/edit/delete persists after reload, rejects unsafe links and leaves other courses and learning history intact',async()=>{
 await page.goto('http://127.0.0.1:4173/#course/consumer-behaviour');await page.locator('#course [data-action="course-link"]').click();
 await page.locator('#course-site-url').fill('http://unsafe.example');await page.locator('#course-link-form button[type="submit"]').click();assert(await page.locator('#modal').evaluate(d=>d.open),'Unsafe URL accepted');assert((await page.locator('#course-link-error').innerText()).includes('HTTPS'),'Missing recovery guidance');
 await page.locator('#course-site-url').fill('https://course.example/consumer/chapter-1');await page.locator('#course-link-form button[type="submit"]').click();
 await page.reload();const link=page.locator('#course .course-portal a');await link.waitFor();assert(await link.getAttribute('href')==='https://course.example/consumer/chapter-1','URL lost');assert(await link.getAttribute('target')==='_blank','Website must open separately');assert((await link.getAttribute('rel')).includes('noopener'),'Unsafe new tab');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')));assert(!before.courseLinks['digital-marketing'],'Another course inherited link');
 await page.context().route('https://course.example/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Course learning website</h1>'}));
 const popupPromise=page.waitForEvent('popup');await link.click();const popup=await popupPromise;await popup.waitForURL('https://course.example/consumer/chapter-1');await popup.close();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')));assert(after.attempts.length===before.attempts.length&&after.completed.length===before.completed.length,'Opening a link changed learning evidence');
 await page.locator('#course [data-action="course-link"]').click();await page.locator('#course-site-url').fill('');await page.locator('#course-link-form button[type="submit"]').click();assert(await page.locator('#course .course-portal a').getAttribute('href')==='https://zin-consumer-behaviour-lab.taupeperiwinkle4.chatgpt.site','Default subject website not restored');
 await page.reload();await page.locator('#course .course-portal').waitFor();assert(await page.locator('#course .course-portal a').getAttribute('href')==='https://zin-consumer-behaviour-lab.taupeperiwinkle4.chatgpt.site','Default website lost after reload');
});
for(const width of [390,768,1024,1440,1920])await check('complete headlines, attachments and portal fit '+width+'px',async()=>{
 await page.setViewportSize({width,height:1080});await page.goto('http://127.0.0.1:4173/#course/management-information-system');await page.locator('#course .source-material a').first().waitFor();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Course overflows');
 await page.goto('http://127.0.0.1:4173/#home');await page.locator('#home .news-cover h3').waitFor();await page.locator('#home .news-cover').scrollIntoViewIfNeeded();
 assert(await page.locator('#home .news-cover h3').evaluate(h=>{const a=h.getBoundingClientRect(),b=h.closest('.news-cover').getBoundingClientRect();return a.bottom<=b.bottom&&a.right<=b.right;}),'Headline overflows photo');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Daily overflows');
 if(width===390||width===1440)await page.screenshot({path:'.preview/news-focus-'+width+'.png'});
});
await check('no runtime errors',async()=>assert(!errors.length,errors.join('; ')));
await writeFile('.preview/news-portals-qa.json',JSON.stringify({results,errors},null,2));await browser.close();if(results.some(result=>!result.pass))process.exitCode=1;
