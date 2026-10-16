const {test,expect}=require('@playwright/test');
const path=require('node:path');
const esbuild=require('esbuild');

const source=path.join(__dirname,'../sources/omp-bot-desktop');
let bundle;
test.beforeAll(async()=>{
 bundle=(await esbuild.build({entryPoints:[path.join(source,'renderer.tsx')],bundle:true,write:false,format:'iife',jsx:'automatic'})).outputFiles[0].text;
});

test('sidebar explains automatic continuity with waiting text and preferred-bot markers',async({page})=>{
 await page.setViewportSize({width:500,height:560});
 await page.addInitScript(()=>{
  window.stickyCalls=[];
  const task={id:'t1',revision:4,title:'Polish the handoff',status:'todo',releasedForPickup:true,queueOrder:1,
   projectFolder:'D:/work/app',family:{name:'Docs',color:'mint'},stickyMode:'inherit',sticky:true,familyStickyDefault:true,
   preferredProfileId:'p1',waitingReason:'Waiting for Cedar’s handoff window.',instructions:'Review and update the guide.',attempts:[]};
  window.stickyTask=task;
  window.stickyData={pickupPaused:false,taskRevision:8,homeFolder:'D:/work/app',familyPolicies:{},roles:[],
   profiles:[{id:'p1',revision:1,nickname:'Cedar',color:1,active:true,status:'connected',autoPickup:true}],
   tasks:[task,{id:'t2',revision:1,title:'Current work',status:'doing',assignedProfileId:'p1',attempts:[{state:'running'}]}],updates:[]};
  window.botRanch={state:async()=>window.stickyData,action:async(name,body)=>{window.stickyCalls.push({name,body});return {result:{}};},
   openPage:async()=>{},window:async(action,value)=>{window.stickyInfo||={expanded:false,pinned:true,side:'left',mode:'icue',length:'short'};if(action==='expand')window.stickyInfo.expanded=value;return window.stickyInfo;}};
 });
 await page.route('http://sticky.test/**',route=>{
  const file=new URL(route.request().url()).pathname;
  if(file==='/renderer.js')return route.fulfill({body:bundle,contentType:'text/javascript'});
  return route.fulfill({path:path.join(source,file==='/'?'index.html':file.slice(1))});
 });
 await page.goto('http://sticky.test/');
 await page.getByRole('button',{name:'Open task panel',exact:true}).click();
 await expect(page.getByRole('region',{name:'botRanch panel'})).toBeVisible();
 await page.getByRole('button',{name:/Polish the handoff/}).click();
 await expect(page.getByRole('heading',{name:'Polish the handoff'})).toBeVisible();
 await expect(page.getByText('Waiting for Cedar’s handoff window.')).toBeVisible();
 await expect(page.getByText(/Preferred bot: Cedar/)).toBeVisible();
 await expect(page.getByLabel('Sticky preference')).toHaveCount(0);
 await expect(page.getByText(/Automatic continuity/)).toBeVisible();
 expect(await page.evaluate(()=>window.stickyCalls)).toEqual([]);
 await page.getByRole('button',{name:'Back to Board'}).click();
 await page.getByRole('button',{name:'New task'}).first().click();
 await page.getByLabel('Task title',{exact:true}).fill('Sticky draft');
 await page.getByLabel('Instructions',{exact:true}).fill('Keep the sticky override.');await page.getByRole('combobox',{name:'Task station',exact:true}).selectOption('researching');
 await expect(page.getByLabel('Sticky preference')).toHaveCount(0);
 await page.getByRole('button',{name:'Save task',exact:true}).click();
 expect(await page.evaluate(()=>window.stickyCalls.at(-1))).toMatchObject({name:'task-save',body:{title:'Sticky draft',stickyMode:'inherit',workStation:'researching'}});
 await page.getByRole('button',{name:'Bots',exact:true}).click();
 await expect(page.getByRole('list',{name:'Cedar current and next work'})).toContainText('Current: Current work');
 await expect(page.getByRole('list',{name:'Cedar current and next work'})).toContainText('Up next: Polish the handoff');
 await expect(page.getByRole('list',{name:'Cedar current and next work'})).toContainText('Sticky');
});

test('Full Board sticky edits reject stale revisions and preserve fields in the editor',async({page})=>{
 const fs=require('node:fs'),os=require('node:os');
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-sticky-board-'));
 const manager=new RanchManager({dir,native:{checks:async()=>[],status:async()=> 'closed'}});
 const saved=manager.saveTask({title:'Update the guide',projectFolder:manager.library.root,instructions:'Keep the notes clear.',workStation:'writing',family:{name:'Guides',color:'mint'},stickyMode:'on',expectedRevision:0});
 const server=createBridge({key:'a'.repeat(64),adminKey:'b'.repeat(64),manager});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 try{
  await page.goto(url+'/board/#admin='+'b'.repeat(64));
  const card=page.locator('[data-column=inbox] .board-task').filter({hasText:'Update the guide'});
  await card.getByRole('button',{name:'Details'}).click();
  await expect(page.locator('#details-content select').nth(0)).toHaveValue('on');
  await expect(page.locator('#details-content select').nth(1)).toHaveValue('inherit');
  manager.saveTask({...manager.tasks[0],title:'Guide updated elsewhere',expectedRevision:saved.revision});
  await expect(page.locator('#details-changed')).toBeVisible();
  await page.locator('#details-content select').nth(0).selectOption('off');
  await expect(page.locator('#notice')).toContainText('Conflict:');
  expect(manager.tasks[0].stickyMode).toBe('on');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  const freshCard=page.locator('[data-column=inbox] .board-task').filter({hasText:'Guide updated elsewhere'});
  await freshCard.getByRole('button',{name:'Details'}).click();
  await page.locator('#details-content select').nth(0).selectOption('off');
  await expect.poll(()=>manager.tasks[0].stickyMode).toBe('off');
  await expect(page.locator('#notice')).toHaveText('Task sticky preference updated.');
  await page.locator('#details-content select').nth(1).selectOption('on');
  await expect.poll(()=>Object.values(manager.familyPolicies)[0]?.sticky).toBe(true);
  await expect(page.locator('#notice')).toHaveText('Family sticky default updated.');
  await page.getByRole('button',{name:'Reset default and clear preference'}).click();
  await expect.poll(()=>Object.keys(manager.familyPolicies).length).toBe(0);
  await expect(page.locator('#notice')).toHaveText('Family default and preference reset.');
  await page.getByRole('button',{name:'Edit task',exact:true}).click();
  await expect(page.locator('#task-sticky-mode')).toHaveValue('off');await expect(page.locator('#task-station')).toHaveValue('writing');await page.locator('#task-station').selectOption('researching');
  await page.getByLabel('Task title').fill('Guide saved with sticky off');
  await page.getByRole('button',{name:'Save task',exact:true}).click();
  expect(manager.tasks[0].stickyMode).toBe('off');expect(manager.tasks[0].workStation).toBe('researching');
  await expect(page.locator('[data-column=inbox] .board-task')).toContainText('Guide saved with sticky off');
 }finally{
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
