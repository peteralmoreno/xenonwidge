import {randomUUID} from 'node:crypto';
function classifyFailure(error){for(let current=error;current;current=current.cause){if(current.name==='AbortError'||current.name==='TimeoutError'||current.code==='ETIMEDOUT')return 'unresponsive';if(current.code==='ECONNREFUSED'||/\bECONNREFUSED\b/.test(String(current.message||'')))return 'offline';}return 'unresponsive';}
export async function probeCompanion({origin,token,version,fetchImpl=fetch,timeoutMs=1800}){
 const safeOrigin=String(origin||'').slice(0,300),base={origin:safeOrigin};
 try{const response=await fetchImpl(new URL('/admin/health',safeOrigin),{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(timeoutMs)});
  if(response.status===401||response.status===403)return {...base,status:'port-conflict',message:'A service on the expected address rejected Bot Ranch authentication.'};
  if(!response.ok)return {...base,status:'unknown-service',message:'The service on the expected address did not provide Bot Ranch health.'};
  const data=await response.json();if(data?.connectionVersion!==1||typeof data.appVersion!=='string'||typeof data.instanceId!=='string')return {...base,status:'unknown-service',message:'The service on the expected address is not a recognized Bot Ranch companion.'};
  const busy=!!data.busy,compatible=data.appVersion===version;return {...base,status:compatible?'connected':busy?'busy-upgrade':'version-mismatch',message:compatible?'Bot Ranch companion is connected.':busy?'The companion version differs and active work must finish before an update.':'The companion version differs; a safe restart is available when idle.',pid:Number.isSafeInteger(data.pid)?data.pid:undefined,instanceId:data.instanceId,appVersion:data.appVersion,homeFolder:typeof data.homeFolder==='string'?data.homeFolder.slice(0,1024):undefined,busy,lastSuccessAt:Date.now()};
 }catch(error){const status=classifyFailure(error);return {...base,status,message:status==='offline'?'No companion is listening at the expected address.':'The companion did not respond before the health check timed out.'};}
}
export function createInstanceId(){return randomUUID();}
