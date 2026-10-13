const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');

async function board(page,run){
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-pipeline-ui-'));
 const manager=new RanchManager({dir,native:{checks:async()=>[],status:async()=> 'closed'}});
 const server=createBridge({key:'a'.repeat(64),adminKey:'b'.repeat(64),manager});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{await page.goto('http://127.0.0.1:'+server.address().port+'/board/#admin='+'b'.repeat(64));await run(manager);}
 finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
}

test('Pipeline editor saves API configuration, validates JSON and preserves it while editing',async({page})=>board(page,async manager=>{
 await page.getByRole('button',{name:'+ New task'}).click();
 await expect(page.getByLabel('Execution mode')).toHaveValue('agent');
 await page.getByLabel('Task title').fill('Build external report');
 await page.getByLabel('Execution mode').selectOption('pipeline');
 await expect(page.locator('#pipeline-settings')).toContainText('no language-model tokens');
 await page.getByLabel('Start endpoint').fill('https://jobs.example.test/start');
 await page.getByLabel('Status endpoint').fill('https://jobs.example.test/jobs/{jobId}');
 await page.getByLabel('Credential environment variable').fill('REPORT_API_TOKEN');
 await page.getByLabel('Start request JSON').fill('[]');
 await page.getByRole('button',{name:'Save task',exact:true}).click();
 await expect(page.locator('#task-form-error')).toContainText('JSON object');
 await page.getByLabel('Start request JSON').fill('{"report":"weekly"}');
 await expect(page.getByRole('combobox',{name:'Monitoring budget',exact:true})).toHaveValue('60');
 await expect(page.getByLabel('Check interval')).toHaveValue('5');
 await expect(page.getByLabel('Reasoning request')).toBeDisabled();
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('#task-editor').evaluate(el=>{el.scrollTop=0;});
 await page.screenshot({path:'artifacts/bot-ranch/board-pipeline-editor.png',fullPage:true});
 await page.getByRole('button',{name:'Save task',exact:true}).click();
 await expect.poll(()=>manager.tasks.length).toBe(1);
 expect(manager.tasks[0].pipeline).toEqual({startUrl:'https://jobs.example.test/start',statusUrl:'https://jobs.example.test/jobs/{jobId}',body:{report:'weekly'},credentialEnv:'REPORT_API_TOKEN',waitMinutes:60,intervalMinutes:5});
 await page.locator('[data-column=inbox] .board-task').getByRole('button',{name:'Details'}).click();
 await page.getByRole('button',{name:'Edit task',exact:true}).click();
 await expect(page.getByLabel('Execution mode')).toHaveValue('pipeline');
 await expect(page.getByLabel('Start request JSON')).toHaveValue('{\n  "report": "weekly"\n}');
 await page.getByLabel('Task title').fill('Updated external report');
 await page.getByRole('button',{name:'Save task',exact:true}).click();
 await expect.poll(()=>manager.tasks[0].title).toBe('Updated external report');
 expect(manager.tasks[0].pipeline.credentialEnv).toBe('REPORT_API_TOKEN');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('[data-column=inbox] .board-task').getByRole('button',{name:'Details'}).click();
 await page.getByRole('button',{name:'Edit task',exact:true}).click();
 await page.getByLabel('Execution mode').selectOption('agent');
 await page.getByRole('button',{name:'Save task',exact:true}).click();
 await expect.poll(()=>manager.tasks[0].pipeline).toBe(null);
}));

