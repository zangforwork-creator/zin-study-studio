import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(8000);
const results=[],errors=[];
page.on('pageerror',err=>errors.push(err.message));
const assert=(value,message)=>{if(!value)throw Error(message);};
async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS '+name);}catch(err){results.push({name,pass:false,error:err.message});console.log('FAIL '+name+': '+err.message);}}
async function open(path='home'){
 await page.goto('http://127.0.0.1:4173/#'+path);
 await page.locator('#settings').waitFor();
 await page.locator('#home .feature-story').waitFor({timeout:22000});
}
async function navigate(key){
 if(await page.locator('.mobile-menu').isVisible()&&!await page.locator('.sidebar').evaluate(el=>el.classList.contains('open')))await page.locator('.mobile-menu').click();
 await page.locator(`.nav-item[href="#${key}"]`).click();
 try{await page.waitForFunction(id=>{
  const el=document.getElementById(id),box=el.getBoundingClientRect(),margin=parseFloat(getComputedStyle(el).scrollMarginTop);
  return Math.abs(box.top-margin)<3||(scrollY+innerHeight>=document.documentElement.scrollHeight-2&&box.top>=0&&box.top<innerHeight-40);
 },key);}catch(error){console.log('NAV DIAGNOSTIC '+JSON.stringify(await page.evaluate(id=>({key:id,top:document.getElementById(id)?.getBoundingClientRect().top,margin:getComputedStyle(document.getElementById(id)).scrollMarginTop,scrollY,height:document.documentElement.scrollHeight,focus:document.activeElement?.id,images:[...document.querySelectorAll('#home .story-image')].map(i=>({complete:i.complete,h:i.getBoundingClientRect().height})),sections:[...document.querySelectorAll('[data-section]')].map(e=>[e.id,e.getBoundingClientRect().top])}),key)));throw error;}
 await page.waitForTimeout(80);
}
await open();
await check('all six destinations coexist in one page',async()=>{
 assert(await page.locator('main > .studio-section').count()===6,'Sections missing');
 assert(await page.locator('#goals,a[href="#goals"],.goal-panel,.mini-goal').count()===0,'Removed goals UI remains');
 await page.evaluate(()=>window.originalHome=document.getElementById('home'));
 for(const key of ['library','study','news','saved','settings','home'])await navigate(key);
 assert(await page.evaluate(()=>window.originalHome===document.getElementById('home')),'Navigation replaced the page');
});
await check('home has no duplicate shelf; My Bookshelf retains original 3D covers',async()=>{
 assert(await page.locator('#home .courses-section,#home .book-volume').count()===0,'Duplicate home bookshelf remains');
 assert(await page.locator('#library .book-volume').count()===10,'Bookshelf volumes missing');
 for(const cover of await page.locator('#library .book-cover-image').all()){
  await cover.scrollIntoViewIfNeeded();await cover.evaluate(img=>img.decode());
  assert(await cover.evaluate(img=>Math.abs(img.clientWidth/img.clientHeight-img.naturalWidth/img.naturalHeight)<.015),'Cover distorted');
 }
});
await check('course opens inline and home is retained',async()=>{
 await page.locator('#library [data-action="course"]').first().click();
 await page.locator('#course').waitFor();
 assert(await page.locator('#course h1').innerText()==='Consumer Behaviour','Wrong course');
 assert(await page.evaluate(()=>window.originalHome!==null&&document.getElementById('home')!==null),'Home removed');
});
await check('search filters bookshelf and scrolls to it',async()=>{
 await page.locator('#global-search input').fill('Microeconomics');
 await page.locator('#global-search input').press('Enter');
 assert(await page.locator('#library .book-tile').count()===1,'Search not applied');
 assert(page.url().endsWith('#library'),'Search did not navigate');
 await page.locator('#library-search').fill('');
 assert(await page.locator('#library .book-tile').count()===10,'Clear did not restore courses');
});
await check('notes survive navigation and unrelated updates; save survives reload',async()=>{
 await open('lesson/needs-wants-demands');
 await page.locator('#lesson-note').fill('Draft: demand needs buying power.');
 await navigate('news');await navigate('study');
 assert(await page.locator('#lesson-note').inputValue()==='Draft: demand needs buying power.','Navigation lost draft');
 await page.locator('#news [data-action="save-story"]').first().click();
 assert(await page.locator('#lesson-note').inputValue()==='Draft: demand needs buying power.','Update lost draft');
 await page.locator('#lesson [data-action="save-note"]').click();
 await page.reload();await page.locator('#settings').waitFor();
 // A reload into Study Room still allows the lesson deep link to be reopened.
 await page.locator('#study a[href="#lesson/needs-wants-demands"]').click();
 assert(await page.locator('#lesson-note').inputValue()==='Draft: demand needs buying power.','Saved note lost');
});
await check('practice stays inline, retains response, and saves exactly one review',async()=>{
 await page.locator('#lesson [data-action="practice-lesson"]').click();
 await page.locator('#practice [data-action="begin-recall"]').click();
 await page.locator('#recall-answer').fill('A want backed by buying power.');
 await navigate('library');await navigate('study');
 assert(await page.locator('#recall-answer').inputValue()==='A want backed by buying power.','Response lost');
 await page.locator('#practice [data-action="reveal"]').click();
 await page.locator('#practice [data-action="rate"][data-id="good"]').dblclick();
 const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')));
 assert(s.attempts.length===1,'Repeated submission duplicated results');
 assert(Object.values(s.reviews).some(r=>r.nextReview),'No saved review date');
 await page.reload();await page.locator('#settings').waitFor();
 assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')).attempts.length)===1,'Reload lost review');
});
await check('saved stories persist and remain separate from course progress',async()=>{
 await navigate('saved');assert(await page.locator('#saved .feature-story').count()===1,'Saved story lost');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')).attempts.length);
 await page.locator('#saved [data-action="save-story"]').click();
 assert(await page.locator('#saved .feature-story').count()===0,'Unsave failed');
 assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')).attempts.length)===before,'News changed review history');
});
await check('PDF upload, extraction, source-linked card and reader stay inline',async()=>{
 await navigate('library');await page.locator('#library [data-action="upload"]').click();
 await page.locator('#upload-course').selectOption('introduction-to-marketing-career');
 await page.locator('#document-file').setInputFiles(resolve('dist/assets/marketing-source-pages.pdf'));
 await page.locator('#upload-form button[type="submit"]').click();
 await page.locator('#pdf-canvas').waitFor();
 await page.locator('#extract-form button').click();
 await page.locator('#extract-status').filter({hasText:'Saved'}).waitFor();
 assert(await page.locator('#reader .preview-highlight').count()>0,'No extracted source highlights');
 await page.locator('#reader [data-action="new-card"]').click();
 await page.locator('#card-question').fill('What turns a want into demand?');await page.locator('#card-answer').fill('Buying power.');
 await page.locator('#card-form button[type="submit"]').click();
 const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')));
 assert(s.cards[0]?.documentId===s.documents[0]?.id,'Card source link absent');
 await navigate('news');assert(await page.locator('#reader').count()===1,'Reader removed on navigation');
});
await check('back, forward, same-link activation and deep links scroll correctly',async()=>{
 await navigate('library');await navigate('news');await page.goBack();await page.waitForURL('**/#library');
 await page.waitForFunction(()=>Math.abs(document.getElementById('library').getBoundingClientRect().top-100)<5);
 await page.goForward();await page.waitForURL('**/#news');await navigate('news');
 assert(await page.locator('.nav-item[href="#news"]').getAttribute('aria-current')==='location','Navigation current indicator wrong');
 await open('saved');assert(await page.locator('#saved').evaluate(el=>el.getBoundingClientRect().top>=64),'Deep link hidden behind topbar');
 await open('goals');assert(page.url().endsWith('#home'),'Old goals link did not return to The Daily');
});
for(const width of [390,430,768,1024,1440])await check('responsive navigation and covers at '+width+'px',async()=>{
 await page.setViewportSize({width,height:900});await open();
 for(const key of ['library','study','news','saved','settings','home']){
  await navigate(key);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow at '+key);
  if(width<=760)assert(!await page.locator('.sidebar').evaluate(el=>el.classList.contains('open')),'Mobile menu did not close');
 }
});
await check('keyboard focus, reduced motion and both themes',async()=>{
 await page.setViewportSize({width:1440,height:1000});await open();
 await page.emulateMedia({reducedMotion:'reduce'});await navigate('library');
 const book=page.locator('#library .book-tile').first();await book.focus();await page.keyboard.press('Enter');
 await page.locator('#course').waitFor();
 assert(await page.locator('#library .book-volume').first().evaluate(el=>getComputedStyle(el).transitionDuration)==='0s','Reduced motion ignored');
 for(const theme of ['dark','light']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await navigate('home');
  await page.locator('#library').scrollIntoViewIfNeeded();
  await page.screenshot({path:'.preview/single-page-desktop-'+theme+'.png'});
 }
 await page.setViewportSize({width:390,height:900});await page.locator('#library').scrollIntoViewIfNeeded();
 await page.waitForTimeout(300);
 await page.locator('#library .book-cover-image').evaluateAll(xs=>Promise.all(xs.map(img=>img.decode())));
 await page.screenshot({path:'.preview/single-page-mobile.png'});
});
await check('no duplicate DOM IDs or browser errors',async()=>{
 const duplicates=await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id).filter((id,i,ids)=>ids.indexOf(id)!==i));
 assert(!duplicates.length,'Duplicate IDs: '+duplicates.join(','));assert(!errors.length,errors.join('\n'));
});
await writeFile('.preview/single-page-qa.json',JSON.stringify({results,errors},null,2));
console.log(JSON.stringify({results,errors},null,2));
await browser.close();if(results.some(r=>!r.pass))process.exitCode=1;
