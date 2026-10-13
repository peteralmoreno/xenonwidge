const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');

async function nextRefresh(page){
 const response=await page.waitForResponse(response=>response.url().endsWith('/admin/state')&&response.ok());
 await response.finished();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

async function withBoard(page,run){
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-deeplink-'));
 const manager=new RanchManager({dir,native:{checks:async()=>[]}});
 const saved=manager.saveTask({title:'Open the real Board task',projectFolder:manager.library.root,instructions:'Keep this task held.',expectedRevision:0});
 const server=createBridge({key:'a'.repeat(64),adminKey:'b'.repeat(64),manager});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const posts=[];page.on('request',request=>{if(request.method()==='POST')posts.push(request.url());});
 const before=JSON.stringify(manager.tasks);
 try{await run({manager,saved,url:'http://127.0.0.1:'+server.address().port+'/board/',admin:'b'.repeat(64)});expect(posts).toEqual([]);expect(JSON.stringify(manager.tasks)).toBe(before);}
 finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}

test('task deep link waits for a successful refresh and opens details only once',async({page})=>{
 await withBoard(page,async({saved,url,admin})=>{
  let first=true;await page.route('**/admin/state',async route=>{if(first){first=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Temporarily unavailable'})});}else await route.continue();});
  await page.goto(url+'#admin='+admin+'&task='+encodeURIComponent(saved.id));
  await expect(page.locator('#notice')).toContainText('Temporarily unavailable');
  await expect(page.locator('#task-details')).not.toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  await expect(page.locator('#task-details')).toBeVisible();
  await expect(page.locator('#details-title')).toHaveText('Open the real Board task');
  await expect(page.locator('#details-content')).toContainText('Keep this task held.');
  await page.locator('#details-close').click();
  await nextRefresh(page);
  await expect(page.locator('#task-details')).not.toBeVisible();
 });
});

test('new task deep link uses the editor without saving and does not reopen after refresh',async({page})=>{
 await withBoard(page,async({url,admin})=>{
  await page.goto(url+'#admin='+admin+'&new=1');
  await expect(page.locator('#task-editor')).toBeVisible();
  await expect(page.locator('#task-edit-title')).toHaveText('New task');
  await expect(page.locator('#task-id')).toHaveValue('');
  expect(new URL(page.url()).hash).toBe('');
  await page.getByLabel('Task title').fill('Unsaved dock draft');
  await nextRefresh(page);
  await expect(page.getByLabel('Task title')).toHaveValue('Unsaved dock draft');
  await page.locator('#task-cancel').click();
  await nextRefresh(page);
  await expect(page.locator('#task-editor')).not.toBeVisible();
 });
});

test('unknown task deep link reports missing task without falling through to a new task',async({page})=>{
 await withBoard(page,async({url,admin})=>{
  await page.goto(url+'#admin='+admin+'&task=missing-task&new=1');
  await expect(page.locator('#notice')).toContainText(/task.*not found/i);
  await expect(page.locator('#task-details')).not.toBeVisible();
  await expect(page.locator('#task-editor')).not.toBeVisible();
  await expect(page.locator('.board-task').first()).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
 });
});

test('deep links require authentication and only new=1 requests an editor',async({page})=>{
 await withBoard(page,async({url,admin})=>{
  await page.goto(url+'#new=1');
  await expect(page.locator('#notice')).toContainText('connect this Board');
  await expect(page.locator('#task-editor')).not.toBeVisible();
  await page.goto('about:blank');
  await page.goto(url+'#admin='+admin+'&new=0');
  await expect(page.locator('.board-task').first()).toBeVisible();
  await expect(page.locator('#task-editor')).not.toBeVisible();
 });
});
