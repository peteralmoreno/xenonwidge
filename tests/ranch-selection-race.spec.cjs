const {test,expect}=require('@playwright/test');

async function ranch(browser, run) {
  const {createBridge}=await import('../sources/omp-bot-companion/server.mjs');
  const key='a'.repeat(64), headers={Authorization:'Bearer '+key,'Content-Type':'application/json'};
  const sessions=['one','two','three'].map((id,slot)=>({id,slot,managed:true,color:slot,project:id,state:'reading',label:'Reading',canFocus:false}));
  const server=createBridge({key,manager:{residents:()=>sessions}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:1688,height:696}});
  try {
    await fetch(base+'/selection',{method:'POST',headers,body:JSON.stringify({id:'one'})});
    const page=await context.newPage();
    const state=async()=> (await fetch(base+'/state',{headers})).json();
    await run({page,base,state,open:async()=>{
      await page.goto(base+'/ui/#pair='+key);
      await expect(page.locator('.bot[data-id="one"]')).toHaveAttribute('aria-pressed','true');
    }});
  } finally {
    await context.close();
    server.closeAllConnections();
    await new Promise(resolve=>server.close(resolve));
  }
}

test('Large ranch keeps the last tap when an earlier selection request is delayed',async({browser})=>{
  await ranch(browser,async({page,base,state,open})=>{
    let release, firstSeen=false;
    const held=new Promise(resolve=>release=resolve);
    await page.route(base+'/selection',async route=>{
      if(route.request().postDataJSON().id==='two') {firstSeen=true;await held;}
      await route.continue();
    });
    try {
      await open();
      await page.locator('.bot[data-id="two"]').click();
      await expect.poll(()=>firstSeen).toBe(true);
      await page.locator('.bot[data-id="three"]').click();
      // An unqueued later request can overtake the held request in this window.
      await page.waitForTimeout(150);
      release();
      await expect.poll(async()=> (await state()).selectedId).toBe('three');
      await page.waitForTimeout(900);
      await expect(page.locator('.bot[data-id="three"]')).toHaveAttribute('aria-pressed','true');
      expect((await state()).selectedId).toBe('three');
    } finally {release();}
  });
});

test('Large ranch ignores a state snapshot completed after a newer local selection',async({browser})=>{
  await ranch(browser,async({page,base,state,open})=>{
    await open();
    let release, releaseLater, captured=false, delivered=false;
    const held=new Promise(resolve=>release=resolve);
    const laterPolls=new Promise(resolve=>releaseLater=resolve);
    const stale=await state();
    await page.route(base+'/state',async route=>{
      if(captured) {await laterPolls;await route.abort();return;}
      captured=true;
      await held;
      await route.fulfill({json:stale});
      delivered=true;
    });
    try {
      await expect.poll(()=>captured).toBe(true);
      const posted=page.waitForResponse(response=>response.url()===base+'/selection'&&response.status()===200);
      await page.locator('.bot[data-id="two"]').click();
      await posted;
      await expect.poll(async()=> (await state()).selectedId).toBe('two');
      release();
      // Hold later polls so they cannot repair a rollback before the assertion.
      await expect.poll(()=>delivered).toBe(true);
      await page.waitForTimeout(100);
      await expect(page.locator('.bot[data-id="two"]')).toHaveAttribute('aria-pressed','true');
    } finally {release();releaseLater();}
  });
});
