import fs from 'node:fs';
// Never steer a conversation. A reserved handoff waits for a genuinely idle boundary.
export function createWorkChecker({context,state,request,file,acknowledge,now=Date.now}){
 let checking=false,finished=false,handoff=null,deliveryId=null,expiresAt=null,received=false;
 const idle=ctx=>ctx?.isIdle?.()===true&&typeof ctx.shutdown==='function'&&!ctx.ui?.getEditorText?.()?.trim()&&!ctx.hasPendingMessages?.()&&!ctx.getAsyncJobSnapshot?.()?.running?.length&&['ready','done'].includes(state());
 return async()=>{
  if(checking||finished||!idle(context()))return;checking=true;
  try{
   if(!handoff){const result=await request();handoff=result?.handoff;deliveryId=result?.deliveryId;expiresAt=result?.delivery?.expiresAt;}
   if(Number.isFinite(expiresAt)&&now()>expiresAt){handoff=null;received=false;return;}
   if(!handoff||!idle(context()))return;
   if(deliveryId&&acknowledge&&!received){const result=await acknowledge(deliveryId);if(result?.accepted!==true)return;received=true;}
   if(!idle(context())||Number.isFinite(expiresAt)&&now()>expiresAt)return;
   fs.writeFileSync(file+'.tmp',JSON.stringify(handoff),{mode:0o600});fs.renameSync(file+'.tmp',file);
   try{await context().shutdown();finished=true;}catch(error){fs.rmSync(file,{force:true});throw error;}
  }catch{/* Connection loss must leave the current session usable. */}finally{checking=false;}
 };
}
