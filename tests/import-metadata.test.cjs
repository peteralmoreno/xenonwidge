const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
for(const [folder,name] of [['doodle-pad','Doodle Pad'],['audio-deck','Audio Deck'],['omp-bot','Bot Ranch'],['ranch-desk','Ranch Desk']]){
const root = path.join(__dirname, '../sources',folder);
test(name+' title resolves as an iCUE metadata expression with bundled English fallback', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const title = /<head\b[^>]*>[\s\S]*?<title>([^<]+)<\/title>/i.exec(html)?.[1];
  assert.ok(title, 'The importer needs a title in the head');
  const result = vm.runInNewContext(title, {
    tr: key => JSON.parse(fs.readFileSync(path.join(root, 'translation.json'), 'utf8')).en.translation[key]
  }, { timeout: 1000 });
  assert.equal(result, name);
});
}
