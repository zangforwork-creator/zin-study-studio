import {FEED_TTL,refreshEdition,allowedUrl} from './feeds.js';
const EDITION_KEY='reading/edition-v1.json';
let inFlight=null;
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
async function readEdition(env){
 try{const object=await env.BUCKET?.get(EDITION_KEY);if(object)return await object.json();}catch{}
 try{const r=await env.ASSETS.fetch(new Request('https://assets.local/data/reading-seed.json'));if(r.ok)return await r.json();}catch{}
 return {version:1,items:[],caseStudies:[],sources:[],updatedAt:null,checkedAt:null};
}
async function update(env,previous,cases=null){
 if(inFlight){const current=await inFlight;if(!cases)return current;previous=current;}
 inFlight=(async()=>{const edition=await refreshEdition(previous,fetch,new Date().toISOString(),cases);if(!env.BUCKET)throw Error('Reading storage is not connected.');await env.BUCKET.put(EDITION_KEY,JSON.stringify(edition),{httpMetadata:{contentType:'application/json'}});return edition;})();
 try{return await inFlight;}finally{inFlight=null;}
}
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  if(url.pathname==='/api/reading/image'&&request.method==='GET'){
   const edition=await readEdition(env),story=edition.items.find(n=>n.id===url.searchParams.get('id'));
   const image=allowedUrl(story?.image?.src,['vnecdn.net','googleusercontent.com','blogger.com','gstatic.com','googleblog.com','storage.googleapis.com']);
   if(!image)return new Response('Image not available',{status:404});
   try{
    const upstream=await fetch(image,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'image/avif,image/webp,image/jpeg,image/png',Referer:story.url}});
    const type=(upstream.headers.get('content-type')||'').split(';')[0];
    if(!upstream.ok||!['image/jpeg','image/png','image/webp','image/avif','image/gif'].includes(type))return new Response('Source image unavailable',{status:502});
    if(Number(upstream.headers.get('content-length'))>4000000)return new Response('Image too large',{status:413});
    const reader=upstream.body.getReader(),chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4000000){await reader.cancel();return new Response('Image too large',{status:413});}chunks.push(value);}
    return new Response(new Blob(chunks,{type}),{headers:{'Content-Type':type,'Cache-Control':'private, max-age=900','X-Content-Type-Options':'nosniff'}});
   }catch{return new Response('Source image temporarily unavailable',{status:502});}
  }
  if(url.pathname==='/api/reading'&&request.method==='GET'){
   const previous=await readEdition(env);
   if(Date.now()-Date.parse(previous.checkedAt||0)<FEED_TTL)return json(previous);
   try{return json(await update(env,previous));}catch{return json({...previous,degraded:true,serviceError:'Không thể cập nhật lúc này. Đang giữ bản gần nhất.'},previous.items.length?200:503);}
  }
  // Sites owner-private access protects this shared, non-personal content writer.
  // Service calls use the platform's service bearer; no browser document enters here.
  if(url.pathname==='/api/reading/refresh'&&request.method==='POST'){
   if(request.headers.has('Origin')&&request.headers.get('Origin')!==url.origin)return json({error:'Origin not allowed.'},403);
   if(Number(request.headers.get('content-length'))>65536)return json({error:'Request too large.'},413);
   try{
    const text=await request.text();if(text.length>65536)return json({error:'Request too large.'},413);
    const input=text?JSON.parse(text):{};
    if(input.caseStudies!==undefined&&!Array.isArray(input.caseStudies))return json({error:'Invalid case studies.'},400);
    const previous=await readEdition(env);
    // Merge by source URL; repeat task executions never create duplicate cases.
    const cases=input.caseStudies?.length?input.caseStudies:null;
    const next=await update(env,previous,cases);
    return json({updatedAt:next.updatedAt,caseUpdatedAt:next.caseUpdatedAt,checkedAt:next.checkedAt,items:next.items.length,caseStudies:next.caseStudies.length,degraded:next.degraded,sources:next.sources});
   }catch(error){return json({error:'Cập nhật thất bại. Dữ liệu trước đó được giữ nguyên.',detail:String(error.message).slice(0,150)},400);}
  }
  return json({error:'Not found.'},404);
 }
};
