/* Original 32-ish pixel robot, drawn on a 64 x 64 grid. */
window.RanchSprites=(()=>{
 const rect=(x,y,w,h,fill,cls='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" class="${cls}"/>`;
 const ink='#233830',cream='#fff0bf';
 const colors=[['coral','#e58d77','#f8baa0'],['cyan','#68bbc3','#b0e3d7'],['gold','#ddb55c','#ffe3a1'],['violet','#a396ca','#d0c5eb'],['rose','#e78fb3','#ffd0e4'],['orange','#e8a05b','#ffd3a1'],['lime','#a8c966','#deeda5'],['emerald','#65b58e','#b4e5c7'],['blue','#729edb','#bfd8ff'],['indigo','#8585d5','#cccaff'],['silver','#bbc5cb','#ecf2f5'],['red','#cf7070','#ffc2b8']];
 function svg(slot,state){
  const [,c,light]=colors[slot];let prop='',badge='';
  if(state==='reading')prop=rect(15,38,34,17,ink)+rect(17,40,13,12,cream)+rect(33,40,14,12,'#e6d79b')+rect(19,43,9,2,'#a99a68')+rect(35,43,9,2,'#a99a68');
  if(state==='researching')prop=`<path d="M43 27h12v3h3v12h-3v3H43v-3h-3V30h3z" fill="${ink}"/><path d="M44 31h10v10H44z" fill="#c3e4ca"/><path d="m41 43 4 4-9 9-4-4z" fill="${cream}"/>`;
  if(state==='writing')prop=rect(12,49,34,7,cream)+rect(17,51,19,2,'#a99a68')+`<path d="m34 47 11-17 5 3-11 17-6 3z" fill="#efc26c"/><path d="m33 53 1-6 5 3z" fill="${ink}"/>`;
  if(state==='running'||state==='working')prop=rect(13,39,38,17,ink)+rect(16,42,32,11,'#456255')+`<path d="m19 44 3 3-3 3m8 0h6" stroke="${cream}" stroke-width="2" fill="none"/>`;
  if(state==='thinking')badge=rect(45,15,3,3,cream)+rect(49,10,5,5,cream)+rect(55,3,7,7,cream);
  const marks={waiting:'?',done:'✓',error:'!',offline:'z'};
  if(marks[state])badge=rect(46,3,16,17,ink)+rect(48,5,12,13,state==='error'?'#f2a080':cream)+`<text x="54" y="15" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="${ink}">${marks[state]}</text>`;
  return `<svg class="sprite" viewBox="0 0 64 64" shape-rendering="crispEdges" aria-hidden="true"><g class="robot">${rect(18,56,30,3,'#38624b')}${rect(22,47,8,9,ink)}${rect(35,47,8,9,ink)}${rect(19,54,12,4,ink)}${rect(34,54,12,4,ink)}${rect(19,34,27,16,ink)}${rect(22,36,21,12,c)}${rect(27,38,11,6,ink)}${rect(30,40,5,2,cream)}<g class="arm">${rect(13,36,6,13,ink)}${rect(46,36,6,13,ink)}${rect(14,40,5,6,light)}${rect(46,40,5,6,light)}</g>${rect(30,8,4,8,ink)}${rect(28,5,8,5,cream)}${rect(16,16,33,18,ink)}${rect(19,13,27,24,ink)}${rect(19,16,27,17,c)}${rect(20,16,24,3,light)}${rect(22,21,21,10,ink)}${rect(25,24,4,state==='offline'?1:4,cream,'eye')}${rect(36,24,4,state==='offline'?1:4,cream,'eye')}${rect(12,22,4,8,ink)}${rect(49,22,4,8,ink)}<g class="prop">${prop}</g></g><g class="badge">${badge}</g><g class="hammer"><path d="M45 25h4v22h-4z" fill="#79583f"/><path d="M39 22h17v8H39z" fill="#c8cbbc" stroke="#233830" stroke-width="2"/></g><g class="celebration"><path d="M8 9h4v4H8zM14 3h3v5h-3zM51 2h4v4h-4zM57 24h4v4h-4zM5 28h3v5H5z" fill="#ffe3a1"/><path d="M3 18h4v4H3zM57 10h4v5h-4zM12 25h3v3h-3z" fill="#eab4a2"/></g><g class="nap"><text x="47" y="17" fill="#fff0bf" font-family="monospace" font-size="13">z</text><text x="56" y="9" fill="#fff0bf" font-family="monospace" font-size="9">z</text></g></svg>`;
 }
 return {colors,svg};
})();
