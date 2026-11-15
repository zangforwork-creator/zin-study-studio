import {chromium} from 'playwright-core';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});const results=[];
function check(name,value){results.push({name,pass:!!value});if(!value)process.exitCode=1;}
for(const width of [390,430,768,1024,1440]){
 await page.setViewportSize({width,height:1100});await page.goto('http://127.0.0.1:4173/#library');await page.locator('.book-volume').first().waitFor();
 await page.locator('.book-tile').last().scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('.book-cover-image')].every(x=>x.complete&&x.naturalWidth));
 check('all 10 original covers loaded at '+width,await page.locator('.book-cover-image').count()===10);
 check('no cat images in bookshelf at '+width,await page.locator('.bookshelf img').evaluateAll(xs=>xs.every(x=>x.src.includes('/covers/'))));
 check('no horizontal overflow at '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check('book faces match original aspect ratios at '+width,await page.locator('.book-cover-image').evaluateAll(xs=>xs.every(x=>Math.abs(x.clientWidth/x.clientHeight-x.naturalWidth/x.naturalHeight)<.015)));
 check('book frames have no padding at '+width,await page.locator('.book-face').evaluateAll(xs=>xs.every(x=>getComputedStyle(x).padding==='0px')));
}
await page.setViewportSize({width:1440,height:1100});await page.goto('http://127.0.0.1:4173/#library');await page.locator('.book-tile').first().waitFor();await page.evaluate(()=>document.documentElement.dataset.theme='dark');await page.mouse.move(1400,30);await page.locator('main').focus();await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(350);await page.screenshot({path:'.preview/bookshelf-3d-dark.png',fullPage:true});
check('Logistics is explicitly labelled as course slides',await page.locator('.book-tile[data-id="logistics-management"]').innerText().then(t=>t.includes('COURSE SLIDES')));
const first=page.locator('.book-tile').first(),volume=first.locator('.book-volume');
const before=await volume.evaluate(x=>getComputedStyle(x).transform);await first.hover();await page.waitForTimeout(450);const after=await volume.evaluate(x=>getComputedStyle(x).transform);check('hover changes the book angle',before!==after);
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(50);check('reduced motion removes transitions',await volume.evaluate(x=>getComputedStyle(x).transitionDuration==='0s'));
await page.getByRole('textbox',{name:'Search bookshelf'}).fill('Microeconomics');check('search still filters courses',await page.locator('.book-tile').count()===1);
await page.locator('.book-tile').click();await page.waitForURL('**/#course/microeconomics');check('book opens the correct course',page.url().endsWith('#course/microeconomics'));
await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://127.0.0.1:4173/#library');await page.setViewportSize({width:390,height:900});await page.evaluate(()=>document.documentElement.dataset.theme='light');await page.locator('#library-search').fill('');await page.locator('main').focus();await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(350);await page.screenshot({path:'.preview/bookshelf-3d-mobile.png',fullPage:true});
console.log(JSON.stringify(results,null,2));await writeFile('.preview/bookshelf-qa.json',JSON.stringify(results,null,2));await browser.close();
