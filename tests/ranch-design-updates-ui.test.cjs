const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const world=require('../sources/omp-bot/world.js');
function sprites(){const ctx={window:{}};vm.runInNewContext(fs.readFileSync('sources/omp-bot/sprites.js','utf8'),ctx);return ctx.window.RanchSprites;}
test('Pipeline keeps activity props and colors, with legacy Classic fallback',()=>{
 const s=sprites();assert.notEqual(s.svg(0,'ready','pipeline'),s.svg(0,'ready'));
 assert.equal(s.svg(0,'ready','unknown'),s.svg(0,'ready','classic'));
 for(let color=0;color<16;color++)for(const state of ['ready','reading','researching','writing','running','thinking','waiting','done','error','offline']){
  const result=s.svg(color,state,'pipeline');assert.match(result,/pipeline/);assert.ok(result.includes(s.colors[color][1]));assert.match(result,/class="prop"/);
 }
});
test('held shake requires three full reversals in 900ms and fires once with per-bot cooldown',()=>{
 assert.equal(typeof world.createShakeDetector,'function');const detector=world.createShakeDetector();
 detector.start('a',0,0);for(const [x,t]of [[30,100],[0,200],[30,300]])assert.equal(detector.move(x,t),false);
 assert.equal(detector.move(0,400),true);assert.equal(detector.move(30,500),false);detector.end();
 detector.start('a',0,1000);for(const [x,t]of [[30,1100],[0,1200],[30,1300],[0,1400]])assert.equal(detector.move(x,t),false);
 detector.start('b',0,2000);for(const [x,t]of [[30,2100],[0,2200],[30,2300]])detector.move(x,t);assert.equal(detector.move(0,2400),true);
 detector.start('a',0,11000);for(const [x,t]of [[30,11100],[0,11200],[30,11300]])detector.move(x,t);assert.equal(detector.move(0,11400),true);
});
test('jitter, straight drag, slow reversals and cancellation never wake',()=>{
 assert.equal(typeof world.createShakeDetector,'function');
 for(const points of [[[10,100],[-10,200],[10,300],[-10,400]],[[30,100],[60,200],[90,300],[120,400]],[[30,400],[0,800],[30,1200],[0,1600]]]){const d=world.createShakeDetector();d.start('a',0,0);for(const [x,t]of points)assert.equal(d.move(x,t),false);}
 const d=world.createShakeDetector();d.start('a',0,0);d.move(30,100);d.move(0,200);d.move(30,300);d.end();assert.equal(d.move(0,400),false);
});
test('setup editor previews selected design/color and saves it independently of role',async()=>{
 const nodes=new Map(),sent=[];
 const make=()=>({value:'',children:[],dataset:{},style:{setProperty(){}},append(...children){this.children.push(...children);},replaceChildren(){this.children=[];},setAttribute(){},showModal(){this.open=true;},close(){this.open=false;},click(){return this.onclick?.();}});
 const get=id=>{if(!nodes.has(id))nodes.set(id,make());return nodes.get(id);};
 const profiles=[{id:'one',nickname:'Piper',folder:'D:/work',color:0,active:true,status:'closed',role:'reviewer',design:'pipeline',revision:4}];
 const context={RanchSprites:sprites(),document:{getElementById:get,createElement:make,querySelectorAll:()=>[]},URLSearchParams,location:{hash:'#admin=test',pathname:'/'},history:{replaceState(){}},sessionStorage:{getItem(){},setItem(){}},AbortSignal,setInterval(){},fetch:async(url,options)=>{if(options?.method==='POST')sent.push(JSON.parse(options.body));return {ok:true,json:async()=>url.endsWith('/checks')?{checks:[]}:{profiles,roles:[],sleepSeconds:60,widgetConnected:false}};}};
 vm.runInNewContext(fs.readFileSync('sources/omp-bot-companion/setup/app.js','utf8'),context);await new Promise(resolve=>setImmediate(resolve));
 get('cards').children[0].children[0].children[1].onclick();assert.equal(get('design').value,'pipeline');assert.match(get('design-preview').innerHTML,/pipeline/);
 get('design').value='classic';get('design').onchange();assert.doesNotMatch(get('design-preview').innerHTML,/pipeline/);get('color-options').children[11].children[0].onchange();assert.ok(get('design-preview').innerHTML.includes('#cf7070'));
 await get('profile-form').onsubmit({preventDefault(){}});assert.equal(sent[0].design,'classic');assert.equal(sent[0].role,'reviewer');assert.equal(sent[0].color,11);
});
