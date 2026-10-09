import path from 'node:path';import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import {messagePreview,branchPreview} from './preview.mjs';
import {BotState} from './state.mjs';import {readKey,port} from './config.mjs';
export default function ompBot(pi){
 const bot=new BotState(),instance=randomUUID();let id=instance,sequence=0,project='Terminal',key='',timer=null,timerContext=null,sending=false,dirty=false,closed=false,terminal;
 let preview,previewTimer=null,previewContext=null;
 const cancelPreview=()=>{if(previewTimer!==null){previewContext.clearTimer(previewTimer);previewTimer=null;}};
 try{const binding=JSON.parse(fs.readFileSync(process.env.OMP_BOT_BINDING_FILE,'utf8'));if(Number.isSafeInteger(binding.pid)&&binding.pid>0&&/^\d{15,20}$/.test(binding.started))terminal={pid:binding.pid,started:binding.started};}catch{}
 async function flush(){
  if(sending||!key)return;sending=true;
  try{do{dirty=false;const body={version:1,id,sequence:++sequence,project,...bot.view(),...(preview?{preview}:{}),...(terminal?{terminal}:{}),...(process.env.OMP_BOT_PROFILE_ID?{profileId:process.env.OMP_BOT_PROFILE_ID,launchId:process.env.OMP_BOT_LAUNCH_ID}:{})};await fetch(`http://127.0.0.1:${port}/snapshot`,{method:'PUT',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(800)}).then(r=>r.body?.cancel()).catch(()=>{});}while(dirty);}
  catch{/* Companion loss must never break an OMP session. */}finally{sending=false;}
 }
 const publish=()=>{dirty=true;void flush();};
 for(const type of ['message_start','message_update','message_end'])pi.on(type,(event,ctx)=>{
  if(ctx.agent?.kind==='sub'||closed)return;
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
  if(ctx.agent?.kind==='sub')return;
  try{
   if(['session_start','session_switch','session_branch'].includes(type)){
    cancelPreview();preview=undefined;
    try{preview=branchPreview(ctx.sessionManager?.getBranch?.());}catch{}
    if(timer!==null){timerContext.clearTimer(timer);timer=null;}
    // The widget tracks this terminal instance across session switches.
    project=path.basename(ctx.cwd||process.cwd()).slice(0,80)||'Terminal';closed=false;
    try{key=readKey();}catch{key='';ctx.ui?.notify?.('OMP Bot: start its companion, then restart OMP to connect.','warning');}
    if(typeof ctx.setInterval==='function'){timerContext=ctx;timer=ctx.setInterval(publish,2000);}
   }
   let pending=false;
   if(type==='agent_end'){const jobs=ctx.getAsyncJobSnapshot?.();pending=!!ctx.hasPendingMessages?.()||!!jobs?.running?.length;}
   bot.event({...event,type,pending});publish();
   if(type==='session_shutdown'){closed=true;cancelPreview();if(timer!==null){timerContext.clearTimer(timer);timer=null;}}
  }catch{/* Observability never changes a tool result or blocks the agent. */}
 });
}
