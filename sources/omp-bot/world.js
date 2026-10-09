(function(root){
 const work=new Set(['reading','researching','writing','running','thinking','working']);
 function mode(s,now,sleep=120){if(!s||s.state==='offline')return 'offline';if(work.has(s.state))return 'work';if(s.state==='waiting'||s.state==='error')return s.state;const idle=s.state==='done'?(s.finishedAt||s.idleSince||now):(s.idleSince||now);return now-idle>=sleep*1000?'sleep':'idle';}
 const docks=[{x:9.25,y:10.8},{x:90.75,y:10.8},{x:9.25,y:89.2},{x:90.75,y:89.2}];
 const homes=[{x:18,y:25},{x:82,y:25},{x:18,y:75},{x:82,y:75}],stations=[{x:36,y:25},{x:64,y:25},{x:36,y:75},{x:64,y:75}];
 function step(bot,mode,time,dt,paused,height=400,botHeight=90,width=800,botWidth=100){const home=homes[bot.slot],station=stations[bot.slot];
  const padX=Math.min(50,Math.max(4,(botWidth/2+8)/Math.max(1,width)*100)),padY=Math.min(50,Math.max(4,(botHeight/2+8)/Math.max(1,height)*100));
  const constrain=p=>{p.x=Math.max(padX,Math.min(100-padX,p.x));p.y=Math.max(padY,Math.min(100-padY,p.y));};
  if(!bot.position)bot.position={...home};if(bot.mode!==mode){bot.mode=mode;bot.target={...(mode==='work'?station:mode==='offline'?docks[bot.slot]:home)};bot.next=time+1200;}
  constrain(bot.position);constrain(bot.target);
  if(mode==='idle'&&time>bot.next&&!paused&&Math.hypot(bot.target.x-bot.position.x,bot.target.y-bot.position.y)<.2){bot.target={x:padX+Math.random()*(100-2*padX),y:padY+Math.random()*(100-2*padY)};bot.next=time+2500+Math.random()*3500;}
  if(paused){bot.position={...(mode==='work'?station:mode==='offline'?docks[bot.slot]:home)};bot.walking=false;}else{const dx=bot.target.x-bot.position.x,dy=bot.target.y-bot.position.y,d=Math.hypot(dx,dy),amount=Math.min(d,dt*9);bot.walking=d>.2;if(d){bot.position.x+=dx/d*amount;bot.position.y+=dy/d*amount;}if(bot.walking)bot.facing=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');}
  constrain(bot.position);bot.hammering=mode==='work'&&!bot.walking;return bot;
 }
 const api={mode,step,homes,stations,docks};if(typeof module!=='undefined')module.exports=api;else root.RanchWorld=api;
})(globalThis);
