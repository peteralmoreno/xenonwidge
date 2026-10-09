// Release inputs are explicit: runtime data and incidental local files cannot enter a release.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const projects = {
  doodle: { source: 'doodle-pad', name: 'doodle-pad' },
  audio: { source: 'audio-deck', name: 'audio-deck' },
  ranch: { source: 'omp-bot', name: 'bot-ranch' },
  desk: { source: 'ranch-desk', name: 'ranch-desk' },
};
const common = ['manifest.json', 'translation.json', 'index.html', 'resources/icon.svg'];
const widgetFiles = {
  doodle: [...common, 'styles/widget.css', ...['app', 'core', 'drawing', 'host', 'picker'].map(n => `scripts/${n}.js`)],
  audio: [...common, 'app.js', 'widget.css'],
  ranch: [...common, 'app.js', 'sprites.js', 'world.js', 'appearance.js', 'widget.css'],
  desk: [...common, 'app.js', 'appearance.js', 'widget.css'],
};
const ranchFiles = [
  'README.md', 'bridge.mjs', 'config.mjs', 'extension.mjs', 'focus.mjs', 'manager.mjs',
  'metadata.mjs', 'native.mjs', 'open-setup.mjs', 'preview.mjs', 'server.mjs', 'state.mjs',
  'Focus-Terminal.ps1', 'Terminal-Control.ps1', 'Start-Bot-Ranch.ps1',
  'Launch-Companion.cmd', 'Open Bot Ranch Setup.cmd', 'Start-Bot-Ranch.cmd', 'Start-OMP.cmd',
  'launch-companion.sh', 'open-setup.sh', 'ranch-terminal.sh', 'start-bot-ranch.sh', 'start-omp.sh',
  'setup/index.html', 'setup/app.js', 'setup/style.css',
];
function copyFiles(source, destination, files) {
  for (const file of files) {
    const input = path.join(source, file);
    if (!fs.lstatSync(input).isFile()) throw new Error(`Release input must be a regular file: ${input}`);
    const output = path.join(destination, file);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(input, output);
  }
}
function stageRanch(sources, destination) {
  copyFiles(path.join(sources, 'omp-bot-companion'), destination, ranchFiles);
  copyFiles(path.join(sources, 'omp-bot'), path.join(destination, 'ui'), widgetFiles.ranch);
  copyFiles(path.join(sources, 'ranch-desk'), path.join(destination, 'desk'), widgetFiles.desk);
}
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
}
function archive(directory, destination) {
  run('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'zip-release.ps1'), '-Source', directory, '-Destination', destination]);
}
function build(target = 'all', mode = 'build') {
  if (process.platform !== 'win32') throw new Error('Release builds require Windows (PowerShell and the Windows .NET target).');
  const selected = target === 'all' ? Object.keys(projects) : target === 'ranch' && mode === 'build' ? ['ranch', 'desk'] : [target];
  if (selected.some(key => !projects[key]) || !['build', 'widget', 'companion', 'validate'].includes(mode)) throw new Error('Usage: node tools/build.cjs [all|doodle|audio|ranch|desk] [build|widget|companion|validate]');
  const sources = path.join(root, 'sources');
  const generated = path.join(root, 'artifacts');
  fs.mkdirSync(generated, { recursive: true });
  const staging = fs.mkdtempSync(path.join(generated, '.build-'));
  const cli = path.join(root, 'node_modules/icuewidget-cli/node-bin/icuewidget.js');
  try {
    for (const key of selected) {
      const project = projects[key];
      const version = JSON.parse(fs.readFileSync(path.join(sources, project.source, 'manifest.json'), 'utf8')).version;
      if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) throw new Error(`Invalid release version: ${version}`);
      const release = path.join(generated, 'releases', project.name);
      fs.mkdirSync(release, { recursive: true });
      if (mode !== 'companion') {
        const widget = path.join(staging, project.name);
        copyFiles(path.join(sources, project.source), widget, widgetFiles[key]);
        run(process.execPath, [cli, 'validate', widget]);
        if (mode !== 'validate') {
          const filename = `${project.name}-${version}.icuewidget`;
          run(process.execPath, [cli, 'package', widget, '--output', path.join(staging, filename)]);
          fs.copyFileSync(path.join(staging, filename), path.join(release, filename));
        }
      }
      if ((mode === 'build' || mode === 'companion') && ['audio', 'ranch'].includes(key)) {
        const name = `${project.name}-companion-${version}`;
        const companion = path.join(staging, name);
        if (key === 'ranch') stageRanch(sources, companion);
        else {
          const audioSource = path.join(staging, 'audio-source');
          copyFiles(path.join(sources, 'audio-deck-companion'), audioSource, [
            'AudioDeck.Companion.csproj', 'packages.lock.json', 'BoundedWork.cs', 'Models.cs',
            'Program.cs', 'WindowsAudio.cs', 'WindowsMedia.cs', 'NAudio-LICENSE.txt', 'Launch.cmd', 'launch.sh',
          ]);
          const csproj = path.join(audioSource, 'AudioDeck.Companion.csproj');
          run('dotnet', ['restore', csproj, '--locked-mode', '-r', 'win-x64']);
          run('dotnet', ['publish', csproj, '--no-restore', '-c', 'Release', '-r', 'win-x64', '--self-contained', 'true', '-p:Version=' + version, '-o', companion]);
          copyFiles(path.join(sources, 'audio-deck-companion'), companion, ['README.md']);
        }
        archive(companion, path.join(staging, name + '.zip'));
        fs.copyFileSync(path.join(staging, name + '.zip'), path.join(release, name + '.zip'));
      }
      console.log(`${project.name} ${version}: ${release}`);
    }
  } finally {
    // Only remove the unique staging directory created by this invocation.
    if (path.dirname(staging) !== generated || !path.basename(staging).startsWith('.build-')) throw new Error('Invalid cleanup path');
    fs.rmSync(staging, { recursive: true, force: true });
  }
}
module.exports = { build, stageRanch, widgetFiles, projects };
if (require.main === module) {
  try { build(process.argv[2], process.argv[3]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
