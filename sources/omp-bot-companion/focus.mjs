import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const helper=fileURLToPath(new URL('./Focus-Terminal.ps1',import.meta.url));
export function focusTerminal(terminal){
 if(process.platform!=='win32')return Promise.resolve('unavailable');
 return new Promise(resolve=>execFile('powershell.exe',['-NoProfile','-NonInteractive','-File',helper,'-TerminalPid',String(terminal.pid),'-Started',terminal.started],{windowsHide:true,timeout:6000,maxBuffer:2048},(error,stdout)=>resolve(error?'unavailable':stdout.trim())));
}
