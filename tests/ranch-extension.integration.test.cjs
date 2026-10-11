const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

test('OMP extension claims a dispatched task, applies settings, enforces read-only, and reports verified turns',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-extension-runtime-'));
 const serverModule=await import('../sources/omp-bot-companion/server.mjs');
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const manager=new RanchManager({dir,native:{checks:async()=>[],launch:async()=>({pid:911,started:'638000000000000000'})}}),profile=manager.saveProfile({nickname:'Brick',folder:dir,color:0,role:'implementer',preferredModel:'gpt',readOnly:true});
 const task=manager.saveTask({title:'Apply a local fix',projectFolder:dir,instructions:'Make the requested local change.',acceptanceCriteria:'Verify the result.',reasoningRequest:'medium',modelEligibility:['gpt'],assignedProfileId:profile.id,expectedRevision:0}),attempt=await manager.dispatchTask(task.id,profile.id,task.revision);
 const runtimePort=await new Promise(resolve=>{const probe=require('node:net').createServer();probe.listen(0,'127.0.0.1',()=>{const p=probe.address().port;probe.close(()=>resolve(p));});});
 const pairing='a'.repeat(64),runtimeServer=serverModule.createBridge({key:pairing,manager});await new Promise(resolve=>runtimeServer.listen(runtimePort,'127.0.0.1',resolve));
 const keyFile=path.join(dir,'pairing-key.txt'),bindingFile=path.join(dir,'terminal.json');fs.writeFileSync(keyFile,pairing);fs.writeFileSync(bindingFile,JSON.stringify({pid:912,started:'638000000000000000'}));fs.writeFileSync(path.join(dir,'existing.txt'),'readable');
 const env={};for(const name of ['OMP_BOT_PORT','OMP_BOT_KEY_FILE','OMP_BOT_BINDING_FILE','OMP_BOT_TASK_ID','OMP_BOT_ATTEMPT_ID','OMP_BOT_DISPATCH_TOKEN','OMP_BOT_PROFILE_ID','OMP_BOT_LAUNCH_ID','OMP_BOT_READ_ONLY','OMP_BOT_TASK_WORKSPACE'])env[name]=process.env[name];
  const handlers=new Map(),commands=new Map(),sent=[],selected=[];let currentModel={provider:'openai-codex',id:'old-model',reasoning:true};process.env.OMP_BOT_PORT=String(runtimePort);process.env.OMP_BOT_KEY_FILE=keyFile;process.env.OMP_BOT_BINDING_FILE=bindingFile;process.env.OMP_BOT_TASK_ID=task.id;process.env.OMP_BOT_ATTEMPT_ID=attempt.id;process.env.OMP_BOT_DISPATCH_TOKEN=manager.tasks[0].attempts[0].dispatchTokenHash;
 // Replace the one-way stored hash with a private runtime token known only to this test launch.
 const {randomBytes,createHash}=require('node:crypto'),token=randomBytes(32).toString('hex'),saved=manager.tasks[0].attempts[0];saved.dispatchTokenHash=createHash('sha256').update(token).digest('hex');manager.persist();process.env.OMP_BOT_DISPATCH_TOKEN=token;
 process.env.OMP_BOT_PROFILE_ID=profile.id;process.env.OMP_BOT_LAUNCH_ID=manager.runs[profile.id].launchId;process.env.OMP_BOT_READ_ONLY='true';process.env.OMP_BOT_TASK_WORKSPACE=dir;
 try{
  const {default:extension}=await import('../sources/omp-bot-companion/extension.mjs?test='+Date.now());
  const pi={on:(type,handler)=>handlers.set(type,handler),registerCommand:(name,definition)=>commands.set(name,definition.handler),setModel:async model=>{selected.push(model);currentModel=model;return true;},setThinkingLevel(level){this.level=level;},getThinkingLevel(){return this.level;},sendUserMessage(message){sent.push(message);}};extension(pi);
  const ctx={agent:{kind:'main'},cwd:dir,models:{list:()=>[{provider:'openai-codex',id:'gpt-runtime',reasoning:true}],current:()=>currentModel},setInterval:()=>1,clearInterval:()=>{},getAsyncJobSnapshot:()=>({running:[]}),hasPendingMessages:()=>false};
  await handlers.get('session_start')({},ctx);for(let i=0;i<50&&!sent.length;i++)await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(sent.length,1);assert.match(sent[0],/Role: implementer/);assert.match(sent[0],/Acceptance criteria/);assert.equal(selected[0].id,'gpt-runtime');assert.equal(pi.level,'medium');assert.equal(process.env.OMP_BOT_DISPATCH_TOKEN,undefined);assert.equal(manager.tasks[0].status,'todo');
  const blocked=await handlers.get('tool_call')({toolName:'write',input:{path:path.join(dir,'new.txt')}},ctx);assert.equal(blocked.block,true);
  const allowed=await handlers.get('tool_call')({toolName:'read',input:{path:path.join(dir,'existing.txt')}},ctx);assert.equal(allowed,null);
  await handlers.get('agent_start')({},ctx);await new Promise(resolve=>setTimeout(resolve,30));assert.equal(manager.tasks[0].status,'doing');
  await handlers.get('agent_end')({messages:[{role:'assistant',stopReason:'stop'}],willContinue:false,isTerminal:true},ctx);await new Promise(resolve=>setTimeout(resolve,30));assert.equal(manager.tasks[0].status,'review');
  assert.ok(manager.tasks[0].attempts[0].effectiveSettings);assert.equal(manager.tasks[0].attempts[0].effectiveSettings.readOnly,true);
  const sessionCalls=[],commandContext={waitForIdle:async()=>sessionCalls.push('idle'),newSession:async()=>sessionCalls.push('new'),ui:{notify:message=>sessionCalls.push(message)}};await commands.get('ranch-clean')('',commandContext);assert.deepEqual(sessionCalls.slice(0,2),['idle','new']);await handlers.get('session_start')({},ctx);await new Promise(resolve=>setTimeout(resolve,30));assert.equal(sent.length,1);assert.equal(manager.tasks[0].status,'review');
 }finally{for(const name of Object.keys(env)){if(env[name]===undefined)delete process.env[name];else process.env[name]=env[name];}runtimeServer.closeAllConnections();await new Promise(resolve=>runtimeServer.close(resolve));}
});
