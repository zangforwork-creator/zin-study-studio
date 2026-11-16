import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const ref=JSON.parse(await readFile(resolve(root,'dist/data/reference.json'),'utf8'));
const inventory=JSON.parse(await readFile(resolve(root,'../book-inventory.json'),'utf8'));
const materials=[];
for(const course of ref.courses)for(const book of course.books){
 const bytes=await readFile(resolve(root,'../Kho-tai-lieu-mon-hoc',book.filename));
 const hash=createHash('sha256').update(bytes).digest('hex');
 const expected=book.sha256||inventory.documents?.find(b=>b.file.endsWith('/'+book.filename))?.sha256;
 if(hash!==expected)throw Error('Source version differs from the checked catalog: '+book.filename);
 const chunks=[];for(let start=0;start<bytes.length;start+=6*1024*1024){const part=bytes.subarray(start,start+6*1024*1024);chunks.push({size:part.length,sha256:createHash('sha256').update(part).digest('hex')});}
 materials.push({id:book.id,courseId:course.id,title:book.title,filename:book.filename,type:book.filename.endsWith('.pdf')?'pdf':'ppt',sha256:hash,bytes:bytes.length,chunks});
}
await writeFile(resolve(root,'dist/data/materials.json'),JSON.stringify(materials,null,2)+'\n');
await writeFile(resolve(root,'worker/material-catalog.js'),'// Checked originals; no document text or credentials.\nexport const MATERIALS='+JSON.stringify(materials)+';\n');
console.log(JSON.stringify({courses:ref.courses.length,materials:materials.length,bytes:materials.reduce((n,m)=>n+m.bytes,0)}));
