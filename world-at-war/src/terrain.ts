// Bake the Europe terrain to a high-resolution canvas: smooth painted terrain
// with multi-octave noise, coastal shading, depth-graded sea and rivers. The GPU
// then displays this single texture with pan/zoom — fast at any scale.

import { rasterize, RIVERS, BASE_W, BASE_H, type Terr } from './geography';

const S = 4;          // sub-cells per base hex (coastline detail)
const PX = 5;         // pixels per sub-cell

type RGB = [number, number, number];
const lerp = (a: RGB, b: RGB, t: number): RGB => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];

// cheap deterministic value noise (multi-octave)
function vnoise(x: number, y: number): number {
  let v = 0, amp = 0.5, f = 1;
  for (let o = 0; o < 3; o++) {
    const s = Math.sin(x * 12.9898 * f + y * 78.233 * f) * 43758.5453;
    v += ((s - Math.floor(s)) - 0.5) * amp;
    amp *= 0.5; f *= 2.3;
  }
  return v; // ~ -0.5..0.5
}

function distField(W: number, H: number, isSeed: (i: number) => boolean): Int16Array {
  const d = new Int16Array(W * H).fill(9999);
  const qx = new Int32Array(W * H), qy = new Int32Array(W * H);
  let head = 0, tail = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isSeed(y * W + x)) { d[y*W+x] = 0; qx[tail] = x; qy[tail] = y; tail++; }
  while (head < tail) {
    const x = qx[head], y = qy[head]; head++;
    const nd = d[y*W+x] + 1;
    const nb = [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
    for (const [nx, ny] of nb) if (nx>=0&&ny>=0&&nx<W&&ny<H && d[ny*W+nx] > nd) { d[ny*W+nx] = nd; qx[tail]=nx; qy[tail]=ny; tail++; }
  }
  return d;
}

export interface Baked { canvas: HTMLCanvasElement; pxPerHex: number; }

export function bakeTerrain(): Baked {
  const { grid, W, H } = rasterize(S);
  const isSea = (i: number) => grid[(i / W) | 0][i % W] === '~';
  const dToLand = distField(W, H, (i) => !isSea(i)); // for sea: distance to coast
  const dToSea  = distField(W, H, (i) =>  isSea(i)); // for land: distance to coast

  const cw = W * PX, ch = H * PX;
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(cw, ch);
  const data = img.data;

  const DEEP: RGB = [30, 64, 110], SHALLOW: RGB = [92, 150, 188], SAND: RGB = [206, 196, 150];
  const GRASS: RGB = [104, 142, 74], FOREST: RGB = [58, 92, 50], MOUNT: RGB = [150, 138, 116], HILL: RGB = [124, 124, 84], MARSH: RGB = [92, 116, 96];

  for (let fy = 0; fy < H; fy++) for (let fx = 0; fx < W; fx++) {
    const t = grid[fy][fx] as Terr;
    let col: RGB;
    if (t === '~') {
      const d = dToLand[fy*W+fx];
      col = lerp(SHALLOW, DEEP, Math.min(1, d / 9));
      col = [col[0] + vnoise(fx*0.15, fy*0.15)*8, col[1] + vnoise(fx*0.15, fy*0.15)*8, col[2] + vnoise(fx*0.15, fy*0.15)*8];
    } else {
      col = t === 'm' ? MOUNT : t === 'h' ? HILL : t === 'f' ? FOREST : t === 's' ? MARSH : GRASS;
      const n = vnoise(fx * 0.5, fy * 0.5);
      col = [col[0] + n * 18, col[1] + n * 18, col[2] + n * 14];
      // mountains: hillshade + snow on the highest noise
      if (t === 'm') { const hs = vnoise(fx*0.4+10, fy*0.4); col = lerp(col, [232,232,236], Math.max(0, hs)*0.8); col = col.map(v=>v - Math.max(0,-hs)*30) as RGB; }
      // sandy coast band
      const ds = dToSea[fy*W+fx];
      if (ds <= 1) col = lerp(SAND, col, 0.45); else if (ds === 2) col = lerp(SAND, col, 0.78);
    }
    const r = Math.max(0, Math.min(255, col[0]))|0, g = Math.max(0, Math.min(255, col[1]))|0, b = Math.max(0, Math.min(255, col[2]))|0;
    for (let py = 0; py < PX; py++) for (let px = 0; px < PX; px++) {
      const o = (((fy*PX+py)*cw) + (fx*PX+px)) * 4;
      data[o] = r; data[o+1] = g; data[o+2] = b; data[o+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // rivers — smooth blue strokes on top
  const pxPerBase = S * PX;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const riv of RIVERS) {
    ctx.beginPath();
    riv.forEach(([x, y], i) => { const px = x * pxPerBase, py = y * pxPerBase; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.strokeStyle = 'rgba(70,120,170,0.9)'; ctx.lineWidth = pxPerBase * 0.35; ctx.stroke();
  }

  // faint pointy-top hex grid overlay — the wargame look, the way Strategic
  // Command and War in the East lay a subtle grid over painted terrain
  const R = pxPerBase / Math.sqrt(3);
  const hw = Math.sqrt(3) * R, vh = 1.5 * R;
  ctx.strokeStyle = 'rgba(255,255,255,0.055)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let row = 0; row * vh < ch + R; row++) {
    for (let col = 0; col * hw < cw + hw; col++) {
      const hx = col * hw + (row % 2 ? hw / 2 : 0), hy = R + row * vh;
      for (let i = 0; i < 6; i++) {
        const a = (-90 + 60 * i) * Math.PI / 180, px = hx + R * Math.cos(a), py = hy + R * Math.sin(a);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.lineTo(hx + R * Math.cos(-Math.PI / 2), hy + R * Math.sin(-Math.PI / 2));
    }
  }
  ctx.stroke();

  return { canvas, pxPerHex: pxPerBase };
}

export { BASE_W, BASE_H };
