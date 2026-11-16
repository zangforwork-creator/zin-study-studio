import {chromium} from 'playwright-core';
import {mkdir,readFile,writeFile,unlink} from 'node:fs/promises';
import {resolve,sep,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {stableId} from '../worker/feeds.js';
const edition=JSON.parse(await readFile(process.argv[2]||'.preview/layout-edition.json','utf8'));
const target='dist/assets/reading-snapshots';await mkdir(target,{recursive:true});
let previous={media:{}};try{previous=JSON.parse(await readFile('READING-MEDIA-SOURCES.json','utf8'));}catch{}
const caseImages={
 'https://www.brandsvietnam.com/campaign/omg-3q-va-bai-toan-lam-moi-tuong-dai-sau-9-nam-dong-hanh-cung-game-thu-viet':'https://cdn.brvn.vn/campaign/1280px/2026/omg-thumbnail_1789808955.png',
 'https://www.brandsvietnam.com/campaign/play-together-dung-dang-dung-de-play-he-co-hoi':'https://cdn.brvn.vn/campaign/1280px/2026/play-together-dung-dang-dung-d_1787643741.jpg',
 'https://www.brandsvietnam.com/campaign/valorant-tu-non-la-den-vinahouse':'https://cdn.brvn.vn/campaign/1280px/2026/valorant-cover_1780396695.jpg',
 'https://www.brandsvietnam.com/campaign/clorox-clean-is-the-beginning':'https://cdn.brvn.vn/campaign/1280px/2026/clorox-cover_1779349696.png',
 'https://www.brandsvietnam.com/campaign/nescafe-signature-sao-khong-di-ca-phe-tai-nha':'https://cdn.brvn.vn/campaign/1280px/2025/nescafe-signature-cover-a_1764663107.jpg'
};
const selected=edition.items.filter(n=>n.sourceId==='google-ads'&&n.image).slice(0,7).map(n=>({...n,imageUrl:n.image.src}));
for(const c of edition.caseStudies)if(caseImages[c.url])selected.push({...c,imageUrl:caseImages[c.url]});
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);
const media={},failures=[];
for(const item of selected){
 try{
  let imageUrl=item.imageUrl;
  if(item.sourceId==='google-ads'){
   const response=await fetch(item.url,{redirect:'manual',signal:AbortSignal.timeout(12000)});
   if(response.ok){const html=await response.text();const candidate=html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)/i)?.[1];if(candidate&&new URL(candidate).hostname==='storage.googleapis.com')imageUrl=candidate;}
  }
  // Render the original raster, then capture only that image element.
  // No article text, browser chrome, generated replacement or blocked page is captured.
  const response=await page.request.get(imageUrl,{timeout:15000});if(!response.ok())throw Error('Image HTTP '+response.status());
  const original=await response.body();
  await page.setContent('<html><body style="margin:0;background:transparent"><img id="capture" alt="Source artwork"></body></html>');
  const contentType=response.headers()['content-type']||'image/webp';
  const data='data:'+contentType+';base64,'+original.toString('base64');
  await page.locator('#capture').evaluate(async(img,src)=>{img.src=src;await img.decode();img.style.cssText='display:block;width:'+Math.min(img.naturalWidth,1280)+'px;height:auto;';},data);
  const id=stableId(item.url,'capture'),file=target+'/'+id+'.jpg';
  await page.locator('#capture').screenshot({path:file,type:'jpeg',quality:86});
  const size=await page.locator('#capture').evaluate(img=>({width:img.clientWidth,height:img.clientHeight}));
  const screenshot=await readFile(file);
  media[item.url]={src:'assets/reading-snapshots/'+id+'.jpg',sourceUrl:item.url,imageUrl,credit:'Ảnh chụp nguồn · '+item.publisher,alt:'Ảnh từ bài '+item.title,capturedAt:new Date().toISOString(),method:'browser image-element screenshot',sha256:createHash('sha256').update(screenshot).digest('hex'),...size};
  console.log('Captured '+id+' '+size.width+'x'+size.height);
 }catch(e){failures.push({url:item.url,error:e.message});console.log('Could not capture '+item.url+': '+e.message);}
}
await browser.close();
await writeFile('dist/media-snapshots.js','// Source-matched screenshots captured from original publisher images.\nexport const MEDIA_SNAPSHOTS='+JSON.stringify(media,null,2)+';\n');
await writeFile('READING-MEDIA-SOURCES.json',JSON.stringify({capturedAt:new Date().toISOString(),media,failures},null,2));
// Replace only our own unchanged PNG captures after their JPEG counterpart exists.
for(const old of Object.values(previous.media||{})){
 const current=media[old.sourceUrl],filename=basename(old.src||''),path=resolve(target,filename),root=resolve(target)+sep;
 if(!current||current.src===old.src||!/^capture-[a-f0-9]+\.png$/.test(filename)||!path.startsWith(root))continue;
 try{const bytes=await readFile(path);if(createHash('sha256').update(bytes).digest('hex')===old.sha256)await unlink(path);}catch{}
}
console.log(JSON.stringify({captured:Object.keys(media).length,failures},null,2));if(failures.length)process.exitCode=1;
