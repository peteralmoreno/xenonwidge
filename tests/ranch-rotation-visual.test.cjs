const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const world=require('../sources/omp-bot/world.js');
test('unified motion migrates legacy preferences and respects reduced motion',()=>{
 assert.equal(world.motionPreference(null,'off','on'),'still');
 assert.equal(world.motionPreference(null,'on','on'),'calm');
 assert.equal(world.motionPreference(null,'on','off'),'lively');
 assert.equal(world.motionPreference('lively','off','on'),'lively');
 assert.equal(world.effectiveMotion('lively',true),'still');
});
test('Pipeline sleeping state is authoritative and charging or working remain distinct',()=>{
 assert.equal(world.mode({state:'ready',pipeline:true,sleeping:true},1000),'sleep');
 assert.equal(world.mode({state:'offline',sleeping:true},1000),'offline');
 assert.equal(world.mode({state:'writing',sleeping:true},1000),'work');
});
test('personality pace is fifty percent faster and independent of identity color',()=>{
 assert.equal(world.paceMultiplier,1.725);
 assert.equal(world.personalities.calm.speed,32);
 for(const personality of ['calm','curious','cheerful','focused','sociable']){
  const positions=[];
  for(const color of [0,11,31]){const b={slot:0,color,personality};world.step(b,'idle',0,0,false);b.target={x:80,y:80};world.step(b,'idle',50,.05,false);positions.push(b.position);}
  assert.deepEqual(positions[0],positions[1]);assert.deepEqual(positions[1],positions[2]);
 }
});
test('idle visits dwell after arrival and sociable visits never target working neighbors',()=>{
 const b={slot:0,personality:'sociable',neighbors:[{mode:'work',position:{x:40,y:40}}]};world.step(b,'idle',0,0,false);world.step(b,'idle',2000,0,false);assert.notEqual(b.visit,'neighbor');
 b.position={...b.target};world.step(b,'idle',3000,0,false);const target={...b.target};assert.ok(b.next>=18000);world.step(b,'idle',17000,0,false);assert.deepEqual(b.target,target);
});
test('attention positions leave the clickable bell and neighboring residents clear',()=>{
 for(const [width,height]of [[1100,560],[1650,540],[600,400]])for(let slot=0;slot<6;slot++){
  const b={slot};world.step(b,'waiting',0,0,true,height,94,width,72);
  assert.ok(Math.abs((b.position.x-50)*width/100)>=72/2+35+8,'attention residents leave a clear bell corridor');
 }
});
test('new maps have distinct scenery destinations and interrupt idle visits for work',()=>{
 for(const map of ['meadow','courtyard','glasshouse','rooftop','depot']){
  assert.equal(world.validateMap(world.maps[map]),true);assert.ok(Object.keys(world.maps[map].pois||{}).length===0);
  const b={slot:0,personality:'curious'};world.step(b,'idle',0,0,false,540,94,1650,72,false,map);world.step(b,'idle',2000,0,false,540,94,1650,72,false,map);assert.equal(b.visit,null);
  b.session={state:'writing'};world.step(b,'work',2001,0,false,540,94,1650,72,false,map);assert.equal(b.station,world.maps[map].workRoutes.writing);assert.equal(b.visit,null);
 }
});
test('feed portraits frame head and chest for every design and retain identity color',()=>{
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync('sources/omp-bot/sprites.js','utf8'),ctx);const s=ctx.window.RanchSprites;
 for(const design of ['classic','pm','pipeline']){const svg=s.portrait(11,design);assert.match(svg,/viewBox="8 2 48 47"/);assert.match(svg,/sprite portrait/);assert.ok(svg.includes(s.colors[11][1]));if(design!=='classic')assert.ok(svg.includes(`class="${design}"`));}
});
test('Ranch retains observation and exposes only universal wake with separate attention navigation',()=>{
 const html=fs.readFileSync('sources/omp-bot/index.html','utf8'),app=fs.readFileSync('sources/omp-bot/app.js','utf8');
 for(const id of ['tasks-tab','tasks-view','profile-editor','profile-context','quiet','desk-clean','pickup-toggle'])assert.ok(!html.includes(`id="${id}"`),id+' removed');
 assert.match(html,/id="motion-menu"/);for(const value of ['lively','calm','still'])assert.match(html,new RegExp(`value="${value}"`));
 assert.match(html,/id="wake-bell"/);assert.match(html,/id="needs-you"/);assert.match(app,/controlApi\('profiles\/wake',\{\}\)/);assert.doesNotMatch(app,/controlApi\('(?:profile\/clean|task\/start|task\/pipeline|profile')/);
});
