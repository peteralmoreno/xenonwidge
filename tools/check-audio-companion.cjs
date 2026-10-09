// Run with the companion already started. Never prints the pairing key or media titles.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:43821';
const token=fs.readFileSync(path.join(process.env.LOCALAPPDATA,'AudioDeck/pairing-key.txt'),'utf8').trim();
async function request(route,body,authorized=true){return fetch(base+route,{method:body?'POST':'GET',headers:{...(authorized?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});}
(async()=>{
 assert.equal((await request('/state',null,false)).status,401);
 const read=await request('/state');assert.equal(read.status,200);const initial=await read.json();
 assert.ok(Array.isArray(initial.sessions));assert.ok(Array.isArray(initial.players));
 for(const body of [{kind:'volume',target:'missing',value:2},{kind:'mute',target:'missing'},{kind:'launch',target:'anything'},{kind:'volume',target:'missing',value:-1}])assert.equal((await request('/command',body)).status,400);
 assert.equal((await request('/command',{kind:'mute',target:'nonexistent-target',muted:true})).status,409);
 assert.equal((await request('/command',{kind:'playPause',target:'nonexistent-player'})).status,409);
 if(initial.sessions.length){
  const session=initial.sessions[0];
  assert.equal((await request('/command',{kind:'volume',target:session.id,value:session.volume})).status,200);
  const after=await (await request('/state')).json();
  const same=after.sessions.find(s=>s.id===session.id);assert.ok(same);assert.ok(Math.abs(same.volume-session.volume)<0.001);assert.equal(same.muted,session.muted);
 }
 if(initial.master){
  // Set the current value back to itself: exercise actual CoreAudio without changing listening volume.
  const fresh=await (await request('/state')).json();
  assert.equal((await request('/command',{kind:'volume',target:fresh.master.id,value:fresh.master.volume})).status,200);
  const after=await (await request('/state')).json();
  assert.equal(after.master.id,fresh.master.id);assert.ok(Math.abs(after.master.volume-fresh.master.volume)<0.001);assert.equal(after.master.muted,fresh.master.muted);
 }
 console.log(JSON.stringify({authenticatedRead:true,unauthorizedRejected:true,invalidCommandsRejected:true,staleTargetsRejected:true,masterAvailable:!!initial.master,sessionCount:initial.sessions.length,playerCount:initial.players.length,masterNoOpRoundTrip:!!initial.master}));
})().catch(error=>{console.error(error);process.exitCode=1;});
