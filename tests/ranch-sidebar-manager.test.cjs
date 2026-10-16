const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');

test('factory creates directly in the existing bank without consuming a slot or launching a session',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-factory-'));
 try {
  const m=new RanchManager({dir,native:{launch:()=>{throw Error('No session should launch');}}});
  const resident=m.saveProfile({nickname:'Resident',color:0});
  let pickupSchedules=0;m.scheduleAutoPickup=()=>{pickupSchedules++;};
  const bank=m.saveProfile({nickname:'Spare',color:0,active:false,autoPickup:true});
  assert.equal(pickupSchedules,0,'creating a bank profile must not schedule work for other bots');
  assert.equal(bank.active,false);assert.equal(bank.slot,null);assert.equal(m.profiles.filter(p=>p.active).length,1);
  assert.equal(new RanchManager({dir,native:{}}).profiles.find(p=>p.id===bank.id).active,false);
  assert.throws(()=>m.setMembership(bank.id,true,bank.revision),/color/);
  assert.throws(()=>m.saveProfile({...resident,active:false,expectedRevision:0}),/changed/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('town bell targets sleeping residents and preserves pending wakes without disturbing work or closed sessions',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-bell-'));
 try {
  const now=200000,m=new RanchManager({dir,now:()=>now,native:{launch:()=>{throw Error('Must not launch');},close:()=>{throw Error('Must not interrupt');}}});
  const bots=['Busy','Pending','Closed','Old','Sleeping'].map((nickname,color)=>m.saveProfile({nickname,color}));
  m.runs[bots[0].id]={status:'connected',runtimeKeyHash:'hash',launchId:'busy'};
  m.pulses.set(bots[0].id,{state:'writing',lastSeen:now,idleSince:0});
  m.runs[bots[1].id]={status:'connected',runtimeKeyHash:'hash',checkRequested:true,wake:{status:'pending',at:now,message:'Already requested.'}};
  m.pulses.set(bots[1].id,{state:'ready',lastSeen:now,idleSince:0});
  m.runs[bots[3].id]={status:'connected'};
  m.runs[bots[4].id]={status:'connected',runtimeKeyHash:'hash'};m.pulses.set(bots[4].id,{state:'ready',lastSeen:now,idleSince:0});
  m.saveProfile({nickname:'Bank',color:5,active:false});
  const result=m.ringAll();
  assert.equal(result.requested,1);assert.equal(result.pending,2);assert.equal(result.skipped,3);
  assert.equal(m.runs[bots[0].id].checkRequested,undefined);assert.equal(m.runs[bots[0].id].launchId,'busy');assert.equal(m.runs[bots[4].id].checkRequested,true);
  assert.equal(result.results.find(row=>row.id===bots[4].id).status,'pending');
 }
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});
