const {test,expect}=require('@playwright/test');const fs=require('node:fs');const path=require('node:path');
async function setup(page){
 let state='reading',offline=false;
 await page.route('http://127.0.0.1:43822/**',route=>offline?route.abort():route.fulfill({json:{app:'omp-bot',version:1,sessions:[{id:'example',project:'My project',state,label:state==='waiting'?'Question waiting in terminal':state==='done'?'Finished — check the terminal':'Reading files',startedAt:Date.now()-65000,finishedAt:state==='done'?Date.now():null,lastSeen:Date.now(),activeCount:1}]}}));
 await page.route('http://omp-bot.test/**',route=>{const p=new URL(route.request().url()).pathname;const file=path.join(__dirname,'../sources/omp-bot',p==='/'?'index.html':p);if(!fs.existsSync(file))return route.fulfill({status:404,body:'Not built yet'});return route.fulfill({path:file,contentType:({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[path.extname(file)]});});
 await page.goto('http://omp-bot.test/');return {setState:s=>state=s,disconnect:()=>offline=true};
}
test('OMP bot reflects actual state, supports reduced motion, and sleeps when disconnected',async({page})=>{
 const h=await setup(page);await page.getByLabel('Pairing key').fill('a'.repeat(64));await page.getByRole('button',{name:'Connect',exact:true}).click();
 for(const state of ['reading','researching','writing','running','waiting','done']){h.setState(state);await expect(page.locator('body')).toHaveAttribute('data-state',state);}
 h.setState('reading');await expect(page.locator('body')).toHaveAttribute('data-state','reading');await page.screenshot({path:'artifacts/omp-bot/reading-preview.png'});
 await page.getByRole('button',{name:'Pause animation'}).click();await expect(page.locator('body')).toHaveAttribute('data-motion','off');
 for(const viewport of [{width:840,height:696},{width:696,height:840},{width:420,height:348}]){await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);}
 h.disconnect();await expect(page.locator('body')).toHaveAttribute('data-state','offline');await expect(page.getByRole('button',{name:'Open companion view'})).toBeVisible();
});
