import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const results=[];
for(const theme of ['light','dark']){
 for(const route of ['home','library','saved','study','lesson/needs-wants-demands','settings','news']){
  await page.goto('http://127.0.0.1:4173/#'+route);await page.locator('main').waitFor();await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  await page.addScriptTag({path:'../.tools/axe.min.js'});
  const report=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}));
  results.push({theme,route,violations:report.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
 }
}
console.log(JSON.stringify(results.filter(r=>r.violations.length),null,2));await writeFile('.preview/accessibility-qa.json',JSON.stringify(results,null,2));await browser.close();if(results.some(r=>r.violations.length))process.exitCode=1;
