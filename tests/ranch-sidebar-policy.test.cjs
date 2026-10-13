const {test}=require('node:test'),assert=require('node:assert/strict');
const p=require('../sources/omp-bot-desktop/window-policy.cjs');
test('sidebar capabilities permit explicit revisioned operations without arbitrary admin access',()=>{
 assert.equal(p.actionRequest('ring-all',{}).route,'/admin/profile/ring-all');
 assert.deepEqual(p.actionRequest('session',{id:'bot'}),{route:'/admin/action',body:{id:'bot',action:'resume'}});
 assert.equal(p.actionRequest('membership',{id:'bot',active:false,expectedRevision:4}).route,'/admin/membership');
 assert.equal(p.actionRequest('factory',{nickname:'Piper',folder:'',role:'pipeline',color:3}).body.active,false);
 assert.equal(p.actionRequest('queue',{id:'task',profileId:null,beforeTaskId:null,expectedRevision:2,expectedQueueRevision:3}).route,'/admin/task/queue');
 for(const [name,body] of [['session',{id:'bot',confirmed:true}],['factory',{nickname:'Evil',active:true}],['membership',{id:'bot',active:false}],['task-save',{title:'Wrong',status:'done'}],['ring-all',{id:'bot'}],['queue',{id:'task',profileId:null,expectedRevision:NaN,expectedQueueRevision:1}]])assert.throws(()=>p.actionRequest(name,body));
});
test('long mode uses usable monitor height and returns to compact short dimensions',()=>{
 const area={x:-1280,y:-200,width:1280,height:900},anchor={x:-100,y:50};
 const long=p.placement(anchor,area,true,'long');
 assert.equal(long.height,900);assert.equal(long.y,-200);assert.ok(long.x>=area.x);assert.ok(long.x+long.width<=0);
 assert.equal(p.placement(anchor,area,false,'long').height,900);
 assert.equal(p.placement(anchor,area,false,'short').height,390);
 assert.equal(p.preferences({length:'long'}).length,'long');
 assert.deepEqual(p.windowRequest('length','long'),{action:'length',value:'long'});
 assert.throws(()=>p.windowRequest('length','huge'));
});

test('companion pop-outs restrict pages, assets and API routes to their exact origin',()=>{
 const {allowedRequest,allowedNavigation}=require('../sources/omp-bot-desktop/companion-window.cjs');
 const origin='http://127.0.0.1:43822';
 for(const url of ['/board/','#invalid','/setup/','/setup/board.js','/admin/task/queue']){
  if(url==='#invalid')continue;
  assert.equal(allowedRequest(origin+url,origin),true,url);
 }
 for(const url of ['https://example.com/','file:///C:/private','http://localhost:43822/board/',origin+'/admin/shutdown',origin+'/runtime/work',origin+'/board/?elsewhere=1'])assert.equal(allowedRequest(url,origin),false,url);
 assert.equal(allowedNavigation(origin+'/setup/',origin),true);
 assert.equal(allowedNavigation(origin+'/admin/state',origin),false);
});
