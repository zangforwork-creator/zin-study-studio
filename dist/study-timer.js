export const TIMER_KEY='zin-study-timer-v1';
export const TIMER_MINUTES=[15,30,45,60];
export function newTimer(minutes=15){
 if(!TIMER_MINUTES.includes(minutes))throw Error('Choose 15, 30, 45, or 60 minutes.');
 return {version:1,minutes,status:'ready',remainingMs:minutes*60000,endsAt:null};
}
export function syncTimer(timer,now=Date.now()){
 if(timer.status!=='running')return {...timer};
 const remainingMs=Math.max(0,Math.min(timer.minutes*60000,timer.endsAt-now));
 return {...timer,remainingMs,status:remainingMs?'running':'finished',endsAt:remainingMs?timer.endsAt:null};
}
export function restoreTimer(value,now=Date.now()){
 if(!value||value.version!==1||!TIMER_MINUTES.includes(value.minutes)||!['ready','running','paused','finished'].includes(value.status)||!Number.isFinite(value.remainingMs)||value.remainingMs<0||value.remainingMs>value.minutes*60000||
 (value.status==='running'?!Number.isFinite(value.endsAt):value.endsAt!==null)||
 (value.status==='ready'&&value.remainingMs!==value.minutes*60000)||(value.status==='finished'&&value.remainingMs!==0)||(value.status==='paused'&&!value.remainingMs))throw Error('The timer could not be restored. Choose a duration to start again.');
 return syncTimer({version:1,minutes:value.minutes,status:value.status,remainingMs:value.remainingMs,endsAt:value.endsAt},now);
}
export function startTimer(timer,now=Date.now()){
 const current=syncTimer(timer,now);
 if(!['ready','paused'].includes(current.status))return current;
 return {...current,status:'running',endsAt:now+current.remainingMs};
}
export function pauseTimer(timer,now=Date.now()){
 const current=syncTimer(timer,now);
 return current.status==='running'?{...current,status:'paused',endsAt:null}:current;
}
export function timerLabel(ms){const seconds=Math.ceil(Math.max(0,ms)/1000);return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}

