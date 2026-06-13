// Bake the accurate 1938 Europe map (nation per hex + terrain per hex + cities +
// rivers) from historical border GeoJSON into a compact europe.json the app loads.
// Run: node scripts/build-map.mjs  (needs /tmp/world_1938.json from
// github.com/aourednik/historical-basemaps geojson/world_1938.geojson)
import fs from 'node:fs';

const GEO = '/tmp/world_1938.json';
const geo = JSON.parse(fs.readFileSync(GEO, 'utf8'));
const NM = f => f.properties.NAME || f.properties.name || '?';
const bboxOf = f => { let a=1e9,b=1e9,c=-1e9,d=-1e9; const g=f.geometry; if(!g) return null;
  const ps = g.type==='Polygon'?[g.coordinates]:g.coordinates;
  for(const p of ps) for(const r of p) for(const [x,y] of r){ if(x<a)a=x;if(y<b)b=y;if(x>c)c=x;if(y>d)d=y; } return [a,b,c,d]; };
geo.features.forEach(f => f._bb = bboxOf(f));

// ---- projection / grid (matches the verified preview) ----
const lonMin=-13, lonMax=60, latMin=32, latMax=71, COLS=150, size=8;
const hexW=Math.sqrt(3)*size, rowStep=1.5*size;
const latMid=(latMin+latMax)/2, geoW=(lonMax-lonMin)*Math.cos(latMid*Math.PI/180), geoH=(latMax-latMin);
const ROWS=Math.round(COLS*Math.sqrt(3)/(1.5*(geoW/geoH)));
const drawnW=COLS*hexW, drawnH=(ROWS-1)*rowStep+2*size;
const hexLonLat=(col,row)=>{ const cx=(col+(row&1?0.5:0)+0.5)*hexW, cy=size+row*rowStep;
  return [lonMin+(cx/drawnW)*(lonMax-lonMin), latMax-(cy/drawnH)*(latMax-latMin)]; };

const EU = geo.features.filter(f => f._bb && !(f._bb[2]<lonMin||f._bb[0]>lonMax||f._bb[3]<latMin||f._bb[1]>latMax));

function inRing(lon,lat,r){let s=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const xi=r[i][0],yi=r[i][1],xj=r[j][0],yj=r[j][1];if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi))s=!s;}return s;}
const inPoly=(lon,lat,p)=>{ if(!inRing(lon,lat,p[0]))return false; for(let h=1;h<p.length;h++) if(inRing(lon,lat,p[h]))return false; return true; };
const inFeat=(lon,lat,f)=>{ const g=f.geometry; if(!g)return false; if(g.type==='Polygon')return inPoly(lon,lat,g.coordinates); for(const p of g.coordinates) if(inPoly(lon,lat,p))return true; return false; };

// ---- 1938 nations: merge Soviet republics into the USSR, set factions & colours ----
const TO_USSR = new Set(['Armenia','Georgia','Azerbaijan','South Russia','White Russia','Ukraine','Belarus']);
function nationOf(rawName){ if(TO_USSR.has(rawName)) return 'USSR'; return rawName; }
const NATION_META = {  // color + faction (axis/allies/comintern/neutral)
  Germany:['#5f6670','axis'], Italy:['#5f8a64','axis'],
  'United Kingdom':['#9a8a52','allies'], France:['#4e6ca8','allies'], Poland:['#a85e48','allies'], Czechoslovakia:['#7e9a86','allies'],
  USSR:['#a5483a','comintern'],
  Spain:['#caa85a','neutral'], Portugal:['#7a9a64','neutral'], Yugoslavia:['#9a7e9a','neutral'], Romania:['#b0a86a','neutral'],
  Hungary:['#92a880','neutral'], Bulgaria:['#a49870','neutral'], Greece:['#7eaeb2','neutral'], Turkey:['#b09e72','neutral'],
  Sweden:['#6e92b2','neutral'], Norway:['#78a2b0','neutral'], Finland:['#b6c0c8','neutral'], Denmark:['#b48a82','neutral'],
  Netherlands:['#d2985a','neutral'], Belgium:['#c0b078','neutral'], Switzerland:['#b09898','neutral'], Ireland:['#70ac7a','neutral'],
  Estonia:['#96a69e','neutral'], Latvia:['#9e9696','neutral'], Lithuania:['#a4ac8c','neutral'], Albania:['#987a70','neutral'], Luxembourg:['#c8b478','neutral'],
  Libya:['#96aa78','axis'], Egypt:['#cac08a','neutral'], Iceland:['#a0acb6','neutral'],
};
const colMinor = nm => { let h=0; for(const c of nm) h=(h*31+c.charCodeAt(0))>>>0; const f=v=>('0'+(120+v).toString(16)).slice(-2); return '#'+f(h%70)+f((h>>5)%70)+f((h>>11)%60); };

