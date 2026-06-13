// Build the 1938 Europe hex map as VECTOR geometry (PixiJS Graphics) so it stays
// razor-sharp at any zoom — every hex is a real filled polygon, not a baked image.
// Same War-in-the-East colour treatment as before (per-biome colour + gentle
// coherent-noise variation + seam softening + depth-graded sea + nation tint),
// just painted as polygons instead of onto a canvas.
import { Container, Graphics } from 'pixi.js';
import { COLS, ROWS, SIZE, nat, terr, nations, rivers, hexCenter,
         mapW as MAPW, mapH as MAPH, NB_EVEN, NB_ODD, hexToRgb } from './mapdata';

type RGB = [number, number, number];
const lerp = (a: RGB, b: RGB, t: number): RGB => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];

// terrain palette (id → colour), muted/realistic like War in the East
const TERR: Record<number, RGB> = {
  1: [168, 180, 102],  // plains
  2: [82, 124, 66],    // forest
  3: [156, 144, 98],   // hills
  4: [138, 120, 96],   // mountain
  5: [118, 152, 128],  // marsh
  6: [212, 162, 88],   // steppe
  7: [186, 192, 182],  // tundra
  8: [218, 196, 140],  // desert
  9: [184, 176, 104],  // mediterranean
  10: [158, 166, 84],  // wooded steppe
  11: [126, 152, 116], // taiga
};
const SEA_SHALLOW: RGB = [96, 142, 178], SEA_DEEP: RGB = [40, 74, 116];
const nationRgb = nations.map(n => hexToRgb(n.color));

// smooth (coherent) value noise so the texture varies gently, not hex-by-hex
function vhash(i: number, j: number) { let h = (i*374761393 + j*668265263)|0; h = Math.imul(h ^ (h>>>13), 1274126177); return ((h ^ (h>>>16))>>>0)/2147483648 - 1; }
function noise(x: number, y: number) { const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi, u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=vhash(xi,yi), b=vhash(xi+1,yi), c=vhash(xi,yi+1), d=vhash(xi+1,yi+1);
  return (a+(b-a)*u)*(1-v) + (c+(d-c)*u)*v; }

// distance (in hexes) from each sea hex to nearest land — for sea depth shading
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

const clamp255 = (v: number) => v < 0 ? 0 : v > 255 ? 255 : v|0;
const toHex = (c: RGB) => (clamp255(c[0])<<16) | (clamp255(c[1])<<8) | clamp255(c[2]);

export const PAD = 2;

export interface BuiltMap { layer: Container; mapW: number; mapH: number; }

