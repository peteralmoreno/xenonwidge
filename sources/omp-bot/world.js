(function(root){
 const work=new Set(['reading','researching','writing','running','thinking','working']);
 function mode(s,now,sleep=120){if(!s||s.state==='offline')return 'offline';if(work.has(s.state))return 'work';if(s.state==='waiting'||s.state==='error')return s.state;const idle=s.state==='done'?(s.finishedAt||s.idleSince||now):(s.idleSince||now);return now-idle>=sleep*1000?'sleep':'idle';}
 const docks=[{x:9.25,y:10.8},{x:90.75,y:10.8},{x:9.25,y:89.2},{x:90.75,y:89.2}];
 const homes=[{x:18,y:25},{x:82,y:25},{x:18,y:75},{x:82,y:75}],stations=[{x:36,y:25},{x:64,y:25},{x:36,y:75},{x:64,y:75}];
 // Pixel speeds keep a Large ranch as calm as a Medium ranch. Turns are a
 // maximum destination-change rate: a long stroll is always finished first.
 const traits=[{speed:32,turns:6},{speed:28,turns:5},{speed:30,turns:4},{speed:24,turns:4},{speed:27,turns:5},{speed:36,turns:7},{speed:34,turns:6},{speed:25,turns:4},{speed:29,turns:5},{speed:23,turns:3},{speed:26,turns:4},{speed:35,turns:6}];
 function step(bot,mode,time,dt,paused,height=400,botHeight=90,width=800,botWidth=100,quiet=false,map='meadow'){const home=homes[bot.slot],trait=traits[bot.color]||traits[bot.slot]||traits[0];
  const activity=bot.session?.state||'working';const stationName=mode==='work'?(['reading','researching','writing'].includes(activity)?activity:activity==='thinking'?'researching':'workshop'):mode==='waiting'||mode==='error'?'bell':mode==='offline'?'charging':mode==='sleep'?'home':'roam';
  const centers={reading:{x:25,y:28},researching:{x:75,y:28},writing:{x:25,y:72},workshop:{x:75,y:72},bell:{x:50,y:50}};
  if(map==='courtyard'){centers.researching={x:75,y:72};centers.writing={x:75,y:28};centers.workshop={x:25,y:72};}
  const center=centers[stationName];let destination=mode==='offline'?docks[bot.slot]:home;
  if(center){const gap=botWidth+8,compact=height<2*(botHeight+8)+16;const row=compact||width*.44>=4*gap;destination=row?{x:compact?50+(bot.slot-1.5)*gap/width*100:center.x+(bot.slot-1.5)*gap/width*100,y:center.y}:{x:center.x+(bot.slot%2-.5)*gap/width*100,y:center.y+(Math.floor(bot.slot/2)-.5)*(botHeight+8)/height*100};}
  if(center&&stationName!=='bell'&&height>250)destination.y+=botHeight*.55/height*100;
  const layout=[width,height,botWidth,botHeight,map].join(':');
  const padX=Math.min(50,Math.max(4,(botWidth/2+8)/Math.max(1,width)*100)),padY=Math.min(50,Math.max(4,(botHeight/2+8)/Math.max(1,height)*100));
  const constrain=p=>{p.x=Math.max(padX,Math.min(100-padX,p.x));p.y=Math.max(padY,Math.min(100-padY,p.y));};
  if(!bot.position)bot.position={...home};if(bot.mode!==mode||bot.station!==stationName||(bot.layout!==layout&&mode!=='idle')){bot.mode=mode;bot.target={...destination};bot.next=time+1200;}bot.station=stationName;bot.layout=layout;
  constrain(bot.position);constrain(bot.target);
  if(mode==='idle'&&time>bot.next&&!paused&&Math.hypot(bot.target.x-bot.position.x,bot.target.y-bot.position.y)<.2){bot.target={x:padX+Math.random()*(100-2*padX),y:padY+Math.random()*(100-2*padY)};bot.next=time+60000/trait.turns*(quiet?2:1)+Math.random()*3000;}
  if(paused){bot.position={...destination};bot.walking=false;}else{const dx=(bot.target.x-bot.position.x)*width/100,dy=(bot.target.y-bot.position.y)*height/100,d=Math.hypot(dx,dy),amount=Math.min(d,Math.max(0,dt)*trait.speed*(quiet?.55:1));bot.walking=d>amount+.1;if(d){bot.position.x+=dx/d*amount/width*100;bot.position.y+=dy/d*amount/height*100;}if(d>.1)bot.facing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');}
  constrain(bot.position);bot.hammering=mode==='work'&&stationName==='workshop'&&!bot.walking;return bot;
 }
 const api={mode,step,homes,stations,docks,traits};if(typeof module!=='undefined')module.exports=api;else root.RanchWorld=api;
})(globalThis);
