const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');

test('PM onboarding resolves the bundled skill and CLI from any execution folder',async()=>{
 const {readPmSkill,pmAgentInstructions}=await import('../sources/omp-bot-companion/pm-skill.mjs');
 const skill=readPmSkill();assert.equal(skill.name,'bot-ranch-pm');assert.equal(fs.readFileSync(skill.path,'utf8'),skill.text);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-pm-role-'));
 try{const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');const m=new RanchManager({dir,native:{}});
 const pm=m.library.role('pm');assert.equal(pm.name,'Project Manager');
 const instructions=m.effectiveRole({role:'pm'}).instructions;
 assert.ok(instructions.includes(skill.path));assert.ok(instructions.includes(pmAgentInstructions()));
 const roleFile=path.join(m.library.root,'roles/pm/agent.md');fs.writeFileSync(roleFile,'Custom PM instructions.');
 const {BotLibrary}=await import('../sources/omp-bot-companion/bot-library.mjs');new BotLibrary(m.library.root);
 assert.equal(fs.readFileSync(roleFile,'utf8'),'Custom PM instructions.');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('legacy built-in PM label migrates while custom role instructions survive',async()=>{
 const {BotLibrary}=await import('../sources/omp-bot-companion/bot-library.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-pm-label-'));
 try{const library=new BotLibrary(dir);library.saveRole({id:'pm',name:'Product Manager',model:'claude',instructions:'Keep these custom directions.'});new BotLibrary(dir);const role=library.role('pm');assert.equal(role.name,'Project Manager');assert.equal(role.model,'claude');assert.equal(role.instructions,'Keep these custom directions.');library.saveRole({...role,name:'My coordinator',instructions:role.instructions,instructionsPath:''});new BotLibrary(dir);assert.equal(library.role('pm').name,'My coordinator');}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
});
