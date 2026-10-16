import path from 'node:path';import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import {createWorkChecker} from './work-check.mjs';
import {messagePreview,branchPreview,handoverText} from './preview.mjs';
import {contextMetadata} from './metadata.mjs';
import {evaluateReadOnlyTool,resolveTaskModel,resolveTaskEffort} from './runtime-policy.mjs';
import {BotState} from './state.mjs';import {readKey,port} from './config.mjs';
export default function ompBot(pi){
 const bot=new BotState(),instance=randomUUID();let id=instance,sequence=0,project='Terminal',key='',timer=null,timerContext=null,sending=false,dirty=false,closed=false,terminal,taskDispatchStarted=false;
 let metadataContext;
 const identity={profileId:process.env.OMP_BOT_PROFILE_ID,launchId:process.env.OMP_BOT_LAUNCH_ID,attemptId:process.env.OMP_BOT_ATTEMPT_ID};
 const workToken=process.env.OMP_BOT_RUNTIME_TOKEN||'';delete process.env.OMP_BOT_RUNTIME_TOKEN;
 const sessionRequest=async(pathname,payload)=>fetch(`http://127.0.0.1:${port}/runtime/${pathname}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+workToken},body:JSON.stringify({profileId:identity.profileId,launchId:identity.launchId,...payload}),signal:AbortSignal.timeout(20000)});
 const checkWork=createWorkChecker({context:()=>closed?null:metadataContext,state:()=>bot.view().state,file:(process.env.OMP_BOT_BINDING_FILE||'')+'.next.json',acknowledge:async deliveryId=>{const r=await sessionRequest('handoff',{deliveryId,phase:'received'});return r.ok?r.json():null;},request:async()=>{if(!workToken||!terminal)return null;const r=await sessionRequest('work',{idle:true});if(!r.ok)return null;const result=await r.json();if(result.wakeAcknowledged)try{pi.sendMessage?.({customType:'ranch-wake',content:result.message||'Awake. Checking the Ranch task queue.',display:true},{triggerTurn:false});}catch{}return result;}});
 let preview,previewTimer=null,previewContext=null;
 const cancelPreview=()=>{if(previewTimer!==null){previewContext.clearTimer(previewTimer);previewTimer=null;}};
 const runtimeToken=process.env.OMP_BOT_DISPATCH_TOKEN||'',taskRuntime=!!(process.env.OMP_BOT_TASK_ID&&process.env.OMP_BOT_ATTEMPT_ID&&/^[a-f0-9]{64}$/.test(runtimeToken));
 if(taskRuntime)delete process.env.OMP_BOT_DISPATCH_TOKEN;
 pi.registerCommand?.('ranch-clean',{description:'Open a fresh OMP session while keeping the previous session history.',handler:async(_args,ctx)=>{await ctx.waitForIdle();await ctx.newSession();ctx.ui?.notify?.('Fresh OMP session opened. Previous history and workspace files were preserved.','info');}});
 const reportingHint='Use ranch_status at meaningful milestones and when blocked to share a brief public progress update (240 characters, at most two lines). Share outcomes, not tool names, tool-by-tool narration, secrets, raw logs or private reasoning. If the task names communication checkpoints, report each when actually reached; keep working unless it explicitly requires approval. Use light personality, never invented progress. Posting status does not complete a task.';
 const managedReporting=taskRuntime||!!(identity.profileId&&identity.launchId&&/^[a-f0-9]{64}$/.test(workToken));
 if(process.env.OMP_BOT_ROLE_FILE||managedReporting)pi.on('before_agent_start',async(_event,ctx)=>{const instructions=process.env.OMP_BOT_ROLE_FILE?fs.readFileSync(process.env.OMP_BOT_ROLE_FILE,'utf8'):'';if(!taskRuntime&&process.env.OMP_BOT_ROLE_MODEL&&process.env.OMP_BOT_ROLE_MODEL!=='auto'){const chosen=resolveTaskModel({models:ctx.models?.list?.()||[],current:ctx.models?.current?.(),preferredModel:process.env.OMP_BOT_ROLE_MODEL});if(await pi.setModel(chosen)===false)throw Error('Role model is unavailable.');}return {systemPromptAppend:[instructions,managedReporting?reportingHint:''].filter(Boolean).join('\n\n')};});
 if(process.env.OMP_BOT_READ_ONLY==='true')pi.on('tool_call',(event,ctx)=>event.toolName==='ranch_status'?undefined:evaluateReadOnlyTool({toolName:event.toolName,input:event.input,cwd:ctx.cwd,workspace:process.env.OMP_BOT_TASK_WORKSPACE}));
 const runtimeRequest=async(pathname,payload={})=>{try{const response=await fetch(`http://127.0.0.1:${port}/runtime/${pathname}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+runtimeToken},body:JSON.stringify({...identity,clientId:instance,...payload}),signal:AbortSignal.timeout(1500)});if(response.status>=500)throw Error('Task service is temporarily unavailable.');return response;}catch(error){error.runtimeTransient=true;throw error;}};
 let statusSequence=0;
 if(managedReporting)pi.registerTool?.({name:'ranch_status',label:'Post Ranch status',approval:'read',loadMode:'essential',description:'Share a brief public progress update on the bot Desk. Use at meaningful milestones or blockers, not for reasoning or secrets. Maximum 240 characters, two lines.',parameters:{type:'object',properties:{text:{type:'string',maxLength:240},blocked:{type:'boolean'}},required:['text'],additionalProperties:false},execute:async(_id,args)=>{
  try{const event={text:args.text,kind:args.blocked?'blocked':'progress',sequence:++statusSequence},response=await (taskRuntime?runtimeRequest('status',{event}):sessionRequest('status',{event}));const result=await response.json();return {content:[{type:'text',text:response.ok?(result.accepted?'Status shared.':'Status unchanged: '+result.reason):'Status could not be shared.'}],details:{accepted:response.ok&&result.accepted===true,reason:result.reason||null}};}catch{return {content:[{type:'text',text:'Status service unavailable; continue the task.'}],details:{accepted:false,reason:'unavailable'}};}
 }});
 async function dispatchTask(ctx){
  if(!taskRuntime||taskDispatching||taskPromptSent||taskDispatchFailed)return;taskDispatching=true;
  try{
   const response=await runtimeRequest('claim');if(!response.ok)throw Error('The companion did not confirm this task claim.');let task;try{({task}=await response.json());}catch(error){error.runtimeTransient=true;throw error;}if(!task||task.attemptId!==identity.attemptId)throw Error('The companion did not confirm this task identity.');claimConfirmed=true;
   const models=ctx.models?.list?.()||[],current=ctx.models?.current?.();
   const chosen=resolveTaskModel({models,current,preferredModel:task.preferredModel||'auto',eligibility:task.modelEligibility||[]});
   if(!current||current.provider!==chosen.provider||current.id!==chosen.id){if(typeof pi.setModel!=='function'||await pi.setModel(chosen)===false)throw Error('The requested model could not be selected.');}
   const effectiveModel=ctx.models?.current?.()||chosen;if(effectiveModel.provider!==chosen.provider||effectiveModel.id!==chosen.id)throw Error('OMP did not confirm the requested model selection.');
   const requested=task.reasoningRequest||'auto',supportedEfforts=effectiveModel.reasoning?['low','medium','high']:[];
   const effort=resolveTaskEffort(supportedEfforts,requested);
   if(effort){if(typeof pi.setThinkingLevel!=='function')throw Error('This OMP runtime cannot select a reasoning level.');pi.setThinkingLevel(effort);if(pi.getThinkingLevel?.()!==effort)throw Error('OMP did not confirm the requested reasoning level.');}
   const settingsResponse=await runtimeRequest('event',{event:{type:'settings_resolved',settings:{provider:effectiveModel.provider,model:effectiveModel.id,reasoning:effort||'auto',role:task.role,readOnly:task.readOnly}}});if(!settingsResponse.ok)throw Error('The companion did not save the effective task settings.');
   const roleDirections={generalist:'Complete the task using sound engineering judgment.',planner:'Analyze dependencies and risks, then carry out the requested plan.',researcher:'Prioritize evidence gathering and cite the relevant local files or sources.',implementer:'Make the requested changes and verify them with appropriate checks.',reviewer:'Review the work against acceptance criteria and report concrete findings.'};
   const prompt=[reportingHint, 'Finish with a concise handover: outcome, checks actually performed, remaining concerns, and output file paths. Do not claim checks you did not perform.',`Role: ${task.role}. ${roleDirections[task.role]||roleDirections.generalist}`,`Task: ${task.title}`,`Role instructions:\n${task.roleInstructions||''}`,`Instructions:\n${task.instructions}`,task.acceptanceCriteria?`Acceptance criteria:\n${task.acceptanceCriteria}`:''].filter(Boolean).join('\n\n');
   if(typeof pi.sendUserMessage!=='function')throw Error('This OMP runtime cannot accept a dispatched task.');
   taskPromptSent=true;pi.sendUserMessage(prompt);
  }catch(error){if(!error.runtimeTransient){taskDispatchFailed=true;if(claimConfirmed)try{await runtimeRequest('event',{event:{type:'agent_error',error:String(error?.message||'Task dispatch failed.')}});}catch{}}}finally{taskDispatching=false;}
 }
 let taskDispatching=false,taskPromptSent=false,taskDispatchFailed=false,claimConfirmed=false;
 try{const binding=JSON.parse(fs.readFileSync(process.env.OMP_BOT_BINDING_FILE,'utf8'));if(Number.isSafeInteger(binding.pid)&&binding.pid>0&&/^\d{15,20}$/.test(binding.started))terminal={pid:binding.pid,started:binding.started};}catch{}
 async function flush(){
  if(sending||!key)return;sending=true;
  try{do{dirty=false;const metadata=contextMetadata(metadataContext);const body={version:1,id,sequence:++sequence,project,...bot.view(),...(metadata?{metadata}:{}),...(preview?{preview}:{}),...(terminal?{terminal}:{}),...(process.env.OMP_BOT_PROFILE_ID?{profileId:process.env.OMP_BOT_PROFILE_ID,launchId:process.env.OMP_BOT_LAUNCH_ID}:{})};await fetch(`http://127.0.0.1:${port}/snapshot`,{method:'PUT',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(800)}).then(r=>r.body?.cancel()).catch(()=>{});}while(dirty);}
  catch{/* Companion loss must never break an OMP session. */}finally{sending=false;}
 }
 const publish=()=>{dirty=true;void flush();};
 for(const type of ['message_start','message_update','message_end'])pi.on(type,(event,ctx)=>{
  if(ctx.agent?.kind==='sub'||closed)return;metadataContext=ctx;
  try{
   const next=messagePreview(event.message);if(!next)return;
   if(preview?.role===next.role&&preview?.text===next.text&&preview?.at===next.at){if(type==='message_end'&&previewTimer!==null){cancelPreview();publish();}return;}
   preview=next;
   if(type==='message_update'){
    if(previewTimer===null&&typeof ctx.setTimeout==='function'){previewContext=ctx;previewTimer=ctx.setTimeout(()=>{previewTimer=null;if(!closed)publish();},250);}
   }else{cancelPreview();publish();}
  }catch{/* Message observation must not interrupt streaming. */}
 });
 const handlers=['session_start','session_switch','session_branch','agent_start','agent_end','tool_execution_start','tool_execution_end','tool_approval_requested','tool_approval_resolved','auto_retry_start','auto_retry_end','auto_compaction_start','auto_compaction_end','session_shutdown'];
 for(const type of handlers)pi.on(type,(event,ctx)=>{
  if(ctx.agent?.kind==='sub')return;metadataContext=ctx;
  try{
   if(['session_start','session_switch','session_branch'].includes(type)){
    cancelPreview();preview=undefined;
    try{preview=branchPreview(ctx.sessionManager?.getBranch?.());}catch{}
    if(timer!==null){timerContext.clearTimer(timer);timer=null;}
    // The widget tracks this terminal instance across session switches.
    project=path.basename(ctx.cwd||process.cwd()).slice(0,80)||'Terminal';closed=false;
    try{key=readKey();}catch{key='';ctx.ui?.notify?.('OMP Bot: start its companion, then restart OMP to connect.','warning');}
    if(typeof ctx.setInterval==='function'){timerContext=ctx;timer=ctx.setInterval(()=>{publish();void checkWork();if(taskRuntime&&!taskPromptSent)void dispatchTask(ctx);},2000);}
    if(type==='session_start'&&taskRuntime&&!taskDispatchStarted){taskDispatchStarted=true;void dispatchTask(ctx);}
   }
   let pending=false;
   if(type==='agent_end'){const jobs=ctx.getAsyncJobSnapshot?.();pending=!!ctx.hasPendingMessages?.()||!!jobs?.running?.length;}
   bot.event({...event,type,pending});publish();
   if(taskRuntime&&taskPromptSent&&type==='agent_start')void runtimeRequest('event',{event:{type:'agent_start'}}).catch(()=>{});
   if(taskRuntime&&taskPromptSent&&type==='agent_end'){
    const messages=Array.isArray(event.messages)?event.messages:[],lastAssistant=[...messages].reverse().find(message=>message?.role==='assistant'),stopReason=lastAssistant?.stopReason;
    if(stopReason==='error'||stopReason==='aborted')void runtimeRequest('event',{event:{type:'agent_error',error:lastAssistant?.errorMessage||`Task turn ${stopReason}.`}}).catch(()=>{});
    else if(!pending&&event.willContinue!==true&&event.isTerminal!==false)void runtimeRequest('event',{event:{type:'agent_end',summary:handoverText(lastAssistant)||(preview?.role==='assistant'?preview.text:'')}}).catch(()=>{});
   }
   if(type==='session_shutdown'){closed=true;cancelPreview();if(timer!==null){timerContext.clearTimer(timer);timer=null;}}
  }catch{/* Observability never changes a tool result or blocks the agent. */}
 });
}
