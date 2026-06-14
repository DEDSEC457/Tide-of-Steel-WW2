// Europe hex map + nation ownership from REAL Natural Earth data (world-atlas 50m).
// Emits ww_data.js (embeddable map data) and two preview PNGs (terrain + political).
const fs=require('fs');
const {createCanvas}=require('@napi-rs/canvas');
const topojson=require('topojson-client');

// Land detection AND nation assignment both come from the country polygons
// (countries-50m). We do NOT use the world land-50m polygon: it spans the whole
// globe (lon -180..180) and, like Russia's antimeridian-crossing ring, breaks
// horizontal point-in-polygon at high latitude — that produced phantom "Soviet"
// land bands across the Arctic Ocean. Fix: unwrap antimeridian vertices and drop
// any polygon still spanning >180° of longitude (the world blob / far-side bits).

// ---- country polygons (borders) ----
const cTopo=require('world-atlas/countries-50m.json');
const cGeo=topojson.feature(cTopo, cTopo.objects.countries);
const cFeats=cGeo.type==='FeatureCollection'?cGeo.features:[cGeo];

// modern country name -> WW2 nation key (merges & colonial mapping)
const NAT_OF={
  'Germany':'GER','Austria':'GER','Czechia':'GER',
  'Italy':'ITA','Libya':'ITA',
  'Russia':'SOV','Belarus':'SOV','Ukraine':'SOV','Moldova':'SOV',
  'France':'FRA','Morocco':'FRA','Algeria':'FRA','Tunisia':'FRA','Syria':'FRA','Lebanon':'FRA',
  'United Kingdom':'ENG','Egypt':'ENG','Iraq':'ENG',
  'Poland':'POL','Spain':'SPA','Portugal':'POR','Netherlands':'HOL','Belgium':'BEL',
  'Switzerland':'SWI','Denmark':'DEN','Norway':'NOR','Sweden':'SWE','Finland':'FIN',
  'Hungary':'HUN','Romania':'ROM','Bulgaria':'BUL','Greece':'GRE','Turkey':'TUR',
  'Albania':'ALB','Ireland':'IRE','Estonia':'EST','Latvia':'LAT','Lithuania':'LIT','Slovakia':'SLO',
  'Serbia':'YUG','Croatia':'YUG','Bosnia and Herz.':'YUG','Slovenia':'YUG','Montenegro':'YUG','Macedonia':'YUG',
};
// nation roster: key -> [name, color, faction, capital]
const NATIONS={
  GER:['Germany','#7a7a6a','axis','Berlin'],
  ITA:['Italy','#3f8a6f','axis','Rome'],
  SOV:['Soviet Union','#c0392b','comintern','Moscow'],
  FRA:['France','#3f6fb0','allies','Paris'],
  ENG:['United Kingdom','#b6985a','allies','London'],
  POL:['Poland','#c9b13a','allies','Warsaw'],
  SPA:['Spain','#cf7a36','neutral','Madrid'],
  POR:['Portugal','#3f9a6a','neutral','Lisbon'],
  HOL:['Netherlands','#e08a2a','neutral','Amsterdam'],
  BEL:['Belgium','#9a8a3a','neutral','Brussels'],
  SWI:['Switzerland','#b04a4a','neutral','Bern'],
  DEN:['Denmark','#cf5a6a','neutral','Copenhagen'],
  NOR:['Norway','#6f8ac0','neutral','Oslo'],
  SWE:['Sweden','#4f6ab0','neutral','Stockholm'],
  FIN:['Finland','#7ab0d0','neutral','Helsinki'],
  HUN:['Hungary','#4f9a9a','axis','Budapest'],
  ROM:['Romania','#bba84a','axis','Bucharest'],
  BUL:['Bulgaria','#9a7a4a','axis','Sofia'],
  YUG:['Yugoslavia','#7a5a9a','neutral','Belgrade'],
  GRE:['Greece','#4fa0c0','neutral','Athens'],
  TUR:['Turkey','#cf5a4a','neutral','Ankara'],
  ALB:['Albania','#9a3030','axis','Tirana'],
  IRE:['Ireland','#4f9a5a','neutral','Dublin'],
  EST:['Estonia','#7ab0a0','neutral','Tallinn'],
  LAT:['Latvia','#8a5a5a','neutral','Riga'],
  LIT:['Lithuania','#b0a050','neutral','Kaunas'],
  SLO:['Slovakia','#8a8a4a','axis','Bratislava'],
};
// ALL country polygons near our theatre (full set so non-European land is still
// land), unwrapped at the antimeridian and span-filtered. nat=null for countries
// outside our WW2 roster (their hexes become '???' and get BFS-filled later).
const UW = lo => lo < -90 ? lo+360 : lo;   // unwrap antimeridian (Chukotka, etc.)
const countryPolys=[]; // {nat|null, rings, bbox:[w,s,e,n]}
for(const f of cFeats){ const nm=f.properties&&f.properties.name; const g=f.geometry; if(!g) continue;
  const nat=NAT_OF[nm]||null;
  const mps = g.type==='Polygon'?[g.coordinates] : g.type==='MultiPolygon'?g.coordinates : [];
  for(const poly of mps){ const rings=poly.map(r=>r.map(([lo,la])=>[UW(lo),la]));
    let w=999,s=90,e=-999,n=-90;
    for(const ring of rings) for(const [lo,la] of ring){ if(lo<w)w=lo; if(lo>e)e=lo; if(la<s)s=la; if(la>n)n=la; }
    if((e-w)>180) continue;                          // drop world-blob / fragmented far-side polygons
    if(e< -40 || w>95 || n<25 || s>82) continue;     // keep only the European/Mediterranean theatre
    countryPolys.push({nat, rings, bbox:[w,s,e,n]}); } }
