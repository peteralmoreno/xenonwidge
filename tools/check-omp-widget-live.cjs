// Exercise the real extension -> HTTP bridge -> local-file widget with synthetic OMP events.
const {chromium}=require('@playwright/test');const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'omp-widget-check-'));process.env.OMP_BOT_KEY_FILE=path.join(temp,'key.txt');process.env.OMP_BOT_PORT='43822';const key='d'.repeat(64);fs.writeFileSync(process.env.OMP_BOT_KEY_FILE,key);
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');const server=createBridge({key});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(43822,'127.0.0.1',resolve);});
 const browser=await chromium.launch();let timer;
 try{
  const handlers=new Map();const {default:extension}=await import('../sources/omp-bot-companion/extension.mjs');extension({on:(event,handler)=>handlers.set(event,handler)});
  const ctx={agent:{kind:'main'},cwd:'D:/projects/Test project',setInterval:fn=>(timer=setInterval(fn,2000)),clearTimer:clearInterval,hasPendingMessages:()=>false,getAsyncJobSnapshot:()=>null,ui:{notify:()=>{}}};
  const event=(type,extra={})=>handlers.get(type)({type,...extra},ctx);
  event('session_start');
  const page=await browser.newPage({viewport:{width:840,height:696}});await page.goto(pathToFileURL(path.resolve(__dirname,'../sources/omp-bot/index.html')).href);await page.getByLabel('Pairing key').fill(key);await page.getByRole('button',{name:'Connect',exact:true}).click();
  await page.waitForFunction(()=>document.body.dataset.state==='ready');event('agent_start');
  for(const [tool,state]of [['read','reading'],['web_search','researching'],['write','writing'],['bash','running'],['ask','waiting']]){
   event('tool_execution_start',{toolCallId:tool,toolName:tool,args:{contents:'Never transmit this'}});await page.waitForFunction(s=>document.body.dataset.state===s,state);
   if(state==='writing')await page.screenshot({path:'artifacts/omp-bot/writing-preview.png'});
   event('tool_execution_end',{toolCallId:tool});
  }
  event('agent_end',{messages:[]});await page.waitForFunction(()=>document.body.dataset.state==='done');
  event('session_shutdown');await page.waitForFunction(()=>document.body.dataset.state==='offline');
  const state=await(await fetch('http://127.0.0.1:43822/state',{headers:{Authorization:'Bearer '+key}})).text();assert.equal(state.includes('Never transmit this'),false);
  console.log('Local-file widget + real extension/bridge pipeline passed: ready, reading, research, writing, running, question, done, offline; tool content excluded. Events were synthetic.');
 }finally{clearInterval(timer);await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
