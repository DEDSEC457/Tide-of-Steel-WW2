// Europe hex map from REAL Natural Earth coastline data (world-atlas 50m).
const fs=require('fs');
const {createCanvas}=require('@napi-rs/canvas');
const topojson=require('topojson-client');
const topo=require('world-atlas/land-50m.json');
const geo=topojson.feature(topo, topo.objects.land);
const feats=geo.type==='FeatureCollection'?geo.features:[geo];
const polys=[];
for(const f of feats){ const g=f.geometry; if(!g) continue;
  if(g.type==='Polygon') polys.push(g.coordinates);
  else if(g.type==='MultiPolygon') for(const p of g.coordinates) polys.push(p); }
console.error('land polygons:', polys.length);

// --- map window (the WW2 European theatre), Mercator latitude ---
const LON_W=-12, LON_E=58, LAT_N=71, LAT_S=32;
const W=110, H=120;
const mercY=d=>Math.log(Math.tan(Math.PI/4 + d*Math.PI/360));
const YN=mercY(LAT_N), YS=mercY(LAT_S);

function inRing(lon,lat,r){ let c=false;
  for(let i=0,j=r.length-1;i<r.length;j=i++){ const xi=r[i][0],yi=r[i][1],xj=r[j][0],yj=r[j][1];
    if(((yi>lat)!==(yj>lat)) && (lon<(xj-xi)*(lat-yi)/(yj-yi)+xi)) c=!c; } return c; }
function isLand(lon,lat){
  for(const poly of polys){ if(inRing(lon,lat,poly[0])){ let hole=false;
    for(let k=1;k<poly.length;k++) if(inRing(lon,lat,poly[k])){hole=true;break;}
    if(!hole) return true; } }
  return false;
}
function cellLonLat(x,y){
  const lon=LON_W + (x+0.5)/W*(LON_E-LON_W);
  const m=YN + (y+0.5)/H*(YS-YN);
  const lat=(2*Math.atan(Math.exp(m)) - Math.PI/2)*180/Math.PI;   // inverse Mercator
  return [lon,lat];
}

// --- terrain overlay: real mountain ranges & forest belts by lon/lat box ---
function inBox(lon,lat,b){ return lon>=b[0]&&lon<=b[1]&&lat>=b[2]&&lat<=b[3]; }
const MTN=[
  [4,15,43.5,47.5],   // Alps
  [-2,3,42,43.6],     // Pyrenees
  [13,27,44.5,49],    // Carpathians
  [38,49,40.5,44],    // Caucasus
  [5,16,60,69.8],     // Scandinavian mountains (Norway spine)
  [10,16,39.5,44.5],  // Apennines (Italy)
  [15,24,41.5,46],    // Dinaric Alps / Balkans
  [-7,-1,37,43],      // Cantabrian / Iberian (N + central Spain)
  [54,60,49,68],      // Urals (eastern edge)
  [27,45,38,41.5],    // Anatolia / Pontic
];
const FOR=[
  [10,40,50,57],      // North European plain (Germany → Belarus)
  [27,52,55,63],      // Russian forest belt
  [20,32,60,68.5],    // Finland / Karelia
  [12,20,47,50.5],    // S Germany / Bohemia
];
function vnoise(x,y){
  const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy;
  const h=(a,b)=>{ let n=(a*374761393 + b*668265263)>>>0; n=Math.imul(n^(n>>>13),1274126177)>>>0; return ((n^(n>>>16))>>>0)/4294967296; };
  const a=h(ix,iy),b=h(ix+1,iy),c=h(ix,iy+1),d=h(ix+1,iy+1);
  const sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy);
  return a*(1-sx)*(1-sy)+b*sx*(1-sy)+c*(1-sx)*sy+d*sx*sy;
}
function terr(lon,lat,x,y){
  // jitter the boundaries with smooth noise so ranges have organic, non-boxy edges
  const jlon=lon + (vnoise(x*0.28,y*0.28)-0.5)*5.5;
  const jlat=lat + (vnoise(x*0.28+50,y*0.28+50)-0.5)*3.5;
  for(const b of MTN) if(inBox(jlon,jlat,b)) return 'h';
  for(const b of FOR) if(inBox(jlon,jlat,b)) return 'f';
  return '.';
}

const grid=[];
for(let y=0;y<H;y++){ let row='';
  for(let x=0;x<W;x++){ const [lon,lat]=cellLonLat(x,y);
    row += isLand(lon,lat) ? terr(lon,lat,x,y) : "~"; }
  grid.push(row);
}
fs.writeFileSync('/tmp/eu_grid.json', JSON.stringify(grid));

