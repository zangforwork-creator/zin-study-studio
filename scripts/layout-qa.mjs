import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});page.setDefaultTimeout(15000);
const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
const assert=(v,m)=>{if(!v)throw Error(m);};
async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS '+name);}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+e.message);}}
await page.goto('http://127.0.0.1:4173');await page.locator('#home .feature-story').waitFor({timeout:25000});
await check('desktop rail displays icons, exposes meaningful names and supports keyboard navigation',async()=>{
 assert(await page.locator('.sidebar').evaluate(e=>Math.round(e.getBoundingClientRect().width))===80,'Rail width wrong');
 assert(await page.locator('.nav-item').evaluateAll(xs=>xs.every(x=>x.innerText.trim()===''&&x.getAttribute('aria-label')&&x.title)),'Navigation text remains or labels are missing');
 const link=page.getByRole('link',{name:'My Bookshelf',exact:true});await link.focus();await page.keyboard.press('Enter');
 await page.waitForURL('**/#library');await page.waitForFunction(()=>Math.abs(document.getElementById('library').getBoundingClientRect().top-100)<4);
 assert(await page.locator('.nav-item[href="#library"]').getAttribute('aria-current')==='location','Current section not reflected');
});
await check('Google article displays its original locally captured image even when source proxy fails',async()=>{
 await page.route('**/api/reading/image*',route=>route.abort());
 await page.goto('http://127.0.0.1:4173/#home');await page.locator('#home .feature-story').waitFor();
 for(let i=0;i<20&&!await page.locator('#home .feature-story [data-id="live-195ffc81"]').count();i++)await page.locator('#home [data-action="news-next"]').click();
 const story=page.locator('#home .feature-story').filter({has:page.locator('[data-id="live-195ffc81"]')});
 const image=story.locator('.story-image');await image.scrollIntoViewIfNeeded();await image.evaluate(i=>i.decode());
 assert((await image.getAttribute('src')).includes('/reading-snapshots/'),'Source screenshot is not used');
 assert(await image.evaluate(i=>i.naturalWidth>1000),'Capture is missing or too small');
 await page.unroute('**/api/reading/image*');
});
await check('each current case changes to its own credited source image',async()=>{
 await page.locator('#case-study-panel').scrollIntoViewIfNeeded();
 const seen=new Set();
 for(let i=0;i<5;i++){
  const image=page.locator('.case-cover-image');await image.evaluate(i=>i.decode());
  const src=await image.getAttribute('src');seen.add(src);
  assert((await page.locator('.case-cover-credit a').getAttribute('href')).includes('brandsvietnam.com/campaign/'),'Image credit is not linked to its case');
  await page.locator('[data-action="case-next"]').click();
 }
 assert(seen.size===5,'Cases reuse an unrelated image');
});
for(const theme of ['light','dark'])for(const width of [390,430,768,1024,1440,1920])await check('responsive rail and columns '+theme+' '+width,async()=>{
 await page.setViewportSize({width,height:1050});await page.goto('http://127.0.0.1:4173/#home');await page.locator('#case-study-panel .case-cover').waitFor();
 await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.waitForTimeout(250);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
 if(width>900){
  const ratio=await page.evaluate(()=>{const a=document.getElementById('daily-news-content').getBoundingClientRect().width,b=document.querySelector('.home-aside').getBoundingClientRect().width;return a/(a+b);});
  assert(Math.abs(ratio-.6)<.005,'News/case ratio is '+ratio);
 }
 if(width<=760){
  assert(await page.locator('.sidebar').evaluate(e=>getComputedStyle(e).visibility==='hidden'),'Closed mobile menu remains focusable');
  await page.locator('.mobile-menu').click();await page.getByRole('link',{name:'Study Room',exact:true}).click();await page.waitForURL('**/#study');
  assert(await page.locator('.sidebar').evaluate(e=>getComputedStyle(e).visibility==='hidden'),'Mobile menu did not close');
  await page.goto('http://127.0.0.1:4173/#home');await page.locator('#case-study-panel').waitFor();
 }
 if([390,1440,1920].includes(width)){
  await page.locator('.case-cover-image').scrollIntoViewIfNeeded();
  await page.locator('.case-cover-image').evaluate(i=>i.decode());
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:'.preview/layout-'+theme+'-'+width+'.png'});
 }
});
await check('reduced motion keeps navigation usable; no runtime errors',async()=>{
 await page.emulateMedia({reducedMotion:'reduce'});assert(await page.locator('.sidebar').evaluate(e=>getComputedStyle(e).transitionDuration==='0s'),'Reduced motion ignored');assert(!errors.length,errors.join('\n'));
});
await writeFile('.preview/layout-qa.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify(results,null,2));await browser.close();if(results.some(x=>!x.pass))process.exitCode=1;
