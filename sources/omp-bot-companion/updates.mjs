import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export function statusText(value){
 if(typeof value!=='string')throw Error('Status must be plain text.');
 const text=value.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g,' ').trim().toWellFormed();
 if(!text||text.length>240||text.split('\n').length>2)throw Error('Use 1–240 characters and at most two lines.');
 return text;
}
export class UpdateFeed{
 constructor(home,now=Date.now){this.file=path.join(home,'ranch-updates.json');this.now=now;this.items=[];if(fs.existsSync(this.file)){try{const saved=JSON.parse(fs.readFileSync(this.file,'utf8'));if(Array.isArray(saved))this.items=saved.filter(x=>x&&typeof x.id==='string'&&typeof x.profileId==='string'&&Number.isFinite(x.at)&&typeof x.text==='string').slice(-200);}catch{/* A damaged display log does not block task execution. */}}}
 post({profileId,taskId=null,text,kind='progress',eventId=null,source=null}){
  text=statusText(text);const at=this.now(),last=[...this.items].reverse().find(x=>x.profileId===profileId);
  if(eventId&&this.items.some(x=>x.profileId===profileId&&x.eventId===eventId))return {accepted:false,reason:'duplicate'};
  if(last&&last.text===text&&last.taskId===taskId)return {accepted:false,reason:'duplicate'};
  if(kind==='progress'&&last?.kind==='progress'&&at-last.at<15000)return {accepted:false,reason:'rate-limited'};
  const item={id:randomUUID(),profileId,taskId,text,kind,at,...(source==='activity'?{source}:{}),...(eventId?{eventId}:{})};const next=[...this.items,item].slice(-200);
  fs.writeFileSync(this.file+'.tmp',JSON.stringify(next));fs.renameSync(this.file+'.tmp',this.file);this.items=next;return {accepted:true,item};
 }
}
