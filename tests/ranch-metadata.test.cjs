const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('metadata reads the OMP ExtensionContext contract without transcript or provider calls',async()=>{
 const {contextMetadata,sanitizeMetadata}=await import('../sources/omp-bot-companion/metadata.mjs');
 const ctx={cwd:'D:/project',model:{id:'model-one',provider:'provider-one',contextWindow:200000},getContextUsage:()=>({tokens:80000,contextWindow:200000,percent:40}),sessionManager:{getBranch:()=>{throw Error('must not read history')}}};
 assert.deepEqual(contextMetadata(ctx),{folder:'D:/project',model:'model-one',provider:'provider-one',context:{used:80000,capacity:200000,percent:40}});
 ctx.getContextUsage=()=>undefined;assert.deepEqual(contextMetadata(ctx).context,{used:null,capacity:200000,percent:null});
 ctx.getContextUsage=()=>{throw Error('unavailable')};assert.equal(contextMetadata(ctx).context.used,null);
 assert.deepEqual(contextMetadata({cwd:'x'}),{folder:'x'});
 assert.deepEqual(sanitizeMetadata({folder:'abc\u0000\n def',context:{used:40,capacity:100,percent:1},secret:'SECRET'}),{folder:'abc def',context:{used:40,capacity:100,percent:40}});
 for(const value of [null,[],{folder:12},{context:{used:-1,capacity:100}},{context:{used:1,capacity:0}},{context:{used:Infinity,capacity:100}}])assert.equal(sanitizeMetadata(value),undefined);
 assert.equal(sanitizeMetadata({folder:'a'.repeat(1023)+'😀'}).folder,'a'.repeat(1023));
});
test('bridge projects metadata, supports old snapshots, handles Unicode byte bounds and clears stale usage',async()=>{
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');let now=1000;const server=createBridge({key:'test',now:()=>now});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port,headers={Authorization:'Bearer test','Content-Type':'application/json'};let sequence=0;
 const put=extra=>fetch(base+'/snapshot',{method:'PUT',headers,body:JSON.stringify({version:1,id:'one',sequence:++sequence,project:'test',state:'ready',label:'Ready',startedAt:null,finishedAt:null,activeCount:0,...extra})});
 const read=async()=> (await(await fetch(base+'/state',{headers})).json()).sessions[0];
 try{
  assert.equal((await put({})).status,200);assert.equal((await read()).metadata,undefined);
  assert.equal((await put({metadata:{folder:'界'.repeat(1024),model:'m',provider:'p',context:{used:40,capacity:100,percent:99},secret:'SECRET'},preview:{role:'assistant',text:'界'.repeat(400),at:1}})).status,200);
  assert.equal((await read()).metadata.context.percent,40);assert.equal((await read()).metadata.secret,undefined);
  assert.equal((await put({metadata:{context:{used:1,capacity:-1}}})).status,400);
  assert.equal((await put({ignored:'界'.repeat(3000)})).status,413);
  now+=13000;assert.equal((await read()).metadata,undefined);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('heartbeats read live model getters and compaction usage instead of caching totals',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-meta-')),oldKey=process.env.OMP_BOT_KEY_FILE,oldFetch=global.fetch;
 process.env.OMP_BOT_KEY_FILE=path.join(temp,'key');fs.writeFileSync(process.env.OMP_BOT_KEY_FILE,'a'.repeat(64));
 const snapshots=[],handlers={};let heartbeat,model={id:'one',provider:'p',contextWindow:100},used=40;
 const ctx={cwd:temp,agent:{kind:'main'},get model(){return model},getContextUsage:()=>({tokens:used,contextWindow:model.contextWindow,percent:used}),setInterval:fn=>{heartbeat=fn;return 1},clearTimer:()=>{}};
 global.fetch=async(url,opts)=>{snapshots.push(JSON.parse(opts.body));return {body:{cancel:async()=>{}}}};const settle=()=>new Promise(r=>setImmediate(r));
 try{const {default:extension}=await import('../sources/omp-bot-companion/extension.mjs');extension({on:(name,fn)=>{handlers[name]=fn}});
  handlers.session_start({},ctx);await settle();assert.equal(snapshots.at(-1).metadata.context.percent,40);
  model={id:'two',provider:'q',contextWindow:200};used=20;heartbeat();await settle();assert.equal(snapshots.at(-1).metadata.model,'two');assert.equal(snapshots.at(-1).metadata.context.percent,10);
  used=5;handlers.auto_compaction_end({},ctx);await settle();assert.equal(snapshots.at(-1).metadata.context.used,5);
  handlers.session_shutdown({},ctx);await settle();
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.OMP_BOT_KEY_FILE;else process.env.OMP_BOT_KEY_FILE=oldKey;fs.rmSync(temp,{recursive:true,force:true});}
});
test('managed folder falls back to the profile, live metadata stays in memory and old pulses clear usage',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-meta-manager-'));let now=1000;
 try{
  const manager=new RanchManager({dir,native:{},now:()=>now}),profile=manager.saveProfile({nickname:'Bot',folder:dir,color:0});
  manager.runs[profile.id]={launchId:'launch',pid:123,started:'638000000000000000'};
  const snapshot={id:'session',profileId:profile.id,launchId:'launch',terminal:{pid:123,started:'638000000000000000'},state:'ready',label:'Ready',metadata:{folder:'D:/actual-active-folder',model:'memory-only-model',context:{used:40,capacity:100}}};
  assert.equal(manager.residents()[0].metadata.folder,fs.realpathSync(dir));
  assert.equal(manager.observe(snapshot),true);assert.equal(manager.residents()[0].metadata.folder,'D:/actual-active-folder');
  manager.persist();const saved=fs.readFileSync(manager.file,'utf8');assert.ok(!saved.includes('actual-active-folder'));assert.ok(!saved.includes('memory-only-model'));assert.ok(!saved.includes('capacity'));
  now+=13000;assert.deepEqual(manager.residents()[0].metadata,{folder:fs.realpathSync(dir)});
  delete snapshot.metadata;manager.observe(snapshot);assert.deepEqual(manager.residents()[0].metadata,{folder:fs.realpathSync(dir)});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
