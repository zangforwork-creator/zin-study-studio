import {chromium} from 'playwright-core';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {MEDIA_SNAPSHOTS} from '../dist/media-snapshots.js';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1536,height:1100}}),page=await context.newPage();
const edition=JSON.parse(await readFile('dist/data/reading-seed.json','utf8')),results=[];
// Isolated browser fixture: an unchanged source story whose local source image is available.
const sourceStory=edition.items.find(i=>MEDIA_SNAPSHOTS[i.url]);assert(sourceStory,'Need a real matched photo fixture');edition.items=[sourceStory];const seed=JSON.stringify(edition);
await context.route('**/api/reading',r=>r.fulfill({contentType:'application/json',body:seed}));
await page.clock.install({time:new Date('2026-11-18T03:00:00Z')});
await mkdir('.preview/polish-20',{recursive:true});
async function open(route){await page.goto('http://127.0.0.1:4173/#'+route);await page.reload();await page.locator('.hero h1').waitFor();await page.locator('.book-front').first().waitFor();await page.evaluate(()=>{for(const i of document.images)i.loading='eager';return Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});}
await open('home');
await page.screenshot({path:'.preview/polish-20/home-empty.png',fullPage:true});
assert.equal(await page.locator('.exam-planned-empty').count(),1);
assert.equal(await page.locator('.exam-planned-empty .exam-time strong').innerText(),'—');
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v2'))?.exams?.length||0),0);
await page.evaluate(async()=>{const {loadState}=await import('/core.js'),s=loadState().state;s.exams=[['consumer-behaviour','Consumer Behaviour','2026-11-28'],['digital-marketing','Digital Marketing','2026-12-05'],['e-commerce','E-Commerce','2026-12-12'],['management-information-system','Management Information System','2026-12-19']].map(([courseId,subject,date],i)=>({id:'visual-'+i,subject,courseId,type:'Final',date,time:'',location:'Room B302',note:'',addedAt:'2026-11-01T05:00:00Z'}));localStorage.setItem('zin-studio-v2',JSON.stringify(s));});
await open('home');
await page.screenshot({path:'.preview/polish-20/home-scheduled.png',fullPage:true});
assert.equal(await page.locator('.next-exam .exam-time strong').innerText(),'10');
for(const width of [360,390,768,1366,1536,1920]){
 await page.setViewportSize({width,height:1100});
 for(const route of ['home','bookshelf']){
  await open(route);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Viewport overflow '+route+' '+width);
  const overlaps=await page.locator('.book-main').evaluateAll(cards=>cards.flatMap(c=>{const cover=c.querySelector('.book-cover'),head=c.querySelector('h2'),card=c.closest('.book-card');if(!cover||!head)return [];const a=cover.getBoundingClientRect(),b=head.getBoundingClientRect(),d=card.getBoundingClientRect();return a.right>b.left+1||a.left<d.left-2||a.right>d.right+2?[{title:head.textContent,a:a.toJSON(),b:b.toJSON()}]:[];}));
  assert.equal(overlaps.length,0,JSON.stringify({width,route,overlaps}));
  results.push({width,route,fit:true});
  if([390,1366,1920].includes(width))await page.screenshot({path:`.preview/polish-20/${route}-${width}.png`,fullPage:true});
 }
}
await page.setViewportSize({width:1536,height:1000});await open('bookshelf');
const before=await page.evaluate(()=>localStorage.getItem('zin-studio-v2'));
await page.locator('#shelf-sort').selectOption('title');
const titles=await page.locator('.book-main h2').allTextContents();assert.deepEqual(titles,[...titles].sort((a,b)=>a.localeCompare(b)));
await page.locator('#shelf-sort').selectOption('recent');
assert.equal(await page.evaluate(()=>localStorage.getItem('zin-studio-v2')),before);
await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('zin-studio-v2'));s.documents.push({id:'visual-doc',courseId:'e-commerce',name:'QA only.docx',type:'docx',added:'2026-11-18T03:00:00Z',sections:[]});localStorage.setItem('zin-studio-v2',JSON.stringify(s));});
await open('bookshelf');await page.locator('#shelf-sort').selectOption('recent');assert((await page.locator('.book-card').first().innerText()).includes('E-Commerce'));
await open('home');
const photos=await page.locator('.reading-tile .reading-media img').evaluateAll(imgs=>imgs.map(i=>({loaded:i.complete&&i.naturalWidth>0,opacity:getComputedStyle(i).opacity,filter:getComputedStyle(i).filter})));
assert.equal(photos.length,2);assert(photos.every(p=>p.loaded&&p.opacity==='1'&&p.filter==='none'),JSON.stringify(photos));
await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('zin-studio-v2'));s.exams[0].date='2026-11-18';s.exams[0].time='16:00';localStorage.setItem('zin-studio-v2',JSON.stringify(s));});
await open('home');
for(const width of [390,1366,1920]){await page.setViewportSize({width,height:1000});assert.equal(await page.locator('.next-exam .exam-time strong').innerText(),'Today');const fit=await page.locator('.next-exam').evaluate(c=>{const t=c.querySelector('.exam-time').getBoundingClientRect(),h=c.querySelector('h3').getBoundingClientRect(),b=c.getBoundingClientRect();return t.right<=b.right&&t.left>=h.right;});assert(fit,'Today label overlap '+width);}
await writeFile('.preview/polish-20/results.json',JSON.stringify({results,photos,sort:true,today:true,empty:true},null,2));
console.log(JSON.stringify({layouts:results.length,photos,sort:true,today:true,empty:true}));await browser.close();
