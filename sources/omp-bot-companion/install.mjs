import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';import {fileURLToPath,pathToFileURL} from 'node:url';
export function installRelease(source,destination){
 const release=JSON.parse(fs.readFileSync(path.join(source,'release.json'),'utf8'));
 if(!/^\d+\.\d+\.\d+$/.test(release.version)||!Array.isArray(release.files)||!release.files.includes('open-setup.mjs'))throw Error('Invalid botRanch release.');
 for(const file of release.files){if(typeof file!=='string'||!file||path.isAbsolute(file)||file.split(/[\\/]/).some(p=>p==='..'||p==='.')||file.includes(':'))throw Error('Invalid release path.');const absolute=path.resolve(source,file),real=fs.realpathSync(absolute),relative=path.relative(fs.realpathSync(source),real);if(relative.startsWith('..')||path.isAbsolute(relative)||!fs.statSync(real).isFile())throw Error('Release path must be a file inside the package.');}
 const versionRoot=path.join(destination,'versions');fs.mkdirSync(versionRoot,{recursive:true});const installed=path.join(versionRoot,release.version);
 if(!fs.existsSync(installed)){const staging=fs.mkdtempSync(path.join(versionRoot,'.install-'));for(const file of release.files){const target=path.join(staging,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(source,file),target);}fs.copyFileSync(path.join(source,'release.json'),path.join(staging,'release.json'));fs.renameSync(staging,installed);}
 fs.writeFileSync(path.join(destination,'launcher.mjs'),`import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),{version}=JSON.parse(fs.readFileSync(path.join(root,'current.json'),'utf8'));
if(!/^\\d+\\.\\d+\\.\\d+$/.test(version))throw Error('Invalid installed version');
const release=path.join(root,'versions',version),desktop=path.join(release,'open-desktop.mjs');
if(fs.existsSync(desktop)){const {openDesktop}=await import(pathToFileURL(desktop).href);openDesktop(release);}
else{const child=spawn(process.execPath,[path.join(release,'open-setup.mjs')],{stdio:'inherit',windowsHide:true});child.on('exit',code=>process.exitCode=code||0);child.on('error',error=>{console.error(error.message);process.exitCode=1;});}
`);
 fs.writeFileSync(path.join(destination,'Open botRanch.cmd'),'@echo off\r\nnode "%~dp0launcher.mjs"\r\nif errorlevel 1 pause\r\n');
 fs.writeFileSync(path.join(destination,'launcher-cli.mjs'),`import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),{version}=JSON.parse(fs.readFileSync(path.join(root,'current.json'),'utf8'));
if(!/^\\d+\\.\\d+\\.\\d+$/.test(version))throw Error('Invalid installed version');
const cli=path.join(root,'versions',version,'ranch-cli.mjs');if(!fs.existsSync(cli)){console.error('AI Sync CLI is unavailable in the installed release.');process.exitCode=1;}else{const result=spawnSync(process.execPath,[cli,...process.argv.slice(2)],{stdio:'inherit',windowsHide:true});if(result.error){console.error(result.error.message);process.exitCode=1;}else process.exitCode=result.status??1;}
`);
 fs.writeFileSync(path.join(destination,'botRanch-cli.cmd'),'@echo off\r\nnode "%~dp0launcher-cli.mjs" %*\r\n');
 fs.writeFileSync(path.join(destination,'current.json.tmp'),JSON.stringify({version:release.version}));fs.renameSync(path.join(destination,'current.json.tmp'),path.join(destination,'current.json'));
 return {directory:destination,launcher:path.join(destination,'Open botRanch.cmd'),icon:path.join(installed,'desktop/resources/app/icon.ico'),version:release.version};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{const source=path.dirname(fileURLToPath(import.meta.url)),destination=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local'),'Programs','botRanch'),result=installRelease(source,destination);const shortcut=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-File',path.join(source,'Install-Shortcut.ps1'),'-Target',result.launcher,'-IconPath',result.icon],{windowsHide:true,stdio:'inherit'});if(shortcut.error||shortcut.status!==0)console.error('Installed; shortcut could not be created. Use '+result.launcher);console.log('botRanch '+result.version+' installed at '+result.directory+'\nIf botRanch is already open, choose Quit desktop app from its tray menu first.\nThen open botRanch from the Start menu to use this version.\nInstalling does not replace a running dock. Quitting the dock leaves bot work running.');}catch(error){console.error(error.message);process.exitCode=1;}}
