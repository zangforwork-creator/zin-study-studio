import {mkdir,readFile,writeFile,copyFile,cp,readdir,realpath,rm} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..'),dist=resolve(root,'dist');
const client=resolve(dist,'client');
try{
 const actual=await realpath(client);
 if(actual.toLowerCase()!==client.toLowerCase()||!actual.toLowerCase().startsWith(root.toLowerCase()+sep))throw Error('Generated client output is outside the checkout.');
 await rm(actual,{recursive:true,force:true});
}catch(error){if(error.code!=='ENOENT')throw error;}
await mkdir(resolve(dist,'client'),{recursive:true});await mkdir(resolve(dist,'server'),{recursive:true});await mkdir(resolve(dist,'.openai'),{recursive:true});
for(const entry of await readdir(dist,{withFileTypes:true})){
 if(['client','server','.openai'].includes(entry.name))continue;
 await cp(resolve(dist,entry.name),resolve(dist,'client',entry.name),{recursive:true});
}
const modules=await Promise.all(['dist/language.js','worker/material-catalog.js','worker/materials.js','worker/feeds.js','worker/index.js'].map(path=>readFile(resolve(root,path),'utf8')));
await writeFile(resolve(dist,'server/index.js'),modules.map(source=>source.replace(/^import[^\n]+\n/gm,'')).join('\n'));
await writeFile(resolve(dist,'server/wrangler.json'),JSON.stringify({name:'zin-study-studio',main:'index.js',compatibility_date:'2026-05-15',assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/api/*']},r2_buckets:[{binding:'BUCKET',bucket_name:'site-creator-r2'}]},null,2));
await copyFile(resolve(root,'.openai/hosting.json'),resolve(dist,'.openai/hosting.json'));
console.log('Built the reading Worker and self-hosted client assets.');
