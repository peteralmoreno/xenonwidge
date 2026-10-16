import http from 'node:http';import {timingSafeEqual,randomUUID} from 'node:crypto';import {STATES} from './state.mjs';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {sanitizePreview} from './preview.mjs';
import {sanitizeMetadata} from './metadata.mjs';
import {createAgentApi} from './agent-api.mjs';
const directory=path.dirname(fileURLToPath(import.meta.url));
const uiRoot=fs.existsSync(path.join(directory,'ui/index.html'))?path.join(directory,'ui'):path.join(directory,'../omp-bot');
const appVersion=JSON.parse(fs.readFileSync(path.join(uiRoot,'manifest.json'),'utf8')).version;
const deskRoot=fs.existsSync(path.join(directory,'desk/index.html'))?path.join(directory,'desk'):path.join(directory,'../ranch-desk');
const deskFiles={'/desk/appearance.js':['appearance.js','text/javascript'],'/desk/':['index.html','text/html'],'/desk/app.js':['app.js','text/javascript'],'/desk/widget.css':['widget.css','text/css'],'/desk/resources/icon.svg':['resources/icon.svg','image/svg+xml']};
const publicFiles={'/ui/appearance.js':['appearance.js','text/javascript'],'/ui/':['index.html','text/html'],'/ui/app.js':['app.js','text/javascript'],'/ui/sprites.js':['sprites.js','text/javascript'],'/ui/world.js':['world.js','text/javascript'],'/ui/widget.css':['widget.css','text/css'],'/ui/resources/icon.svg':['resources/icon.svg','image/svg+xml']};
export function createBridge({key,now=Date.now,ttl=12000,focusTerminal=null,adminKey=null,manager=null,instanceId='unknown'}){
 const selectionInstance=randomUUID();
 const agentApi=manager?createAgentApi({manager,persistTransaction:transaction=>manager.commitAiTransaction(transaction),setAccess:async access=>manager.setAiAccess(access),operate:async(action,body)=>{
  if(action==='ring')return manager.ringAll();
  if(action==='wake')return manager.wakeSleeping();
  const task=manager.tasks.find(item=>item.id===body.taskId);
  if(!task||task.archived)throw Error('Unknown or archived task.');
  if(task.revision!==body.expectedRevision)throw Object.assign(Error('Conflict: task changed. Reload the Board before operating.'),{code:'conflict'});
  if(action==='release'||action==='hold'){
   if(task.status!=='todo')throw Error('Only pending tasks can be released or held.');
   return manager.saveTask({...task,expectedRevision:body.expectedRevision,releasedForPickup:action==='release'});
  }
  if(action==='start')return manager.dispatchTask(body.taskId,body.profileId,body.expectedRevision,null,body.contextRevision);
  if(action==='archive')return manager.archiveTask(body.taskId,body.expectedRevision);
  if(action==='accept'||action==='follow-up'){
   if(manager.taskLocks.has(task.id)||task.attempts?.some(attempt=>['dispatching','awaiting-runtime','claimed','running','unresolved'].includes(attempt.state)))throw Error('Cannot review an active or unresolved task.');
   return manager.reviewTask(body.taskId,body.expectedRevision,action,body.note,'agent');
  }
  throw Error('Unsupported operate action.');
 },now}):null;
 const sessions=new Map(),terminals=new Map(),managedIds=new Set();let focusing=false,lastFocus=-Infinity,selectedId="",selectionRevision=0;
 const valid=s=>s&&s.version===1&&typeof s.id==='string'&&/^[\w:-]{1,160}$/.test(s.id)&&Number.isSafeInteger(s.sequence)&&s.sequence>0&&STATES.includes(s.state)&&typeof s.project==='string'&&s.project.length<=80&&typeof s.label==='string'&&s.label.length<=120&&[s.startedAt,s.finishedAt].every(t=>t===null||Number.isFinite(t)&&t>=0&&t<=now()+60000)&&Number.isInteger(s.activeCount)&&s.activeCount>=0&&s.activeCount<=1000;
 return http.createServer(async(req,res)=>{
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, PUT, POST, OPTIONS','Access-Control-Allow-Private-Network':'true'});res.end(JSON.stringify(body));};
  if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||''))return reply(403,{error:'Invalid host'});
  if(manager?.shuttingDown)return reply(503,{error:'Companion is restarting.'});
  if(req.url.startsWith('/runtime/')){
   if(!manager)return reply(404,{error:'Task runtime is unavailable.'});
   if(req.method!=='POST')return reply(404,{error:'Not found'});
   try{
    let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>16384)return reply(413,{error:'Runtime request too large'});body+=chunk;}
    const data=JSON.parse(body),authorization=String(req.headers.authorization||''),token=authorization.startsWith('Bearer ')?authorization.slice(7):'';if(req.url==='/runtime/work'){const result=await manager.pollWork(data?.profileId,data?.launchId,token,data?.idle);return result?reply(200,result):reply(401,{error:'Runtime work check rejected.'});}
    if(!data||typeof data.profileId!=='string'||typeof data.launchId!=='string')return reply(400,{error:'Invalid runtime request.'});
    if(req.url==='/runtime/handoff'){const result=manager.acknowledgeRuntimeHandoff(data.profileId,data.launchId,token,data.deliveryId,data.phase);return result?reply(200,result):reply(401,{error:'Handoff acknowledgment rejected.'});}
    if(req.url==='/runtime/status'&&!data.attemptId){const result=manager.postSessionUpdate(data.profileId,data.launchId,token,data.event);return result?reply(200,result):reply(401,{error:'Session status update rejected.'});}
    if(typeof data.attemptId!=='string')return reply(400,{error:'Invalid runtime request.'});
    if(req.url==='/runtime/status'){const result=manager.postTaskUpdate(data.profileId,data.launchId,data.attemptId,token,data.event,data.clientId);return result?reply(200,result):reply(401,{error:'Status update rejected.'});}
    if(req.url==='/runtime/claim'){
     const task=manager.claimTaskRuntime(data.profileId,data.launchId,data.attemptId,token,data.clientId);return task?reply(200,{task}):reply(409,{error:'This task dispatch is unavailable or already claimed.'});
    }
    if(req.url==='/runtime/event'){
     const ok=manager.recordTaskRuntimeEvent(data.profileId,data.launchId,data.attemptId,token,data.event,data.clientId);return ok?reply(200,{ok:true}):reply(409,{error:'Runtime event rejected.'});
    }
    return reply(404,{error:'Not found'});
   }catch{return reply(400,{error:'Invalid runtime request.'});}
  }
  const setupFiles={'/board/':['board.html','text/html'],'/setup/board.js':['board.js','text/javascript'],'/setup/board.css':['board.css','text/css'],'/setup/':['index.html','text/html'],'/setup/app.js':['app.js','text/javascript'],'/setup/style.css':['style.css','text/css'],'/setup/settings.css':['settings.css','text/css']};
  if(req.method==='GET'&&Object.hasOwn(setupFiles,req.url)){try{const [file,type]=setupFiles[req.url];res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'"});res.end(fs.readFileSync(path.join(directory,'setup',file)));}catch{res.end('Setup files missing. Re-extract the complete companion.');}return;}
  if(req.url.startsWith('/admin/')){
   const a=Buffer.from(req.headers.authorization||''),b=Buffer.from('Bearer '+(adminKey||''));
   if(!adminKey||!manager||a.length!==b.length||!timingSafeEqual(a,b))return reply(401,{error:'Open setup using the Bot Ranch launcher.'});
   if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)return reply(403,{error:'Setup must be opened on this companion.'});
   try{
    if(req.url.startsWith('/admin/ai/')){if(!agentApi)return reply(404,{error:'AI Sync is unavailable.'});let data;if(req.method==='POST'){let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>131072)return reply(413,{error:'AI Sync request too large'});body+=chunk;}try{data=JSON.parse(body);}catch{return reply(400,{error:'Invalid JSON request.'});}}const result=await agentApi.handle({method:req.method,url:req.url,body:data});const response={...result.body};if(result.status===200&&['/admin/ai/catalog','/admin/ai/snapshot'].includes(req.url)){const programRoot=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local'),'Programs','botRanch');const cliInvocation=path.join(programRoot,'botRanch-cli.cmd');response.cliInvocation=fs.existsSync(cliInvocation)?cliInvocation:null;response.homeFolder=manager.library.root;}return reply(result.status,response);}
    if(req.method==='GET'&&req.url==='/admin/health'){
     const profiles=manager.view().profiles||[],busy=!!(manager.reconciling||manager.locks.size||manager.taskLocks.size||profiles.some(p=>p.activityBusy)||manager.tasks.some(t=>t.attempts?.some(a=>['dispatching','awaiting-runtime','claimed','running','unresolved'].includes(a.state))));
     return reply(200,{connectionVersion:1,appVersion,pid:process.pid,instanceId,homeFolder:manager.library?.root||'',busy});
    }
    if(req.method==='GET'&&req.url==='/admin/state')return reply(200,{...manager.view(),appVersion,restartSupported:true});
    if(req.method==='POST'&&req.url==='/admin/shutdown'){if(manager.reconciling||manager.locks.size||manager.taskLocks.size||manager.view().profiles.some(p=>p.activityBusy)||manager.tasks.some(t=>t.attempts?.some(a=>['dispatching','awaiting-runtime','claimed','running','unresolved'].includes(a.state))))return reply(409,{error:'Finish active work before updating the companion. Your terminals were left running.'});manager.shuttingDown=true;manager.persist();reply(200,{ok:true});const server=req.socket.server;setImmediate(()=>{server.emit('companion-shutdown');server.close();server.closeIdleConnections?.();});return;}
    if(req.method==='GET'&&req.url==='/admin/checks')return reply(200,{checks:await manager.checks()});
    if(req.method==='GET'&&req.url==='/admin/key')return reply(200,{key});
    if(req.method==='POST'&&req.url==='/admin/control-key')return reply(200,{controlKey:manager.provisionControlKey()});
    if(req.method==='POST'&&req.url==='/admin/control-key/revoke'){manager.revokeControlKey();return reply(200,{ok:true});}
    if(req.method==='POST'&&req.url==='/admin/ui/attention'){manager.uiRequest={id:randomUUID(),view:'attention'};return reply(200,{message:'Requested the sidebar attention view.'});}
    if(req.method==='POST'&&req.url==='/admin/profiles/wake')return reply(200,manager.wakeSleeping());
    if(req.method!=='POST')return reply(404,{error:'Not found'});
    let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>32768)return reply(413,{error:'Request too large'});body+=chunk;}
    const data=JSON.parse(body);if(req.url==='/admin/profile/ring-all')return reply(200,manager.ringAll());if(req.url==='/admin/profile/check-work')return reply(200,manager.requestWorkCheck(data.id));if(req.url==='/admin/profile/delete')return reply(200,await manager.deleteProfile(data.id,data.expectedRevision));if(req.url==='/admin/profile/clean')return reply(200,await manager.cleanProfile(data.id));if(req.url==='/admin/library/import')return reply(200,manager.importProfiles());if(req.url==='/admin/role')return reply(200,manager.saveRole(data));if(req.url==='/admin/pickup')return reply(200,manager.setPickupPaused(data.paused));if(req.url==='/admin/task/start')return reply(200,await manager.dispatchTask(data.taskId,data.profileId,data.expectedRevision));if(req.url==='/admin/profile')return reply(200,manager.saveProfile(data));
    if(req.url==='/admin/settings'){if(data.homeFolder!==undefined)manager.setHome(data.homeFolder);if(data.sleepSeconds!==undefined)manager.setSleep(data.sleepSeconds);return reply(200,{ok:true});}
    if(req.url==='/admin/action')return reply(200,await manager.action(data.id,data.action,data.confirmed===true));
    if(req.url==='/admin/task/queue')return reply(200,manager.queueTask(data));if(req.url==='/admin/task/stop')return reply(200,await manager.stopTask(data.id,data.confirmed,data.expectedAttemptId));if(req.url==='/admin/task')return reply(200,manager.saveTask(data));
    if(req.url==='/admin/task/sticky')return reply(200,manager.setTaskSticky(data));if(req.url==='/admin/family/sticky')return reply(200,manager.setFamilySticky(data));
    if(req.url==='/admin/task/archive')return reply(200,manager.archiveTask(data.id,data.expectedRevision));
    if(req.url==='/admin/task/pipeline')return reply(200,await manager.pipelineAction(data));
    if(req.url==='/admin/task/retry')return reply(200,await manager.prepareTaskRetry(data.id,data.expectedRevision));
    if(req.url==='/admin/task/review')return reply(200,manager.reviewTask(data.id,data.expectedRevision,data.action,data.note));
    if(req.url==='/admin/membership')return reply(200,manager.setMembership(data.id,data.active,data.expectedRevision));
    return reply(404,{error:'Not found'});
   }catch(e){return reply(['confirmation','conflict'].includes(e.code)?409:400,{error:e.message,confirmation:e.code==='confirmation'});}
  }
  if(req.url.startsWith('/control/')){
   // Browser preflights carry no bearer key. Authorize the actual request below.
   if(req.method==='OPTIONS')return reply(204,null);
   const provided=Buffer.from(req.headers.authorization||'').toString().replace(/^Bearer /,'');
   const supplied=Buffer.from(provided),connection=Buffer.from(key);if(!manager||!(supplied.length===connection.length&&timingSafeEqual(supplied,connection))&&!manager.authorizeControl(provided))return reply(401,{error:'Connection key rejected. Copy it from botRanch Settings.'});
   try{
    if(req.method==='GET'&&req.url==='/control/state')return reply(200,manager.view());
    if(req.method==='GET'&&req.url==='/control/tasks')return reply(200,manager.taskList());
    if(req.method!=='POST')return reply(404,{error:'Not found'});
    let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>32768)return reply(413,{error:'Request too large'});body+=chunk;}
    const data=JSON.parse(body);
    if(req.url==='/control/ui/attention'){manager.uiRequest={id:randomUUID(),view:'attention'};return reply(200,{message:'Requested the sidebar attention view.'});}
    if(req.url==='/control/profiles/wake')return reply(200,manager.wakeSleeping());
    if(req.url==='/control/profiles/check-work')return reply(200,manager.checkAvailableWork());
    if(req.url==='/control/project-manager'){const p=manager.profiles.find(p=>p.id===data.id&&p.active&&p.role==='pm');if(!p)throw Error('Choose an active Project Manager. Create one in Factory if needed.');return reply(200,await manager.action(p.id,'resume'));}

    if(req.url==='/control/task/queue')return reply(200,manager.queueTask(data));if(req.url==='/control/task/stop')return reply(200,await manager.stopTask(data.id,data.confirmed,data.expectedAttemptId));if(req.url==='/control/task')return reply(200,manager.saveTask(data));
    if(req.url==='/control/task/archive')return reply(200,manager.archiveTask(data.id,data.expectedRevision));
    if(req.url==='/control/task/pipeline')return reply(200,await manager.pipelineAction(data));
    if(req.url==='/control/task/retry')return reply(200,await manager.prepareTaskRetry(data.id,data.expectedRevision));
    if(req.url==='/control/task/review')return reply(200,manager.reviewTask(data.id,data.expectedRevision,data.action,data.note));
    if(req.url==='/control/membership')return reply(200,manager.setMembership(data.id,data.active,data.expectedRevision));
    if(req.url==='/control/pickup')return reply(200,manager.setPickupPaused(data.paused));
    if(req.url==='/control/profile'){const profile=manager.profiles.find(p=>p.id===data.id);if(!profile)return reply(404,{error:'Unknown resident.'});return reply(200,manager.saveProfile({...profile,...data}));}
    if(req.url==='/control/profile/check-work')return reply(200,manager.requestWorkCheck(data.id));if(req.url==='/control/profile/clean')return reply(200,await manager.cleanProfile(data.id));if(req.url==='/control/task/start')return reply(200,await manager.dispatchTask(data.taskId,data.profileId,data.expectedRevision));
    return reply(404,{error:'Not found'});
   }catch(e){return reply(e.code==='conflict'?409:400,{error:e.message});}
  }
  if(req.method==='GET'&&Object.hasOwn(deskFiles,req.url)){const [file,type]=deskFiles[req.url];try{res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(fs.readFileSync(path.join(deskRoot,file)));}catch{res.end('Ranch Desk files missing. Re-extract the complete companion.');}return;}
  if(req.method==='GET'&&Object.hasOwn(publicFiles,req.url)){
   const [file,type]=publicFiles[req.url];try{const bytes=fs.readFileSync(path.join(uiRoot,file));res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(bytes);}catch{reply(503,{error:'Companion UI missing. Re-extract the complete release.'});}return;
  }
  if(req.method==='OPTIONS')return reply(204,null);
  const provided=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+key);
  if(provided.length!==expected.length||!timingSafeEqual(provided,expected))return reply(401,{error:'Pairing key rejected'});
  for(const [id,s]of sessions)if(now()-s.lastSeen>300000){sessions.delete(id);terminals.delete(id);}
  if(req.method==='GET'&&req.url==='/state'){if(selectedId&&!sessions.has(selectedId)&&!manager?.residents().some(s=>s.id===selectedId)){selectedId='';selectionRevision++;}if(manager)manager.widgetSeen=now();return reply(200,{app:'omp-bot',version:1,capabilities:{focus:!!focusTerminal||!!manager,selection:true},selectedId,selectionRevision,selectionInstance,sleepSeconds:manager?.sleepSeconds||120,sessions:[...(manager?.residents()||[]),...[...sessions.values()].filter(s=>!managedIds.has(s.id)).map(s=>{const stale=now()-s.lastSeen>ttl;return {...s,...(s.state==='offline'?{metadata:undefined}:{}),...(stale?{state:'offline',label:'Terminal disconnected',metadata:undefined}:{}),canFocus:!!focusTerminal&&terminals.has(s.id)&&!stale&&s.state!=='offline'};})]});}
  if(req.method==='POST'&&req.url==='/selection'){
   try{const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>256)return reply(413,{error:'Request too large'});chunks.push(chunk);}const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if(!data||typeof data.id!=='string'||Object.keys(data).length!==1)return reply(400,{error:'Expected a session ID only'});
    if(!sessions.has(data.id)&&!manager?.residents().some(s=>s.id===data.id))return reply(404,{error:'Unknown resident'});
    selectedId=data.id;selectionRevision++;return reply(200,{selectedId,selectionRevision,selectionInstance});
   }catch{return reply(400,{error:'Invalid selection request'});}
  }
  if(req.method==='POST'&&req.url==='/focus'){
   try{let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>256)return reply(413,{error:'Request too large'});body+=chunk;}
    const request=JSON.parse(body);if(!request||typeof request.id!=='string'||Object.keys(request).length!==1)return reply(400,{error:'Expected a session ID only'});
    if(manager&&request.id.startsWith('ranch-'))return reply(200,{result:await manager.focusResident(request.id)});
    const session=sessions.get(request.id);if(!session)return reply(404,{error:'Unknown terminal'});
    if(now()-session.lastSeen>ttl||session.state==='offline')return reply(409,{error:'Terminal offline'});
    const terminal=terminals.get(request.id);if(!focusTerminal||!terminal)return reply(200,{result:'unavailable'});
    if(focusing||now()-lastFocus<500)return reply(429,{error:'Focus request already in progress'});
    focusing=true;lastFocus=now();try{const result=await focusTerminal(terminal);return reply(200,{result:['focused','raised','attention','closed','unavailable'].includes(result)?result:'unavailable'});}finally{focusing=false;}
   }catch{return reply(400,{error:'Invalid focus request'});}
  }
  if(req.method!=='PUT'||req.url!=='/snapshot')return reply(404,{error:'Not found'});
  try{
   const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>8192){reply(413,{error:'Snapshot too large'});return;}chunks.push(chunk);}
   const s=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!valid(s))return reply(400,{error:'Invalid snapshot'});
   const metadata=sanitizeMetadata(s.metadata);
   if(s.metadata!==undefined&&!metadata)return reply(400,{error:'Invalid metadata'});
   if(metadata)s.metadata=metadata;
   if(s.preview!==undefined&&Buffer.byteLength(JSON.stringify(s.preview),'utf8')>4000)return reply(413,{error:'Preview too large'});
   const preview=sanitizePreview(s.preview,now());
   if(s.preview!==undefined&&!preview)return reply(400,{error:'Invalid preview'});
   if(preview)s.preview=preview;
   if(s.terminal!==undefined&&(!s.terminal||!Number.isSafeInteger(s.terminal.pid)||s.terminal.pid<=0||typeof s.terminal.started!=='string'||!/^\d{15,20}$/.test(s.terminal.started)))return reply(400,{error:'Invalid terminal binding'});
   const previous=sessions.get(s.id);if(previous&&previous.sequence>=s.sequence)return reply(409,{error:'Old snapshot'});
   if(!previous&&sessions.size>=32)return reply(429,{error:'Too many terminal sessions'});
   // Explicit projection: only the bounded visible snippet is retained, never arbitrary payloads.
   const {id,sequence,project,state,label,startedAt,finishedAt,activeCount}=s;
   const prev=sessions.get(id);const idleSince=prev&&prev.state===state&&prev.startedAt===startedAt?prev.idleSince:now();
   if(manager?.observe(s))managedIds.add(id);
   if(s.terminal)terminals.set(id,{pid:s.terminal.pid,started:s.terminal.started});else terminals.delete(id);
   sessions.set(id,{id,sequence,project,state,label,startedAt,finishedAt,activeCount,idleSince,lastSeen:now(),...(metadata?{metadata}:{}),...(preview?{preview}:{})});return reply(200,{ok:true});
  }catch{if(!res.headersSent)reply(400,{error:'Invalid snapshot'});}
 });
}
