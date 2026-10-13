const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('ownership lock rejects live and ambiguous owners and reclaims verified-dead owners',async()=>{
 const {acquireCompanionLock}=await import('../sources/omp-bot-companion/companion-lock.mjs');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-lock-')),ownerIdentity={pid:42,instanceId:'first'};const release=await acquireCompanionLock({directory,ownerIdentity,isOwnerAlive:async o=>o.instanceId==='first'});
 await assert.rejects(acquireCompanionLock({directory,ownerIdentity:{pid:43,instanceId:'second'},isOwnerAlive:async()=>true}),e=>e.code==='COMPANION_LOCKED');await release();
 fs.writeFileSync(path.join(directory,'companion.lock'),JSON.stringify({pid:42,instanceId:'dead'}));const stale=await acquireCompanionLock({directory,ownerIdentity:{pid:43,instanceId:'new'},isOwnerAlive:async()=>false});await stale();
 fs.writeFileSync(path.join(directory,'companion.lock'),JSON.stringify({pid:42,instanceId:'unknown'}));await assert.rejects(acquireCompanionLock({directory,ownerIdentity:{pid:44,instanceId:'later'},isOwnerAlive:async()=>null}),e=>e.code==='COMPANION_LOCK_AMBIGUOUS');
});
test('an old release cannot unlink a replacement lock',async()=>{
 const {acquireCompanionLock}=await import('../sources/omp-bot-companion/companion-lock.mjs');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-lock-replace-')),lock=path.join(directory,'companion.lock');fs.writeFileSync(lock,JSON.stringify({pid:8,instanceId:'old'}));
 const old=await acquireCompanionLock({directory,ownerIdentity:{pid:9,instanceId:'new'},isOwnerAlive:async()=>false});fs.writeFileSync(lock,JSON.stringify({pid:10,instanceId:'replacement'}));await old();assert.equal(JSON.parse(fs.readFileSync(lock,'utf8')).instanceId,'replacement');
});
test('a live PID without verifiable instance identity is treated as ambiguous',async()=>{const {acquireCompanionLock}=await import('../sources/omp-bot-companion/companion-lock.mjs');const directory=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-lock-pid-reuse-'));fs.writeFileSync(path.join(directory,'companion.lock'),JSON.stringify({pid:process.pid,instanceId:'unverified'}));await assert.rejects(acquireCompanionLock({directory,ownerIdentity:{pid:process.pid+1,instanceId:'new'}}),error=>error.code==='COMPANION_LOCK_AMBIGUOUS');});
