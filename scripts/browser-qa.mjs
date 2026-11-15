import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve('.preview');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--no-default-browser-check','--disable-extensions']});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
const page=await context.newPage(),errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=async(name,fn)=>{try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}};
const expect=(v,message)=>{if(!v)throw Error(message);};
await page.goto('http://127.0.0.1:4173',{waitUntil:'networkidle'});
await page.locator('.feature-story').waitFor();
await page.evaluate(()=>{localStorage.setItem('zin-theme','light');document.documentElement.dataset.theme='light';});
await page.screenshot({path:resolve(out,'desktop-light.png'),fullPage:true});
await check('home uses real empty states and local images',async()=>{
 expect(await page.locator('.mini-goal').count()===4,'Four goal cards missing');
 expect((await page.locator('.mini-goal').first().innerText()).includes('—'),'GPA was invented');
 expect(await page.locator('img').evaluateAll(xs=>xs.every(x=>x.complete&&x.naturalWidth>0)),'Broken image');
});
await check('theme survives reload',async()=>{await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();await page.reload();expect(await page.locator('html').getAttribute('data-theme')==='dark','Theme not saved');await page.screenshot({path:resolve(out,'desktop-dark.png'),fullPage:true});});
await check('saved story survives reload and can be removed',async()=>{await page.getByRole('button',{name:'Save featured story',exact:true}).click();await page.reload();await page.getByRole('link',{name:/Saved Stories/}).click();await page.getByRole('heading',{name:'Good ideas, kept close.',exact:true}).waitFor();expect(await page.locator('.news-card').count()===1,'Saved story not persisted');await page.locator('[data-action="save-story"]').click();expect(await page.locator('.news-card').count()===0,'Unsave failed');});
await check('grade timeline retains six pending results',async()=>{await page.goto('http://127.0.0.1:4173/#goals');await page.getByText('Your academic timeline',{exact:true}).waitFor();expect(await page.getByText('Awaiting results',{exact:true}).count()===6,'Pending grades count wrong');expect(await page.locator('.transcript tbody tr').count()===17,'Transcript count wrong');});
await check('lesson, notes and active recall survive reload',async()=>{
 await page.goto('http://127.0.0.1:4173/#lesson/needs-wants-demands');await page.getByRole('button',{name:'Mark as studied',exact:true}).click();
 await page.locator('#lesson-note').fill('A want needs buying power to become demand.');await page.getByRole('button',{name:'Save note',exact:true}).click();await page.reload();expect(await page.locator('#lesson-note').inputValue()==='A want needs buying power to become demand.','Note missing');
 await page.getByRole('button',{name:'Try active recall',exact:true}).click();await page.getByRole('button',{name:'Skip warm-up',exact:true}).click();await page.locator('#recall-answer').fill('Buying power.');await page.getByRole('button',{name:'Compare with the answer',exact:true}).click();await page.getByRole('button',{name:'Recalled correctly',exact:true}).click();
 await page.reload();const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')));expect(s.attempts.length===1,'Review not saved or duplicated');expect(!!s.reviews['needs-1'].nextReview,'Review date absent');
});
await check('upload, extract PDF pages, create recall card and save bookmark',async()=>{
 await page.goto('http://127.0.0.1:4173/#library');await page.getByRole('button',{name:'Add document',exact:true}).click();await page.locator('#upload-course').selectOption('introduction-to-marketing-career');await page.locator('#document-file').setInputFiles(resolve('dist/assets/marketing-source-pages.pdf'));await page.getByRole('button',{name:'Attach & open',exact:true}).click();await page.locator('#pdf-canvas').waitFor({timeout:20000});await page.getByRole('button',{name:'Extract selected pages',exact:true}).click();await page.locator('#extract-status').filter({hasText:'Saved'}).waitFor({timeout:20000});expect(await page.locator('.preview-highlight').count()>0,'No source text extracted');await page.getByRole('button',{name:'Create review card',exact:true}).click();await page.locator('#card-question').fill('What supports a want to make it demand?');await page.locator('#card-answer').fill('Buying power.');await page.getByRole('button',{name:'Save card',exact:true}).click();await page.getByRole('button',{name:'Save place',exact:true}).click();const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')));expect(s.cards.length===1&&s.documents.length===1,'Document or card not saved');expect(s.cards[0].documentId===s.documents[0].id,'Card is not source linked');
});
await check('unsupported file recovers with visible error',async()=>{await page.goto('http://127.0.0.1:4173/#library');await page.getByRole('button',{name:'Add document',exact:true}).click();await page.locator('#document-file').setInputFiles({name:'invalid.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a PDF')});await page.getByRole('button',{name:'Attach & open',exact:true}).click();await page.locator('#upload-status.error').waitFor();expect(!(await page.getByRole('button',{name:'Attach & open',exact:true}).isDisabled()),'Retry not available');await page.getByRole('button',{name:'Close dialog',exact:true}).click();});
await check('one news stream, source images, bold headlines and hidden stories',async()=>{
 await page.goto('http://127.0.0.1:4173/#news');await page.locator('.news-card').first().waitFor();
 expect(await page.locator('[data-action="news-filter"]').count()===0,'Category tabs remain');
 expect(await page.locator('.news-card').count()===5,'Not all stories are visible');
 expect(await page.locator('.news-card .story-image').count()===4,'Source previews missing');
 expect(await page.locator('.news-card h3').evaluateAll(xs=>xs.every(x=>Number(getComputedStyle(x).fontWeight)>=700)),'Headlines are not bold');
 await page.locator('.story-link').first().click();await page.getByRole('button',{name:'Hide this story',exact:true}).click();
 expect(await page.locator('.news-card').count()===4,'Hide failed');
 await page.getByRole('button',{name:'Restore hidden stories',exact:true}).click();
 expect(await page.locator('.news-card').count()===5,'Restore failed');
});
// Clean the QA browser only, never the user's browser or source files.
await page.evaluate(()=>{localStorage.removeItem('zin-studio-v1');localStorage.setItem('zin-theme','light');});
await page.goto('http://127.0.0.1:4173/#home');await page.reload();
for(const width of [390,430,768,1024,1440]){
 await page.setViewportSize({width,height:900});
 await check('responsive layout at '+width+'px',async()=>{
  for(const route of ['home','library','goals','study','lesson/needs-wants-demands','settings','news']){
   await page.goto('http://127.0.0.1:4173/#'+route);await page.locator('main').waitFor();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow: '+route);
  }
 });
 if(width===390){await page.goto('http://127.0.0.1:4173/#home');await page.screenshot({path:resolve(out,'mobile-light.png'),fullPage:true});await page.getByRole('button',{name:'Switch to dark mode',exact:true}).click();await page.screenshot({path:resolve(out,'mobile-dark.png'),fullPage:true});await page.getByRole('button',{name:'Switch to light mode',exact:true}).click();}
}
await check('browser JavaScript errors',async()=>expect(errors.length===0,JSON.stringify(errors)));
await writeFile(resolve(out,'qa-results.json'),JSON.stringify({results,errors},null,2));
console.log(JSON.stringify({results,errors},null,2));await browser.close();if(results.some(r=>!r.pass))process.exitCode=1;
