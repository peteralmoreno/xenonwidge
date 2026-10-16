import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const skillPath=fileURLToPath(new URL('./skills/bot-ranch-pm/SKILL.md',import.meta.url));
const cliPath=fileURLToPath(new URL('./ranch-cli.mjs',import.meta.url));
export function readPmSkill(){return {name:'bot-ranch-pm',description:'Manage botRanch tickets, assignments, dependencies and work through the local companion.',path:skillPath,text:fs.readFileSync(skillPath,'utf8')};}
export function pmAgentInstructions(){return [
 'botRanch management skill: '+skillPath,
 'Local CLI module (run with Node; quote the literal path): '+cliPath,
 'For board management, read the skill and run the CLI catalog and board commands. The skill command prints the bundled skill even when the companion is offline.',
 'The companion is the authoritative writer. Use its CLI/API to create, assign and manage tasks; do not edit exported task JSON or credentials. Follow the user\'s delegated scope and the current AI Sync access mode.',
].join('\n');}
