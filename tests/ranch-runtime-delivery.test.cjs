const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{createHash}=require('node:crypto');
const token='c'.repeat(64),hash=createHash('sha256').update(token).digest('hex');
async function fixture(){const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-delivery-'));let now=100000;const native={checks:async()=>[],status:async()=> 'live',launch:async()=>({pid:123,started:'638000000000000000',runtimeKeyHash:hash})};const m=new RanchManager({dir,native,now:()=>now}),p=m.saveProfile({nickname:'Pickle',color:0,autoPickup:true});await m.action(p.id,'resume');const source=m.runs[p.id].launchId;m.pickupPaused=false;const task=m.saveTask({title:'Work',instructions:'Inspect',projectFolder:dir,releasedForPickup:true,expectedRevision:0});return {m,p,source,task,dir,native,RanchManager,advance:ms=>now+=ms,clock:()=>now};}
test('lost handoff response replays durable reservation to its source only, including after restart',async()=>{
 const f=await fixture(),{m,p,source}=f;const first=await m.pollWork(p.id,source,token,true);
 assert.ok(first.deliveryId);assert.equal(m.tasks[0].attempts.length,1);
 assert.deepEqual((await m.pollWork(p.id,source,token,true)).handoff,first.handoff);
 assert.equal(await m.pollWork(p.id,source,'d'.repeat(64),true),null);
 assert.equal(await m.pollWork(p.id,'stale-launch',token,true),null);
 const restored=new f.RanchManager({dir:f.dir,native:f.native,now:f.clock});assert.deepEqual((await restored.pollWork(p.id,source,token,true)).handoff,first.handoff);
 assert.equal(restored.tasks[0].attempts.length,1);assert.ok(!JSON.stringify(restored.view()).includes(first.handoff.token));
});
test('receipt and same-client claim retry are idempotent; another client cannot execute the same claim',async()=>{
 const {m,p,source}=await fixture(),r=await m.pollWork(p.id,source,token,true),h=r.handoff;
 assert.equal(m.acknowledgeRuntimeHandoff(p.id,source,token,r.deliveryId,'received').accepted,true);
 assert.equal(m.acknowledgeRuntimeHandoff(p.id,source,token,r.deliveryId,'received').accepted,true);
 assert.equal(m.acknowledgeRuntimeHandoff(p.id,'wrong',token,r.deliveryId,'received'),null);
 const claim=m.claimTaskRuntime(p.id,h.launchId,h.attemptId,h.token,'client-a');assert.ok(claim);
 assert.deepEqual(m.claimTaskRuntime(p.id,h.launchId,h.attemptId,h.token,'client-a'),claim);
 assert.equal(m.claimTaskRuntime(p.id,h.launchId,h.attemptId,h.token,'client-b'),null);
 assert.equal((await m.pollWork(p.id,source,token,true)).handoff,undefined);
 assert.equal(m.tasks[0].attempts[0].delivery.phase,'claimed');
});
test('a rejected runtime client cannot change the owner task with errors, starts, completion or status',async()=>{
 const {m,p,source}=await fixture(),r=await m.pollWork(p.id,source,token,true),h=r.handoff;
 assert.ok(m.claimTaskRuntime(p.id,h.launchId,h.attemptId,h.token,'client-a'));assert.equal(m.recordTaskRuntimeEvent(p.id,h.launchId,h.attemptId,h.token,{type:'agent_start'},'client-a'),true);
 assert.equal(m.claimTaskRuntime(p.id,h.launchId,h.attemptId,h.token,'client-b'),null);
 for(const clientId of [undefined,'client-b']){for(const event of [{type:'agent_error',error:'Claim rejected'},{type:'agent_start'},{type:'agent_end',summary:'Unowned completion'}])assert.equal(m.recordTaskRuntimeEvent(p.id,h.launchId,h.attemptId,h.token,event,clientId),false);
 assert.equal(m.postTaskUpdate(p.id,h.launchId,h.attemptId,h.token,{sequence:1,text:'Unowned status'},clientId),null);}
 assert.equal(m.tasks[0].attempts[0].state,'running');assert.equal(m.tasks[0].status,'doing');assert.equal(m.recordTaskRuntimeEvent(p.id,h.launchId,h.attemptId,h.token,{type:'agent_end',summary:'Owner completed'},'client-a'),true);assert.equal(m.tasks[0].attempts[0].state,'completed');
});
test('expired delivery and claimed-but-not-started become unresolved without reassignment',async()=>{
 for(const claimed of [false,true]){const f=await fixture(),{m,p,source}=f,r=await m.pollWork(p.id,source,token,true),h=r.handoff;
 if(claimed)m.claimTaskRuntime(p.id,h.launchId,h.attemptId,h.token,'client');f.advance(121000);await m.reconcile();
 assert.equal(m.tasks[0].attempts[0].state,'unresolved');assert.match(m.tasks[0].attempts[0].delivery.reason,claimed?/start/i:/delivery|receipt/i);
 assert.equal((await m.pollWork(p.id,source,token,true))?.handoff,undefined);assert.equal(m.claimTaskRuntime(p.id,h.launchId,h.attemptId,h.token,'client'),null);assert.equal(m.tasks[0].attempts.length,1);
 }
});
test('source interruption closes the private delivery and clears its replay credential',async()=>{
 const {m,p,source}=await fixture(),r=await m.pollWork(p.id,source,token,true);m.markTaskInterrupted(m.runs[p.id],'Source terminal closed.');m.persist();
 assert.equal(m.runs[p.id].delivery.handoff,undefined);assert.equal(m.tasks[0].attempts[0].delivery.phase,'unresolved');assert.equal((await m.pollWork(p.id,source,token,true)).handoff,undefined);assert.ok(!fs.readFileSync(m.file,'utf8').includes(r.handoff.token));
});
test('normal session reporting is bot-bound, acknowledged, durable and cannot link an unowned task',async()=>{
 const {m,p,source,dir,native,RanchManager}=await fixture();m.pickupPaused=true;
 assert.equal(m.postSessionUpdate(p.id,source,token,{sequence:1,text:'Checking the project.'}).accepted,true);
 assert.equal(m.postSessionUpdate(p.id,source,token,{sequence:1,text:'Retry'}).reason,'stale');
 assert.equal(m.postSessionUpdate(p.id,'stale',token,{sequence:2,text:'Bad'}),null);
 const other=m.saveProfile({nickname:'Other',color:1});await m.action(other.id,'resume');
 assert.equal(m.postSessionUpdate(other.id,source,token,{sequence:1,text:'Impersonating'}),null);
 assert.equal(m.postSessionUpdate(p.id,source,token,{sequence:2,text:'Unowned',taskId:m.tasks[0].id}),null);
 const diagnostics=new RanchManager({dir,native}).view().profiles.find(x=>x.id===p.id).reporting;
 assert.equal(diagnostics.supported,true);assert.ok(diagnostics.lastAcceptedAt);assert.equal(diagnostics.lastResult,'accepted');
 assert.equal(m.updates.items.find(x=>x.text==='Checking the project.').taskId,null);
});
test('sleeping wake excludes working and disconnected bots, acknowledges idle poll and preserves paused pickup',async()=>{
 const f=await fixture(),{m,p,source}=f;m.pickupPaused=true;m.profiles[0].autoPickup=false;
 const observe=(id,launchId,state)=>m.observe({profileId:id,launchId,terminal:{pid:123,started:'638000000000000000'},state,label:state});
 observe(p.id,source,'ready');f.advance(121000);observe(p.id,source,'ready');
 const working=m.saveProfile({nickname:'Working',color:1});await m.action(working.id,'resume');observe(working.id,m.runs[working.id].launchId,'writing');
 const off=m.saveProfile({nickname:'Off',color:2});const result=m.wakeSleeping();
 assert.equal(result.requested,1);assert.equal(result.acknowledged,0);assert.equal(result.pending,1);assert.equal(result.skipped,2);
 assert.equal(result.results.find(x=>x.id===p.id).status,'pending');
 assert.equal(m.runs[working.id].checkRequested,undefined);assert.equal(m.runs[off.id],undefined);
 const beforeWorking={...m.pulses.get(working.id)};const beforeWake={...m.pulses.get(p.id)};
 const reply=await m.pollWork(p.id,source,token,true);assert.equal(reply.wakeAcknowledged,true);assert.equal(reply.handoff,undefined);assert.equal(m.tasks[0].attempts.length,0);assert.equal(m.pickupPaused,true);assert.equal(m.profiles[0].autoPickup,false);
 assert.equal(m.view().profiles.find(x=>x.id===p.id).wake.status,'acknowledged');
 assert.equal(m.residents().find(x=>x.profileId===p.id).idleSince,f.clock());assert.equal(m.pulses.get(p.id).state,beforeWake.state);assert.equal(m.pulses.get(p.id).label,beforeWake.label);assert.deepEqual(m.pulses.get(working.id),beforeWorking);
 observe(p.id,source,'ready');assert.equal(m.pulses.get(p.id).idleSince,f.clock());assert.equal(m.wakeSleeping().requested,0);
});
test('a wake request waits while activity resumes and never resets that active runtime',async()=>{
 const f=await fixture(),{m,p,source}=f;m.pickupPaused=true;const observe=state=>m.observe({profileId:p.id,launchId:source,terminal:{pid:123,started:'638000000000000000'},state,label:state});
 observe('ready');f.advance(121000);observe('ready');m.wakeSleeping();observe('writing');const activePulse={...m.pulses.get(p.id)};
 const response=await m.pollWork(p.id,source,token,true);assert.equal(response.wakeAcknowledged,undefined);assert.equal(m.runs[p.id].wake.status,'pending');assert.deepEqual(m.pulses.get(p.id),activePulse);
});
test('work checker retries shutdown failures and never publishes a handoff while a draft or async job is active',async()=>{
 const {createWorkChecker}=await import('../sources/omp-bot-companion/work-check.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-stop-')),file=path.join(dir,'next.json');let stops=0,receipts=0,draft='',jobs=[];
 const ctx={isIdle:()=>true,ui:{getEditorText:()=>draft},getAsyncJobSnapshot:()=>({running:jobs}),shutdown:()=>{stops++;if(stops===1)throw Error('temporary');}};
 const check=createWorkChecker({context:()=>ctx,state:()=> 'ready',request:async()=>({deliveryId:'delivery',handoff:{taskId:'reserved'}}),acknowledge:async()=>{receipts++;return {accepted:true};},file});
 draft='keep';await check();assert.equal(fs.existsSync(file),false);draft='';jobs=[{}];await check();assert.equal(stops,0);jobs=[];await check();assert.equal(stops,1);await check();assert.equal(stops,2);assert.equal(receipts,1);
});
test('a handoff that expires while its source becomes busy never shuts down that source',async()=>{
 const {createWorkChecker}=await import('../sources/omp-bot-companion/work-check.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-expired-check-')),file=path.join(dir,'next.json');let now=100,idle=true,stops=0;
 const ctx={isIdle:()=>idle,shutdown:()=>stops++},check=createWorkChecker({context:()=>ctx,state:()=> 'ready',now:()=>now,file,request:async()=>{idle=false;return {handoff:{taskId:'old'},deliveryId:'old',delivery:{expiresAt:200}};},acknowledge:async()=>({accepted:true})});
 await check();now=300;idle=true;await check();assert.equal(stops,0);assert.equal(fs.existsSync(file),false);
});
test('ordinary managed extension registers status tool and gives its prompt hint without injecting a user turn',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-session-tool-')),binding=path.join(dir,'binding.json');fs.writeFileSync(binding,JSON.stringify({pid:123,started:'638000000000000000'}));
 const saved={},values={OMP_BOT_PROFILE_ID:'managed',OMP_BOT_LAUNCH_ID:'launch',OMP_BOT_RUNTIME_TOKEN:token,OMP_BOT_BINDING_FILE:binding,OMP_BOT_TASK_ID:'',OMP_BOT_ATTEMPT_ID:''};for(const [key,value]of Object.entries(values)){saved[key]=process.env[key];process.env[key]=value;}
 try{const {default:extension}=await import('../sources/omp-bot-companion/extension.mjs?ordinary-status');const tools=new Map(),handlers=new Map();extension({on:(type,handler)=>handlers.set(type,handler),registerTool:tool=>tools.set(tool.name,tool),registerCommand:()=>{},sendUserMessage:()=>assert.fail('Ordinary reporting must not inject a user turn')});
 assert.ok(tools.has('ranch_status'));assert.match((await handlers.get('before_agent_start')({},{})).systemPromptAppend,/ranch_status/);
 }finally{for(const [key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
