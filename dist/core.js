export const DAY=86400000;
export const STORAGE_KEY='zin-studio-v1';
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const uid=()=>crypto.randomUUID();
export const initialState=()=>({version:1,saved:[],hidden:[],read:[],completed:[],attempts:[],reviews:{},notes:{},documents:[],cards:[],courses:[],goals:{gpa:null,certificates:{},ielts:{},hsk:{}},bookmarks:{},duration:15,newsTopics:[],lastBackup:null});
export function loadState(storage=globalThis.localStorage){
 const raw=storage.getItem(STORAGE_KEY);if(!raw)return initialState();
 return validateState(JSON.parse(raw));
}
export function saveState(state,storage=globalThis.localStorage){storage.setItem(STORAGE_KEY,JSON.stringify(state));}
export function validateState(value){
 if(!value||typeof value!=='object'||value.version!==1)throw Error('This is not a supported Studio backup. Your existing data has not changed.');
 const base=initialState();
 for(const key of ['saved','hidden','read','completed','newsTopics']){
  if(!Array.isArray(value[key])||value[key].length>20000||value[key].some(x=>typeof x!=='string'||x.length>250))throw Error('Invalid '+key+' data.');
  base[key]=[...new Set(value[key])];
 }
 for(const key of ['attempts','documents','cards','courses']){
  if(!Array.isArray(value[key])||value[key].length>20000)throw Error('Invalid '+key+' data.');
  base[key]=value[key].map(x=>{
   if(!x||typeof x!=='object'||typeof x.id!=='string'||!/^[-a-zA-Z0-9_]{1,250}$/.test(x.id)||['__proto__','constructor','prototype'].includes(x.id))throw Error('Invalid '+key+' entry.');
   if(key==='attempts'&&(!['again','hard','good'].includes(x.result)||!Number.isFinite(Date.parse(x.at))))throw Error('Invalid attempt.');
   if(key==='cards'&&(typeof x.question!=='string'||typeof x.answer!=='string'||typeof x.courseId!=='string'||typeof x.sourceLabel!=='string'))throw Error('Invalid study card.');
   if(key==='documents'&&(typeof x.name!=='string'||typeof x.courseId!=='string'||!['pdf','docx','pptx'].includes(x.type)||!Array.isArray(x.sections)))throw Error('Invalid document.');
   if(key==='courses'&&typeof x.name!=='string')throw Error('Invalid course.');
   if(key==='courses')return {id:x.id,name:x.name,books:[],image:'assets/library.webp',current:!!x.current};
   return x;
  });
 }
 for(const key of ['notes','bookmarks']){
  if(!value[key]||typeof value[key]!=='object'||Array.isArray(value[key]))throw Error('Invalid '+key+'.');
  base[key]=Object.fromEntries(Object.entries(value[key]).filter(([k,v])=>!['__proto__','constructor','prototype'].includes(k)&&((key==='notes'&&typeof v==='string')||(key==='bookmarks'&&Number.isInteger(v)&&v>0))));
 }
 base.duration=[5,15,25].includes(value.duration)?value.duration:15;
 const g=value.goals||{};base.goals.gpa=typeof g.gpa==='number'&&g.gpa>=0&&g.gpa<=4?g.gpa:null;
 for(const k of ['certificates','ielts','hsk'])base.goals[k]=Object.fromEntries(Object.entries(g[k]||{}).filter(([id,v])=>!['__proto__','constructor','prototype'].includes(id)&&typeof v==='boolean'));
 // Reconstruct the schedule from validated attempts instead of trusting imported derived state.
 base.attempts=[];base.reviews={};
 for(const a of [...value.attempts].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)))applyAttempt(base,a);
 base.lastBackup=typeof value.lastBackup==='string'?value.lastBackup:null;
 return base;
}
export function scheduleReview(previous,attempt){
 const now=Date.parse(attempt.at);
 const assisted=!!attempt.hintUsed||!!attempt.answerBeforeRecall||!String(attempt.response||'').trim();
 const spaced=!previous||now-Date.parse(previous.lastReviewed)>=DAY;
 let stage=previous?.stage||0;
 let successes=previous?.independentSpacedSuccesses||0;
 if(attempt.result==='again'){stage=0;successes=0;}
 else if(attempt.result==='hard'||assisted){stage=Math.max(0,stage-1);}
 else if(spaced){stage=Math.min(4,previous?stage+1:0);successes++;}
 const interval=attempt.result==='again'||assisted?1:attempt.result==='hard'?Math.min(3,[1,3,7,14,30][stage]):[1,3,7,14,30][stage];
 return {cardId:attempt.cardId,lastReviewed:attempt.at,nextReview:new Date(now+interval*DAY).toISOString(),stage,interval,independentSpacedSuccesses:successes,status:attempt.result==='again'?'needs reinforcement':'practicing'};
}
export function applyAttempt(state,attempt){
 if(state.attempts.some(a=>a.id===attempt.id))return false;
 if(!['again','hard','good'].includes(attempt.result)||!Number.isFinite(Date.parse(attempt.at))||typeof attempt.cardId!=='string'||!/^[-a-zA-Z0-9_]{1,250}$/.test(attempt.cardId)||['__proto__','constructor','prototype'].includes(attempt.cardId))throw Error('Invalid review result.');
 state.attempts.push(attempt);
 state.reviews[attempt.cardId]=scheduleReview(state.reviews[attempt.cardId],attempt);
 return true;
}
export function reviewQueue(cards,state,now=Date.now()){
 return cards.filter(c=>!state.reviews[c.id]||Date.parse(state.reviews[c.id].nextReview)<=now).sort((a,b)=>{
  const ar=state.reviews[a.id],br=state.reviews[b.id];
  if(ar&&!br)return -1;if(!ar&&br)return 1;
  return (Date.parse(ar?.nextReview)||0)-(Date.parse(br?.nextReview)||0);
 });
}
export function metrics(state,cards,now=Date.now()){
 const cardIds=new Set(cards.map(c=>c.id));
 const relevant=state.attempts.filter(a=>cardIds.has(a.cardId));
 return {attempts:relevant.length,independent:relevant.filter(a=>a.result==='good'&&!a.hintUsed&&!a.answerBeforeRecall&&String(a.response||'').trim()).length,
 due:Object.values(state.reviews).filter(r=>cardIds.has(r.cardId)&&Date.parse(r.nextReview)<=now).length,
 evidence:Object.values(state.reviews).filter(r=>cardIds.has(r.cardId)&&r.independentSpacedSuccesses>=2).length,
 newCards:cards.filter(c=>!state.reviews[c.id]).length};
}
export function calculateGpa(courses,rulesConfirmed=false){
 if(!rulesConfirmed)return null;
 const valid=courses.filter(c=>c.result_status==='results_available'&&c.gpa_eligible===true&&Number.isFinite(c.grade_point_4)&&c.grade_point_4>=0&&c.grade_point_4<=4&&Number.isFinite(c.credits)&&c.credits>0);
 if(!valid.length)return null;
 return valid.reduce((s,c)=>s+c.grade_point_4*c.credits,0)/valid.reduce((s,c)=>s+c.credits,0);
}
export function extractHighlights(sections){
 return sections.flatMap(s=>{
  if(!s.text||s.text.trim().length<60)return [];
  const clean=s.text.replace(/\s+/g,' ').trim();
  const sentences=clean.match(/[^.!?]+[.!?]+(?:\s|$)/g)||[clean];
  return sentences.filter(x=>x.length>65&&x.length<650).slice(0,2).map(text=>({page:s.page,text:text.trim()}));
 }).slice(0,7);
}
export function mergeState(current,incoming){
 const merged=structuredClone(current);
 for(const key of ['saved','hidden','read','completed','newsTopics'])merged[key]=[...new Set([...current[key],...incoming[key]])];
 for(const key of ['documents','cards','courses']){
  const map=new Map(incoming[key].map(x=>[x.id,x]));current[key].forEach(x=>map.set(x.id,x));merged[key]=[...map.values()];
 }
 merged.notes={...incoming.notes,...current.notes};merged.bookmarks={...incoming.bookmarks,...current.bookmarks};
 merged.attempts=[...new Map([...incoming.attempts,...current.attempts].map(x=>[x.id,x])).values()];
 // Keep current local goal preferences when merging a backup.
 return validateState(merged);
}
