const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

test('sticky overrides, family defaults and affinities survive authoritative ranch restart',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-sticky-manager-'));
 try{
  const manager=new RanchManager({dir,native:{}});
  let task=manager.saveTask({title:'Docs update',projectFolder:dir,instructions:'Update the guide.',family:{name:' Docs ',color:'mint'},expectedRevision:0});
  assert.equal(task.sticky,false);assert.equal(task.familyStickyDefault,null);
  task=manager.setFamilySticky({taskId:task.id,expectedRevision:task.revision,sticky:true});
  assert.equal(task.task.sticky,true);assert.equal(task.familyStickyDefault,true);
  task=manager.setTaskSticky({id:task.task.id,expectedRevision:task.task.revision,stickyMode:'off'});
  assert.equal(task.sticky,false);assert.equal(task.familyStickyDefault,true);
  manager.familyAffinities[JSON.stringify(['docs',path.resolve(dir).toLocaleLowerCase()])]={profileId:'owner',claimedAt:Date.now(),lastTaskId:task.id,consecutive:2};
  manager.persist();
  const restarted=new RanchManager({dir,native:{}}),loaded=restarted.tasks[0];
  assert.equal(loaded.stickyMode,'off');assert.equal(restarted.publicTask(loaded).familyStickyDefault,true);
  assert.equal(restarted.familyAffinities[JSON.stringify(['docs',path.resolve(dir).toLocaleLowerCase()])].consecutive,2);
  assert.equal(JSON.parse(fs.readFileSync(restarted.file,'utf8')).schemaVersion,2);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('a failed authoritative Board write leaves live tasks, revision and policies untouched',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-sticky-atomic-'));
 try{
  const manager=new RanchManager({dir,native:{}}),task=manager.saveTask({title:'Existing',projectFolder:dir,instructions:'Keep.',expectedRevision:0});
  const beforeTasks=manager.tasks,beforeRevision=manager.taskRevision,beforePolicies=manager.familyPolicies;
  const obstructed=path.join(dir,'cannot-replace');fs.mkdirSync(obstructed);manager.file=obstructed;
  assert.throws(()=>manager.commitAiTransaction({tasks:[{...task,title:'Changed'}],taskRevision:beforeRevision+1,familyPolicies:{x:{sticky:true}},aiState:{access:'inspect',audit:[],receipts:{}}}));
  assert.equal(manager.tasks,beforeTasks);assert.equal(manager.taskRevision,beforeRevision);assert.equal(manager.familyPolicies,beforePolicies);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('the manager records sticky affinity only after successful dispatch',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-sticky-dispatch-'));
 try{
  let failLaunch=true;
  const manager=new RanchManager({dir,native:{checks:async()=>[],status:async()=> 'closed',launch:async()=>{if(failLaunch)throw Error('Fixture launch failure.');return {pid:8,started:'638000000000000000'};}}});
  manager.scheduleAutoPickup=()=>{};
  const profile=manager.saveProfile({nickname:'Cedar',color:0,autoPickup:true});
  const task=manager.saveTask({title:'Guide handoff',projectFolder:dir,instructions:'Keep going.',family:{name:'Guides',color:'mint'},stickyMode:'on',releasedForPickup:true,expectedRevision:0});
  manager.pickupPaused=false;
  await manager.autoPickup();
  assert.equal(Object.keys(manager.familyAffinities).length,0);
  assert.equal(manager.tasks[0].attempts[0].state,'failed');
  manager.tasks[0].attempts[0].state='failed';manager.tasks[0].status='todo';manager.tasks[0].releasedForPickup=true;delete manager.tasks[0].pickupBlockReason;manager.runs[profile.id]={status:'closed'};failLaunch=false;
  await manager.autoPickup();
  const key=JSON.stringify(['guides',path.resolve(dir).toLocaleLowerCase()]);
  assert.equal(manager.familyAffinities[key].profileId,profile.id);
  assert.equal(manager.familyAffinities[key].lastTaskId,task.id);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('AI family defaults advance the Board revision and invalidate a stale preview',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const {previewChanges}=await import('../sources/omp-bot-companion/board-changes.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-sticky-revision-'));
 try{
  const manager=new RanchManager({dir,native:{}}),task=manager.saveTask({title:'Family work',projectFolder:dir,instructions:'Keep it clear.',family:{name:'Guides',color:'mint'},expectedRevision:0});
  const key=JSON.stringify(['guides',path.resolve(dir).toLocaleLowerCase()]),snapshot={tasks:manager.tasks,profiles:[],familyPolicies:manager.familyPolicies,taskRevision:manager.taskRevision};
  const proposal={expectedTaskRevision:manager.taskRevision,actor:'test',operations:[{type:'family.setting',key,sticky:true}]};
  const preview=previewChanges({snapshot,...proposal,changeSetId:'family-setting'});
  assert.ok(preview.stagedTaskRevision>manager.taskRevision);
  manager.commitAiTransaction({tasks:preview.stagedTasks,taskRevision:preview.stagedTaskRevision,familyPolicies:preview.stagedFamilyPolicies,aiState:{access:'organize',audit:[],receipts:{}}});
  assert.throws(()=>previewChanges({snapshot:{...snapshot,tasks:manager.tasks,familyPolicies:manager.familyPolicies,taskRevision:manager.taskRevision},...proposal,changeSetId:'stale-family-setting'}),/revision changed/i);
  assert.ok(manager.tasks.find(item=>item.id===task.id).revision>task.revision);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
