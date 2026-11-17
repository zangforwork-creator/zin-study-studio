import {validateExam,duplicateExam} from './exams.js';
export const STORAGE_KEY='zin-studio-v2';
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const uid=()=>crypto.randomUUID();
export const initialState=()=>({version:2,courses:[],documents:[],notes:{},positions:{},exams:[],collapsed:false,undo:null});
const safe=id=>typeof id==='string'&&/^[-a-zA-Z0-9_]{1,250}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
export function validateState(value){
 if(!value||![1,2].includes(value.version)||JSON.stringify(value).length>18000000)throw Error('Choose a valid Studio backup under 18 MB.');
 const state=initialState();
 for(const key of ['courses','documents']){if(!Array.isArray(value[key])||value[key].length>20000)throw Error('Invalid library data.');state[key]=[...new Map(value[key].map(item=>{if(!item||!safe(item.id)||typeof item.name!=='string')throw Error('Invalid library entry.');if(key==='documents'&&(!safe(item.courseId)||!['pdf','docx','pptx'].includes(item.type)||!Array.isArray(item.sections)||item.sections.some(s=>!Number.isInteger(s.page)||s.page<1||typeof s.text!=='string')))throw Error('Invalid document sections.');return [item.id,key==='courses'?{id:item.id,name:item.name.slice(0,200),books:[],current:!!item.current}:structuredClone(item)];})).values()];}
 for(const [id,note]of Object.entries(value.notes||{}))if(typeof note==='string'&&id.startsWith('case:')&&id.length<400)state.notes[id]=note.slice(0,20000);
 for(const [id,page]of Object.entries(value.positions||value.bookmarks||{}))if(safe(id)&&Number.isInteger(page)&&page>0)state.positions[id]=page;
 if(value.exams!==undefined){if(!Array.isArray(value.exams)||value.exams.length>1000)throw Error('Invalid exam list.');for(const entry of value.exams){const exam=validateExam(entry);if(!state.exams.some(e=>e.id===exam.id)&&!duplicateExam(state.exams,exam))state.exams.push(exam);}}
 state.collapsed=value.collapsed===true;
 if(value.undo&&Number.isFinite(value.undo.until))state.undo={exam:validateExam(value.undo.exam),until:value.undo.until};
 return state;
}
export function loadState(storage){try{storage??=globalThis.localStorage;const raw=storage.getItem(STORAGE_KEY)||storage.getItem('zin-studio-v1');return {state:raw?validateState(JSON.parse(raw)):initialState(),error:''};}catch{return {state:initialState(),error:'Browser data could not be read. It has not been overwritten. Export the original data before restoring a backup.'};}}
export function saveState(state,storage){try{storage??=globalThis.localStorage;const checked=validateState(state);storage.setItem(STORAGE_KEY,JSON.stringify(checked));return checked;}catch(error){throw Error(error.message&&error.message.startsWith('Invalid')?error.message:'Could not save in this browser. Your input is kept; free storage or export a backup, then retry.');}}
export function mergeState(current,incoming){const a=validateState(current),b=validateState(incoming);for(const key of ['courses','documents','exams'])a[key]=[...new Map([...b[key],...a[key]].map(item=>[item.id,item])).values()];a.notes={...b.notes,...a.notes};a.positions={...b.positions,...a.positions};return validateState(a);}
