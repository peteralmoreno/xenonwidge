// Original botRanch chime: two soft sine notes, no sampled/copyrighted audio.
// Rebuild with: node tools/generate-ranch-chime.cjs
const fs=require('node:fs'),path=require('node:path');
const rate=44100,duration=0.78,count=Math.round(rate*duration),data=Buffer.alloc(44+count*2);
data.write('RIFF',0);data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(count*2,40);
function note(t,start,freq){const age=t-start,length=0.55;if(age<=0||age>=length)return 0;const attack=Math.min(1,age/0.035),release=Math.min(1,(length-age)/0.13),envelope=attack*attack*(3-2*attack)*release*release*Math.exp(-age*5);return envelope*(Math.sin(2*Math.PI*freq*age)+0.08*Math.sin(4*Math.PI*freq*age));}
for(let i=0;i<count;i++){const t=i/rate;const sample=0.065*(note(t,0,523.251)+note(t,0.19,659.255));data.writeInt16LE(Math.round(sample*32767),44+i*2);}
const file=path.join(__dirname,'../sources/omp-bot-companion/sounds/completion.wav');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);
