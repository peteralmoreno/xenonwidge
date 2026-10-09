const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('twelve colors keep stable resident slots and previews stay out of saved settings',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-colors-'));
 const m=new RanchManager({dir,native:{}});const a=m.saveProfile({nickname:'Rose',folder:dir,color:4});const b=m.saveProfile({nickname:'Blue',folder:dir,color:8});
 assert.equal(a.slot,0);assert.equal(b.slot,1);m.saveProfile({...a,color:11});assert.equal(m.residents()[0].slot,0);assert.equal(m.residents()[0].color,11);
 assert.throws(()=>m.saveProfile({nickname:'Duplicate',folder:dir,color:11}),/color/i);
 assert.throws(()=>m.saveProfile({nickname:'Invalid',folder:dir,color:12}),/color/i);
 assert.equal(new RanchManager({dir,native:{}}).profiles[0].slot,0);
 m.runs[a.id]={launchId:'test',pid:123,started:'638000000000000000'};
 m.observe({id:'session',profileId:a.id,launchId:'test',terminal:{pid:123,started:'638000000000000000'},state:'ready',label:'Ready',preview:{role:'assistant',text:'Preview stays in memory',at:Date.now()}});
 assert.equal(m.residents()[0].preview.text,'Preview stays in memory');m.persist();assert.ok(!fs.readFileSync(m.file,'utf8').includes('Preview stays in memory'));
});
test('central manager saves four residents, isolates histories, and serializes lifecycle actions',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-manager-'));let clock=1000;const launches=[];let live=false,closeWorks=true;
 const native={checks:async()=>[{name:'Runtime',ok:true}],launch:async(p,run,mode,history)=>{launches.push({id:p.id,mode,history});live=true;return {pid:123,started:'638000000000000000'};},status:async()=>live?'live':'closed',close:async()=>{if(closeWorks)live=false;return closeWorks?'closed':'attention';},focus:async()=> 'focused'};
 const manager=new RanchManager({dir,native,now:()=>clock});const a=manager.saveProfile({nickname:'Brick',folder:dir,color:0});const b=manager.saveProfile({nickname:'Moss',folder:dir,color:1});manager.saveProfile({nickname:'Third',folder:dir,color:2});manager.saveProfile({nickname:'Fourth',folder:dir,color:3});assert.throws(()=>manager.saveProfile({nickname:'Fifth',folder:dir,color:0}),/four|color/i);
 assert.equal(new RanchManager({dir,native}).profiles.length,4);
 await manager.action(a.id,'resume');assert.equal(launches.length,1);assert.equal((await manager.action(a.id,'resume')).result,'focused');assert.equal(launches.length,1);
 const run=manager.runs[a.id];manager.observe({id:'session',profileId:a.id,launchId:run.launchId,terminal:{pid:123,started:'638000000000000000'},state:'writing',label:'Writing',startedAt:1000,finishedAt:null,lastSeen:1000});
 await assert.rejects(()=>manager.action(a.id,'new'),/confirm/i);closeWorks=false;await assert.rejects(()=>manager.action(a.id,'new',true),/close/i);assert.equal(launches.length,1);
 closeWorks=true;await manager.action(a.id,'new',true);assert.equal(launches[1].mode,'new');assert.equal(launches[0].history,launches[1].history);
 await manager.action(b.id,'resume');assert.notEqual(launches[2].history,launches[0].history);
 const pub=manager.residents();assert.equal(pub.length,4);assert.equal(pub[0].project,'Brick');assert.equal(pub[0].terminal,undefined);assert.equal(pub[0].launchId,undefined);
});
test('management routes reject widget credentials and public pages never contain keys',async()=>{
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-auth-'));
 const manager=new RanchManager({dir,native:{checks:async()=>[]}});const key='a'.repeat(64),adminKey='b'.repeat(64),server=createBridge({key,adminKey,manager});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{assert.equal((await fetch(base+'/admin/state')).status,401);assert.equal((await fetch(base+'/admin/key',{headers:{Authorization:'Bearer '+key}})).status,401);const page=await fetch(base+'/setup/');assert.equal(page.status,200);const html=await page.text();assert.ok(!html.includes(key)&&!html.includes(adminKey));const auth={Authorization:'Bearer '+adminKey};assert.equal((await fetch(base+'/admin/state',{headers:auth})).status,200);assert.equal((await(await fetch(base+'/admin/key',{headers:auth})).json()).key,key);assert.equal((await fetch(base+'/state',{headers:auth})).status,401);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('an unresolved launch cannot be duplicated and stale pulses cannot hide startup failure',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-race-'));let clock=1000,launches=0,uncertain=true,live=false;
 const native={checks:async()=>[],status:async()=>live?'live':'closed',launchState:async()=>uncertain?'pending':'exited',launch:async()=>{launches++;if(uncertain){const e=Error('Launch timed out');e.uncertain=true;throw e;}live=true;return {pid:123,started:'638000000000000000'};}};
 const m=new RanchManager({dir,native,now:()=>clock});const p=m.saveProfile({nickname:'Brick',folder:dir,color:0});await assert.rejects(()=>m.action(p.id,'resume'),/timed out/);await assert.rejects(()=>m.action(p.id,'resume'),/unresolved|starting/i);assert.equal(launches,1);uncertain=false;await m.reconcile();await m.action(p.id,'resume');const run=m.runs[p.id];m.observe({id:'old',profileId:p.id,launchId:run.launchId,terminal:{pid:123,started:run.started},state:'writing',label:'Writing',startedAt:1000});live=false;await m.action(p.id,'resume');clock=40000;await m.reconcile();assert.equal(m.view().profiles[0].status,'failed');assert.match(m.view().profiles[0].label,/not connected/);
});