console.error('country polygons (theatre set):', countryPolys.length);

// ---- map window (WW2 European theatre), Mercator latitude ----
const LON_W=-12, LON_E=58, LAT_N=71, LAT_S=32;
const W=110, H=120;
const mercY=d=>Math.log(Math.tan(Math.PI/4 + d*Math.PI/360));
const YN=mercY(LAT_N), YS=mercY(LAT_S);

function inRing(lon,lat,r){ let c=false;
  for(let i=0,j=r.length-1;i<r.length;j=i++){ const xi=r[i][0],yi=r[i][1],xj=r[j][0],yj=r[j][1];
    if(((yi>lat)!==(yj>lat)) && (lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)) c=!c; } return c; }
// returns the matching country polygon (or null = open sea)
function countryAt(lon,lat){
  for(const cp of countryPolys){ const b=cp.bbox;
    if(lon<b[0]||lon>b[2]||lat<b[1]||lat>b[3]) continue;
    if(inRing(lon,lat,cp.rings[0])){ let hole=false;
      for(let k=1;k<cp.rings.length;k++) if(inRing(lon,lat,cp.rings[k])){hole=true;break;}
      if(!hole) return cp; } }
  return null;
}
function isLand(lon,lat){ return countryAt(lon,lat)!==null; }
function natAt(lon,lat){ const cp=countryAt(lon,lat); return cp ? cp.nat : null; }
function cellLonLat(x,y){
  const lon=LON_W + (x+0.5)/W*(LON_E-LON_W);
  const m=YN + (y+0.5)/H*(YS-YN);
  const lat=(2*Math.atan(Math.exp(m)) - Math.PI/2)*180/Math.PI;   // inverse Mercator
  return [lon,lat];
}

// ---- terrain overlay: real mountain ranges & forest belts by lon/lat box ----
function inBox(lon,lat,b){ return lon>=b[0]&&lon<=b[1]&&lat>=b[2]&&lat<=b[3]; }
const MTN=[
  [4,15,43.5,47.5],[-2,3,42,43.6],[13,27,44.5,49],[38,49,40.5,44],
  [5,16,60,69.8],[10,16,39.5,44.5],[15,24,41.5,46],[-7,-1,37,43],
  [54,60,49,68],[27,45,38,41.5],
];
const FOR=[
  [10,40,50,57],[27,52,55,63],[20,32,60,68.5],[12,20,47,50.5],
];
function vnoise(x,y){
  const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy;
  const h=(a,b)=>{ let n=(a*374761393 + b*668265263)>>>0; n=Math.imul(n^(n>>>13),1274126177)>>>0; return ((n^(n>>>16))>>>0)/4294967296; };
  const a=h(ix,iy),b=h(ix+1,iy),c=h(ix,iy+1),d=h(ix+1,iy+1);
  const sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy);
  return a*(1-sx)*(1-sy)+b*sx*(1-sy)+c*(1-sx)*sy+d*sx*sy;
}
function terr(lon,lat,x,y){
  const jlon=lon + (vnoise(x*0.28,y*0.28)-0.5)*5.5;
  const jlat=lat + (vnoise(x*0.28+50,y*0.28+50)-0.5)*3.5;
  for(const b of MTN) if(inBox(jlon,jlat,b)) return 'h';
  for(const b of FOR) if(inBox(jlon,jlat,b)) return 'f';
  return '.';
}

