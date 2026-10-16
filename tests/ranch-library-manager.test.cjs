const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
async function fixture(){const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-library-manager-'));const launches=[];const native={checks:async()=>[],status:async()=> 'closed',launch:async(p,r,mode,history,a)=>{launches.push({p,r,mode,history,a});return {pid:123,started:'638000000000000000'};}};return {RanchManager,dir,launches,native,m:new RanchManager({dir,native})};}
test('home stores profiles, imports reserve bots and removes only a safely retired profile',async()=>{
 const {dir,m,RanchManager,native}=await fixture();const home=path.join(dir,'my-bots');m.setHome(home);const p=m.saveProfile({nickname:'Cedar',folder:dir,color:15,role:'reviewer',contextPolicy:'per-task'});
 assert.ok(fs.existsSync(path.join(home,'bots',p.id,'profile.json')));assert.equal(new RanchManager({dir,native}).profiles[0].id,p.id);
 await assert.rejects(()=>m.deleteProfile(p.id,p.revision),/retire/i);const retired=m.setMembership(p.id,false,p.revision);await m.deleteProfile(p.id,retired.revision);assert.equal(m.profiles.length,0);assert.equal(fs.existsSync(path.join(home,'bots',p.id,'profile.json')),false);
});
test('legacy context policies use fresh automatic attempts and clean keeps history',async()=>{
 const {dir,m,launches}=await fixture();let p=m.saveProfile({nickname:'Cedar',folder:dir,color:0,role:'reviewer',contextPolicy:'per-session'});
 const start=async (title,projectFolder=dir)=>{const t=m.saveTask({title,projectFolder,instructions:'Inspect files',humanReview:true,expectedRevision:m.taskRevision}),a=await m.dispatchTask(t.id,p.id,t.revision),launch=launches.at(-1);m.claimTaskRuntime(p.id,a.launchId,a.id,launch.a.token);m.recordTaskRuntimeEvent(p.id,a.launchId,a.id,launch.a.token,{type:'agent_start'});m.recordTaskRuntimeEvent(p.id,a.launchId,a.id,launch.a.token,{type:'agent_end',summary:'Checked'});m.reviewTask(t.id,m.tasks.find(x=>x.id===t.id).revision,'accept');return launch;};
 const first=await start('First');assert.equal(first.p.homeFolder,m.library.root);assert.match(first.p.roleInstructions,/Bot home/);assert.ok(fs.existsSync(path.join(m.library.root,'handovers',first.a.id+'.md')));const second=await start('Second');assert.notEqual(second.history,first.history);assert.equal(second.mode,'task');
 const other=path.join(dir,'other');fs.mkdirSync(other);const away=await start('Elsewhere',other),back=await start('Back');assert.notEqual(away.history,first.history);assert.notEqual(back.history,first.history);
 await m.cleanProfile(p.id);const third=await start('Third');assert.notEqual(third.history,first.history);
 p=m.saveProfile({...m.profiles[0],contextPolicy:'per-task',expectedRevision:m.profiles[0].revision});const fourth=await start('Fourth'),fifth=await start('Fifth');assert.notEqual(fourth.history,fifth.history);
});
