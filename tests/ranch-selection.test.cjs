const {test}=require('node:test');const assert=require('node:assert/strict');
test('ranch selection synchronizes independently of focus and requires an existing authenticated resident',async()=>{
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');let focused=0;const manager={residents:()=>[{id:'ranch-one',state:'ready'}],focusResident:async()=>{focused++;return 'focused';}};
 const server=createBridge({key:'a'.repeat(64),manager});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const headers={Authorization:'Bearer '+'a'.repeat(64),'Content-Type':'application/json'};
 try{
  assert.equal((await fetch(base+'/selection',{method:'POST',body:JSON.stringify({id:'ranch-one'})})).status,401);
  assert.equal((await fetch(base+'/selection',{method:'POST',headers,body:JSON.stringify({id:'missing'})})).status,404);
  const chosen=await fetch(base+'/selection',{method:'POST',headers,body:JSON.stringify({id:'ranch-one'})});assert.equal(chosen.status,200);const choice=await chosen.json();assert.equal(choice.selectedId,'ranch-one');assert.equal(choice.selectionRevision,1);assert.equal(focused,0);
  const state=await(await fetch(base+'/state',{headers})).json();assert.equal(state.selectedId,'ranch-one');assert.equal(state.capabilities.selection,true);
  assert.equal((await fetch(base+'/selection',{method:'POST',headers,body:JSON.stringify({id:'ranch-one',command:'anything'})})).status,400);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
