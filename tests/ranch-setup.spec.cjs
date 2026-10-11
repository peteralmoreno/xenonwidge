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
  await page.getByLabel('Context policy').selectOption('per-session');
  await page.getByLabel('Request read-only execution').check();
  await page.getByLabel('Enable automatic pickup').check();
  await page.getByRole('button',{name:'Save resident'}).click();
  expect(manager.profiles[0]).toMatchObject({role:'researcher',personality:'curious',contextPolicy:'per-session',readOnly:true,autoPickup:true});
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

test('Large Ranch keeps tasks in the Desk and delegates authoring, role models, and cleanup to the companion',async({page})=>{
 const native={checks:async()=>[],status:async()=> 'live',focus:async()=> 'focused'};
 const {dir,manager,server,url}=await serverFixture(native);
 try{
  const profile=manager.saveProfile({nickname:'Brick',folder:dir,color:0,role:'researcher',preferredModel:'claude'});
  manager.runs[profile.id]={launchId:'launch',status:'connected',pid:321,started:'638000000000000000',requestedAt:Date.now(),runtimeKeyHash:'c'.repeat(64)};
  manager.observe({id:'session',profileId:profile.id,launchId:'launch',terminal:{pid:321,started:'638000000000000000'},state:'writing',label:'Writing files',startedAt:Date.now(),finishedAt:null,metadata:{provider:'Claude',model:'configured-model',context:{used:40,capacity:100}},preview:{role:'assistant',text:'Visible result excerpt',at:Date.now()}});
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
  await expect(page.locator('#desk-preview')).toHaveText('Visible result excerpt');await expect(page.locator('#desk-check-work')).toHaveText('Poke / Check for tasks');await page.locator('#desk-check-work').click();await expect(page.locator('#focus-result')).toContainText('when idle');expect(manager.runs[profile.id].checkRequested).toBe(true);expect(manager.profiles.find(p=>p.id===profile.id).autoPickup).toBe(false);
  const scene=await page.locator('#scene').boundingBox(),desk=await page.locator('#ranch-desk').boundingBox();
  expect(desk.x).toBeGreaterThan(scene.x+scene.width);
  expect(scene.width/scene.height).toBeLessThanOrEqual(2.96);
  expect(scene.height).toBeGreaterThan(500);
  await page.locator('#ranch-desk').evaluate(el=>el.scrollTop=0);
  await page.screenshot({path:'artifacts/bot-ranch/ranch-xl-desk-preview.png'});
  await expect(page.locator('#desk-terminal')).toBeInViewport();
  await page.setViewportSize({width:1688,height:696});
  await expect(page.locator('#desk-defaults')).toBeInViewport();
  await expect(page.locator('#desk-terminal')).toBeInViewport();
  await page.screenshot({path:'artifacts/bot-ranch/ranch-large-desk-preview.png'});
  await page.locator('#desk-defaults').click();
  await expect(page.locator('#profile-editor')).toBeVisible();
  await page.locator('#profile-cancel').click();
   await expect(page.locator('#scene')).toBeVisible();
   await expect(page.locator('#task-add')).toHaveCount(0);
   expect(await page.locator('#tasks-view').evaluate(el=>el.parentElement.id)).toBe('ranch-desk');
   manager.saveTask({title:'Inspect the tests',projectFolder:dir,instructions:'Review the existing test suite and report findings.',acceptanceCriteria:'List the relevant tests.',reasoningRequest:'medium',modelEligibility:['gpt'],assignedProfileId:profile.id,expectedRevision:manager.taskRevision});
   await page.locator('#tasks-tab').click();
   await expect(page.locator('#tasks-view')).toBeVisible();
   await page.screenshot({path:'artifacts/bot-ranch/ranch-tasks-desk.png'});
  await expect(page.locator('.task-card h3')).toHaveText('Inspect the tests');
  const start=page.getByRole('button',{name:'Start Inspect the tests'});await expect(start).toBeEnabled();await start.click();
  await expect(page.locator('#task-notice')).toContainText('already has an open terminal');expect(manager.tasks[0].attempts.length).toBe(0);
   expect(manager.tasks[0]).toMatchObject({status:'todo',reasoningRequest:'medium',modelEligibility:['gpt'],assignedProfileId:profile.id});
  await page.getByRole('tab',{name:'Ranch'}).click();
  await page.locator('#desk-finish-rest').click();
  await expect.poll(()=>manager.profiles[0].autoPickup).toBe(false);
  await page.locator('#desk-enable-pickup').click();
  await expect.poll(()=>manager.profiles[0].autoPickup).toBe(true);
  await page.locator('#desk-finish-rest').click();
  await expect.poll(()=>manager.profiles[0].autoPickup).toBe(false);
  await expect(page.locator('#desk-clean')).toBeDisabled();
  await expect(page.locator('.drop-zones')).toHaveCount(0);
  await page.getByRole('button',{name:'Bot Bank',exact:true}).click();
   await page.getByRole('button',{name:'Edit defaults'}).click();
   await expect(page.locator('#profile-model')).toHaveCount(0);
   await expect(page.locator('#profile-role option')).toHaveCount(5);
   const instructionsFile=path.join(dir,'custom.md');fs.writeFileSync(instructionsFile,'Use the ranch conventions.');
   await page.getByLabel('Context').selectOption('per-session');
   await page.getByLabel('Optional instructions file').fill(instructionsFile);
  await page.getByRole('button',{name:'Save defaults'}).click();
   await expect.poll(()=>manager.profiles[0].contextPolicy).toBe('per-session');
   expect(manager.profiles[0].instructionsPath).toBe(instructionsFile);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('task-view bot assignment does not start work; Start keeps verified dispatch checks',async({page})=>{
 const native={checks:async()=>[],status:async()=> 'closed',launch:async(_p,_r,mode,history,attempt)=>({pid:880,started:'638000000000000000'})};
 const {dir,manager,server,url}=await serverFixture(native);try{
  const profile=manager.saveProfile({nickname:'Brick',folder:dir,color:0});manager.runs[profile.id]={launchId:'existing',status:'connected',pid:321,started:'638000000000000000',requestedAt:Date.now()};
  manager.observe({id:'session',profileId:profile.id,launchId:'existing',terminal:{pid:321,started:'638000000000000000'},state:'ready',label:'Ready',startedAt:Date.now(),finishedAt:null});const controlKey=manager.provisionControlKey();
  await page.setViewportSize({width:1688,height:696});await page.goto(url+'/ui/#pair='+'a'.repeat(64));await page.locator('#connect').click();await expect(page.getByLabel('Connection key',{exact:true})).toHaveValue('a'.repeat(64));await page.locator('#pair-form button[type=submit]').click();
  const task=manager.saveTask({title:'Start from the ranch',projectFolder:dir,instructions:'Do the small task.',expectedRevision:0});await page.getByRole('tab',{name:'Tasks'}).click();await expect(page.locator('.task-card h3')).toHaveText(task.title);
  await page.evaluate(()=>{const source=document.querySelector('.task-bot-source'),card=document.querySelector('.task-card'),dataTransfer=new DataTransfer();source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));card.dispatchEvent(new DragEvent('dragover',{bubbles:true,dataTransfer}));card.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer}));});await expect.poll(()=>manager.tasks[0].assignedProfileId).toBe(profile.id);expect(manager.tasks[0].attempts).toHaveLength(0);const start=page.getByRole('button',{name:'Start Start from the ranch'});await start.click();await expect.poll(()=>manager.tasks[0].attempts.length).toBe(1);expect(manager.tasks[0].attempts[0].state).toBe('awaiting-runtime');expect(manager.tasks[0].status).toBe('todo');
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('touch hold previews a task drop and assigns on release',async({page})=>{
 const native={checks:async()=>[],status:async()=> 'closed',launch:async()=>({pid:881,started:'638000000000000000'})};const {dir,manager,server,url}=await serverFixture(native);try{
  const profile=manager.saveProfile({nickname:'Brick',folder:dir,color:0});manager.runs[profile.id]={launchId:'existing',status:'connected',pid:321,started:'638000000000000000',requestedAt:Date.now()};manager.observe({id:'session',profileId:profile.id,launchId:'existing',terminal:{pid:321,started:'638000000000000000'},state:'ready',label:'Ready',startedAt:Date.now(),finishedAt:null});const controlKey=manager.provisionControlKey();
  await page.setViewportSize({width:1688,height:696});await page.goto(url+'/ui/#pair='+'a'.repeat(64));await page.locator('#connect').click();await expect(page.getByLabel('Connection key',{exact:true})).toHaveValue('a'.repeat(64));await page.locator('#pair-form button[type=submit]').click();const task=manager.saveTask({title:'Touch to start',projectFolder:dir,instructions:'Do the task.',expectedRevision:0});await page.getByRole('tab',{name:'Tasks'}).click();await expect(page.locator('.task-card h3')).toHaveText(task.title);
  const source=page.locator('.task-bot-source'),card=page.locator('.task-card').filter({hasText:task.title});await source.evaluate(el=>{const r=el.getBoundingClientRect();el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9,pointerType:'touch',isPrimary:true,clientX:r.x+8,clientY:r.y+8}));});await page.waitForTimeout(400);await card.evaluate(el=>{const r=el.getBoundingClientRect();document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:9,pointerType:'touch',isPrimary:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));});await expect(page.locator('#task-notice')).toContainText('Release to assign');await card.evaluate(el=>{const r=el.getBoundingClientRect();document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:9,pointerType:'touch',isPrimary:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));});await expect.poll(()=>manager.tasks[0].assignedProfileId).toBe(profile.id);expect(manager.tasks[0].attempts).toHaveLength(0);
  const canceled=manager.saveTask({title:'Cancel touch drag',projectFolder:dir,instructions:'Do not dispatch this.',expectedRevision:manager.taskRevision});const canceledCard=page.locator('.task-card').filter({hasText:canceled.title});await expect(canceledCard).toBeVisible();await source.evaluate(el=>{const r=el.getBoundingClientRect();el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:10,pointerType:'touch',isPrimary:true,clientX:r.x+8,clientY:r.y+8}));});await page.waitForTimeout(400);await canceledCard.evaluate(el=>{const r=el.getBoundingClientRect();document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:10,pointerType:'touch',isPrimary:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2}));});await canceledCard.evaluate(el=>document.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:10,pointerType:'touch',isPrimary:true})));await expect(canceledCard).not.toHaveAttribute('data-drop-target','true');expect(manager.tasks.find(t=>t.id===canceled.id).attempts).toHaveLength(0);expect(manager.tasks.find(t=>t.id===canceled.id).assignedProfileId).toBeNull();
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('blocked attempts retry only after the previous terminal is verified closed',async({page})=>{
 let terminal='live',launches=0,token='';const native={checks:async()=>[],status:async()=>terminal,launch:async(_p,_r,_mode,_history,attempt)=>{launches++;token=attempt.token;return {pid:890+launches,started:'638000000000000000'};}};const {dir,manager,server,url}=await serverFixture(native);try{
  const profile=manager.saveProfile({nickname:'Brick',folder:dir,color:0}),task=manager.saveTask({title:'Recover with review',projectFolder:dir,instructions:'Make the change.',assignedProfileId:profile.id,expectedRevision:0}),attempt=await manager.dispatchTask(task.id,profile.id,task.revision);manager.claimTaskRuntime(profile.id,manager.runs[profile.id].launchId,attempt.id,token);manager.recordTaskRuntimeEvent(profile.id,manager.runs[profile.id].launchId,attempt.id,token,{type:'agent_start'});manager.recordTaskRuntimeEvent(profile.id,manager.runs[profile.id].launchId,attempt.id,token,{type:'agent_error',error:'Provider failed.'});const controlKey=manager.provisionControlKey();
  await page.goto(url+'/ui/#pair='+'a'.repeat(64));await page.locator('#connect').click();await expect(page.getByLabel('Connection key',{exact:true})).toHaveValue('a'.repeat(64));await page.locator('#pair-form button[type=submit]').click();await page.getByRole('tab',{name:'Tasks'}).click();const card=page.locator('.task-card').filter({hasText:task.title});await expect(card.getByRole('button',{name:'Verify and retry'})).toBeVisible();await card.getByRole('button',{name:'Verify and retry'}).click();await expect(page.locator('#task-notice')).toContainText('still open');expect(launches).toBe(1);
  terminal='closed';await card.getByRole('button',{name:'Verify and retry'}).click();await expect.poll(()=>launches).toBe(2);expect(manager.tasks[0].attempts).toHaveLength(2);expect(manager.tasks[0].attempts[0].state).toBe('failed');expect(manager.tasks[0].attempts[1].state).toBe('awaiting-runtime');
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
