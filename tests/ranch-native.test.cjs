const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn, spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const run = (file,args) => { const r=spawnSync(file,args,{encoding:'utf8',windowsHide:true,timeout:15000}); assert.equal(r.status,0,r.stderr||r.stdout||String(r.error));return r.stdout.trim(); };
const pause = ms => new Promise(r=>setTimeout(r,ms));
async function readState(file){for(let i=0;i<100;i++){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{}await pause(20);}throw Error('Fixture state did not become readable');}

test('compiled native controls enforce identity and preserve focus in isolated window fixtures', {skip:process.platform!=='win32'}, async()=>{
  assert.ok(fs.existsSync(path.join(root,'tools/build-native.cjs')), 'native helper must be built from checked-in source');
  const {buildNative,compile}=require('../tools/build-native.cjs');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-native-'));
  const children=[];
  try {
    buildNative(path.join(root,'sources/omp-bot-companion'),dir);
    const helper=path.join(dir,'bin/Terminal-Control.exe');
    assert.equal(run(helper,['probe']),'ready:1');
    compile(path.join(__dirname,'fixtures/NativeWindow.cs'),path.join(dir,'mintty.exe'),['System.Windows.Forms.dll']);
    fs.copyFileSync(path.join(dir,'mintty.exe'),path.join(dir,'unrelated.exe'));
    async function fixture(name,mode='close'){
      const state=path.join(dir,name+'-'+children.length+'.json');
      const child=spawn(path.join(dir,name+'.exe'),[state,mode],{windowsHide:true,stdio:'ignore'});children.push(child);
      for(let i=0;i<100;i++){try{const b=JSON.parse(fs.readFileSync(state,'utf8'));return {child,state,b};}catch{}await pause(50);}throw Error('fixture did not create window');
    }
    const a=await fixture('mintty');
    const command=(action,b=a.b)=>run(helper,[action,'terminal',String(b.pid),b.started]);
    assert.equal(command('status'),'live');
    assert.equal(command('close',{...a.b,started:String(BigInt(a.b.started)+1n)}),'closed');
    assert.equal(command('status'),'live','wrong start time must not close a window');
    const other=await fixture('unrelated');
    assert.equal(command('close',other.b),'closed');
    assert.equal(other.child.exitCode,null,'wrong process name must not close a window');
    const before=(await readState(a.state)).foreground;
    assert.equal(command('raise'),'raised');
    await pause(120);
    assert.equal((await readState(a.state)).foreground,before,'raising must not activate the fixture');
    assert.equal(command('close'),'closed');
    assert.equal(command('status'),'closed');
    const minimized=await fixture('mintty','minimized');
    const minimizedForeground=(await readState(minimized.state)).foreground;
    assert.equal(command('raise',minimized.b),'raised');
    await pause(120);
    assert.equal((await readState(minimized.state)).foreground,minimizedForeground,'restoring must not activate the fixture');
    assert.equal(command('close',minimized.b),'closed');
    const headless=await fixture('mintty','headless');
    assert.equal(command('status',headless.b),'unavailable');
    assert.equal(command('close',headless.b),'unavailable');
    assert.equal(headless.child.exitCode,null,'no owned window means no mutation');
    const stubborn=await fixture('mintty','ignore');
    const began=Date.now(); assert.equal(command('close',stubborn.b),'attention');
    assert.ok(Date.now()-began<6500,'close must time out');
    assert.equal(command('status',stubborn.b),'live');
    for(const file of ['Terminal-Control.ps1','Focus-Terminal.ps1']) fs.copyFileSync(path.join(root,'sources/omp-bot-companion',file),path.join(dir,file));
    const ps=path.join(dir,'clm.ps1');
    fs.writeFileSync(ps,`$ExecutionContext.SessionState.LanguageMode = 'ConstrainedLanguage'\n& '${path.join(dir,'Terminal-Control.ps1').replaceAll("'","''")}' -Action status -TerminalPid ${stubborn.b.pid} -Started '${stubborn.b.started}'\n& '${path.join(dir,'Focus-Terminal.ps1').replaceAll("'","''")}' -TerminalPid ${stubborn.b.pid} -Started '${stubborn.b.started}'\n`);
    assert.equal(run('powershell.exe',['-NoProfile','-NonInteractive','-File',ps]),'live\r\nraised');
  } finally { for(const child of children) { if(child.exitCode===null) child.kill(); } await pause(150); fs.rmSync(dir,{recursive:true,force:true}); }
});

