import {randomUUID} from 'node:crypto';
import {hasActiveAttempt,dependencyReason,workspaceReason} from './queue-policy.mjs';

function changed(manager,task){task.updatedAt=manager.now();task.revision=++manager.taskRevision;manager.persist();}
function notify(manager,task,text,kind='system'){try{manager.updates.post({profileId:task.assignedProfileId,taskId:task.id,text:String(text).slice(0,240),kind});}catch{}}
function applyResult(manager,task,next){
 const previous=task.pipelineRun;task.pipelineRun=next;const attempt=task.attempts.at(-1);
 if(next.status==='succeeded'){
  attempt.state='completed';attempt.finishedAt=manager.now();attempt.summary=String(next.message||'External job completed.').slice(0,6000);task.resultSummary=attempt.summary;
  task.status=task.humanReview?'review':'done';if(!task.humanReview){task.acceptedBy='automatic';task.acceptedAt=manager.now();}
  task.evidence=[...(task.evidence||[]),{kind:'external-job-completion',attemptId:attempt.id,jobId:next.jobId,at:manager.now()}].slice(-20);
 }else if(next.status==='failed'){attempt.state='failed';attempt.finishedAt=manager.now();attempt.error=next.message||'External job failed.';task.status='blocked';}
 else if(next.status==='unresolved'){attempt.state='unresolved';task.status='blocked';}
 else {attempt.state='running';task.status='doing';}
 if(['succeeded','failed'].includes(next.status)){
  const profile=manager.profiles.find(p=>p.id===task.assignedProfileId),run=manager.runs[task.assignedProfileId];
  if(profile?.retireAfterCurrent&&(!run||run.status==='closed')){profile.active=false;profile.slot=null;profile.retireAfterCurrent=false;profile.revision++;}
 }
 if(previous?.status!==next.status||previous?.message!==next.message||previous?.sleeping!==next.sleeping)notify(manager,task,next.sleeping?'Monitoring asleep. Resume to check this job again.':next.message||'External job: '+next.status);
 changed(manager,task);
}
export const pipelineMethods={
 pipelineResident(profile){
  const task=this.tasks.find(t=>t.assignedProfileId===profile.id&&t.pipeline&&t.pipelineRun&&t.attempts?.at(-1)?.kind==='pipeline'&&hasActiveAttempt(t));if(!task)return null;
  const job=task.pipelineRun,at=this.now(),sleeping=job.sleeping===true,state=job.status==='unresolved'?'error':sleeping?'ready':'working';
  return {id:'ranch-'+profile.id,profileId:profile.id,project:profile.nickname,color:profile.color,design:profile.design||'classic',slot:profile.slot,role:profile.role,personality:profile.personality,managed:true,pipeline:true,state,label:job.status==='unresolved'?'External job needs reconciliation':sleeping?'Monitoring asleep; resume from task details':job.message||'Monitoring external job',startedAt:job.startedAt,finishedAt:null,lastSeen:at,idleSince:sleeping?(job.deadline||at):at,canFocus:false,metadata:{folder:task.projectFolder},autoPickup:profile.autoPickup};
 },
 requestPipelineCheck(task){
  const id=task.assignedProfileId,previous=this.pipelineWakeResults.get(id),now=this.now();
  if(previous&&now-previous.at<10000)return previous.result;
  if(this.taskLocks.has(task.id))return {status:'pending',message:'An external-job check is already in progress.'};
  if(task.pipelineRun.retryNotBefore>now)return {status:'pending',message:'The API asked us to wait before checking again.'};
  if(!task.pipelineRun.jobId)return {status:'error',message:'Submission outcome is uncertain. Reconcile the external job before waking.'};
  const result={status:'pending',message:task.pipelineRun.sleeping?'Waking the monitor for one hour; checking the same external job.':'Checking external job progress.'};
  this.pipelineWakeResults.set(id,{at:now,result});
  queueMicrotask(()=>{Promise.resolve().then(async()=>{
   if(this.taskLocks.has(task.id)||!hasActiveAttempt(task))throw Error('Job changed.');
   if(task.pipelineRun.sleeping)await this.pipelineAction({id:task.id,expectedRevision:task.revision,action:'resume',minutes:60});
   else {this.taskLocks.add(task.id);try{const next=await this.pipelineMonitor.poll(task.pipeline,{...task.pipelineRun,nextCheckAt:this.now()});applyResult(this,task,next);}finally{this.taskLocks.delete(task.id);}}
   const deferred=task.pipelineRun.checkDeferred===true;
   this.pipelineWakeResults.set(id,{at:now,result:{status:deferred?'pending':task.pipelineRun.lastError?'error':'checked',message:deferred?'The API asked us to wait before checking again.':task.pipelineRun.lastError||task.pipelineRun.message||('External job: '+task.pipelineRun.status)}});
  }).catch(()=>{this.pipelineWakeResults.set(id,{at:now,result:{status:'error',message:'Monitor is busy or changed. Check task details and try again.'}});});});
  return result;
 },
 async startPipelineTask(task,profile,runtimeRun=null){
  if(profile.readOnly)throw Error('Read-only bots cannot submit external jobs.');
  if(this.locks.has(profile.id)||this.taskLocks.has(task.id))throw Error('A task or bot action is already in progress.');
  const wait=dependencyReason(task,this.tasks)||workspaceReason(task,this.tasks);if(wait)throw Error(wait);
  if(this.tasks.some(t=>t.attempts?.some(a=>a.profileId===profile.id&&hasActiveAttempt({attempts:[a]}))))throw Error('This bot already owns active work.');
  const run=this.runs[profile.id],pulse=this.pulses.get(profile.id);
  if(run&&run.status!=='closed'&&!runtimeRun&&(!pulse||this.now()-pulse.lastSeen>12000||!['ready','done'].includes(pulse.state)))throw Error('Wait for this bot to become idle before starting the pipeline.');
  this.locks.add(profile.id);this.taskLocks.add(task.id);
  try{
   this.pipelineMonitor.preflight?.(task.pipeline);
   const id=randomUUID(),at=this.now();task.assignedProfileId=profile.id;task.releasedForPickup=false;delete task.pickupBlockReason;
   task.attempts.push({id,profileId:profile.id,launchId:'pipeline-'+id,state:'running',kind:'pipeline',createdAt:at,startedAt:at,projectFolder:task.projectFolder});
   // Persist uncertainty before POST. A restart must never resubmit an ambiguous start.
   task.pipelineRun={status:'unresolved',sleeping:true,jobId:null,idempotencyKey:id,startedAt:at,message:'Submission outcome not yet confirmed.'};task.status='doing';changed(this,task);
   const next=await this.pipelineMonitor.start(task.pipeline,id);applyResult(this,task,next);return {pipeline:true,taskId:task.id,status:next.status};
  }finally{this.locks.delete(profile.id);this.taskLocks.delete(task.id);}
 },
 async pollPipelines(){
  if(this.shuttingDown)return;
  for(const task of this.tasks){const run=task.pipelineRun;if(!task.pipeline||!run||run.sleeping||run.stopped||!['queued','running'].includes(run.status)||this.taskLocks.has(task.id))continue;
   this.taskLocks.add(task.id);try{const next=await this.pipelineMonitor.poll(task.pipeline,run);if(JSON.stringify(next)!==JSON.stringify(run))applyResult(this,task,next);}finally{this.taskLocks.delete(task.id);}
  }
 },
 async pipelineAction({id,expectedRevision,action,minutes=60,jobId,confirmed=false}){
  const task=this.tasks.find(t=>t.id===id);if(!task?.pipelineRun||!task.pipeline)throw Error('This task has no external job.');
  if(task.revision!==expectedRevision)throw Object.assign(Error('Task changed; reopen it before continuing.'),{code:'conflict'});
  if(this.taskLocks.has(id))throw Error('A pipeline request is already in progress.');
  if(['succeeded','failed'].includes(task.pipelineRun.status))throw Error('The external job has already finished.');
  this.taskLocks.add(id);try{
   if(action==='stop'){task.pipelineRun={...task.pipelineRun,sleeping:true,stopped:true,nextCheckAt:null};notify(this,task,'Tracking stopped. The external job was not cancelled.');changed(this,task);}
   else if(action==='reconcile'){
    if(task.pipelineRun.status!=='unresolved')throw Error('Only an unresolved submission can link an existing job.');
    if(confirmed!==true)throw Error('Confirm that this is the external job submitted for this task.');
    if(typeof jobId!=='string'||!jobId.trim()||jobId.length>500||/[\u0000-\u001f\u007f-\u009f]/.test(jobId))throw Error('Enter the existing external job ID (up to 500 characters).');
    const next=await this.pipelineMonitor.resume(task.pipeline,{...task.pipelineRun,jobId:jobId.trim(),intervalMinutes:task.pipeline.intervalMinutes,stopped:false},minutes);
    task.evidence=[...(task.evidence||[]),{kind:next.status==='unresolved'?'external-job-reconciliation':'external-job-linked',attemptId:task.attempts.at(-1).id,jobId:jobId.trim(),at:this.now()}].slice(-20);
    applyResult(this,task,next);
   }
   else if(action==='resume'){if(!task.pipelineRun.jobId)throw Error('Submission outcome is uncertain; locate the external job before continuing.');const next=await this.pipelineMonitor.resume(task.pipeline,{...task.pipelineRun,stopped:false},minutes);if(!['succeeded','failed','unresolved'].includes(next.status))notify(this,task,'Monitoring extended for '+minutes+' minutes; keeping the same external job.');applyResult(this,task,next);}
   else throw Error('Choose resume, link existing job, or stop tracking.');
   return this.publicTask(task);
  }finally{this.taskLocks.delete(id);}
 }
};
