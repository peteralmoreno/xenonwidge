const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('model selection honors explicit eligibility and saved preference without silent fallback',async()=>{
 const {resolveTaskModel}=await import('../sources/omp-bot-companion/runtime-policy.mjs');const models=[{provider:'openai-codex',id:'gpt-model'},{provider:'anthropic',id:'claude-model'},{provider:'deepseek',id:'deepseek-chat'}];
 assert.equal(resolveTaskModel({models,current:models[0],preferredModel:'claude',eligibility:['gpt','claude']}).id,'claude-model');assert.equal(resolveTaskModel({models,current:models[0],preferredModel:'deepseek',eligibility:['gpt']}).id,'gpt-model');assert.throws(()=>resolveTaskModel({models:[models[0]],current:models[0],preferredModel:'auto',eligibility:['claude']}),/available/i);assert.throws(()=>resolveTaskModel({models:[models[0]],current:models[0],preferredModel:'claude'}),/available/i);
});
test('read-only tool policy allows only workspace-contained filesystem reads',async()=>{
 const {evaluateReadOnlyTool}=await import('../sources/omp-bot-companion/runtime-policy.mjs');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-readonly-policy-')),outside=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-readonly-outside-'));fs.writeFileSync(path.join(dir,'README.md'),'safe');
 assert.equal(evaluateReadOnlyTool({toolName:'read',input:{path:'README.md'},cwd:dir,workspace:dir}),null);for(const toolName of ['bash','edit','write','mcp__drive__write'])assert.match(evaluateReadOnlyTool({toolName,input:{path:'README.md',command:'echo unsafe'},cwd:dir,workspace:dir}).reason,/not allow|not allowed/i);assert.match(evaluateReadOnlyTool({toolName:'read',input:{path:path.join(outside,'secret.txt')},cwd:dir,workspace:dir}).reason,/workspace/i);assert.match(evaluateReadOnlyTool({toolName:'read',input:{path:'https://example.com'},cwd:dir,workspace:dir}).reason,/workspace/i);
});
test('reasoning requests must be explicitly supported by the live model',async()=>{
 const {resolveTaskEffort}=await import('../sources/omp-bot-companion/runtime-policy.mjs');assert.equal(resolveTaskEffort(['low','medium','high'],'medium'),'medium');assert.equal(resolveTaskEffort(['low','medium'],'auto'),null);assert.throws(()=>resolveTaskEffort(['low','medium'],'high'),/does not support/i);
});
