import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
export function handoffEnvironment(env,h){
 if(!h||!path.isAbsolute(h.folder||'')||!path.isAbsolute(h.history||'')||!['resume','task'].includes(h.mode)||!/^[a-f0-9]{64}$/.test(h.token||''))throw Error('Invalid task handoff.');
 fs.mkdirSync(h.history,{recursive:true});const instructions=path.join(h.history,'bot-role.md');fs.writeFileSync(instructions,h.roleInstructions||'');
 return {...env,OMP_BOT_PROJECT:h.folder,OMP_BOT_TASK_WORKSPACE:h.folder,OMP_BOT_SESSION_DIR:h.history,OMP_BOT_OPEN_MODE:h.mode,OMP_BOT_LAUNCH_ID:h.launchId,OMP_BOT_TASK_ID:h.taskId,OMP_BOT_ATTEMPT_ID:h.attemptId,OMP_BOT_DISPATCH_TOKEN:h.token,OMP_BOT_HOME:h.homeFolder,OMP_BOT_ROLE_FILE:instructions,OMP_BOT_ROLE_MODEL:h.preferredModel||'auto',OMP_BOT_READ_ONLY:String(!!h.readOnly)};
}
export function runTerminal(){
 let env={...process.env};const file=env.OMP_BOT_BINDING_FILE+'.next.json';fs.rmSync(file,{force:true});
 const omp=path.join(os.homedir(),'.bun','bin',process.platform==='win32'?'omp.exe':'omp');
 for(;;){
  const args=['--extension',env.OMP_BOT_EXTENSION];if(env.OMP_BOT_SESSION_DIR){args.push('--session-dir',env.OMP_BOT_SESSION_DIR);if(env.OMP_BOT_OPEN_MODE==='resume')args.push('--continue');}
  const result=spawnSync(omp,args,{cwd:env.OMP_BOT_PROJECT,env,stdio:'inherit',windowsHide:false});
  if(!fs.existsSync(file)){if(result.error)throw result.error;return result.status??1;}
  const next=JSON.parse(fs.readFileSync(file,'utf8'));fs.unlinkSync(file);env=handoffEnvironment(env,next);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)process.exitCode=runTerminal();
