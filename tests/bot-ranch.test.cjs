const {test}=require('node:test');const assert=require('node:assert/strict');
test('missing terminal processes return closed without touching any window',{skip:process.platform!=='win32'},()=>{
 const {execFileSync}=require('node:child_process');const path=require('node:path');
 const result=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(__dirname,'../sources/omp-bot-companion/Focus-Terminal.ps1'),'-TerminalPid','2147483647','-Started','638000000000000000'],{encoding:'utf8',windowsHide:true});assert.equal(result.trim(),'closed');
});
test('focus requires authentication and a live private terminal binding',async()=>{
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');let now=1000;const focused=[];
 const server=createBridge({key:'a'.repeat(64),now:()=>now,ttl:100,focusTerminal:async terminal=>{focused.push(terminal);return 'focused';}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const headers={Authorization:'Bearer '+'a'.repeat(64),'Content-Type':'application/json'};
 const snapshot={version:1,id:'one',sequence:1,state:'ready',label:'Ready',project:'test',startedAt:null,finishedAt:null,activeCount:0,terminal:{pid:123,started:'638000000000000000'}};
 const focus=body=>fetch(base+'/focus',{method:'POST',headers,body:JSON.stringify(body)});
 try{
  assert.equal((await fetch(base+'/focus',{method:'POST',body:'{}'})).status,401);
  await fetch(base+'/snapshot',{method:'PUT',headers,body:JSON.stringify(snapshot)});
  const state=await(await fetch(base+'/state',{headers})).json();assert.equal(state.sessions[0].terminal,undefined);assert.equal(state.sessions[0].canFocus,true);
  assert.equal((await focus({id:'one',command:'anything'})).status,400);
  assert.equal((await focus({id:'unknown'})).status,404);
  assert.deepEqual(await(await focus({id:'one'})).json(),{result:'focused'});assert.deepEqual(focused,[snapshot.terminal]);
  now=1200;assert.equal((await focus({id:'one'})).status,409);assert.equal(focused.length,1);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});

test('focus rejects concurrent requests and never leaks malformed terminal metadata',async()=>{
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');let release;let startedResolve;const entered=new Promise(r=>startedResolve=r);const gate=new Promise(r=>release=r);
 const server=createBridge({key:'a'.repeat(64),focusTerminal:async()=>{startedResolve();await gate;return 'attention';}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,headers={Authorization:'Bearer '+'a'.repeat(64),'Content-Type':'application/json'};
 const data={version:1,id:'one',sequence:1,state:'ready',label:'Ready',project:'test',startedAt:null,finishedAt:null,activeCount:0};const put=body=>fetch(base+'/snapshot',{method:'PUT',headers,body:JSON.stringify(body)});const focus=()=>fetch(base+'/focus',{method:'POST',headers,body:'{"id":"one"}'});
 try{assert.equal((await put({...data,terminal:{pid:'123',started:'bad'}})).status,400);await put(data);assert.deepEqual(await(await focus()).json(),{result:'unavailable'});await put({...data,sequence:2,terminal:{pid:123,started:'638000000000000000'}});const first=focus();await entered;assert.equal((await focus()).status,429);release();assert.deepEqual(await(await first).json(),{result:'attention'});}finally{release();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
