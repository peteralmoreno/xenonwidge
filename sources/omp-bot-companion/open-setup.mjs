import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';import {ensureAdminKey,port} from './config.mjs';
const token=ensureAdminKey(),url=`http://127.0.0.1:${port}`;
async function state(){try{const r=await fetch(url+'/admin/state',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(1000)});if(!r.ok)throw Error('Another or older companion is using the port. Close it and reopen Bot Ranch.');await r.json();return true;}catch(e){if(e.message.startsWith('Another'))throw e;return false;}}
try{if(!await state()){const child=spawn(process.execPath,[fileURLToPath(new URL('./bridge.mjs',import.meta.url))],{detached:true,windowsHide:true,stdio:'ignore'});child.unref();let ready=false;for(let n=0;n<80;n++){await new Promise(r=>setTimeout(r,125));if(await state()){ready=true;break;}}if(!ready)throw Error('The companion could not start. Run Launch-Companion.cmd to see its error.');}
 const target=url+'/setup/#admin='+token;
 if(process.platform==='win32'){const browser=spawn('rundll32.exe',['url.dll,FileProtocolHandler',target],{windowsHide:true,stdio:'ignore'});browser.on('error',()=>{console.error('Could not open your browser.');process.exitCode=1;});}else throw Error('This release launches managed terminals on Windows.');
}catch(e){console.error(e.message);process.exitCode=1;}