test('Pipeline details resume the same job and stop tracking without cancelling it',async({page})=>board(page,async manager=>{
 const http=require('node:http');let checks=0;
 const external=http.createServer((req,res)=>{checks++;expect(req.method).toBe('GET');expect(req.url).toBe('/jobs/job-42');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:'job-42',status:'running',message:'Building report'}));});
 await new Promise(r=>external.listen(0,'127.0.0.1',r));
 try{
  const base='http://127.0.0.1:'+external.address().port;
  const t=manager.saveTask({title:'Sleeping report',projectFolder:manager.library.root,instructions:'',expectedRevision:manager.taskRevision,pipeline:{startUrl:base+'/start',statusUrl:base+'/jobs/{jobId}',body:{}}});
  const live=manager.tasks.find(x=>x.id===t.id);live.status='doing';live.attempts=[{id:'external-attempt',state:'running',kind:'pipeline'}];
  live.pipelineRun={status:'running',jobId:'job-42',sleeping:true,deadline:Date.now()-1000,lastCheckedAt:Date.now()-60000,nextCheckAt:null,intervalMinutes:5,lastError:'Temporary connection failure'};manager.persist();
  await page.locator('[data-column=doing] .board-task').getByRole('button',{name:'Details'}).click();
  await expect(page.locator('#details-content')).toContainText('Monitoring asleep');
  await expect(page.locator('#details-content')).toContainText('status may be stale');
  await page.locator('#details-followup').fill('Keep this follow-up draft.');
  await page.getByRole('combobox',{name:'Resume monitoring budget'}).selectOption('20');
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'artifacts/bot-ranch/board-pipeline-sleeping.png',fullPage:true});
  const request=page.waitForRequest(r=>r.url().endsWith('/admin/task/pipeline'));
  await page.getByRole('button',{name:'Resume monitoring',exact:true}).click();
  expect((await request).postDataJSON()).toEqual({id:t.id,expectedRevision:t.revision,action:'resume',minutes:20});
  await expect.poll(()=>live.pipelineRun.sleeping).toBe(false);expect(checks).toBe(1);expect(live.pipelineRun.jobId).toBe('job-42');expect(live.pipelineRun.lastError).toBeUndefined();
  await expect(page.locator('#details-followup')).toHaveValue('Keep this follow-up draft.');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.locator('[data-column=doing] .board-task').getByRole('button',{name:'Details'}).click();
  page.once('dialog',async dialog=>{expect(dialog.message()).toContain('does NOT cancel');await dialog.accept();});
  await page.getByRole('button',{name:'Stop tracking',exact:true}).click();
  await expect.poll(()=>live.pipelineRun.stopped).toBe(true);expect(checks).toBe(1);
  await expect(page.locator('#details-content')).toContainText('Tracking stopped');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  live.pipelineRun={status:'unresolved',jobId:null,sleeping:true};live.status='blocked';live.attempts[0].state='unresolved';live.revision=++manager.taskRevision;manager.persist();
  await page.locator('[data-column=blocked] .board-task').getByRole('button',{name:'Details'}).click();
  await expect(page.getByRole('button',{name:'Resume monitoring',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Verify and retry',exact:true})).toHaveCount(0);
  await expect(page.locator('#details-content')).toContainText('Startup is unresolved');
 }finally{external.closeAllConnections();await new Promise(r=>external.close(r));}
}));

test('OMP mode explains unavailable integration and only builds a bounded standalone command',async({page})=>board(page,async manager=>{
 await page.getByRole('button',{name:'+ New task'}).click();
 await page.getByLabel('Task title').fill('Repeat fixes');
 await page.getByLabel('Execution mode').selectOption('omp-loop');
 await expect(page.locator('#loop-settings')).toContainText('unavailable');
 await expect(page.getByRole('button',{name:'Save task',exact:true})).toBeDisabled();
 await page.getByLabel('Maximum iterations or duration').fill('10');
 await page.getByRole('combobox',{name:'Loop condition',exact:true}).selectOption('until');
 await page.getByLabel('Verification command').fill('npm test');
 await page.getByLabel('Loop prompt').fill('Fix failing tests.');
 await expect(page.getByLabel('Standalone OMP command')).toHaveValue("/loop 10 --until 'npm test' Fix failing tests.");
 await page.setViewportSize({width:390,height:844});
 await page.locator('#task-editor').evaluate(el=>{el.scrollTop=0;});
 expect(await page.locator('#task-editor').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:'artifacts/bot-ranch/board-loop-helper-mobile.png',fullPage:true});
 await page.getByLabel('Maximum iterations or duration').fill('');
 await expect(page.getByRole('button',{name:'Copy command'})).toBeDisabled();
 expect(manager.tasks).toHaveLength(0);
 await page.getByLabel('Execution mode').selectOption('agent');
 await expect(page.getByRole('button',{name:'Save task',exact:true})).toBeEnabled();
}));