// ---- build terrain + raw nation grids ----
const tgrid=[], ngrid=[];
for(let y=0;y<H;y++){ let trow='', nrow='';
  for(let x=0;x<W;x++){ const [lon,lat]=cellLonLat(x,y); const cp=countryAt(lon,lat);
    if(cp){ trow+=terr(lon,lat,x,y); nrow+= cp.nat?cp.nat:'???'; }
    else { trow+='~'; nrow+='~~~'; } }
  tgrid.push(trow); ngrid.push(nrow); }
// nation grid uses 3-char codes; store as array-of-arrays for the fill pass
const ncell=[]; for(let y=0;y<H;y++){ ncell.push(ngrid[y].match(/.../g)); }

// ---- fill '?' land (coastline mismatch / unmapped) by nearest mapped neighbour (BFS) ----
function nb(x,y){ const odd=y&1; const d= odd
  ? [[1,0],[-1,0],[0,-1],[1,-1],[0,1],[1,1]]
  : [[1,0],[-1,0],[-1,-1],[0,-1],[-1,1],[0,1]];
  return d.map(([dx,dy])=>[x+dx,y+dy]).filter(([nx,ny])=>nx>=0&&nx<W&&ny>=0&&ny<H); }
function fillUnknown(){ let changed=true, guard=0;
  while(changed && guard++<60){ changed=false; const snap=ncell.map(r=>r.slice());
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){ if(snap[y][x]!=='???') continue;
      const counts={};
      for(const [nx,ny] of nb(x,y)){ const v=snap[ny][nx]; if(v&&v!=='???'&&v!=='~~~'){ counts[v]=(counts[v]||0)+1; } }
      let best=null,bc=0; for(const k in counts) if(counts[k]>bc){bc=counts[k];best=k;}
      if(best){ ncell[y][x]=best; changed=true; } } }
  // any still-unknown land -> neutral 'XXX'
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(ncell[y][x]==='???') ncell[y][x]='XXX';
}
fillUnknown();
NATIONS.XXX=['Neutral','#5b5b5b','neutral',''];

// ---- assign nation chars for compact owner grid ----
const POOL='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
const usedKeys=Array.from(new Set([].concat(...ncell).filter(k=>k!=='~~~')));
// stable order: roster order then any extras
const order=Object.keys(NATIONS).filter(k=>usedKeys.includes(k));
const charOf={}; order.forEach((k,i)=>charOf[k]=POOL[i]);
const owner=[]; for(let y=0;y<H;y++){ let row='';
  for(let x=0;x<W;x++){ const k=ncell[y][x]; row += (k==='~~~'?'.':charOf[k]); } owner.push(row); }

