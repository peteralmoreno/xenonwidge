const {chromium}=require('@playwright/test');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:840,height:696}});
  page.on('console',message=>{if(message.type()==='error')console.error(message.text());});
  await page.goto(require('node:url').pathToFileURL(path.join(__dirname,'../sources/audio-deck/index.html')).href);
  await page.getByLabel('Pairing key').fill(fs.readFileSync(path.join(process.env.LOCALAPPDATA,'AudioDeck/pairing-key.txt'),'utf8').trim());
  await page.getByRole('button',{name:'Connect',exact:true}).click();
  await page.getByRole('button',{name:'Connection settings'}).filter({hasText:'Connected'}).waitFor({timeout:15000});
  assert.equal(await page.getByRole('slider',{name:'Master volume'}).isEnabled(),true);
  await page.getByRole('tab',{name:'Mixer',exact:true}).click();
  console.log('Live Chromium widget connected to Windows companion; enabled mixer sliders: '+await page.getByRole('slider').count());
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