test('confirmed external failure prepares a held new attempt without submitting a job',async({page})=>board(page,async manager=>{
 const t=manager.saveTask({title:'Failed report',projectFolder:manager.library.root,instructions:'',expectedRevision:manager.taskRevision,pipeline:{startUrl:'http://127.0.0.1:1/start',statusUrl:'http://127.0.0.1:1/jobs/{jobId}',body:{}}});
 const live=manager.tasks.find(x=>x.id===t.id);live.status='blocked';live.releasedForPickup=true;live.attempts=[{id:'failed-attempt',launchId:'pipeline-failed-attempt',kind:'pipeline',state:'failed',error:'Provider rejected the report'}];live.pipelineRun={status:'failed',jobId:'failed-job',sleeping:true};manager.persist();
 await page.locator('[data-column=blocked] .board-task').getByRole('button',{name:'Details'}).click();
 const prepare=page.getByRole('button',{name:'Prepare new attempt',exact:true});
 page.once('dialog',dialog=>dialog.dismiss());await prepare.click();expect(live.pipelineRun.jobId).toBe('failed-job');
 page.once('dialog',async dialog=>{expect(dialog.message()).toBe('This job failed. Prepare a new attempt? Starting it later submits a new external job.');await dialog.accept();});
 const request=page.waitForRequest(r=>r.url().endsWith('/admin/task/retry'));await prepare.click();
 expect((await request).postDataJSON()).toEqual({id:t.id,expectedRevision:t.revision});
 await expect.poll(()=>manager.tasks.find(x=>x.id===t.id).status).toBe('todo');
 const saved=manager.tasks.find(x=>x.id===t.id);expect(saved.releasedForPickup).toBe(false);expect(saved.pipelineRun).toBeFalsy();expect(saved.attempts).toHaveLength(1);expect(saved.attempts[0].pipelineRun.jobId).toBe('failed-job');
 await expect(page.locator('[data-column=inbox] .board-task')).toContainText('Failed report');
}));

test('unresolved submission links a verified existing job with only a status GET',async({page})=>board(page,async manager=>{
 const http=require('node:http'),requests=[];
 const external=http.createServer((req,res)=>{requests.push({method:req.method,url:req.url});res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:'verified-job',status:'running'}));});
 await new Promise(r=>external.listen(0,'127.0.0.1',r));
 try{
  const base='http://127.0.0.1:'+external.address().port,t=manager.saveTask({title:'Uncertain report',projectFolder:manager.library.root,instructions:'',expectedRevision:manager.taskRevision,pipeline:{startUrl:base+'/start',statusUrl:base+'/jobs/{jobId}',body:{}}});
  const live=manager.tasks.find(x=>x.id===t.id);live.status='blocked';live.attempts=[{id:'uncertain-attempt',state:'unresolved',kind:'pipeline'}];live.pipelineRun={status:'unresolved',jobId:'wrong-job',idempotencyKey:'original-submission-key',sleeping:true,intervalMinutes:5};manager.persist();
  await page.locator('[data-column=blocked] .board-task').getByRole('button',{name:'Details'}).click();
  await expect(page.locator('#details-content')).toContainText('original-submission-key');
  const input=page.getByRole('textbox',{name:'External job ID',exact:true}),link=page.getByRole('button',{name:'Link existing job',exact:true});
  await expect(input).toHaveAttribute('maxlength','500');await input.fill('verified-job');
  page.once('dialog',dialog=>dialog.dismiss());await link.click();expect(requests).toHaveLength(0);
  page.once('dialog',async dialog=>{expect(dialog.message()).toContain('same submission');await dialog.accept();});
  const request=page.waitForRequest(r=>r.url().endsWith('/admin/task/pipeline'));await link.click();
  expect((await request).postDataJSON()).toEqual({id:t.id,expectedRevision:t.revision,action:'reconcile',jobId:'verified-job',minutes:60,confirmed:true});
  await expect.poll(()=>live.pipelineRun.jobId).toBe('verified-job');expect(requests).toEqual([{method:'GET',url:'/jobs/verified-job'}]);
  expect(live.pipelineRun.idempotencyKey).toBe('original-submission-key');await expect(link).toHaveCount(0);
 }finally{external.closeAllConnections();await new Promise(r=>external.close(r));}
}));
