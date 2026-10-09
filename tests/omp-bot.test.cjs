const {test}=require('node:test');const assert=require('node:assert/strict');
const stateModule=()=>import('../sources/omp-bot-companion/state.mjs');
test('OMP classifies real tools and keeps unknown commands honest',async()=>{
 const {classify}=await stateModule();
 for(const [tool,want] of [['read','reading'],['grep','researching'],['web_search','researching'],['fetch','researching'],['write','writing'],['edit','writing'],['apply_patch','writing'],['bash','running'],['python','running'],['ask','waiting'],['mystery','working']])assert.equal(classify(tool).state,want);
});
test('OMP overlapping tools and approvals preserve the remaining work',async()=>{
 const {BotState}=await stateModule();const s=new BotState();s.event({type:'agent_start'},100);
 s.event({type:'tool_execution_start',toolCallId:'a',toolName:'read'},110);
 s.event({type:'tool_execution_start',toolCallId:'b',toolName:'write'},120);assert.equal(s.view().state,'writing');
 s.event({type:'tool_approval_requested',toolCallId:'c'},130);assert.equal(s.view().state,'waiting');
 s.event({type:'tool_execution_end',toolCallId:'b'},140);assert.equal(s.view().state,'waiting');
 s.event({type:'tool_approval_resolved',toolCallId:'c'},150);assert.equal(s.view().state,'reading');
 s.event({type:'tool_execution_end',toolCallId:'a'},160);assert.equal(s.view().state,'thinking');
});
test('OMP continuation and failures cannot masquerade as done',async()=>{
 const {BotState}=await stateModule();const s=new BotState();s.event({type:'agent_start'},100);
 s.event({type:'agent_end',willContinue:true,messages:[]},200);assert.equal(s.view().state,'working');
 s.event({type:'agent_end',messages:[{role:'assistant',stopReason:'error'}]},300);assert.equal(s.view().state,'error');
 s.event({type:'agent_start'},400);s.event({type:'agent_end',messages:[{role:'assistant',stopReason:'aborted'}]},500);assert.equal(s.view().state,'ready');
 s.event({type:'agent_start'},600);s.event({type:'agent_end',messages:[]},700);assert.equal(s.view().state,'done');assert.equal(s.view().finishedAt,700);
});
test('OMP ask tool holds attention and session switch clears old state',async()=>{
 const {BotState}=await stateModule();const s=new BotState();s.event({type:'agent_start'});s.event({type:'tool_execution_start',toolCallId:'q',toolName:'ask'});assert.equal(s.view().state,'waiting');s.event({type:'tool_execution_end',toolCallId:'q'});assert.equal(s.view().state,'thinking');s.event({type:'session_switch'});assert.equal(s.view().state,'ready');assert.equal(s.view().startedAt,null);
});
test('OMP bridge authenticates, rejects stale snapshots, projects fields, and expires heartbeats',async()=>{
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');let clock=1000;
 const server=createBridge({key:'a'.repeat(64),now:()=>clock,ttl:100});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const headers={Authorization:'Bearer '+'a'.repeat(64),'Content-Type':'application/json'};
 const body={version:1,id:'terminal-1',sequence:1,project:'test',state:'reading',label:'Reading files',startedAt:100,finishedAt:null,activeCount:1,prompt:'must not persist'};
 const put=b=>fetch(base+'/snapshot',{method:'PUT',headers,body:JSON.stringify(b)});
 try{
  assert.equal((await fetch(base+'/state')).status,401);assert.equal((await put(body)).status,200);
  assert.equal((await put(body)).status,409);assert.equal((await put({...body,sequence:2,state:'made-up'})).status,400);
  let state=await(await fetch(base+'/state',{headers})).json();assert.equal(state.sessions[0].state,'reading');assert.equal(state.sessions[0].prompt,undefined);
  clock=1101;state=await(await fetch(base+'/state',{headers})).json();assert.equal(state.sessions[0].state,'offline');
  assert.equal((await put({...body,sequence:2,state:'writing'})).status,200);state=await(await fetch(base+'/state',{headers})).json();assert.equal(state.sessions[0].state,'writing');
  assert.equal((await put({...body,id:'too-big',label:'x'.repeat(5000)})).status,413);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('OMP idle compaction restores the completed state and exhausted retries show an error',async()=>{
 const {BotState}=await stateModule();const s=new BotState();s.event({type:'agent_start'},100);s.event({type:'agent_end',messages:[]},200);
 s.event({type:'auto_compaction_start'},300);assert.equal(s.view().state,'thinking');s.event({type:'auto_compaction_end',willRetry:false},400);assert.equal(s.view().state,'done');assert.equal(s.view().finishedAt,200);
 s.event({type:'agent_start'},500);s.event({type:'auto_retry_start'},600);s.event({type:'auto_retry_end',success:false,finalError:'failed'},700);assert.equal(s.view().state,'error');
});
test('OMP companion serves only public UI files while status stays authenticated',async()=>{
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');const server=createBridge({key:'a'.repeat(64)});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{const page=await fetch(base+'/ui/');assert.equal(page.status,200);assert.match(page.headers.get('content-type'),/text\/html/);assert.match(await page.text(),/Bot Ranch/);assert.equal((await fetch(base+'/state')).status,401);assert.notEqual((await fetch(base+'/ui/config.mjs')).status,200);assert.notEqual((await fetch(base+'/ui/%2e%2e/config.mjs')).status,200);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
