// Fixed public event wording. No model call, tool input, logs or private reasoning.
const phrases={
 calm:{start:['Started working.'],done:['Just finished some work.'],help:['Need some help. Check my terminal.'],idle:['Relaxing. Nothing underway.'],picked:['Just picked up task {task}.'],completed:['Done with task {task}.'],review:['Finished work on {task}. Ready for your review.']},
 cheerful:{start:["On it! Getting to work.","Here we go. Starting some work."],done:['Wrapped up some work!'],help:['Could use a hand. Check my terminal.'],idle:['Taking a breather. Nothing underway.'],picked:['On it! Picked up task {task}.'],completed:['Wrapped up task {task}!'],review:['Work on {task} is ready for your review!']},
 curious:{start:['Taking a closer look.','Looking into the next piece of work.'],done:['Finished this piece of work.'],help:['Hit a question. Could use some help.'],idle:['Taking a look around. Nothing underway.']},
 focused:{start:['Work started.'],done:['Work finished.'],help:['Need input. Check my terminal.'],idle:['Idle. Nothing underway.'],picked:['Picked up task {task}.'],completed:['Completed task {task}.']},
 sociable:{start:["I'm getting started.","Checking in: starting some work."],done:['Just finished some work. Checking in!'],help:['Can someone lend a hand? Check my terminal.'],idle:['Hanging out. Nothing underway.']}
};
export function activityText(personality,event,title='',seed=''){
 const choices=phrases[personality]?.[event]||phrases.calm[event];
 let hash=0;for(const c of String(seed))hash=(hash*31+c.charCodeAt(0))>>>0;
 return choices[hash%choices.length].replace('{task}',String(title).replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').slice(0,170)).slice(0,240).toWellFormed();
}
const active=new Set(['thinking','reading','researching','writing','running','working','waiting']);
export function reportObservedActivity(manager,s,previous){
 const run=manager.runs[s.profileId];if(!run)return;
 const profile=manager.profiles.find(p=>p.id===s.profileId);
 const attempt=manager.tasks.flatMap(t=>t.attempts||[]).find(a=>a.id===run.attemptId);
 const boardTurn=!!attempt&&(!attempt.finishedAt||s.startedAt<=attempt.finishedAt);
 // One idle notice per idle period, only after a full quiet interval, never while work is reserved.
 if(['ready','done'].includes(s.state)){
  const idleSince=manager.pulses.get(s.profileId)?.idleSince;
  const reserved=manager.tasks.some(t=>(t.attempts||[]).some(a=>a.profileId===s.profileId&&['dispatching','awaiting-runtime','claimed','running','unresolved'].includes(a.state)));
  if(Number.isFinite(idleSince)&&idleSince>0&&manager.now()-idleSince>=manager.sleepSeconds*1000&&!reserved&&!run.idleFeed){
   try{const result=manager.updates.post({profileId:s.profileId,text:activityText(profile?.personality,'idle','',s.launchId+':'+idleSince),kind:'activity',source:'activity',eventId:`idle:${s.launchId}:${idleSince}`});if(result.accepted||result.reason==='duplicate'){run.idleFeed=true;manager.persist();}}catch{}
  }
 }else if(active.has(s.state))run.idleFeed=false;
 if(!Number.isFinite(s.startedAt)||s.startedAt<=0)return;
 let checkpoint=run.activityFeed;
 if(!checkpoint||checkpoint.startedAt!==s.startedAt){checkpoint={startedAt:s.startedAt,seen:[],lastPostAt:0,finished:false};run.activityFeed=checkpoint;
  const freshFinish=previous&&previous.startedAt!==s.startedAt&&['done','error'].includes(s.state)&&Number.isFinite(s.finishedAt)&&manager.now()-s.finishedAt>=0&&manager.now()-s.finishedAt<=10000;
  if(!active.has(s.state)&&!freshFinish){checkpoint.finished=true;return;}
 }
 if(checkpoint.finished)return;
 let phase;
 if(s.state==='waiting'||s.state==='error')phase='help';
 else if(active.has(s.state)&&!boardTurn&&!checkpoint.seen.includes('start'))phase='start';
 else if(s.state==='done'){if(boardTurn){checkpoint.finished=true;return;}phase='done';}
 else return;
 if(checkpoint.seen.includes(phase))return;
 const terminal=s.state==='done'||s.state==='error';
 // A recent explicit blocker already explains the same request for help.
 const last=manager.updates.items.findLast(item=>item.profileId===s.profileId);
 if(phase==='help'&&last?.kind==='blocked'&&manager.now()-last.at<30000){checkpoint.seen.push(phase);if(terminal)checkpoint.finished=true;manager.persist();return;}
 try{
  const result=manager.updates.post({profileId:s.profileId,text:activityText(profile?.personality,phase,'',s.launchId+':'+s.startedAt),kind:'activity',source:'activity',eventId:`activity:${s.launchId}:${s.startedAt}:${phase}`});
  if(result.accepted||result.reason==='duplicate'){checkpoint.seen.push(phase);checkpoint.lastPostAt=manager.now();if(terminal)checkpoint.finished=true;manager.persist();}
 }catch{/* A display log failure must not interrupt work; the next heartbeat retries. */}
}
