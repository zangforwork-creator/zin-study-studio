export const FEED_TTL=15*60*1000;
export const SOURCES=[
 {id:'vne-business',publisher:'VnExpress',topic:'Kinh doanh',url:'https://vnexpress.net/rss/kinh-doanh.rss',hosts:['vnexpress.net']},
 {id:'vne-world',publisher:'VnExpress',topic:'Thế giới',url:'https://vnexpress.net/rss/the-gioi.rss',hosts:['vnexpress.net']},
 {id:'google-ads',publisher:'Google Ads & Commerce',topic:'Marketing',url:'https://blog.google/products/ads-commerce/rss/',hosts:['blog.google']}
];
export const CASE_HOSTS=['www.brandsvietnam.com','brandsvietnam.com','www.thinkwithgoogle.com','business.google.com','www.warc.com'];
export function decodeText(value){
 return String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff?String.fromCodePoint(v):'';}).replace(/&(amp|lt|gt|quot|apos|nbsp);/gi,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[n.toLowerCase()]);
}
export function plainText(value,max=700){
 return decodeText(decodeText(value)).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}
export function allowedUrl(value,hosts){
 try{const u=new URL(decodeText(value));if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h)))return '';u.hash='';return u.href;}catch{return '';}
}
export function stableId(value,prefix='live'){
 let h=2166136261;for(const c of value){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return prefix+'-'+(h>>>0).toString(16);
}
function tag(xml,name){return xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]||'';}
function attr(tag,name){return tag.match(new RegExp('\\b'+name+'\\s*=\\s*["\x27]([^"\x27]+)["\x27]','i'))?.[1]||'';}
export function parseFeed(xml,source,now=Date.now()){
 if(typeof xml!=='string'||xml.length>2000000||/<!DOCTYPE|<!ENTITY/i.test(xml)||!/<(?:rss|feed)\b/i.test(xml))throw Error('Nguồn không trả về RSS/Atom hợp lệ.');
 const blocks=xml.match(/<item\b[^>]*>[\s\S]*?<\/item>|<entry\b[^>]*>[\s\S]*?<\/entry>/gi)||[];
 const items=[];
 for(const block of blocks.slice(0,80)){
  const title=plainText(tag(block,'title'),220),description=tag(block,'description')||tag(block,'summary')||tag(block,'content');
  const links=block.match(/<link\b[^>]*\/?\s*>/gi)||[];
  const alternate=links.find(x=>attr(x,'rel')==='alternate');
  const rawUrl=decodeText(tag(block,'link')||(alternate&&attr(alternate,'href'))).replace(/^http:\/\//i,'https://');
  const url=allowedUrl(rawUrl,source.hosts);
  const date=Date.parse(plainText(tag(block,'pubDate')||tag(block,'published')||tag(block,'updated')));
  if(!title||!url||!Number.isFinite(date)||date>now+86400000)continue;
  const imageTag=block.match(/<enclosure\b[^>]*>/i)?.[0]||block.match(/<media:(?:content|thumbnail)\b[^>]*>/i)?.[0]||'';
  const rawImage=attr(imageTag,'url')||decodeText(description).match(/<img\b[^>]*\bsrc=["']([^"']+)/i)?.[1]||'';
  const image=allowedUrl(rawImage,['vnecdn.net','googleusercontent.com','blogger.com','gstatic.com','googleblog.com','storage.googleapis.com']);
  items.push({id:stableId(url),sourceId:source.id,publisher:source.publisher,topic:source.topic,title,url,date:new Date(date).toISOString(),subtitle:plainText(description,600),image:image?{src:image,alt:title,credit:'Ảnh từ '+source.publisher,sourceUrl:url}:null,kind:'rss'});
 }
 if(!items.length)throw Error('Không có mục tin có ngày và đường dẫn hợp lệ.');
 return [...new Map(items.map(x=>[x.url,x])).values()].sort((a,b)=>b.date.localeCompare(a.date));
}
export function selectHeadlines(items,limit=5){
 const sorted=[...new Map(items.map(x=>[x.url,x])).values()].sort((a,b)=>b.date.localeCompare(a.date));
 const picked=[];for(const source of SOURCES){const first=sorted.find(x=>x.sourceId===source.id);if(first)picked.push(first);}
 return [...picked,...sorted.filter(x=>!picked.some(p=>p.url===x.url))].slice(0,limit);
}
export function validateCases(value,now=new Date().toISOString()){
 if(!Array.isArray(value)||value.length>30)throw Error('Tối đa 30 case study mỗi lần cập nhật.');
 const cases=value.map(c=>{
  if(!c||typeof c!=='object')throw Error('Case study không hợp lệ.');
  const url=allowedUrl(c.url,CASE_HOSTS),title=plainText(c.title,220),summary=plainText(c.summary,600);
  if(!url||!title||!summary)throw Error('Case study cần tiêu đề, tóm tắt và nguồn được phép.');
  const date=c.date&&Number.isFinite(Date.parse(c.date))?new Date(c.date).toISOString():null;
  if(date&&Date.parse(date)>Date.parse(now)+86400000)throw Error('Ngày xuất bản ở tương lai.');
  return {id:stableId(url,'case'),title,summary,url,publisher:plainText(c.publisher||new URL(url).hostname,80),brand:plainText(c.brand,80),date,campaignPeriod:plainText(c.campaignPeriod,60),checkedAt:now,question:plainText(c.question||'Insight nào dẫn đến lựa chọn chiến lược này? Bạn sẽ kiểm chứng hiệu quả bằng dữ liệu gì?',300),kind:'web'};
 });
 return [...new Map(cases.map(c=>[c.url,c])).values()];
}
export async function refreshEdition(previous,fetcher=fetch,now=new Date().toISOString(),caseInput=null){
 const checked=await Promise.all(SOURCES.map(async source=>{
  try{
   const response=await fetcher(source.url,{signal:AbortSignal.timeout(10000),redirect:'error',headers:{Accept:'application/rss+xml, application/atom+xml, application/xml, text/xml','User-Agent':'ZinStudyStudio/1.0 RSS reader'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const length=Number(response.headers.get('content-length'));if(length>2000000)throw Error('Nguồn vượt giới hạn kích thước.');
   const items=parseFeed(await response.text(),source,Date.parse(now));
   return {source,items,status:{id:source.id,publisher:source.publisher,url:source.url,checkedAt:now,lastSuccessAt:now,error:null}};
  }catch(error){
   const old=previous?.sources?.find(x=>x.id===source.id);
   return {source,items:previous?.items?.filter(x=>x.sourceId===source.id)||[],status:{id:source.id,publisher:source.publisher,url:source.url,checkedAt:now,lastSuccessAt:old?.lastSuccessAt||null,error:String(error.message).slice(0,120)}};
  }
 }));
 const successful=checked.some(x=>!x.status.error);
 const items=[...new Map(checked.flatMap(x=>x.items.slice(0,25)).map(x=>[x.url,x])).values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,120);
 const freshCases=caseInput?.length?validateCases(caseInput,now):[];
 const caseStudies=[...new Map([...(previous?.caseStudies||[]),...freshCases].map(c=>[c.url,c])).values()].slice(-30);
 return {version:1,checkedAt:now,updatedAt:successful?now:previous?.updatedAt||null,caseUpdatedAt:freshCases.length?now:previous?.caseUpdatedAt||null,items,caseStudies,sources:checked.map(x=>x.status),degraded:checked.some(x=>x.status.error)};
}