test('managed launcher reports CLM startup errors to stderr without making a corrupt binding', {skip:process.platform!=='win32'},()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-launch-clm-'));
  try {
    const launcher=path.join(dir,'Start-Bot-Ranch.ps1'),binding=path.join(dir,'binding.json');
    fs.copyFileSync(path.join(root,'sources/omp-bot-companion/Start-Bot-Ranch.ps1'),launcher);
    const script=path.join(dir,'test.ps1');
    fs.writeFileSync(script,`$ExecutionContext.SessionState.LanguageMode = 'ConstrainedLanguage'\n& '${launcher.replaceAll("'","''")}' -Project '${dir.replaceAll("'","''")}' -BindingFile '${binding.replaceAll("'","''")}' -Managed\nexit $LASTEXITCODE`);
    const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-File',script],{encoding:'utf8',windowsHide:true,timeout:5000});
    assert.equal(r.status,1);
    assert.match(r.stderr,/Native helper missing/);
    assert.equal(fs.existsSync(binding),false);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('release ZIP helper builds from source and archives under CLM', {skip:process.platform!=='win32'},()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-zip-'));
  try {
    const {buildZip}=require('../tools/build-native.cjs');
    assert.equal(typeof buildZip,'function','ZIP build must avoid dynamic PowerShell APIs');
    const helper=buildZip(path.join(dir,'ZipRelease.exe'));
    const input=path.join(dir,'input');fs.mkdirSync(input);fs.writeFileSync(path.join(input,'hello.txt'),'round trip');
    const script=path.join(dir,'test.ps1'),zip=path.join(dir,'out.zip');
    fs.writeFileSync(script,`$ExecutionContext.SessionState.LanguageMode = 'ConstrainedLanguage'\n& '${path.join(root,'tools/zip-release.ps1').replaceAll("'","''")}' -Source '${input}' -Destination '${zip}' -Helper '${helper}'\nexit $LASTEXITCODE`);
    run('powershell.exe',['-NoProfile','-NonInteractive','-File',script]);
    assert.equal(fs.readFileSync(zip).readUInt32LE(),0x04034b50);
    run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath '${zip}' -DestinationPath '${path.join(dir,'extract')}'`]);
    assert.equal(fs.readFileSync(path.join(dir,'extract/hello.txt'),'utf8'),'round trip');
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('CLM launcher preserves quoted argv, last palette color, identity files and process wait', {skip:process.platform!=='win32'},()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-launch-success-'));
  try {
    const {buildNative,compile}=require('../tools/build-native.cjs');
    buildNative(path.join(root,'sources/omp-bot-companion'),dir);
    const launcher=path.join(dir,'Start-Bot-Ranch.ps1'),binding=path.join(dir,'binding.json'),capture=path.join(dir,'argv.txt');
    fs.copyFileSync(path.join(root,'sources/omp-bot-companion/Start-Bot-Ranch.ps1'),launcher);
    const git=path.join(dir,'Programs/Git/usr/bin');fs.mkdirSync(git,{recursive:true});
    compile(path.join(__dirname,'fixtures/NativeWindow.cs'),path.join(git,'mintty.exe'),['System.Windows.Forms.dll']);
    fs.writeFileSync(path.join(git,'bash.exe'),'unused fixture');
    const script=path.join(dir,'test.ps1');
    fs.writeFileSync(script,`$env:ProgramFiles = '${path.join(dir,'Programs')}'\n$ExecutionContext.SessionState.LanguageMode = 'ConstrainedLanguage'\n& '${launcher.replaceAll("'","''")}' -Project '${dir}' -BindingFile '${binding}' -Managed\nexit $LASTEXITCODE`);
    const nickname='A "quote" trail\\';
    const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!['path','programfiles','localappdata'].includes(key.toLowerCase())));
    Object.assign(env,{PATH:path.join(process.env.WINDIR,'System32'),ProgramFiles:path.join(dir,'Programs'),LOCALAPPDATA:dir,OMP_BOT_NICKNAME:nickname,OMP_BOT_COLOR:'31',RANCH_NATIVE_ARGV:capture});
    const r=spawnSync(path.join(process.env.WINDIR,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-File',script],{env,encoding:'utf8',windowsHide:true,timeout:12000});
    assert.equal(r.status,0,r.stderr||r.stdout||String(r.error));
    assert.equal(r.stderr,'');
    const argv=fs.readFileSync(capture,'utf8').trimEnd().split(/\r?\n/);
    assert.equal(argv[argv.indexOf('--Title')+1],'Bot Ranch - '+nickname);
    assert.equal(argv[argv.indexOf('--cr')+1],'#151515');
    assert.equal(argv[argv.indexOf('--bg')+1],'21,21,21');
    assert.match(JSON.parse(fs.readFileSync(capture+'.binding','utf8')).started,/^\d{18}$/);
    assert.match(JSON.parse(fs.readFileSync(binding+'.controller','utf8')).started,/^\d{18}$/);
    assert.equal(fs.existsSync(binding),false,'wait and cleanup must finish after the fixture exits');
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