// ---- terrain classification (lon/lat) ----
const RIDGES=[ // [name, [[lon,lat]...], widthDeg]
 [[ -1.5,42.8],[2.0,42.6]],         // Pyrenees
 [[6,44.5],[10,46],[13.5,47]],      // Alps
 [[10,44],[13,41],[16,39.5]],       // Apennines
 [[16.5,46],[19,43.5],[20,42]],     // Dinaric
 [[22.5,49],[25,48],[26.5,47.5]],   // Carpathians (NW arc)
 [[24.5,45.5],[25.5,45]],           // S Carpathians
 [[22,42],[25,41.8]],               // Balkan/Rhodope
 [[7,59],[9,62],[13,66],[18,69]],   // Scandinavian
 [[41,43.2],[45,42.8],[47,41]],     // Caucasus
 [[59,52],[60,58],[62,65]],         // Urals (eastern edge)
 [[-6,43],[-2,42.8]],               // Cantabrian
 [[-5,40],[-2,40.3]],               // Iberian central
 [[30,40],[38,39],[43,39]],         // Anatolian
 [[-6,33],[2,35],[8,36]],           // Atlas
];
const distLL=(lon,lat,a,b)=>{ const kx=Math.cos(lat*Math.PI/180); const ax=a[0]*kx,ay=a[1],bx=b[0]*kx,by=b[1],px=lon*kx,py=lat;
 const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy||1; let t=((px-ax)*dx+(py-ay)*dy)/l2; t=Math.max(0,Math.min(1,t)); return Math.hypot(px-ax-t*dx,py-ay-t*dy); };
// SMOOTH coherent value noise — terrain forms real regions, not hex-by-hex static
function vhash(i,j){ let h=(i*374761393+j*668265263)|0; h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/2147483648-1; }
function smooth(x,y){ const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=vhash(xi,yi),b=vhash(xi+1,yi),c=vhash(xi,yi+1),d=vhash(xi+1,yi+1);
  return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v; }
function noise(lon,lat){ return smooth(lon*0.42,lat*0.42) + smooth(lon*1.05,lat*1.05)*0.4; }  // ~ -1.4..1.4, coherent over ~5 hexes
// terrain ids: 0 sea,1 plains,2 forest,3 hills,4 mountain,5 marsh,6 steppe,7 tundra,8 desert,9 medit,10 wooded-steppe,11 taiga
function terrainAt(lon,lat,isLand){ if(!isLand) return 0;
  let mtn=1e9; for(const r of RIDGES) for(let i=0;i+1<r.length;i++) mtn=Math.min(mtn,distLL(lon,lat,r[i],r[i+1]));
  if(mtn<0.55) return 4; if(mtn<1.05) return 3;                     // mountain / hills near ranges
  // northern gradient: forest → taiga → tundra (Finland/N.Scandinavia/N.Russia)
  if(lat>=60){ const nn=noise(lon,lat);
    if(lat>=67.5) return 7;                                         // tundra (the snowy far north)
    if(lat>=64.5) return nn>0.15?7:11;                              // tundra patches breaking into taiga
    if(lat>=61.5) return 11;                                        // taiga
    return nn>0.0?11:2;                                             // forest giving way to taiga
  }
  if(lat<31.5) return 8;                                           // deep desert
  if(lat<37 && lon>-2 && lon<35) return (noise(lon,lat)>0.2)?8:9;  // N Africa coast: desert/medit
  if(lon>25&&lon<30&&lat>51&&lat<53) return 5;                     // Pripyat marshes
  const n=noise(lon,lat);
  // the great eastern latitude gradient: steppe → wooded-steppe → forest (no hard wall)
  if(lon>=27&&lon<=56 && lat>=43.5 && lat<57){
    if(lat<48.5) return n>-0.5?6:10;                               // steppe core, wooded-steppe islands
    if(lat<52)   return n>0.3?6:(n>-0.5?10:2);                     // transition band
    return n>0.45?10:2;                                            // mostly forest, some wooded-steppe
  }
  if(lat<43 && lat>=34) return n>0.5?2:9;                          // Mediterranean scrub/forest
  if(lat>57 && lon>4 && lon<55) return n>-0.5?2:1;                 // taiga (boreal forest)
  if(lat>=50 && lat<58 && lon>=6 && lon<56) return n>0.1?2:1;      // mixed-forest belt
  if(n>0.6) return 2;                                              // scattered temperate woodland
  return 1;                                                        // plains
}

