const {test}=require('node:test');const assert=require('node:assert/strict');
test('disconnected bots return to corner charging docks',()=>{
 const {step}=require('../sources/omp-bot/world.js');for(let slot=0;slot<4;slot++){
  const bot={slot,position:{x:50,y:50}};step(bot,'offline',0,0,false);
  for(let t=0;t<20;t+=.05)step(bot,'offline',t*1000,.05,false);
  assert.ok(bot.position.x<15||bot.position.x>85);assert.ok(bot.position.y<15||bot.position.y>85);
  step(bot,'offline',21000,0,true);assert.ok(bot.position.x<15||bot.position.x>85);assert.ok(bot.position.y<15||bot.position.y>85);
 }
});
test('connected sleep follows idle time, not heartbeats, and work/questions wake immediately',()=>{
 const {mode}=require('../sources/omp-bot/world.js');const bot={state:'ready',idleSince:1000,lastSeen:1000};assert.equal(mode(bot,5000,120),'idle');assert.equal(mode({...bot,lastSeen:125000},125000,120),'sleep');assert.equal(mode({...bot,state:'writing'},125000,120),'work');assert.equal(mode({...bot,state:'waiting'},125000,120),'waiting');assert.equal(mode({...bot,state:'offline'},125000,120),'offline');assert.equal(mode({...bot,state:'done',finishedAt:124000},125000,120),'idle');
});
test('every resident can cross the ranch and reach distant idle destinations',t=>{
 const {step,homes,stations}=require('../sources/omp-bot/world.js');
 t.mock.method(Math,'random',()=>.99);
 for(let slot=0;slot<4;slot++){
  const bot={slot};step(bot,'idle',0,0,false);
  step(bot,'idle',2000,0,false);
  assert.ok(bot.target.x>80&&bot.target.y>80,'all residents can visit the far corner');
  const destination={...bot.target};
  for(let time=2050;time<=15000;time+=50)step(bot,'idle',time,.05,false);
  assert.ok(Math.hypot(bot.position.x-destination.x,bot.position.y-destination.y)<1,'finish long walks');
  step(bot,'work',16000,0,true);assert.deepEqual(bot.position,stations[slot]);
  step(bot,'sleep',17000,0,true);assert.deepEqual(bot.position,homes[slot]);
 }
});
test('roaming keeps the whole bot inside resized ranch bounds',t=>{
 const {step}=require('../sources/omp-bot/world.js');
 for(const random of [0,.999]){
  t.mock.method(Math,'random',()=>random);
  const bot={slot:0};step(bot,'idle',0,0,false,400,100,1600,100);step(bot,'idle',2000,0,false,400,100,1600,100);
  for(let time=2050;time<16000;time+=50)step(bot,'idle',time,.05,false,400,100,1600,100);
  step(bot,'idle',16000,0,false,110,54,400,72);
  assert.ok(bot.position.x>=11&&bot.position.x<=89);
  assert.ok(bot.position.y>=100*35/110&&bot.position.y<=100*75/110);
 }
});
