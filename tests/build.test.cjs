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
    for (const file of ['pairing-key.txt', 'admin-key.txt', 'ranch.json', '.env', 'unexpected.mjs']) fs.writeFileSync(path.join(companion, file), 'PRIVATE');
    fs.mkdirSync(path.join(companion, 'sessions'));
    fs.writeFileSync(path.join(companion, 'sessions/private.json'), 'PRIVATE');
    const output = path.join(temporary, 'output');
    stageRanch(source, output);
    for (const file of ['pairing-key.txt', 'admin-key.txt', 'ranch.json', '.env', 'unexpected.mjs', 'sessions']) assert.equal(fs.existsSync(path.join(output, file)), false, file);
    for (const file of widgetFiles.ranch) assert.deepEqual(fs.readFileSync(path.join(output, 'ui', file)), fs.readFileSync(path.join(source, projects.ranch.source, file)));
    for (const file of ['setup/index.html', 'setup/app.js', 'setup/style.css', 'Open Bot Ranch Setup.cmd', 'Terminal-Control.ps1', 'extension.mjs']) assert.ok(fs.statSync(path.join(output, file)).isFile(), file);
    const second = path.join(temporary, 'second');
    stageRanch(source, second);
    const files = fs.readdirSync(output, { recursive: true }).filter(f => fs.statSync(path.join(output, f)).isFile()).sort();
    assert.deepEqual(files, fs.readdirSync(second, { recursive: true }).filter(f => fs.statSync(path.join(second, f)).isFile()).sort());
    for (const file of files) assert.deepEqual(fs.readFileSync(path.join(output, file)), fs.readFileSync(path.join(second, file)));
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
