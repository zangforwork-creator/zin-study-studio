import {readFileSync,writeFileSync} from 'node:fs';
let app=readFileSync('dist/app.js','utf8');app=app.replace("readingError?' · Update unavailable'","readingError?' · Using the latest available edition'");writeFileSync('dist/app.js',app);
let qa=readFileSync('scripts/two-page-qa.mjs','utf8');qa=qa.replace("includes('Tomorrow')","includes('day left')").replace("page.locator('.avatar-button').click()","page.locator('.profile').click()");writeFileSync('scripts/two-page-qa.mjs',qa);
