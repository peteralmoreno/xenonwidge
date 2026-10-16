// Compile reviewed source with the Windows .NET Framework compiler, without downloads.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
function compile(source,output,references=[]) {
  const windows=process.env.WINDIR||'C:\\Windows';
  const compiler=['Framework64','Framework'].map(dir=>path.join(windows,'Microsoft.NET',dir,'v4.0.30319/csc.exe')).find(file=>fs.existsSync(file));
  if(!compiler)throw Error('Windows .NET Framework C# compiler is required to build native helpers.');
  fs.mkdirSync(path.dirname(output),{recursive:true});
  const result=spawnSync(compiler,['/nologo','/target:exe','/optimize+','/platform:anycpu','/out:'+output,...references.map(r=>'/reference:'+r),source],{encoding:'utf8',windowsHide:true});
  if(result.error||result.status!==0)throw Error('Native helper compilation failed: '+(result.error?.message||result.stdout||result.stderr));
  return output;
}
function buildNative(source,destination=source) {
  compile(path.join(source,'native/Terminal-Control.cs'),path.join(destination,'bin/Terminal-Control.exe'));
  return ['bin/Terminal-Control.exe'];
}
function buildZip(output) {return compile(path.join(__dirname,'native/ZipRelease.cs'),output,['System.IO.Compression.dll','System.IO.Compression.FileSystem.dll']);}
module.exports={compile,buildNative,buildZip};
if(require.main===module){try{const source=path.resolve(__dirname,'../sources/omp-bot-companion');buildNative(source,process.argv[2]?path.resolve(process.argv[2]):source);console.log('Native terminal helper built.');}catch(error){console.error(error.message);process.exitCode=1;}}
