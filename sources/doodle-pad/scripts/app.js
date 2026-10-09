(function () {
  'use strict';
  const $=id=>document.getElementById(id), {hsvToHex,hexToHsv}=DoodleCore;
  const swatches=[['Black','#1c2536'],['Gray','#8b95a3'],['White','#ffffff'],['Brown','#915838'],['Red','#ed4550'],['Orange','#f79437'],['Yellow','#f6d348'],['Green','#4ab978'],['Cyan','#48c5d3'],['Blue','#477de4'],['Purple','#9762d3'],['Pink','#ec83b7']];
  const papers={white:'#ffffff',black:'#000000',cream:'#fff8e7'};
  let paper='white';
  let tool='pen', size=1, color=hexToHsv('#1c2536'), custom={...color}, opacity={pen:1,marker:.4}, sampling=false, pointer=null, busy=false;
  let storageKey=null, savingTimer=null, initialized=false, loading=false, pickerTool='pen';
  const status=text=>{ $('status').textContent=text; $('status').title=text; };
  const drawing=new DoodleDrawing($('drawing'),$('stroke'),()=>{ refresh(); scheduleSave(); });
  function resize() { const r=$('stage').getBoundingClientRect(), scale=Math.min(r.width/1200,r.height/800); $('paper').style.width=(1200*scale)+'px'; $('paper').style.height=(800*scale)+'px'; }
  new ResizeObserver(resize).observe($('stage')); resize();
  function refresh() {
    drawing.paperColor=papers[paper]; $('paper').style.backgroundColor=papers[paper];
    document.querySelectorAll('[data-paper]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.paper===paper)));
    const hex=hsvToHex(color.h,color.s,color.v);
    document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool && !sampling)));
    document.querySelectorAll('[data-size]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.size)===size)));
    document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===hex)));
    $('custom-swatch').style.setProperty('--swatch',hsvToHex(custom.h,custom.s,custom.v));
    $('eyedropper').setAttribute('aria-pressed',String(sampling)); $('sample-hint').hidden=!sampling;
    document.querySelectorAll('main button').forEach(b=>b.disabled=loading || busy);
    $('undo').disabled=loading || busy || !drawing.history.canUndo; $('redo').disabled=loading || busy || !drawing.history.canRedo;
    $('empty-hint').hidden=!drawing.isEmpty();
  }
  function settings() { return {color,custom,opacity,tool,size,paper}; }
  function saveDraft() {
    clearTimeout(savingTimer);
    if(!storageKey || loading)return;
    try {
      const png=drawing.draftPNG();
      if(png.length>3_500_000)throw new Error('Draft is too large');
      let root={}; try { root=JSON.parse(localStorage.getItem(storageKey)||'{}'); } catch { /* Recover corrupt root with a fresh document. */ }
      if(!root || typeof root!=='object' || Array.isArray(root))root={};
      root.doodlePad={version:1,png,settings:settings()};
      localStorage.setItem(storageKey,JSON.stringify(root)); $('draft-status').textContent='Draft saved';
    } catch { $('draft-status').textContent='Draft not saved'; status('Draft could not be saved. Export a PNG to keep your drawing.'); }
  }
  function scheduleSave() { if(!storageKey || loading)return; $('draft-status').textContent='Saving draft…'; clearTimeout(savingTimer); savingTimer=setTimeout(saveDraft,250); }
  function validHSV(v) { return v && ['h','s','v'].every(k=>Number.isFinite(v[k])) && v.h>=0 && v.h<=360 && v.s>=0 && v.s<=100 && v.v>=0 && v.v<=100; }
  async function loadDraft() {
    loading=true; refresh();
    try {
      const root=JSON.parse(localStorage.getItem(storageKey)||'{}'), draft=root?.doodlePad;
      if(!draft)return;
      if(draft.version!==1 || typeof draft.png!=='string' || !draft.png.startsWith('data:image/png;base64,') || draft.png.length>3_500_000)throw new Error('Invalid draft');
      const image=new Image(); image.src=draft.png; await image.decode(); drawing.restore(image);
      const s=draft.settings||{};
      if(Object.hasOwn(papers,s.paper))paper=s.paper;
      if(validHSV(s.color))color=s.color;
      if(validHSV(s.custom))custom=s.custom;
      if(['pen','marker','eraser'].includes(s.tool))tool=s.tool;
      if([0,1,2].includes(s.size))size=s.size;
      for(const k of ['pen','marker'])if(Number.isFinite(s.opacity?.[k]) && s.opacity[k]>=0 && s.opacity[k]<=1)opacity[k]=s.opacity[k];
      $('draft-status').textContent='Draft restored'; status('Your drawing is back');
    } catch { status('Could not restore the draft. Your next drawing will start a new draft.'); }
    finally { loading=false; refresh(); }
  }
  function initialize() {
    if(initialized)return;
    const id=typeof uniqueId!=='undefined'?uniqueId:null;
    if(id)storageKey=String(id);
    else if(typeof iCUE==='undefined')storageKey='com.xeneonwidge.doodlepad.browser';
    else { $('draft-status').textContent='Waiting for iCUE'; return; }
    initialized=true; loadDraft();
  }
  window.icueEvents={onICUEInitialized:initialize,onDataUpdated:initialize};
  initialize();
  window.addEventListener('pagehide',()=>{ drawing.cancel(); saveDraft(); });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden){ cancelPointer(); saveDraft(); } });
  for(const [name,hex] of swatches) {
    const b=document.createElement('button'); b.type='button'; b.className='swatch'; b.dataset.color=hex; b.style.setProperty('--swatch',hex); b.setAttribute('aria-label',name); b.title=name;
    b.addEventListener('click',()=>{ color=hexToHsv(hex,color.h); sampling=false; refresh(); scheduleSave(); }); $('palette').append(b);
  }
  document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>{ tool=b.dataset.tool; sampling=false; refresh(); scheduleSave(); status(tool==='eraser'?'Erase a mark':'Ready to draw'); }));
  document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{ size=Number(b.dataset.size); refresh(); scheduleSave(); }));
  document.querySelectorAll('[data-paper]').forEach(b=>b.addEventListener('click',()=>{ cancelPointer(); paper=b.dataset.paper; refresh(); scheduleSave(); status(b.textContent+' paper selected'); }));
  $('eyedropper').addEventListener('click',()=>{ sampling=!sampling; refresh(); status(sampling?'Tap a color on the page':'Ready to draw'); });
  const picker=new DoodlePicker(value=>{ color={h:value.h,s:value.s,v:value.v}; custom={...color}; tool=pickerTool; opacity[tool]=value.a/100; refresh(); scheduleSave(); status('Custom color selected'); });
  $('custom-color').addEventListener('click',()=>{ sampling=false; pickerTool=tool==='eraser'?'pen':tool; refresh(); picker.open(color,opacity[pickerTool]); });
  $('custom-swatch').addEventListener('click',()=>{ color={...custom}; sampling=false; refresh(); scheduleSave(); });
  const canvas=$('drawing');
  function canDraw() { return !loading && !busy && !$('color-dialog').open && !$('clear-dialog').open; }
  canvas.addEventListener('pointerdown',e=>{
    if(!canDraw() || pointer!==null || (e.pointerType==='mouse' && e.button!==0))return;
    e.preventDefault(); const point=drawing.position(e);
    if(sampling){ color=hexToHsv(drawing.sample(point),color.h); custom={...color}; sampling=false; refresh(); scheduleSave(); status('Color picked'); return; }
    pointer=e.pointerId; canvas.setPointerCapture(e.pointerId);
    drawing.begin(point,{tool,color:hsvToHex(color.h,color.s,color.v),opacity:tool==='eraser'?1:opacity[tool],size:({pen:[4,10,22],marker:[16,32,58],eraser:[18,40,76]})[tool][size]});
    $('empty-hint').hidden=true;
  });
  canvas.addEventListener('pointermove',e=>{ if(e.pointerId!==pointer)return; const events=e.getCoalescedEvents?.(); for(const p of events?.length?events:[e])drawing.move(drawing.position(p)); });
  canvas.addEventListener('pointerup',e=>{ if(e.pointerId!==pointer)return; drawing.move(drawing.position(e)); pointer=null; drawing.finish(); status('Ready to draw'); });
  function cancelPointer() { pointer=null; drawing.cancel(); refresh(); }
  canvas.addEventListener('pointercancel',e=>{if(e.pointerId===pointer)cancelPointer();});
  canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===pointer)cancelPointer();});
  $('undo').addEventListener('click',()=>drawing.undo()); $('redo').addEventListener('click',()=>drawing.redo());
  $('clear').addEventListener('click',()=>{$('clear-dialog').showModal();});
  $('clear-cancel').addEventListener('click',()=>{$('clear-dialog').close();});
  $('clear-confirm').addEventListener('click',()=>{drawing.clear();$('clear-dialog').close();status('Fresh page');});
  async function operation(action,success) {
    if(busy || loading)return;
    cancelPointer(); busy=true; refresh();
    try { await action(); status(success); }
    catch(error) { status(error.message || 'That action could not finish. Your drawing is safe.'); }
    finally { busy=false; refresh(); }
  }
  $('copy').addEventListener('click',()=>operation(()=>DoodleHost.copy(drawing.exportCanvas()),'Copied image to clipboard'));
  $('paste').addEventListener('click',()=>operation(async()=>drawing.addImage(await DoodleHost.paste()),'Image pasted'));
  $('save').addEventListener('click',()=>operation(()=>DoodleHost.save(drawing.exportCanvas()),'PNG download requested — check your downloads'));
  $('import').addEventListener('click',()=>{$('image-file').click();});
  $('image-file').addEventListener('change',()=>{const file=$('image-file').files[0]; $('image-file').value=''; if(file)operation(async()=>drawing.addImage(await DoodleHost.decodeImage(file)),'Image added');});
  document.addEventListener('paste',e=>{
    if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName) || !canDraw())return;
    const file=[...(e.clipboardData?.files||[])].find(f=>f.type.startsWith('image/'));
    if(file){e.preventDefault();operation(async()=>drawing.addImage(await DoodleHost.decodeImage(file)),'Image pasted');}
  });
  document.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName) || !canDraw())return;
    if(e.key==='Escape' && sampling){sampling=false;refresh();}
    if(e.ctrlKey || e.metaKey){ if(e.key.toLowerCase()==='z'){e.preventDefault(); e.shiftKey?drawing.redo():drawing.undo();} if(e.key.toLowerCase()==='y'){e.preventDefault();drawing.redo();} if(e.key.toLowerCase()==='s'){e.preventDefault();$('save').click();} }
  });
  refresh();
})();
