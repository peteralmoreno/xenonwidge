const {test,expect}=require('@playwright/test');
const path=require('node:path');
const esbuild=require('esbuild');
const source=path.join(__dirname,'../sources/omp-bot-desktop');
let bundle;
test.beforeAll(async()=>{bundle=(await esbuild.build({entryPoints:[path.join(source,'recovery-renderer.tsx')],bundle:true,write:false,format:'iife',jsx:'automatic'})).outputFiles[0].text;});

test('recovery pop-out explains offline states and lets an operator cancel one queued idle action',async({page})=>{
 await page.addInitScript(()=>{
  window.recoveryState={status:'offline',message:'No companion is listening at the expected address.',origin:'http://127.0.0.1:43822'};
  window.recoveryCalls=[];window.recoveryPending=false;
  window.botRanch={
   health:async()=>({...window.recoveryState,pending:window.recoveryPending}),
   recover:async(action)=>{window.recoveryCalls.push(action);if(action==='restart-when-idle'||action==='quit-when-idle'){window.recoveryPending=true;return {ok:true,pending:true};}if(action==='cancel'){window.recoveryPending=false;return {ok:true,pending:false};}return {ok:true};},
   diagnostics:async()=>JSON.stringify({status:window.recoveryState.status,logs:[]}),
   copy:async()=>({ok:true}),
  };
 });
 await page.route('http://recovery.test/**',route=>{
  const file=new URL(route.request().url()).pathname;
  if(file==='/recovery.js')return route.fulfill({body:bundle,contentType:'text/javascript'});
  return route.fulfill({path:path.join(source,file==='/'?'recovery.html':file.slice(1))});
 });
 await page.goto('http://recovery.test/');
 await expect(page.getByRole('heading',{name:'Offline'})).toBeVisible();
 await expect(page.getByText('No companion is listening at the expected address.')).toBeVisible();
 await page.evaluate(()=>{window.recoveryState={status:'unresponsive',message:'The configured companion did not answer.'};});
 await page.getByRole('button',{name:'Refresh'}).first().click();
 await expect(page.getByRole('heading',{name:'Unresponsive'})).toBeVisible();
 await page.getByRole('button',{name:'Restart when idle'}).click();
 await expect(page.getByRole('button',{name:'Cancel pending request'})).toBeVisible();
 await page.getByRole('button',{name:'Cancel pending request'}).click();
 await expect(page.getByRole('button',{name:'Cancel pending request'})).toHaveCount(0);
 expect(await page.evaluate(()=>window.recoveryCalls)).toEqual(['restart-when-idle','cancel']);
 await page.getByRole('button',{name:'Refresh',exact:true}).click();
 await page.getByRole('button',{name:'Copy diagnostics'}).click();
 await expect(page.getByRole('status').last()).toContainText('Diagnostics copied.');
});
