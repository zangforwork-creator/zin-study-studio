import {englishEdition} from './language.js';
const CACHE='zin-reading-cache-v1';
export const REFRESH_MS=15*60*1000;
const trusted=['vnexpress.net','blog.google','ads-developers.googleblog.com','brandsvietnam.com','thinkwithgoogle.com','business.google.com','warc.com'];
export function safeSource(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&trusted.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))?u.href:'';}catch{return '';}}
export function cleanEdition(value){
 if(!value||!Array.isArray(value.items)||!Array.isArray(value.caseStudies))throw Error('The reading source is not ready yet.');
 return englishEdition({...value,items:value.items.filter(n=>typeof n.id==='string'&&/^live-[a-f0-9]+$/.test(n.id)&&typeof n.title==='string'&&safeSource(n.url)&&Number.isFinite(Date.parse(n.date))).slice(0,120),caseStudies:value.caseStudies.filter(c=>typeof c.id==='string'&&/^case-[a-f0-9]+$/.test(c.id)&&typeof c.title==='string'&&safeSource(c.url)).slice(0,30)});
}
export function cachedEdition(){try{return cleanEdition(JSON.parse(localStorage.getItem(CACHE)));}catch{return {items:[],caseStudies:[],sources:[],updatedAt:null,caseUpdatedAt:null};}}
export async function fetchEdition(){
 const response=await fetch('/api/reading',{cache:'no-store',signal:AbortSignal.timeout(18000)});
 if(!response.ok)throw Error('New stories are unavailable. Your latest saved edition is retained; you can retry.');
 const edition=cleanEdition(await response.json());try{localStorage.setItem(CACHE,JSON.stringify(edition));}catch{}
 return edition;
}
export function todayKey(now=new Date()){return now.toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});}
export function dailyCase(cases,offset=0,now=new Date()){
 if(!cases.length)return null;
 const day=todayKey(now);let id;
 try{const saved=JSON.parse(localStorage.getItem('zin-case-today-v1'));if(saved?.day===day)id=saved.id;}catch{}
 let index=cases.findIndex(c=>c.id===id);
 if(index<0){index=Math.floor(Date.parse(day+'T00:00:00+07:00')/86400000)%cases.length;try{localStorage.setItem('zin-case-today-v1',JSON.stringify({day,id:cases[index].id}));}catch{}}
 return cases[(index+offset%cases.length+cases.length)%cases.length];
}
export function localCaseSections(documents){
 return documents.flatMap(doc=>doc.sections.filter(s=>typeof s.text==='string'&&s.text.trim().length>=60).map(s=>({id:'local-'+doc.id+'-'+s.page,title:doc.name,documentId:doc.id,page:s.page,text:s.text,sourceLabel:`${doc.name} · ${doc.type==='pptx'?'slide':'section/page'} ${s.page} · version ${doc.id.slice(0,8)}`,candidate:/case[\s-]?study|chiến dịch|campaign|tình huống/i.test(s.text)}))).sort((a,b)=>Number(b.candidate)-Number(a.candidate));
}
