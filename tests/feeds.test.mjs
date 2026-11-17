import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCES,parseFeed,refreshEdition,allowedUrl,validateCases,selectHeadlines,rasterMime} from '../worker/feeds.js';
import worker from '../worker/index.js';
const now='2026-11-16T10:00:00.000Z';
const rss=(title='A sourced story',link='https://e.vnexpress.net/business-123.html')=>`<rss><channel><item><title>${title}</title><description><![CDATA[<a><img src="https://i1-kinhdoanh.vnecdn.net/photo.jpg"></a> Source content and conditions.]]></description><pubDate>Mon, 16 Nov 2026 15:00:00 +0700</pubDate><link>${link}</link></item></channel></rss>`;
test('RSS preserves source, date and matching image while removing HTML',()=>{
 const [n]=parseFeed(rss(),SOURCES[0],Date.parse(now));assert.equal(n.publisher,'VnExpress International');assert.equal(n.date,'2026-11-16T08:00:00.000Z');assert.match(n.image.src,/photo.jpg$/);assert.equal(n.subtitle,'Source content and conditions.');assert.equal(n.id,parseFeed(rss(),SOURCES[0])[0].id);
});
test('real raster signatures are accepted when a trusted CDN declares octet-stream; HTML is rejected',()=>{
 assert.equal(rasterMime(new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80])),'image/webp');
 assert.equal(rasterMime(new Uint8Array([137,80,78,71,13,10,26,10])),'image/png');
 assert.equal(rasterMime(new TextEncoder().encode('<html>not an image</html>')),'');
});
test('case cover metadata keeps its source and rejects unapproved image origins',()=>{
 const c={title:'Campaign',summary:'Source overview',url:'https://www.brandsvietnam.com/campaign/example',image:{src:'https://cdn.brvn.vn/campaign/cover.jpg'}};
 assert.equal(validateCases([c],now)[0].image.sourceUrl,c.url);
 assert.equal(validateCases([{...c,image:{src:'https://evil.test/cover.jpg'}}],now)[0].image,null);
});
test('Atom alternate links with legacy HTTP are upgraded only for an approved publisher',()=>{
 const atom=`<feed><entry><title type="text">Update</title><published>2026-11-16T01:00:00Z</published><content type="html">&lt;p&gt;A verified update.&lt;/p&gt;</content><link rel="alternate" href="http://blog.google/products/ads-commerce/update/"/></entry></feed>`;
 assert.equal(parseFeed(atom,SOURCES[2],Date.parse(now))[0].url,'https://blog.google/products/ads-commerce/update/');
});
test('unreadable feeds, external entities, future dates and unapproved links never yield invented news',()=>{
 assert.throws(()=>parseFeed('<html>Blocked</html>',SOURCES[0]));assert.throws(()=>parseFeed('<!DOCTYPE x>'+rss(),SOURCES[0]));assert.throws(()=>parseFeed(rss('Fake','https://vnexpress.net.evil.test/x'),SOURCES[0]));assert.throws(()=>parseFeed(rss().replace('2026','2036'),SOURCES[0],Date.parse(now)));
 assert.equal(allowedUrl('javascript:alert(1)',['vnexpress.net']),'');assert.equal(allowedUrl('https://user:secret@vnexpress.net/x',['vnexpress.net']),'');
});
test('failed upstream refresh retains old news and last successful time',async()=>{
 const old={items:parseFeed(rss(),SOURCES[0]),sources:[{id:SOURCES[0].id,lastSuccessAt:'2026-11-15T08:00:00Z'}],updatedAt:'2026-11-15T08:00:00Z',caseStudies:[]};
 const edition=await refreshEdition(old,async()=>{throw Error('offline');},now);assert.equal(edition.items.length,1);assert.equal(edition.updatedAt,old.updatedAt);assert.equal(edition.checkedAt,now);assert(edition.degraded);assert.equal(edition.sources[0].lastSuccessAt,old.sources[0].lastSuccessAt);
});
test('headlines retain topic diversity and deduplicate canonical URLs',()=>{
 const stories=SOURCES.map((s,i)=>({sourceId:s.id,url:s.url,date:'2026-11-16',id:String(i)}));assert.equal(selectHeadlines([...stories,...stories]).length,3);
});
test('the hosted fetch mode blocks upstream redirects and retains prior content',async()=>{
 const old={items:parseFeed(rss(),SOURCES[0]),sources:[],updatedAt:'2026-11-15T08:00:00Z',caseStudies:[]};
 const edition=await refreshEdition(old,async(url,options)=>{assert.equal(options.redirect,'manual');return new Response(null,{status:302,headers:{Location:'https://unapproved.test/feed'}});},now);
 assert.equal(edition.items.length,1);assert.equal(edition.updatedAt,old.updatedAt);assert(edition.sources.every(s=>s.error==='HTTP 302'));
});
test('case writer validates provenance, deduplicates and keeps unknown publication dates unknown',()=>{
 const c={title:'Case',summary:'A source-linked overview.',url:'https://www.brandsvietnam.com/campaign/example',publisher:'Brands Vietnam'};
 const result=validateCases([c,c],now);assert.equal(result.length,1);assert.equal(result[0].date,null);assert.equal(result[0].checkedAt,now);assert.throws(()=>validateCases([{...c,url:'https://evil.test/case'}],now));
});
test('cross-origin writer requests and unknown API routes are rejected without touching storage',async()=>{
 const denied=await worker.fetch(new Request('https://studio.test/api/reading/refresh',{method:'POST',headers:{Origin:'https://evil.test'}}),{},{});assert.equal(denied.status,403);
 const missing=await worker.fetch(new Request('https://studio.test/api/arbitrary'),{},{});assert.equal(missing.status,404);
});
