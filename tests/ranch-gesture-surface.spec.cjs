const {test,expect}=require('@playwright/test');
const path=require('node:path');

async function ranch(page){
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>localStorage.setItem('omp-bot.key','a'.repeat(64)));
 await page.route('http://127.0.0.1:43822/**',route=>route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},json:{app:'omp-bot',version:1,capabilities:{},sessions:[{id:'one',project:'Clover',state:'ready',label:'Ready',slot:0,color:0,lastSeen:Date.now()}]}}));
 await page.route('http://ranch.test/**',route=>{const url=new URL(route.request().url());return route.fulfill({path:path.join(__dirname,'../sources/omp-bot',url.pathname==='/'?'index.html':url.pathname)});});
 await page.goto('http://ranch.test/');
 await expect(page.locator('.bot')).toHaveCount(1);
}

test('grass remains interactive while menu margins have no Ranch hit target and button edges remain usable',async({page})=>{
 await ranch(page);
 for(const size of [{width:1688,height:696},{width:840,height:696},{width:420,height:348}]){
  await page.setViewportSize(size);
  const hits=await page.evaluate(()=>{
   const scene=document.getElementById('scene').getBoundingClientRect(),header=document.querySelector('header').getBoundingClientRect(),button=document.getElementById('connect').getBoundingClientRect();
   const inRanch=(x,y)=>!!document.elementFromPoint(x,y)?.closest('main');
   return {grass:inRanch(scene.x+scene.width*.5,scene.y+scene.height*.5),margin:inRanch(2,header.y+header.height/2),menuText:inRanch(header.x+3,header.y+header.height/2),buttonEdge:document.elementFromPoint(button.right-3,button.y+button.height/2)?.closest('button')?.id};
  });
  expect(hits).toEqual({grass:true,margin:false,menuText:false,buttonEdge:'connect'});
 }
 await page.locator('#connect').click();
 await expect(page.locator('#pairing')).toBeVisible();
 await page.getByLabel('Connection key').fill('b'.repeat(64));
 await page.locator('#close').click();
 await expect(page.locator('#pairing')).not.toBeVisible();
});

test('grass receives gestures without cancelling them; bot dragging still reaches the Desk',async({page})=>{
 await page.setViewportSize({width:1688,height:696});await ranch(page);
 await page.evaluate(()=>{
  window.grassEvents=[];
  for(const name of ['pointerdown','pointermove','pointerup','gotpointercapture'])document.addEventListener(name,e=>window.grassEvents.push({type:e.type,inRanch:!!e.target.closest('main'),cancelled:e.defaultPrevented}));
 });
 const scene=await page.locator('#scene').boundingBox();
 await page.mouse.move(scene.x+scene.width*.5,scene.y+scene.height*.5);await page.mouse.down();
 await page.mouse.move(scene.x+scene.width*.7,scene.y+scene.height*.5,{steps:6});await page.mouse.up();
 const events=await page.evaluate(()=>window.grassEvents);
 expect(events.some(e=>e.type==='pointerdown')).toBe(true);
 expect(events.every(e=>e.inRanch&&!e.cancelled&&e.type!=='gotpointercapture')).toBe(true);
 await page.evaluate(()=>window.grassEvents=[]);
 const touch=await page.context().newCDPSession(page),y=scene.y+scene.height*.5;
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:scene.x+scene.width*.5,y}]});
 for(let n=1;n<=6;n++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:scene.x+scene.width*(.5+n*.03),y}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const touchEvents=await page.evaluate(()=>window.grassEvents);
 expect(touchEvents.some(e=>e.type==='pointerdown')).toBe(true);
 expect(touchEvents.some(e=>e.type==='pointerdown'&&e.inRanch)).toBe(true);
 expect(touchEvents.every(e=>!e.cancelled)).toBe(true);
 await touch.detach();
 const bot=page.locator('.bot');await expect(bot).toHaveCSS('touch-action','none');
 const origin=await bot.boundingBox(),desk=await page.locator('#ranch-desk').boundingBox();
 await page.mouse.move(origin.x+origin.width/2,origin.y+origin.height/2);await page.mouse.down();
 await page.mouse.move(desk.x+desk.width/2,desk.y+desk.height/2,{steps:8});await page.mouse.up();
 await expect(bot).toHaveAttribute('aria-pressed','true');await expect(page.locator('#desk-more')).toHaveAttribute('open','');
});
