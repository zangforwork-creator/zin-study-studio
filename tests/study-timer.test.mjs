import test from 'node:test';
import assert from 'node:assert/strict';
import {newTimer,startTimer,pauseTimer,syncTimer,restoreTimer,timerLabel,TIMER_MINUTES} from '../dist/study-timer.js';
test('the four requested durations initialize exactly; unsupported times fail',()=>{
 assert.deepEqual(TIMER_MINUTES,[15,30,45,60]);for(const minutes of TIMER_MINUTES)assert.equal(newTimer(minutes).remainingMs,minutes*60000);
 for(const minutes of [0,5,25,90,'15'])assert.throws(()=>newTimer(minutes));
});
test('a deadline accounts for background delays instead of interval ticks',()=>{
 const timer=startTimer(newTimer(30),1000);assert.equal(syncTimer(timer,61000).remainingMs,29*60000);
 assert.equal(syncTimer(timer,1000+29*60000).remainingMs,60000);assert.equal(timer.remainingMs,30*60000);
});
test('pausing freezes remaining time and resuming uses only the remainder',()=>{
 const paused=pauseTimer(startTimer(newTimer(15),1000),61000);assert.equal(paused.status,'paused');assert.equal(paused.remainingMs,14*60000);assert.equal(paused.endsAt,null);
 assert.equal(syncTimer(paused,9000000).remainingMs,14*60000);
 const resumed=startTimer(paused,9000000);assert.equal(resumed.endsAt,9000000+14*60000);assert.equal(syncTimer(resumed,9060000).remainingMs,13*60000);
});
test('reloading restores running, paused and expired timers without changing their duration',()=>{
 const timer=startTimer(newTimer(45),1000);assert.equal(restoreTimer(JSON.parse(JSON.stringify(timer)),121000).remainingMs,43*60000);
 const paused=pauseTimer(timer,121000);assert.deepEqual(restoreTimer(paused,9000000),paused);
 const ended=restoreTimer(timer,1000+45*60000);assert.equal(ended.status,'finished');assert.equal(ended.remainingMs,0);assert.equal(ended.endsAt,null);
});
test('double starts never extend a running deadline and expiry cannot resume or become negative',()=>{
 const timer=startTimer(newTimer(60),1000);assert.equal(startTimer(timer,5000).endsAt,timer.endsAt);
 const ended=pauseTimer(timer,1000+61*60000);assert.equal(ended.status,'finished');assert.equal(startTimer(ended,9000000).status,'finished');assert.equal(syncTimer(ended,9000000).remainingMs,0);
});
test('malformed timer storage is rejected independently of learning state',()=>{
 for(const value of [null,{},newTimer(15),{...newTimer(15),remainingMs:-1},{...newTimer(15),status:'running'},{...newTimer(15),status:'paused',remainingMs:0},{...newTimer(15),status:'finished'}]){
  if(value?.status==='ready'&&value.remainingMs===900000)assert.deepEqual(restoreTimer(value),value);else assert.throws(()=>restoreTimer(value));
 }
});
test('display rounds partial seconds up and clamps negative values to zero',()=>{
 assert.equal(timerLabel(60*60000),'60:00');assert.equal(timerLabel(899001),'15:00');assert.equal(timerLabel(1001),'00:02');assert.equal(timerLabel(1),'00:01');assert.equal(timerLabel(-1),'00:00');
});
