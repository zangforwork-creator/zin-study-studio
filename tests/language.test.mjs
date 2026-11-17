import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SITE_LANGUAGE,containsVietnamese,englishEdition,englishStory} from '../dist/language.js';
import {SOURCES,validateCases} from '../worker/feeds.js';
import {initialState,validateState} from '../dist/core.js';
test('English is fixed in the HTML, interface and news sources',async()=>{
 assert.equal(SITE_LANGUAGE,'en');assert.match(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),/<html lang="en" translate="no">/);
 for(const file of ['dist/app.js','dist/core.js','worker/index.js','worker/materials.js'])assert(!containsVietnamese(await readFile(new URL('../'+file,import.meta.url),'utf8')),file+' contains a non-English UI message');
 assert.equal(SOURCES[0].url,'https://e.vnexpress.net/rss/business.rss');assert.equal(SOURCES[1].url,'https://e.vnexpress.net/rss/world.rss');assert(SOURCES.every(s=>!containsVietnamese(s.topic)));
});
test('old cached editions display English without losing source IDs, originals, links or timestamps',()=>{
 const old={updatedAt:'2026-11-16T08:00:00Z',items:[{id:'live-old',title:'Bản tin bằng tiếng Việt',subtitle:'Nội dung nguồn.',publisher:'VnExpress',topic:'Thế giới',url:'https://vnexpress.net/legacy.html',date:'2026-11-16'}],caseStudies:[{id:'case-f3252d60',title:'Bản sắc Việt',summary:'Nội dung chiến dịch',question:'Phân tích?',url:'https://www.brandsvietnam.com/campaign/valorant-tu-non-la-den-vinahouse',publisher:'Brands Vietnam',checkedAt:'2026-11-16T08:00:00Z'}]};const before=structuredClone(old),english=englishEdition(old);
 assert.deepEqual(old,before);assert.equal(english.updatedAt,old.updatedAt);assert.equal(english.items[0].id,'live-old');assert.equal(english.items[0].url,old.items[0].url);assert.equal(english.items[0].originalTitle,old.items[0].title);assert(!containsVietnamese(english.items[0].title));assert(!containsVietnamese(english.caseStudies[0].summary));assert.equal(english.caseStudies[0].checkedAt,old.caseStudies[0].checkedAt);assert.equal(english.caseStudies[0].originalSummary,old.caseStudies[0].summary);
});
test('future case updates must stay English while private reflections remains unchanged',()=>{
 assert.throws(()=>validateCases([{title:'Chiến dịch mới',summary:'Nội dung tiếng Việt.',url:'https://www.brandsvietnam.com/campaign/test'}]),/English-only/);
 assert.throws(()=>validateCases([{title:'Campaign',summary:'English summary.',language:'vi',url:'https://www.brandsvietnam.com/campaign/test'}]),/English-only/);
 const cases=validateCases([{title:'Campaign',summary:'A sourced English summary.',language:'en',url:'https://www.brandsvietnam.com/campaign/test'}]);assert.equal(cases[0].language,'en');
 const state=initialState();state.notes['case:personal']='Ghi chú riêng';const restored=validateState(state);assert.equal(restored.notes['case:personal'],state.notes['case:personal']);
});
