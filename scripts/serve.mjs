import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import {MATERIALS} from '../worker/material-catalog.js';
import worker from '../worker/index.js';
const root=resolve(import.meta.dirname,'../dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.pdf':'application/pdf','.wasm':'application/wasm'};
const cacheFile=resolve(import.meta.dirname,'../.preview/reading/edition.json');
function materialPath(key){const m=MATERIALS.find(m=>key==='course-materials/'+m.sha256+'/'+m.filename);return m?resolve(import.meta.dirname,'../../Kho-tai-lieu-mon-hoc',m.localPath||m.filename):null;}
const env={
 BUCKET:{async head(key){const path=materialPath(key);if(!path)return null;try{return {size:(await stat(path)).size};}catch{return null;}},async get(key,options){const path=materialPath(key);if(path){try{const size=(await stat(path)).size,range=options?.range;return {size,body:Readable.toWeb(createReadStream(path,range?{start:range.offset,end:range.offset+range.length-1}:{}))};}catch{return null;}}if(key!=='reading/edition-v1.json')return null;try{const text=await readFile(cacheFile,'utf8');return {json:async()=>JSON.parse(text)};}catch{return null;}},async put(key,value){if(key!=='reading/edition-v1.json')throw Error('Unknown key');await mkdir(resolve(cacheFile,'..'),{recursive:true});await writeFile(cacheFile,value);}},
 ASSETS:{async fetch(request){try{const pathname=decodeURIComponent(new URL(request.url).pathname),path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!path.startsWith(root+sep))return new Response('Forbidden',{status:403});const body=await readFile(path);return new Response(body,{headers:{'Content-Type':types[extname(path)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}}}
};
createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname.startsWith('/api/')){
  const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>65536){res.writeHead(413);return res.end('Request too large');}chunks.push(chunk);}
  const request=new Request('http://127.0.0.1:4173'+req.url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
  const response=await worker.fetch(request,env,{waitUntil:promise=>promise.catch(()=>{})});res.writeHead(response.status,Object.fromEntries(response.headers));if(!response.body)return res.end();return Readable.fromWeb(response.body).on('error',()=>res.destroy()).pipe(res);
 }
 const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!path.startsWith(root+sep)) {res.writeHead(403);return res.end('Forbidden');}
 if(!(await stat(path)).isFile())throw Error();
 res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
 res.end(await readFile(path));
}catch{res.writeHead(404);res.end('Not found');}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
