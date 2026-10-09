const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
async function stroke(page, from = [0.3, 0.5], to = [0.7, 0.5]) {
  const b = await page.locator('#drawing').boundingBox();
  await page.mouse.move(b.x + b.width * from[0], b.y + b.height * from[1]);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * to[0], b.y + b.height * to[1], { steps: 20 });
  await page.mouse.up();
}
async function pixel(page, x = 600, y = 400) {
  return page.locator('#drawing').evaluate((c, p) => [...c.getContext('2d').getImageData(...p, 1, 1).data], [x, y]);
}
test.beforeEach(async ({ page }) => { page.runtimeErrors=[]; page.on('pageerror',error=>page.runtimeErrors.push(error.message)); await page.goto('/'); });
test.afterEach(async ({ page }) => { expect(page.runtimeErrors).toEqual([]); });

test('paper changes preserve ink and history, survive reload, and appear in PNG exports',async({page})=>{
 await stroke(page);const ink=await pixel(page);
 for(const [name,rgb] of [['Black',[0,0,0]],['Cream',[255,248,231]],['White',[255,255,255]]]){
  await page.getByRole('button',{name:name+' paper',exact:true}).click();
  expect(await pixel(page)).toEqual(ink);
  await expect(page.locator('#paper')).toHaveCSS('background-color',`rgb(${rgb.join(', ')})`);
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save PNG',exact:true}).click();
  const bytes=await fs.readFile(await (await pending).path());
  const exported=await page.evaluate(async data=>{const image=new Image();image.src=data;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return [...ctx.getImageData(0,0,1,1).data];},'data:image/png;base64,'+bytes.toString('base64'));
  expect(exported).toEqual([...rgb,255]);
 }
 await page.getByRole('button',{name:'Cream paper',exact:true}).click();
 await expect(page.locator('#draft-status')).toHaveText('Draft saved');await page.reload();
 await expect(page.getByRole('button',{name:'Cream paper',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(await pixel(page)).toEqual(ink);
 await stroke(page,[.3,.7],[.7,.7]);await page.getByRole('button',{name:'Undo',exact:true}).click();
 expect((await pixel(page,600,560))[3]).toBe(0);await expect(page.locator('#paper')).toHaveCSS('background-color','rgb(255, 248, 231)');
});

test('eyedropper blends transparent marks with the selected paper and erasing reveals it',async({page})=>{
 await page.getByRole('button',{name:'Black paper',exact:true}).click();
 await page.getByRole('button',{name:'White',exact:true}).click();await page.getByRole('button',{name:'Marker',exact:true}).click();await stroke(page);
 await page.getByRole('button',{name:'Eyedropper',exact:true}).click();const b=await page.locator('#drawing').boundingBox();await page.mouse.click(b.x+b.width*.5,b.y+b.height*.5);
 await page.getByRole('button',{name:'Custom color',exact:true}).click();await expect(page.getByLabel('Hex color')).toHaveValue('#666666');await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:'Eraser',exact:true}).click();await stroke(page);expect((await pixel(page))[3]).toBe(0);
 await page.getByRole('button',{name:'Eyedropper',exact:true}).click();await page.mouse.click(b.x+b.width*.5,b.y+b.height*.5);
 await page.getByRole('button',{name:'Custom color',exact:true}).click();await expect(page.getByLabel('Hex color')).toHaveValue('#000000');
});
test('document prolog and head parse as XML before title lookup', async ({ page, request }) => {
  const html = await (await request.get('/')).text();
  const result = await page.evaluate(source => {
    const prefix = source.slice(0, source.indexOf('</head>') + 7) + '</html>';
    const doc = new DOMParser().parseFromString(prefix, 'application/xml');
    return { error: doc.querySelector('parsererror')?.textContent || null, title: doc.querySelector('head > title')?.textContent };
  }, html);
  expect(result.error).toBeNull();
  expect(result.title).toBe("tr('Doodle Pad')");
});
test('drawing, undo, redo, clear and cancel leave correct artwork', async ({ page }) => {
  await stroke(page);
  expect((await pixel(page))[3]).toBe(255);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await pixel(page))[3]).toBe(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect((await pixel(page))[3]).toBe(255);
  await page.getByRole('button', { name: 'Clear page', exact: true }).click();
  await page.getByRole('button', { name: 'Keep drawing', exact: true }).click();
  expect((await pixel(page))[3]).toBe(255);
  await page.getByRole('button', { name: 'Clear page', exact: true }).click();
  await page.getByRole('button', { name: 'Clear drawing', exact: true }).click();
  expect((await pixel(page))[3]).toBe(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await pixel(page))[3]).toBe(255);
});
test('marker alpha does not build up within one stroke; eraser stays opaque', async ({ page }) => {
  await page.getByRole('button', { name: 'Marker', exact: true }).click();
  await stroke(page);
  expect((await pixel(page))[3]).toBeCloseTo(102, -1);
  expect((await pixel(page, 450, 400))[3]).toBeCloseTo(102, -1);
  await page.getByRole('button', { name: 'Eraser', exact: true }).click();
  await stroke(page);
  expect((await pixel(page))[3]).toBe(0);
});
test('custom picker cancellation, opacity, and eyedropper', async ({ page }) => {
  await page.getByRole('button', { name: 'Custom color', exact: true }).click();
  await page.getByLabel('Hex color').fill('#ff0000');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await stroke(page);
  expect((await pixel(page)).slice(0, 3)).toEqual([28, 37, 54]);
  await page.getByRole('button', { name: 'Custom color', exact: true }).click();
  await page.getByLabel('Hex color').fill('#ff0000');
  await page.getByLabel('Opacity', { exact: true }).fill('50');
  await page.getByRole('button', { name: 'Use color', exact: true }).click();
  await stroke(page, [0.3, 0.7], [0.7, 0.7]);
  expect((await pixel(page, 600, 560))[3]).toBeCloseTo(128, -1);
  await page.getByRole('button', { name: 'Eyedropper', exact: true }).click();
  const b = await page.locator('#drawing').boundingBox();
  await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.7);
  await expect(page.getByRole('button', { name: 'Pen', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Custom color', exact: true }).click();
  await expect(page.getByLabel('Hex color')).toHaveValue('#ff7f7f');
  await expect(page.getByLabel('Opacity', { exact: true })).toHaveValue('50');
});
test('resize preserves pixels and draft survives reload', async ({ page }) => {
  await stroke(page);
  await page.setViewportSize({ width: 696, height: 840 });
  expect((await pixel(page))[3]).toBe(255);
  await expect(page.locator('#draft-status')).toHaveText('Draft saved');
  await page.reload();
  await expect.poll(async () => (await pixel(page))[3]).toBe(255);
});
test('PNG download contains the drawing and clipboard supports image roundtrip', async ({ page, context }) => {
  await stroke(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save PNG', exact: true }).click();
  const download = await downloadPromise;
  const bytes = await fs.readFile(await download.path());
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(800);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.locator('#status')).toContainText('Copied');
  await page.getByRole('button', { name: 'Clear page', exact: true }).click();
  await page.getByRole('button', { name: 'Clear drawing', exact: true }).click();
  await page.getByRole('button', { name: 'Paste', exact: true }).click();
  await expect(page.locator('#status')).toContainText('pasted');
  expect((await pixel(page))[3]).toBe(255);
});
test('pointer cancellation discards only the unfinished stroke', async ({ page }) => {
  await stroke(page);
  const canvas = page.locator('#drawing');
  const b=await canvas.boundingBox();
  await page.mouse.move(b.x+b.width*.3,b.y+b.height*.2);
  await page.mouse.down();
  await page.mouse.move(b.x+b.width*.7,b.y+b.height*.2,{steps:10});
  await canvas.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
  await page.mouse.up();
  expect((await pixel(page))[3]).toBe(255);
  expect((await pixel(page,600,160))[3]).toBe(0);
  await stroke(page, [0.3, 0.7], [0.7, 0.7]);
  expect((await pixel(page, 600, 560))[3]).toBe(255);
});

test('all medium and preview layouts keep controls inside the viewport',async({page})=>{
  for(const [width,height] of [[840,696],[696,840],[420,348],[348,420]]) {
    await page.setViewportSize({width,height});
    for(const selector of ['#paper','.paintbox','#custom-color','#save','#status']) {
      await expect.poll(async()=>{const b=await page.locator(selector).boundingBox();return b.x>=0 && b.y>=0 && b.x+b.width<=width+1 && b.y+b.height<=height+1;},{message:selector+' fits '+width+'x'+height}).toBe(true);
    }
    await page.getByRole('button',{name:'Custom color',exact:true}).click();
    const button=await page.getByRole('button',{name:'Use color',exact:true}).boundingBox();
    expect(button.y+button.height).toBeLessThanOrEqual(height);
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
  }
});
test('clipboard rejection and non-image content preserve the drawing',async({page,context})=>{
  await stroke(page);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{read:async()=>{throw new DOMException('Denied','NotAllowedError');}}}));
  await page.getByRole('button',{name:'Paste',exact:true}).click();
  await expect(page.locator('#status')).toContainText('blocked');
  expect((await pixel(page))[3]).toBe(255);
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{read:async()=>[{types:['text/plain']}]}}));
  await page.getByRole('button',{name:'Paste',exact:true}).click();
  await expect(page.locator('#status')).toContainText('No image');
  expect((await pixel(page))[3]).toBe(255);
});
test('corrupt and full storage leave drawing usable',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('com.xeneonwidge.doodlepad.browser','corrupt'));
  await page.reload();
  await expect(page.locator('#status')).toContainText('Could not restore');
  await page.evaluate(()=>{ Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');}; });
  await stroke(page);
  await expect(page.locator('#draft-status')).toHaveText('Draft not saved');
  expect((await pixel(page))[3]).toBe(255);
});
test('iCUE instance IDs isolate drafts and preserve unrelated stored properties',async({browser})=>{
  const context=await browser.newContext({viewport:{width:840,height:696}});
  await context.addInitScript(()=>{ window.iCUE={}; window.uniqueId=new URL(location.href).searchParams.get('instance'); });
  const a=await context.newPage(),b=await context.newPage();
  await a.goto('http://127.0.0.1:4173/?instance=one');
  await a.evaluate(()=>localStorage.setItem('one',JSON.stringify({otherWidgetData:'keep'})));
  await stroke(a);
  await expect(a.locator('#draft-status')).toHaveText('Draft saved');
  expect(await a.evaluate(()=>JSON.parse(localStorage.getItem('one')).otherWidgetData)).toBe('keep');
  await b.goto('http://127.0.0.1:4173/?instance=two');
  expect((await pixel(b))[3]).toBe(0);
  await a.reload();
  await expect.poll(async()=>(await pixel(a))[3]).toBe(255);
  await context.close();
});
test('hue survives grayscale, zero opacity is invisible, and erase still works',async({page})=>{
  await stroke(page);
  await page.getByRole('button',{name:'Custom color',exact:true}).click();
  await page.getByLabel('Hue',{exact:true}).fill('120');
  await page.getByLabel('Saturation',{exact:true}).fill('0');
  await page.getByLabel('Brightness',{exact:true}).fill('100');
  await expect(page.getByLabel('Hex color')).toHaveValue('#ffffff');
  await page.getByLabel('Saturation',{exact:true}).fill('100');
  await expect(page.getByLabel('Hex color')).toHaveValue('#00ff00');
  await page.getByLabel('Opacity',{exact:true}).fill('0');
  await page.getByRole('button',{name:'Use color',exact:true}).click();
  await page.getByRole('button',{name:'Red',exact:true}).click();
  await stroke(page,[.3,.7],[.7,.7]);
  expect((await pixel(page,600,560))[3]).toBe(0);
  await page.getByRole('button',{name:'Eraser',exact:true}).click();
  await stroke(page);
  expect((await pixel(page))[3]).toBe(0);
});
test('import fits portrait image proportionally and is undoable',async({page})=>{
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=200;const x=c.getContext('2d');x.fillStyle='#ff0000';x.fillRect(0,0,100,200);return c.toDataURL().split(',')[1];});
  await page.locator('#image-file').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await expect(page.locator('#status')).toContainText('Image added');
  expect(await pixel(page)).toEqual([255,0,0,255]);
  expect((await pixel(page,300,400))[3]).toBe(0);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  expect((await pixel(page))[3]).toBe(0);
});
test('touch drawing uses one pointer and creates dots',async({page,context})=>{
  const session=await context.newCDPSession(page), b=await page.locator('#drawing').boundingBox();
  const x=b.x+b.width*.5,y=b.y+b.height*.5;
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(async()=>(await pixel(page))[3]).toBe(255);
  await session.detach();
});

