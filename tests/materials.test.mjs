import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MATERIALS} from '../worker/material-catalog.js';
import {materialRequest,materialRange} from '../worker/materials.js';
import {initialState,validateState,mergeState,courseSiteUrl} from '../dist/core.js';
const origin='https://studio.example';
test('course URLs are isolated, survive reload and old backups, and merge without losing local edits',()=>{
 const state=initialState();state.courseLinks.a=courseSiteUrl(' https://marketing.example/chapters ');state.courseLinks.b='https://economics.example/';
 const restored=validateState(JSON.parse(JSON.stringify(state)));assert.equal(restored.courseLinks.a,'https://marketing.example/chapters');assert.equal(restored.courseLinks.b,'https://economics.example/');
 const old=initialState();delete old.courseLinks;assert.deepEqual(validateState(old).courseLinks,{});
 const incoming=initialState();incoming.courseLinks.a='https://old.example/';incoming.courseLinks.c='https://new.example/';
 assert.deepEqual(mergeState(state,incoming).courseLinks,{a:state.courseLinks.a,b:state.courseLinks.b,c:incoming.courseLinks.c});
 state.courseLinks.a='';assert.equal(validateState(state).courseLinks.a,'');assert.deepEqual(state.attempts,[]);
});
test('unsafe URLs and prototype entries never become executable course links',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,hello','http://example.com','https://user:secret@example.com','not a url'])assert.throws(()=>courseSiteUrl(url));
 const state=initialState();state.courseLinks=JSON.parse('{"__proto__":"https://example.com"}');assert.throws(()=>validateState(state));
});
test('every confirmed course has its exact original attached, including two MIS books and the legacy slide',async()=>{
 const ref=JSON.parse(await readFile(new URL('../dist/data/reference.json',import.meta.url),'utf8'));
 assert.equal(MATERIALS.length,11);assert.equal(new Set(MATERIALS.map(m=>m.courseId)).size,10);
 for(const course of ref.courses)for(const book of course.books){const m=MATERIALS.find(m=>m.id===book.id);assert.equal(m.filename,book.filename);assert.equal(m.courseId,course.id);assert.equal(m.chunks.reduce((n,c)=>n+c.size,0),m.bytes);assert(m.chunks.every(c=>/^[a-f0-9]{64}$/.test(c.sha256)));}
 assert.equal(MATERIALS.filter(m=>m.type==='ppt').length,1);
});
test('PDF byte ranges preserve total length, support suffixes, and reject malformed or unsatisfiable ranges',()=>{
 assert.equal(materialRange(null,100),null);assert.deepEqual(materialRange('bytes=10-19',100),{offset:10,length:10});
 assert.deepEqual(materialRange('bytes=-8',100),{offset:92,length:8});assert.deepEqual(materialRange('bytes=95-',100),{offset:95,length:5});
 for(const value of ['bytes=100-','bytes=-0','bytes=20-10','bytes=0-3,8-12','bytes=-','words=0-3'])assert.throws(()=>materialRange(value,100));
});
test('private original reads return correct media headers and ranges; unknown files and cross-origin writes fail',async()=>{
 const m=MATERIALS[0],env={BUCKET:{head:async()=>({size:m.bytes}),get:async()=>({size:m.bytes,body:new Uint8Array(32)})}};
 const head=await materialRequest(new Request(origin+'/api/materials/'+m.id,{method:'HEAD'}),env);assert.equal(head.status,200);assert.equal(head.headers.get('Content-Length'),String(m.bytes));assert.equal(head.headers.get('Content-Type'),'application/pdf');assert.match(head.headers.get('Cache-Control'),/private/);
 const range=await materialRequest(new Request(origin+'/api/materials/'+m.id,{headers:{Range:'bytes=0-31'}}),env);assert.equal(range.status,206);assert.equal(range.headers.get('Content-Range'),'bytes 0-31/'+m.bytes);assert.equal((await range.arrayBuffer()).byteLength,32);
 assert.equal((await materialRequest(new Request(origin+'/api/materials/'+m.id,{headers:{Range:'bytes='+m.bytes+'-'}}),env)).status,416);
 assert.equal((await materialRequest(new Request(origin+'/api/materials/unknown'),env)).status,404);
 assert.equal((await materialRequest(new Request(origin+'/api/materials/'+m.id+'/upload',{method:'POST',headers:{Origin:'https://unrelated.example'}}),env)).status,403);
});
test('upload accepts only the exact checked part, rejects corrupt bytes, and never completes incomplete parts',async()=>{
 const m=MATERIALS.find(m=>m.type==='ppt'),bytes=await readFile(new URL('../../Kho-tai-lieu-mon-hoc/'+m.filename,import.meta.url));let writes=0,completions=0;
 const env={BUCKET:{resumeMultipartUpload:()=>({uploadPart:async(partNumber)=>{writes++;return {partNumber,etag:'checked-part'};},complete:async()=>{completions++;return {size:m.bytes};}})}};
 const path=origin+'/api/materials/'+m.id+'/part?uploadId=fixture&part=1';
 const corrupt=Buffer.from(bytes.subarray(0,m.chunks[0].size));corrupt[0]^=255;
 assert.equal((await materialRequest(new Request(path,{method:'PUT',body:corrupt}),env)).status,422);assert.equal(writes,0);
 const valid=await materialRequest(new Request(path,{method:'PUT',body:bytes.subarray(0,m.chunks[0].size)}),env);assert.equal(valid.status,200);assert.equal(writes,1);
 const incomplete=await materialRequest(new Request(origin+'/api/materials/'+m.id+'/complete?uploadId=fixture',{method:'POST',body:JSON.stringify({parts:[{partNumber:1,etag:'checked-part'}]})}),env);assert.equal(incomplete.status,400);assert.equal(completions,0);
});
