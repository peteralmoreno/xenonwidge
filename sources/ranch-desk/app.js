(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const base = location.protocol === 'http:' && location.hostname === '127.0.0.1' && location.pathname.startsWith('/desk/') ? location.origin : 'http://127.0.0.1:43822';
  const states = {ready:'Ready',reading:'Reading',researching:'Researching',writing:'Writing',running:'Running',thinking:'Working',working:'Working',waiting:'Needs you',done:'Done',error:'Needs attention',offline:'Offline'};
  const colors = ['#e58d77','#68bbc3','#ddb55c','#a396ca','#e78fb3','#e8a05b','#a8c966','#65b58e','#729edb','#8585d5','#bbc5cb','#cf7070','#e4dcad','#66d9ce','#d976ed','#a78362','#ff2d2d','#ff4dd8','#2ec4ff','#7cff3f','#ff6b00','#ffd400','#00e676','#00b8a9','#0a7dff','#5e35ff','#9b30ff','#ff0088','#ff4f6d','#b388ff','#ffffff','#151515'];
  let key = '', sessions = [], selected = '', connected = false, polling = false, generation = 0;
  let supportsSelection = false, supportsFocus = false, revision = -1, selectionInstance = '', selectionEpoch = 0, selectionBusy = false, desired = '', focusBusy = false;
  const buttons = new Map();
  function storeKey() { try { localStorage.setItem('ranch-desk.key', key); } catch {} }
  try { key = localStorage.getItem('ranch-desk.key') || ''; } catch {}
  const transferred = new URLSearchParams(location.hash.slice(1)).get('pair');
  if (location.origin === base && /^[a-f0-9]{64}$/i.test(transferred || '')) {
    key = transferred.toLowerCase(); storeKey(); history.replaceState(null, '', location.pathname + location.search);
  }
  async function request(path, body) {
    const res = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: {Authorization: 'Bearer ' + key, ...(body ? {'Content-Type':'application/json'} : {})},
      ...(body ? {body: JSON.stringify(body)} : {}), signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) throw Error(res.status === 401 ? 'Pairing key rejected. Open Connect to update it.' : 'Companion unavailable.');
    return res.json();
  }
  function current() { return sessions.find(s => s.id === selected); }
  function acceptInstance(data) {
    if (typeof data.selectionInstance === 'string' && data.selectionInstance !== selectionInstance) {
      selectionInstance = data.selectionInstance; revision = -1;
    }
  }
  function render() {
    document.body.dataset.connected = String(connected);
    $('connect').textContent = connected ? 'Connected' : 'Connect';
    for (const [id, button] of buttons) if (!sessions.some(s => s.id === id)) { button.remove(); buttons.delete(id); }
    sessions.forEach((s, index) => {
      let button = buttons.get(s.id);
      if (!button) {
        button = document.createElement('button'); button.className = 'resident';
        const badge = document.createElement('span'); badge.className = 'badge'; badge.setAttribute('aria-hidden','true');
        const name = document.createElement('span'); name.className = 'resident-name';
        button.append(badge, name); button.onclick = () => choose(s.id); buttons.set(s.id, button);
      }
      button.style.setProperty('--bot', colors[s.color] || colors[index]);
      button.lastChild.textContent = s.project || 'Resident';
      button.setAttribute('aria-label', (s.project || 'Resident') + ', ' + (connected ? states[s.state] || 'Working' : 'Offline'));
      button.setAttribute('aria-pressed', String(selected === s.id));
      if ($('roster').children[index] !== button) $('roster').insertBefore(button, $('roster').children[index] || null);
    });
    const s = current(), live = connected && s && s.state !== 'offline';
    $('name').textContent = s?.project || 'No resident selected';
    $('state').textContent = !connected ? 'Disconnected' : s ? states[s.state] || 'Working' : 'The ranch is quiet';
    $('detail').textContent = !connected ? 'Start the companion and check your connection settings.' : s?.label || 'Add a resident in Bot Ranch companion setup.';
    const metadata = live ? s.metadata : null;
    const unavailable = live ? 'Unavailable' : 'Unavailable while offline';
    const folder = connected && typeof s?.metadata?.folder === 'string' ? s.metadata.folder : '';
    $('folder').textContent = folder || unavailable;
    $('folder').title = folder;
    $('model').textContent = [metadata?.provider, metadata?.model].filter(value => typeof value === 'string' && value).join(' / ') || unavailable;
    const context = metadata?.context;
    const capacity = Number.isSafeInteger(context?.capacity) && context.capacity > 0 ? context.capacity : null;
    const used = capacity && Number.isSafeInteger(context?.used) && context.used >= 0 ? context.used : null;
    const percent = used === null ? null : used / capacity * 100;
    $('context-value').textContent = percent === null ? capacity ? 'Usage unavailable / ' + capacity.toLocaleString() + ' tokens' : unavailable : percent.toLocaleString(undefined, {maximumFractionDigits:1}) + '% / ' + used.toLocaleString() + ' / ' + capacity.toLocaleString() + ' tokens';
    $('context-meter').hidden = percent === null;
    if (percent === null) $('context-meter').removeAttribute('value'); else $('context-meter').value = Math.min(100, percent);
    $('context-warning').hidden = percent === null || percent < 40;
    const preview = live && s.preview && typeof s.preview.text === 'string' ? s.preview : null;
    $('role').textContent = preview ? preview.role === 'user' ? 'You said' : 'Latest reply' : 'Conversation preview';
    $('excerpt').textContent = preview?.text || (!live ? 'Reconnect this bot to see its conversation.' : 'No conversation excerpt yet.');
    const date = preview && Number.isFinite(preview.at) ? new Date(preview.at) : null;
    $('time').textContent = date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
    if (date && !Number.isNaN(date.getTime())) $('time').dateTime = date.toISOString(); else $('time').removeAttribute('datetime');
    $('focus').disabled = !live || !supportsFocus || !s.canFocus || focusBusy;
    const attention = sessions.filter(s => s.state === 'waiting' || s.state === 'error').length;
    const done = sessions.filter(s => s.state === 'done').length;
    $('summary').textContent = connected ? attention + ' need attention · ' + done + ' done' : 'Companion disconnected';
    $('sync').textContent = !connected ? 'Connect with your Bot Ranch key.' : supportsSelection ? 'Shared with Bot Ranch' : 'Selection stays on this desk. Update companion to sync.';
  }
  function choose(id) {
    selected = id; desired = id; selectionEpoch++; $('result').textContent = ''; render();
    if (connected && supportsSelection) syncSelection();
  }
  async function syncSelection() {
    if (selectionBusy) return;
    selectionBusy = true;
    const version = generation;
    try {
      while (desired && version === generation) {
        const id = desired; desired = '';
        const data = await request('/selection', {id});
        if (version !== generation) return;
        acceptInstance(data);
        if (Number.isInteger(data.selectionRevision)) revision = Math.max(revision, data.selectionRevision);
      }
    } catch {
      if (version === generation) { desired = ''; $('result').textContent = 'Selection could not sync. Try again after reconnecting.'; }
    } finally { selectionBusy = false; }
  }
  async function poll() {
    if (!key || polling) return;
    polling = true;
    const version = generation, epoch = selectionEpoch, pending = selectionBusy;
    try {
      const data = await request('/state');
      if (version !== generation) return;
      if (data.app !== 'omp-bot' || data.version !== 1 || !Array.isArray(data.sessions)) throw Error('Unsupported companion.');
      const allSessions = data.sessions.filter(s => s && typeof s.id === 'string');
      sessions = allSessions.slice(0,4);
      connected = true; supportsSelection = data.capabilities?.selection === true; supportsFocus = data.capabilities?.focus === true;
      if (supportsSelection && !pending && !selectionBusy && epoch === selectionEpoch) {
        acceptInstance(data);
        if (Number.isInteger(data.selectionRevision) && data.selectionRevision >= revision) {
          revision = data.selectionRevision;
          selected = typeof data.selectedId === 'string' ? data.selectedId : '';
        }
      }
      // A Ranch slot may show a later unmanaged terminal. Keep its shared selection visible.
      const chosen = allSessions.find(s => s.id === selected);
      if (chosen && !sessions.includes(chosen)) sessions = [...sessions.slice(0,3), chosen];
      if (!sessions.some(s => s.id === selected)) selected = sessions[0]?.id || '';
      render();
    } catch (error) {
      if (version !== generation) return;
      connected = false; render();
      $('detail').textContent = error.message === 'Pairing key rejected. Open Connect to update it.' || error.message === 'Unsupported companion.' ? error.message : 'Start companion; allow 127.0.0.1 in iCUE Widget Access.';
    } finally { polling = false; }
  }
  $('focus').onclick = async () => {
    const s = current();
    if (!connected || !s || s.state === 'offline' || !supportsFocus || !s.canFocus || focusBusy) return;
    const id = s.id, version = generation;
    focusBusy = true; $('result').textContent = 'Opening terminal…'; render();
    try {
      const data = await request('/focus', {id});
      if (version !== generation || selected !== id) return;
      $('result').textContent = ({focused:'Terminal brought forward.',raised:'Terminal brought forward without changing keyboard focus.',attention:'Select the terminal on your taskbar.',closed:'That terminal has closed.',unavailable:'Terminal focus is unavailable.'})[data.result] || 'Terminal focus is unavailable.';
    } catch { if (version === generation && selected === id) $('result').textContent = 'Could not open terminal. Check the companion.'; }
    finally { focusBusy = false; render(); }
  };
  $('connect').onclick = () => { $('key').value = ''; $('pair-error').textContent = ''; $('pairing').showModal(); };
  $('close').onclick = () => $('pairing').close();
  $('pair-form').onsubmit = event => {
    event.preventDefault(); const candidate = $('key').value.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(candidate)) { $('pair-error').textContent = 'Paste the complete 64-character key.'; return; }
    key = candidate; storeKey(); generation++; selectionEpoch++; revision = -1; selectionInstance = ''; desired = ''; connected = false;
    $('key').value = ''; $('pair-error').textContent = ''; $('pairing').close(); render(); poll();
  };
  render(); if (key) poll(); else $('pairing').showModal();
  setInterval(poll, 700);
})();
