(function(root){
 const workActivities=['reading','researching','writing','thinking','running','working'];
 const work=new Set(workActivities),paceMultiplier=1.725;
 const maps={
  meadow:{stations:{reading:{x:25,y:28},researching:{x:75,y:28},writing:{x:25,y:72},workshop:{x:75,y:72},bell:{x:50,y:50}},workRoutes:{reading:'reading',researching:'researching',writing:'writing',thinking:'workshop',running:'workshop',working:'workshop'}},
  courtyard:{stations:{reading:{x:25,y:28},researching:{x:75,y:72},writing:{x:75,y:28},workshop:{x:25,y:72},bell:{x:50,y:50}},workRoutes:{reading:'reading',researching:'researching',writing:'writing',thinking:'workshop',running:'workshop',working:'workshop'}}
 };
 const routes={reading:'reading',researching:'researching',writing:'writing',thinking:'workshop',running:'workshop',working:'workshop'};
 maps.glasshouse={stations:{reading:{x:28,y:25},researching:{x:72,y:25},writing:{x:30,y:73},workshop:{x:72,y:73},bell:{x:50,y:50}},workRoutes:{...routes}};
 maps.rooftop={stations:{reading:{x:28,y:32},researching:{x:72,y:32},writing:{x:28,y:73},workshop:{x:72,y:73},bell:{x:50,y:52}},workRoutes:{...routes}};
 maps.depot={stations:{reading:{x:27,y:27},researching:{x:73,y:27},writing:{x:27,y:73},workshop:{x:73,y:73},bell:{x:50,y:50}},workRoutes:{...routes}};
 const personalities={calm:{speed:32,turns:3,range:12},curious:{speed:34,turns:6,range:32},cheerful:{speed:38,turns:6,range:22},focused:{speed:36,turns:1,range:5},sociable:{speed:34,turns:4,range:24}};
 function motionPreference(saved,legacyMotion,legacyQuiet){return ['lively','calm','still'].includes(saved)?saved:legacyMotion==='off'?'still':legacyQuiet==='on'?'calm':'lively';}
 function effectiveMotion(preference,reduced){return reduced?'still':motionPreference(preference);}
 function validateMap(map){
  if(!map||typeof map!=='object'||!map.stations||typeof map.stations!=='object'||!map.workRoutes||typeof map.workRoutes!=='object')throw Error('Invalid map: stations and work routes are required.');
  for(const activity of workActivities){const station=map.workRoutes[activity],point=map.stations[station];if(typeof station!=='string'||!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x<0||point.x>100||point.y<0||point.y>100)throw Error('Invalid map: '+activity+' must route to a defined station.');}
  const bell=map.stations.bell;if(!bell||!Number.isFinite(bell.x)||!Number.isFinite(bell.y))throw Error('Invalid map: attention bell station is required.');
  return true;
 }
 for(const map of Object.values(maps))validateMap(map);
 function resolveMap(map){const result=typeof map==='string'?maps[map]:map;if(!result)throw Error('Invalid map: unsupported map definition.');validateMap(result);return result;}
 function mode(s,now,sleep=120){
  if(!s||s.state==='offline')return 'offline';if(work.has(s.state))return 'work';if(s.state==='waiting'||s.state==='error')return s.state;if(s.pipeline&&s.sleeping===true)return 'sleep';
  let idle=s.idleSince;
  if(s.state==='done'&&Number.isFinite(s.finishedAt))idle=Number.isFinite(idle)?Math.max(idle,s.finishedAt):s.finishedAt;
  if(!Number.isFinite(idle))idle=now;
  return now-idle>=sleep*1000?'sleep':'idle';
 }
 function present(s,now,observed=new Map()){if(!s)return s;const key=s.id||s.profileId||s;if(s.state!=='done'){if(work.has(s.state)||s.state==='waiting'||s.state==='error')observed.delete(key);return s;}let finished=s.finishedAt;if(!Number.isFinite(finished)){finished=observed.get(key);if(!Number.isFinite(finished)){finished=now;observed.set(key,finished);}}return now-finished>=180000?{...s,state:'ready',label:'Ready',presentationExpired:true}:s;}
 const docks=[{x:9.25,y:10.8},{x:90.75,y:10.8},{x:9.25,y:89.2},{x:90.75,y:89.2},{x:9.25,y:50},{x:90.75,y:50}];
 const homes=[{x:18,y:25},{x:82,y:25},{x:18,y:75},{x:82,y:75},{x:18,y:50},{x:82,y:50}],stations=[{x:36,y:25},{x:64,y:25},{x:36,y:75},{x:64,y:75}];
 function step(bot,mode,time,dt,paused,height=400,botHeight=90,width=800,botWidth=100,quiet=false,map='meadow'){
  const activeMap=resolveMap(map),home=homes[bot.slot],personality=bot.personality||bot.session?.personality||'calm',trait=personalities[personality]||personalities.calm;
  const activity=bot.session?.state||'working';const stationName=mode==='work'?activeMap.workRoutes[activity]:mode==='waiting'||mode==='error'?'bell':mode==='offline'?'charging':mode==='sleep'?'home':'roam';
  const center=activeMap.stations[stationName];let destination=mode==='offline'?docks[bot.slot]:home;
  if(center){const gap=botWidth+8,compact=height<2*(botHeight+8)+16;const standingCenter={...center,y:center.y+(stationName!=='bell'&&height>250?botHeight*.55/height*100:0)};destination=stationName==='bell'&&height>=3*(botHeight+8)+16?{x:center.x+(bot.slot%2?1:-1)*(botWidth/2+60)/width*100,y:center.y+(Math.floor(bot.slot/2)-1)*(botHeight+8)/height*100}:rowTarget(standingCenter,bot.slot,width,height,botHeight,gap,compact);}
  const layout=[width,height,botWidth,botHeight,typeof map==='string'?map:'custom'].join(':');
  const padX=Math.min(50,Math.max(4,(botWidth/2+8)/Math.max(1,width)*100)),padY=Math.min(50,Math.max(4,(botHeight/2+8)/Math.max(1,height)*100));
  const constrain=p=>{p.x=Math.max(padX,Math.min(100-padX,p.x));p.y=Math.max(padY,Math.min(100-padY,p.y));};
  if(!bot.position)bot.position={...home};if(bot.mode!==mode||bot.station!==stationName||bot.layout!==layout){bot.mode=mode;bot.target={...destination};bot.next=time+1200;bot.visit=null;bot.visits=bot.visits||0;}bot.station=stationName;bot.layout=layout;
  constrain(bot.position);constrain(bot.target);
  if(mode==='idle'&&time>bot.next&&!paused&&Math.hypot(bot.target.x-bot.position.x,bot.target.y-bot.position.y)<.2){
   const visits=bot.visits++,neighbors=personality==='sociable'?(bot.neighbors||[]).filter(b=>b!==bot&&b.mode==='idle'&&b.position):[];
   if(neighbors.length&&visits%2===0){const neighbor=neighbors[(bot.slot+visits)%neighbors.length];bot.visit='neighbor';bot.target={x:neighbor.position.x+(bot.slot%2?1:-1)*(botWidth+14)/width*100,y:neighbor.position.y};}
   else{
    const center=personality==='focused'?activeMap.stations[activeMap.workRoutes[activity]]||home:home;
    const angle=(bot.slot*1.7+visits*2.4),range=trait.range*(quiet?.5:1);bot.visit=null;bot.target={x:center.x+Math.cos(angle)*range,y:center.y+Math.sin(angle)*range*.55};
   }
   constrain(bot.target);bot.dwellPending=true;bot.next=Infinity;
  }
  if(paused){bot.position={...destination};bot.walking=false;}else{const dx=(bot.target.x-bot.position.x)*width/100,dy=(bot.target.y-bot.position.y)*height/100,d=Math.hypot(dx,dy),amount=Math.min(d,Math.max(0,dt)*trait.speed*paceMultiplier*(quiet?.55:1));bot.walking=d>amount+.1;if(d){bot.position.x+=dx/d*amount/width*100;bot.position.y+=dy/d*amount/height*100;}if(d>.1)bot.facing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');}
  if(mode==='idle'&&bot.dwellPending&&!bot.walking){bot.next=time+60000/trait.turns*(quiet?2:1);bot.dwellPending=false;}
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
 const api={mode,present,step,homes,stations,docks,personalities,paceMultiplier,maps,validateMap,mapLayout,createShakeDetector,motionPreference,effectiveMotion};if(typeof module!=='undefined')module.exports=api;else root.RanchWorld=api;
})(globalThis);
