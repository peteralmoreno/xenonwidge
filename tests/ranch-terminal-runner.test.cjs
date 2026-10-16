const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {once}=require('node:events');

async function fixture(t){
 const mod=await import('../sources/omp-bot-companion/terminal-runner.mjs');
 assert.equal(typeof mod.runOmpSession,'function','runner must monitor a live child asynchronously');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-runner-'));
 const children=[];
 t.after(async()=>{for(const child of children)if(child.exitCode===null&&child.signalCode===null){const done=once(child,'exit').catch(()=>{});child.kill();await done;}fs.rmSync(dir,{recursive:true,force:true});});
 const file=path.join(dir,'binding.json.next.json');
 const handoff={folder:dir,history:path.join(dir,'history'),homeFolder:dir,mode:'task',token:'a'.repeat(64),launchId:'next-launch',taskId:'next-task',attemptId:'next-attempt',roleInstructions:'Review this task',preferredModel:'auto',readOnly:false};
 const env={...process.env,OMP_BOT_PROJECT:dir,OMP_BOT_BINDING_FILE:path.join(dir,'binding.json'),OMP_BOT_EXTENSION:'extension.mjs',OMP_BOT_PROFILE_ID:'resident',OMP_BOT_RUNTIME_TOKEN:'private-runtime'};
 const start=(script)=>(_command,args,options)=>{const child=spawn(process.execPath,['-e',script,'--',...args],{...options,stdio:'ignore'});children.push(child);return child;};
 return {...mod,dir,file,handoff,env,start,children};
}
const publish=(file,value)=>`require('node:fs').writeFileSync(${JSON.stringify(file)},${JSON.stringify(typeof value==='string'?value:JSON.stringify(value))});`;

test('a stuck child hands off once after a shutdown grace and starts each task with current arguments and credentials',async t=>{
 const f=await fixture(t),other=path.join(f.dir,'other');fs.mkdirSync(other);
 const log=path.join(f.dir,'launches.jsonl'),second={...f.handoff,folder:other,history:path.join(f.dir,'second-history'),mode:'resume',taskId:'second-task',launchId:'second-launch',attemptId:'second-attempt',token:'b'.repeat(64)};
 const script=`const fs=require('node:fs');fs.appendFileSync(${JSON.stringify(log)},JSON.stringify({args:process.argv.slice(1),cwd:process.cwd(),task:process.env.OMP_BOT_TASK_ID,token:process.env.OMP_BOT_DISPATCH_TOKEN,profile:process.env.OMP_BOT_PROFILE_ID,runtime:process.env.OMP_BOT_RUNTIME_TOKEN})+'\\n');if(!process.env.OMP_BOT_TASK_ID){${publish(f.file,f.handoff)}setInterval(()=>{},1000);}else if(process.env.OMP_BOT_TASK_ID==='next-task'){${publish(f.file,second)}setInterval(()=>{},1000);}else process.exitCode=7;`;
 const code=await f.runTerminal({env:{...f.env,OMP_BOT_SESSION_DIR:path.join(f.dir,'initial'),OMP_BOT_OPEN_MODE:'resume'},spawnProcess:f.start(script),pollMs:5,shutdownGraceMs:30,stopTimeoutMs:3000});
 assert.equal(code,7);
 const launches=fs.readFileSync(log,'utf8').trim().split('\n').map(JSON.parse);
 assert.equal(launches.length,3);
 assert.deepEqual(launches.map(x=>x.args),[
  ['--extension','extension.mjs','--session-dir',path.join(f.dir,'initial'),'--continue'],
  ['--extension','extension.mjs','--session-dir',f.handoff.history],
  ['--extension','extension.mjs','--session-dir',second.history,'--continue'],
 ]);
 assert.deepEqual(launches.map(x=>x.cwd),[f.dir,f.dir,other]);
 assert.equal(launches[1].task,'next-task');assert.equal(launches[1].token,'a'.repeat(64));
 assert.equal(launches[2].task,'second-task');assert.equal(launches[2].token,'b'.repeat(64));
 assert.ok(launches.every(x=>x.profile==='resident'&&x.runtime==='private-runtime'));
 assert.equal(fs.existsSync(f.file),false);
 assert.equal(fs.readFileSync(path.join(second.history,'bot-role.md'),'utf8'),'Review this task');
});

