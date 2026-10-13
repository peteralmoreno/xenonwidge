import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

export function launchCommand(root, node = process.execPath) {
  const desktop = path.join(root, 'desktop', 'botRanch.exe');
  return process.platform === 'win32' && fs.existsSync(desktop)
    ? {command:desktop,args:[],options:{detached:true,stdio:'ignore',windowsHide:true},detached:true}
    : {command:node,args:[path.join(root,'open-setup.mjs')],options:{stdio:'inherit',windowsHide:true},detached:false};
}
export function openDesktop(root = path.dirname(fileURLToPath(import.meta.url))) {
  const launch = launchCommand(root), child = spawn(launch.command,launch.args,launch.options);
  child.on('error',error=>{console.error('Could not open botRanch: '+error.message);process.exitCode=1;});
  if(launch.detached)child.unref();
  else child.on('exit',code=>{process.exitCode=code||0;});
  return child;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)openDesktop();
