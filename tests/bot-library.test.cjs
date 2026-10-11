const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
test('bot home seeds editable roles, preserves instructions, and roundtrips portable profiles without runtime credentials',async()=>{
 const {BotLibrary}=await import('../sources/omp-bot-companion/bot-library.mjs');const root=fs.mkdtempSync(path.join(os.tmpdir(),'bot-library-'));const lib=new BotLibrary(root);
 assert.equal(lib.roles().length,5);const role=lib.role('reviewer');assert.ok(role.instructions.includes('Review'));
 const file=path.join(root,'custom.md');fs.writeFileSync(file,'Check invariants first.');lib.saveRole({id:'custom',name:'Careful reviewer',model:'claude',instructionsPath:file});assert.equal(lib.role('custom').instructions,'Check invariants first.');
 lib.saveProfile({id:'abc-123',nickname:'Cedar',color:14,role:'custom',folder:root,active:true,sessionKey:'private',controlKey:'secret'});
 const restored=new BotLibrary(root).profiles()[0];assert.equal(restored.color,14);assert.equal(restored.role,'custom');assert.equal(restored.active,false);assert.equal(restored.controlKey,undefined);
 assert.throws(()=>lib.saveRole({id:'../escape',name:'bad',model:'auto',instructions:'bad'}),/identifier/i);
 fs.unlinkSync(file);assert.throws(()=>lib.role('custom'),/instruction/i);
 lib.deleteProfile('abc-123');assert.equal(lib.profiles().length,0);
});
