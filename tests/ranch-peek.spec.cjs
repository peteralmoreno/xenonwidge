const {test,expect}=require('@playwright/test');const path=require('node:path');
test('single tap selects without popup; double tap focuses and extended colors retain slot',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 let focus=0,selected='';const sessions=[{id:'ranch-one',managed:true,slot:2,color:9,project:'Indigo',state:'waiting',label:'Needs your answer',lastSeen:Date.now(),canFocus:true}];
 await page.route('http://127.0.0.1:43822/**',r=>{if(r.request().url().endsWith('/focus')){focus++;return r.fulfill({json:{result:'focused'}});}if(r.request().url().endsWith('/selection')){selected=r.request().postDataJSON().id;return r.fulfill({json:{selectionRevision:1}});}return r.fulfill({json:{app:'omp-bot',version:1,capabilities:{focus:true,selection:true},sessions}});});
 await page.route('http://ranch.test/**',r=>r.fulfill({path:path.join(__dirname,'../sources/omp-bot',new URL(r.request().url()).pathname==='/'?'index.html':new URL(r.request().url()).pathname)}));
 await page.goto('http://ranch.test/');await page.getByLabel('Pairing key').fill('a'.repeat(64));await page.getByRole('button',{name:'Connect',exact:true}).click();
 const bot=page.locator('.bot');await expect(bot).toHaveAttribute('data-color','indigo');await expect(bot.locator('.label')).toHaveText('3 Indigo');
 await bot.click();await expect.poll(()=>selected).toBe('ranch-one');await page.waitForTimeout(550);expect(focus).toBe(0);await expect(page.locator('dialog[open],#peek:not([hidden])')).toHaveCount(0);
 await bot.dblclick();await expect.poll(()=>focus).toBe(1);
 sessions[0].color=11;await expect(bot).toHaveAttribute('data-color','red');await expect(bot.locator('.label')).toHaveText('3 Indigo');
 sessions[0].state='offline';await expect(bot).toHaveAttribute('data-mode','offline');await page.waitForTimeout(550);await bot.dblclick();expect(focus).toBe(1);
});
