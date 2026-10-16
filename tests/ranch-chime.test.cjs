const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('completion chime is short, quiet PCM with faded edges',()=>{
 const b=fs.readFileSync(path.join(__dirname,'../sources/omp-bot-companion/sounds/completion.wav'));
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.equal(b.readUInt16LE(20),1);assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt16LE(34),16);
 const rate=b.readUInt32LE(24),count=b.readUInt32LE(40)/2;assert.equal(b.length,44+count*2);assert.ok(count/rate>=0.5&&count/rate<=1);
 let peak=0,energy=0;for(let i=0;i<count;i++){const n=b.readInt16LE(44+i*2)/32768;peak=Math.max(peak,Math.abs(n));energy+=n*n;}
 assert.ok(peak>0.02&&peak<=0.13);assert.ok(Math.sqrt(energy/count)<0.05);assert.equal(b.readInt16LE(44),0);assert.equal(b.readInt16LE(b.length-2),0);
});
test('Ranch terminal uses packaged chime without enabling muted bells or changing global settings',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../sources/omp-bot-companion/Start-Bot-Ranch.ps1'),'utf8');
 assert.match(source,/sounds[\\/]completion\.wav/);assert.match(source,/BellFile=/);assert.match(source,/BellFreq=0/);assert.doesNotMatch(source,/BellType=1|\.minttyrc/);
});
