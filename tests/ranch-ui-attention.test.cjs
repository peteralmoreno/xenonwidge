const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('attention requests require authentication and never mutate work',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs'),{createBridge}=await import('../sources/omp-bot-companion/server.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-ui-attention-')),key='a'.repeat(64),admin='b'.repeat(64);
 const manager=new RanchManager({dir,native:{checks:async()=>[]}}),server=createBridge({key,adminKey:admin,manager});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const post=(route,token)=>fetch(base+route,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'});
 try{
  const before=JSON.stringify({profiles:manager.profiles,tasks:manager.tasks,runs:manager.runs});
  assert.equal((await post('/control/ui/attention','wrong')).status,401);assert.equal(manager.uiRequest,undefined);
  assert.equal((await post('/control/ui/attention',key)).status,200);const first=manager.view().uiRequest;assert.equal(first.view,'attention');assert.ok(first.id);
  assert.equal((await post('/admin/ui/attention',admin)).status,200);assert.notEqual(manager.view().uiRequest.id,first.id);
  assert.equal(JSON.stringify({profiles:manager.profiles,tasks:manager.tasks,runs:manager.runs}),before);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
