import {createBridge} from './server.mjs';import {ensureKey,ensureAdminKey,dataDir,keyFile,port} from './config.mjs';
import {focusTerminal} from './focus.mjs';
import {RanchManager} from './manager.mjs';import {createNative} from './native.mjs';
const manager=new RanchManager({dir:dataDir,native:createNative({dir:dataDir})});
const server=createBridge({key:ensureKey(),adminKey:ensureAdminKey(),manager,focusTerminal:process.platform==='win32'?focusTerminal:null});server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=1000;
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'OMP Bot port is already in use. Close the previous companion or use the one already running.':error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Bot Ranch Companion\nListening on 127.0.0.1:${port}\nPairing key: ${keyFile}\nKeep this window open. Ctrl+C stops the companion.`));
server.on('listening',()=>{void manager.reconcile();setInterval(()=>void manager.reconcile().catch(()=>{}),10000).unref();});
