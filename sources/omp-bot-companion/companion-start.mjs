const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export class CompanionStartupError extends Error{constructor(code,message){super(message);this.name='CompanionStartupError';this.code=code;}}
function networkCode(error){for(let e=error;e;e=e.cause){if(e.name==='AbortError'||e.name==='TimeoutError')return 'COMPANION_UNRESPONSIVE';if(e.code==='ECONNREFUSED'||/\bECONNREFUSED\b/.test(String(e.message||'')))return 'COMPANION_OFFLINE';}return 'COMPANION_UNRESPONSIVE';}
export async function ensureCompanion({origin,token,version,start}){
 const headers={Authorization:'Bearer '+token};
 async function state(){let response;try{response=await fetch(origin+'/admin/state',{headers,signal:AbortSignal.timeout(1500)});}catch(e){const code=networkCode(e);if(code==='COMPANION_OFFLINE')return null;throw new CompanionStartupError(code,'The local companion is not responding. Check its terminal before reopening botRanch.');}if(response.status===401||response.status===403)throw new CompanionStartupError('COMPANION_PORT_CONFLICT','A different or unrecognized service is using the companion port. It was left running.');if(!response.ok)throw new CompanionStartupError('COMPANION_UNKNOWN_SERVICE','The service on the companion port did not answer a Bot Ranch status request. It was left running.');return response.json();}
 let current=await state();
 if(current&&(current.connectionVersion!==1||current.appVersion!==version)){
  if(!current.restartSupported)throw Error('This older companion needs a one-time restart. Finish active work, close the old companion, then open botRanch from the Start menu.');
  const result=await fetch(origin+'/admin/shutdown',{method:'POST',headers,signal:AbortSignal.timeout(3000)});if(!result.ok){const detail=await result.json();throw new CompanionStartupError(result.status===409?'COMPANION_BUSY_UPGRADE':'COMPANION_RESTART_REJECTED',detail.error||'Finish active work before updating the companion.');}
  for(let n=0;n<50;n++){await delay(100);current=await state();if(!current)break;}if(current)throw new CompanionStartupError('COMPANION_STOPPING','The previous companion is still stopping. Open botRanch again in a moment.');
 }
 if(current)return current;
 await start();
 for(let n=0;n<100;n++){await delay(100);current=await state();if(current){if(current.connectionVersion!==1||current.appVersion!==version)throw new CompanionStartupError('COMPANION_VERSION_MISMATCH','Another companion version started first. Close it before updating.');return current;}}
 throw new CompanionStartupError('COMPANION_START_FAILED','The companion could not start. Run Launch-Companion.cmd from the installed release to see its error.');
}
