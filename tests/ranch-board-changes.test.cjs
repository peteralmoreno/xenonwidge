const {test}=require('node:test');const assert=require('node:assert/strict');
const {mkdtempSync,rmSync,mkdirSync}=require('node:fs');const os=require('node:os'),path=require('node:path');
const temp=()=>mkdtempSync(path.join(os.tmpdir(),'ranch-ai-changes-'));
test('previews held drafts and pending metadata without mutating source state',async()=>{
 const {previewChanges}=await import('../sources/omp-bot-companion/board-changes.mjs');const dir=temp();
 try{const snapshot={taskRevision:4,tasks:[{id:'t1',revision:4,title:'Old',projectFolder:dir,instructions:'Keep meaning',status:'todo',releasedForPickup:false,assignedProfileId:null,queueOrder:0,dependsOn:[],attempts:[]}],profiles:[{id:'p1'}]};const original=JSON.stringify(snapshot);
 const plan=previewChanges({snapshot,changeSetId:'draft-1',actor:'cleanup agent',expectedTaskRevision:4,now:()=>100,operations:[{type:'task.update',id:'t1',expectedRevision:4,changes:{title:'Clear title',acceptanceCriteria:'Define completion.'}},{type:'task.create',title:'Draft',projectFolder:dir,instructions:''}]});
 assert.deepEqual(plan.conflicts,[]);assert.equal(plan.before.tasks[0].title,'Old');assert.equal(plan.after.tasks[0].title,'Clear title');assert.equal(plan.after.tasks[1].releasedForPickup,false);assert.equal(plan.after.tasks[1].status,'todo');assert.equal(JSON.stringify(snapshot),original);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('rejects the whole batch for stale, active, invalid, or unknown operations',async()=>{
 const {previewChanges}=await import('../sources/omp-bot-companion/board-changes.mjs');const dir=temp();
 try{const task={id:'t1',revision:2,title:'Old',projectFolder:dir,instructions:'x',status:'todo',releasedForPickup:false,assignedProfileId:null,queueOrder:0,dependsOn:[],attempts:[]};const snapshot={taskRevision:4,tasks:[task],profiles:[]};
 assert.throws(()=>previewChanges({snapshot,changeSetId:'stale',actor:'agent',expectedTaskRevision:3,operations:[{type:'task.update',id:'t1',expectedRevision:2,changes:{title:'Changed'}}]}),/revision|conflict/i);
 assert.throws(()=>previewChanges({snapshot,changeSetId:'mixed',actor:'agent',expectedTaskRevision:4,operations:[{type:'task.update',id:'t1',expectedRevision:2,changes:{title:'Changed'}},{type:'task.update',id:'missing',expectedRevision:1,changes:{title:'Bad'}}]}),/unknown/i);
 assert.throws(()=>previewChanges({snapshot:{...snapshot,tasks:[{...task,attempts:[{state:'unresolved'}]}]},changeSetId:'busy',actor:'agent',expectedTaskRevision:4,operations:[{type:'task.update',id:'t1',expectedRevision:2,changes:{title:'Changed'}}]}),/active|unresolved/i);
 assert.throws(()=>previewChanges({snapshot,changeSetId:'unknown-field',actor:'agent',expectedTaskRevision:4,operations:[{type:'task.update',id:'t1',expectedRevision:2,changes:{title:'Changed',status:'done'}}]}),/field|unsupported|status/i);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('validates dependency cycles and cross-project-independent family settings before apply',async()=>{
 const {previewChanges}=await import('../sources/omp-bot-companion/board-changes.mjs');const {familyKey}=await import('../sources/omp-bot-companion/pickup-policy.mjs');const dir=temp();
 try{const tasks=[{id:'a',revision:1,title:'A',projectFolder:dir,instructions:'a',status:'todo',releasedForPickup:false,assignedProfileId:null,queueOrder:0,dependsOn:['b'],attempts:[]},{id:'b',revision:2,title:'B',projectFolder:dir,instructions:'b',status:'todo',releasedForPickup:false,assignedProfileId:null,queueOrder:1,dependsOn:[],attempts:[]}];
 assert.throws(()=>previewChanges({snapshot:{taskRevision:2,tasks,profiles:[],familyPolicies:{}},changeSetId:'cycle',actor:'agent',expectedTaskRevision:2,operations:[{type:'task.update',id:'b',expectedRevision:2,changes:{dependsOn:['a']}}]}),/cycle|depend/i);
 const key=familyKey({family:{name:'Shared'},projectFolder:dir});const plan=previewChanges({snapshot:{taskRevision:2,tasks,profiles:[],familyPolicies:{}},changeSetId:'family',actor:'agent',expectedTaskRevision:2,operations:[{type:'family.setting',key,sticky:true}]});assert.equal(plan.after.familyPolicies[key].sticky,true);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('staging preserves private runtime fields internally and previews redact them',async()=>{
 const {previewChanges}=await import('../sources/omp-bot-companion/board-changes.mjs');const dir=temp();
 try{const task={id:'secret-task',revision:1,title:'Private',projectFolder:dir,instructions:'x',status:'todo',releasedForPickup:false,assignedProfileId:null,queueOrder:0,dependsOn:[],attempts:[{id:'attempt',state:'failed',dispatchTokenHash:'private-digest',roleInstructions:'private instructions'}]};const plan=previewChanges({snapshot:{taskRevision:1,tasks:[task],profiles:[]},changeSetId:'preserve-secret-fields',actor:'agent',expectedTaskRevision:1,operations:[{type:'task.update',id:task.id,expectedRevision:1,changes:{title:'Updated'}}]});
 assert.equal(plan.stagedTasks[0].attempts[0].dispatchTokenHash,'private-digest');assert.equal(plan.stagedTasks[0].attempts[0].roleInstructions,'private instructions');assert.equal(JSON.stringify(plan.before).includes('private-digest'),false);assert.equal(JSON.stringify(plan.after).includes('private instructions'),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('apply persists exactly once, is idempotent, and leaves memory untouched on failed authoritative write',async()=>{
 const {previewChanges,applyChanges}=await import('../sources/omp-bot-companion/board-changes.mjs');const dir=temp();
 try{const snapshot={taskRevision:0,tasks:[],profiles:[],aiState:{access:'organize',audit:[],receipts:{}}},plan=previewChanges({snapshot,changeSetId:'create-once',actor:'agent',expectedTaskRevision:0,operations:[{type:'task.create',title:'Draft',projectFolder:dir,instructions:'Inspect.'}],now:()=>10});const before=JSON.stringify(snapshot);let calls=0;
 await assert.rejects(()=>applyChanges({snapshot,preview:plan,expectedTaskRevision:0,aiState:{access:'organize',audit:[],receipts:{}},persistTransaction:async()=>{calls++;throw Error('disk full');},now:()=>11}),/disk full/);assert.equal(JSON.stringify(snapshot),before);assert.equal(calls,1);
 const commit=async staged=>{calls++;Object.assign(snapshot,{tasks:staged.tasks,taskRevision:staged.taskRevision,aiState:staged.aiState});return {exportWarnings:[]};};const first=await applyChanges({snapshot,preview:plan,expectedTaskRevision:0,aiState:snapshot.aiState,persistTransaction:commit,now:()=>12});const duplicate=await applyChanges({snapshot,preview:plan,expectedTaskRevision:0,aiState:snapshot.aiState,persistTransaction:commit,now:()=>13});assert.equal(calls,2);assert.equal(first.receiptId,duplicate.receiptId);assert.equal(snapshot.tasks.length,1);assert.equal(snapshot.tasks[0].releasedForPickup,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