export function buildTerrain(): BuiltMap {
  const W = Math.ceil(MAPW) + PAD*2, H = Math.ceil(MAPH) + PAD*2;
  const depth = seaDepth();

  // 1) base terrain colour per land hex + gentle variation
  const base: (RGB | null)[] = new Array(COLS*ROWS).fill(null);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = r*COLS+c; if (nat[i] < 0) continue;
    const t = terr[i], tc = TERR[t] || TERR[1];
    const lf = noise(c*0.26, r*0.26) * 8;
    const hf = noise(c*0.62, r*0.62) * (t===4 ? 10 : 4);
    base[i] = [tc[0]+lf+hf, tc[1]+lf+hf, tc[2]+(lf+hf)*0.85];
  }
  // 2) soften ONLY the seams between different terrain types — interiors stay crisp
  {
    const src = base.map(c => c ? [c[0], c[1], c[2]] as RGB : null);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r*COLS+c, s = src[i]; if (!s) continue;
      let dr=0, dg=0, db=0, dn=0; const NB = (r&1) ? NB_ODD : NB_EVEN;
      for (const [dc, drr] of NB) { const nc=c+dc, nr=r+drr; if(nc<0||nr<0||nc>=COLS||nr>=ROWS) continue; const j=nr*COLS+nc; if(nat[j]<0) continue; const ns=src[j]; if(!ns) continue;
        if (terr[j] !== terr[i]) { dr+=ns[0]; dg+=ns[1]; db+=ns[2]; dn++; } }
      if (dn > 0) { const k = 0.22*Math.min(1, dn/3); base[i] = [s[0]+(dr/dn-s[0])*k, s[1]+(dg/dn-s[1])*k, s[2]+(db/dn-s[2])*k]; }
    }
  }

  const colorOf = (i: number): RGB => nat[i] < 0
    ? lerp(SEA_SHALLOW, SEA_DEEP, Math.min(1, depth[i]/8))
    : lerp(base[i]!, nationRgb[nat[i]], 0.16);

  // pre-compute the 6 corner offsets of a hex (pointy-top)
  const corner: [number, number][] = [];
  for (let k = 0; k < 6; k++) { const a = (-90 + 60*k) * Math.PI/180; corner.push([SIZE*Math.cos(a), SIZE*Math.sin(a)]); }

  const layer = new Container();

  // 3) terrain fills — one Graphics per row-band keeps each GraphicsContext light
  const BANDS = 10, rowsPerBand = Math.ceil(ROWS / BANDS);
  for (let b = 0; b < BANDS; b++) {
    const r0 = b*rowsPerBand, r1 = Math.min(ROWS, r0+rowsPerBand);
    if (r0 >= ROWS) break;
    const g = new Graphics();
    for (let r = r0; r < r1; r++) for (let c = 0; c < COLS; c++) {
      const i = r*COLS+c;
      const [cx0, cy0] = hexCenter(c, r); const cx = cx0+PAD, cy = cy0+PAD;
      g.moveTo(cx+corner[0][0], cy+corner[0][1]);
      for (let k = 1; k < 6; k++) g.lineTo(cx+corner[k][0], cy+corner[k][1]);
      g.closePath();
      g.fill({ color: toHex(colorOf(i)) });
    }
    layer.addChild(g);
  }

  // 4) subtle hex grid (land only) — crisp cell lines that appear as you zoom in
  const grid = new Graphics();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (nat[r*COLS+c] < 0) continue;
    const [cx0, cy0] = hexCenter(c, r); const cx = cx0+PAD, cy = cy0+PAD;
    grid.moveTo(cx+corner[0][0], cy+corner[0][1]);
    for (let k = 1; k < 6; k++) grid.lineTo(cx+corner[k][0], cy+corner[k][1]);
    grid.closePath();
  }
  grid.stroke({ color: 0x000000, width: 0.35, alpha: 0.10 });
  layer.addChild(grid);

  // 5) national borders (land vs different land) — dark, one stroke pass
  const borders = new Graphics();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const n = nat[r*COLS+c]; if (n < 0) continue;
    const [cx0, cy0] = hexCenter(c, r); const cx = cx0+PAD, cy = cy0+PAD;
    const NB = (r & 1) ? NB_ODD : NB_EVEN;
    for (let e = 0; e < 6; e++) {
      const [dc, dr] = NB[e]; const nc = c+dc, nr = r+dr; if (nc<0||nr<0||nc>=COLS||nr>=ROWS) continue;
      const m = nat[nr*COLS+nc]; if (m < 0 || m === n) continue;
      const a1 = (-90+60*e)*Math.PI/180, a2 = (-90+60*(e+1))*Math.PI/180;
      borders.moveTo(cx+SIZE*Math.cos(a1), cy+SIZE*Math.sin(a1));
      borders.lineTo(cx+SIZE*Math.cos(a2), cy+SIZE*Math.sin(a2));
    }
  }
  borders.stroke({ color: 0x22222a, width: 1.0, alpha: 0.85 });
  layer.addChild(borders);

  // 6) rivers
  const riv = new Graphics();
  for (const line of rivers) {
    line.forEach(([c, r], k) => { const [x, y] = hexCenter(c, r); k ? riv.lineTo(x+PAD, y+PAD) : riv.moveTo(x+PAD, y+PAD); });
  }
  riv.stroke({ color: 0x4678aa, width: Math.max(1.4, SIZE*0.28), alpha: 0.95, join: 'round', cap: 'round' });
  layer.addChild(riv);

  return { layer, mapW: W, mapH: H };
}
