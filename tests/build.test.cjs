const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { stageRanch, widgetFiles, projects } = require('../tools/build.cjs');

test('release staging includes complete source UI and excludes private or generated files', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'widget-build-test-'));
  try {
    const source = path.join(temporary, 'source');
    fs.cpSync(path.join(__dirname, '../sources'), source, { recursive: true, filter: p => !/[\\/](bin|obj)([\\/]|$)/.test(p) });
    const companion = path.join(source, 'omp-bot-companion');
    for (const file of ['pairing-key.txt', 'admin-key.txt', 'ranch.json', 'ranch-updates.json', '.env', 'unexpected.mjs']) fs.writeFileSync(path.join(companion, file), 'PRIVATE');
    fs.mkdirSync(path.join(companion, 'sessions'));
    fs.writeFileSync(path.join(companion, 'sessions/private.json'), 'PRIVATE');
    const output = path.join(temporary, 'output');
    stageRanch(source, output);
    assert.equal(require('node:child_process').spawnSync(path.join(output,'bin/Terminal-Control.exe'),['probe'],{encoding:'utf8',windowsHide:true}).stdout.trim(),'ready:1');
    assert.ok(JSON.parse(fs.readFileSync(path.join(output,'release.json'))).files.includes('bin/Terminal-Control.exe'));
    for (const file of ['pairing-key.txt', 'admin-key.txt', 'ranch.json', 'ranch-updates.json', '.env', 'unexpected.mjs', 'sessions']) assert.equal(fs.existsSync(path.join(output, file)), false, file);
    for (const file of ['pipeline.mjs','pipeline-manager.mjs','updates.mjs']) assert.ok(fs.statSync(path.join(output,file)).isFile(),file);
    for (const file of ['guides/bot-ranch-loop.md','guides/bot-ranch-pipeline.md']) assert.ok(fs.statSync(path.join(output,file)).isFile(),file);
    assert.ok(fs.readFileSync(path.join(output,'README.md'),'utf8').includes('(guides/bot-ranch-loop.md)'));
    for (const file of widgetFiles.ranch) assert.deepEqual(fs.readFileSync(path.join(output, 'ui', file)), fs.readFileSync(path.join(source, projects.ranch.source, file)));
    for (const file of ['desk/index.html', 'desk/app.js', 'desk/widget.css', 'desk/resources/icon.svg', 'setup/index.html', 'setup/app.js', 'setup/style.css', 'setup/settings.css', 'release.json', 'install.mjs', 'companion-start.mjs', 'Install-Shortcut.ps1', 'Install botRanch.cmd', 'Open botRanch.cmd', 'Open Bot Ranch Setup.cmd', 'Terminal-Control.ps1', 'extension.mjs', 'runtime-policy.mjs', 'bot-library.mjs', 'queue-policy.mjs', 'work-check.mjs', 'terminal-runner.mjs', 'setup/board.html', 'setup/board.js', 'setup/board.css']) assert.ok(fs.statSync(path.join(output, file)).isFile(), file);
    const second = path.join(temporary, 'second');
    stageRanch(source, second);
    const files = fs.readdirSync(output, { recursive: true }).filter(f => fs.statSync(path.join(output, f)).isFile()).sort();
    assert.deepEqual(files, fs.readdirSync(second, { recursive: true }).filter(f => fs.statSync(path.join(second, f)).isFile()).sort());
    // Framework csc embeds compilation timestamps/MVIDs; compare executable readiness.
    for (const file of files.filter(f=>!f.endsWith('.exe'))) assert.deepEqual(fs.readFileSync(path.join(output, file)), fs.readFileSync(path.join(second, file)));
    assert.equal(require('node:child_process').spawnSync(path.join(second,'bin/Terminal-Control.exe'),['probe'],{encoding:'utf8',windowsHide:true}).stdout.trim(),'ready:1');
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
