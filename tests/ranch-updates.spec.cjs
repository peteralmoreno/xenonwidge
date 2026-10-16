const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
async function setup(page,initialUpdates=[]){
 const profile={id:'p1',nickname:'Piper',active:true,color:1,design:'pipeline',role:'generalist',status:'connected',workCheckSupported:true,revision:1};
 const session={id:'bot1',profileId:'p1',managed:true,color:1,project:'Piper',state:'reading',label:'Reading',lastSeen:Date.now(),metadata:{folder:'D:/work'}};
 const data={profiles:[profile],tasks:[],roles:[{id:'generalist',name:'Generalist'}],updates:initialUpdates,pickupPaused:true};const calls=[];
 await page.setViewportSize({width:1688,height:900});
 await page.addInitScript(()=>localStorage.setItem('omp-bot.key','a'.repeat(64)));
 await page.route('http://127.0.0.1:43822/**',route=>{
  const url=new URL(route.request().url()),headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(route.request().method()==='POST')calls.push({path:url.pathname,body:route.request().postDataJSON()});
  return route.fulfill({headers,json:url.pathname==='/state'?{app:'omp-bot',version:1,sessions:[session]}:url.pathname==='/control/state'?data:{message:'Work check acknowledged.'}});
 });
 await page.route('http://ranch.test/**',route=>{const file=path.join(__dirname,'../sources/omp-bot',new URL(route.request().url()).pathname==='/'?'index.html':new URL(route.request().url()).pathname);return route.fulfill({path:file});});
 // Explicit file route avoids relying on a development server.
 await page.route('http://ranch.test/',route=>route.fulfill({path:path.join(__dirname,'../sources/omp-bot/index.html'),contentType:'text/html'}));
 await page.goto('http://ranch.test/');await expect(page.locator('#desk-name')).toHaveText('Piper');return {data,calls,session};
}
test('design preview saves independently and profile design reaches ranch and portrait',async({page})=>{
 const h=await setup(page);await expect(page.locator('.bot .pipeline')).toHaveCount(1);await expect(page.locator('#desk-portrait .pipeline')).toHaveCount(1);
 await page.locator('#desk-defaults').click();await expect(page.locator('#profile-design')).toHaveValue('pipeline');await page.locator('#profile-design').selectOption('classic');await expect(page.locator('#profile-design-preview .pipeline')).toHaveCount(0);await page.getByRole('button',{name:'Save defaults'}).click();await expect.poll(()=>h.calls.find(c=>c.path==='/control/profile')?.body.design).toBe('classic');expect(h.calls.find(c=>c.path==='/control/profile').body.role).toBe('generalist');
});
test('all updates stays deselected through polling, safely renders posts and returns to bot',async({page})=>{
 const h=await setup(page);h.data.updates=[{id:'u1',profileId:'p1',taskId:null,text:'<img src=x onerror=alert(1)>\nWorking safely',at:Date.now(),kind:'progress'}];
 await expect(page.locator('#desk-update-text')).toHaveText(h.data.updates[0].text);await page.locator('#all-updates').click();await expect(page.locator('#ranch-feed')).toBeVisible();await expect(page.locator('.feed-card')).toHaveCount(1);await page.waitForTimeout(2800);await expect(page.locator('.bot[aria-pressed=true]')).toHaveCount(0);await expect(page.locator('.feed-card img')).toHaveCount(0);await page.locator('#feed-return').click();await expect(page.locator('#desk-name')).toHaveText('Piper');
});
test('feed caps entries and preserves older reading until new updates are requested',async({page})=>{
 const h=await setup(page);h.data.updates=Array.from({length:65},(_,i)=>({id:'u'+i,profileId:'p1',text:'Milestone '+i,at:Date.now()-i*1000}));await page.locator('#all-updates').click();await expect(page.locator('.feed-card')).toHaveCount(50);
 const feed=page.locator('#feed-list');await feed.evaluate(el=>el.scrollTop=300);const before=await feed.evaluate(el=>el.scrollTop);h.data.updates.unshift({id:'new',profileId:'p1',text:'New milestone',at:Date.now()+1000});await expect(page.locator('#feed-new')).toHaveText('1 new update');expect(await feed.evaluate(el=>el.scrollTop)).toBe(before);await page.locator('#feed-new').click();await expect(page.locator('.feed-card').first()).toContainText('New milestone');expect(await feed.evaluate(el=>el.scrollTop)).toBe(0);
});
test('held shake checks work once and suppresses selection/drop, cancellation never checks',async({page})=>{
 const h=await setup(page);await page.locator('#all-updates').click();const bot=page.locator('.bot');await bot.dispatchEvent('pointerdown',{isPrimary:true,pointerId:1,clientX:300,clientY:300});for(const x of [335,300,335,300,335])await bot.dispatchEvent('pointermove',{pointerId:1,clientX:x,clientY:300});await bot.dispatchEvent('pointerup',{pointerId:1,clientX:300,clientY:300});await bot.dispatchEvent('click');await expect.poll(()=>h.calls.filter(c=>c.path==='/control/profile/check-work').length).toBe(1);await expect(page.locator('.bot[aria-pressed=true]')).toHaveCount(0);
 await bot.dispatchEvent('pointerdown',{isPrimary:true,pointerId:2,clientX:300,clientY:300});await bot.dispatchEvent('pointercancel',{pointerId:2,clientX:300,clientY:300});for(const x of [335,300,335,300])await bot.dispatchEvent('pointermove',{pointerId:2,clientX:x,clientY:300});expect(h.calls.filter(c=>c.path==='/control/profile/check-work')).toHaveLength(1);
});
test('Pipeline Desk and task controls stop tracking without closing terminals, and resume the same job',async({page})=>{
 const h=await setup(page);h.session.pipeline=true;h.data.tasks=[{id:'api-task',title:'External export',revision:7,status:'doing',assignedProfileId:'p1',pipeline:{intervalMinutes:5},pipelineRun:{jobId:'job-42',status:'running',sleeping:true},attempts:[{id:'attempt-1',state:'running'}]}];
 await expect(page.locator('#desk-now')).toHaveText('External export');await expect(page.locator('#desk-model')).toHaveText('API monitor');await expect(page.locator('#desk-context')).toHaveText('No model tokens');await expect(page.locator('#desk-check-work')).toHaveText('Resume monitoring (1 hour)');
 await page.locator('#desk-check-work').click();await expect.poll(()=>h.calls.filter(c=>c.path==='/control/task/pipeline').length).toBe(1);expect(h.calls.at(-1).body).toEqual({id:'api-task',expectedRevision:7,action:'resume',minutes:60});
 const confirmations=[];page.on('dialog',async dialog=>{confirmations.push(dialog.message());await dialog.accept();});await page.locator('#desk-stop').click();await expect.poll(()=>h.calls.filter(c=>c.path==='/control/task/pipeline'&&c.body.action==='stop').length).toBe(1);
 await page.locator('#tasks-tab').click();await page.locator('.task-card').getByRole('button',{name:'Stop tracking',exact:true}).click();await expect.poll(()=>h.calls.filter(c=>c.path==='/control/task/pipeline'&&c.body.action==='stop').length).toBe(2);await page.locator('.task-card').getByRole('button',{name:'Resume monitoring (1 hour)',exact:true}).click();await expect.poll(()=>h.calls.filter(c=>c.path==='/control/task/pipeline'&&c.body.action==='resume').length).toBe(2);
 expect(confirmations).toHaveLength(2);for(const text of confirmations)expect(text).toContain('does NOT cancel');expect(h.calls.some(c=>c.path==='/control/task/stop')).toBe(false);
});
test('Tasks pane hides bot details and keeps the first task reachable for touch assignment',async({page})=>{
 const h=await setup(page);await page.setViewportSize({width:1688,height:696});h.data.tasks=[{id:'touch-task',title:'Touch to start',projectFolder:'D:/work',revision:1,status:'todo',assignedProfileId:null,attempts:[]}];await page.locator('#tasks-tab').click();await expect(page.locator('.task-card')).toHaveCount(1);await expect(page.locator('#desk-title-row')).toBeHidden();await expect(page.locator('#desk-scroll')).toBeHidden();
 await page.locator('.task-bot-source').evaluate(el=>{const r=el.getBoundingClientRect();el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9,pointerType:'touch',isPrimary:true,clientX:r.x+8,clientY:r.y+8}));});await expect(page.locator('#task-notice')).toContainText('Drag onto a task');
 const hit=await page.locator('.task-card').evaluate(el=>{const r=el.getBoundingClientRect();return {center:{x:r.x+r.width/2,y:r.y+r.height/2},target:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.task-card')?.dataset.taskId};});expect(hit).toMatchObject({target:'touch-task'});
});
test('Pipeline Desk and Ranch feed fit Large and XL displays',async({page})=>{
 const h=await setup(page);h.session.pipeline=true;h.session.state='ready';h.session.label='Monitoring asleep — last checked just now';h.data.tasks=[{id:'export',title:'Export project archive',projectFolder:'D:/work',revision:1,status:'doing',assignedProfileId:'p1',pipelineRun:{jobId:'job-42',status:'running',sleeping:true},attempts:[{id:'a1',state:'running'}]}];h.data.updates=Array.from({length:8},(_,i)=>({id:'post'+i,profileId:'p1',taskId:'export',at:Date.now()-i*60000,text:i?'Export status checked. The external job is still running.':'Monitoring asleep. Resume when you want to check the same export job.',kind:'progress'}));await expect(page.locator('#desk-now')).toHaveText('Export project archive');await page.emulateMedia({reducedMotion:'reduce'});
 for(const [size,width,height]of [['large',1688,696],['xl',2547,676]]){await page.setViewportSize({width,height});await expect(page.locator('#desk-update-text')).toBeVisible();await expect(page.locator('#desk-portrait .pipeline')).toHaveCount(1);await expect(page.locator('#desk-terminal')).toBeHidden();const postFits=await page.locator('#desk-update-text').evaluate(el=>el.getBoundingClientRect().bottom<=document.getElementById('desk-scroll').getBoundingClientRect().bottom);expect(postFits).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);await page.screenshot({path:`artifacts/omp-bot/pipeline-desk-${size}.png`});await page.locator('#all-updates').click();await expect(page.locator('#feed-list')).toBeVisible();await expect(page.locator('.feed-time').first()).toHaveText(/just now|m ago/);const list=await page.locator('#feed-list').boundingBox();expect(list.height).toBeGreaterThan(150);expect(list.y+list.height).toBeLessThanOrEqual(height);await page.screenshot({path:`artifacts/omp-bot/ranch-feed-${size}.png`});await page.locator('#feed-return').click();}
});
test('failed Pipeline can prepare a held new attempt without starting a new external job',async({page})=>{
 const h=await setup(page);h.data.tasks=[{id:'failed-api',title:'Failed export',revision:8,status:'blocked',assignedProfileId:'p1',pipelineRun:{jobId:'failed-job',status:'failed'},attempts:[{id:'failed-attempt',state:'failed'}]},{id:'unknown-api',title:'Unresolved export',revision:9,status:'blocked',assignedProfileId:'p1',pipelineRun:{status:'unresolved'},attempts:[{id:'unknown-attempt',state:'unresolved'}]}];
 await page.locator('#tasks-tab').click();const failed=page.locator('.task-card').filter({hasText:'Failed export'}),unknown=page.locator('.task-card').filter({hasText:'Unresolved export'});await expect(failed.getByRole('button',{name:'Prepare new attempt',exact:true})).toBeVisible();await expect(unknown.getByRole('button',{name:/retry|Prepare new attempt/i})).toHaveCount(0);
 let confirmation='';page.once('dialog',async dialog=>{confirmation=dialog.message();await dialog.accept();});await failed.getByRole('button',{name:'Prepare new attempt',exact:true}).click();await expect.poll(()=>h.calls.find(c=>c.path==='/control/task/retry')?.body).toEqual({id:'failed-api',expectedRevision:8});expect(confirmation).toBe('This job failed. Prepare a new attempt? Starting it later submits a new external job.');expect(h.calls.some(c=>c.path==='/control/task/start')).toBe(false);
});

