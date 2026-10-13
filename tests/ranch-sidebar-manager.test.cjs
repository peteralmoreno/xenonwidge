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

test('town bell reports eligible, pending and closed residents without launching or disturbing work',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-bell-'));
 try {
  const m=new RanchManager({dir,native:{launch:()=>{throw Error('Must not launch');},close:()=>{throw Error('Must not interrupt');}}});
  const bots=['Busy','Pending','Closed','Old'].map((nickname,color)=>m.saveProfile({nickname,color}));
  m.runs[bots[0].id]={status:'connected',runtimeKeyHash:'hash',launchId:'busy'};
  m.pulses.set(bots[0].id,{state:'writing',lastSeen:Date.now()});
  m.runs[bots[1].id]={status:'connected',runtimeKeyHash:'hash',checkRequested:true};
  m.runs[bots[3].id]={status:'connected'};
  m.saveProfile({nickname:'Bank',color:5,active:false});
  const result=m.ringAll();
  assert.equal(result.requested,1);assert.equal(result.pending,1);assert.equal(result.skipped,2);
  assert.equal(m.runs[bots[0].id].checkRequested,true);assert.equal(m.runs[bots[0].id].launchId,'busy');
  assert.match(result.message,/1.*2/);
 }
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});
