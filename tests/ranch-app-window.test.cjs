const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'../sources/omp-bot-desktop/ranch-window.cjs');
const host=fs.existsSync(file)?require(file):{};
test('standalone Ranch is a normal resizable sandbox without dock privileges',()=>{
 assert.equal(typeof host.ranchOptions,'function');
 const o=host.ranchOptions('/app',{x:0,y:0,width:1200,height:700});
 assert.equal(o.frame,true);assert.equal(o.resizable,true);assert.equal(o.skipTaskbar,false);
 assert.equal(o.webPreferences.nodeIntegration,false);assert.equal(o.webPreferences.contextIsolation,true);assert.equal(o.webPreferences.sandbox,true);
 assert.equal(o.webPreferences.preload,undefined);
});
test('standalone Ranch only loads its own loopback UI and widget API routes',()=>{
 assert.equal(typeof host.allowedRequest,'function');
 const origin='http://127.0.0.1:12345';
 for(const p of ['/ui/','/ui/app.js','/state','/control/state','/control/profile/check-work','/selection','/focus'])assert.equal(host.allowedRequest(origin+p,origin),true,p);
 for(const p of ['/admin/key','/admin/state','/runtime/claim','/ui/../../admin/key','/setup/'])assert.equal(host.allowedRequest(origin+p,origin),false,p);
 for(const url of ['https://example.com','http://127.0.0.1:12346/state','file:///C:/secret','http://127.0.0.1:12345@evil.test/ui/'])assert.equal(host.allowedRequest(url,origin),false,url);
});
