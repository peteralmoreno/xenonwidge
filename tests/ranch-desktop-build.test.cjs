const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {stageRanch}=require('../tools/build.cjs');

test('desktop staging produces an offline bundle and installer copies only listed release files',async()=>{
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-desktop-build-'));
 try {
  const output=path.join(temporary,'release');
  stageRanch(path.join(__dirname,'../sources'),output,{desktop:true,runtime:false});
  const release=JSON.parse(fs.readFileSync(path.join(output,'release.json'),'utf8'));
  for(const name of ['main.cjs','preload.cjs','window-policy.cjs','renderer.js','recovery.js','ai-sync.js','recovery.html','ai-sync.html','index.html','dock.css','icon.png','icon.ico','THIRD-PARTY-NOTICES.txt'])assert.ok(release.files.includes('desktop/resources/app/'+name),name);
  const bundle=fs.readFileSync(path.join(output,'desktop/resources/app/renderer.js'),'utf8');
  assert.ok(bundle.length>10000);assert.ok(!fs.existsSync(path.join(output,'desktop/resources/app/renderer.js.map')));
  fs.writeFileSync(path.join(output,'desktop/resources/app/private-key.txt'),'PRIVATE');
  const {installRelease}=await import('../sources/omp-bot-companion/install.mjs');
  const installed=path.join(temporary,'installed');installRelease(output,installed);
  assert.ok(fs.existsSync(path.join(installed,'versions',release.version,'desktop/resources/app/main.cjs')));
  assert.equal(fs.existsSync(path.join(installed,'versions',release.version,'desktop/resources/app/private-key.txt')),false);
  assert.match(fs.readFileSync(path.join(installed,'launcher.mjs'),'utf8'),/open-desktop\.mjs/);
  assert.ok(fs.existsSync(path.join(installed,'botRanch-cli.cmd')));assert.match(fs.readFileSync(path.join(installed,'launcher-cli.mjs'),'utf8'),/ranch-cli\.mjs/);
  assert.ok(release.files.includes('agent-api.mjs'));assert.ok(release.files.includes('agent-catalog.json'));assert.ok(release.files.includes('ranch-cli.mjs'));assert.ok(release.files.includes('pickup-policy.mjs'));
 } finally {fs.rmSync(temporary,{recursive:true,force:true});}
});
test('desktop launch selects bundled executable with browser fallback for source/older releases',async()=>{
 const {launchCommand}=await import('../sources/omp-bot-companion/open-desktop.mjs');
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-desktop-launch-'));
 try {
  const fallback=launchCommand(temporary,'test-node');assert.equal(fallback.command,'test-node');assert.equal(fallback.detached,false);assert.deepEqual(fallback.args,[path.join(temporary,'open-setup.mjs')]);
  fs.mkdirSync(path.join(temporary,'desktop'));fs.writeFileSync(path.join(temporary,'desktop/botRanch.exe'),'fixture');
  if(process.platform==='win32'){const desktop=launchCommand(temporary);assert.equal(desktop.command,path.join(temporary,'desktop/botRanch.exe'));assert.equal(desktop.detached,true);assert.equal(desktop.options.windowsHide,true);assert.equal(desktop.options.stdio,'ignore');}
 } finally {fs.rmSync(temporary,{recursive:true,force:true});}
});
