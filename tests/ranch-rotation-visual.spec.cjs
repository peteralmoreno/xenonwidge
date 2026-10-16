const {test,expect}=require('@playwright/test');
const path=require('node:path');
async function ranch(page,{motion='on',quiet='off'}={}){
 const sessions=Array.from({length:6},(_,i)=>({id:'b'+i,profileId:'p'+i,slot:i,managed:true,color:i*5,design:['classic','pm','pipeline'][i%3],personality:['calm','curious','cheerful','focused','sociable','curious'][i],project:['Clover','Sasha','Piper','Moss','Juniper','Maple'][i],state:i===5?'offline':i===4?'waiting':'ready',idleSince:Date.now()-180000}));
 const profiles=sessions.map(s=>({id:s.profileId,nickname:s.project,color:s.color,design:s.design,personality:s.personality,active:true}));
 await page.addInitScript(({motion,quiet})=>{localStorage.setItem('omp-bot.key','a'.repeat(64));localStorage.setItem('omp-bot.motion',motion);localStorage.setItem('omp-bot.quiet',quiet);},{motion,quiet});
 await page.route('http://127.0.0.1:43822/**',r=>{const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers});return r.fulfill({headers,json:new URL(r.request().url()).pathname==='/state'?{app:'omp-bot',version:1,sessions}: {profiles,tasks:[],updates:profiles.map((p,i)=>({id:'u'+i,profileId:p.id,text:'A short public update from '+p.nickname,at:Date.now()-i*60000})),roles:[]}});});
 await page.route('http://rotation.test/**',r=>r.fulfill({path:path.join(__dirname,'../sources/omp-bot',new URL(r.request().url()).pathname==='/'?'index.html':new URL(r.request().url()).pathname)}));
 await page.goto('http://rotation.test/');await expect(page.locator('.bot')).toHaveCount(6);
}
test('all map and theme combinations keep six residents and bell reachable at Large and XL',async({page})=>{
 test.setTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await ranch(page);
 for(const [size,width,height]of [['large',1688,696],['xl',2547,676]]){
  await page.setViewportSize({width,height});
  for(const map of ['meadow','courtyard','glasshouse','rooftop','depot'])for(const theme of ['moss','sunset','moonlight','crimson','arctic','orchid']){
   await page.locator('#look').click();await page.locator('#appearance-map').selectOption(map);await page.locator('#appearance-theme').selectOption(theme);await page.locator('#appearance-close').click();
   await expect(page.locator('body')).toHaveAttribute('data-map',map);await expect(page.locator('#wake-bell')).toBeVisible();await expect(page.locator('.idle-landmark:visible')).toHaveCount(4);
   await expect.poll(()=>page.locator('.bot').evaluateAll(bots=>bots.every(b=>{const r=b.getBoundingClientRect(),s=document.getElementById('scene').getBoundingClientRect();return r.left>=s.left&&r.right<=s.right&&r.top>=s.top&&r.bottom<=s.bottom;}))).toBe(true);
   expect(await page.locator('#wake-bell').evaluate(b=>{const r=b.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#wake-bell')===b;})).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
   if(['glasshouse','rooftop','depot'].includes(map)&&theme==='crimson')await page.screenshot({path:`artifacts/omp-bot/rotation-${map}-${theme}-${size}.png`});
  }
 }
 await page.locator('#all-updates').click();await expect(page.locator('.feed-avatar .portrait')).toHaveCount(6);await page.screenshot({path:'artifacts/omp-bot/rotation-feed-portraits-xl.png'});expect(errors).toEqual([]);
});
for(const [motion,quiet,want]of [['off','on','still'],['on','on','calm'],['on','off','lively']])test('legacy motion '+motion+'/'+quiet+' migrates to '+want,async({page})=>{
 await ranch(page,{motion,quiet});await expect(page.locator('body')).toHaveAttribute('data-motion',want);await expect(page.locator('#quiet')).toHaveCount(0);
 await page.locator('#motion').click();await page.locator('#motion-choice').selectOption('calm');await page.locator('#motion-close').click();await page.reload();await expect(page.locator('body')).toHaveAttribute('data-motion','calm');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('body')).toHaveAttribute('data-effective-motion','still');
 await page.locator('#motion').click();await expect(page.locator('#motion-note')).toContainText('System reduced motion');
});
