import {createBridge} from './server.mjs';import {ensureKey,ensureAdminKey,dataDir,keyFile,port} from './config.mjs';
import {focusTerminal} from './focus.mjs';
import {RanchManager} from './manager.mjs';import {createNative} from './native.mjs';
import {acquireCompanionLock} from './companion-lock.mjs';
import {createInstanceId} from './companion-health.mjs';
import {writeLifecycleLog} from './lifecycle-log.mjs';
const instanceId=createInstanceId();
let releaseLock;
try{
 releaseLock=await acquireCompanionLock({directory:dataDir,ownerIdentity:{pid:process.pid,instanceId}});
 process.once('exit',()=>{void releaseLock?.();});
 const manager=new RanchManager({dir:dataDir,native:createNative({dir:dataDir})});
 writeLifecycleLog(dataDir,'startup',{instanceId});
 const server=createBridge({key:ensureKey(),adminKey:ensureAdminKey(),manager,instanceId,focusTerminal:process.platform==='win32'?focusTerminal:null});server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=1000;
 server.on('error',error=>{writeLifecycleLog(dataDir,'startup-error',{code:error.code||'unknown'});console.error(error.code==='EADDRINUSE'?'OMP Bot port is already in use. Close the previous companion or use the one already running.':error.message);void releaseLock();process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log(`Bot Ranch Companion\nListening on 127.0.0.1:${port}\nPairing key: ${keyFile}\nKeep this window open. Ctrl+C stops the companion.`));
 let reconcileTimer;server.on('listening',()=>{void manager.reconcile();reconcileTimer=setInterval(()=>void manager.reconcile().catch(()=>{}),10000);reconcileTimer.unref();});
 server.on('companion-shutdown',()=>{clearInterval(reconcileTimer);writeLifecycleLog(dataDir,'shutdown',{instanceId});server.once('close',()=>{void releaseLock();process.exit(0);});});
}catch(error){writeLifecycleLog(dataDir,'startup-error',{code:error.code||'startup'});void releaseLock?.();throw error;}
