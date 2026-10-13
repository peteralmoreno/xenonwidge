const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'ranch-updates-'));
test('short updates are bounded, deduplicated, throttled and durable',async()=>{
 const {UpdateFeed}=await import('../sources/omp-bot-companion/updates.mjs');let now=1000;const home=temporary(),feed=new UpdateFeed(home,()=>now);
 assert.equal(feed.post({profileId:'bot',text:'Checking the task.',eventId:'one'}).accepted,true);
 assert.equal(feed.post({profileId:'bot',text:'Different text',eventId:'one'}).reason,'duplicate');
 assert.equal(feed.post({profileId:'bot',text:'Checking again.'}).reason,'rate-limited');
 now+=15000;assert.equal(feed.post({profileId:'bot',text:'Found the cause.'}).accepted,true);
 assert.throws(()=>feed.post({profileId:'bot',text:'x'.repeat(241)}));assert.throws(()=>feed.post({profileId:'bot',text:'a\nb\nc'}));
 for(let i=0;i<205;i++){now+=15000;feed.post({profileId:'bot',text:'Step '+i});}
 assert.equal(feed.items.length,200);assert.deepEqual(new UpdateFeed(home).items,feed.items);
});
test('design changes preserve context and seed Pipeline role without overwriting it',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');const home=temporary();const m=new RanchManager({dir:home,native:{}});let p=m.saveProfile({nickname:'Pipes',color:0,design:'pipeline'});const epoch=p.contextEpoch;
 p=m.saveProfile({...p,design:'classic',expectedRevision:p.revision});assert.equal(p.contextEpoch,epoch);assert.equal(p.role,'generalist');
 assert.throws(()=>m.saveProfile({...p,design:'bad',expectedRevision:p.revision}));
 m.saveRole({id:'pipeline',name:'My pipeline',model:'auto',instructions:'Keep my instructions.'});
 const restored=new RanchManager({dir:home,native:{}});assert.equal(restored.library.role('pipeline').instructions,'Keep my instructions.');assert.equal(restored.profiles[0].design,'classic');
});
test('status posts require current runtime and active attempt, never change task status',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs'),{createHash}=require('node:crypto');const m=new RanchManager({dir:temporary(),native:{}}),p=m.saveProfile({nickname:'Test',color:0}),token='a'.repeat(64);
 const task=m.saveTask({title:'Work',instructions:'Inspect',expectedRevision:0});const internal=m.tasks[0];internal.attempts=[{id:'attempt',profileId:p.id,launchId:'launch',state:'running',dispatchTokenHash:createHash('sha256').update(token).digest('hex')}];internal.status='doing';m.runs[p.id]={launchId:'launch'};
 assert.equal(m.postTaskUpdate(p.id,'launch','attempt','b'.repeat(64),{text:'Hello',sequence:1}),null);
 assert.equal(m.postTaskUpdate(p.id,'launch','attempt',token,{text:'Checking inputs.',sequence:1}).accepted,true);assert.equal(internal.status,'doing');
 assert.equal(m.postTaskUpdate(p.id,'launch','attempt',token,{text:'Old',sequence:1}).reason,'stale');
 m.runs[p.id].launchId='new';assert.equal(m.postTaskUpdate(p.id,'launch','attempt',token,{text:'Old launch',sequence:2}),null);
});
