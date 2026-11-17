import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState,validateState,loadState,saveState,mergeState,STORAGE_KEY,escapeHTML} from '../dist/core.js';
import {calendarDate,daysLeft,deadline,examState,validateExam,orderedExams,duplicateExam,tickLabel} from '../dist/exams.js';
const now=Date.parse('2026-11-17T03:00:00Z'),exam=(overrides={})=>validateExam({id:'exam-a',subject:'Consumer Behaviour',courseId:'consumer-behaviour',type:'Final',date:'2026-12-01',time:'',location:'',note:'',addedAt:'2026-11-01T00:00:00Z',...overrides});
test('Vietnam calendar-day differences ignore 24-hour durations and cross midnight, month, year and leap-day boundaries',()=>{
 assert.equal(calendarDate(Date.parse('2026-11-16T17:00:00Z')),'2026-11-17');assert.equal(daysLeft(exam({date:'2026-11-18'}),Date.parse('2026-11-17T16:59:00Z')),1);assert.equal(daysLeft(exam({date:'2026-11-18'}),Date.parse('2026-11-17T17:00:00Z')),0);assert.equal(daysLeft(exam({date:'2027-01-01'}),Date.parse('2026-12-31T03:00:00Z')),1);assert.equal(daysLeft(exam({date:'2028-03-01'}),Date.parse('2028-02-28T03:00:00Z')),2);
});
test('today, tomorrow, passed and optional-time deadlines are distinct and end-of-day includes the last millisecond',()=>{
 assert.equal(examState(exam({date:'2026-11-18'}),now).label,'Tomorrow');assert.equal(examState(exam({date:'2026-11-17'}),now).label,'Today · good luck');assert(!examState(exam({date:'2026-11-17'}),Date.parse('2026-11-17T16:59:59.999Z')).passed);assert(examState(exam({date:'2026-11-17'}),Date.parse('2026-11-17T17:00:00Z')).passed);assert(examState(exam({date:'2026-11-17',time:'09:00'}),now).passed);assert.equal(tickLabel(exam({date:'2026-11-17',time:'12:00'}),now),'02:00:00');
});
test('all urgency boundaries have text and creation-to-exam progress stays bounded',()=>{
 for(const [date,urgency]of [['2026-12-19','calm'],['2026-12-17','upcoming'],['2026-11-25','upcoming'],['2026-11-24','soon']]){const status=examState(exam({date}),now);assert.equal(status.urgency,urgency);assert(status.urgencyLabel);assert(status.progress>=0&&status.progress<=100);}assert.equal(examState(exam({date:'2026-11-17',addedAt:new Date(now).toISOString()}),now).progress,100);
});
test('exam validation rejects impossible dates and unsafe identities while preserving the caller’s object',()=>{
 for(const override of [{date:'2026-02-30'},{date:''},{time:'24:01'},{subject:' '},{id:'<script>'},{type:'Unknown'},{addedAt:'bad'}])assert.throws(()=>exam(override));const input=exam({note:'<b>Personal note</b>'});const before=structuredClone(input);assert.deepEqual(validateExam(input),before);assert.deepEqual(input,before);
});
test('upcoming exams sort by deadline, completed exams are separate and duplicate submissions are detected',()=>{
 const a=exam(),b=exam({id:'b',date:'2026-11-19'}),c=exam({id:'c',date:'2026-11-16'});assert.deepEqual(orderedExams([a,c,b],now).upcoming.map(e=>e.id),['b','exam-a']);assert.equal(orderedExams([a,c,b],now).completed[0].id,'c');assert(duplicateExam([a],{...a,id:'second'}));assert(!duplicateExam([a],a));
});
test('legacy migration retains courses, files, extracted sections and case reflections without active obsolete data',()=>{
 const raw={version:1,courses:[{id:'personal',name:'My course',current:true}],documents:[{id:'doc',name:'Notes.pdf',courseId:'personal',type:'pdf',pages:2,sections:[{page:1,text:'Original text'}]}],notes:{'case:local-doc-1':'My original reflection',lesson:'Original older note'},bookmarks:{doc:2},saved:['story'],attempts:[{id:'old'}]};const original=structuredClone(raw),state=validateState(raw);assert.deepEqual(raw,original);assert.equal(state.notes['case:local-doc-1'],raw.notes['case:local-doc-1']);assert.equal(state.documents[0].sections[0].text,'Original text');assert.equal(state.positions.doc,2);assert.equal(state.courses[0].name,'My course');assert(!('attempts'in state));assert(!('saved'in state));assert.deepEqual(state.exams,[]);
});
test('empty storage works, unreadable or blocked reads are preserved, and failed writes do not mutate current state',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};assert.deepEqual(loadState(storage).state,initialState());const state=initialState();state.exams=[exam()];saveState(state,storage);assert.equal(loadState(storage).state.exams.length,1);const before=JSON.stringify(state);assert.throws(()=>saveState(state,{setItem(){throw Error('quota');}}),/input is kept/);assert.equal(JSON.stringify(state),before);data.set(STORAGE_KEY,'broken');assert(loadState(storage).error);assert.equal(data.get(STORAGE_KEY),'broken');assert(loadState({getItem(){throw Error('blocked');}}).error);
});
test('reload and backup merge retain exams and current notes once, while undo survives reload',()=>{
 const a=initialState(),b=initialState();a.exams=[exam()];b.exams=[exam(),exam({id:'b',subject:'A custom subject',courseId:''})];a.notes['case:a']='Current';b.notes['case:a']='Incoming';a.undo={exam:exam({id:'deleted'}),until:now+30000};const merged=mergeState(a,b);assert.equal(merged.exams.length,2);assert.equal(mergeState(merged,b).exams.length,2);assert.equal(merged.notes['case:a'],'Current');assert.equal(validateState(JSON.parse(JSON.stringify(merged))).undo.exam.id,'deleted');assert(!escapeHTML('<img src=x>').includes('<img'));
});
test('single editable catalog retains real courses and current-semester picks with no invented exam dates',async()=>{
 const data=JSON.parse(await readFile(new URL('../dist/data/studio.json',import.meta.url)));assert.equal(data.courses.length,10);assert.equal(data.courses.filter(c=>c.current).length,4);assert.deepEqual(data.exams,[]);assert(data.links.consumerBehaviorLab.startsWith('https://'));assert(data.courses.every(c=>c.books.length&&c.cover.src));
});