// --- hex render ---
const S=9, HX=Math.sqrt(3)*S, VY=1.5*S, M=18;
const cw=Math.ceil(HX*(W+0.5)+M*2), ch=Math.ceil(VY*(H-1)+2*S+M*2);
const cv=createCanvas(cw,ch); const c=cv.getContext('2d');
c.fillStyle='#0a0c10'; c.fillRect(0,0,cw,ch);
// the game's real terrain palette
const COL={'~':'#1d2c38','o':'#16314a','.':'#4a5234','f':'#33422a','h':'#56503a','s':'#3c4a42','r':'#33505e'};
function hex(cx,cy,s){ c.beginPath(); for(let i=0;i<6;i++){const a=Math.PI/180*(60*i-30); const px=cx+s*Math.cos(a),py=cy+s*Math.sin(a); i?c.lineTo(px,py):c.moveTo(px,py);} c.closePath(); }
for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const t=grid[y][x];
  const cx=M+HX*(x+0.5*(y&1))+HX/2, cy=M+VY*y+S;
  hex(cx,cy,S-0.3); c.fillStyle=COL[t]||'#4a5234'; c.fill();
  // subtle per-hex variation, like the game
  const hv=(x*2654435761 ^ y*40503)>>>0;
  c.fillStyle=(hv&1)?'rgba(255,255,255,0.035)':'rgba(0,0,0,'+(0.02+(hv%4)*0.014)+')'; c.fill();
  // little forest tufts / hill strokes for character
  c.save(); c.translate(cx,cy);
  if(t==='f'){ c.fillStyle='#243520'; for(const[dx,dy]of[[-3,1],[1,-2],[3,2]]){c.beginPath();c.moveTo(dx,dy+2);c.lineTo(dx+1.6,dy-2);c.lineTo(dx+3.2,dy+2);c.closePath();c.fill();} }
  if(t==='h'){ c.strokeStyle='#00000050'; c.lineWidth=0.8; c.beginPath(); c.moveTo(-3.5,1.6); c.quadraticCurveTo(-1.6,-1.6,0,1.6); c.moveTo(0.6,0.6); c.quadraticCurveTo(2.4,-2,4,1); c.stroke(); }
  c.restore();
  c.strokeStyle='#00000040'; c.lineWidth=0.4; c.stroke();
}
// --- major capitals (forward-projected onto the same grid) ---
const CITIES=[['London',-0.1,51.5,1],['Paris',2.3,48.9,1],['Berlin',13.4,52.5,1],['Rome',12.5,41.9,1],
 ['Madrid',-3.7,40.4,1],['Moscow',37.6,55.8,1],['Leningrad',30.3,59.9,0],['Stalingrad',44.5,48.7,0],
 ['Warsaw',21,52.2,0],['Vienna',16.4,48.2,0],['Kiev',30.5,50.5,0],['Stockholm',18,59.3,0],
 ['Oslo',10.7,59.9,0],['Belgrade',20.5,44.8,0],['Bucharest',26.1,44.4,0],['Amsterdam',4.9,52.4,0],
 ['Helsinki',25,60.2,0],['Lisbon',-9.1,38.7,0],['Ankara',32.9,39.9,0],['Athens',23.7,38,0]];
for(const [name,lon,lat,cap] of CITIES){
  const gx=(lon-LON_W)/(LON_E-LON_W)*W, gy=(mercY(lat)-YN)/(YS-YN)*H;
  const cx=M+HX*(gx+0.5*(Math.floor(gy)&1)), cy=M+VY*gy+S;
  c.beginPath(); c.arc(cx,cy,cap?4.2:3,0,Math.PI*2);
  c.fillStyle=cap?'#ffd34d':'#dfe6ee'; c.fill(); c.strokeStyle='#000a'; c.lineWidth=1; c.stroke();
  c.font=(cap?'700 ':'')+ (cap?12:10.5)+'px sans-serif'; c.textAlign='center';
  c.fillStyle='#000b'; c.fillText(name,cx+0.6,cy-6.4);
  c.fillStyle=cap?'#ffe9a8':'#eef2f6'; c.fillText(name,cx,cy-7);
}
fs.writeFileSync('/home/user/Hearts-of-Iron-5/eu_preview.png', cv.toBuffer('image/png'));
const all=grid.join(''); const cnt=t=>all.split('').filter(ch=>ch===t).length;
console.log('grid',W+'x'+H,'| land',all.length-cnt('~'),'plains',cnt('.'),'forest',cnt('f'),'hills',cnt('h'),'| wrote eu_preview.png',cw+'x'+ch);
