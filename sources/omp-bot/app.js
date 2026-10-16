(()=>{'use strict';
 const capacity=RanchWorld.homes.length;
 const $=id=>document.getElementById(id),names={ready:'Ready',reading:'Reading',researching:'Researching',writing:'Writing',running:'Running',thinking:'Thinking',working:'Working',waiting:'Needs you',done:'Done',error:'Needs attention',offline:'Offline'};
 const hosted=location.protocol==='http:'&&location.hostname==='127.0.0.1'&&location.pathname.startsWith('/ui/'),base=hosted?location.origin:'http://127.0.0.1:43822';
 let key='',controlKey='',controlState=null,controlSignature='',sessions=[],slots=Array(capacity).fill(null),selected='',selectionPinned=false,connected=false,inFlight=false,current=null,generation=0,focusBusy=false,focusSupported=false,focusGeneration=0,sleepSeconds=120,wakeBusy=false,wakeCooldown=0;
 let selectionSupported=false,selectionPending=false,selectionTicket=0,selectionRevision=-1,selectionInstance="",desiredSelection="",suppressBotClick=false;
 let allUpdates=false,lastInspected='',feedSignature='',feedKnown=new Set();const shake=RanchWorld.createShakeDetector();
 let wakeReport=null,wakeBaseline=new Map();
 const speech=new Map(),speechSeen=new Set();let speechStarted=false;
 const dismissed=new Set(),completionSeen=new Map();
 const sceneStations={reading:'.reading-nook',researching:'.research-station',writing:'.writing-bench',workshop:'.workshop',bell:'.attention-bell'};
 const poiArt={
  fountain:'<path fill="var(--stone-edge)" d="M4 30h48v8H4zM10 25h36v9H10zM24 8h8v20h-8z"/><path fill="#b5e5e8" d="M8 28h40v4H8zM15 12h26v5H15zM24 4h8v10h-8z"/>',
  coffee:'<path fill="var(--path-edge)" d="M9 16h38v24H9z"/><path fill="var(--label)" d="M5 8h46v9H5zM16 22h24v10H16z"/><path fill="var(--label-ink)" d="M20 23h11v7H20zM31 24h4v4h-4z"/>',
  noticeboard:'<path fill="var(--path-edge)" d="M8 5h40v27H8zM11 30h5v10h-5zM40 30h5v10h-5z"/><path fill="var(--label)" d="M13 10h12v16H13zM30 10h12v9H30zM30 22h12v4H30z"/>',
  garden:'<path fill="var(--path-edge)" d="M4 27h48v12H4z"/><path fill="var(--grass-light)" d="M10 9h8v20h-8zM6 15h16v8H6zM29 4h10v25H29zM24 12h20v9H24z"/><path fill="var(--label)" d="M12 8h5v5h-5zM31 3h6v6h-6z"/>',
  lookout:'<path fill="var(--stone-edge)" d="M9 35h38v5H9zM26 11h5v25h-5z"/><path fill="var(--surface)" d="m12 9 28-7 5 12-28 7z"/><path fill="var(--label)" d="m37 3 7-2 6 14-7 2z"/>',
  parts:'<path fill="var(--surface)" d="M7 5h5v35H7zM44 5h5v35h-5zM7 17h42v4H7zM7 35h42v4H7z"/><path fill="var(--path)" d="M15 7h11v10H15zM30 10h11v7H30zM15 25h15v10H15zM34 25h7v10h-7z"/>'
 };
 function syncMapScene(){
  const map=document.body.dataset.map||'meadow',layout=RanchWorld.mapLayout(map);
  for(const [name,selector]of Object.entries(sceneStations)){const element=document.querySelector(selector),point=layout[name];if(element&&point){element.style.left=point.left;element.style.top=point.top;}}
  for(const [name,art]of Object.entries(poiArt)){
   let el=document.getElementById('poi-'+name);if(!el){el=document.createElement('div');el.id='poi-'+name;el.className='idle-landmark';el.setAttribute('aria-hidden','true');el.innerHTML='<svg viewBox="0 0 56 44" shape-rendering="crispEdges">'+art+'</svg><span></span>';$('scene').append(el);}
   const poi=RanchWorld.maps[map]?.pois?.[name];el.hidden=!poi;if(poi){el.style.left=poi.x+'%';el.style.top=poi.y+'%';el.querySelector('span').textContent=poi.label;}
  }
 }
 document.body.addEventListener('appearancechange',syncMapScene);syncMapScene();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),bots=new Map();
 try{key=localStorage.getItem('omp-bot.key')||'';controlKey=key;document.body.dataset.motion=RanchWorld.motionPreference(localStorage.getItem('omp-bot.motion-mode'),localStorage.getItem('omp-bot.motion'),localStorage.getItem('omp-bot.quiet'));const hidden=JSON.parse(localStorage.getItem('omp-bot.dismissed'));if(Array.isArray(hidden))for(const id of hidden)if(typeof id==='string')dismissed.add(id);const saved=JSON.parse(localStorage.getItem('omp-bot.residents'));if(Array.isArray(saved)&&saved.length<=capacity){const seen=new Set();slots=Array.from({length:capacity},(_,i)=>saved[i]).map(s=>typeof s==='string'&&!seen.has(s)?(seen.add(s),s):null);}}catch{}
 const transferred=new URLSearchParams(location.hash.slice(1)).get('pair');if(hosted&&/^[a-f0-9]{64}$/.test(transferred||'')){key=transferred;controlKey=key;save('omp-bot.key',key);history.replaceState(null,'',location.pathname);}
 function save(k,v){try{localStorage.setItem(k,v);}catch{}}
 function storeSlots(){save('omp-bot.residents',JSON.stringify(slots));save('omp-bot.dismissed',JSON.stringify([...dismissed]));}
 $('companion-view').onclick=()=>{location.href=base+'/ui/'+(key?'#pair='+encodeURIComponent(key):'');};
 async function shareSelection(id){
  if(!connected||!selectionSupported)return;desiredSelection=id;selectionTicket++;if(selectionPending)return;selectionPending=true;const version=generation;
  try{while(desiredSelection&&version===generation){const target=desiredSelection;desiredSelection='';const r=await fetch(base+'/selection',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({id:target}),signal:AbortSignal.timeout(3000)});const result=await r.json();if(!r.ok)throw Error('Selection unavailable');if(version===generation){selectionRevision=result.selectionRevision;selectionInstance=result.selectionInstance||selectionInstance;}}}
  catch{if(version===generation){desiredSelection='';$('focus-result').textContent='Ranch Desk selection could not sync. Tap again to retry.';}}
  finally{selectionPending=false;if(desiredSelection&&version!==generation)shareSelection(desiredSelection);}
 }
 function clock(){if(!current?.startedAt){$('elapsed').textContent='—';return;}const end=current.finishedAt||(!connected||current.state==='offline'?current.lastSeen:Date.now());const s=Math.max(0,Math.floor((end-current.startedAt)/1000));$('elapsed').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
 function display(state,detail){document.body.dataset.state=state;$('state').textContent=names[state]||'Working';$('detail').textContent=detail;$('detail').title=detail;clock();}
 $('project').onclick=()=>{$('full-project').textContent=current?.metadata?.folder||current?.project||'No bot selected';$('full-status').textContent=current?.label||'Start a terminal to add a resident.';$('full-metadata').textContent=metadataText(current?.metadata);$('full-preview').textContent=current?.preview?.text?('Latest visible excerpt: '+current.preview.text):'No supported excerpt is available.';$('open-terminal').disabled=!current||!current.canFocus;$('terminal-details').showModal();};$('details-close').onclick=()=>$('terminal-details').close();$('open-terminal').onclick=()=>{if(current)focus(current.id);};
 function metadataText(data){if(!data)return 'Runtime details unavailable.';const model=data.provider||data.model?`${data.provider||'Provider unavailable'} · ${data.model||'Model unavailable'}`:'Model unavailable';const context=Number.isFinite(data.context?.used)?`Context ${data.context?.used}${Number.isFinite(data.context?.capacity)?' / '+data.context?.capacity:''}`:'Context usage unavailable';return [model,context].join(' · ');}
 function selection(){current=sessions.find(s=>s.id===selected)||null;$('project').textContent=current?.project||'No bot selected';const shown=RanchWorld.present(current,Date.now(),completionSeen);display(connected?(shown?.state||'ready'):'offline',shown?.label||'Start OMP with the Bot Ranch launcher.');const profile=controlState?.profiles?.find(p=>p.id===current?.profileId);const task=controlState?.tasks?.find(t=>t.assignedProfileId===current?.profileId&&!t.archived);$('bot-details').textContent=current?`${task?'Task: '+task.title+' · ':'No assigned task · '}${current.metadata?.folder||'Project unavailable'} · ${profile?.role||'Role unavailable'} · actual ${current.metadata?.provider||'provider unavailable'} ${current.metadata?.model||'model unavailable'} · ${metadataText(current.metadata)}${current.label?` · ${current.label}`:''}`:'Select a bot to inspect its task, project, role, activity, and context.';renderDesk(profile);for(const [id,b]of bots)b.el.setAttribute('aria-pressed',String(id===selected));}
 function orderedProfileTasks(profileId){return (controlState?.tasks||[]).filter(t=>profileId&&t.assignedProfileId===profileId&&!t.archived).sort((a,b)=>(Number.isFinite(a.queueOrder)?a.queueOrder:Infinity)-(Number.isFinite(b.queueOrder)?b.queueOrder:Infinity));}
 function deskTask(){const list=orderedProfileTasks(current?.profileId);return list.find(t=>['dispatching','awaiting-runtime','claimed','running'].includes(t.attempts?.at(-1)?.state)||t.status==='doing')||null;}
 function updateAge(at){const seconds=Math.max(0,Math.floor((Date.now()-Number(at))/1000));return !Number.isFinite(seconds)?'Time unavailable':seconds<60?'just now':seconds<3600?Math.floor(seconds/60)+'m ago':seconds<86400?Math.floor(seconds/3600)+'h ago':Math.floor(seconds/86400)+'d ago';}
 function updates(){return (controlState?.updates||[]).slice().reverse().sort((a,b)=>Number(b.at)-Number(a.at));}
 // Feed snapshots are also history: only newly observed, recent bot posts speak.
 function syncSpeech(){
  if(!controlState)return;
  const posts=updates(),fresh=posts.filter(post=>!speechSeen.has(post.id));
  for(const post of posts)speechSeen.add(post.id);
  while(speechSeen.size>500)speechSeen.delete(speechSeen.values().next().value);
  if(!speechStarted){speechStarted=true;return;}
  const spoken=new Set();
  for(const post of fresh){
   const age=Date.now()-Number(post.at),bot=[...bots.values()].find(b=>b.session?.profileId===post.profileId);
   if(!connected||!bot||bot.session.state==='offline'||post.kind==='system'||!String(post.text||'').trim()||!Number.isFinite(age)||age>60000||age< -5000||spoken.has(bot))continue;
   spoken.add(bot);
   let item=speech.get(bot);
   if(item&&Number(post.at)<item.at)continue;
   if(!item){const el=document.createElement('div'),text=document.createElement('span');el.className='bot-speech';el.setAttribute('aria-hidden','true');el.append(text);$('residents').append(el);item={el,text};speech.set(bot,item);}
   const text=String(post.text).trim();item.text.textContent=text.length>160?text.slice(0,157)+'...':text;item.until=performance.now()+8000;item.at=Number(post.at);
  }
 }
 function positionSpeech(t,width,height){
  for(const [bot,item]of speech){
   if(t>=item.until||!connected||!controlState||!bot.el.isConnected||bot.session?.state==='offline'){item.el.remove();speech.delete(bot);continue;}
   const w=item.el.offsetWidth,h=item.el.offsetHeight,x=(bot.position?.x??RanchWorld.homes[bot.slot].x)*width/100,y=(bot.position?.y??RanchWorld.homes[bot.slot].y)*height/100;
   const left=Math.max(6,Math.min(width-w-6,x-w/2)),above=y-bot.el.offsetHeight/2-h-8,below=above<6;
   item.el.style.left=left+'px';item.el.style.top=Math.max(6,Math.min(height-h-6,below?y+bot.el.offsetHeight/2+8:above))+'px';item.el.dataset.below=String(below);item.el.style.setProperty('--tail-x',Math.max(12,Math.min(w-12,x-left))+'px');
  }
 }
 function renderLatestPost(){const post=updates().find(p=>p.profileId===current?.profileId),offline=!connected||current?.state==='offline';$('desk-update-text').textContent=post?.text||(offline?'Disconnected — no current report.':'No update yet.');const task=controlState?.tasks?.find(t=>t.id===post?.taskId);$('desk-update-meta').textContent=post?`${offline?'Disconnected · last report · ':''}${updateAge(post.at)}${post.taskId?' · '+(task?.title||'Task '+post.taskId):''}`:'';}
 function renderFeed(force=false){
  const root=$('feed-list'),posts=updates(),shown=posts.slice(0,50),signature=JSON.stringify({shown,profiles:(controlState?.profiles||[]).map(p=>[p.id,p.nickname,p.color,p.design]),tasks:(controlState?.tasks||[]).map(t=>[t.id,t.title])}),live=root.scrollTop<24;
  $('feed-status').textContent=!connected||!controlState?'Disconnected — showing saved updates.':posts.length?'Public bot posts · newest first':'No updates yet. Bots post when work changes.';
  $('feed-return').hidden=!sessions.some(s=>s.id===lastInspected);$('feed-return').textContent='Back to '+(sessions.find(s=>s.id===lastInspected)?.project||'bot');
  if(!controlState)return;
  const fresh=posts.filter(p=>!feedKnown.has(p.id)).length;
  if(!force&&!live&&feedSignature){$('feed-new').hidden=!fresh;$('feed-new').textContent=fresh+' new update'+(fresh===1?'':'s');return;}
  $('feed-new').hidden=true;if(signature===feedSignature&&!force)return;
  const focused=document.activeElement?.closest?.('.feed-card')?.dataset.updateId;root.replaceChildren();
  for(const post of shown){
   const profile=controlState?.profiles?.find(p=>p.id===post.profileId),task=controlState?.tasks?.find(t=>t.id===post.taskId),card=document.createElement('article'),header=document.createElement('div'),avatar=document.createElement('span'),name=document.createElement('button'),meta=document.createElement('p'),body=document.createElement('p');
   card.className='feed-card';card.tabIndex=0;card.dataset.updateId=post.id;header.className='feed-card-heading';avatar.className='feed-avatar';avatar.setAttribute('aria-hidden','true');avatar.innerHTML=RanchSprites.portrait(profile?.color||0,profile?.design);name.textContent=profile?.nickname||'Saved bot';name.disabled=!sessions.some(s=>s.profileId===post.profileId);name.onclick=()=>{const resident=sessions.find(s=>s.profileId===post.profileId);if(resident){selected=resident.id;allUpdates=false;selectionPinned=true;selection();shareSelection(selected);}};meta.className='feed-meta';const time=document.createElement('time');time.className='feed-time';time.dataset.at=String(post.at);time.textContent=updateAge(post.at);if(Number.isFinite(Number(post.at))){time.dateTime=new Date(Number(post.at)).toISOString();time.title=new Date(Number(post.at)).toLocaleString();}meta.textContent=(post.taskId?' · '+(task?.title||'Task '+post.taskId):post.kind==='system'?' · System':'');meta.hidden=!meta.textContent;body.className='feed-text';body.textContent=String(post.text||'');header.append(name,time);card.append(avatar,header,body,meta);root.append(card);
  }
  feedSignature=signature;feedKnown=new Set(posts.map(p=>p.id));if(focused){const card=[...root.children].find(c=>c.dataset.updateId===focused);card?.focus({preventScroll:true});}if(force||live)root.scrollTop=0;
 }
 $('all-updates').onclick=()=>{if(selected)lastInspected=selected;selected='';allUpdates=true;selectionPinned=true;selectionTicket++;desiredSelection='';selection();};
 $('feed-return').onclick=()=>{if(!sessions.some(s=>s.id===lastInspected))return;selected=lastInspected;allUpdates=false;selectionPinned=true;selection();shareSelection(selected);};
 $('feed-new').onclick=()=>renderFeed(true);
 $('feed-list').onscroll=()=>{if($('feed-list').scrollTop<24)renderFeed();};
 $('feed-list').onkeydown=e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key)||e.target.tagName==='BUTTON')return;const cards=[...$('feed-list').children];if(!cards.length)return;e.preventDefault();const index=cards.indexOf(document.activeElement),target=e.key==='Home'?0:e.key==='End'?cards.length-1:Math.max(0,Math.min(cards.length-1,index+(e.key==='ArrowDown'?1:-1)));cards[target].focus();};
 function renderDesk(profile){
  $('ranch-desk').dataset.feed=String(!current);$('ranch-feed').hidden=!!current;$('all-updates').setAttribute('aria-pressed',String(!current));if(!current)renderFeed();
  renderLatestPost();
  profile=profile||(current?.managed?current:null);
  const tasks=orderedProfileTasks(current?.profileId),task=deskTask(),attempt=task?.attempts?.at(-1),effective=attempt?.effectiveSettings,live=connected&&current?.state!=='offline',meta=live?current?.metadata:null;
  const portrait=$('desk-portrait');if(current){const residentColor=Number.isInteger(current.color)?current.color:Math.max(0,slots.indexOf(current.id));portrait.innerHTML=RanchSprites.svg(residentColor,RanchWorld.present(current,Date.now(),completionSeen).state||'ready',profile?.design||current.design);}else portrait.replaceChildren();
  $('desk-name').textContent=profile?.nickname||current?.project||'Select a bot';
  $('desk-folder').textContent=meta?.folder||task?.projectFolder||profile?.folder||current?.metadata?.folder||'Not available';
  $('desk-project').textContent='Project: '+(meta?.folder||task?.projectFolder||profile?.folder||current?.metadata?.folder||current?.project||'Not available');
  $('desk-now').textContent=task?.title||'No board task assigned.';
  const needs=tasks.filter(t=>t.status==='review'||t.status==='blocked'||(t.waitingReason&&t.releasedForPickup)),next=tasks.filter(t=>t.id!==task?.id&&t.status==='todo'&&t.releasedForPickup),nextRoot=$('desk-next');nextRoot.replaceChildren();for(const item of next.slice(0,5)){const row=document.createElement('li');row.textContent=item.title;nextRoot.append(row);}if(!next.length){const row=document.createElement('li');row.textContent='No released tasks in the queue.';nextRoot.append(row);}
  const held=tasks.filter(t=>t.status==='todo'&&!t.releasedForPickup).length;$('desk-inbox').textContent=`Inbox: ${held} held task${held===1?'':'s'}.`;
  const needsRoot=$('desk-needs');needsRoot.replaceChildren();if(current&&['waiting','error'].includes(current.state)){const row=document.createElement('li');row.textContent=`${current.project}: ${current.label|| (current.state==='waiting'?'A reply is waiting':'Needs attention')}`;needsRoot.append(row);}for(const item of needs){const row=document.createElement('li');row.textContent=`${item.title}${item.waitingReason?' — '+item.waitingReason:item.status==='review'?' — result ready to review':' — blocked'}`;needsRoot.append(row);}if(!needsRoot.childElementCount){const row=document.createElement('li');row.textContent='No tasks need attention.';needsRoot.append(row);}
  $('desk-role').textContent=attempt?.role||effective?.role||profile?.role||'Not configured';
  $('desk-personality').textContent=profile?.personality||'calm';
  $('desk-model').textContent=current?.pipeline?'API monitor':meta?.model?[meta.provider,meta.model].filter(Boolean).join(' / '):(live?'Not reported':'Offline');
  $('desk-context').textContent=current?.pipeline?'No model tokens':Number.isFinite(meta?.context?.used)?meta.context.used.toLocaleString()+(Number.isFinite(meta.context.capacity)?' / '+meta.context.capacity.toLocaleString()+' tokens':' tokens'):'Not reported';
  const readOnly=attempt?.readOnly??effective?.readOnly??profile?.readOnly;
  $('desk-permissions').textContent=readOnly===undefined?'Not configured':readOnly?'Read only':'Read / write';
  $('desk-pickup').textContent=profile?(profile.autoPickup?'Enabled':'Resting'):'Not configured';
  $('desk-preview').textContent=(live&&current?.preview?.text)||task?.resultSummary||(live?'No update yet.':'Connect the terminal to see live updates.');
  $('desk-terminal').disabled=!live||!current?.canFocus;
   $('desk-terminal').hidden=!!current?.pipeline;
  }
  $('desk-terminal').onclick=()=>{if(current)focus(current.id);};
 async function focus(id){selected=id;allUpdates=false;selectionPinned=true;selection();const s=sessions.find(s=>s.id===id);const ticket=++focusGeneration;if(!connected||s?.state==='offline'){$('focus-result').textContent='This terminal is offline.';return;}if(!focusSupported||!s?.canFocus){$('focus-result').textContent='For tap-to-open, start this terminal with Start-Bot-Ranch.cmd.';return;}if(focusBusy){$('focus-result').textContent='A terminal request is already in progress.';return;}focusBusy=true;$('focus-result').textContent='Opening terminal…';try{const r=await fetch(base+'/focus',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({id}),signal:AbortSignal.timeout(8000)});const d=await r.json();if(ticket!==focusGeneration)return;const messages={focused:'Terminal brought forward.',raised:'Terminal brought forward without changing keyboard focus.',attention:'Windows did not switch focus. Select the terminal on your taskbar.',closed:'That terminal has closed.',unavailable:'This terminal cannot be opened automatically.'};$('focus-result').textContent=r.ok?(messages[d.result]||'Terminal focus unavailable.'):'Terminal unavailable. Try again.';}catch{if(ticket===focusGeneration)$('focus-result').textContent='Could not reach the companion.';}finally{focusBusy=false;}}
 function render(){
  const managed=sessions.filter(s=>s.managed);if(managed.length){const prior=slots;slots=Array(capacity).fill(null);for(const s of managed){const preferred=Number.isInteger(s.slot)?s.slot:prior.includes(s.id)?prior.indexOf(s.id):s.color;const slot=preferred>=0&&preferred<capacity&&!slots[preferred]?preferred:slots.indexOf(null);if(slot>=0)slots[slot]=s.id;}}else slots=slots.map(id=>sessions.some(s=>s.id===id)?id:null);for(const s of sessions.filter(s=>s.state!=='offline'&&!s.managed&&!dismissed.has(s.id)))if(!slots.includes(s.id)){const index=slots.indexOf(null);if(index<0)break;slots[index]=s.id;}storeSlots();
  if(!slots.includes(selected)&&!allUpdates)selected=slots.find(Boolean)||'';
  for(const [id,b]of bots)if(!slots.includes(id)){b.el.remove();bots.delete(id);}
  slots.forEach((id,slot)=>{const s=sessions.find(s=>s.id===id);if(!s)return;let b=bots.get(id);if(!b){const el=document.createElement('button');el.className='bot';el.dataset.id=id;el.innerHTML='<span class="label"></span><span class="activity"></span>';el.onclick=()=>{if(suppressBotClick){suppressBotClick=false;return;}selected=id;allUpdates=false;selectionPinned=true;selection();shareSelection(id);b.tapUntil=performance.now()+700;b.el.dataset.poked='true';setTimeout(()=>b.el.dataset.poked='false',650);};el.draggable=false;el.onpointerdown=e=>{if(!e.isPrimary||e.button>0)return;shake.start(b.session?.profileId||id,e.clientX,performance.now());b.held=true;b.visualDrag={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false};try{el.setPointerCapture?.(e.pointerId);}catch{}};el.onpointermove=e=>{const drag=b.visualDrag;if(!drag||drag.pointerId!==e.pointerId)return;if(shake.move(e.clientX,performance.now())){drag.shaken=true;suppressBotClick=true;wakeSleeping();}if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>8){drag.moved=true;suppressBotClick=true;b.el.dataset.visualDragging='true';}if(drag.moved){const box=$('residents').getBoundingClientRect();b.position={x:Math.max(4,Math.min(96,(e.clientX-box.left)/box.width*100)),y:Math.max(8,Math.min(92,(e.clientY-box.top)/box.height*100))};b.el.style.left=b.position.x+'%';b.el.style.top=b.position.y+'%';}};const finish=e=>{const drag=b.visualDrag;if(!drag||drag.pointerId!==e.pointerId)return;shake.end();b.visualDrag=null;b.held=false;if(drag.moved){const drop=document.elementFromPoint(e.clientX,e.clientY)?.closest('#ranch-desk');if(drop&&!drag.shaken&&e.type!=='pointercancel'){selected=id;allUpdates=false;selectionPinned=true;selection();shareSelection(id);$('desk-more').open=true;}b.target={...b.position};b.playUntil=performance.now()+800;b.el.dataset.visualDragging='false';b.tapUntil=performance.now()+800;setTimeout(()=>{suppressBotClick=false;},300);}};el.onpointerup=finish;el.onpointercancel=finish;b={el,slot,offset:0,target:0,next:0,lastState:'',celebrated:null,held:false};bots.set(id,b);$('residents').append(el);}
   const shown=RanchWorld.present(s,Date.now(),completionSeen);b.slot=slot;b.state=shown.state;b.session=s;const color=s.managed&&Number.isInteger(s.color)&&RanchSprites.colors[s.color]?s.color:slot;b.color=color;b.el.dataset.color=RanchSprites.colors[color][0];b.el.dataset.state=shown.state;const profile=controlState?.profiles?.find(p=>p.id===s.profileId),design=profile?.design||s.design||'classic';b.personality=profile?.personality||s.personality||'calm';b.el.dataset.personality=b.personality;b.el.setAttribute('aria-label',`${s.project}, ${names[shown.state]||'Working'}, tap to select, drag to move, or hold and shake to ring the wake bell`);
   if(b.lastState!==shown.state||b.colorSlot!==color||b.design!==design){b.el.querySelector('svg')?.remove();b.el.insertAdjacentHTML('afterbegin',RanchSprites.svg(color,shown.state,design));b.lastState=shown.state;b.colorSlot=color;b.design=design;}
   const completion=s.finishedAt||s.startedAt||0;if(shown.state==='done'&&b.celebrated!==completion){b.celebrated=completion;b.el.dataset.celebrate='true';setTimeout(()=>b.el.dataset.celebrate='false',900);}
   b.el.querySelector('.label').textContent=(slot+1)+' '+s.project;
  });
  // DOM order follows color slots, independent of server ordering.
  for(const id of slots)if(bots.has(id))$('residents').append(bots.get(id).el);
 const count=slots.filter(Boolean).length,extra=sessions.filter(s=>!slots.includes(s.id)).length;$('population').textContent=count+' / '+capacity+' residents';$('empty').hidden=!!count;syncSpeech();selection();
 }
 async function controlApi(route,body){const r=await fetch(base+'/control/'+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+controlKey,'Content-Type':'application/json',...(body?{}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(4000)});const data=await r.json();if(!r.ok){const e=Error(data.error||'Management action failed.');e.status=r.status;throw e;}return data;}
 async function loadControl(){
  if(!controlKey)return;
  try{controlState=await controlApi('state');if(connected)render();else selection();renderAttention();renderWake();}
  catch(e){controlState=null;if(e.status===401)$('task-notice').textContent='Connection key rejected. Copy it from botRanch Settings.';selection();renderAttention();}
 }
 function renderAttention(){
  const tasks=(controlState?.tasks||[]).filter(t=>!t.archived&&['review','blocked'].includes(t.status));
  const waiting=sessions.filter(s=>['waiting','error'].includes(s.state));
  const count=tasks.length+waiting.filter(s=>!tasks.some(t=>t.assignedProfileId===s.profileId)).length;
  $('needs-you').textContent='Needs you'+(count?' / '+count:'');$('needs-you').setAttribute('aria-label',count+' items need you. Open Board attention');
 }
 async function openBoard(){try{const result=await controlApi('ui/attention',{});$('task-notice').textContent=result.message||'Requested the sidebar attention view.';}catch(e){$('task-notice').textContent='Sidebar unavailable: '+e.message;}}
 $('needs-you').onclick=openBoard;$('desk-board').onclick=openBoard;
 function renderWake(){
  if(!wakeReport)return;const total=value=>Array.isArray(value)?value.length:Number(value)||0;
  let confirmed=0;const results=(wakeReport.results||[]).map(item=>{
   const id=item.profileId||item.id,profile=controlState?.profiles?.find(p=>p.id===id),wake=profile?.wake;
   if(['pending','requested'].includes(item.status)&&wake?.status==='acknowledged'&&wake.at!==wakeBaseline.get(id)){confirmed++;return {...item,status:'acknowledged',message:wake.message||'Runtime acknowledged wake-up.'};}return item;
  });
  const summary=`${total(wakeReport.acknowledged)+confirmed} awake / ${Math.max(0,total(wakeReport.pending)-confirmed)} pending / ${total(wakeReport.skipped)} skipped`;
  $('wake-result').textContent=(confirmed?'':wakeReport.message?wakeReport.message+' ':'')+summary;
  const list=$('wake-outcomes');list.replaceChildren();for(const item of results){const row=document.createElement('li'),profile=controlState?.profiles?.find(p=>p.id===(item.profileId||item.id));row.textContent=(item.nickname||profile?.nickname||item.profileId||item.id||'Bot')+': '+(item.message||item.result||item.status||'Requested');list.append(row);}
 }
 async function wakeSleeping(){
  if(wakeBusy||Date.now()<wakeCooldown)return;
  if(!connected||!controlKey){$('wake-result').textContent='Connect the companion to wake sleeping bots.';return;}
  wakeBusy=true;wakeCooldown=Date.now()+5000;wakeBaseline=new Map((controlState?.profiles||[]).map(p=>[p.id,p.wake?.at]));$('wake-bell').disabled=true;$('wake-result').textContent='Requesting wake-up for sleeping bots...';
  try{
   const result=await controlApi('profiles/wake',{});
   wakeReport=result;renderWake();
   $('wake-bell').dataset.ringing='true';setTimeout(()=>delete $('wake-bell').dataset.ringing,700);
   await loadControl();
  }catch(e){$('wake-result').textContent='Wake request unavailable: '+e.message;}
  finally{wakeBusy=false;setTimeout(()=>{$('wake-bell').disabled=false;},Math.max(0,wakeCooldown-Date.now()));}
 }
 $('wake-bell').onclick=wakeSleeping;
 async function poll(){if(!key||inFlight)return;inFlight=true;const version=generation,epoch=selectionTicket,pending=selectionPending;try{const res=await fetch(base+'/state',{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(3000)});if(res.status===401)throw Error('Connection key rejected. Open Connect to update it.');if(!res.ok)throw Error('Companion unavailable.');const data=await res.json();if(data.app!=='omp-bot'||data.version!==1||!Array.isArray(data.sessions))throw Error('Unsupported companion.');if(version!==generation)return;connected=true;sessions=data.sessions;focusSupported=data.capabilities?.focus===true;selectionSupported=data.capabilities?.selection===true;if(data.selectionInstance&&data.selectionInstance!==selectionInstance){selectionInstance=data.selectionInstance;selectionRevision=-1;}if(!selectionPinned&&!pending&&!selectionPending&&epoch===selectionTicket&&Number.isInteger(data.selectionRevision)&&data.selectionRevision>selectionRevision){selectionRevision=data.selectionRevision;if(sessions.some(s=>s.id===data.selectedId))selected=data.selectedId;}sleepSeconds=data.sleepSeconds||120;$('connect').textContent='Connected';$('companion-view').hidden=true;render();}catch(e){if(version!==generation)return;connected=false;$('connect').textContent='Connect';const network=e instanceof TypeError||e.name==='TimeoutError'||e.name==='AbortError';$('companion-view').hidden=hosted||!network;for(const b of bots.values()){b.state='offline';b.session={...b.session,state:'offline'};b.el.dataset.state='offline';b.el.dataset.walking='false';if(b.lastState!=='offline'){b.el.querySelector('svg')?.remove();b.el.insertAdjacentHTML('afterbegin',RanchSprites.svg(b.color,'offline',b.design));b.lastState='offline';}}renderLatestPost();renderFeed();display('offline',network?'Start companion; allow 127.0.0.1 in iCUE Widget Access.':e.message);}finally{inFlight=false;}}
 $('connect').onclick=()=>{$('key').value=key;$('pairing').showModal();};$('close').onclick=()=>$('pairing').close();$('pair-form').onsubmit=e=>{e.preventDefault();const candidate=$('key').value.trim().toLowerCase();if(!/^[a-f0-9]{64}$/.test(candidate)){$('pair-error').textContent='Paste the complete 64-character connection key.';return;}key=candidate;controlKey=key;generation++;controlState=null;controlSignature='';save('omp-bot.key',key);try{localStorage.removeItem('omp-bot.control');}catch{}loadControl();$('pair-error').textContent='';$('pairing').close();poll();};
  function motionLabel(){
  const mode=document.body.dataset.motion||'lively',effective=RanchWorld.effectiveMotion(mode,reduced.matches);
  document.body.dataset.effectiveMotion=effective;
  $('motion').textContent='Motion: '+mode[0].toUpperCase()+mode.slice(1);
  $('motion-choice').value=mode;
  $('motion-note').textContent=reduced.matches?'System reduced motion is active. Status and wake-up remain live.':'Display motion only. Bots continue their work.';
 }
 $('motion').onclick=()=>{motionLabel();$('motion-menu').showModal();};
 $('motion-choice').onchange=()=>{document.body.dataset.motion=$('motion-choice').value;save('omp-bot.motion-mode',document.body.dataset.motion);motionLabel();};
 $('motion-close').onclick=()=>$('motion-menu').close();
 $('motion-menu').addEventListener('close',()=>$('motion').focus());
 reduced.addEventListener?.('change',motionLabel);
 let last=0;function animate(t){const dt=Math.min((t-last)/1000,.05);last=t;const motion=RanchWorld.effectiveMotion(document.body.dataset.motion,reduced.matches),paused=motion==='still',quiet=motion==='calm';const height=$('residents').clientHeight,width=$('residents').clientWidth;for(const b of bots.values()){const raw=connected?b.session:{state:'offline'},shown=RanchWorld.present(raw,Date.now(),completionSeen),mode=RanchWorld.mode(shown,Date.now(),sleepSeconds);const settling=!!b.playUntil&&t<b.playUntil;if(b.playUntil&&!settling){b.playUntil=0;b.mode='';}const held=b.held||t<(b.tapUntil||0)||!!document.querySelector('dialog[open]');b.neighbors=[...bots.values()];if(!settling&&(!held||paused))RanchWorld.step(b,mode,t,dt,paused,height,b.el.offsetHeight,width,b.el.offsetWidth,quiet,document.body.dataset.map);b.el.dataset.mode=mode;b.el.dataset.activity=shown?.state||'offline';b.el.dataset.station=b.station||'';const activity=mode==='sleep'?'Sleeping':mode==='offline'?'Charging':names[shown?.state]||'Working';if(b.el.querySelector('.activity').textContent!==activity)b.el.querySelector('.activity').textContent=activity;b.el.dataset.walking=String(!!b.walking&&!held&&!paused&&!settling);b.el.dataset.hammering=String(!!b.hammering);b.el.dataset.facing=b.facing||'down';b.el.style.left=(b.position?.x||RanchWorld.homes[b.slot].x)+'%';b.el.style.top=(b.position?.y||RanchWorld.homes[b.slot].y)+'%';}positionSpeech(t,width,height);requestAnimationFrame(animate);}motionLabel();if(key)poll();if(controlKey)loadControl();setInterval(poll,700);setInterval(loadControl,2500);setInterval(()=>{clock();renderLatestPost();for(const time of document.querySelectorAll('.feed-time'))time.textContent=updateAge(time.dataset.at);},1000);requestAnimationFrame(animate);
})();

