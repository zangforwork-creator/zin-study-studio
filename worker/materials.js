import {MATERIALS} from './material-catalog.js';
const materialJson=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const materialKey=m=>'course-materials/'+m.sha256+'/'+m.filename;
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
export function materialRange(header,size){
 if(!header)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);if(!match||(!match[1]&&!match[2]))throw Error('Invalid range');
 let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 let end=match[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)throw Error('Invalid range');
 return {offset:start,length:end-start+1};
}
export async function materialRequest(request,env){
 const url=new URL(request.url);if(!url.pathname.startsWith('/api/materials'))return null;
 if(!env.BUCKET)return materialJson({error:'Kho tài liệu chưa kết nối.'},503);
 if(url.pathname==='/api/materials'&&request.method==='GET'){
  const items=await Promise.all(MATERIALS.map(async m=>{try{const stored=await env.BUCKET.head(materialKey(m));return {id:m.id,available:stored?.size===m.bytes};}catch{return {id:m.id,available:false};}}));
  return materialJson({items});
 }
 const match=/^\/api\/materials\/([a-z0-9-]{1,60})(?:\/(upload|part|complete|abort))?$/.exec(url.pathname);
 const material=match&&MATERIALS.find(m=>m.id===match[1]);if(!material)return materialJson({error:'Tài liệu không có trong danh mục.'},404);
 const key=materialKey(material),operation=match[2];
 if(!operation&&['GET','HEAD'].includes(request.method)){
  let range;try{range=materialRange(request.headers.get('Range'),material.bytes);}catch{return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+material.bytes,'Cache-Control':'private, no-store'}});}
  const object=request.method==='HEAD'?await env.BUCKET.head(key):await env.BUCKET.get(key,range?{range}:undefined);
  if(!object||object.size!==material.bytes)return materialJson({error:'Tài liệu đang được kết nối. Hãy thử lại sau.'},404);
  const headers={'Content-Type':material.type==='pdf'?'application/pdf':'application/vnd.ms-powerpoint','Content-Length':String(range?range.length:material.bytes),'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':(url.searchParams.has('download')||material.type==='ppt'?'attachment':'inline')+"; filename*=UTF-8''"+encodeURIComponent(material.filename),'ETag':'"'+material.sha256+'"'};
  if(range)headers['Content-Range']=`bytes ${range.offset}-${range.offset+range.length-1}/${material.bytes}`;
  return new Response(request.method==='HEAD'?null:object.body,{status:range?206:200,headers});
 }
 // The existing Site is owner-only. Never expose this writer on a public Site.
 if(request.headers.has('Origin')&&request.headers.get('Origin')!==url.origin)return materialJson({error:'Origin not allowed.'},403);
 const uploadId=url.searchParams.get('uploadId');
 if(operation==='upload'&&request.method==='POST'){
  const upload=await env.BUCKET.createMultipartUpload(key,{httpMetadata:{contentType:material.type==='pdf'?'application/pdf':'application/vnd.ms-powerpoint'},customMetadata:{sha256:material.sha256}});
  return materialJson({uploadId:upload.uploadId});
 }
 if(!uploadId||uploadId.length>500)return materialJson({error:'Invalid upload ID.'},400);
 const upload=env.BUCKET.resumeMultipartUpload(key,uploadId);
 if(operation==='part'&&request.method==='PUT'){
  const number=Number(url.searchParams.get('part')),expected=material.chunks[number-1];
  if(!Number.isInteger(number)||!expected)return materialJson({error:'Invalid part.'},400);
  if(Number(request.headers.get('Content-Length'))>expected.size)return materialJson({error:'Part too large.'},413);
  const reader=request.body?.getReader();if(!reader)return materialJson({error:'Missing bytes.'},400);
  const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>expected.size){await reader.cancel();return materialJson({error:'Part too large.'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  if(size!==expected.size||hex(await crypto.subtle.digest('SHA-256',bytes))!==expected.sha256)return materialJson({error:'Source checksum differs; existing original unchanged.'},422);
  return materialJson(await upload.uploadPart(number,bytes));
 }
 if(operation==='complete'&&request.method==='POST'){
  if(Number(request.headers.get('Content-Length'))>16000)return materialJson({error:'Request too large.'},413);
  const text=await request.text();if(text.length>16000)return materialJson({error:'Request too large.'},413);
  let parts;try{parts=JSON.parse(text).parts;}catch{return materialJson({error:'Invalid JSON.'},400);}
  if(!Array.isArray(parts)||parts.length!==material.chunks.length||parts.some((p,i)=>p.partNumber!==i+1||typeof p.etag!=='string'||p.etag.length>200))return materialJson({error:'Invalid completed parts.'},400);
  const completed=await upload.complete(parts);return materialJson({id:material.id,available:completed.size===material.bytes,bytes:completed.size});
 }
 if(operation==='abort'&&request.method==='POST'){await upload.abort();return materialJson({aborted:true});}
 return materialJson({error:'Method not allowed.'},405);
}
