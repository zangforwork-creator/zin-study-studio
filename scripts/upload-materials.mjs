// Upload checked course originals only to this existing owner-private Site.
// Service access is accepted on hidden stdin; never written to disk or logged.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {MATERIALS} from '../worker/material-catalog.js';
let buffer='';if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');
console.log('Ready for private materials JSON on stdin (input is hidden).');
const input=await new Promise((resolve,reject)=>process.stdin.on('data',chunk=>{if(chunk.includes('\u0003'))process.exit(130);buffer+=chunk;if(/[\r\n]/.test(buffer)){try{resolve(JSON.parse(buffer.split(/[\r\n]/)[0]));}catch(error){reject(error);}}}));
if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();
const origin='https://zin-study-studio.taupeperiwinkle4.chatgpt.site';
if(input.url!==origin||!input.token)throw Error('Use service access for the existing private Site.');
async function request(path,options={}){
 const response=await fetch(new URL(path,origin),{...options,redirect:'error',headers:{...options.headers,'OAI-Sites-Authorization':'Bearer '+input.token},signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('Materials service HTTP '+response.status+' at '+path.split('?')[0]);return response;
}
const before=await (await request('/api/materials')).json(),verified=[];
const pending=MATERIALS.filter(m=>!before.items.some(x=>x.id===m.id&&x.available));
async function upload(m){
 const bytes=await readFile(resolve(import.meta.dirname,'../../Kho-tai-lieu-mon-hoc',m.filename));
 if(bytes.length!==m.bytes||createHash('sha256').update(bytes).digest('hex')!==m.sha256)throw Error('Local source changed: '+m.id);
 const base='/api/materials/'+m.id,opened=await (await request(base+'/upload',{method:'POST'})).json(),uploadId=encodeURIComponent(opened.uploadId),parts=[];
 try{
  let offset=0;for(let i=0;i<m.chunks.length;i++){
   const chunk=bytes.subarray(offset,offset+m.chunks[i].size);offset+=chunk.length;
   let response;for(let attempt=0;attempt<3;attempt++){try{response=await request(base+'/part?uploadId='+uploadId+'&part='+(i+1),{method:'PUT',body:chunk});break;}catch(error){if(attempt===2)throw error;}}
   parts.push(await response.json());
  }
  const complete=await (await request(base+'/complete?uploadId='+uploadId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({parts})})).json();
  if(!complete.available)throw Error('Saved length mismatch: '+m.id);
 }catch(error){try{await request(base+'/abort?uploadId='+uploadId,{method:'POST'});}catch{}throw error;}
 console.log(JSON.stringify({uploaded:m.id,bytes:m.bytes}));
}
let index=0;await Promise.all([0,1].map(async()=>{while(index<pending.length)await upload(pending[index++]);}));
for(const m of MATERIALS){
 const head=await request('/api/materials/'+m.id,{method:'HEAD'});
 if(Number(head.headers.get('Content-Length'))!==m.bytes||head.headers.get('ETag')!=='"'+m.sha256+'"')throw Error('Readback metadata mismatch: '+m.id);
 const response=await request('/api/materials/'+m.id,{headers:{Range:'bytes=0-31'}}),prefix=Buffer.from(await response.arrayBuffer());
 const original=await readFile(resolve(import.meta.dirname,'../../Kho-tai-lieu-mon-hoc',m.filename));
 if(response.status!==206||!prefix.equals(original.subarray(0,32)))throw Error('Range readback mismatch: '+m.id);
 verified.push({id:m.id,bytes:m.bytes,sha256:m.sha256,rangeVerified:true});
}
const after=await (await request('/api/materials')).json();if(after.items.some(x=>!x.available))throw Error('Some originals are unavailable.');
const receipt={verifiedAt:new Date().toISOString(),courses:10,materials:verified.length,bytes:verified.reduce((n,m)=>n+m.bytes,0),items:verified};
await writeFile(resolve(import.meta.dirname,'../../zin-study-studio-materials-publication.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({verified:true,courses:10,materials:verified.length,bytes:receipt.bytes}));
