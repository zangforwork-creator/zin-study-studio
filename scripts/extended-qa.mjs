import {chromium} from 'playwright-core';
import {zipSync,strToU8} from 'fflate';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const page=await context.newPage();
const results=[];const check=async(name,fn)=>{try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}};
const expect=(v,m)=>{if(!v)throw Error(m);};
await page.goto('http://127.0.0.1:4173/#library');await page.locator('.bookshelf').waitFor();
const upload=async(name,buffer)=>{await page.getByRole('button',{name:'Add document',exact:true}).click();await page.locator('#document-file').setInputFiles({name,mimeType:'application/octet-stream',buffer});await page.getByRole('button',{name:'Attach & open',exact:true}).click();await page.locator('.reader-controls').waitFor({timeout:20000});};
await check('DOCX text processing and escaped source content',async()=>{
 const xml='<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>A marketing plan defines the audience, objectives, actions and measures used to guide a campaign. &lt;script&gt;alert(1)&lt;/script&gt;</w:t></w:r></w:p></w:body></w:document>';
 await upload('qa-source.docx',Buffer.from(zipSync({'word/document.xml':strToU8(xml)})));
 expect((await page.locator('#office-text').innerText()).includes('A marketing plan'),'DOCX not extracted');
 await page.getByRole('button',{name:'Extract selected pages',exact:true}).click();expect(await page.locator('.preview-highlight').count()>0,'DOCX highlights empty');expect(await page.locator('#highlights script').count()===0,'Source interpreted as HTML');
});
await check('PPTX slides preserve numeric slide order',async()=>{
 await page.goto('http://127.0.0.1:4173/#library');
 const slide=t=>strToU8(`<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:p><a:r><a:t>${t}</a:t></a:r></a:p></p:sld>`);
 await upload('qa-slides.pptx',Buffer.from(zipSync({'ppt/slides/slide2.xml':slide('Second slide explains why a campaign objective needs a clear measure and audience.'),'ppt/slides/slide1.xml':slide('First slide introduces customer needs and how they differ from wants and demands.')})));
 expect((await page.locator('#office-text').innerText()).startsWith('First slide'),'Wrong first slide');await page.getByRole('button',{name:'Next →',exact:true}).click();expect((await page.locator('#office-text').innerText()).startsWith('Second slide'),'Wrong second slide');
});
await check('duplicate document upload does not create a new version',async()=>{
 const file=await readFile('dist/assets/marketing-source-pages.pdf');await page.goto('http://127.0.0.1:4173/#library');await upload('source.pdf',file);const count=await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')).documents.length);
 await page.goto('http://127.0.0.1:4173/#library');await upload('source.pdf',file);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')).documents.length)===count,'Duplicate version added');
});
await check('blank scanned page reports insufficient text and creates no highlights',async()=>{
 await page.goto('http://127.0.0.1:4173/#library');await upload('blank.pdf',await readFile('.preview/blank.pdf'));await page.getByRole('button',{name:'Extract selected pages',exact:true}).click();await page.locator('#extract-status').filter({hasText:'Saved'}).waitFor();expect(await page.locator('.preview-highlight').count()===0,'Invented source text');expect((await page.locator('#highlights').innerText()).includes('No knowledge has been generated'),'Missing unreadable notice');expect(await page.getByRole('button',{name:'Create review card',exact:true}).isDisabled(),'Unreadable section permitted a card');
});
await check('backup export and repeated import preserve and deduplicate data',async()=>{
 await page.goto('http://127.0.0.1:4173/#settings');const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export progress backup',exact:true}).click()]);const path=resolve('.preview/test-backup.json');await download.saveAs(path);const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')).documents.length);
 for(let n=0;n<2;n++){await page.getByRole('button',{name:'Import backup',exact:true}).click();await page.locator('#backup-file').setInputFiles(path);await page.getByRole('button',{name:'Validate & merge backup',exact:true}).click();await page.locator('dialog').waitFor({state:'hidden'});}
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-studio-v1')).documents.length)===before,'Import duplicates documents');
});
await check('invalid backup leaves existing progress unchanged',async()=>{
 const before=await page.evaluate(()=>localStorage.getItem('zin-studio-v1'));await page.getByRole('button',{name:'Import backup',exact:true}).click();await page.locator('#backup-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"kind":"not-a-backup"}')});await page.getByRole('button',{name:'Validate & merge backup',exact:true}).click();await page.locator('#backup-status.error').waitFor();expect(await page.evaluate(()=>localStorage.getItem('zin-studio-v1'))===before,'Bad backup changed data');await page.getByRole('button',{name:'Close dialog',exact:true}).click();
});
await check('keyboard dialog escape and visible focus',async()=>{
 await page.getByRole('button',{name:'Import backup',exact:true}).click();await page.keyboard.press('Escape');expect(!(await page.locator('dialog').evaluate(d=>d.open)),'Escape did not close dialog');await page.keyboard.press('/');expect(await page.locator('#global-search input').evaluate(e=>e===document.activeElement),'Search keyboard shortcut failed');
});
await check('news source failures do not affect learning',async()=>{
 await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:4173/#lesson/value-proposition');expect(await page.getByRole('button',{name:'Try active recall',exact:true}).isVisible(),'Learning depends on external sources');
});
console.log(JSON.stringify(results,null,2));await writeFile('.preview/extended-qa.json',JSON.stringify(results,null,2));await browser.close();if(results.some(r=>!r.pass))process.exitCode=1;