// ---- cities (true coords -> nearest land hex) ----
const CITIES=[['London',-0.1,51.5,1],['Paris',2.3,48.9,1],['Berlin',13.4,52.5,1],['Rome',12.5,41.9,1],
 ['Madrid',-3.7,40.4,1],['Moscow',37.6,55.8,1],['Leningrad',30.3,59.9,0],['Stalingrad',44.5,48.7,0],
 ['Warsaw',21,52.2,1],['Vienna',16.4,48.2,0],['Kiev',30.5,50.5,0],['Stockholm',18,59.3,1],
 ['Oslo',10.7,59.9,1],['Belgrade',20.5,44.8,1],['Bucharest',26.1,44.4,1],['Amsterdam',4.9,52.4,1],
 ['Helsinki',25,60.2,1],['Lisbon',-9.1,38.7,1],['Ankara',32.9,39.9,1],['Athens',23.7,38,1],
 ['Budapest',19,47.5,1],['Sofia',23.3,42.7,1],['Brussels',4.4,50.8,1],['Copenhagen',12.6,55.7,1],
 ['Bern',7.4,46.9,1],['Dublin',-6.3,53.3,1],['Tirana',19.8,41.3,1],['Bratislava',17.1,48.1,1],
 ['Tallinn',24.8,59.4,1],['Riga',24.1,56.9,1],['Kaunas',23.9,54.9,1],
 ['Hamburg',10,53.5,0],['Munich',11.6,48.1,0],['Milan',9.2,45.5,0],['Naples',14.3,40.8,0],
 ['Barcelona',2.2,41.4,0],['Marseille',5.4,43.3,0],['Lyon',4.8,45.8,0],['Cologne',6.9,50.9,0],
 ['Minsk',27.6,53.9,0],['Kharkov',36.2,50,0],['Odessa',30.7,46.5,0],['Rostov',39.7,47.2,0],
 ['Sevastopol',33.5,44.6,0],['Smolensk',32,54.8,0],['Gorky',44,56.3,0],['Manchester',-2.2,53.5,0],
 ['Birmingham',-1.9,52.5,0],['Glasgow',-4.3,55.9,0],['Venice',12.3,45.4,0],['Turin',7.7,45.1,0],
 ['Prague',14.4,50.1,0],['Krakow',19.9,50.1,0],['Lwow',24,49.8,0],['Konigsberg',20.5,54.7,0],
 ['Stuttgart',9.2,48.8,0],['Frankfurt',8.7,50.1,0],['Bordeaux',-0.6,44.8,0],['Nantes',-1.5,47.2,0],
 ['Seville',-6,37.4,0],['Bilbao',-2.9,43.3,0],['Porto',-8.6,41.1,0],['Gothenburg',12,57.7,0],
 ['Bergen',5.3,60.4,0],['Trondheim',10.4,63.4,0],['Salonika',23,40.6,0],['Izmir',27.1,38.4,0],
 ['Istanbul',29,41,0],['Voronezh',39.2,51.7,0],['Tula',37.6,54.2,0],['Riga2',24.1,56.9,0]];
function snapHex(lon,lat){ const gx=(lon-LON_W)/(LON_E-LON_W)*W, gy=(mercY(lat)-YN)/(YS-YN)*H;
  let bx=Math.round(gx-0.5), by=Math.round(gy-0.5); bx=Math.max(0,Math.min(W-1,bx)); by=Math.max(0,Math.min(H-1,by));
  if(tgrid[by][bx]!=='~') return [bx,by];
  for(let r=1;r<=3;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){ const nx=bx+dx,ny=by+dy;
    if(nx>=0&&nx<W&&ny>=0&&ny<H&&tgrid[ny][nx]!=='~') return [nx,ny]; }
  return [bx,by]; }
const cityOut=[]; const seen={};
for(const [name,lon,lat,cap] of CITIES){ const [hx,hy]=snapHex(lon,lat);
  const key=hx+','+hy; if(seen[key]) continue; seen[key]=1;
  const ch=owner[hy][hx]; const natKey=Object.keys(charOf).find(k=>charOf[k]===ch)||'XXX';
  cityOut.push({name:name.replace(/2$/,''),x:hx,y:hy,cap,nat:natKey}); }

// ---- emit ww_data.js ----
const natList=order.map(k=>({c:charOf[k],key:k,name:NATIONS[k][0],col:NATIONS[k][1],fac:NATIONS[k][2],cap:NATIONS[k][3]}));
const out='/* AUTO-GENERATED by eumap_gen.js — Europe 1939 map: terrain, nation ownership, cities. */\n'+
  'const WW_DATA = {\n'+
  '  cols:'+W+', rows:'+H+',\n'+
  '  terr:'+JSON.stringify(tgrid)+',\n'+
  '  owner:'+JSON.stringify(owner)+',\n'+
  '  nations:'+JSON.stringify(natList)+',\n'+
  '  cities:'+JSON.stringify(cityOut)+'\n};\n'+
  'if(typeof module!=="undefined") module.exports=WW_DATA;\n';
fs.writeFileSync('/home/user/Hearts-of-Iron-5/ww_data.js', out);

