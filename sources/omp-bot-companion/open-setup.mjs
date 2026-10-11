import {spawn} from 'node:child_process';import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {ensureAdminKey,port} from './config.mjs';import {ensureCompanion} from './companion-start.mjs';
const token=ensureAdminKey(),origin=`http://127.0.0.1:${port}`;
try{
 const installed=new URL('./ui/manifest.json',import.meta.url),manifest=fs.existsSync(installed)?installed:new URL('../omp-bot/manifest.json',import.meta.url),{version}=JSON.parse(fs.readFileSync(manifest,'utf8'));
 await ensureCompanion({origin,token,version,start:()=>{const child=spawn(process.execPath,[fileURLToPath(new URL('./bridge.mjs',import.meta.url))],{detached:true,windowsHide:true,stdio:'ignore'});child.on('error',()=>{});child.unref();}});
 if(process.platform!=='win32')throw Error('Managed botRanch terminals require Windows.');
 const browser=spawn('rundll32.exe',['url.dll,FileProtocolHandler',origin+'/board/#admin='+token],{windowsHide:true,stdio:'ignore'});browser.on('error',()=>{console.error('Could not open your browser.');process.exitCode=1;});
}catch(e){console.error(e.message);process.exitCode=1;}
