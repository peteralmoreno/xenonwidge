// Keep only visible user/assistant text. Never retain thinking or tool payloads.
export function sanitizePreview(value,now=Date.now()){
 if(!value||!['user','assistant'].includes(value.role)||typeof value.text!=='string'||!Number.isFinite(value.at)||value.at<0||value.at>now+60000)return undefined;
 let text=value.text.replace(/[\u0000-\u001f\u007f-\u009f]/g,' ').replace(/\s+/g,' ').trim().slice(0,400);
 // A UTF-16 limit also bounds JSON bytes, without splitting an emoji pair.
 if(/[\uD800-\uDBFF]$/.test(text))text=text.slice(0,-1);
 text=text.toWellFormed().trim();
 return text?{role:value.role,text,at:value.at}:undefined;
}
export function messagePreview(message,now=Date.now()){
 if(!message||!['user','assistant'].includes(message.role))return undefined;
 const text=typeof message.content==='string'?message.content:Array.isArray(message.content)?message.content.filter(part=>part?.type==='text'&&typeof part.text==='string').map(part=>part.text).join(' '):'';
 return sanitizePreview({role:message.role,text,at:Number.isFinite(message.timestamp)?message.timestamp:now},now);
}
export function branchPreview(entries,now=Date.now()){
 if(!Array.isArray(entries))return undefined;
 for(let i=entries.length-1;i>=0;i--){if(entries[i]?.type!=='message')continue;const preview=messagePreview(entries[i].message,now);if(preview)return preview;}
 return undefined;
}