export function mountStudyTimer({openModal,closeModal,toast}){
 let timer=newTimer(),storageWarning=false,paintedStatus='',announced=false;
 const dock=document.createElement('aside');dock.id='study-timer-dock';dock.className='study-timer-dock';dock.setAttribute('aria-label','Study timer');dock.hidden=true;document.body.append(dock);
 const announcement=document.createElement('p');announcement.className='timer-sr-only';announcement.setAttribute('role','status');announcement.setAttribute('aria-live','polite');document.body.append(announcement);
 function load(raw){try{timer=raw?restoreTimer(JSON.parse(raw)):newTimer();}catch(error){timer=newTimer();toast(error.message);}}
 try{load(localStorage.getItem(TIMER_KEY));}catch{storageWarning=true;}
 const statusText=()=>({ready:'Choose a study duration',running:'Counting down',paused:'Paused',finished:'Time is up — you can keep learning'})[timer.status];
 function persist(){try{localStorage.setItem(TIMER_KEY,JSON.stringify(timer));}catch{if(!storageWarning){storageWarning=true;toast('The timer works for this visit, but the browser could not save it for a reload.');}}}
 function body(){const active=['running','paused'].includes(timer.status);return `<div class="study-timer-intro"><span class="pill blue">YOUR TIME, YOUR PACE</span><p>Choose a manageable focus period. You can pause at any time.</p></div><div class="study-timer-options" role="group" aria-label="Study session duration">${TIMER_MINUTES.map(minutes=>`<button type="button" data-action="timer-duration" data-minutes="${minutes}" aria-pressed="${timer.minutes===minutes}" ${active?'disabled':''}>${minutes} min</button>`).join('')}</div><div class="study-timer-face"><span class="study-timer-clock" data-timer-clock role="timer" aria-live="off">${timerLabel(timer.remainingMs)}</span><p data-timer-status>${statusText()}</p></div><div class="study-timer-controls">${timer.status==='ready'?'<button class="btn primary" data-action="timer-start">Start countdown</button>':active?`<button class="btn primary" data-action="timer-toggle">${timer.status==='running'?'Pause':'Resume'}</button><button class="btn outline" data-action="timer-stop">End session</button>`:'<button class="btn primary" data-action="timer-stop">Choose a new session</button>'}<button class="btn outline" data-action="timer-minimize">${active?'Minimize and keep learning':'Close timer'}</button></div><p class="source-note">The timer continues across sections and tabs. Countdown time does not automatically increase learning progress or mastery.</p>${storageWarning?'<p class="error">The browser could not save this timer. Reloading may lose this session.</p>':''}`;}
 function paint(rebuild=false){
  const changed=paintedStatus!==timer.status,panel=document.getElementById('study-timer-panel');
  if(panel&&(changed||rebuild)){
   const action=document.activeElement?.dataset?.action,minutes=document.activeElement?.dataset?.minutes;
   panel.innerHTML=body();
   const target=[...panel.querySelectorAll('button:not([disabled])')].find(button=>button.dataset.action===action&&button.dataset.minutes===minutes);
   (target||panel.querySelector('.study-timer-controls .primary'))?.focus({preventScroll:true});
  }
  if(changed||rebuild){
   const focused=document.activeElement?.closest('#study-timer-dock')?document.activeElement.dataset.action:null;
   dock.hidden=timer.status==='ready';
   document.documentElement.classList.toggle('has-study-timer',!dock.hidden);
   dock.innerHTML=`<button class="study-timer-dock-open" data-action="timer-open" aria-label="Open study timer"><span data-timer-clock role="timer" aria-live="off">${timerLabel(timer.remainingMs)}</span><span data-timer-status>${statusText()}</span></button>${['running','paused'].includes(timer.status)?`<button class="btn outline small-btn" data-action="timer-toggle">${timer.status==='running'?'Pause':'Resume'}</button>`:'<button class="btn outline small-btn" data-action="timer-stop">Close</button>'}`;
   if(focused){const target=dock.hidden?document.querySelector('#home [data-action="timer-open"]'):dock.querySelector('[data-action="'+focused+'"]')||dock.querySelector('[data-action="timer-open"]');target?.focus({preventScroll:true});}
  }
  document.querySelectorAll('[data-timer-clock]').forEach(el=>el.textContent=timerLabel(timer.remainingMs));
  document.querySelectorAll('[data-timer-status]').forEach(el=>el.textContent=statusText());
  paintedStatus=timer.status;
  if(timer.status==='finished'&&!announced){announced=true;announcement.textContent='Your '+timer.minutes+' minutes are up. Take a short break or keep learning.';}
  if(timer.status!=='finished'){announced=false;announcement.textContent='';}
 }
 function tick(){const previous=timer.status;timer=syncTimer(timer);if(previous!==timer.status)persist();paint();}
 function open(){tick();openModal('Study timer',`<div id="study-timer-panel">${body()}</div>`);}
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action;
  if(action==='timer-open'){open();return;}
  if(action==='timer-minimize'){closeModal();return;}
  if(!['timer-duration','timer-start','timer-toggle','timer-stop'].includes(action))return;
  if(action==='timer-duration'&&['ready','finished'].includes(timer.status))timer=newTimer(Number(button.dataset.minutes));
  if(action==='timer-start')timer=startTimer(timer);
  if(action==='timer-toggle')timer=timer.status==='running'?pauseTimer(timer):startTimer(timer);
  if(action==='timer-stop')timer=newTimer(timer.minutes);
  persist();paint(true);
 });
 addEventListener('storage',event=>{if(event.key===TIMER_KEY){load(event.newValue);paint(true);}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
 // Use a deadline, not a decremented counter: background throttling and reloads
 // cannot reset a running session or count a pause as elapsed study time.
 setInterval(tick,250);paint();
}
