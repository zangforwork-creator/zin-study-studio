import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initialState,applyAttempt,metrics,reviewQueue,calculateGpa,validateState,mergeState,extractHighlights,DAY} from '../dist/core.js';
import {seedCards,NEWS} from '../dist/content.js';
const at=(day)=>new Date(Date.UTC(2026,10,16+day,7)).toISOString();
const attempt=(id,day=0,extra={})=>({id,cardId:'needs-1',at:at(day),result:'good',response:'Buying power',hintUsed:false,answerBeforeRecall:false,...extra});
test('result submission is idempotent, and a blank or assisted answer does not advance recall evidence',()=>{
 const s=initialState();assert.equal(applyAttempt(s,attempt('first')),true);assert.equal(applyAttempt(s,attempt('first')),false);
 assert.equal(s.attempts.length,1);assert.equal(s.reviews['needs-1'].interval,1);
 applyAttempt(s,attempt('hint',1,{hintUsed:true}));assert.equal(s.reviews['needs-1'].interval,1);assert.equal(s.reviews['needs-1'].independentSpacedSuccesses,1);
 applyAttempt(s,attempt('blank',2,{response:''}));assert.equal(s.reviews['needs-1'].independentSpacedSuccesses,1);
});
test('same-day repeats cannot advance intervals; spaced independent attempts can',()=>{
 const s=initialState();applyAttempt(s,attempt('a'));applyAttempt(s,attempt('b'));
 assert.equal(s.reviews['needs-1'].stage,0);assert.equal(s.reviews['needs-1'].independentSpacedSuccesses,1);
 applyAttempt(s,attempt('c',1));assert.equal(s.reviews['needs-1'].interval,3);assert.equal(metrics(s,seedCards()).evidence,1);
 applyAttempt(s,attempt('d',4));assert.equal(s.reviews['needs-1'].interval,7);
 applyAttempt(s,attempt('e',11,{result:'again'}));assert.equal(s.reviews['needs-1'].interval,1);assert.equal(s.reviews['needs-1'].independentSpacedSuccesses,0);
});
test('pending courses are excluded while a confirmed real zero remains eligible',()=>{
 const rows=[{result_status:'results_available',gpa_eligible:true,grade_point_4:4,credits:3},{result_status:'results_available',gpa_eligible:true,grade_point_4:0,credits:3},{result_status:'awaiting_results',gpa_eligible:true,grade_point_4:0,credits:12}];
 assert.equal(calculateGpa(rows),null);assert.equal(calculateGpa(rows,true),2);
});
test('source transcript preserves 11 results, six null results and all excluded study subjects',async()=>{
 const ref=JSON.parse(await readFile(new URL('../dist/data/reference.json',import.meta.url),'utf8'));
 assert.equal(ref.courses.length,10);const rows=ref.gpa.terms.flatMap(t=>t.courses);
 assert.equal(rows.length,17);assert.equal(rows.filter(c=>c.reported_grade_10===null).length,6);
 assert.equal(rows.filter(c=>c.reported_grade_10!==null).length,11);
 assert(rows.some(c=>c.name==='Mathematics'));assert(rows.some(c=>c.name==='Principles of Accounting'));
 assert(ref.courses.every(c=>c.books.length>0),JSON.stringify(ref.courses.map(c=>[c.name,c.books.length])));
});
test('reload/backup retains attempts and reconstructs schedule without trusting derived metrics',()=>{
 const s=initialState();applyAttempt(s,attempt('a'));s.notes.lesson='My explanation';s.saved=['tiktok-live'];s.reviews['needs-1'].interval=999;
 const restored=validateState(JSON.parse(JSON.stringify(s)));assert.equal(restored.reviews['needs-1'].interval,1);assert.equal(restored.notes.lesson,'My explanation');assert.equal(restored.saved.length,1);
});
test('backup merge deduplicates attempts and preserves current notes and document versions',()=>{
 const local=initialState(),incoming=initialState();local.notes.lesson='Current';incoming.notes.lesson='Old';applyAttempt(local,attempt('a'));applyAttempt(incoming,attempt('a'));applyAttempt(incoming,attempt('b',1));
 const merged=mergeState(local,incoming);assert.equal(merged.notes.lesson,'Current');assert.equal(merged.attempts.length,2);
 assert.throws(()=>validateState({version:9}));
});
test('empty and failed source text never yields highlights',()=>{
 assert.deepEqual(extractHighlights([{page:1,text:'',warning:'Unreadable'}]),[]);
 const text='A meaningful source sentence contains enough information to help a learner trace an idea to the original page.';
 const highlights=extractHighlights([{page:12,text}]);assert.equal(highlights[0].page,12);assert.equal(highlights[0].text,text);
});
test('reading and completion do not change recall metrics; due cards take priority',()=>{
 const s=initialState();s.read=NEWS.map(n=>n.id);s.completed=['needs-wants-demands'];assert.equal(metrics(s,seedCards()).evidence,0);assert.equal(metrics(s,seedCards()).attempts,0);
 applyAttempt(s,attempt('a'));const queue=reviewQueue(seedCards(),s,Date.parse(at(2)));assert.equal(queue[0].id,'needs-1');
});
