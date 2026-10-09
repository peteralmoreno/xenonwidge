// Requires explicit paths to a compatible Bun and published OMP CLI. No model prompts are sent.
const {spawn}=require('node:child_process');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const assert=require('node:assert/strict');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 assert.ok(process.env.OMP_TEST_BUN&&process.env.OMP_TEST_CLI,'Set OMP_TEST_BUN and OMP_TEST_CLI');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'omp-bot-smoke-'));const keyFile=path.join(temp,'key.txt'),key='c'.repeat(64);fs.writeFileSync(keyFile,key);
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');const bridge=createBridge({key});await new Promise(r=>bridge.listen(0,'127.0.0.1',r));const port=bridge.address().port;
 const child=spawn(process.env.OMP_TEST_BUN,[process.env.OMP_TEST_CLI,'--mode','rpc','--provider','openai','--model','gpt-4.1','--no-session','--no-extensions','--extension',path.resolve(__dirname,'../sources/omp-bot-companion/extension.mjs')],{cwd:temp,env:{...process.env,OPENAI_API_KEY:'omp-bot-smoke-placeholder-no-model-requests',PI_CONFIG_DIR:path.relative(os.homedir(),path.join(temp,'config')).replaceAll('\\','/'),OMP_BOT_PORT:String(port),OMP_BOT_KEY_FILE:keyFile},windowsHide:true,stdio:['pipe','pipe','pipe']});
 let stderr='',buffer='';const responses=[];child.stderr.on('data',data=>stderr+=data);child.stdout.on('data',data=>{buffer+=data;let end;while((end=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);try{const frame=JSON.parse(line);if(frame.type==='response')responses.push(frame);}catch{}}});
 const read=async()=>await(await fetch(`http://127.0.0.1:${port}/state`,{headers:{Authorization:'Bearer '+key}})).json();
 try{
  let state;for(let i=0;i<150;i++){state=await read();if(state.sessions.length)break;if(child.exitCode!==null)throw new Error('OMP exited before extension connected: '+stderr.split('\n').filter(line=>line.length<400).slice(0,15).join('\n'));await delay(100);}
  assert.equal(state.sessions.length,1,'Real OMP must load the extension and emit session_start');assert.equal(state.sessions[0].state,'ready');const first=state.sessions[0];
  await delay(2200);state=await read();assert.ok(state.sessions[0].sequence>first.sequence,'OMP-owned timer must publish heartbeats');
  child.stdin.write(JSON.stringify({id:'switch-test',type:'new_session'})+'\n');for(let i=0;i<50&&!responses.some(r=>r.id==='switch-test');i++)await delay(100);assert.equal(responses.find(r=>r.id==='switch-test')?.success,true,'OMP must acknowledge the session switch');await delay(900);state=await read();assert.equal(state.sessions.length,1);assert.equal(state.sessions[0].id,first.id);assert.ok(state.sessions[0].sequence>first.sequence);
  console.log('Published OMP extension smoke passed: load, ready state, heartbeat, session switch. No model prompt sent.');
 }finally{child.stdin.end();await delay(400);if(child.exitCode===null)child.kill();bridge.closeAllConnections();await new Promise(r=>bridge.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