// ---- classify every hex ----
const N=COLS*ROWS;
const natIdx=new Int16Array(N).fill(-1), terr=new Uint8Array(N);
const natList=[], natMap=new Map();
function natId(name){ if(natMap.has(name))return natMap.get(name); const id=natList.length; natList.push(name); natMap.set(name,id); return id; }
for(let row=0;row<ROWS;row++){ for(let col=0;col<COLS;col++){ const [lon,lat]=hexLonLat(col,row); let land=false, nm=null;
  for(const f of EU){ const b=f._bb; if(lon<b[0]||lon>b[2]||lat<b[1]||lat>b[3])continue; if(inFeat(lon,lat,f)){ land=true; nm=nationOf(NM(f)); break; } }
  const i=row*COLS+col; if(land){ natIdx[i]=natId(nm); } terr[i]=terrainAt(lon,lat,land); }
  if(row%20===0) process.stdout.write('.'); }
// despeckle the biome layer (coalesce stray hexes); preserve mountains/hills/marsh/tundra/desert features
const NBe=[[1,0],[0,-1],[-1,-1],[-1,0],[-1,1],[0,1]], NBo=[[1,0],[1,-1],[0,-1],[-1,0],[0,1],[1,1]];
const BIOME=new Set([1,2,6,9]); // plains, forest, steppe, mediterranean
for(let pass=0;pass<2;pass++){ const src=terr.slice();
  for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){ const i=row*COLS+col; if(natIdx[i]<0||!BIOME.has(src[i]))continue;
    const cnt={[src[i]]:1}, NB=(row&1)?NBo:NBe;
    for(const[dc,dr]of NB){ const nc=col+dc,nr=row+dr; if(nc<0||nr<0||nc>=COLS||nr>=ROWS)continue; const j=nr*COLS+nc; if(natIdx[j]<0||!BIOME.has(src[j]))continue; cnt[src[j]]=(cnt[src[j]]||0)+1; }
    let best=src[i],bc=cnt[best]; for(const k in cnt){ if(cnt[k]>bc){ bc=cnt[k]; best=+k; } }
    terr[i]=best; } }
console.log('\nnations:',natList.length,'land hexes:',natIdx.filter(v=>v>=0).length);

