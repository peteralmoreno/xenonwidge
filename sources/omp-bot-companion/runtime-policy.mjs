import fs from 'node:fs';
import path from 'node:path';

const readTools=new Set(['read','grep','find','ls']);
const denied=reason=>({block:true,reason});
export function modelFamily(model){const provider=String(model?.provider||'').toLowerCase();if(['openai','openai-codex'].includes(provider))return 'gpt';if(provider==='anthropic')return 'claude';if(provider==='deepseek')return 'deepseek';return 'unknown';}
export function resolveTaskModel({models,current,preferredModel='auto',eligibility=[]}){
 if(!Array.isArray(models))throw Error('Authenticated model inventory is unavailable.');
 const required=Array.isArray(eligibility)?eligibility:[];
 if(!required.length&&(!preferredModel||preferredModel==='auto')){if(current&&models.some(m=>m.provider===current.provider&&m.id===current.id))return current;throw Error('The current model is not present in the authenticated model inventory.');}
 const families=required.length?[...required]:[preferredModel];const order=preferredModel&&preferredModel!=='auto'&&families.includes(preferredModel)?[preferredModel,...families.filter(f=>f!==preferredModel)]:families;
 for(const family of order){const model=models.find(candidate=>modelFamily(candidate)===family);if(model)return model;}
 throw Error('No currently available model matches the task requirements.');
}
export function resolveTaskEffort(available,requested='auto'){
 if(requested==='auto')return null;
 if(!Array.isArray(available)||!available.includes(requested))throw Error('The current model does not support the requested reasoning level.');
 return requested;
}
export function evaluateReadOnlyTool({toolName,input,cwd,workspace}){
 if(!readTools.has(toolName))return denied('Read-only policy does not allow this tool.');
 if(!input||typeof input!=='object'||typeof workspace!=='string')return denied('Read-only policy could not validate this tool call.');
 const root=path.resolve(workspace),rawPaths=[input.path,...(Array.isArray(input.paths)?input.paths:[])].filter(value=>value!==undefined);
 if(!rawPaths.length||rawPaths.some(value=>typeof value!=='string'||!value.trim()||/^[a-z][a-z0-9+.-]*:\/\//i.test(value)))return denied('Read-only tools must target files inside the task workspace.');
 try{
  const realRoot=fs.realpathSync(root);
  for(const value of rawPaths){
   const target=fs.realpathSync(path.resolve(cwd||root,value)),relative=path.relative(realRoot,target).toLowerCase();
   if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))return denied('Read-only tools may only access files inside the task workspace.');
  }
 }catch{return denied('Read-only policy could not verify that path inside the task workspace.');}
 return null;
}
