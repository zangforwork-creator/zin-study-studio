import {unzipSync,strFromU8} from './vendor/fflate.mjs';
self.onmessage=({data})=>{try{
 let size=0,count=0;const type=data.type;
 const files=unzipSync(data.bytes,{filter:file=>{
  if(++count>5000)throw Error('This archive has too many entries. Export a smaller document.');
  const include=type==='docx'?file.name==='word/document.xml':/^ppt\/slides\/slide\d+\.xml$/.test(file.name);
  if(include){size+=file.originalSize;if(size>40*1024*1024||file.originalSize>10*1024*1024)throw Error('The expanded document is too large. Split it into chapters.');}
  return include;
 }});
 const entries=Object.entries(files).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}));
 if(!entries.length)throw Error('No readable document sections were found. Check the selected file type.');
 if(entries.length>1000)throw Error('Please split this presentation into fewer than 1,000 slides.');
 postMessage({files:entries.map(([name,bytes])=>({name,text:strFromU8(bytes)}))});
}catch(e){postMessage({error:e.message||'Unable to unpack the document.'});}};
