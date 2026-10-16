const test = require('node:test');
const assert = require('node:assert/strict');

async function policy() {
  return import('../sources/omp-bot-companion/pickup-policy.mjs');
}

const profile = (id, active = true) => ({id, nickname:id, active, autoPickup:true});
const task = (id, extra = {}) => ({
  id, title:id, status:'todo', archived:false, releasedForPickup:true,
  assignedProfileId:null, queueOrder:1, createdAt:1, projectFolder:'C:\\work\\repo',
  family:{name:'Docs',color:'mint'}, stickyMode:'inherit', attempts:[], dependsOn:[],
  ...extra,
});
const available = () => true;

test('family keys combine normalized family name and canonical project identity', async () => {
  const {familyKey}=await policy();
  assert.equal(familyKey(task('a',{family:{name:'  DÖCS  ',color:'mint'},projectFolder:'C:\\Work\\Repo\\'})),
    familyKey(task('b',{family:{name:'döcs',color:'rose'},projectFolder:'c:/work/repo'})));
  assert.equal(familyKey(task('root',{projectFolder:'C:\\'})),familyKey(task('root2',{projectFolder:'c:/'})));
  assert.notEqual(familyKey(task('a',{projectFolder:'C:\\work\\repo-a'})),familyKey(task('b',{projectFolder:'C:\\work\\repo-b'})));
  assert.equal(familyKey(task('none',{family:null})),null);
});

test('default-off keeps queue order even when an older affinity exists', async () => {
  const {selectPickupTask,familyKey}=await policy(),p=profile('one');
  p.contextPolicy='per-session';
  const first=task('first',{queueOrder:1}),later=task('later',{queueOrder:2});
  const key=familyKey(first),affinities={[key]:{profileId:p.id,claimedAt:999,lastTaskId:'previous',consecutive:1}};
  assert.equal(selectPickupTask({profile:p,profiles:[p],tasks:[later,first],runs:{one:{status:'terminal open'}},affinities,now:1000,eligible:available}).taskId,'first');
  assert.equal(p.contextPolicy,'per-session');
});

test('an explicit task queue wins over sticky shared work', async () => {
  const {selectPickupTask}=await policy(),p=profile('one');
  const shared=task('sticky',{stickyMode:'on',queueOrder:0}),explicit=task('explicit',{assignedProfileId:p.id,queueOrder:10});
  assert.equal(selectPickupTask({profile:p,profiles:[p],tasks:[shared,explicit],runs:{one:{status:'terminal open'}},affinities:{},now:1000,eligible:available}).taskId,'explicit');
});

test('the same eligible owner gets its sticky family first within the 30 second grace', async () => {
  const {selectPickupTask,familyKey}=await policy(),p=profile('one');
  const sticky=task('sticky',{stickyMode:'on',queueOrder:5}),unrelated=task('older',{family:{name:'other',color:'cyan'},stickyMode:'on',queueOrder:1});
  const key=familyKey(sticky),affinities={[key]:{profileId:p.id,claimedAt:1000,lastTaskId:'previous',consecutive:1}};
  assert.equal(selectPickupTask({profile:p,profiles:[p],tasks:[unrelated,sticky],runs:{one:{status:'terminal open'}},affinities,now:2000,eligible:available}).taskId,'sticky');
});

test('expired, banked, closed, failed, or unverified owners do not hold a shared task', async () => {
  const {selectPickupTask,familyKey}=await policy(),owner=profile('owner'),other=profile('other');
  const sticky=task('sticky',{stickyMode:'on',queueOrder:1}),fallback=task('fallback',{family:{name:'unrelated',color:'cyan'},queueOrder:2});
  const key=familyKey(sticky),affinities={[key]:{profileId:'owner',claimedAt:1000,lastTaskId:'previous',consecutive:1}};
  const choose=(profiles,runs,now=2000,eligible=available)=>selectPickupTask({profile:other,profiles,tasks:[sticky,fallback],runs,affinities,now,eligible}).taskId;
  assert.equal(choose([owner,other],{owner:{status:'terminal open'},other:{status:'terminal open'}},31001),'sticky');
  assert.equal(choose([{...owner,active:false},other],{owner:{status:'terminal open'},other:{status:'terminal open'}}),'sticky');
  assert.equal(choose([owner,other],{owner:{status:'closed'},other:{status:'terminal open'}}),'sticky');
  assert.equal(choose([owner,other],{owner:{status:'failed'},other:{status:'terminal open'}}),'sticky');
  assert.equal(choose([owner,other],{owner:{status:'terminal open'},other:{status:'terminal open'}},2000,(t,p)=>p.id==='owner'?undefined:true),'sticky');
});

