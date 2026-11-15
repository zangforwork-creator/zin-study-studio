let dbPromise;
function db(){return dbPromise??=new Promise((resolve,reject)=>{const r=indexedDB.open('zin-documents-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Local document storage is unavailable. Try a normal browser window.'));});}
export async function putFile(id,file){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('files','readwrite');t.objectStore('files').put(file,id);t.oncomplete=resolve;t.onerror=()=>reject(Error('Not enough browser storage. Your existing documents are safe; free space and retry.'));t.onabort=t.onerror;});}
export async function getFile(id){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('files').objectStore('files').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Could not read this local file. Attach the original again.'));});}
export async function inspectFile(file){
 const type=file.name.split('.').pop().toLowerCase();
 if(!['pdf','docx','pptx'].includes(type))throw Error('Choose a PDF, DOCX or PPTX. Convert legacy .ppt files to .pptx in PowerPoint first.');
 const max=type==='pdf'?100:30;
 if(!file.size||file.size>max*1024*1024)throw Error(`This ${type.toUpperCase()} must be between 1 byte and ${max} MB.`);
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(type==='pdf'&&new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('The file does not have a valid PDF header. Export a fresh PDF and try again.');
 if(type!=='pdf'&&(bytes[0]!==80||bytes[1]!==75))throw Error('This is not a valid Office document. Export it again as DOCX or PPTX.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 return {id:hash,type,bytes};
}
let pdfLibrary;
export async function loadPdf(bytes){
 pdfLibrary??=import('./vendor/pdf.mjs');const lib=await pdfLibrary;
 lib.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;
 return lib.getDocument({data:bytes,isEvalSupported:false,cMapUrl:new URL('./vendor/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/wasm/',import.meta.url).href}).promise;
}
export async function officeSections(bytes,type){
 const result=await new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./office-worker.js',import.meta.url),{type:'module'});
  const timeout=setTimeout(()=>{worker.terminate();reject(Error('The document took too long to open. Try a smaller export.'));},20000);
  worker.onmessage=e=>{clearTimeout(timeout);worker.terminate();e.data.error?reject(Error(e.data.error)):resolve(e.data.files);};
  worker.onerror=()=>{clearTimeout(timeout);worker.terminate();reject(Error('Office processing failed. Try exporting a PDF.'));};
  worker.postMessage({bytes,type},[bytes.buffer]);
 });
 return result.map((item,i)=>{
  const xml=new DOMParser().parseFromString(item.text,'application/xml');
  if(xml.querySelector('parsererror'))throw Error('The Office XML is damaged. Export a new copy.');
  const paragraphs=Array.from(xml.getElementsByTagNameNS('*','p'));
  const text=paragraphs.map(p=>Array.from(p.getElementsByTagNameNS('*','t')).map(t=>t.textContent).join('')).join('\n');
  return {page:i+1,text,warning:text.trim().length<60?'Little readable text. Images and diagrams were not interpreted.':null};
 });
}
export async function pdfSections(pdf,start,end,onProgress=()=>{}){
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>pdf.numPages||end-start>=30)throw Error('Select a valid range of up to 30 PDF pages per batch.');
 const sections=[];
 for(let page=start;page<=end;page++){
  try{const p=await pdf.getPage(page);const content=await p.getTextContent();const text=content.items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('');sections.push({page,text,warning:text.trim().length<60?'Little readable text. This page may need OCR; images and charts were not interpreted.':null});}
  catch{sections.push({page,text:'',warning:'This page could not be read. Open the original and retry this page.'});}
  onProgress(page-start+1,end-start+1);
 }
 return sections;
}
