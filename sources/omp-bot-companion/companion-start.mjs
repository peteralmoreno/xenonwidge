const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function ensureCompanion({origin,token,version,start}){
 const headers={Authorization:'Bearer '+token};
 async function state(){let response;try{response=await fetch(origin+'/admin/state',{headers,signal:AbortSignal.timeout(1500)});}catch(e){if(e.cause?.code==='ECONNREFUSED')return null;throw Error('The local companion is not responding. Check its terminal before reopening botRanch.');}if(!response.ok)throw Error('A different or unrecognized service is using the companion port. It was left running.');return response.json();}
 let current=await state();
 if(current&&(current.connectionVersion!==1||current.appVersion!==version)){
  if(!current.restartSupported)throw Error('This older companion needs a one-time restart. Finish active work, close the old companion, then open botRanch from the Start menu.');
  const result=await fetch(origin+'/admin/shutdown',{method:'POST',headers,signal:AbortSignal.timeout(3000)});if(!result.ok){const detail=await result.json();throw Error(detail.error||'Finish active work before updating the companion.');}
  for(let n=0;n<50;n++){await delay(100);current=await state();if(!current)break;}if(current)throw Error('The previous companion is still stopping. Open botRanch again in a moment.');
 }
 if(current)return current;
 await start();
 for(let n=0;n<100;n++){await delay(100);current=await state();if(current){if(current.connectionVersion!==1||current.appVersion!==version)throw Error('Another companion version started first. Close it before updating.');return current;}}
 throw Error('The companion could not start. Run Launch-Companion.cmd from the installed release to see its error.');
}