test('an eligible live owner briefly defers the same sticky task to other bots', async () => {
  const {selectPickupTask,familyKey}=await policy(),owner=profile('owner'),other=profile('other');
  const sticky=task('sticky',{stickyMode:'on'}),fallback=task('fallback',{family:{name:'unrelated',color:'cyan'},queueOrder:2});
  const key=familyKey(sticky),affinities={[key]:{profileId:owner.id,claimedAt:1000,lastTaskId:'previous',consecutive:1}};
  const result=selectPickupTask({profile:other,profiles:[owner,other],tasks:[sticky,fallback],runs:{owner:{status:'terminal open'},other:{status:'terminal open'}},affinities,now:2000,eligible:available});
  assert.equal(result.taskId,'fallback');
});

test('release, dependencies, locks and model eligibility remain hard gates', async () => {
  const {selectPickupTask}=await policy(),p=profile('one');
  const blocked=task('blocked',{stickyMode:'on',dependsOn:['missing'],queueOrder:1}),held=task('held',{releasedForPickup:false,queueOrder:2}),locked=task('locked',{queueOrder:3}),ineligible=task('ineligible',{queueOrder:4});
  const result=selectPickupTask({profile:p,profiles:[p],tasks:[blocked,held,locked,ineligible],runs:{one:{status:'terminal open'}},affinities:{},now:1000,lockedTaskIds:new Set(['locked']),eligible:t=>t.id!=='ineligible'});
  assert.equal(result,null);
});

test('after three consecutive sticky picks an older eligible unrelated task goes first', async () => {
  const {selectPickupTask,familyKey}=await policy(),p=profile('one');
  const sticky=task('sticky',{stickyMode:'on',queueOrder:5}),older=task('older',{family:{name:'other',color:'cyan'},stickyMode:'off',queueOrder:1});
  const key=familyKey(sticky),affinities={[key]:{profileId:p.id,claimedAt:1000,lastTaskId:'third',consecutive:3}};
  assert.equal(selectPickupTask({profile:p,profiles:[p],tasks:[sticky,older],runs:{one:{status:'terminal open'}},affinities,now:2000,eligible:available}).taskId,'older');
});

test('successful affinity recording advances one profile and resets its previous family streak', async () => {
  const {recordSuccessfulAffinity}=await policy();
  const old={docs:{profileId:'one',claimedAt:1000,lastTaskId:'previous',consecutive:3},api:{profileId:'one',claimedAt:1000,lastTaskId:'old-api',consecutive:1},other:{profileId:'two',claimedAt:1000,lastTaskId:'x',consecutive:2}};
  const next=recordSuccessfulAffinity({affinities:old,key:'docs',profileId:'one',taskId:'next',now:2000});
  assert.deepEqual(next.docs,{profileId:'one',claimedAt:2000,lastTaskId:'next',consecutive:4});
  assert.equal(next.api.consecutive,0);
  assert.equal(next.other.consecutive,2);
  assert.equal(old.api.consecutive,1);
  const nonsticky=recordSuccessfulAffinity({affinities:next,key:null,profileId:'one',taskId:'unrelated',now:3000});
  assert.equal(nonsticky.docs.consecutive,0);
  assert.equal(nonsticky.api.consecutive,0);
});

test('family defaults inherit only from a valid explicit setting and malformed modes reject', async () => {
  const {familyKey,resolvedSticky}=await policy(),t=task('t');
  const key=familyKey(t);
  assert.equal(resolvedSticky(t,{}),false);
  assert.equal(resolvedSticky(t,{[key]:{sticky:true}}),true);
  assert.equal(resolvedSticky({...t,stickyMode:'off'},{[key]:{sticky:true}}),false);
  assert.throws(()=>resolvedSticky({...t,stickyMode:'maybe'},{}),/Sticky mode/);
  assert.throws(()=>resolvedSticky(t,{[key]:{sticky:'yes'}}),/boolean/);
});

