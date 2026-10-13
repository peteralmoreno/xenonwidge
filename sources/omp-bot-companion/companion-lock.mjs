import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export class CompanionLockError extends Error{constructor(code,message){super(message);this.name='CompanionLockError';this.code=code;}}
export async function defaultOwnerAlive(owner){
 if(!Number.isSafeInteger(owner?.pid)||owner.pid<1)return null;
 try{process.kill(owner.pid,0);return null;}catch(error){if(error.code==='ESRCH')return false;return null;}
}
export async function acquireCompanionLock({directory,ownerIdentity,isOwnerAlive=defaultOwnerAlive}){
 fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,'companion.lock'),owner={pid:ownerIdentity?.pid??process.pid,instanceId:ownerIdentity?.instanceId||randomUUID(),createdAt:Date.now()};
 const create=()=>{const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(owner));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};
 try{create();}catch(error){if(error.code!=='EEXIST')throw error;
  let previous;try{previous=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw new CompanionLockError('COMPANION_LOCK_AMBIGUOUS','Companion ownership is unclear. Inspect the private companion lock before starting another copy.');}
  const alive=await isOwnerAlive(previous);
  if(alive===true)throw new CompanionLockError('COMPANION_LOCKED','Another Bot Ranch companion owns this data folder.');
  if(alive!==false)throw new CompanionLockError('COMPANION_LOCK_AMBIGUOUS','The recorded companion owner cannot be verified as stopped. Leave its data untouched and inspect the companion process.');
  const stale=path.join(directory,`companion.stale-${randomUUID()}.lock`);
  try{fs.renameSync(file,stale);}catch(e){if(e.code==='ENOENT'||e.code==='EEXIST')throw new CompanionLockError('COMPANION_LOCKED','Companion ownership changed while recovery was attempted.');throw e;}
  try{const moved=JSON.parse(fs.readFileSync(stale,'utf8'));if(moved.instanceId!==previous.instanceId||moved.pid!==previous.pid){try{fs.renameSync(stale,file);}catch{}throw new CompanionLockError('COMPANION_LOCKED','Companion ownership changed while recovery was attempted.');}create();}
  catch(e){if(e.code==='EEXIST')throw new CompanionLockError('COMPANION_LOCKED','Another Bot Ranch companion acquired this data folder.');throw e;}
  finally{try{fs.unlinkSync(stale);}catch{}}
 }
 let released=false;
 return async()=>{if(released)return;released=true;try{const current=JSON.parse(fs.readFileSync(file,'utf8'));if(current.instanceId===owner.instanceId&&current.pid===owner.pid)fs.unlinkSync(file);}catch(error){if(error.code!=='ENOENT')throw error;}};
}
