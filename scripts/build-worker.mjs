import {mkdir,readFile,writeFile,copyFile,cp,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
await mkdir(resolve(dist,'client'),{recursive:true});await mkdir(resolve(dist,'server'),{recursive:true});await mkdir(resolve(dist,'.openai'),{recursive:true});
for(const entry of await readdir(dist,{withFileTypes:true})){
 if(['client','server','.openai'].includes(entry.name))continue;
 await cp(resolve(dist,entry.name),resolve(dist,'client',entry.name),{recursive:true});
}
const core=await readFile(resolve(root,'worker/feeds.js'),'utf8'),worker=await readFile(resolve(root,'worker/index.js'),'utf8');
await writeFile(resolve(dist,'server/index.js'),core+'\n'+worker.replace(/^import[^\n]+\n/,''));
await writeFile(resolve(dist,'server/wrangler.json'),JSON.stringify({name:'zin-study-studio',main:'index.js',compatibility_date:'2026-05-15',assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/api/*']},r2_buckets:[{binding:'BUCKET',bucket_name:'site-creator-r2'}]},null,2));
await copyFile(resolve(root,'.openai/hosting.json'),resolve(dist,'.openai/hosting.json'));
console.log('Built the reading Worker and self-hosted client assets.');
