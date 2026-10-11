export const activeAttemptStates=new Set(['dispatching','awaiting-runtime','claimed','running','unresolved']);
export const hasActiveAttempt=task=>(task.attempts||[]).some(a=>activeAttemptStates.has(a.state));
export const compareQueue=(a,b)=>(a.queueOrder??a.createdAt)-(b.queueOrder??b.createdAt)||a.createdAt-b.createdAt||a.id.localeCompare(b.id);
export function dependencyReason(task,tasks){for(const id of task.dependsOn||[]){const dep=tasks.find(t=>t.id===id);if(!dep)return 'Waiting for a missing dependency.';if(dep.status!=='done')return 'Waiting for acceptance: '+dep.title;}return '';}
export function validateDependencies(id,dependencies,tasks){
 if(!Array.isArray(dependencies)||dependencies.length>100||new Set(dependencies).size!==dependencies.length||dependencies.some(dep=>typeof dep!=='string'||!tasks.some(t=>t.id===dep)))throw Error('Choose existing, unique task dependencies.');
 const visit=(current,seen)=>{if(current===id)throw Error('Task dependencies would create a cycle.');if(seen.has(current))return;seen.add(current);for(const child of tasks.find(t=>t.id===current)?.dependsOn||[])visit(child,seen);};
 for(const dep of dependencies)visit(dep,new Set());
}

export function workspaceReason(task,tasks){const owner=tasks.find(t=>t.id!==task.id&&t.projectFolder?.toLowerCase()===task.projectFolder?.toLowerCase()&&hasActiveAttempt(t));return owner?'Waiting for project access: '+owner.title:'';}
