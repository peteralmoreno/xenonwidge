import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {randomBytes} from 'node:crypto';
export const port=Number(process.env.OMP_BOT_PORT||43822);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid OMP_BOT_PORT');
export const keyFile=process.env.OMP_BOT_KEY_FILE||path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'.config'),'OmpBot','pairing-key.txt');
export function readKey(){const key=fs.readFileSync(keyFile,'utf8').trim();if(!/^[a-f0-9]{64}$/.test(key))throw new Error('Invalid OMP Bot pairing key');return key;}
export function ensureKey(){fs.mkdirSync(path.dirname(keyFile),{recursive:true});try{fs.writeFileSync(keyFile,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}return readKey();}
export const dataDir=path.dirname(keyFile),adminKeyFile=path.join(dataDir,'admin-key.txt');
export function ensureAdminKey(){fs.mkdirSync(dataDir,{recursive:true});try{fs.writeFileSync(adminKeyFile,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}const key=fs.readFileSync(adminKeyFile,'utf8').trim();if(!/^[a-f0-9]{64}$/.test(key))throw Error('Invalid setup credential.');return key;}