// ---- cities (name, lon, lat, capital) ----
const CITY=[
 ['Berlin',13.4,52.5,1],['Hamburg',10.0,53.5,0],['Munich',11.6,48.1,0],['Cologne',6.96,50.9,0],['Frankfurt',8.68,50.1,0],['Vienna',16.4,48.2,1],['Prague',14.4,50.1,1],['Königsberg',20.5,54.7,0],
 ['Warsaw',21.0,52.2,1],['Krakow',19.9,50.1,0],['Lodz',19.5,51.8,0],['Danzig',18.6,54.4,0],['Paris',2.35,48.9,1],['Marseille',5.37,43.3,0],['Lyon',4.83,45.8,0],['Brest',-4.49,48.4,0],['Bordeaux',-0.58,44.8,0],
 ['London',-0.13,51.5,1],['Manchester',-2.24,53.5,0],['Glasgow',-4.25,55.9,0],['Dublin',-6.26,53.3,1],['Madrid',-3.70,40.4,1],['Barcelona',2.17,41.4,0],['Lisbon',-9.14,38.7,1],['Seville',-5.98,37.4,0],
 ['Rome',12.5,41.9,1],['Milan',9.19,45.5,0],['Naples',14.3,40.8,0],['Venice',12.3,45.4,0],['Turin',7.69,45.1,0],['Amsterdam',4.9,52.4,1],['Brussels',4.35,50.8,1],['Copenhagen',12.6,55.7,1],
 ['Oslo',10.7,59.9,1],['Stockholm',18.1,59.3,1],['Helsinki',24.9,60.2,1],['Riga',24.1,56.9,1],['Tallinn',24.7,59.4,1],['Kaunas',23.9,54.9,1],['Bern',7.45,46.9,1],
 ['Minsk',27.6,53.9,0],['Kiev',30.5,50.4,0],['Kharkov',36.3,50.0,0],['Moscow',37.6,55.8,1],['Leningrad',30.3,59.9,0],['Smolensk',32.0,54.8,0],['Stalingrad',44.5,48.7,0],['Rostov',39.7,47.2,0],
 ['Sevastopol',33.5,44.6,0],['Odessa',30.7,46.5,0],['Murmansk',33.1,68.9,0],['Gorky',44.0,56.3,0],['Voronezh',39.2,51.7,0],['Astrakhan',48.0,46.3,0],
 ['Budapest',19.0,47.5,1],['Belgrade',20.5,44.8,1],['Bucharest',26.1,44.4,1],['Sofia',23.3,42.7,1],['Athens',23.7,38.0,1],['Zagreb',15.97,45.8,0],['Sarajevo',18.4,43.9,0],
 ['Istanbul',29.0,41.0,0],['Ankara',32.9,39.9,1],['Tripoli',13.2,32.9,0],['Tunis',10.2,36.8,0],['Algiers',3.06,36.8,0],['Cairo',31.2,30.0,1],['Gibraltar',-5.35,36.1,0],
];
const lonLatToHex=(lon,lat)=>{ // nearest hex to a lon/lat
  let best=null,bd=1e9; for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){ const [hl,ha]=hexLonLat(col,row); const d=Math.hypot((hl-lon)*Math.cos(lat*Math.PI/180),ha-lat); if(d<bd){bd=d;best=[col,row];} } return best; };
const cities = CITY.map(([name,lon,lat,cap])=>{ const [col,row]=lonLatToHex(lon,lat); const i=row*COLS+col; const nm=natIdx[i]>=0?natList[natIdx[i]]:null; return {name,col,row,cap,nation:nm}; });

// ---- rivers (major), as hex-grid polylines for drawing ----
const RIVER_LL=[
 [[8.2,47],[7.6,49],[6.9,50.9],[6.1,51.8],[4.1,51.9]],            // Rhine
 [[16.4,48.2],[19,47.9],[21,46],[25,45.4],[28.8,45.3]],          // Danube (mid→delta)
 [[37,55.8],[40,57],[44,56.3],[47.5,52],[45.5,49],[47.5,46]],    // Volga
 [[30.5,53],[31,50.4],[33,49],[32,46.6]],                        // Dnieper
 [[39,52],[40,49],[41,47.2]],                                    // Don
 [[19,52.2],[19,50],[18.6,54.4]],                                // Vistula
];
const rivers = RIVER_LL.map(line => line.map(([lon,lat])=>lonLatToHex(lon,lat)));

// ---- RLE encode the grids ----
const rle = arr => { const out=[]; let v=arr[0],c=1; for(let i=1;i<arr.length;i++){ if(arr[i]===v)c++; else {out.push(v,c); v=arr[i]; c=1;} } out.push(v,c); return out; };
const nations = natList.map(nm => { const m=NATION_META[nm]; return { name:nm, color:(m?m[0]:colMinor(nm)), faction:(m?m[1]:'neutral') }; });

const data = { cols:COLS, rows:ROWS, size, proj:{lonMin,lonMax,latMin,latMax}, nations, natRLE:rle(Array.from(natIdx)), terrRLE:rle(Array.from(terr)), cities, rivers };
fs.writeFileSync(new URL('../src/europe.json', import.meta.url), JSON.stringify(data));
console.log('wrote src/europe.json', (JSON.stringify(data).length/1024|0)+'KB ·', cities.length,'cities ·',rivers.length,'rivers');