test('natural shutdown during the grace period needs no forced termination',async t=>{
 const f=await fixture(t);
 const result=await f.runOmpSession('fixture',[],f.env,f.file,{spawnProcess:f.start(`${publish(f.file,f.handoff)}setTimeout(()=>process.exit(0),30);`),pollMs:5,shutdownGraceMs:300,stopChild:()=>assert.fail('child should exit gracefully')});
 assert.equal(result.code,0);assert.equal(result.handoff.taskId,'next-task');
});

test('withdrawn handoff after a shutdown error never kills or replaces the source child',async t=>{
 const f=await fixture(t);
 const script=`${publish(f.file,f.handoff)}setTimeout(()=>require('node:fs').unlinkSync(${JSON.stringify(f.file)}),30);setTimeout(()=>process.exit(9),120);`;
 const result=await f.runOmpSession('fixture',[],f.env,f.file,{spawnProcess:f.start(script),pollMs:5,shutdownGraceMs:70,stopChild:()=>assert.fail('withdrawn handoff must leave source child running')});
 assert.equal(result.code,9);assert.equal(result.handoff,null);
});

test('malformed and incomplete handoffs never stop or replace a healthy child',async t=>{
 const f=await fixture(t);
 for(const value of ['{unfinished', {...f.handoff,token:'bad'}, {...f.handoff,attemptId:''}, {...f.handoff,folder:'relative'}, {...f.handoff,readOnly:'false'}, {...f.handoff,roleInstructions:42}]){
  const result=await f.runOmpSession('fixture',[],f.env,f.file,{spawnProcess:f.start(`${publish(f.file,value)}setTimeout(()=>process.exit(9),80);`),pollMs:5,shutdownGraceMs:10,stopChild:()=>assert.fail('invalid handoff must never terminate child')});
  assert.equal(result.code,9);assert.equal(result.handoff,null);fs.rmSync(f.file,{force:true});
 }
});

test('an incomplete handoff can be replaced with a valid handoff while the child remains alive',async t=>{
 const f=await fixture(t);
 const result=await f.runOmpSession('fixture',[],f.env,f.file,{spawnProcess:f.start(`${publish(f.file,'{unfinished')}setTimeout(()=>{${publish(f.file,f.handoff)}},40);setInterval(()=>{},1000);`),pollMs:5,shutdownGraceMs:20,stopTimeoutMs:3000});
 assert.equal(result.handoff.taskId,'next-task');
});

test('a handoff pointing at a file instead of a history directory leaves the child usable',async t=>{
 const f=await fixture(t),history=path.join(f.dir,'history-file');fs.writeFileSync(history,'existing content');
 const result=await f.runOmpSession('fixture',[],f.env,f.file,{spawnProcess:f.start(`${publish(f.file,{...f.handoff,history})}setTimeout(()=>process.exit(9),80);`),pollMs:5,shutdownGraceMs:10,stopChild:()=>{throw Error('must not stop for unusable history');}});
 assert.equal(result.code,9);assert.equal(result.handoff,null);assert.equal(fs.readFileSync(history,'utf8'),'existing content');
});

test('spawn errors reject promptly without a handoff or a live watcher',async t=>{
 const f=await fixture(t);
 await assert.rejects(f.runOmpSession(path.join(f.dir,'missing-executable'),[],f.env,f.file,{pollMs:5}),{code:'ENOENT'});
});

test('failed termination rejects once, preserves the handoff, and never launches a replacement',async t=>{
 const f=await fixture(t);let stops=0;
 await assert.rejects(f.runTerminal({env:f.env,spawnProcess:f.start(`${publish(f.file,f.handoff)}setInterval(()=>{},1000);`),pollMs:5,shutdownGraceMs:10,stopTimeoutMs:80,stopChild:async()=>{stops++;throw Error('termination denied');}}),/termination denied/);
 assert.equal(stops,1);assert.equal(f.children.length,1);assert.equal(fs.existsSync(f.file),true);
});

test('a termination command that never settles is bounded and never retried',async t=>{
 const f=await fixture(t);let stops=0;
 await assert.rejects(f.runTerminal({env:f.env,spawnProcess:f.start(`${publish(f.file,f.handoff)}setInterval(()=>{},1000);`),pollMs:5,shutdownGraceMs:10,stopTimeoutMs:60,stopChild:()=>{stops++;return new Promise(()=>{});}}),/did not exit/);
 assert.equal(stops,1);assert.equal(f.children.length,1);assert.equal(fs.existsSync(f.file),true);
});
