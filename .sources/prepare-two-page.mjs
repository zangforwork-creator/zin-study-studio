import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {COURSE_COVERS} from '../dist/course-covers.js';
await mkdir('.sources/two-page-backup',{recursive:true});
for(const name of ['app.js','core.js','index.html'])await writeFile('.sources/two-page-backup/'+name,await readFile('dist/'+name));
const reference=JSON.parse(await readFile('dist/data/reference.json','utf8'));
const data={version:1,title:"Zin's Study Studio",timeZone:'Asia/Ho_Chi_Minh',links:{consumerBehaviorLab:'https://zin-consumer-behaviour-lab.taupeperiwinkle4.chatgpt.site'},exams:[],courses:reference.courses.map(c=>({id:c.id,name:c.name,current:c.current===true,books:c.books,cover:COURSE_COVERS[c.id]||{src:c.image||'assets/library.webp',width:3,height:4,kind:'artwork'}}))};
await writeFile('dist/data/studio.json',JSON.stringify(data,null,2));
