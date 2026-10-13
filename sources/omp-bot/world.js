(function(root){
 const workActivities=['reading','researching','writing','thinking','running','working'];
 const work=new Set(workActivities),paceMultiplier=1.15;
 const maps={
  meadow:{stations:{reading:{x:25,y:28},researching:{x:75,y:28},writing:{x:25,y:72},workshop:{x:75,y:72},bell:{x:50,y:50}},workRoutes:{reading:'reading',researching:'researching',writing:'writing',thinking:'workshop',running:'workshop',working:'workshop'}},
  courtyard:{stations:{reading:{x:25,y:28},researching:{x:75,y:72},writing:{x:75,y:28},workshop:{x:25,y:72},bell:{x:50,y:50}},workRoutes:{reading:'reading',researching:'researching',writing:'writing',thinking:'workshop',running:'workshop',working:'workshop'}}
 };
 function validateMap(map){
  if(!map||typeof map!=='object'||!map.stations||typeof map.stations!=='object'||!map.workRoutes||typeof map.workRoutes!=='object')throw Error('Invalid map: stations and work routes are required.');
  for(const activity of workActivities){const station=map.workRoutes[activity],point=map.stations[station];if(typeof station!=='string'||!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.x>100||point.y<0||point.y>100)throw Error('Invalid map: '+activity+' must route to a defined station.');}
  const bell=map.stations.bell;if(!bell||!Number.isFinite(bell.x)||!Number.isFinite(bell.y))throw Error('Invalid map: attention bell station is required.');
  return true;
 }
 for(const map of Object.values(maps))validateMap(map);
 function resolveMap(map){const result=typeof map==='string'?maps[map]:map;if(!result)throw Error('Invalid map: unsupported map definition.');validateMap(result);return result;}
 function mode(s,now,sleep=120){if(!s||s.state==='offline')return 'offline';if(work.has(s.state))return 'work';if(s.state==='waiting'||s.state==='error')return s.state;const idle=s.state==='done'?(s.finishedAt||s.idleSince||now):(s.idleSince||now);return now-idle>=sleep*1000?'sleep':'idle';}
 function present(s,now,observed=new Map()){if(!s)return s;const key=s.id||s.profileId||s;if(s.state!=='done'){if(work.has(s.state)||s.state==='waiting'||s.state==='error')observed.delete(key);return s;}let finished=s.finishedAt;if(!Number.isFinite(finished)){finished=observed.get(key);if(!Number.isFinite(finished)){finished=now;observed.set(key,finished);}}return now-finished>=180000?{...s,state:'ready',label:'Ready',presentationExpired:true}:s;}
 const docks=[{x:9.25,y:10.8},{x:90.75,y:10.8},{x:9.25,y:89.2},{x:90.75,y:89.2},{x:9.25,y:50},{x:90.75,y:50}];
 const homes=[{x:18,y:25},{x:82,y:25},{x:18,y:75},{x:82,y:75},{x:18,y:50},{x:82,y:50}],stations=[{x:36,y:25},{x:64,y:25},{x:36,y:75},{x:64,y:75}];
 // Pixel speeds are color traits. The modest pace increase applies equally
 // to every bot while preserving each color's relative speed.
 const traits=[{speed:32,turns:6},{speed:28,turns:5},{speed:30,turns:4},{speed:24,turns:4},{speed:27,turns:5},{speed:36,turns:7},{speed:34,turns:6},{speed:25,turns:4},{speed:29,turns:5},{speed:23,turns:3},{speed:26,turns:4},{speed:35,turns:6},{speed:31,turns:5},{speed:27,turns:4},{speed:33,turns:6},{speed:25,turns:5}];
 function step(bot,mode,time,dt,paused,height=400,botHeight=90,width=800,botWidth=100,quiet=false,map='meadow'){
  const activeMap=resolveMap(map),home=homes[bot.slot],trait=traits[bot.color]||traits[bot.slot]||traits[0];
  const activity=bot.session?.state||'working';const stationName=mode==='work'?activeMap.workRoutes[activity]:mode==='waiting'||mode==='error'?'bell':mode==='offline'?'charging':mode==='sleep'?'home':'roam';
  const center=activeMap.stations[stationName];let destination=mode==='offline'?docks[bot.slot]:home;
  if(center){const gap=botWidth+8,compact=height<2*(botHeight+8)+16;const standingCenter={...center,y:center.y+(stationName!=='bell'&&height>250?botHeight*.55/height*100:0)};destination=rowTarget(standingCenter,bot.slot,width,height,botHeight,gap,compact);}
  const layout=[width,height,botWidth,botHeight,typeof map==='string'?map:'custom'].join(':');
  const padX=Math.min(50,Math.max(4,(botWidth/2+8)/Math.max(1,width)*100)),padY=Math.min(50,Math.max(4,(botHeight/2+8)/Math.max(1,height)*100));
  const constrain=p=>{p.x=Math.max(padX,Math.min(100-padX,p.x));p.y=Math.max(padY,Math.min(100-padY,p.y));};
  if(!bot.position)bot.position={...home};if(bot.mode!==mode||bot.station!==stationName||(bot.layout!==layout&&mode!=='idle')){bot.mode=mode;bot.target={...destination};bot.next=time+1200;}bot.station=stationName;bot.layout=layout;
  constrain(bot.position);constrain(bot.target);
  if(mode==='idle'&&time>bot.next&&!paused&&Math.hypot(bot.target.x-bot.position.x,bot.target.y-bot.position.y)<.2){bot.target={x:padX+Math.random()*(100-2*padX),y:padY+Math.random()*(100-2*padY)};bot.next=time+60000/trait.turns*(quiet?2:1)+Math.random()*3000;}
  if(paused){bot.position={...destination};bot.walking=false;}else{const dx=(bot.target.x-bot.position.x)*width/100,dy=(bot.target.y-bot.position.y)*height/100,d=Math.hypot(dx,dy),amount=Math.min(d,Math.max(0,dt)*trait.speed*paceMultiplier*(quiet?.55:1));bot.walking=d>amount+.1;if(d){bot.position.x+=dx/d*amount/width*100;bot.position.y+=dy/d*amount/height*100;}if(d>.1)bot.facing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');}
  constrain(bot.position);bot.hammering=mode==='work'&&stationName==='workshop'&&!bot.walking;return bot;
 }
 function rowTarget(center,slot,width,height,botHeight,gap,compact){
  const count=homes.length,maxColumns=Math.max(1,Math.floor((width-16)/gap));
  const columns=compact?Math.min(count,maxColumns):width*.44>=count*gap?count:Math.min(3,maxColumns);
  const rows=Math.ceil(count/columns),rowHeight=botHeight+8;
  const extentX=(columns-1)*gap/2+gap/2,extentY=(rows-1)*rowHeight/2+botHeight/2+8;
  const cx=Math.max(extentX,Math.min(width-extentX,(compact?50:center.x)*width/100));
  const cy=Math.max(extentY,Math.min(height-extentY,center.y*height/100));
  return {x:(cx+(slot%columns-(columns-1)/2)*gap)/width*100,y:(cy+(Math.floor(slot/columns)-(rows-1)/2)*rowHeight)/height*100};
 }

 function mapLayout(map='meadow'){const active=resolveMap(map);return Object.fromEntries(Object.entries(active.stations).map(([name,point])=>[name,{left:point.x+'%',top:point.y+'%'}]));}
 function createShakeDetector(){
  let gesture=null;const cooldown=new Map();
  return {start(id,x,at){gesture={id,extreme:x,direction:0,turns:[],started:at,fired:false};},end(){gesture=null;},move(x,at){
   const g=gesture;if(!g||g.fired||!Number.isFinite(x)||!Number.isFinite(at))return false;
   const delta=x-g.extreme,direction=Math.sign(delta);
   if(!g.direction){if(Math.abs(delta)>=24){g.direction=direction;g.extreme=x;g.turns.push(at);}return false;}
   if(direction===g.direction){g.extreme=x;return false;}
   if(Math.abs(delta)<24)return false;
   g.direction=direction;g.extreme=x;g.turns=g.turns.filter(t=>at-t<=900);g.turns.push(at);
   if(g.turns.length<4||at-(cooldown.get(g.id)??-Infinity)<10000)return false;
   g.fired=true;cooldown.set(g.id,at);return true;
  }};
 }
 const api={mode,present,step,homes,stations,docks,traits,paceMultiplier,maps,validateMap,mapLayout,createShakeDetector};if(typeof module!=='undefined')module.exports=api;else root.RanchWorld=api;
})(globalThis);
