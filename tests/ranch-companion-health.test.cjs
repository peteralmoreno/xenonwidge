const {test}=require('node:test'),assert=require('node:assert/strict'),{createServer}=require('node:http');

async function listener(handler){const server=createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>{server.closeAllConnections();server.close(r);})};}
test('health endpoint is authenticated and returns operational metadata without task details',async()=>{
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');const instanceId='health-instance';const manager={library:{root:'C:/safe/bot-home'},locks:new Set(),taskLocks:new Set(),reconciling:false,view:()=>({profiles:[]}),tasks:[]};const server=createBridge({key:'a'.repeat(64),adminKey:'b'.repeat(64),manager,instanceId});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));try{const origin='http://127.0.0.1:'+server.address().port;assert.equal((await fetch(origin+'/admin/health')).status,401);const response=await fetch(origin+'/admin/health',{headers:{Authorization:'Bearer '+'b'.repeat(64)}}),body=await response.json();assert.equal(body.instanceId,instanceId);assert.equal(body.connectionVersion,1);assert.equal(body.appVersion,require('../sources/omp-bot/manifest.json').version);assert.equal(body.homeFolder,'C:/safe/bot-home');assert.equal(body.busy,false);assert.equal(JSON.stringify(body).includes('tasks'),false);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('health classifies offline, unresponsive, port conflict, unknown service and version states',async()=>{
 const {probeCompanion}=await import('../sources/omp-bot-companion/companion-health.mjs');
 let down=await listener((_q,r)=>r.end(''));await down.close();const offline=await probeCompanion({origin:down.origin,token:'x',version:'1.0.0'});assert.equal(offline.status,'offline');
 const hung=await probeCompanion({origin:'http://localhost',token:'x',version:'1.0.0',fetchImpl:(_u,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(Error('timeout'),{name:'TimeoutError'}))))});assert.equal(hung.status,'unresponsive');
 let s=await listener((_q,r)=>{r.writeHead(401).end('no');});try{assert.equal((await probeCompanion({origin:s.origin,token:'x',version:'1.0.0'})).status,'port-conflict');}finally{await s.close();}
 s=await listener((_q,r)=>r.end(JSON.stringify({other:'service'})));try{assert.equal((await probeCompanion({origin:s.origin,token:'x',version:'1.0.0'})).status,'unknown-service');}finally{await s.close();}
 s=await listener((_q,r)=>r.end(JSON.stringify({connectionVersion:1,appVersion:'2.0.0',pid:3,instanceId:'i',homeFolder:'safe',busy:true})));try{assert.equal((await probeCompanion({origin:s.origin,token:'x',version:'1.0.0'})).status,'busy-upgrade');}finally{await s.close();}
 s=await listener((_q,r)=>r.end(JSON.stringify({connectionVersion:1,appVersion:'2.0.0',pid:3,instanceId:'i',homeFolder:'safe',busy:false})));try{assert.equal((await probeCompanion({origin:s.origin,token:'x',version:'1.0.0'})).status,'version-mismatch');}finally{await s.close();}
});
test('lifecycle logs retain bounded allowlisted summaries and omit arbitrary text',async()=>{const {writeLifecycleLog}=await import('../sources/omp-bot-companion/lifecycle-log.mjs'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-lifecycle-'));writeLifecycleLog(dir,'startup',{instanceId:'safe-id',secret:'never-write-this',status:'connected'});let text=fs.readFileSync(path.join(dir,'companion-lifecycle.log'),'utf8');assert.match(text,/safe-id/);assert.doesNotMatch(text,/never-write-this/);for(let i=0;i<1200;i++)writeLifecycleLog(dir,'shutdown',{code:'clean'});assert.ok(fs.statSync(path.join(dir,'companion-lifecycle.log')).size<64*1024);assert.ok(fs.statSync(path.join(dir,'companion-lifecycle.log.1')).size<64*1024);});







