#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPmSkill } from './pm-skill.mjs';
import { validateOperateRequest } from './agent-api.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const usage = 'Usage: botRanch-cli.cmd skill|status|catalog|board|history|access [--json] | preview --file changes.json --actor label | apply --id CHANGESET_ID | operate --file action.json | release TASK_ID --revision N | start TASK_ID PROFILE_ID --revision N | context --file request.json | family --id FAMILY_ID | ring | wake';
const validKey = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

function argumentsOf(argv) {
  const [command, ...rest] = argv;
  if (!command || ['--help','-h','help'].includes(command)) return { command: 'help' };
  const positional = [], options = {};
  for (let i = 0; i < rest.length; i++) {
    const item = rest[i];
    if (item.startsWith('--')) {
      const name = item.slice(2);
      if (['json'].includes(name)) { options[name] = true; continue; }
      if (!['file','actor','id','revision'].includes(name) || i + 1 >= rest.length || rest[i + 1].startsWith('--')) throw Error(`Invalid option: ${item}`);
      if (Object.hasOwn(options, name)) throw Error(`Option repeated: ${item}`);
      options[name] = rest[++i];
    } else positional.push(item);
  }
  return { command, positional, options };
}

function privateCredentials(env = process.env) {
  const keyFile = env.OMP_BOT_KEY_FILE || path.join(env.LOCALAPPDATA || path.join(os.homedir(), '.config'), 'OmpBot', 'pairing-key.txt');
  const adminKeyFile = path.join(path.dirname(keyFile), 'admin-key.txt');
  let adminKey;
  try { adminKey = fs.readFileSync(adminKeyFile, 'utf8').trim(); }
  catch { throw Error('Bot Ranch private setup credential is missing. Open the desktop companion once, then retry.'); }
  if (!validKey(adminKey)) throw Error('Bot Ranch private setup credential is invalid. Reopen the desktop companion to repair it.');
  const port = Number(env.OMP_BOT_PORT || 43822);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Companion port is invalid.');
  return { origin: `http://127.0.0.1:${port}`, adminKey };
}

