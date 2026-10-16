const {test}=require('node:test');const assert=require('node:assert/strict');
test('personality controls pixel speed independent of ranch size and identity color',()=>{
 const {step,personalities,paceMultiplier}=require('../sources/omp-bot/world.js');assert.equal(paceMultiplier,1.725);
 for(const [personality,trait] of Object.entries(personalities))for(const width of [840,1688])for(const color of [0,11,31]){
  const bot={slot:0,color,personality};step(bot,'idle',0,0,false,400,90,width,90);bot.target={x:80,y:80};const start={...bot.position};step(bot,'idle',50,.05,false,400,90,width,90);
  const distance=Math.hypot((bot.position.x-start.x)*width/100,(bot.position.y-start.y)*4);assert.ok(Math.abs(distance-trait.speed*paceMultiplier*.05)<.001);
  bot.target={...bot.position};bot.next=0;step(bot,'idle',2000,0,false,400,90,width,90);assert.ok(bot.next>=2000+60000/trait.turns);
 }
});
test('map definitions own activity routes and reject missing destinations',()=>{
 const {step,validateMap}=require('../sources/omp-bot/world.js');
 const alternate={stations:{desk:{x:20,y:30},lab:{x:80,y:30},bell:{x:50,y:50}},workRoutes:{reading:'desk',researching:'lab',writing:'desk',thinking:'desk',running:'lab',working:'lab'}};
 assert.equal(validateMap(alternate),true);
 const bot={slot:0,session:{state:'thinking'}};step(bot,'work',0,0,true,450,90,1650,90,false,alternate);assert.equal(bot.station,'desk');assert.ok(bot.position.x<30);
 assert.throws(()=>step({slot:0,session:{state:'writing'}},'work',0,0,true,450,90,1650,90,false,{...alternate,workRoutes:{...alternate.workRoutes,writing:'missing'}}),/invalid map/i);
 assert.throws(()=>validateMap({...alternate,workRoutes:{...alternate.workRoutes,reading:undefined}}),/invalid map/i);
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
 bot.session.state='thinking';step(bot,'work',3.5,0,true,450,90,1650,90);assert.equal(bot.station,'workshop');assert.equal(bot.hammering,true);
 step(bot,'waiting',4,0,true,450,90,1650,90);assert.equal(bot.station,'bell');assert.ok(Math.abs(bot.position.y-50)<25);assert.ok(Math.abs(bot.position.x-50)>5);
 const positions=[];for(let slot=0;slot<4;slot++){const b={slot,session:{state:'reading'}};step(b,'work',0,0,true,450,90,1650,90);positions.push(b.position.x);}assert.equal(new Set(positions).size,4);
});
test('Done presentation expires at three minutes without changing task state or resetting missing timestamps',()=>{
 const {present,mode}=require('../sources/omp-bot/world.js'),seen=new Map();const done={id:'bot-1',state:'done',finishedAt:1000};assert.equal(present(done,180999,seen).state,'done');const expired=present(done,181000,seen);assert.equal(expired.state,'ready');assert.equal(expired.presentationExpired,true);assert.equal(mode(expired,181000,120),'idle');assert.equal(done.state,'done');
 const unknown={id:'bot-2',state:'done'};assert.equal(present(unknown,5000,seen).state,'done');assert.equal(present({...unknown},184999,seen).state,'done');assert.equal(present({id:'bot-2',state:'offline'},184999,seen).state,'offline');assert.equal(present({...unknown},185000,seen).state,'ready');assert.equal(present({id:'bot-2',state:'running'},190000,seen).state,'running');assert.equal(present({id:'bot-2',state:'done'},200000,seen).state,'done');assert.equal(present({id:'bot-2',state:'offline'},201000,seen).state,'offline');assert.equal(present({id:'bot-2',state:'done'},202000,seen).state,'done');
 assert.equal(mode({state:'waiting',finishedAt:1000},200000,120),'waiting');assert.equal(present({id:'bot-3',state:'done',finishedAt:2000},3000,seen).state,'done');
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
test('completed bot wake acknowledgment starts a fresh sleep age without changing completion provenance',()=>{
 const {mode,present}=require('../sources/omp-bot/world.js');
 const now=122000,done={id:'done-wake',state:'done',finishedAt:1000,idleSince:1000};
 assert.equal(mode(done,now,120),'sleep');
 const acknowledged={...done,idleSince:now};
 assert.equal(mode(acknowledged,now,120),'idle');
 assert.equal(mode(acknowledged,now+119999,120),'idle');
 assert.equal(mode(acknowledged,now+120000,120),'sleep');
 assert.equal(acknowledged.finishedAt,1000);
 assert.equal(present(acknowledged,181000).state,'ready','completion display still expires from the original completion');
 assert.equal(mode({...done,idleSince:500},now,120),'sleep','an earlier idle timestamp cannot postpone sleep');
});
test('curious residents visit reachable landmarks and work interrupts excursions',()=>{
 const {step,homes,maps}=require('../sources/omp-bot/world.js');
 for(let slot=0;slot<6;slot++){
  const bot={slot,personality:'curious'};step(bot,'idle',0,0,false);step(bot,'idle',2000,0,false);
  assert.ok(maps.meadow.pois[bot.visit]);const destination={...bot.target};
  for(let time=2050;time<=18000;time+=50){step(bot,'idle',time,.05,false);if(!bot.walking)break;}
  assert.ok(Math.hypot(bot.position.x-destination.x,bot.position.y-destination.y)<1,'finish landmark walks');
  step(bot,'work',18001,0,true);assert.equal(bot.station,'workshop');assert.equal(bot.visit,null);
  step(bot,'sleep',18002,0,true);assert.deepEqual(bot.position,homes[slot]);
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

test('six residents have distinct docks and packed work positions within Large and XL ranch bounds',()=>{
 const {step,homes,docks}=require('../sources/omp-bot/world.js');assert.equal(homes.length,6);assert.equal(docks.length,6);
 for(const [width,height] of [[1100,560],[1650,540],[600,400]])for(const state of ['offline','reading','writing','waiting']){
  const positions=[];
  for(let slot=0;slot<6;slot++){const b={slot,session:{state}};step(b,state==='offline'?'offline':state==='waiting'?'waiting':'work',0,0,true,height,94,width,72);const x=b.position.x*width/100,y=b.position.y*height/100;assert.ok(x>=36&&x<=width-36);assert.ok(y>=47&&y<=height-47);positions.push({x,y});}
  for(let a=0;a<6;a++)for(let b=a+1;b<6;b++)assert.ok(Math.abs(positions[a].x-positions[b].x)>=72||Math.abs(positions[a].y-positions[b].y)>=94,'six bots must not overlap at '+state);
 }
});
