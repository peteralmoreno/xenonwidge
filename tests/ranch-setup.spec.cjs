const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

async function serverFixture(native={}){
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-setup-'));
 const manager=new RanchManager({dir,native});
 const server=createBridge({key:'a'.repeat(64),adminKey:'b'.repeat(64),manager});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {dir,manager,server,url:'http://127.0.0.1:'+server.address().port};
}

test('settings keep terminal safeguards and provide one widget connection key',async({page})=>{
 let live=false;const starts=[];
 const native={checks:async()=>[{name:'Test runtime',ok:true,detail:'Ready'}],status:async()=>live?'live':'closed',launch:async(p,r,mode)=>{live=true;starts.push(mode);return {pid:321,started:'638000000000000000'};},focus:async()=> 'focused',close:async()=>{live=false;return 'closed';}};
 const {dir,manager,server,url}=await serverFixture(native);
 try{
  await page.goto(url+'/setup/#admin='+'b'.repeat(64));
  await expect(page.locator('#connection')).toHaveText('Companion online');
  expect(new URL(page.url()).hash).toBe('');
  await page.locator('[data-panel=bots]').click();
  await page.getByRole('button',{name:'+ Add resident'}).click();
  await page.getByLabel('Nickname').fill('Brick');
  await page.getByLabel('Project folder').fill(dir);
  await page.getByRole('button',{name:'Save resident'}).click();
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.getByRole('combobox',{name:'Role',exact:true}).selectOption('researcher');
  await page.getByLabel('Personality').selectOption('curious');
  await page.getByLabel('Request read-only execution').check();
  await page.getByLabel('Enable automatic pickup').check();
  await page.getByRole('button',{name:'Save resident'}).click();
  expect(manager.profiles[0]).toMatchObject({role:'researcher',personality:'curious',contextPolicy:'automatic',readOnly:true,autoPickup:true});
  await page.getByRole('button',{name:'Launch / Resume'}).click();
  await expect.poll(()=>starts).toEqual(['resume']);
  await page.getByRole('button',{name:'New session',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Interrupt this terminal?'})).toBeVisible();
  expect(starts).toEqual(['resume']);
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await expect.poll(()=>starts).toEqual(['resume','new']);
  await page.locator('[data-panel=connection]').click();
  await page.getByRole('button',{name:'Show key',exact:true}).click();
  await expect(page.locator('#pair-key')).toHaveValue('a'.repeat(64));
  await expect(page.locator('#control-key')).toHaveCount(0);
  await page.locator('[data-panel=diagnostics]').click();
  await page.getByRole('combobox',{name:/Sleep after/}).selectOption('60');
  await expect.poll(()=>manager.sleepSeconds).toBe(60);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('Large Ranch observes activity and leaves task and profile management in the companion',async({page})=>{
 let pulse;
 const native={checks:async()=>[],status:async()=> 'live',focus:async()=> 'focused'};
 const {dir,manager,server,url}=await serverFixture(native);
 try{
  const profile=manager.saveProfile({nickname:'Brick',folder:dir,color:0,role:'researcher',preferredModel:'claude'});
  manager.runs[profile.id]={launchId:'launch',status:'connected',pid:321,started:'638000000000000000',requestedAt:Date.now(),runtimeKeyHash:'c'.repeat(64)};
  manager.observe({id:'session',profileId:profile.id,launchId:'launch',terminal:{pid:321,started:'638000000000000000'},state:'writing',label:'Writing files',startedAt:Date.now(),finishedAt:null,metadata:{provider:'Claude',model:'configured-model',context:{used:40,capacity:100}},preview:{role:'assistant',text:'Visible result excerpt',at:Date.now()}});
  pulse=setInterval(()=>manager.observe({id:'session',profileId:profile.id,launchId:'launch',terminal:{pid:321,started:'638000000000000000'},state:'writing',label:'Writing files',startedAt:Date.now(),finishedAt:null,metadata:{provider:'Claude',model:'configured-model',context:{used:40,capacity:100}},preview:{role:'assistant',text:'Visible result excerpt',at:Date.now()}}),300);
  const controlKey=manager.provisionControlKey();
  await page.goto(url+'/ui/#pair='+'a'.repeat(64));
  const bot=page.locator('.bot');
  await expect(bot).toHaveAttribute('data-id','ranch-'+profile.id);
  await expect(bot).toHaveAttribute('data-state','writing');
  await page.locator('#project').click();
  await expect(page.locator('#full-status')).toContainText('Writing files');
  await expect(page.locator('#full-metadata')).toContainText('Claude');
  await expect(page.locator('#full-preview')).toContainText('Visible result excerpt');
  await page.getByRole('button',{name:'Open terminal',exact:true}).click();
  await expect(page.locator('#focus-result')).toContainText('Terminal brought forward');
  await page.locator('#details-close').click();
  await page.locator('#connect').click();
  await expect(page.getByLabel('Connection key',{exact:true})).toHaveValue('a'.repeat(64));
  await page.locator('#pair-form button[type=submit]').click();
  await page.setViewportSize({width:2547,height:676});
  await expect(page.locator('#desk-name')).toHaveText('Brick');
  await expect(page.locator('#desk-portrait svg')).toHaveCount(1);
  await expect(page.locator('#desk-role')).toHaveText('researcher');
  await expect(page.locator('#desk-model')).toContainText('configured-model');
  await expect(page.locator('#desk-context')).toContainText('40 / 100');
  await expect(page.locator('#desk-preview')).toHaveText('Visible result excerpt');await expect(page.locator('#desk-check-work')).toHaveCount(0);expect(manager.profiles.find(p=>p.id===profile.id).autoPickup).toBe(false);
  const scene=await page.locator('#scene').boundingBox(),desk=await page.locator('#ranch-desk').boundingBox();
  expect(desk.x).toBeGreaterThan(scene.x+scene.width);
  expect(scene.width/scene.height).toBeLessThanOrEqual(2.96);
  expect(scene.height).toBeGreaterThan(500);
  await page.locator('#ranch-desk').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:'artifacts/bot-ranch/ranch-xl-desk-preview.png'});
  await expect(page.locator('#desk-terminal')).toBeInViewport();
  await page.setViewportSize({width:1688,height:696});
  await expect(page.locator('#desk-defaults')).toHaveCount(0);
  await expect(page.locator('#desk-terminal')).toBeInViewport();
  await page.screenshot({path:'artifacts/bot-ranch/ranch-large-desk-preview.png'});
  await expect(page.locator('#scene')).toBeVisible();
  await expect(page.locator('#tasks-tab,#tasks-view,#profile-editor,#desk-clean,#desk-finish-rest,#desk-enable-pickup')).toHaveCount(0);
  const before=JSON.stringify(manager.profiles),attempts=manager.tasks.flatMap(t=>t.attempts||[]).length;
  await page.locator('#wake-bell').click();await expect(page.locator('#bell-menu')).toBeVisible();await page.locator('#bell-wake').click();await expect(page.locator('#wake-result')).toContainText('skipped');
  expect(JSON.stringify(manager.profiles)).toBe(before);expect(manager.tasks.flatMap(t=>t.attempts||[])).toHaveLength(attempts);
  expect(manager.runs[profile.id].checkRequested).not.toBe(true);
 }finally{clearInterval(pulse);server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('Ranch observes queued tasks without exposing dispatch, assignment or retry controls',async({page})=>{
 const {dir,manager,server,url}=await serverFixture({checks:async()=>[],status:async()=> 'closed'});
 try{
  const profile=manager.saveProfile({nickname:'Brick',folder:dir,color:0});
  manager.saveTask({title:'Inspect the tests',projectFolder:dir,instructions:'Inspect tests.',assignedProfileId:profile.id,releasedForPickup:true,expectedRevision:0});
  await page.setViewportSize({width:1688,height:696});await page.goto(url+'/ui/#pair='+'a'.repeat(64));
  await expect(page.locator('#desk-name')).toHaveText('Brick');await expect(page.locator('#desk-next')).toContainText('Inspect the tests');
  await expect(page.locator('.task-card,.task-bot-source,#tasks-tab,#desk-stop,#desk-clean')).toHaveCount(0);
  expect(manager.tasks[0].attempts).toHaveLength(0);expect(manager.tasks[0].assignedProfileId).toBe(profile.id);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
