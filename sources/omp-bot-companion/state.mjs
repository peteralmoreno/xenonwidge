export const STATES=['ready','reading','researching','writing','running','thinking','working','waiting','done','error','offline'];
const groups={reading:['read'],researching:['grep','glob','find','ls','web_search','search','fetch','browse','browser'],writing:['write','edit','apply_patch'],running:['bash','python','exec','execute','task'],waiting:['ask']};
const labels={ready:'Ready for a question',reading:'Reading files',researching:'Searching and researching',writing:'Writing files',running:'Running a command',thinking:'Thinking',working:'Working',waiting:'Question waiting in terminal',done:'Finished — check the terminal',error:'Needs attention in terminal',offline:'Terminal disconnected'};
export function classify(name){const state=Object.keys(groups).find(k=>groups[k].includes(name))||'working';return {state,label:labels[state]};}
export class BotState{
 constructor(){this.reset();}
 reset(){this.tools=new Map();this.approvals=new Set();this.state='ready';this.label=labels.ready;this.startedAt=null;this.finishedAt=null;this.beforeCompaction=null;}
 set(state,label=labels[state]){this.state=state;this.label=label;}
 event(e,now=Date.now()){
  switch(e.type){
   case 'session_start':case 'session_switch':case 'session_branch':this.reset();break;
   case 'agent_start':this.tools.clear();this.approvals.clear();if(this.finishedAt!==null||this.startedAt===null)this.startedAt=now;this.finishedAt=null;this.set('thinking');break;
   case 'tool_execution_start':this.tools.set(e.toolCallId,classify(e.toolName));break;
   case 'tool_execution_end':this.tools.delete(e.toolCallId);this.set('thinking',e.isError?'A tool failed; checking next steps':'Thinking');break;
   case 'tool_approval_requested':this.approvals.add(e.toolCallId);break;
   case 'tool_approval_resolved':this.approvals.delete(e.toolCallId);break;
   case 'auto_retry_start':this.set('working','Retrying the connection');break;
   case 'auto_retry_end':if(!e.success){this.set(e.finalError?'error':'ready',e.finalError?undefined:'Retry stopped — ready for a question');this.finishedAt=now;}break;
   case 'auto_compaction_start':this.beforeCompaction={state:this.state,label:this.label};this.set('thinking','Organizing context');break;
   case 'auto_compaction_end':
    if(e.errorMessage&&!e.skipped){this.set('error','Context maintenance failed; check terminal');this.finishedAt=now;}
    else if(e.willRetry)this.set('thinking');
    else if(this.beforeCompaction)this.set(this.beforeCompaction.state,this.beforeCompaction.label);
    this.beforeCompaction=null;break;
   case 'agent_end':{
    this.tools.clear();this.approvals.clear();
    if(e.willContinue||e.pending){this.set('working','Work is continuing');break;}
    const last=[...(e.messages||[])].reverse().find(m=>m.role==='assistant');
    this.finishedAt=now;
    this.set(last?.stopReason==='error'?'error':last?.stopReason==='aborted'?'ready':'done',last?.stopReason==='aborted'?'Stopped — ready for a question':undefined);break;
   }
   case 'session_shutdown':this.tools.clear();this.approvals.clear();this.set('offline');break;
  }
 }
 view(){
  let state=this.state,label=this.label;
  const tools=[...this.tools.values()];const active=tools.find(t=>t.state==='waiting')||tools.at(-1);
  if(active)({state,label}=active);
  if(this.approvals.size){state='waiting';label='Approval waiting in terminal';}
  return {state,label,startedAt:this.startedAt,finishedAt:this.finishedAt,activeCount:this.tools.size};
 }
}
