const {test,expect}=require('@playwright/test');
const path=require('node:path');
test('four residents keep colors, expose overflow, and focus the tapped terminal',async({page})=>{
 let sessions=Array.from({length:5},(_,i)=>({id:'bot'+i,project:['Orchard','Workshop','Lookout','Studio','Outpost'][i],state:['ready','reading','researching','writing','waiting'][i],label:['Ready for a question','Reading files','Searching and researching','Writing files','Question waiting in terminal'][i],startedAt:Date.now(),finishedAt:null,lastSeen:Date.now(),canFocus:true}));
 const focused=[];
 await page.route('http://127.0.0.1:43822/**',r=>{if(r.request().url().endsWith('/focus')){focused.push(r.request().postDataJSON().id);return r.fulfill({json:{result:'focused'}});}return r.fulfill({json:{app:'omp-bot',version:1,capabilities:{focus:true},sessions}});});
 await page.route('http://ranch.test/**',r=>{const p=new URL(r.request().url()).pathname;return r.fulfill({path:path.join(__dirname,'../sources/omp-bot',p==='/'?'index.html':p)});});
 await page.goto('http://ranch.test/');await page.getByLabel('Pairing key').fill('a'.repeat(64));await page.getByRole('button',{name:'Connect',exact:true}).click();
 await expect(page.locator('.bot')).toHaveCount(4);
 const ids=await page.locator('.bot').evaluateAll(bs=>bs.map(b=>[b.dataset.id,b.dataset.color]));
 expect(new Set(ids.map(x=>x[1])).size).toBe(4);
 await expect(page.getByRole('button',{name:/Manage bots/})).toContainText('+1');
 sessions.reverse();await page.waitForTimeout(850);
 expect(await page.locator('.bot').evaluateAll(bs=>bs.map(b=>[b.dataset.id,b.dataset.color]))).toEqual(ids);
 await page.locator('.bot[data-id="bot1"]').dblclick();await expect.poll(()=>focused).toEqual(['bot1']);
 await page.reload();await expect(page.locator('.bot')).toHaveCount(4);
 expect(await page.locator('.bot').evaluateAll(bs=>bs.map(b=>[b.dataset.id,b.dataset.color]))).toEqual(ids);
 await page.getByRole('button',{name:/Manage bots/}).click();await page.getByLabel('Resident 1').selectOption('bot4');await page.getByRole('button',{name:'Done',exact:true}).click();
 await expect(page.locator('.bot[data-id="bot4"]')).toHaveCount(1);await expect(page.locator('.bot[data-id="bot0"]')).toHaveCount(0);
 await page.getByRole('button',{name:'Pause animation'}).click();await expect(page.locator('body')).toHaveAttribute('data-motion','off');
 for(const size of [{width:840,height:696},{width:696,height:840},{width:420,height:348}]){await page.setViewportSize(size);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);const boxes=await page.locator('.bot').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));for(const b of boxes){expect(b.w).toBeGreaterThanOrEqual(44);expect(b.h).toBeGreaterThanOrEqual(44);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.w).toBeLessThanOrEqual(size.width);}}
 for(const size of [{width:1688,height:696},{width:696,height:1688}]){
  await page.setViewportSize(size);
  const scene=await page.locator('#scene').boundingBox();
  expect(scene.width).toBeGreaterThan(size.width*.9);
  for(const bot of await page.locator('.bot').all()){
   const b=await bot.boundingBox();expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);
   expect(b.x).toBeGreaterThanOrEqual(scene.x);expect(b.x+b.width).toBeLessThanOrEqual(scene.x+scene.width);
   expect(b.y).toBeGreaterThanOrEqual(scene.y);expect(b.y+b.height).toBeLessThanOrEqual(scene.y+scene.height);
  }
  await expect(page.locator('#manage')).toBeInViewport();await expect(page.locator('#project')).toBeInViewport();
  if(size.width>size.height)await page.screenshot({path:'artifacts/bot-ranch/ranch-large-preview.png'});
 }
 await page.setViewportSize({width:840,height:696});await page.screenshot({path:'artifacts/bot-ranch/ranch-preview.png'});
 await page.getByRole('button',{name:/Manage bots/}).click();await page.getByLabel('Resident 1').selectOption('');await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('.bot[data-id="bot4"]')).toHaveCount(0);
 await page.reload();await expect(page.locator('.bot[data-id="bot4"]')).toHaveCount(0);
 await page.setViewportSize({width:420,height:348});expect((await page.getByRole('button',{name:/Manage bots/}).boundingBox()).height).toBeGreaterThanOrEqual(44);
 await page.locator('#project').click();await expect(page.getByRole('dialog',{name:'Terminal details'})).toBeVisible();await expect(page.locator('#full-project')).not.toBeEmpty();
});

test('status-only companions remain useful and a dropped connection sleeps every bot',async({page})=>{
 let online=true,focusCalls=0,state='ready';
 await page.route('http://127.0.0.1:43822/**',r=>{if(r.request().url().endsWith('/focus'))focusCalls++;return online?r.fulfill({json:{app:'omp-bot',version:1,sessions:[{id:'legacy',project:'Older terminal',state,label:state,startedAt:null,finishedAt:null,lastSeen:Date.now()}]}}):r.abort();});
 await page.route('http://ranch.test/**',r=>r.fulfill({path:path.join(__dirname,'../sources/omp-bot',new URL(r.request().url()).pathname==='/'?'index.html':new URL(r.request().url()).pathname)}));
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://ranch.test/');await page.getByLabel('Pairing key').fill('a'.repeat(64));await page.getByRole('button',{name:'Connect',exact:true}).click();
 const bot=page.locator('.bot');await expect(bot).toHaveAttribute('data-walking','false');await bot.dblclick();await expect(page.locator('#focus-result')).toContainText('Start-Bot-Ranch.cmd');expect(focusCalls).toBe(0);
 await page.emulateMedia({reducedMotion:'no-preference'});state='writing';await expect(bot).toHaveAttribute('data-mode','work');await expect(bot).toHaveAttribute('data-station','writing');await expect(bot).toHaveAttribute('data-hammering','false');
 online=false;await expect(bot).toHaveAttribute('data-state','offline');await expect(page.locator('#state')).toHaveText('Offline');
});
