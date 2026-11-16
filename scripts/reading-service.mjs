// A cloud task can use this writer with the Site's short-lived service access.
// Credentials arrive on hidden stdin and are never persisted or printed.
let buffer='';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
console.log('Ready for reading service JSON on stdin (input is hidden).');
const input=await new Promise((resolve,reject)=>{process.stdin.on('data',chunk=>{buffer+=chunk;if(buffer.includes('\n')){try{resolve(JSON.parse(buffer.split('\n')[0]));}catch(e){reject(e);}}});});
if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();
const url=new URL(input.url);
if(url.origin!=='https://zin-study-studio.taupeperiwinkle4.chatgpt.site'||!input.token)throw Error('Use service access for the existing private Site.');
const headers={'OAI-Sites-Authorization':'Bearer '+input.token,'Content-Type':'application/json'};
const result=await fetch(new URL('/api/reading/refresh',url),{method:'POST',headers,body:JSON.stringify(input.caseStudies?{caseStudies:input.caseStudies}:{}),signal:AbortSignal.timeout(45000)});
if(!result.ok)throw Error('Reading writer returned HTTP '+result.status);
const written=await result.json();
const read=await fetch(new URL('/api/reading',url),{headers,signal:AbortSignal.timeout(25000)});
if(!read.ok)throw Error('Could not read back the persisted edition.');
const edition=await read.json();
if(edition.updatedAt!==written.updatedAt||edition.caseStudies.length!==written.caseStudies||edition.items.length!==written.items)throw Error('Readback does not match the saved edition.');
console.log(JSON.stringify({verified:true,...written}));
