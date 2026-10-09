// ExtensionContext.model and getContextUsage() are read-only OMP APIs. Context
// tokens are OMP's current estimate, not cumulative billing or transcript text.
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const nonnegative=value=>Number.isSafeInteger(value)&&value>=0;
function clean(value,limit){
 let text=value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim().slice(0,limit);
 if(/[\uD800-\uDBFF]$/.test(text))text=text.slice(0,-1);
 return text.toWellFormed().trim();
}
export function sanitizeMetadata(value){
 if(!record(value))return undefined;
 const result={};
 for(const [field,limit]of [['folder',1024],['model',160],['provider',80]]){
  if(value[field]===undefined)continue;
  if(typeof value[field]!=='string')return undefined;
  const text=clean(value[field],limit);if(text)result[field]=text;
 }
 if(value.context!==undefined){
  const c=value.context;
  if(!record(c)||!nonnegative(c.capacity)||c.capacity===0||(c.used!==null&&!nonnegative(c.used)))return undefined;
  // Derive percentage ourselves; never trust a caller-supplied warning level.
  result.context={used:c.used,capacity:c.capacity,percent:c.used===null?null:c.used/c.capacity*100};
 }
 return Object.keys(result).length?result:undefined;
}
export function contextMetadata(ctx){
 const result={};let model,usage;
 try{if(typeof ctx?.cwd==='string')result.folder=ctx.cwd;}catch{}
 try{model=ctx?.model;if(typeof model?.id==='string')result.model=model.id;if(typeof model?.provider==='string')result.provider=model.provider;}catch{}
 try{usage=ctx?.getContextUsage?.();}catch{}
 const capacity=nonnegative(usage?.contextWindow)&&usage.contextWindow>0?usage.contextWindow:model?.contextWindow;
 if(nonnegative(capacity)&&capacity>0)result.context={capacity,used:nonnegative(usage?.tokens)?usage.tokens:null};
 return sanitizeMetadata(result);
}
