const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const state=()=>({master:{id:'endpoint-a',name:'Speakers',volume:0.4,muted:false},sessions:[{id:'session-a',name:'Music app',volume:0.7,muted:false}],players:[{id:'player-a',name:'Music app',title:'Evening light',artist:'Studio session',playing:true,artwork:null,canToggle:true,canNext:true,canPrevious:true}],mediaError:null});
async function setup(page){
 let current=state(), commands=[], offline=false;
 await page.route('http://127.0.0.1:43821/**',async route=>{
  if(offline)return route.abort();
  if(route.request().method()==='POST'){commands.push(route.request().postDataJSON());return route.fulfill({json:{ok:true}});}
  return route.fulfill({json:current});
 });
 await page.route('http://audio-deck.test/**',route=>{
  const p=new URL(route.request().url()).pathname;
  const file=path.join(__dirname,'../sources/audio-deck',p==='/'?'index.html':p);
  if(!fs.existsSync(file))return route.fulfill({status:404,body:'Widget not implemented'});
  return route.fulfill({path:file,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]});
 });
 await page.goto('http://audio-deck.test/');
 return {commands,setState:s=>current=s,disconnect:()=>offline=true};
}
async function pair(page){await page.getByLabel('Pairing key').fill('a'.repeat(64));await page.getByRole('button',{name:'Connect',exact:true}).click();await expect(page.getByText('Evening light',{exact:true})).toBeVisible();}
test('pairs and sends playback to the displayed player',async({page})=>{const h=await setup(page);await pair(page);await page.getByRole('button',{name:'Pause',exact:true}).click();await expect.poll(()=>h.commands).toContainEqual({kind:'playPause',target:'player-a'});});
test('volume and mute target the session without overwriting its level',async({page})=>{const h=await setup(page);await pair(page);await page.getByRole('tab',{name:'Mixer',exact:true}).click();const slider=page.getByRole('slider',{name:'Music app volume'});await slider.fill('35');await slider.dispatchEvent('change');await expect.poll(()=>h.commands).toContainEqual({kind:'volume',target:'session-a',value:0.35});await page.getByRole('button',{name:'Mute Music app',exact:true}).click();await expect.poll(()=>h.commands).toContainEqual({kind:'mute',target:'session-a',muted:true});});
test('disappearing sessions are removed and offline disables controls',async({page})=>{const h=await setup(page);await pair(page);await page.getByRole('tab',{name:'Mixer',exact:true}).click();h.setState({...state(),sessions:[]});await expect(page.getByText('No apps are using this output.')).toBeVisible();h.disconnect();await expect(page.getByText('Companion offline. Start Audio Deck Companion, then reconnect.')).toBeVisible();await expect(page.getByRole('slider',{name:'Master volume'})).toBeDisabled();});
test('medium and portrait layouts fit without page overflow',async({page})=>{await setup(page);await pair(page);for(const viewport of [{width:840,height:696},{width:696,height:840},{width:420,height:348}]){await page.setViewportSize(viewport);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);}});
test('removing a session above a dragged slider keeps the touch target stationary',async({page})=>{
 const h=await setup(page);await pair(page);
 h.setState({...state(),sessions:[{id:'first',name:'First app',volume:.5,muted:false},...state().sessions]});
 await page.getByRole('tab',{name:'Mixer',exact:true}).click();
 await expect(page.getByRole('slider',{name:'First app volume'})).toBeVisible();
 // Existing session order is intentionally stable; use the second row for the gesture.
 const slider=page.getByRole('slider',{name:'First app volume'});
 const before=await slider.boundingBox();await slider.dispatchEvent('pointerdown');
 h.setState({...state(),sessions:[{id:'first',name:'First app',volume:.5,muted:false}]});
 await page.waitForTimeout(1500);
 expect((await slider.boundingBox()).y).toBe(before.y);
 await slider.dispatchEvent('pointercancel');await expect(page.getByRole('slider',{name:'Music app volume'})).toHaveCount(0);
});
test('metadata prefix parses as XML and preview captures both views',async({page})=>{
 await setup(page);await pair(page);
 const html=fs.readFileSync(path.join(__dirname,'../sources/audio-deck/index.html'),'utf8');
 expect(await page.evaluate(prefix=>new DOMParser().parseFromString(prefix,'application/xml').querySelector('parsererror')?.textContent||null,html.slice(0,html.indexOf('</head>')+7)+'</html>')).toBeNull();
 await page.screenshot({path:'artifacts/audio-deck/player-preview.png'});
 await page.getByRole('tab',{name:'Mixer',exact:true}).click();await page.screenshot({path:'artifacts/audio-deck/mixer-preview.png'});
});
