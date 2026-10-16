const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');

test('Full Board saves and reopens pipe-only tasks; setup offers PM and Jet',async({page})=>{
 const {RanchManager}=await import('../sources/omp-bot-companion/manager.mjs');
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ranch-field-ui-'));
 const manager=new RanchManager({dir,native:{checks:async()=>[],status:async()=> 'closed'}});
 manager.scheduleAutoPickup=()=>{};
 const server=createBridge({key:'a'.repeat(64),adminKey:'b'.repeat(64),manager});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port;
 try{
  await page.goto(url+'/board/#admin='+'b'.repeat(64));
  await page.locator('#board-add').click();
  await page.getByLabel('Task title',{exact:true}).fill('Pipe eligibility');
  await page.getByLabel('Instructions',{exact:true}).fill('Verify the external pipeline.');
  await page.locator('#task-pipe-only').check();
  await page.getByRole('button',{name:'Save task',exact:true}).click();
  await expect.poll(()=>manager.tasks[0]?.pipeOnly).toBe(true);
  const card=page.locator('[data-column=inbox] .board-task').filter({hasText:'Pipe eligibility'});
  await card.getByRole('button',{name:'Details'}).click();
  await page.getByRole('button',{name:'Edit task',exact:true}).click();
  await expect(page.locator('#task-pipe-only')).toBeChecked();
  await page.locator('#task-pipe-only').uncheck();
  await page.getByRole('button',{name:'Save task',exact:true}).click();
  await expect.poll(()=>manager.tasks[0]?.pipeOnly).toBe(false);
  expect(new RanchManager({dir,native:{}}).tasks[0].pipeOnly).toBe(false);
  await page.goto(url+'/setup/#admin='+'b'.repeat(64));
  await page.getByRole('button',{name:'Bots Residents and bank'}).click();
  await page.locator('#add').click();
  await page.locator('#nickname').fill('Jet PM');
  await page.locator('#design').selectOption('pm');
  await page.getByLabel('Jet',{exact:true}).check();
  await expect(page.locator('#design-preview .pm')).toHaveCount(1);
  await page.locator('#profile-form button[type=submit]').click();
  await expect.poll(()=>manager.profiles[0]?.design).toBe('pm');
  expect(manager.profiles[0].color).toBe(31);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
});

test('sidebar authors pipe-only task and PM profile with the 32nd color',async({page})=>{
 const built=await require('esbuild').build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {BoardPanel,FactoryPanel} from './sources/omp-bot-desktop/SidebarPanels';const data={profiles:[],tasks:[],roles:[],taskRevision:0,homeFolder:''};const run=async(name,body)=>{window.calls.push({name,body});return {}};window.calls=[];createRoot(document.getElementById('root')).render(<><section id="task"><BoardPanel data={data} run={run} creating={true} onCreating={()=>{}} popout={()=>{}} disabled={false}/></section><section id="factory"><FactoryPanel data={data} run={run} onBank={()=>{}} disabled={false}/></section></>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic'});
 await page.setContent('<div id="root"></div>');await page.addScriptTag({content:built.outputFiles[0].text});
 await page.getByLabel('Task title',{exact:true}).fill('Pipe draft');
 await page.getByLabel('Pipe-only (pipe or pipeline role)',{exact:true}).check();
 await page.getByRole('button',{name:'Save task',exact:true}).click();
 expect(await page.evaluate(()=>window.calls.find(c=>c.name==='task-save').body.pipeOnly)).toBe(true);
 await page.getByLabel('Bot name',{exact:true}).fill('Jet PM');
 await page.getByRole('combobox',{name:'Design',exact:true}).selectOption('pm');
 await page.getByRole('button',{name:'Jet',exact:true}).click();
 await page.getByRole('button',{name:'Create in Bank',exact:true}).click();
 expect(await page.evaluate(()=>window.calls.find(c=>c.name==='factory').body)).toMatchObject({design:'pm',color:31,nickname:'Jet PM'});
});
