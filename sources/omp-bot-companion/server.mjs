import http from 'node:http';import {timingSafeEqual} from 'node:crypto';import {STATES} from './state.mjs';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {sanitizePreview} from './preview.mjs';
const directory=path.dirname(fileURLToPath(import.meta.url));
const uiRoot=fs.existsSync(path.join(directory,'ui/index.html'))?path.join(directory,'ui'):path.join(directory,'../omp-bot');
const publicFiles={'/ui/':['index.html','text/html'],'/ui/app.js':['app.js','text/javascript'],'/ui/sprites.js':['sprites.js','text/javascript'],'/ui/world.js':['world.js','text/javascript'],'/ui/widget.css':['widget.css','text/css'],'/ui/resources/icon.svg':['resources/icon.svg','image/svg+xml']};
export function createBridge({key,now=Date.now,ttl=12000,focusTerminal=null,adminKey=null,manager=null}){
 const sessions=new Map(),terminals=new Map(),managedIds=new Set();let focusing=false,lastFocus=-Infinity;
 const valid=s=>s&&s.version===1&&typeof s.id==='string'&&/^[\w:-]{1,160}$/.test(s.id)&&Number.isSafeInteger(s.sequence)&&s.sequence>0&&STATES.includes(s.state)&&typeof s.project==='string'&&s.project.length<=80&&typeof s.label==='string'&&s.label.length<=120&&[s.startedAt,s.finishedAt].every(t=>t===null||Number.isFinite(t)&&t>=0&&t<=now()+60000)&&Number.isInteger(s.activeCount)&&s.activeCount>=0&&s.activeCount<=1000;
 return http.createServer(async(req,res)=>{
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, PUT, POST, OPTIONS','Access-Control-Allow-Private-Network':'true'});res.end(JSON.stringify(body));};
  if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||''))return reply(403,{error:'Invalid host'});
  const setupFiles={'/setup/':['index.html','text/html'],'/setup/app.js':['app.js','text/javascript'],'/setup/style.css':['style.css','text/css']};
  if(req.method==='GET'&&Object.hasOwn(setupFiles,req.url)){try{const [file,type]=setupFiles[req.url];res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'"});res.end(fs.readFileSync(path.join(directory,'setup',file)));}catch{res.end('Setup files missing. Re-extract the complete companion.');}return;}
  if(req.url.startsWith('/admin/')){
   const a=Buffer.from(req.headers.authorization||''),b=Buffer.from('Bearer '+(adminKey||''));
   if(!adminKey||!manager||a.length!==b.length||!timingSafeEqual(a,b))return reply(401,{error:'Open setup using the Bot Ranch launcher.'});
   if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)return reply(403,{error:'Setup must be opened on this companion.'});
   try{
    if(req.method==='GET'&&req.url==='/admin/state')return reply(200,manager.view());
    if(req.method==='GET'&&req.url==='/admin/checks')return reply(200,{checks:await manager.checks()});
    if(req.method==='GET'&&req.url==='/admin/key')return reply(200,{key});
    if(req.method!=='POST')return reply(404,{error:'Not found'});
    let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>4096)return reply(413,{error:'Request too large'});body+=chunk;}
    const data=JSON.parse(body);if(req.url==='/admin/profile')return reply(200,manager.saveProfile(data));
    if(req.url==='/admin/settings'){manager.setSleep(data.sleepSeconds);return reply(200,{ok:true});}
    if(req.url==='/admin/action')return reply(200,await manager.action(data.id,data.action,data.confirmed===true));
    return reply(404,{error:'Not found'});
   }catch(e){return reply(e.code==='confirmation'?409:400,{error:e.message,confirmation:e.code==='confirmation'});}
  }
  if(req.method==='GET'&&Object.hasOwn(publicFiles,req.url)){
   const [file,type]=publicFiles[req.url];try{const bytes=fs.readFileSync(path.join(uiRoot,file));res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(bytes);}catch{reply(503,{error:'Companion UI missing. Re-extract the complete release.'});}return;
  }
  if(req.method==='OPTIONS')return reply(204,null);
  const provided=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+key);
  if(provided.length!==expected.length||!timingSafeEqual(provided,expected))return reply(401,{error:'Pairing key rejected'});
  for(const [id,s]of sessions)if(now()-s.lastSeen>300000){sessions.delete(id);terminals.delete(id);}
  if(req.method==='GET'&&req.url==='/state'){if(manager)manager.widgetSeen=now();return reply(200,{app:'omp-bot',version:1,capabilities:{focus:!!focusTerminal||!!manager},sleepSeconds:manager?.sleepSeconds||120,sessions:[...(manager?.residents()||[]),...[...sessions.values()].filter(s=>!managedIds.has(s.id)).map(s=>{const stale=now()-s.lastSeen>ttl;return {...s,...(stale?{state:'offline',label:'Terminal disconnected'}:{}),canFocus:!!focusTerminal&&terminals.has(s.id)&&!stale&&s.state!=='offline'};})]});}
  if(req.method==='POST'&&req.url==='/focus'){
   try{let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>256)return reply(413,{error:'Request too large'});body+=chunk;}
    const request=JSON.parse(body);if(!request||typeof request.id!=='string'||Object.keys(request).length!==1)return reply(400,{error:'Expected a session ID only'});
    if(manager&&request.id.startsWith('ranch-'))return reply(200,{result:await manager.focusResident(request.id)});
    const session=sessions.get(request.id);if(!session)return reply(404,{error:'Unknown terminal'});
    if(now()-session.lastSeen>ttl||session.state==='offline')return reply(409,{error:'Terminal offline'});
    const terminal=terminals.get(request.id);if(!focusTerminal||!terminal)return reply(200,{result:'unavailable'});
    if(focusing||now()-lastFocus<500)return reply(429,{error:'Focus request already in progress'});
    focusing=true;lastFocus=now();try{const result=await focusTerminal(terminal);return reply(200,{result:['focused','attention','closed','unavailable'].includes(result)?result:'unavailable'});}finally{focusing=false;}
   }catch{return reply(400,{error:'Invalid focus request'});}
  }
  if(req.method!=='PUT'||req.url!=='/snapshot')return reply(404,{error:'Not found'});
  try{
   const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>4096){reply(413,{error:'Snapshot too large'});return;}chunks.push(chunk);}
   const s=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!valid(s))return reply(400,{error:'Invalid snapshot'});
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
   sessions.set(id,{id,sequence,project,state,label,startedAt,finishedAt,activeCount,idleSince,lastSeen:now(),...(preview?{preview}:{})});return reply(200,{ok:true});
  }catch{if(!res.headersSent)reply(400,{error:'Invalid snapshot'});}
 });
}
