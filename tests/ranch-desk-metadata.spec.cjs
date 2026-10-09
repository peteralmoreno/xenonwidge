const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
test('Desk shows metadata and clears the 40% reminder after compaction, legacy data and disconnection',async({page})=>{
 let disconnected=false;
 const session={id:'one',project:'Clover',state:'ready',metadata:{folder:'D:/project/<img src=x>',model:'model-one',provider:'provider',context:{used:40000,capacity:100000,percent:40}}};
 await page.addInitScript(()=>localStorage.setItem('ranch-desk.key','a'.repeat(64)));
 await page.route('http://127.0.0.1:43822/**',route=>disconnected?route.abort():route.fulfill({json:{app:'omp-bot',version:1,sessions:[session],capabilities:{}}}));
 await page.route('http://desk-meta.test/**',route=>{
  const file=path.join(__dirname,'../sources/ranch-desk',new URL(route.request().url()).pathname.replace(/^\/$/,'/index.html'));
  return fs.existsSync(file)?route.fulfill({path:file,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]}):route.fulfill({status:404,body:''});
 });
 await page.goto('http://desk-meta.test/');
 await expect(page.locator('#folder')).toHaveText('D:/project/<img src=x>');await expect(page.locator('#folder img')).toHaveCount(0);
 await expect(page.locator('#model')).toHaveText('provider / model-one');
 await expect(page.locator('#context-warning')).toHaveText('Dumbzone warning: 40%+');await expect(page.locator('#context-warning')).toBeVisible();
 await expect(page.locator('#context-meter')).toHaveAttribute('value','40');
 session.metadata.context={used:10000,capacity:100000,percent:10};await expect(page.locator('#context-warning')).toBeHidden();await expect(page.locator('#context-meter')).toHaveAttribute('value','10');
 session.metadata.context={used:null,capacity:100000,percent:null};await expect(page.locator('#context-value')).toContainText('Usage unavailable');await expect(page.locator('#context-meter')).toBeHidden();
 delete session.metadata;await expect(page.locator('#model')).toHaveText('Unavailable');await expect(page.locator('#context-value')).toHaveText('Unavailable');
 session.metadata={folder:'D:/project',model:'model-one',context:{used:50000,capacity:100000,percent:50}};await expect(page.locator('#context-warning')).toBeVisible();
 disconnected=true;await expect(page.locator('#context-warning')).toBeHidden();await expect(page.locator('#context-value')).toHaveText('Unavailable while offline');await expect(page.locator('#model')).toHaveText('Unavailable while offline');
});
