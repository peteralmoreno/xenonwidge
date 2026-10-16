// Public activity fallback: fixed descriptions only, never conversation/tool input.
const stages={reading:'Reading files.',researching:'Searching for information.',writing:'Editing files.',running:'Running a command.',working:'Working through the next steps.',waiting:'Waiting for input or approval.'};
const active=new Set(['thinking',...Object.keys(stages)]);
export function reportObservedActivity(manager,s,previous){
 const run=manager.runs[s.profileId];if(!run||!Number.isFinite(s.startedAt)||s.startedAt<=0)return;
 let checkpoint=run.activityFeed;
 const newTurn=!checkpoint||checkpoint.startedAt!==s.startedAt;
 if(newTurn){checkpoint={startedAt:s.startedAt,seen:[],lastPostAt:0,finished:false};run.activityFeed=checkpoint;
  // Connecting/restarting on an old finished turn must not replay history.
  const freshFinish=previous&&previous.startedAt!==s.startedAt&&['done','error'].includes(s.state)&&Number.isFinite(s.finishedAt)&&manager.now()-s.finishedAt>=0&&manager.now()-s.finishedAt<=10000;
  if(!active.has(s.state)&&!freshFinish){checkpoint.finished=true;return;}
 }
 if(checkpoint.finished)return;
 const attempt=manager.tasks.flatMap(t=>t.attempts||[]).find(a=>a.id===run.attemptId);
 const boardTurn=!!attempt&&(!attempt.finishedAt||s.startedAt<=attempt.finishedAt);
 let phase,text;
 if(active.has(s.state)&&!boardTurn&&!checkpoint.seen.includes('start')){phase='start';text=manager.now()-s.startedAt>10000?'Working on this turn.':'Started working.';}
 else if(['done','error'].includes(s.state)){
  if(boardTurn){checkpoint.finished=true;return;}
  phase=s.state;text=s.state==='done'?'Finished this turn. Ready for the next step.':'This turn needs attention. Check the terminal.';
 }else if(stages[s.state]){phase=s.state;text=stages[s.state];}
 else return;
 if(checkpoint.seen.includes(phase))return;
 const terminal=['done','error'].includes(phase);
 const last=manager.updates.items.findLast(item=>item.profileId===s.profileId);
 // Keep the bot's own recent tweet prominent and avoid repetitive tool chatter.
 if(!terminal&&phase!=='start'&&(manager.now()-checkpoint.lastPostAt<30000||last&&manager.now()-last.at<30000))return;
 try{
  const result=manager.updates.post({profileId:s.profileId,text,kind:'activity',source:'activity',eventId:`activity:${s.launchId}:${s.startedAt}:${phase}`});
  if(result.accepted||result.reason==='duplicate'){
   checkpoint.seen.push(phase);checkpoint.lastPostAt=manager.now();if(terminal)checkpoint.finished=true;
   manager.persist();
  }
 }catch{/* A display log failure must not interrupt the runtime; next heartbeat retries. */}
}
