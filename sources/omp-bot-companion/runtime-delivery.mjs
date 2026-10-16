import {createHash,timingSafeEqual,randomUUID} from 'node:crypto';
import {statusText} from './updates.mjs';

const deliveryMs=120000,startMs=60000;
const safeDelivery=d=>d?Object.fromEntries(['id','phase','reservedAt','expiresAt','receivedAt','claimedAt','startedAt','reason'].filter(k=>d[k]!==undefined).map(k=>[k,d[k]])):null;
function matches(token,hash){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||typeof hash!=='string')return false;const supplied=Buffer.from(createHash('sha256').update(token).digest('hex')),saved=Buffer.from(hash);return supplied.length===saved.length&&timingSafeEqual(supplied,saved);}
function attemptFor(manager,run){return manager.tasks.flatMap(t=>t.attempts||[]).find(a=>a.id===run?.attemptId);}

export const runtimeDeliveryMethods={
 authenticateSessionRuntime(profileId,launchId,token){const run=this.runs[profileId];return run&&run.status!=='closed'&&run.launchId===launchId&&matches(token,run.runtimeKeyHash)?run:null;},
 reserveRuntimeHandoff(profileId,sourceRun,handoff){
  const run=this.runs[profileId],at=this.now();
  run.delivery={id:randomUUID(),sourceLaunchId:sourceRun.launchId,sourceRuntimeKeyHash:sourceRun.runtimeKeyHash,handoff,phase:'reserved',reservedAt:at,expiresAt:at+deliveryMs};
  attemptFor(this,run).delivery=safeDelivery(run.delivery);this.persist();return {handoff,deliveryId:run.delivery.id,delivery:safeDelivery(run.delivery)};
 },
 expireRuntimeDelivery(run){
  const delivery=run?.delivery,attempt=attemptFor(this,run);if(!delivery||!attempt||!['dispatching','awaiting-runtime','claimed'].includes(attempt.state))return false;
  const deadline=delivery.phase==='claimed'?(attempt.claimedAt??delivery.claimedAt)+startMs:delivery.expiresAt;if(this.now()<=deadline)return false;
  delivery.reason=delivery.phase==='claimed'?'Task claim was acknowledged but execution start was not confirmed before the timeout. Verify the terminal before retry.':delivery.phase==='received'?'Task delivery was received but the replacement runtime did not claim it before the timeout. Verify the terminal before retry.':'Task delivery receipt was not confirmed before the timeout. Verify the source terminal before retry.';
  delivery.phase='unresolved';delete delivery.handoff;attempt.delivery=safeDelivery(delivery);this.markTaskInterrupted(run,delivery.reason);return true;
 },
 replayRuntimeHandoff(profileId,launchId,token){
  const run=this.runs[profileId],d=run?.delivery;
  if(!d||run.status==='closed'||d.sourceLaunchId!==launchId||!matches(token,d.sourceRuntimeKeyHash))return null;
  if(this.expireRuntimeDelivery(run))this.persist();
  const attempt=attemptFor(this,run);
  return d.handoff&&['reserved','received'].includes(d.phase)&&['dispatching','awaiting-runtime'].includes(attempt?.state)?{handoff:d.handoff,deliveryId:d.id,delivery:safeDelivery(d),replayed:true}:{waiting:true,delivery:safeDelivery(d)};
 },
 acknowledgeRuntimeHandoff(profileId,launchId,token,deliveryId,phase){
  const run=this.runs[profileId],d=run?.delivery;
  if(!d||d.id!==deliveryId||phase!=='received'||!this.replayRuntimeHandoff(profileId,launchId,token))return null;
  if(d.phase==='unresolved')return {accepted:false,reason:'expired',delivery:safeDelivery(d)};
  if(d.phase==='reserved'){d.phase='received';d.receivedAt=this.now();attemptFor(this,run).delivery=safeDelivery(d);this.persist();}
  return {accepted:true,delivery:safeDelivery(d)};
 },
 noteRuntimeDelivery(profileId,phase){const run=this.runs[profileId],d=run?.delivery;if(!d)return;d.phase=phase;d[phase==='claimed'?'claimedAt':'startedAt']=this.now();delete d.handoff;const attempt=attemptFor(this,run);if(attempt)attempt.delivery=safeDelivery(d);},
 interruptRuntimeDelivery(run,reason){const d=run?.delivery;if(!d)return;d.phase='unresolved';d.reason=reason;delete d.handoff;const attempt=attemptFor(this,run);if(attempt)attempt.delivery=safeDelivery(d);},
 reportingDiagnostics(profileId){const run=this.runs[profileId];return {automatic:true,lastActivityAt:run?.activityFeed?.lastPostAt||null,supported:!!run?.runtimeKeyHash||!!attemptFor(this,run)?.dispatchTokenHash,...(run?.reporting||{})};},
 noteStatusResult(run,result,sequence){const previous=run.reporting||{};run.reporting={...previous,lastAttemptAt:this.now(),lastResult:result.accepted?'accepted':result.reason||'rejected',...(result.accepted?{lastAcceptedAt:result.item?.at??this.now()}:{}),sequence};},
 postSessionUpdate(profileId,launchId,token,event){
  const run=this.authenticateSessionRuntime(profileId,launchId,token);if(!run||!this.profiles.some(p=>p.id===profileId))return null;
  if(!event||!Number.isSafeInteger(event.sequence)||event.sequence<=0)throw Error('Invalid status sequence.');
  // Task-linked reporting requires the attempt endpoint and its claim-client binding.
  if(event.taskId!==undefined)return null;
  if(event.sequence<=(run.statusSequence||0))return {accepted:false,reason:'stale'};
  const result=this.updates.post({profileId,taskId:null,text:statusText(event.text),kind:event.kind==='blocked'?'blocked':'progress',eventId:'session:'+launchId+':'+event.sequence});run.statusSequence=event.sequence;this.noteStatusResult(run,result,event.sequence);this.persist();return result;
 },
 wakeSleeping(){
  const results=[];let requested=0,acknowledged=0,pending=0,skipped=0;
  for(const p of this.profiles.filter(p=>p.active&&p.slot!==null)){
   const run=this.runs[p.id],pulse=this.pulses.get(p.id),pipeline=this.tasks.find(t=>t.assignedProfileId===p.id&&t.pipelineRun&&t.attempts?.some(a=>['running','unresolved'].includes(a.state))),job=pipeline?.pipelineRun;
   const sleeping=job?job.sleeping&&!job.stopped&&job.status!=='unresolved':run?.status==='connected'&&run.runtimeKeyHash&&pulse&&this.now()-pulse.lastSeen<=12000&&['ready','done'].includes(pulse.state)&&this.now()-pulse.idleSince>=this.sleepSeconds*1000&&!this.tasks.some(t=>t.attempts?.some(a=>a.profileId===p.id&&['dispatching','awaiting-runtime','claimed','running','unresolved'].includes(a.state)));
   if(!sleeping||this.locks.has(p.id)){skipped++;results.push({id:p.id,status:'skipped',message:'Resident is working, awake, off or unavailable.'});continue;}
   const previous=job?this.pipelineWakeResults.get(p.id):run.wake;
   if(previous&&this.now()-(previous.at??0)<10000){const state=job?previous.result:previous;if(['acknowledged','checked'].includes(state.status)){acknowledged++;results.push({id:p.id,status:'acknowledged',message:state.message});}else{pending++;results.push({id:p.id,status:'pending',message:state.message});}continue;}
   if(job){const result=this.requestPipelineCheck(pipeline);requested+=result.requested===false?0:1;pending++;results.push({id:p.id,status:'pending',message:result.message});}
   else {run.checkRequested=true;run.wake={status:'pending',at:this.now(),message:'Wake requested; waiting for the idle runtime to acknowledge.'};run.workCheckResult={status:'pending',message:run.wake.message};requested++;pending++;results.push({id:p.id,status:'pending',message:run.wake.message});}
  }
  this.persist();return {requested,acknowledged,pending,skipped,results,message:`Wake requested for ${requested}; ${acknowledged} acknowledged; ${pending} pending; ${skipped} skipped.`};
 }
};
