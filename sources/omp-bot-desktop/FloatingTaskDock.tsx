import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { Factory, Maximize2, Minimize2, ArrowUpRight, Bell, Bot, ChevronLeft, ChevronRight, GripVertical, Grip, PanelLeftOpen, PanelLeftClose, LayoutDashboard, Pause, Pin, PinOff, Play, Plus, Settings, Sparkles, WifiOff, X } from 'lucide-react';

import {BoardPanel,BotsPanel,FactoryPanel} from './SidebarPanels';
import {type RanchState,type Reply} from './sidebar-model';
type WindowInfo = { expanded: boolean; pinned: boolean; side: 'left' | 'right'; mode:'icue'|'app'; length:'short'|'long'; panelSize?:{width:number;height:number}; desktopVersion?:string; installedVersion?:string; updatePending?:boolean };
declare global {
  interface Window {
    botRanch: {
      state(): Promise<RanchState>;
      action(name: string, body: object): Promise<Reply>;
      openPage(page: 'board' | 'settings' | 'ranch' | 'new-task', taskId?: string): Promise<Reply>;
      openUtility(kind:'recovery'|'ai-sync'): Promise<Reply>;
      window(action: 'expand' | 'pin' | 'hide' | 'move' | 'resize' | 'reset' | 'info' | 'mode' | 'length', value?: boolean | 'icue' | 'app' | 'short' | 'long' | { dx: number; dy: number } | {width:number;height:number}): Promise<WindowInfo & Reply>;
    };
  }
}
const tabs = [{ id: 'bots', label: 'Bots', Icon: Bot }, { id: 'tasks', label: 'Board', Icon: LayoutDashboard }, { id: 'factory', label: 'Factory', Icon: Factory }, { id: 'updates', label: 'Updates', Icon: Bell }] as const;
type Tab = typeof tabs[number]['id'];
const spring = { type: 'spring' as const, stiffness: 380, damping: 34 };
function age(at: number) { const minutes = Math.max(0, Math.floor((Date.now() - at) / 60000)); return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`; }
function checkReply<T extends Reply>(reply: T): T { if (reply?.error) throw Error(reply.error); return reply; }

export default function FloatingTaskDock() {
  const groupId = useId(), panelId = useId();
  const reducedMotion = useReducedMotion();
  const [info, setInfo] = useState<WindowInfo>({ expanded: false, pinned: true, side: 'right', mode:'icue', length:'short' });
  const [data, setData] = useState<RanchState | null>(null);
  const [online, setOnline] = useState(false);
  const [checkedConnection, setCheckedConnection] = useState(false);
  const [offlineReason, setOfflineReason] = useState('');
  const [tab, setTab] = useState<Tab>('tasks');
  const consumedAttention=useRef<string|null>(null);
  const [attentionRequest,setAttentionRequest]=useState<string>();
  const [creating, setCreating] = useState(false);
  const [bankRequested,setBankRequested] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [changingWindow, setChangingWindow] = useState(false);
  const expandRef = useRef<HTMLButtonElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const refresh = useRef<() => void>(() => {});
  const movement = useRef({ dx: 0, dy: 0, pending: false });
  const windowRevision = useRef(0);
  const resizePointer = useRef<{id:number;x:number;y:number;width:number;height:number;direction:number}|null>(null);
  const resizeQueue = useRef<{pending:boolean;next:{width:number;height:number}|null}>({pending:false,next:null});

  const resize = useCallback(async (width:number,height:number) => {
    const queue=resizeQueue.current;
    queue.next={width:Math.round(Math.max(500,Math.min(2400,width))),height:Math.round(Math.max(480,Math.min(2400,height)))};
    if(queue.pending)return;
    queue.pending=true;
    try{while(queue.next){const size=queue.next;queue.next=null;windowRevision.current++;setInfo(checkReply(await window.botRanch.window('resize',size)));}}
    catch{queue.next=null;setMessage('Could not resize panel.');}
    finally{queue.pending=false;}
  },[]);
  const startResize=(event:PointerEvent<HTMLButtonElement>)=>{
    if(event.button!==0||resizePointer.current)return;
    resizePointer.current={id:event.pointerId,x:event.screenX,y:event.screenY,width:window.innerWidth,height:window.innerHeight,direction:info.side==='left'?-1:1};
    event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();
  };
  const dragResize=(event:PointerEvent<HTMLButtonElement>)=>{
    const start=resizePointer.current;if(!start||start.id!==event.pointerId)return;
    void resize(start.width+(event.screenX-start.x)*start.direction,start.height+(event.screenY-start.y));
  };
  const stopResize=(event:PointerEvent<HTMLButtonElement>)=>{
    if(resizePointer.current?.id!==event.pointerId)return;
    resizePointer.current=null;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const resizeKey=(event:KeyboardEvent<HTMLButtonElement>)=>{
    const step=event.shiftKey?100:40;
    const widthDelta=event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0;
    const heightDelta=event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0;
    if(!widthDelta&&!heightDelta)return;
    event.preventDefault();void resize(window.innerWidth+widthDelta,window.innerHeight+heightDelta);
  };

  useEffect(() => {
    let mounted = true, inFlight = false, infoInFlight = false;
    const poll = async () => {
      if (!mounted || inFlight) return;
      inFlight = true;
      let expired = false;
      const timeout = window.setTimeout(() => { expired = true; if (mounted) { setOnline(false); setCheckedConnection(true); setOfflineReason(''); } }, 6000);
      try {
        const next = await window.botRanch.state();
        if (!mounted || expired) return;
        if (next.offline || next.error) {
          setOnline(false); setCheckedConnection(true); setOfflineReason(typeof next.error === 'string' ? next.error : '');
          return;
        }
        if (!Array.isArray(next.tasks) || !Array.isArray(next.profiles)) throw Error('Companion unavailable');
        setData({ ...next, updates: Array.isArray(next.updates) ? next.updates : [] }); setOnline(true); setCheckedConnection(true); setOfflineReason('');
      } catch { if (mounted && !expired) { setOnline(false); setCheckedConnection(true); setOfflineReason(''); } }
      finally { window.clearTimeout(timeout); inFlight = false; }
    };
    refresh.current = () => { void poll(); };
    const pollWindow = async () => {
      if (infoInFlight) return;
      infoInFlight = true;
      const revision = windowRevision.current;
      try { const next = checkReply(await window.botRanch.window('info')); if (mounted && revision === windowRevision.current) setInfo(next); }
      catch { /* State polling reports connection failures; window controls remain local. */ }
      finally { infoInFlight = false; }
    };
    void poll();
    const interval = window.setInterval(poll, 2500);
    void pollWindow();
    const windowInterval = window.setInterval(pollWindow, 2500);
    return () => { mounted = false; window.clearInterval(interval); window.clearInterval(windowInterval); refresh.current = () => {}; };
  }, []);

  const native = useCallback(async (action: 'pin' | 'hide' | 'reset' | 'mode' | 'length', value?: boolean | 'icue' | 'app' | 'short' | 'long') => {
    windowRevision.current++;
    try { const next = checkReply(await window.botRanch.window(action, value)); if (next) setInfo(next); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Window action failed.'); }
  }, []);
  const expand = useCallback(async (open: boolean) => {
    if (changingWindow) return;
    setChangingWindow(true);
    windowRevision.current++;
    try {
      const next = checkReply(await window.botRanch.window('expand', open));
      setInfo(next);
      if (!open) requestAnimationFrame(() => expandRef.current?.focus());
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not open panel.'); }
    finally { setChangingWindow(false); }
  }, [changingWindow]);
  useEffect(()=>{
    const request=data?.uiRequest;
    if(!request||request.view!=='attention'||consumedAttention.current===request.id||changingWindow)return;
    consumedAttention.current=request.id;setTab('tasks');setCreating(false);setAttentionRequest(request.id);void expand(true);
  },[data?.uiRequest,changingWindow,expand]);
  useEffect(() => {
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape' && info.expanded) { event.preventDefault(); void expand(false); } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [expand, info.expanded]);

  const move = useCallback(async (dx: number, dy: number) => {
    const queue = movement.current;
    queue.dx += dx; queue.dy += dy;
    if (queue.pending) return;
    queue.pending = true;
    try {
      while (queue.dx || queue.dy) {
        const delta = { dx: queue.dx, dy: queue.dy }; queue.dx = 0; queue.dy = 0;
        windowRevision.current++;
        const next = checkReply(await window.botRanch.window('move', delta));
        if (next?.side) setInfo(current => ({ ...current, side: next.side }));
      }
    } catch { queue.dx = 0; queue.dy = 0; setMessage('Could not move dock.'); }
    finally { queue.pending = false; }
  }, []);
  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || pointer.current) return;
    pointer.current = { id: event.pointerId, x: event.screenX, y: event.screenY };
    event.currentTarget.setPointerCapture(event.pointerId); setDragging(true);
  };
  const drag = (event: PointerEvent<HTMLButtonElement>) => {
    const previous = pointer.current;
    if (!previous || previous.id !== event.pointerId) return;
    const dx = event.screenX - previous.x, dy = event.screenY - previous.y;
    pointer.current = { id: event.pointerId, x: event.screenX, y: event.screenY };
    void move(dx, dy);
  };
  const stopDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current?.id !== event.pointerId) return;
    pointer.current = null; setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const handleMoveKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const offsets: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const offset = offsets[event.key]; if (!offset) return;
    event.preventDefault(); const step = event.shiftKey ? 40 : 12; void move(offset[0] * step, offset[1] * step);
  };
  const openPage = async (page: 'board' | 'settings' | 'ranch' | 'new-task', taskId?: string) => {
    if (!online && (page === 'new-task' || taskId)) return;
    try { checkReply(await window.botRanch.openPage(page, taskId)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not open botRanch.'); }
  };
  const openRecovery = async () => { try { checkReply(await window.botRanch.openUtility('recovery')); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not open recovery.'); } };
  const openAiSync = async () => { try { checkReply(await window.botRanch.openUtility('ai-sync')); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not open AI Sync.'); } };
  const run = async (name:string, body:object, success?:string) => {
    if (!online || busy) throw Error('Wait for the companion or current action.');
    setBusy(name);setMessage('');
    try {const reply=checkReply(await window.botRanch.action(name,body));setMessage(reply.result?.message||success||'Updated.');refresh.current();return reply.result;}
    catch(error){const message=error instanceof Error?error.message:'Action failed.';setMessage(message);throw Error(message);}
    finally{setBusy(null);}
  };
  const tasks=(data?.tasks||[]).filter(t=>!t.archived),profiles=data?.profiles||[];
  const activeCount=tasks.filter(t=>t.status!=='done').length,reviewCount=tasks.filter(t=>t.status==='review').length;
  const disabled=!online||busy!==null;
  const chooseTab=(next:Tab)=>{setTab(next);setCreating(false);setBankRequested(false);if(!info.expanded)void expand(true);};
  const newTask=()=>{chooseTab('tasks');setCreating(true);};
  const tooltip=(text:string)=><span className="dock-tooltip" aria-hidden="true">{text}</span>;
  const popout=(page:'board'|'settings',id?:string)=>{void openPage(page,id);};
  const transition=reducedMotion?{duration:0}:spring;
  const panelProps={data,disabled,run,popout};
  return <LayoutGroup id={groupId}>
    <main className={`dock-shell ${info.expanded?'is-expanded':''} is-${info.length||'short'} expands-${info.side}`} aria-label="botRanch floating dock">
      <div className="dock-rail">
        <button className={`dock-grip ${dragging?'is-dragging':''}`} aria-label="Move dock. Arrow keys move; Shift moves farther." title="Drag to move. Arrow keys reposition." onPointerDown={startDrag} onPointerMove={drag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={stopDrag} onKeyDown={handleMoveKey}><GripVertical size={17}/></button>
        <button ref={expandRef} className="dock-brand" aria-label={info.expanded?'Collapse task panel':'Open task panel'} aria-controls={panelId} aria-expanded={info.expanded} onClick={()=>void expand(!info.expanded)} disabled={changingWindow}>{info.expanded?<PanelLeftClose size={23} aria-hidden="true"/>:<PanelLeftOpen size={23} aria-hidden="true"/>}{tooltip(info.expanded?'Collapse panel':'Expand panel')}</button>
        <nav className="dock-tabs" aria-label="Dock views">{tabs.map(({id,label,Icon})=><div className="dock-tab-wrap" key={id}>{tab===id&&<><motion.div className="dock-active" layoutId="activeIndicator" transition={transition}/><motion.div className="dock-active-edge" layoutId="activeEdgeGlow" transition={transition}/></>}<button className={`dock-icon ${tab===id?'is-active':''}`} aria-label={label} aria-pressed={tab===id} onClick={()=>chooseTab(id)}><Icon size={20}/>{id==='tasks'&&reviewCount>0&&<span className="dock-count">{Math.min(99,reviewCount)}</span>}{tooltip(label)}</button></div>)}</nav>
        <div className="dock-divider"/><button className="dock-icon dock-add" aria-label="New task" disabled={!online} onClick={newTask}><Plus size={23}/>{tooltip('New task')}</button>
        <div className="dock-mini-row"><button className="dock-mini" aria-label={info.length==='long'?'Use short dock':'Use long sidebar'} onClick={()=>void native('length',info.length==='long'?'short':'long')}>{info.length==='long'?<Minimize2 size={16}/>:<Maximize2 size={16}/>} {tooltip(info.length==='long'?'Short dock':'Long sidebar')}</button><button className="dock-mini" aria-label="Open settings" onClick={()=>popout('settings')}><Settings size={16}/>{tooltip('Settings')}</button></div>
        <div className="dock-mini-row"><button className="dock-mini" aria-label={info.pinned?'Unpin dock':'Pin dock above windows'} aria-pressed={info.pinned} onClick={()=>void native('pin',!info.pinned)}>{info.pinned?<Pin size={15}/>:<PinOff size={15}/>}</button><button className="dock-mini" aria-label="Hide dock" onClick={()=>void native('hide')}><X size={16}/>{tooltip('Hide to tray')}</button></div>
        <button className={`rail-connection ${online?'is-online':'is-offline'}`} title="Connection & recovery" aria-label="Open Connection & recovery" onClick={()=>void openRecovery()}>{tooltip('Connection & recovery')}</button>
      </div>
      <AnimatePresence initial={false}>{info.expanded&&<motion.section id={panelId} className="dock-panel" role="region" aria-label="botRanch panel" initial={reducedMotion?false:{opacity:0,x:info.side==='right'?-12:12}} animate={{opacity:1,x:0}} exit={{opacity:0}} transition={{duration:reducedMotion?0:.18}}>
        <button className="panel-resize" aria-label="Resize panel. Left and right arrows change width; up and down change height." title="Drag to resize. Arrow keys adjust size; Shift adjusts faster." onPointerDown={startResize} onPointerMove={dragResize} onPointerUp={stopResize} onPointerCancel={stopResize} onLostPointerCapture={stopResize} onKeyDown={resizeKey}><Grip size={15}/></button>
        <header className="panel-header"><div><p className="panel-brand">botRanch <span className="desktop-label">{info.length==='long'?'Long sidebar':'Short dock'}</span></p><h1>{tabs.find(t=>t.id===tab)?.label}</h1><p className="panel-summary">{activeCount} open tasks · {profiles.filter(p=>p.active).length} residents</p></div><div className="panel-header-actions"><button className="small-button" aria-label="Open AI Sync" title="AI Sync" onClick={()=>void openAiSync()}><Sparkles size={16}/></button><button className="small-button panel-collapse" aria-label="Collapse panel" onClick={()=>void expand(false)}>{info.side==='right'?<ChevronLeft size={18}/>:<ChevronRight size={18}/>}</button></div></header>
        {!online&&<div className="connection-notice" role="status"><WifiOff size={14}/><span>{data?'Offline · showing last state, read-only':checkedConnection?'Offline · companion unavailable':'Starting or reconnecting to companion...'}{offlineReason&&<span className="offline-reason">{offlineReason}</span>}<button className="text-button recovery-link" onClick={()=>void openRecovery()}>Connection &amp; recovery</button></span></div>}
        <div className="pickup-row"><span><span className={`status-dot ${data?.pickupPaused===false?'running':''}`}/>Pickup {data?data.pickupPaused?'paused':'running':'unavailable'}</span><button className="text-button" aria-label={data?.pickupPaused===false?'Pause pickup':'Resume pickup'} disabled={disabled} onClick={()=>void run('pickup',{paused:!data?.pickupPaused},'Pickup updated.').catch(()=>{})}>{data?.pickupPaused===false?<Pause size={12}/>:<Play size={12}/>} {data?.pickupPaused===false?'Pause':'Resume'}</button></div>
        <div className="panel-scroll" key={tab}>
          {tab==='tasks'&&<BoardPanel attentionRequest={attentionRequest} {...panelProps} creating={creating} onCreating={setCreating}/>}
          {tab==='bots'&&<BotsPanel {...panelProps} initialBank={bankRequested} onFactory={()=>chooseTab('factory')}/>}
          {tab==='factory'&&<FactoryPanel {...panelProps} onBank={()=>{setTab('bots');setBankRequested(true);}}/>}
          {tab==='updates'&&(data?.updates.length?[...data.updates].sort((a,b)=>b.at-a.at).slice(0,30).map(update=><article className="update-row" key={update.id}><div className="update-heading"><strong>{profiles.find(p=>p.id===update.profileId)?.nickname||'Bot'}</strong><time dateTime={new Date(update.at).toISOString()}>{age(update.at)}</time></div><p>{update.text}</p>{update.taskId&&<button className="text-button" disabled={!online} onClick={()=>popout('board',update.taskId)}>View task <ArrowUpRight size={12}/></button>}</article>):<div className="empty-state"><Bell size={24}/><p>No updates yet.</p><span>Bot progress will appear here.</span></div>)}
        </div>
        {message&&<div className="action-message" role="status"><span>{message}</span><button className="small-button" aria-label="Dismiss message" onClick={()=>setMessage('')}><X size={12}/></button></div>}
        {info.updatePending&&<div className="connection-notice" role="status">v{info.installedVersion} installed. Choose “Quit desktop app” in the tray menu, then reopen botRanch from Start. Current app: v{info.desktopVersion}.</div>}
        <div className="panel-versions" aria-label="App versions"><span>App {info.desktopVersion?`v${info.desktopVersion}`:'version unavailable'} · Companion {online&&data?.appVersion?`v${data.appVersion}`:online?'version unavailable':'offline'}</span><button className="text-button" onClick={()=>void openRecovery()}>Versions &amp; recovery</button></div>
        <div className="display-mode"><label htmlFor="ranch-display-mode">Ranch display</label><select id="ranch-display-mode" value={info.mode||'icue'} onChange={e=>void native('mode',e.target.value as 'icue'|'app')}><option value="icue">A · iCUE widget</option><option value="app">B · Desktop app</option></select></div>
        <footer className="panel-footer"><button className="text-button" onClick={()=>popout('board')}>Full Board <ArrowUpRight size={12}/></button><button className="text-button" onClick={()=>void openPage('ranch')}>Open Ranch app</button><button className="text-button" onClick={()=>void native('reset')}>Reset position</button></footer>
      </motion.section>}</AnimatePresence>
    </main>
  </LayoutGroup>;
}
