const {spawn,spawnSync}=require('node:child_process');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');
const folder=path.resolve(__dirname,'../artifacts/omp-bot/companion-0.1.0'),delay=ms=>new Promise(r=>setTimeout(r,ms));
async function probe(){try{return(await fetch('http://127.0.0.1:43822/state',{signal:AbortSignal.timeout(250)})).status;}catch{return null;}}
(async()=>{
 for(const [exe,args]of [[process.env.ComSpec,['/d','/c',path.join(folder,'Launch-Companion.cmd')]],['C:/Program Files/Git/bin/bash.exe',[path.join(folder,'launch-companion.sh')]]]){
  assert.equal(await probe(),null,'Stop OMP Bot Companion before launcher check');const child=spawn(exe,args,{cwd:os.tmpdir(),windowsHide:true,stdio:'ignore'});
  try{let status;for(let i=0;i<30;i++){status=await probe();if(status)break;await delay(100);}assert.equal(status,401);}finally{spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});await delay(300);}
 }
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'omp-launchers-')),project=path.join(temp,'project with spaces'),capture=path.join(temp,'capture.txt');fs.mkdirSync(project);
 // Controlled stand-in verifies launcher arguments/cwd; actual OMP loading has a separate smoke check.
 fs.writeFileSync(path.join(temp,'omp.cmd'),'@echo off\r\n> "%OMP_LAUNCH_CAPTURE%" echo %CD%\r\n>> "%OMP_LAUNCH_CAPTURE%" echo %*\r\n');
 const child=spawnSync(process.env.ComSpec,['/d','/c',path.join(folder,'Start-OMP.cmd'),project],{env:{...process.env,PATH:temp+';'+process.env.PATH,OMP_LAUNCH_CAPTURE:capture},cwd:os.tmpdir(),windowsHide:true,encoding:'utf8',timeout:5000});
 assert.equal(child.status,0,child.stderr);const contents=fs.readFileSync(capture,'utf8');assert.ok(contents.includes(project));assert.ok(contents.includes('--extension'));assert.ok(contents.includes(path.join(folder,'extension.mjs')));
 console.log('OMP companion CMD/Bash launchers passed; Start-OMP.cmd preserves project paths with spaces and forwards the extension path.');
})().catch(error=>{console.error(error);process.exitCode=1;});