// ---- political preview render ----
const S=9, HX=Math.sqrt(3)*S, VY=1.5*S, M=18;
const cw=Math.ceil(HX*(W+0.5)+M*2), ch=Math.ceil(VY*(H-1)+2*S+M*2);
const cv=createCanvas(cw,ch); const c=cv.getContext('2d');
c.fillStyle='#0a0c10'; c.fillRect(0,0,cw,ch);
function hexp(cx,cy,s){ c.beginPath(); for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30); const px=cx+s*Math.cos(a),py=cy+s*Math.sin(a); i?c.lineTo(px,py):c.moveTo(px,py);} c.closePath(); }
const SEA='#1b2b3a';
const colByChar={}; for(const n of natList) colByChar[n.c]=n.col;
function hexCenter(x,y){ return [M+HX*(x+0.5*(y&1))+HX/2, M+VY*y+S]; }
for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const t=tgrid[y][x]; const o=owner[y][x];
  const [cx,cy]=hexCenter(x,y); hexp(cx,cy,S-0.3);
  if(t==='~'){ c.fillStyle=SEA; } else { c.fillStyle=colByChar[o]||'#5b5b5b'; }
  c.fill();
  // terrain shading on land
  if(t==='h'){ c.fillStyle='rgba(0,0,0,0.18)'; c.fill(); }
  else if(t==='f'){ c.fillStyle='rgba(0,0,0,0.10)'; c.fill(); }
  const hv=(x*2654435761 ^ y*40503)>>>0;
  c.fillStyle=(hv&1)?'rgba(255,255,255,0.03)':'rgba(0,0,0,'+(0.02+(hv%4)*0.012)+')'; c.fill();
}
// national borders: stroke edges where neighbour owner differs
c.lineWidth=1.1; c.strokeStyle='rgba(0,0,0,0.55)';
for(let y=0;y<H;y++) for(let x=0;x<W;x++){ if(owner[y][x]==='.') continue;
  const [cx,cy]=hexCenter(x,y); const o=owner[y][x];
  for(const [nx,ny] of nb(x,y)){ if(owner[ny] && owner[ny][nx]!==o){
    // draw the shared edge midpoint tick (cheap border hint)
  } }
  // outline land hexes lightly
  hexp(cx,cy,S-0.3); c.strokeStyle='rgba(0,0,0,0.22)'; c.lineWidth=0.5; c.stroke();
}
// thicker national outlines
for(let y=0;y<H;y++) for(let x=0;x<W;x++){ if(owner[y][x]==='.') continue; const o=owner[y][x];
  const [cx,cy]=hexCenter(x,y); let edge=false;
  for(const [nx,ny] of nb(x,y)){ if(!owner[ny]||owner[ny][nx]!==o){ edge=true; break; } }
  if(edge){ hexp(cx,cy,S-0.3); c.strokeStyle='rgba(0,0,0,0.6)'; c.lineWidth=1.0; c.stroke(); }
}
// capitals + labels
for(const ct of cityOut){ const [cx,cy]=hexCenter(ct.x,ct.y);
  c.beginPath(); c.arc(cx,cy,ct.cap?4:2.6,0,Math.PI*2);
  c.fillStyle=ct.cap?'#ffd34d':'#e8edf2'; c.fill(); c.strokeStyle='#000c'; c.lineWidth=1; c.stroke();
  if(ct.cap){ c.font='700 11px sans-serif'; c.textAlign='center';
    c.fillStyle='#000c'; c.fillText(ct.name,cx+0.6,cy-6.4);
    c.fillStyle='#ffe9a8'; c.fillText(ct.name,cx,cy-7); } }
fs.writeFileSync('/home/user/Hearts-of-Iron-5/ww_political.png', cv.toBuffer('image/png'));

// ---- stats ----
const owAll=owner.join(''); const land=owAll.length-owAll.split('').filter(c=>c==='.').length;
const byNat={}; for(const ch2 of owAll){ if(ch2==='.')continue; byNat[ch2]=(byNat[ch2]||0)+1; }
const top=Object.entries(byNat).sort((a,b)=>b[1]-a[1]).map(([c2,n])=>{
  const nat=natList.find(x=>x.c===c2); return (nat?nat.key:'?')+':'+n; });
console.log('grid',W+'x'+H,'| land hexes',land,'| nations',natList.length,'| cities',cityOut.length);
console.log('hexes by nation:', top.join(' '));
console.log('wrote ww_data.js, ww_political.png',cw+'x'+ch);
