import fs from 'node:fs';
// Never steer a conversation. A reserved handoff waits for a genuinely idle boundary.
export function createWorkChecker({context,state,request,file}){
 let checking=false,finished=false,handoff=null;
 const idle=ctx=>ctx?.isIdle?.()===true&&typeof ctx.shutdown==='function'&&!ctx.ui?.getEditorText?.()?.trim()&&!ctx.hasPendingMessages?.()&&!ctx.getAsyncJobSnapshot?.()?.running?.length&&['ready','done'].includes(state());
 return async()=>{
  if(checking||finished||!idle(context()))return;checking=true;
  try{
   if(!handoff)handoff=(await request())?.handoff;
   if(!handoff||!idle(context()))return;
   fs.writeFileSync(file+'.tmp',JSON.stringify(handoff),{mode:0o600});fs.renameSync(file+'.tmp',file);
   finished=true;context().shutdown();
  }catch{/* Connection loss must leave the current session usable. */}finally{checking=false;}
 };
}
