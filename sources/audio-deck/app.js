(() => {
 'use strict';
 const $=id=>document.getElementById(id), base='http://127.0.0.1:43821';
 const storageKey='audio-deck.pairing.v1';
 let token='',state=null,connected=false,busy=false,polling=false,selected='',editing=null,revision=0;
 try{token=localStorage.getItem(storageKey)||'';}catch{}
 const rows=new Map();
 async function request(path,body){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  try{const res=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal});
   if(res.status===401)throw new Error('Pairing key rejected. Open Connect and paste the current key.');
   if(!res.ok){let error;try{error=(await res.json()).error;}catch{}throw new Error(error||'Audio request failed. Try again.');}
   return await res.json();
  }catch(error){if(error instanceof TypeError||error.name==='AbortError')throw new Error('Companion offline. Start Audio Deck Companion, then reconnect.');throw error;}finally{clearTimeout(timer);}
 }
 function availability(){
  const enabled=connected&&!busy;
  $('master-volume').disabled=$('master-mute').disabled=!enabled||!state?.master;
  $('players').disabled=!enabled||!state?.players.length;
  const player=state?.players.find(p=>p.id===selected);
  for(const [id,cap] of [['playPause','canToggle'],['next','canNext'],['previous','canPrevious']])$(id).disabled=!enabled||!player?.[cap];
  for(const row of rows.values())row.slider.disabled=row.mute.disabled=!enabled||!state?.sessions.some(s=>s.id===row.id);
 }
 function media(){
  const players=state.players;
  if(!players.some(p=>p.id===selected))selected=players[0]?.id||'';
  const signature=JSON.stringify(players.map(p=>[p.id,p.name]));
  if($('players').dataset.signature!==signature){$('players').replaceChildren(...(players.length?players.map(p=>new Option(p.name,p.id)):[new Option('No media player','')]));$('players').dataset.signature=signature;}
  $('players').value=selected;
  const p=players.find(p=>p.id===selected);
  $('title').textContent=p?.title||'Ready when you are';$('artist').textContent=p?.artist||'Open a music app on your PC.';
  $('playPause').textContent=p?.playing?'Ⅱ':'▶';$('playPause').setAttribute('aria-label',p?.playing?'Pause':'Play');
  const art=p?.artwork;const safe=typeof art==='string'&&/^data:image\/(png|jpeg);base64,/.test(art);
  $('artwork').hidden=!safe;$('fallback').hidden=safe;if(safe&&$('artwork').src!==art)$('artwork').src=art;if(!safe)$('artwork').removeAttribute('src');
 }
 function bindSlider(slider,getTarget,out){
  let target=null;
  const begin=()=>{if(!target)target=getTarget();editing=slider;};
  slider.addEventListener('pointerdown',begin);
  slider.addEventListener('input',()=>{begin();out.textContent=slider.value+'%';});
  slider.addEventListener('change',()=>{const id=target||getTarget();target=null;editing=null;if(id)command({kind:'volume',target:id,value:Number(slider.value)/100});});
  const cancel=()=>{target=null;editing=null;if(state)render();};
  slider.addEventListener('pointercancel',cancel);slider.addEventListener('blur',()=>{if(editing===slider)cancel();});
  slider.addEventListener('pointerup',()=>setTimeout(()=>{if(editing===slider)cancel();},0));
 }
 function createRow(s){
  const root=document.createElement('div');root.className='session';
  const heading=document.createElement('div');heading.className='master-label';
  const name=document.createElement('strong'),out=document.createElement('output');heading.append(name,out);
  const controls=document.createElement('div');controls.className='volume-controls';
  const mute=document.createElement('button'),slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';controls.append(mute,slider);root.append(heading,controls);
  const row={id:s.id,root,name,out,mute,slider};
  bindSlider(slider,()=>s.id,out);
  mute.addEventListener('click',()=>{const current=state?.sessions.find(v=>v.id===s.id);if(current)command({kind:'mute',target:s.id,muted:!current.muted});});
  return row;
 }
 function render(){
  if(!state)return;
  const m=state.master;$('device').textContent=m?.name||'No output connected';
  if(editing!==$('master-volume')){$('master-volume').value=Math.round((m?.volume||0)*100);$('master-value').textContent=m?Math.round(m.volume*100)+'%':'—';}
  $('master-mute').textContent=m?.muted?'Unmute':'Mute';$('master-mute').setAttribute('aria-label',m?.muted?'Unmute master':'Mute master');$('master-mute').setAttribute('aria-pressed',String(!!m?.muted));
  for(const [id,row] of rows){if(!editing&&!state.sessions.some(s=>s.id===id)){row.root.remove();rows.delete(id);}}
  for(const s of state.sessions){let row=rows.get(s.id);if(!row){if(editing)continue;row=createRow(s);rows.set(s.id,row);$('sessions').append(row.root);}row.name.textContent=s.name;row.slider.setAttribute('aria-label',s.name+' volume');
   if(editing!==row.slider){row.slider.value=Math.round(s.volume*100);row.out.textContent=Math.round(s.volume*100)+'%';}
   row.mute.textContent=s.muted?'Unmute':'Mute';row.mute.setAttribute('aria-label',(s.muted?'Unmute ':'Mute ')+s.name);row.mute.setAttribute('aria-pressed',String(s.muted));
  }
  $('empty').hidden=state.sessions.length>0;media();availability();
 }
 async function poll(){
  if(!token||polling||busy)return;polling=true;const start=revision;
  try{const next=await request('/state');if(start!==revision)return;state=next;connected=true;$('settings').textContent='Connected';$('notice').textContent=state.mediaError||'Windows audio connected';render();}
  catch(error){if(start!==revision)return;connected=false;$('settings').textContent='Connect';$('notice').textContent=error.message;availability();}
  finally{polling=false;}
 }
 async function command(body){
  if(!connected||busy)return;busy=true;revision++;availability();let error=null;
  try{await request('/command',body);}catch(e){error=e.message;}
  finally{busy=false;await poll();if(error)$('notice').textContent=error;availability();}
 }
 for(const name of ['player','mixer'])$(name+'-tab').addEventListener('click',()=>{for(const tab of ['player','mixer']){$(tab).hidden=tab!==name;$(tab+'-tab').setAttribute('aria-selected',String(tab===name));}});
 $('settings').onclick=()=>{$('key').value=token;$('connection').showModal();};$('cancel').onclick=()=>$('connection').close();
 $('pair').onsubmit=async event=>{event.preventDefault();const key=$('key').value.trim();if(!/^[a-f0-9]{64}$/i.test(key)){$('pair-error').textContent='Paste the complete 64-character pairing key.';return;}token=key.toLowerCase();revision++;try{localStorage.setItem(storageKey,token);}catch{}$('pair-error').textContent='';$('connection').close();await poll();};
 $('players').onchange=()=>{selected=$('players').value;media();availability();};
 for(const kind of ['playPause','next','previous'])$(kind).onclick=()=>{if(selected)command({kind,target:selected});};
 bindSlider($('master-volume'),()=>state?.master?.id,$('master-value'));
 $('master-mute').onclick=()=>{if(state?.master)command({kind:'mute',target:state.master.id,muted:!state.master.muted});};
 $('artwork').onerror=()=>{$('artwork').hidden=true;$('fallback').hidden=false;};
 if(token)poll();else $('connection').showModal();setInterval(poll,1200);
})();
