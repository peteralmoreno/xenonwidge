import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

function validateHandoff(h){
 const text=value=>typeof value==='string'&&value.trim().length>0&&!value.includes('\0');
 const absolute=value=>text(value)&&path.isAbsolute(value);
 if(!h||!absolute(h.folder)||!absolute(h.history)||!absolute(h.homeFolder)||
    !['resume','task'].includes(h.mode)||typeof h.token!=='string'||!/^[a-f0-9]{64}$/.test(h.token)||
    !['launchId','taskId','attemptId'].every(key=>text(h[key]))||
    (h.roleInstructions!==undefined&&typeof h.roleInstructions!=='string')||
    (h.preferredModel!==undefined&&!text(h.preferredModel))||
    (h.readOnly!==undefined&&typeof h.readOnly!=='boolean'))throw Error('Invalid task handoff.');
 if(!fs.statSync(h.folder).isDirectory())throw Error('Invalid task handoff project.');
 if(fs.existsSync(h.history)&&!fs.statSync(h.history).isDirectory())throw Error('Invalid task handoff history.');
 return h;
}

export function handoffEnvironment(env,h){
 validateHandoff(h);
 fs.mkdirSync(h.history,{recursive:true});const instructions=path.join(h.history,'bot-role.md');fs.writeFileSync(instructions,h.roleInstructions||'');
 return {...env,OMP_BOT_PROJECT:h.folder,OMP_BOT_TASK_WORKSPACE:h.folder,OMP_BOT_SESSION_DIR:h.history,OMP_BOT_OPEN_MODE:h.mode,OMP_BOT_LAUNCH_ID:h.launchId,OMP_BOT_TASK_ID:h.taskId,OMP_BOT_ATTEMPT_ID:h.attemptId,OMP_BOT_DISPATCH_TOKEN:h.token,OMP_BOT_HOME:h.homeFolder,OMP_BOT_ROLE_FILE:instructions,OMP_BOT_ROLE_MODEL:h.preferredModel||'auto',OMP_BOT_READ_ONLY:String(!!h.readOnly)};
}

function readHandoff(file){
 try{return validateHandoff(JSON.parse(fs.readFileSync(file,'utf8')));}catch{return null;}
}

function stopOwnedChild(child){
 if(!Number.isInteger(child.pid)||child.pid<=0)throw Error('OMP child has no valid process identity.');
 // Node retains the spawned child's native process handle on Windows. Avoid a
 // separate PID lookup (taskkill), which can race with exit and PID reuse.
 // The producer has already verified idle, with no pending async jobs.
 if(!child.kill('SIGKILL'))throw Error('Could not terminate the OMP child.');
}

// The producer writes only at a verified idle boundary and asks OMP to shut
// down. Give that shutdown time to finish before stopping this runner's child.
export function runOmpSession(omp,args,env,file,{
 spawnProcess=spawn,stopChild=stopOwnedChild,pollMs=250,shutdownGraceMs=1000,stopTimeoutMs=3000,
}={}){
 return new Promise((resolve,reject)=>{
  const child=spawnProcess(omp,args,{cwd:env.OMP_BOT_PROJECT,env,stdio:'inherit',windowsHide:false});
  let handoff=null,settled=false,watcher,grace,deadline;
  const finish=(error,code)=>{
   if(settled)return;settled=true;
   clearInterval(watcher);clearTimeout(grace);clearTimeout(deadline);
   child.removeListener('error',onError);child.removeListener('exit',onExit);
   if(error){child.unref();reject(error);}
   else resolve({code:typeof code==='number'?code:1,handoff:readHandoff(file)});
  };
  const onError=error=>finish(error);
  const onExit=code=>finish(null,code);
  child.once('error',onError);child.once('exit',onExit);
  const watch=()=>setInterval(()=>{
   handoff=readHandoff(file);
   if(!handoff)return;
   clearInterval(watcher);
   grace=setTimeout(()=>{
    if(settled)return;
    const current=readHandoff(file);if(!current||current.attemptId!==handoff.attemptId||current.token!==handoff.token){handoff=null;watcher=watch();return;}
    deadline=setTimeout(()=>finish(Error('OMP child did not exit after the handoff termination deadline.')),stopTimeoutMs);
    // A successful kill request is not proof of exit. Only the exit event
    // permits a replacement session; failed or hung kills leave the file intact.
    Promise.resolve().then(()=>stopChild(child,stopTimeoutMs)).catch(onError);
   },shutdownGraceMs);
  },pollMs);
  watcher=watch();
 });
}

export async function runTerminal({env:initialEnv=process.env,executable,...sessionOptions}={}){
 let env={...initialEnv};
 if(typeof env.OMP_BOT_BINDING_FILE!=='string'||!path.isAbsolute(env.OMP_BOT_BINDING_FILE))throw Error('Missing terminal binding file.');
 const file=env.OMP_BOT_BINDING_FILE+'.next.json';fs.rmSync(file,{force:true});
 const omp=executable||path.join(os.homedir(),'.bun','bin',process.platform==='win32'?'omp.exe':'omp');
 for(;;){
  const args=['--extension',env.OMP_BOT_EXTENSION];
  if(env.OMP_BOT_SESSION_DIR){args.push('--session-dir',env.OMP_BOT_SESSION_DIR);if(env.OMP_BOT_OPEN_MODE==='resume')args.push('--continue');}
  const result=await runOmpSession(omp,args,env,file,sessionOptions);
  if(!result.handoff)return result.code;
  env=handoffEnvironment(env,result.handoff);fs.unlinkSync(file);
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 runTerminal().then(code=>{process.exitCode=code;}).catch(error=>{console.error(error.message);process.exitCode=1;});
}
