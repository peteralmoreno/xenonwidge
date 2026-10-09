// Read-only check against the running user's companion. Never prints its pairing key or session labels.
const {chromium}=require('@playwright/test');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{
 const key=fs.readFileSync(path.join(process.env.LOCALAPPDATA,'OmpBot/pairing-key.txt'),'utf8').trim();const browser=await chromium.launch();
 try{const page=await browser.newPage();await page.route('http://omp-host-test.test/**',route=>{const p=new URL(route.request().url()).pathname;const file=path.join(__dirname,'../sources/omp-bot',p==='/'?'index.html':p);return route.fulfill({path:file,contentType:({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[path.extname(file)]});});
  await page.goto('http://omp-host-test.test/');await page.getByLabel('Pairing key').fill(key);await page.getByRole('button',{name:'Connect',exact:true}).click();
  await page.getByRole('button',{name:'Open companion view'}).waitFor();await page.getByRole('button',{name:'Open companion view'}).click();
  await page.getByRole('button',{name:'Connection settings'}).filter({hasText:'Connected'}).waitFor();assert.equal(new URL(page.url()).hash,'');assert.equal(new URL(page.url()).origin,'http://127.0.0.1:43822');
  console.log('Restricted-origin fallback successfully navigated to the companion view, paired, and read live state. Pairing fragment removed from address.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message.replace(/[a-f0-9]{64}/g,'[redacted]'));process.exitCode=1;});
