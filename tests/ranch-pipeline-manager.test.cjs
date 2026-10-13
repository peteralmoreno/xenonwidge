const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const config={startUrl:'http://example.test/jobs',statusUrl:'http://example.test/jobs/{jobId}',body:{},waitMinutes:60,intervalMinutes:5};
async function fixture(humanReview=false){const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipeline-manager-'));let starts=0;const monitor={start:async()=>{starts++;return {jobId:'j1',status:'running',startedAt:100,deadline:3600100,nextCheckAt:300100,sleeping:false};},poll:async(c,s)=>({...s,status:'succeeded',message:'Finished',nextCheckAt:null}),resume:async(c,s)=>({...s,status:'running',sleeping:false})};const m=new RanchManager({dir,native:{},pipelineMonitor:monitor,now:()=>100});const p=m.saveProfile({nickname:'Pipe',color:0,design:'pipeline',role:'pipeline'});const task=m.saveTask({title:'External job',instructions:'Start job',pipeline:config,humanReview,expectedRevision:0});return {m,p,task,monitor,dir,starts:()=>starts};}
test('pipeline starts once without native terminal or model, persists and completes under review policy',async()=>{
 for(const review of [false,true]){const {m,p,task,starts}=await fixture(review);await m.dispatchTask(task.id,p.id,task.revision);assert.equal(starts(),1);assert.equal(m.tasks[0].status,'doing');assert.equal(m.residents()[0].pipeline,true);assert.equal(m.residents()[0].state,'working');await assert.rejects(()=>m.dispatchTask(task.id,p.id,m.tasks[0].revision));assert.equal(starts(),1);await m.pollPipelines();assert.equal(m.tasks[0].status,review?'review':'done');assert.equal(m.tasks[0].attempts[0].state,'completed');}
});
test('sleep and tracking stop hold the attempt and cannot satisfy dependencies or create duplicate starts',async()=>{
 const {m,p,task,monitor,starts}=await fixture();await m.dispatchTask(task.id,p.id,task.revision);monitor.poll=async(c,s)=>({...s,sleeping:true,nextCheckAt:null});await m.pollPipelines();assert.equal(m.tasks[0].status,'doing');assert.equal(m.tasks[0].attempts[0].state,'running');assert.equal(m.residents()[0].state,'ready');
 await m.pipelineAction({id:task.id,expectedRevision:m.tasks[0].revision,action:'resume'});assert.equal(m.tasks[0].pipelineRun.sleeping,false);assert.equal(starts(),1);
 await m.pipelineAction({id:task.id,expectedRevision:m.tasks[0].revision,action:'stop'});assert.equal(m.tasks[0].pipelineRun.stopped,true);assert.equal(m.tasks[0].status,'doing');
 await assert.rejects(()=>m.pipelineAction({id:task.id,expectedRevision:0,action:'resume'}),/changed/);
});
test('ambiguous start survives restart and does not permit automatic retry',async()=>{
 const {m,p,task,monitor,dir}=await fixture();monitor.start=async()=>({status:'unresolved',sleeping:true,jobId:null});await m.dispatchTask(task.id,p.id,task.revision);const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');const restored=new RanchManager({dir,native:{},pipelineMonitor:monitor});assert.equal(restored.tasks[0].status,'blocked');assert.equal(restored.tasks[0].attempts[0].state,'unresolved');await assert.rejects(()=>restored.pipelineAction({id:task.id,expectedRevision:restored.tasks[0].revision,action:'resume'}),/uncertain/);
});
test('pipeline controls require admin authorization, preserve identity and reject stale resume',async()=>{
 const {m,p,task}=await fixture();await m.dispatchTask(task.id,p.id,task.revision);
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs'),server=createBridge({key:'a'.repeat(64),adminKey:'b'.repeat(64),manager:m});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/admin/task/pipeline';
 const send=(key,body)=>fetch(url,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{assert.equal((await send('a'.repeat(64),{id:task.id,expectedRevision:m.tasks[0].revision,action:'stop'})).status,401);
 assert.equal((await send('b'.repeat(64),{id:task.id,expectedRevision:m.tasks[0].revision,action:'stop'})).status,200);
 assert.equal(m.tasks[0].pipelineRun.jobId,'j1');assert.equal(m.tasks[0].pipelineRun.sleeping,true);
 assert.equal((await send('b'.repeat(64),{id:task.id,expectedRevision:0,action:'resume'})).status,409);
 assert.equal((await send('b'.repeat(64),{id:task.id,expectedRevision:m.tasks[0].revision,action:'resume',minutes:60})).status,200);assert.equal(m.tasks[0].pipelineRun.jobId,'j1');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('API-only tasks can be released, partially edited, and started without agent instructions',async()=>{
 const {m,p,task}=await fixture();
 const released=m.saveTask({...task,expectedRevision:task.revision,instructions:'',releasedForPickup:true,pipeline:{intervalMinutes:10}});
 assert.equal(released.pipeline.startUrl,config.startUrl);assert.equal(released.pipeline.intervalMinutes,10);
 await m.dispatchTask(task.id,p.id,released.revision);assert.equal(m.tasks[0].status,'doing');
});

test('extending an awake monitor emits an explicit public post',async()=>{
 const {m,p,task}=await fixture();await m.dispatchTask(task.id,p.id,task.revision);
 await m.pipelineAction({id:task.id,expectedRevision:m.tasks[0].revision,action:'resume',minutes:20});
 assert.ok(m.updates.items.some(post=>/20 minutes/.test(post.text)));
});

test('wake does not mutate a locked external job or bypass its Retry-After',async()=>{
 const {m,p,task,monitor}=await fixture();await m.dispatchTask(task.id,p.id,task.revision);
 const live=m.tasks[0],due=live.pipelineRun.nextCheckAt;m.taskLocks.add(task.id);
 assert.equal(m.requestWorkCheck(p.id).status,'pending');await new Promise(r=>setImmediate(r));
 assert.equal(live.pipelineRun.nextCheckAt,due);m.taskLocks.delete(task.id);
 live.pipelineRun.retryNotBefore=20000;let polls=0;monitor.poll=async(c,s)=>{polls++;return s;};
 assert.equal(m.requestWorkCheck(p.id).status,'pending');await new Promise(r=>setImmediate(r));assert.equal(polls,0);
});

test('pending retirement waits for an external job, including idle terminal heartbeats',async()=>{
 const {m,p,task}=await fixture();await m.dispatchTask(task.id,p.id,task.revision);
 assert.equal(m.setMembership(p.id,false,p.revision).pending,true);
 m.runs[p.id]={launchId:'idle-terminal',pid:1,started:'test',status:'connected'};
 m.observe({profileId:p.id,launchId:'idle-terminal',terminal:{pid:1,started:'test'},state:'ready'});
 assert.equal(m.profiles[0].active,true);
 m.runs[p.id].status='closed';await m.pollPipelines();assert.equal(m.profiles[0].active,false);
});

test('missing credentials block before creating an uncertain submission',async()=>{
 const {m,p,task}=await fixture();const {PipelineMonitor}=await import('../sources/omp-bot-companion/pipeline.mjs');
 let requests=0;m.pipelineMonitor=new PipelineMonitor({env:{},fetch:async()=>{requests++;throw Error('No request expected');}});
 m.tasks[0].pipeline={...config,startUrl:'https://example.test/jobs',statusUrl:'https://example.test/jobs/{jobId}',credentialEnv:'MISSING_PIPELINE_CREDENTIAL'};
 await assert.rejects(()=>m.dispatchTask(task.id,p.id,task.revision),/credential/i);
 assert.equal(requests,0);assert.equal(m.tasks[0].attempts.length,0);assert.equal(m.tasks[0].status,'todo');
});

test('linking a verified existing job reconciles the original attempt without another submission',async()=>{
 const {m,p,task,monitor}=await fixture();let posts=0,gets=0;
 monitor.start=async(c,key)=>{posts++;return {status:'unresolved',sleeping:true,jobId:null,idempotencyKey:key,startedAt:100};};
 monitor.resume=async(c,state)=>{gets++;assert.equal(state.jobId,'located-job');return {...state,status:'running',sleeping:false};};
 await m.dispatchTask(task.id,p.id,task.revision);const original=m.tasks[0].attempts[0].id;
 await assert.rejects(()=>m.pipelineAction({id:task.id,expectedRevision:m.tasks[0].revision,action:'reconcile',jobId:'located-job'}),/confirm/i);
 await m.pipelineAction({id:task.id,expectedRevision:m.tasks[0].revision,action:'reconcile',jobId:'located-job',confirmed:true});
 assert.equal(posts,1);assert.equal(gets,1);assert.equal(m.tasks[0].attempts.length,1);assert.equal(m.tasks[0].attempts[0].id,original);assert.equal(m.tasks[0].status,'doing');
 assert.equal(m.tasks[0].pipelineRun.idempotencyKey,original);assert.ok(m.tasks[0].evidence.some(e=>e.kind==='external-job-linked'));
 await assert.rejects(()=>m.pipelineAction({id:task.id,expectedRevision:m.tasks[0].revision,action:'reconcile',jobId:'another',confirmed:true}),/unresolved/i);
});

test('confirmed failure can prepare a held new attempt while preserving prior job history',async()=>{
 const {m,p,task,monitor}=await fixture();monitor.start=async()=>({jobId:'failed-job',status:'failed',message:'Job failed',sleeping:false});
 await m.dispatchTask(task.id,p.id,task.revision);const retried=await m.prepareTaskRetry(task.id,m.tasks[0].revision);
 assert.equal(retried.status,'todo');assert.equal(retried.releasedForPickup,false);assert.equal(retried.pipelineRun,undefined);assert.equal(retried.attempts[0].pipelineRun.jobId,'failed-job');
});