function redact(text, secrets = []) { return secrets.filter(Boolean).reduce((value, secret) => value.split(secret).join('[redacted]'), String(text)); }
function output(value, streams, secrets = []) {
  const text = redact(typeof value === 'string' ? value : JSON.stringify(value, null, 2), secrets);
  streams.stdout(text + '\n');
}
function errorOutput(message, streams, secrets = []) { streams.stderr(redact(String(message).replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').slice(0, 900), secrets) + '\n'); }

async function request(credentials, method, route, body, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(credentials.origin + route, {
      method,
      headers: { Authorization: 'Bearer ' + credentials.adminKey, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw Error('Companion is offline or did not respond. Open botRanch or use Connection & recovery, then retry.');
  }
  let result;
  try { result = await response.json(); } catch { result = { error: `Companion returned HTTP ${response.status}.` }; }
  if (!response.ok) throw Error(result?.error || `Companion returned HTTP ${response.status}.`);
  return result;
}

export async function runCli(argv = process.argv.slice(2), { env = process.env, fetchImpl = fetch, streams = { stdout: text => process.stdout.write(text), stderr: text => process.stderr.write(text) } } = {}) {
  const secrets = [];
  try {
    const parsed = argumentsOf(argv), { command, positional = [], options = {} } = parsed;
    if (command === 'help') { output(usage, streams); return 0; }
    if (command === 'skill') {
      if (positional.length || Object.keys(options).some(key => key !== 'json')) throw Error(usage);
      const skill = readPmSkill(); output(options.json ? skill : skill.text, streams); return 0;
    }
    const credentials = privateCredentials(env); secrets.push(credentials.adminKey);
    const emit = value => output(value, streams, secrets);
    if (command === 'history' || command === 'access') {
      if (positional.length || Object.keys(options).some(key => key !== 'json')) throw Error(usage);
      emit(await request(credentials, 'GET', '/admin/ai/' + command, undefined, fetchImpl)); return 0;
    }
    if(command==='family'){
      if(positional.length||!options.id||Object.keys(options).some(key=>key!=='id'))throw Error(usage);
      emit(await request(credentials,'POST','/admin/ai/family',{familyId:options.id},fetchImpl));return 0;
    }
    if(command==='context'){
      if(positional.length||!options.file||Object.keys(options).some(key=>key!=='file'))throw Error(usage);
      const body=JSON.parse(fs.readFileSync(options.file,'utf8'));
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['taskId','expectedTaskRevision','profileId'].includes(key))||typeof body.taskId!=='string'||!Number.isSafeInteger(body.expectedTaskRevision))throw Error('Context request requires taskId, expectedTaskRevision and optional profileId.');
      emit(await request(credentials,'POST','/admin/ai/context',body,fetchImpl));return 0;
    }
    if (command === 'operate') {
      if (positional.length || !options.file || Object.keys(options).some(key => key !== 'file')) throw Error(usage);
      let action;
      try { action = JSON.parse(fs.readFileSync(options.file, 'utf8')); }
      catch (error) { throw Error(`Could not read action at the supplied literal path: ${error.message}`); }
      emit(await request(credentials, 'POST', '/admin/ai/operate', validateOperateRequest(action), fetchImpl)); return 0;
    }
    if (command === 'status') {
      if (positional.length || Object.keys(options).some(key => key !== 'json')) throw Error(usage);
      emit(await request(credentials, 'GET', '/admin/health', undefined, fetchImpl)); return 0;
    }
    if (command === 'catalog') {
      if (positional.length || Object.keys(options).some(key => key !== 'json')) throw Error(usage);
      emit(await request(credentials, 'GET', '/admin/ai/catalog', undefined, fetchImpl)); return 0;
    }
    if (command === 'board') {
      if (positional.length || Object.keys(options).some(key => key !== 'json')) throw Error(usage);
      emit(await request(credentials, 'GET', '/admin/ai/snapshot', undefined, fetchImpl)); return 0;
    }
    if (command === 'preview') {
      if (positional.length || !options.file || !options.actor || Object.keys(options).some(key => !['file','actor'].includes(key))) throw Error(usage);
      let proposal;
      try { proposal = JSON.parse(fs.readFileSync(options.file, 'utf8')); }
      catch (error) { throw Error(`Could not read change set at the supplied literal path: ${error.message}`); }
      if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal) || Object.keys(proposal).some(key => !['changeSetId','expectedTaskRevision','operations'].includes(key)) || typeof proposal.changeSetId !== 'string' || !Number.isSafeInteger(proposal.expectedTaskRevision) || !Array.isArray(proposal.operations)) throw Error('Change-set file must contain changeSetId, expectedTaskRevision, and operations only.');
      emit(await request(credentials, 'POST', '/admin/ai/preview', { ...proposal, actor: options.actor }, fetchImpl)); return 0;
    }
    if (command === 'apply') {
      if (positional.length || !options.id || Object.keys(options).some(key => key !== 'id')) throw Error(usage);
      const receipt = await request(credentials, 'POST', '/admin/ai/apply', { changeSetId: options.id }, fetchImpl);
      emit(receipt); return 0;
    }
    if (command === 'release') {
      if (positional.length !== 1 || !options.revision || Object.keys(options).some(key => key !== 'revision') || !/^(0|[1-9]\d*)$/.test(options.revision)) throw Error(usage);
      emit(await request(credentials, 'POST', '/admin/ai/operate', validateOperateRequest({ action: 'release', taskId: positional[0], expectedRevision: Number(options.revision) }), fetchImpl)); return 0;
    }
    if (command === 'start') {
      if (positional.length !== 2 || !options.revision || Object.keys(options).some(key => key !== 'revision') || !/^(0|[1-9]\d*)$/.test(options.revision)) throw Error(usage);
      emit(await request(credentials, 'POST', '/admin/ai/operate', validateOperateRequest({ action: 'start', taskId: positional[0], profileId: positional[1], expectedRevision: Number(options.revision) }), fetchImpl)); return 0;
    }
    if (command === 'ring'||command==='wake') {
      if (positional.length || Object.keys(options).length) throw Error(usage);
      emit(await request(credentials, 'POST', '/admin/ai/operate', { action: command }, fetchImpl)); return 0;
    }
    throw Error(usage);
  } catch (error) { errorOutput(error?.message || 'Command failed.', streams, secrets); return 1; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await runCli();