test('fresh bot posts speak briefly without replaying history or sending controls',async({page})=>{
 const h=await setup(page,[{id:'history',profileId:'p1',text:'Already in the feed',at:Date.now(),kind:'progress'}]);
 await expect(page.locator('#desk-update-text')).toHaveText('Already in the feed');
 await expect(page.locator('.bot-speech')).toHaveCount(0);
 h.data.updates.push({id:'fresh',profileId:'p1',text:'<img src=x> Checking the import now.',at:Date.now(),kind:'progress'});
 const bubble=page.locator('.bot-speech');await expect(bubble).toHaveText('<img src=x> Checking the import now.');await expect(bubble.locator('img')).toHaveCount(0);
 expect(await bubble.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
 const before=await page.locator('.bot').getAttribute('data-state');await page.locator('#all-updates').click();await expect(bubble).toBeVisible();expect(await page.locator('.bot').getAttribute('data-state')).toBe(before);
 await page.screenshot({path:'artifacts/omp-bot/bot-speech-feed.png'});
 await expect(bubble).toHaveCount(0,{timeout:11000});await page.waitForTimeout(2800);await expect(bubble).toHaveCount(0);expect(h.calls).toEqual([]);
});

test('speech stays inside the ranch edges and replaces an older tweet',async({page})=>{
 const h=await setup(page);await page.emulateMedia({reducedMotion:'reduce'});
 h.data.updates.push({id:'edge1',profileId:'p1',text:'A short report.',at:Date.now(),kind:'progress'});await expect(page.locator('.bot-speech')).toHaveText('A short report.');await page.locator('#all-updates').click();await page.screenshot({path:'artifacts/omp-bot/ranch-speech-preview.png'});
 h.data.updates.push({id:'edge2',profileId:'p1',text:'Latest report: '+ 'checking an unusually long project path '.repeat(12),at:Date.now()+1,kind:'progress'});
 await expect(page.locator('.bot-speech')).toContainText('Latest report:');await expect(page.locator('.bot-speech')).toHaveCount(1);
 for(const [width,height]of [[1688,696],[2547,676],[600,600]]){await page.setViewportSize({width,height});await expect.poll(async()=>page.locator('.bot-speech').evaluate(el=>{const r=el.getBoundingClientRect(),s=document.getElementById('scene').getBoundingClientRect();return r.left>=s.left&&r.right<=s.right&&r.top>=s.top&&r.bottom<=s.bottom;})).toBe(true);}
 h.session.state='offline';await expect(page.locator('.bot-speech')).toHaveCount(0);expect(h.calls).toEqual([]);
});