test('a non-sticky successful pickup clears the profile consecutive count without adding affinity', async () => {
  const {recordSuccessfulAffinity}=await policy();
  const result=recordSuccessfulAffinity({affinities:{family:{profileId:'one',claimedAt:1,lastTaskId:'prior',consecutive:3}},key:null,profileId:'one',taskId:'ordinary',now:2});
  assert.equal(result.family.consecutive,0);
});

test('manager pollWork leaves family affinity unchanged until work completes',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{createHash}=require('node:crypto');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-sticky-poll-'));
 try{
  const now=100_000,manager=new RanchManager({dir,native:{},now:()=>now});
  manager.pickupPaused=false;
  manager.profiles.push({id:'cedar',nickname:'Cedar',active:true,slot:0,autoPickup:true,preferredModel:'fixed-model',role:'generalist',contextPolicy:'per-task'});
  const saved=manager.saveTask({title:'Update docs',projectFolder:dir,instructions:'Update the guide.',family:{name:'Docs',color:'mint'},stickyMode:'on',releasedForPickup:true,expectedRevision:manager.taskRevision});
  const token='c'.repeat(64),launchId='launch-1';
  manager.runs.cedar={launchId,status:'terminal open',runtimeKeyHash:createHash('sha256').update(token).digest('hex')};
  let dispatched;
  manager.dispatchTask=async(...args)=>{dispatched=args;return {accepted:true};};
  assert.deepEqual(await manager.pollWork('cedar',launchId,token,true),{accepted:true,wakeAcknowledged:false});
  assert.equal(dispatched[0],saved.id);
  const key=(await policy()).familyKey(saved);
  assert.equal(manager.familyAffinities[key],undefined);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('manager autoPickup leaves affinity unchanged after a failed dispatch',async()=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-sticky-auto-'));
 try{
  const manager=new RanchManager({dir,native:{},now:()=>100_000});
  manager.pickupPaused=false;
  manager.profiles.push({id:'birch',nickname:'Birch',active:true,slot:1,autoPickup:true,preferredModel:'fixed-model',role:'generalist',contextPolicy:'per-task'});
  const saved=manager.saveTask({title:'Update docs',projectFolder:dir,instructions:'Update the guide.',family:{name:'Docs',color:'mint'},stickyMode:'on',releasedForPickup:true,expectedRevision:manager.taskRevision});
  manager.dispatchTask=async()=>{throw Error('Native launch failed.');};
  assert.equal(await manager.autoPickup(),null);
  const key=(await policy()).familyKey(saved);
  assert.equal(manager.familyAffinities[key],undefined);
  assert.match(manager.tasks[0].pickupBlockReason,/Native launch failed/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('durable family preference outlives grace while fallback, assignment and fairness remain authoritative',async()=>{const {selectPickupTask,familyKey}=await policy(),owner=profile('owner'),other=profile('other');const related=task('related',{family:{id:'family-id',name:'Docs',color:'mint'},queueOrder:5}),older=task('older',{family:null,queueOrder:1});const key=familyKey(related),affinities={[key]:{profileId:owner.id,claimedAt:1,durable:true,consecutive:1}};const args={profile:owner,profiles:[owner,other],tasks:[related,older],runs:{owner:{status:'terminal open'},other:{status:'terminal open'}},affinities,now:90000,eligible:available};assert.equal(selectPickupTask(args).taskId,'related');assert.equal(selectPickupTask({...args,profile:other,tasks:[related]}).taskId,'related');assert.equal(selectPickupTask({...args,eligible:t=>t.id!=='related'}).taskId,'older');assert.equal(selectPickupTask({...args,tasks:[related,{...older,assignedProfileId:owner.id}]}).reason,'explicit-queue');affinities[key].consecutive=3;assert.equal(selectPickupTask(args).reason,'fairness');});
