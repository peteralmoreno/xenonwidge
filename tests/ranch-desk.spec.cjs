const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

async function setup(page, options={}) {
  const requests=[];
  let offline=false, selectedId='one', selectionRevision=0, selectionInstance='first-boot', selection=true, hold=null;
  const sessions=[
    {id:'one',project:'Clover',color:6,state:'reading',label:'Reading the project',canFocus:true,preview:{role:'assistant',text:'I found the next piece of the puzzle.',at:1728000000000}},
    {id:'two',project:'Juniper',color:1,state:'waiting',label:'Question waiting in terminal',canFocus:true,preview:{role:'user',text:'<img src=x onerror="window.injection=true">\nPlease check the build.',at:1728000000000}},
    {id:'three',project:'Poppy',color:0,state:'done',label:'Finished',canFocus:true},
    {id:'four',project:'Fern',color:7,state:'offline',label:'Terminal closed',canFocus:false}
  ];
  await page.addInitScript(()=>localStorage.setItem('ranch-desk.key','a'.repeat(64)));
  await page.route('http://127.0.0.1:43822/**',async route=>{
    if(offline)return route.abort();
    const req=route.request(), url=new URL(req.url());
    expect(req.headers().authorization).toBe('Bearer '+'a'.repeat(64));
    if(req.method()==='POST'){
      const body=req.postDataJSON(); requests.push({path:url.pathname,...body});
      if(url.pathname==='/selection'){
        if(hold)await hold;
        selectedId=body.id; selectionRevision++;
        return route.fulfill({json:{selectedId,selectionRevision,selectionInstance}});
      }
      return route.fulfill({json:{result:'focused'}});
    }
    const data={app:'omp-bot',version:1,sessions,capabilities:{focus:true,...(selection?{selection:true}:{})},selectedId,selectionRevision,selectionInstance};
    return route.fulfill({json:data});
  });
  await page.route('http://ranch-desk.test/**',route=>{
    const file=path.join(__dirname,'../sources/ranch-desk',new URL(route.request().url()).pathname.replace(/^\/$/,'/index.html'));
    return fs.existsSync(file)?route.fulfill({path:file,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]}):route.fulfill({status:404,body:''});
  });
  await page.goto('http://ranch-desk.test/');
  await expect(page.locator('#name')).toHaveText('Clover');
  return {requests,sessions,disconnect:()=>offline=true,reconnect:()=>offline=false,restart:()=>{selectionInstance='second-boot';selectionRevision=0;selectedId='three';},external:id=>{selectedId=id;selectionRevision++;},legacy:()=>selection=false,hold:()=>{let release;hold=new Promise(resolve=>release=resolve);return()=>{hold=null;release();};}};
}

test('desk synchronizes selected resident without focusing, renders plain text, and focuses only explicitly',async({page})=>{
  const h=await setup(page);
  h.external('two');
  await expect(page.locator('#name')).toHaveText('Juniper');
  await expect(page.locator('#excerpt')).toContainText('<img src=x');
  await expect(page.locator('#excerpt img')).toHaveCount(0);
  expect(await page.evaluate(()=>window.injection)).toBeUndefined();
  expect(h.requests).toEqual([]);
  await page.getByRole('button',{name:'Clover, Reading',exact:true}).click();
  await expect.poll(()=>h.requests).toEqual([{path:'/selection',id:'one'}]);
  await page.waitForTimeout(1500);
  expect(h.requests).toHaveLength(1);
  await expect(page.getByRole('button',{name:'Clover, Reading',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Open terminal',exact:true}).click();
  await expect(page.locator('#result')).toHaveText('Terminal brought forward.');
  expect(h.requests).toEqual([{path:'/selection',id:'one'},{path:'/focus',id:'one'}]);
});

test('pending local selection survives polling and rapid choices are serialized',async({page})=>{
  const h=await setup(page), release=h.hold();
  await page.getByRole('button',{name:'Juniper, Needs you',exact:true}).click();
  await expect.poll(()=>h.requests.length).toBe(1);
  await page.waitForTimeout(900);
  await expect(page.locator('#name')).toHaveText('Juniper');
  await page.getByRole('button',{name:'Poppy, Done',exact:true}).click();
  await expect(page.locator('#name')).toHaveText('Poppy');
  release();
  await expect.poll(()=>h.requests.length).toBe(2);
  await page.waitForTimeout(900);
  await expect(page.locator('#name')).toHaveText('Poppy');
  expect(h.requests).toEqual([{path:'/selection',id:'two'},{path:'/selection',id:'three'}]);
});

test('desk follows selection after a companion restart resets its revision',async({page})=>{
  const h=await setup(page);
  h.external('two');
  await expect(page.locator('#name')).toHaveText('Juniper');
  h.restart();
  await expect(page.locator('#name')).toHaveText('Poppy');
  h.external('one');
  await expect(page.locator('#name')).toHaveText('Clover');
  expect(h.requests).toEqual([]);
});

test('offline clears stale excerpt and focus; legacy selection stays local',async({page})=>{
  const h=await setup(page);
  await expect(page.locator('#excerpt')).toContainText('puzzle');
  h.disconnect();
  await expect(page.locator('body')).toHaveAttribute('data-connected','false');
  await expect(page.locator('#excerpt')).not.toContainText('puzzle');
  await expect(page.locator('#focus')).toBeDisabled();
  h.legacy();h.reconnect();
  await expect(page.locator('#sync')).toContainText('Selection stays on this desk');
  await page.getByRole('button',{name:'Juniper, Needs you',exact:true}).click();
  await page.waitForTimeout(900);
  await expect(page.locator('#name')).toHaveText('Juniper');
  expect(h.requests).toEqual([]);
});

test('desk keeps content contained and touch targets usable at all widget sizes',async({page})=>{
  const h=await setup(page); h.sessions[0].preview.text='A long conversation excerpt. '.repeat(160);
  await expect(page.locator('#excerpt')).toContainText('A long conversation excerpt.');
  for(const viewport of [{width:840,height:696},{width:696,height:840},{width:420,height:348}]){
    await page.setViewportSize(viewport);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    for(const button of await page.locator('main button').all()){
      const bounds=await button.boundingBox();expect(bounds.height).toBeGreaterThanOrEqual(44);expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.y+bounds.height).toBeLessThanOrEqual(viewport.height);
    }
    expect(await page.locator('.note-scroll').evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
    await page.screenshot({path:`artifacts/ranch-desk/${viewport.width}x${viewport.height}.png`});
  }
});

test('desk resolves a shared resident beyond the first four sessions',async({page})=>{
 const h=await setup(page);h.sessions.push({id:'five',project:'Willow',state:'ready',metadata:{folder:'D:/willow',model:'fifth-model'}});h.external('five');
 await expect(page.locator('#name')).toHaveText('Willow');await expect(page.locator('#folder')).toHaveText('D:/willow');await expect(page.locator('#model')).toHaveText('fifth-model');await expect(page.locator('#roster button')).toHaveCount(4);
});
