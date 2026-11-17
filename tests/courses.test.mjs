import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateCourses,filterCourses,courseCards} from '../dist/courses.js';
const data=JSON.parse(await readFile(new URL('../dist/data/online-courses.json',import.meta.url)));
test('five course records retain primary provider sources and distinguish blended delivery',()=>{
 assert.equal(validateCourses(data).courses.length,5);assert.equal(data.courses.find(c=>c.id==='aim-digital-platform').online,false);assert.equal(data.courses.find(c=>c.id==='linkedin-marketing-foundations').duration,'1 hr 20 min');assert.equal(data.courses.find(c=>c.id==='hubspot-digital-marketing').duration,'3 hr 24 min');
});
test('provider, query and online filters combine without mutating the catalog',()=>{
 const before=JSON.stringify(data);assert.equal(filterCourses(data.courses,'marketing','Google').length,1);assert.equal(filterCourses(data.courses,'','all','online').length,4);assert.equal(filterCourses(data.courses,'','AIM Academy','online').length,0);assert.equal(filterCourses(data.courses,'no such course').length,0);assert.equal(JSON.stringify(data),before);
});
test('unsupported source origins, executable links, duplicate records and invalid metadata fail validation',()=>{
 for(const url of ['javascript:alert(1)','https://attacker.test/course','http://grow.google/certificates','https://user:pass@grow.google/course']){const copy=structuredClone(data);copy.courses[0].url=url;assert.throws(()=>validateCourses(copy));}const duplicate=structuredClone(data);duplicate.courses.push(duplicate.courses[0]);assert.throws(()=>validateCourses(duplicate));
});
test('card text is escaped and provider links explicitly open the official source safely',()=>{
 const copy=structuredClone(data.courses[0]);copy.shortTitle='<img src=x onerror=alert(1)>';const html=courseCards([copy]);assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));assert(html.includes('target="_blank" rel="noopener noreferrer"'));assert(html.includes(data.courses[0].url));
});
