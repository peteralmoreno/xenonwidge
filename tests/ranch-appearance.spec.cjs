const {test,expect}=require('@playwright/test');const path=require('node:path');
for(const widget of ['omp-bot','ranch-desk'])test(widget+' appearance persists with working controls at Large and Medium sizes',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(w=>{localStorage.setItem(w+'.key','a'.repeat(64));if(w==='omp-bot')localStorage.setItem('ranch-desk.appearance',JSON.stringify({theme:'sunset',map:'courtyard'}));},widget);
 await page.route('http://127.0.0.1:43822/**',r=>r.fulfill({json:{app:'omp-bot',version:1,sessions:[{id:'one',managed:true,slot:0,color:4,project:'Clover',state:'writing',metadata:{folder:'D:/garden',model:'example-model',context:{used:45000,capacity:100000}}}]}}));
 await page.route('http://appearance.test/**',r=>r.fulfill({path:path.join(__dirname,'../sources',widget,new URL(r.request().url()).pathname==='/'?'index.html':new URL(r.request().url()).pathname)}));
 await page.goto('http://appearance.test/');if(widget==='omp-bot'){await expect(page.locator('body')).toHaveAttribute('data-theme','sunset');await expect(page.locator('body')).toHaveAttribute('data-map','courtyard');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('omp-bot.appearance')))).toEqual({theme:'sunset',map:'courtyard'});expect(await page.evaluate(()=>localStorage.getItem('ranch-desk.appearance'))).not.toBeNull();}await page.getByRole('button',{name:'Appearance settings'}).click();
 await page.getByLabel('Color theme').selectOption('moonlight');await page.getByLabel('Map',{exact:true}).selectOption('courtyard');await page.getByRole('button',{name:'Done',exact:true}).click();
 await expect(page.locator('body')).toHaveAttribute('data-theme','moonlight');await expect(page.locator('body')).toHaveAttribute('data-map','courtyard');await page.reload();await expect(page.locator('body')).toHaveAttribute('data-map','courtyard');await expect(page.locator('body')).toHaveAttribute('data-theme','moonlight');
 for(const size of [{width:1688,height:696},{width:840,height:696},{width:420,height:348}]){
  await page.setViewportSize(size);const box=await page.getByRole('button',{name:'Appearance settings'}).boundingBox();expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);expect(box.x+box.width).toBeLessThanOrEqual(size.width);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if ((widget==='omp-bot'&&size.width===1688)||(widget==='ranch-desk'&&size.width===840)) await page.screenshot({path:'artifacts/releases/'+(widget==='omp-bot'?'bot-ranch':widget)+'/preview.png'});
 }
 expect(errors).toEqual([]);
});
