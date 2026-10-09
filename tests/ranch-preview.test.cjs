const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('preview is projected, normalized, bounded without broken Unicode and excludes hidden content',async()=>{
 const {messagePreview,sanitizePreview,branchPreview}=await import('../sources/omp-bot-companion/preview.mjs');
 assert.deepEqual(messagePreview({role:'assistant',timestamp:12,content:[{type:'thinking',thinking:'SECRET'},{type:'text',text:' Hello\n world\u0000 '},{type:'toolCall',name:'SECRET'}]},50),{role:'assistant',text:'Hello world',at:12});
 assert.equal(messagePreview({role:'toolResult',content:'SECRET'},50),undefined);
 assert.equal(messagePreview({role:'assistant',content:[{type:'thinking',thinking:'SECRET'}]},50),undefined);
 assert.deepEqual(branchPreview([{type:'message',message:{role:'user',content:'Question',timestamp:10}},{type:'message',message:{role:'toolResult',content:'SECRET'}}],50),{role:'user',text:'Question',at:10});
 assert.equal(branchPreview([],50),undefined);
 const p=sanitizePreview({role:'user',text:'a'.repeat(399)+'\u{1F600}extra',at:1,secret:'SECRET'},50);assert.equal(p.text,'a'.repeat(399));assert.deepEqual(Object.keys(p),['role','text','at']);
 for(const p of [{role:'tool',text:'x',at:1},{role:'user',text:'x',at:Infinity},{role:'user',text:'x',at:-1},{role:'user',text:' ',at:1}])assert.equal(sanitizePreview(p,50),undefined);
});
test('bridge accepts legacy snapshots, projects previews and rejects malformed previews',async()=>{
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');const observed=[];const server=createBridge({key:'test',now:()=>1000,manager:{observe:s=>{observed.push(s);return false},residents:()=>[]}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port,headers={Authorization:'Bearer test','Content-Type':'application/json'};let sequence=0;
 const put=preview=>fetch(base+'/snapshot',{method:'PUT',headers,body:JSON.stringify({version:1,id:'one',sequence:++sequence,project:'test',state:'ready',label:'Ready',startedAt:null,finishedAt:null,activeCount:0,...(preview===undefined?{}:{preview})})});
 const read=async()=> (await(await fetch(base+'/state',{headers})).json()).sessions[0];
 try{
  assert.equal((await fetch(base+'/state')).status,401);
  assert.equal((await put({role:'assistant',text:'answer\n here',at:5,thinking:'SECRET'})).status,200);
  assert.deepEqual((await read()).preview,{role:'assistant',text:'answer here',at:5});assert.equal(observed[0].preview.thinking,undefined);
  assert.equal((await put({role:'toolResult',text:'SECRET',at:5})).status,400);
  assert.equal((await put({role:'assistant',text:'x',at:1000000})).status,400);
  assert.equal((await put({role:'user',text:'\u{1F600}'.repeat(1000),at:5})).status,413);
  assert.equal((await put(undefined)).status,200);assert.equal((await read()).preview,undefined);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
test('extension restores active branch, streams bounded text, clears on switch and ignores subagents',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-preview-')),oldKey=process.env.OMP_BOT_KEY_FILE,oldFetch=global.fetch;
 process.env.OMP_BOT_KEY_FILE=path.join(temp,'key');fs.writeFileSync(process.env.OMP_BOT_KEY_FILE,'a'.repeat(64));
 const snapshots=[],handlers={},timeouts=new Map();let tick=0;const ctx={cwd:temp,agent:{kind:'main'},sessionManager:{getBranch:()=>[{type:'message',message:{role:'user',content:'restored',timestamp:1}}]},setInterval:()=>99,setTimeout:fn=>{timeouts.set(++tick,fn);return tick},clearTimer:id=>timeouts.delete(id)};
 global.fetch=async(url,opts)=>{snapshots.push(JSON.parse(opts.body));return {body:{cancel:async()=>{}}}};
 const settle=()=>new Promise(r=>setImmediate(r));
 try{
  const {default:extension}=await import('../sources/omp-bot-companion/extension.mjs');extension({on:(name,fn)=>{handlers[name]=fn}});
  handlers.session_start({},ctx);await settle();assert.equal(snapshots.at(-1).preview.text,'restored');
  for(let i=0;i<50;i++)handlers.message_update({message:{role:'assistant',timestamp:2,content:[{type:'text',text:'answer '+i},{type:'thinking',thinking:'SECRET'}]}},ctx);
  await settle();assert.ok(snapshots.length<10);for(const fn of [...timeouts.values()])fn();timeouts.clear();await settle();assert.equal(snapshots.at(-1).preview.text,'answer 49');
  handlers.message_end({message:{role:'assistant',content:'final',timestamp:2}},ctx);await settle();assert.equal(snapshots.at(-1).preview.text,'final');
  handlers.message_update({message:{role:'assistant',content:'settled',timestamp:3}},ctx);
  handlers.message_end({message:{role:'assistant',content:'settled',timestamp:3}},ctx);await settle();assert.equal(snapshots.at(-1).preview.text,'settled');
  handlers.message_end({message:{role:'user',content:'subsecret'}},{...ctx,agent:{kind:'sub'}});await settle();assert.equal(snapshots.at(-1).preview.text,'settled');
  ctx.sessionManager.getBranch=()=>[];handlers.session_switch({},ctx);await settle();assert.equal(snapshots.at(-1).preview,undefined);
  handlers.session_shutdown({},ctx);await settle();assert.ok(!JSON.stringify(snapshots).includes('SECRET'));
 }finally{global.fetch=oldFetch;if(oldKey===undefined)delete process.env.OMP_BOT_KEY_FILE;else process.env.OMP_BOT_KEY_FILE=oldKey;fs.rmSync(temp,{recursive:true,force:true});}
});
