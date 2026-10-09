const {test}=require('node:test');const assert=require('node:assert/strict');
test('color traits set calm pixel speed independent of ranch size and cap idle turns',()=>{
 const {step,traits}=require('../sources/omp-bot/world.js');assert.equal(traits.length,12);
 for(let color=0;color<12;color++)for(const width of [840,1688]){
  const bot={slot:0,color};step(bot,'idle',0,0,false,400,90,width,90);bot.target={x:80,y:80};const start={...bot.position};step(bot,'idle',50,.05,false,400,90,width,90);
  const distance=Math.hypot((bot.position.x-start.x)*width/100,(bot.position.y-start.y)*4);assert.ok(Math.abs(distance-traits[color].speed*.05)<.001);assert.ok(distance<=1.801);
  bot.target={...bot.position};bot.next=0;step(bot,'idle',2000,0,false,400,90,width,90);assert.ok(bot.next>=2000+60000/traits[color].turns);
 }
});
test('changing map reroutes work to its matching station',()=>{
 const {step}=require('../sources/omp-bot/world.js');const bot={slot:0,session:{state:'writing'}};
 step(bot,'work',0,0,true,450,90,1688,90);const meadow={...bot.position};step(bot,'work',10,0,true,450,90,1688,90,false,'courtyard');assert.ok(bot.position.x>meadow.x+40);assert.ok(bot.position.y<meadow.y-40);
});
test('work activities change destinations immediately and attention goes to the bell',()=>{
 const {step}=require('../sources/omp-bot/world.js');const bot={slot:0,session:{state:'reading'}};step(bot,'work',0,0,true,450,90,1650,90);const reading={...bot.position};assert.equal(bot.station,'reading');assert.equal(bot.hammering,false);
 bot.session.state='researching';step(bot,'work',1,0,true,450,90,1650,90);assert.equal(bot.station,'researching');assert.ok(bot.position.x>reading.x+30);
 bot.session.state='writing';step(bot,'work',2,0,true,450,90,1650,90);assert.equal(bot.station,'writing');assert.ok(bot.position.y>reading.y+30);
 bot.session.state='running';step(bot,'work',3,0,true,450,90,1650,90);assert.equal(bot.hammering,true);
 step(bot,'waiting',4,0,true,450,90,1650,90);assert.equal(bot.station,'bell');assert.ok(Math.abs(bot.position.y-50)<1);
 const positions=[];for(let slot=0;slot<4;slot++){const b={slot,session:{state:'reading'}};step(b,'work',0,0,true,450,90,1650,90);positions.push(b.position.x);}assert.equal(new Set(positions).size,4);
});
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
 const {step,homes}=require('../sources/omp-bot/world.js');
 t.mock.method(Math,'random',()=>.99);
 for(let slot=0;slot<4;slot++){
  const bot={slot};step(bot,'idle',0,0,false);
  step(bot,'idle',2000,0,false);
  assert.ok(bot.target.x>80&&bot.target.y>80,'all residents can visit the far corner');
  const destination={...bot.target};
  for(let time=2050;time<=40000;time+=50)step(bot,'idle',time,.05,false);
  assert.ok(Math.hypot(bot.position.x-destination.x,bot.position.y-destination.y)<1,'finish long walks');
  step(bot,'work',16000,0,true);assert.equal(bot.station,'workshop');
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
