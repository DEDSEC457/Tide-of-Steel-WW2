// Bake the accurate 1938 Europe hex map to a canvas the GPU displays: War-in-the-
// East style terrain (clear/forest/steppe/marsh/mountain/tundra/desert) with a
// subtle nation tint, national borders, rivers and depth-graded sea.
import { COLS, ROWS, SIZE, nat, terr, nations, rivers, hexCenter,
         mapW, mapH, NB_EVEN, NB_ODD, hexToRgb } from './mapdata';

type RGB = [number, number, number];
const lerp = (a: RGB, b: RGB, t: number): RGB => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];

// terrain palette (id → colour), muted/realistic like War in the East
const TERR: Record<number, RGB> = {
  1: [150, 162, 98],   // plains
  2: [84, 114, 70],    // forest
  3: [150, 146, 102],  // hills
  4: [142, 122, 96],   // mountain
  5: [120, 150, 124],  // marsh
  6: [201, 162, 102],  // steppe
  7: [168, 174, 158],  // tundra
  8: [214, 194, 142],  // desert
  9: [178, 174, 110],  // mediterranean
};
const SEA_SHALLOW: RGB = [96, 142, 178], SEA_DEEP: RGB = [40, 74, 116];
const nationRgb = nations.map(n => hexToRgb(n.color));

// smooth (coherent) value noise so the texture varies gently, not hex-by-hex
function vhash(i: number, j: number) { let h = (i*374761393 + j*668265263)|0; h = Math.imul(h ^ (h>>>13), 1274126177); return ((h ^ (h>>>16))>>>0)/2147483648 - 1; }
function noise(x: number, y: number) { const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=vhash(xi,yi), b=vhash(xi+1,yi), c=vhash(xi,yi+1), d=vhash(xi+1,yi+1);
  return (a+(b-a)*u)*(1-v) + (c+(d-c)*u)*v; }

// distance (in hexes) from each sea hex to the nearest land — for sea depth
function seaDepth(): Int16Array {
  const d = new Int16Array(COLS*ROWS).fill(9999);
  const qx: number[] = [], qy: number[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (nat[r*COLS+c] >= 0) { d[r*COLS+c] = 0; qx.push(c); qy.push(r); }
  let h = 0;
  while (h < qx.length) {
    const c = qx[h], r = qy[h]; h++; const nd = d[r*COLS+c] + 1;
    const NB = (r & 1) ? NB_ODD : NB_EVEN;
    for (const [dc, dr] of NB) { const nc = c+dc, nr = r+dr; if (nc<0||nr<0||nc>=COLS||nr>=ROWS) continue; if (d[nr*COLS+nc] > nd) { d[nr*COLS+nc] = nd; qx.push(nc); qy.push(nr); } }
  }
  return d;
}

export interface Baked { canvas: HTMLCanvasElement; }

export function bakeTerrain(): Baked {
  const PAD = 2;
  const W = Math.ceil(mapW) + PAD*2, H = Math.ceil(mapH) + PAD*2;
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const depth = seaDepth();

  const hexPath = (cx: number, cy: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (-90 + 60*i) * Math.PI/180, x = cx + SIZE*Math.cos(a), y = cy + SIZE*Math.sin(a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
  };
  const rgb = (c: RGB) => `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;

  // fill every hex (sea first via background)
  ctx.fillStyle = rgb(SEA_DEEP); ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r*COLS+c, [cx0, cy0] = hexCenter(c, r), cx = cx0+PAD, cy = cy0+PAD;
    let col: RGB;
    const n = nat[i];
    if (n < 0) { col = lerp(SEA_SHALLOW, SEA_DEEP, Math.min(1, depth[i]/8)); }
    else {
      const t = terr[i]; col = TERR[t] || TERR[1];
      const nz = (noise(c*0.35, r*0.35) + noise(c*0.9, r*0.9)*0.5) * (t===4 ? 14 : 7);   // gentle, coherent texture
      col = [col[0]+nz, col[1]+nz, col[2]+nz*0.8];
      col = lerp(col, nationRgb[n], 0.16);                  // subtle nation tint
    }
    hexPath(cx, cy); ctx.fillStyle = rgb(col); ctx.fill();
  }

  // national borders (land vs different land) — dark, thin
  ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(34,34,40,0.85)'; ctx.lineCap = 'round';
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const n = nat[r*COLS+c]; if (n < 0) continue;
    const [cx0, cy0] = hexCenter(c, r), cx = cx0+PAD, cy = cy0+PAD;
    const NB = (r & 1) ? NB_ODD : NB_EVEN;
    for (let e = 0; e < 6; e++) {
      const [dc, dr] = NB[e]; const nc = c+dc, nr = r+dr; if (nc<0||nr<0||nc>=COLS||nr>=ROWS) continue;
      if (nat[nr*COLS+nc] !== n && nat[nr*COLS+nc] >= 0) {
        const a1 = (-90+60*e)*Math.PI/180, a2 = (-90+60*(e+1))*Math.PI/180;
        ctx.beginPath(); ctx.moveTo(cx+SIZE*Math.cos(a1), cy+SIZE*Math.sin(a1)); ctx.lineTo(cx+SIZE*Math.cos(a2), cy+SIZE*Math.sin(a2)); ctx.stroke();
      }
    }
  }

  // rivers
  ctx.lineWidth = Math.max(1.5, SIZE*0.28); ctx.strokeStyle = 'rgba(70,120,170,0.95)'; ctx.lineJoin = 'round';
  for (const line of rivers) { ctx.beginPath(); line.forEach(([c, r], k) => { const [x, y] = hexCenter(c, r); k ? ctx.lineTo(x+PAD, y+PAD) : ctx.moveTo(x+PAD, y+PAD); }); ctx.stroke(); }

  // faint hex grid overlay
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.beginPath();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const [cx0, cy0] = hexCenter(c, r), cx = cx0+PAD, cy = cy0+PAD;
    for (let i = 0; i < 6; i++) { const a = (-90+60*i)*Math.PI/180, x = cx+SIZE*Math.cos(a), y = cy+SIZE*Math.sin(a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    const a0 = (-90)*Math.PI/180; ctx.lineTo(cx+SIZE*Math.cos(a0), cy+SIZE*Math.sin(a0));
  }
  ctx.stroke();

  return { canvas };
}
