// Render the first page of the three supplied textbooks locally. No upload.
import {chromium} from 'playwright-core';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const inventory=JSON.parse(await readFile(resolve(root,'../book-inventory.json'),'utf8'));
const wanted=['Consumer Behaviour','Digital Marketing','Introduction to Marketing Career'];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage();await page.goto('http://127.0.0.1:4173');
await page.evaluate(()=>{const input=document.createElement('input');input.type='file';input.id='cover-input';document.body.append(input);});
await mkdir(resolve(root,'dist/assets/covers'),{recursive:true});
const manifest=[];
for(const course of wanted){
 const book=inventory.books.find(b=>b.course===course);if(!book)throw Error('Book not found: '+course);
 await page.locator('#cover-input').setInputFiles(resolve(root,'..',book.file));
 const result=await page.evaluate(async()=>{
  const {loadPdf}=await import('/documents.js');const file=document.querySelector('#cover-input').files[0];
  const pdf=await loadPdf(new Uint8Array(await file.arrayBuffer()));const p=await pdf.getPage(1);
  const scale=650/p.getViewport({scale:1}).width;const viewport=p.getViewport({scale});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;
  await p.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
  const url=canvas.toDataURL('image/webp',.88);await pdf.destroy();return {url,width:canvas.width,height:canvas.height};
 });
 const name=course.toLowerCase().replaceAll(' ','-')+'.webp';
 await writeFile(resolve(root,'dist/assets/covers',name),Buffer.from(result.url.split(',')[1],'base64'));
 manifest.push({course,asset:'dist/assets/covers/'+name,source:book.file,source_sha256:book.sha256,source_pdf_page:1,width:result.width,height:result.height});
}
await writeFile(resolve(root,'COURSE-COVER-SOURCES.json'),JSON.stringify({rendered_locally:true,items:manifest},null,2));
console.log(JSON.stringify(manifest.map(({course,width,height})=>({course,width,height}))));await browser.close();
