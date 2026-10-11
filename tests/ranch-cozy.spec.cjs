const {test,expect}=require('@playwright/test');
test('Large ranch and Medium desk share selection without opening terminals; activities and quiet mode remain visible',async({browser})=>{
 const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');let focused=0;
 const sessions=['reading','researching','writing','waiting'].map((state,slot)=>({id:'ranch-'+slot,managed:true,slot,color:slot,project:['Moss','Clover','Maple','Pebble'][slot],state,label:state,canFocus:true,preview:{role:'assistant',text:'A little progress from '+state+'.',at:Date.now()}}));
 const server=createBridge({key:'a'.repeat(64),manager:{residents:()=>sessions,focusResident:async()=>{focused++;return 'focused';}}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const context=await browser.newContext({reducedMotion:'reduce'});const ranch=await context.newPage(),desk=await context.newPage();
 try{
  await ranch.setViewportSize({width:1688,height:696});await desk.setViewportSize({width:840,height:696});await ranch.goto(url+'/ui/#pair='+'a'.repeat(64));await desk.goto(url+'/desk/#pair='+'a'.repeat(64));
  await expect(ranch.locator('.station')).toHaveCount(4);await expect(ranch.locator('.bot').nth(0)).toHaveAttribute('data-station','reading');await expect(ranch.locator('.bot').nth(3)).toHaveAttribute('data-station','bell');
  await ranch.locator('.bot').nth(2).click();await expect(desk.locator('#name')).toHaveText('Maple');expect(focused).toBe(0);
  await desk.getByRole('button',{name:'Clover, Researching',exact:true}).click();await expect(ranch.locator('.bot').nth(2)).toHaveAttribute('aria-pressed','true');expect(focused).toBe(0);
  await desk.getByRole('button',{name:'Open terminal',exact:true}).click();await expect.poll(()=>focused).toBe(1);
  await ranch.getByRole('button',{name:'Quiet mode',exact:true}).click();await expect(ranch.locator('body')).toHaveAttribute('data-quiet','on');await expect(ranch.locator('.bot').nth(3).locator('.activity')).toHaveText('Needs you');
  await ranch.screenshot({path:'artifacts/bot-ranch/cozy-large-preview.png'});await desk.screenshot({path:'artifacts/bot-ranch/desk-preview.png'});
  await ranch.reload();await expect(ranch.locator('body')).toHaveAttribute('data-quiet','on');
 }finally{await context.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