test('draft restore and image import lock conflicting controls until decoding finishes',async({page})=>{
  await stroke(page);await expect(page.locator('#draft-status')).toHaveText('Draft saved');
  await page.addInitScript(()=>{const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){return new Promise((resolve,reject)=>{window.releaseDecode=()=>decode.call(this).then(resolve,reject);});};});
  await page.reload();
  await expect(page.getByRole('button',{name:'Clear page',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Marker',exact:true})).toBeDisabled();
  await page.evaluate(()=>window.releaseDecode());
  await expect(page.getByRole('button',{name:'Clear page',exact:true})).toBeEnabled();
  expect((await pixel(page))[3]).toBe(255);
  const png=await page.locator('#drawing').evaluate(c=>c.toDataURL().split(',')[1]);
  await page.locator('#image-file').setInputFiles({name:'drawing.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await expect(page.getByRole('button',{name:'Clear page',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
  await page.evaluate(()=>window.releaseDecode());
  await expect(page.locator('#status')).toContainText('Image added');
});
test('autosave never captures a canceled eraser preview',async({page})=>{
  await stroke(page); await expect(page.locator('#draft-status')).toHaveText('Draft saved');
  await page.getByRole('button',{name:'Eraser',exact:true}).click();
  const b=await page.locator('#drawing').boundingBox();
  await page.mouse.move(b.x+b.width*.3,b.y+b.height*.5);await page.mouse.down();
  await page.mouse.move(b.x+b.width*.7,b.y+b.height*.5,{steps:20});
  expect((await pixel(page))[3]).toBe(0);
  await expect(page.locator('#draft-status')).toHaveText('Draft saved');
  const savedAlpha=await page.evaluate(async()=>{const d=JSON.parse(localStorage.getItem('com.xeneonwidge.doodlepad.browser')).doodlePad;const i=new Image();i.src=d.png;await i.decode();const c=document.createElement('canvas');c.width=1200;c.height=800;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(600,400,1,1).data[3];});
  expect(savedAlpha).toBe(255);
  await page.locator('#drawing').dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse'});await page.mouse.up();
  expect((await pixel(page))[3]).toBe(255);
});
test('canceling the color picker preserves the eraser selection',async({page})=>{
  await page.getByRole('button',{name:'Eraser',exact:true}).click();
  await page.getByRole('button',{name:'Custom color',exact:true}).click();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.getByRole('button',{name:'Eraser',exact:true})).toHaveAttribute('aria-pressed','true');
});
