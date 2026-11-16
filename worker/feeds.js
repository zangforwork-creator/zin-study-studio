import {englishEdition,containsVietnamese} from '../dist/language.js';
export const FEED_TTL=15*60*1000;
export const SOURCES=[
 {id:'vne-business',publisher:'VnExpress International',topic:'Business',url:'https://e.vnexpress.net/rss/business.rss',hosts:['e.vnexpress.net']},
 {id:'vne-world',publisher:'VnExpress International',topic:'World',url:'https://e.vnexpress.net/rss/world.rss',hosts:['e.vnexpress.net']},
 {id:'google-ads',publisher:'Google Ads & Commerce',topic:'Marketing',url:'https://blog.google/products/ads-commerce/rss/',hosts:['blog.google']}
];
export const CASE_HOSTS=['www.brandsvietnam.com','brandsvietnam.com','www.thinkwithgoogle.com','business.google.com','www.warc.com'];
export function rasterMime(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')return 'image/webp';
 if(b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v))return 'image/png';
 if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
 if(b.length>=6&&['GIF87a','GIF89a'].includes(String.fromCharCode(...b.slice(0,6))))return 'image/gif';
 if(b.length>=12&&String.fromCharCode(...b.slice(4,8))==='ftyp'&&['avif','avis'].includes(String.fromCharCode(...b.slice(8,12))))return 'image/avif';
 return '';
}
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
 if(typeof xml!=='string'||xml.length>2000000||/<!DOCTYPE|<!ENTITY/i.test(xml)||!/<(?:rss|feed)\b/i.test(xml))throw Error('The source did not return valid RSS or Atom.');
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
  items.push({id:stableId(url),sourceId:source.id,publisher:source.publisher,topic:source.topic,title,url,date:new Date(date).toISOString(),subtitle:plainText(description,600),image:image?{src:image,alt:title,credit:'Image from '+source.publisher,sourceUrl:url}:null,kind:'rss'});
 }
 if(!items.length)throw Error('No valid dated stories with approved links were found.');
 return [...new Map(items.map(x=>[x.url,x])).values()].sort((a,b)=>b.date.localeCompare(a.date));
}
export function selectHeadlines(items,limit=5){
 const sorted=[...new Map(items.map(x=>[x.url,x])).values()].sort((a,b)=>b.date.localeCompare(a.date));
 const picked=[];for(const source of SOURCES){const first=sorted.find(x=>x.sourceId===source.id);if(first)picked.push(first);}
 return [...picked,...sorted.filter(x=>!picked.some(p=>p.url===x.url))].slice(0,limit);
}
export function validateCases(value,now=new Date().toISOString()){
 if(!Array.isArray(value)||value.length>30)throw Error('Submit up to 30 case studies per update.');
 const cases=value.map(c=>{
  if(!c||typeof c!=='object')throw Error('Invalid case study.');
  const url=allowedUrl(c.url,CASE_HOSTS),title=plainText(c.title,220),summary=plainText(c.summary,600);
  if(!url||!title||!summary)throw Error('A case study needs a title, summary, and an approved source.');
  if(c.language&&c.language!=='en'||[title,summary,c.question||''].some(containsVietnamese))throw Error('English-only website: submit case titles, summaries, and questions in English.');
  const date=c.date&&Number.isFinite(Date.parse(c.date))?new Date(c.date).toISOString():null;
  if(date&&Date.parse(date)>Date.parse(now)+86400000)throw Error('The publication date is in the future.');
  const imageUrl=allowedUrl(c.image?.src||c.imageUrl,['brvn.vn','brandsvietnam.com','googleusercontent.com','storage.googleapis.com','gstatic.com','thinkwithgoogle.com','business.google.com']);
  const image=imageUrl?{src:imageUrl,alt:plainText(c.image?.alt||title,220),credit:plainText(c.image?.credit||'Image from the case-study source',100),sourceUrl:url}:null;
  return {id:stableId(url,'case'),title,summary,url,publisher:plainText(c.publisher||new URL(url).hostname,80),brand:plainText(c.brand,80),date,campaignPeriod:plainText(c.campaignPeriod,60),checkedAt:now,question:plainText(c.question||'Which insight led to this strategic choice? What evidence would you use to assess its results?',300),image,kind:'web',language:'en'};
 });
 return [...new Map(cases.map(c=>[c.url,c])).values()];
}
export async function refreshEdition(previous,fetcher=fetch,now=new Date().toISOString(),caseInput=null){
 previous=englishEdition(previous||{});
 const checked=await Promise.all(SOURCES.map(async source=>{
  try{
   const response=await fetcher(source.url,{signal:AbortSignal.timeout(10000),redirect:'manual',headers:{Accept:'application/rss+xml, application/atom+xml, application/xml, text/xml','User-Agent':'ZinStudyStudio/1.0 RSS reader'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const length=Number(response.headers.get('content-length'));if(length>2000000)throw Error('The source exceeds the size limit.');
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
 return {version:1,language:'en',checkedAt:now,updatedAt:successful?now:previous?.updatedAt||null,caseUpdatedAt:freshCases.length?now:previous?.caseUpdatedAt||null,items,caseStudies,sources:checked.map(x=>x.status),degraded:checked.some(x=>x.status.error)};
}
