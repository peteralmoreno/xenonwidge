const {test}=require('node:test');
const assert=require('node:assert/strict');
test('widget task preflight succeeds without credentials while actual control requests require the key',async()=>{
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');
 const server=createBridge({key:'a'.repeat(64),manager:{authorizeControl:()=>false,view:()=>({tasks:[],profiles:[]})}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  for(const [route,method] of [['state','GET'],['task/queue','POST']]){
   const response=await fetch(base+'/control/'+route,{method:'OPTIONS',headers:{Origin:'http://widget.test','Access-Control-Request-Method':method,'Access-Control-Request-Headers':'authorization,content-type','Access-Control-Request-Private-Network':'true'}});
   assert.equal(response.status,204);
   assert.equal(response.headers.get('access-control-allow-origin'),'*');
   assert.match(response.headers.get('access-control-allow-headers'),/Authorization/);
   assert.match(response.headers.get('access-control-allow-methods'),new RegExp(method));
   assert.equal(response.headers.get('access-control-allow-private-network'),'true');
  }
  assert.equal((await fetch(base+'/control/state')).status,401);
  assert.equal((await fetch(base+'/control/state',{headers:{Authorization:'Bearer '+'a'.repeat(64)}})).status,200);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
