import fs from 'node:fs';
import path from 'node:path';
const limit=64*1024;
const events=new Set(['startup','shutdown','startup-error','recovery-request','recovery-result']);
export function writeLifecycleLog(directory,event,fields={}){
 if(!events.has(event))return false;
 const record={at:new Date().toISOString(),event};
 for(const key of ['status','code','version','instanceId'])if(typeof fields[key]==='string'&&fields[key].length<=120&&/^[\w.:-]+$/.test(fields[key]))record[key]=fields[key];
 const file=path.join(directory,'companion-lifecycle.log'),line=JSON.stringify(record)+'\n';
 fs.mkdirSync(directory,{recursive:true});let size=0;try{size=fs.statSync(file).size;}catch{}
 if(size+Buffer.byteLength(line)>limit){try{fs.rmSync(file+'.1',{force:true});}catch{}try{fs.renameSync(file,file+'.1');}catch{}}
 fs.appendFileSync(file,line,{mode:0o600});try{fs.chmodSync(file,0o600);}catch{}return true;
}
