import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage();page.setDefaultTimeout(12000);
await page.clock.install({time:new Date('2026-11-16T13:00:00Z')});
await page.clock.pauseAt(new Date('2026-11-16T13:00:00Z'));
const results=[],errors=[],assert=(value,message)=>{if(!value)throw Error(message);};page.on('pageerror',error=>errors.push(error.message));
async function check(name,fn){try{await fn();results.push({name,pass:true});console.log('PASS '+name);}catch(error){results.push({name,pass:false,error:error.message});console.log('FAIL '+name+': '+error.message);}}
async function open(){await page.goto('http://127.0.0.1:4173/#home');await page.locator('#home [data-action="timer-open"]').waitFor();}
const clock=()=>page.locator('#study-timer-panel [data-timer-clock]');
await open();
await check('header button opens a real timer with exactly the four durations; redundant panel is absent',async()=>{
 assert(await page.locator('#home .focus-panel').count()===0,'Old focus panel remains');assert(!(await page.locator('#home').innerText()).includes('Your next small step'),'Old heading remains');
 await page.locator('#home [data-action="timer-open"]').click();
 assert(await page.locator('.study-timer-options button').allTextContents().then(values=>JSON.stringify(values)===JSON.stringify(['15 phút','30 phút','45 phút','60 phút'])),'Wrong duration choices');
 for(const minutes of [15,30,45,60]){await page.locator('[data-action="timer-duration"][data-minutes="'+minutes+'"]').click();assert(await clock().innerText()===minutes+':00','Selected time not applied');}
});
await check('start, pause and resume use actual elapsed time; double-click cannot reset or duplicate the countdown',async()=>{
 await page.locator('[data-action="timer-duration"][data-minutes="30"]').click();await page.locator('[data-action="timer-start"]').click();
 assert(await page.locator('#study-timer-dock').count()===1,'Multiple clocks mounted');
 await page.clock.fastForward(3000);assert(/^29:5[67]$/.test(await clock().innerText()),'Clock did not count down');
 await page.locator('#study-timer-panel [data-action="timer-toggle"]').click();const paused=await clock().innerText();await page.clock.fastForward(60000);assert(await clock().innerText()===paused,'Pause consumed time');
 await page.locator('#study-timer-panel [data-action="timer-toggle"]').click();await page.clock.fastForward(2000);assert(await clock().innerText()!==paused,'Resume did not count');
});
await check('minimizing and reopening retain the same timer; section navigation and refresh retain lesson drafts',async()=>{
 const deadline=await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-study-timer-v1')).endsAt);
 await page.locator('[data-action="timer-minimize"]').click();assert(await page.locator('#study-timer-dock').isVisible(),'No compact timer');
 await page.locator('#study-timer-dock [data-action="timer-open"]').click();assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-study-timer-v1')).endsAt)===deadline,'Reopening reset time');
 await page.locator('[data-action="timer-minimize"]').click();await page.goto('http://127.0.0.1:4173/#lesson/needs-wants-demands');await page.locator('#lesson-note').fill('Timer must not change this draft.');
 await page.locator('#study-timer-dock [data-action="timer-toggle"]').click();await page.locator('#study-timer-dock [data-action="timer-toggle"]').click();
 assert(await page.locator('#lesson-note').inputValue()==='Timer must not change this draft.','Timer erased lesson draft');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-study-timer-v1')));await page.reload();await page.locator('#study-timer-dock').waitFor();assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('zin-study-timer-v1')).endsAt)===saved.endsAt,'Reload reset countdown');
});
await check('expiry clamps to zero, announces once and does not alter learning progress or block lessons',async()=>{
 const before=await page.evaluate(()=>localStorage.getItem('zin-studio-v1'));
 await page.clock.fastForward(31*60000);assert(await page.locator('#study-timer-dock [data-timer-clock]').innerText()==='00:00','Expired clock is not zero');
 assert((await page.locator('.timer-sr-only').innerText()).includes('Đã hết 30 phút'),'No completion announcement');
 assert(await page.evaluate(()=>localStorage.getItem('zin-studio-v1'))===before,'Clock changed mastery or progress');
 assert(await page.locator('#modal').evaluate(dialog=>!dialog.open),'Expiry interrupted lesson with a dialog');
 assert(await page.locator('#lesson [data-action="practice-lesson"]').count()===1,'Lesson practice blocked');
 await page.locator('#study-timer-dock [data-action="timer-stop"]').click();assert(await page.locator('#study-timer-dock').isHidden(),'Finished clock did not dismiss');
});
await check('pause survives reload and keyboard controls remain usable',async()=>{
 await open();await page.locator('#home [data-action="timer-open"]').focus();await page.keyboard.press('Enter');await page.locator('[data-action="timer-duration"][data-minutes="15"]').click();await page.locator('[data-action="timer-start"]').click();await page.clock.fastForward(1500);await page.locator('#study-timer-panel [data-action="timer-toggle"]').click();const remaining=await clock().innerText();
 await page.reload();await page.locator('#study-timer-dock').waitFor();await page.clock.fastForward(60000);assert(await page.locator('#study-timer-dock [data-timer-clock]').innerText()===remaining,'Paused timer lost on reload');
 await page.locator('#study-timer-dock [data-action="timer-open"]').click();await page.keyboard.press('Escape');assert(await page.locator('#modal').evaluate(dialog=>!dialog.open),'Escape did not close timer');
 await page.locator('#study-timer-dock [data-action="timer-open"]').click();await page.locator('[data-action="timer-stop"]').click();await page.locator('[data-action="timer-minimize"]').click();
});
for(const theme of ['light','dark'])for(const width of [390,768,1440])await check('timer dialog and compact controls fit '+theme+' '+width+'px',async()=>{
 await page.setViewportSize({width,height:1050});await open();await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);await page.locator('#home [data-action="timer-open"]').click();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
 assert(await page.locator('#study-timer-panel button').evaluateAll(buttons=>buttons.every(button=>{const b=button.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth;})),'Timer controls overflow');
 if(width===390||width===1440)await page.screenshot({path:'.preview/study-timer-'+theme+'-'+width+'.png'});
 await page.locator('[data-action="timer-start"]').click();await page.locator('[data-action="timer-minimize"]').click();assert(await page.locator('#study-timer-dock').isVisible(),'Dock missing');
 assert(await page.locator('#study-timer-dock').evaluate(el=>{const b=el.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.bottom<=innerHeight;}),'Compact timer overflows');
 await page.locator('#study-timer-dock [data-action="timer-open"]').click();await page.locator('[data-action="timer-stop"]').click();await page.locator('[data-action="timer-minimize"]').click();
});
await check('storage failure preserves a usable countdown and explains reload limitations',async()=>{
 const fresh=await browser.newContext();await fresh.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='zin-study-timer-v1')throw Error('Quota exceeded');return set.call(this,key,value);};});
 const p=await fresh.newPage();await p.goto('http://127.0.0.1:4173');await p.locator('#home [data-action="timer-open"]').click();await p.locator('[data-action="timer-start"]').click();
 assert((await p.locator('#study-timer-panel .error').innerText()).includes('chưa lưu được'),'Storage failure is hidden');assert(await p.locator('#study-timer-panel [data-action="timer-toggle"]').isVisible(),'Timer became unusable');await fresh.close();
});
await check('no browser runtime errors',async()=>assert(!errors.length,errors.join('; ')));
await writeFile('.preview/study-timer-qa.json',JSON.stringify({results,errors},null,2));await browser.close();if(results.some(result=>!result.pass))process.exitCode=1;
