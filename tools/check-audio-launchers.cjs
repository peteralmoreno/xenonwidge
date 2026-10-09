const {spawn,spawnSync}=require('node:child_process');
const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');
const folder=path.resolve(__dirname,'../artifacts/audio-deck/companion-0.1.0');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function probe(){try{return (await fetch('http://127.0.0.1:43821/state',{signal:AbortSignal.timeout(300)})).status;}catch{return null;}}
(async()=>{
 for(const [name,exe,args] of [
  ['Windows launcher',process.env.ComSpec,['/d','/c',path.join(folder,'Launch.cmd')]],
  ['Bash launcher','C:/Program Files/Git/bin/bash.exe',[path.join(folder,'launch.sh')]]
 ]){
  assert.equal(await probe(),null,'Stop the existing companion before launcher checks');
  const child=spawn(exe,args,{cwd:os.tmpdir(),windowsHide:true,stdio:'ignore'});
  try{let status=null;for(let i=0;i<40;i++){status=await probe();if(status)break;await delay(100);}assert.equal(status,401,name+' must start the authenticated companion from another working directory');console.log(name+' passed');}
  finally{spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});await delay(500);}
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
