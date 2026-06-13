// The World at War — WebGL entry. Bakes the accurate 1938 Europe hex map to a GPU
// texture; overlays cities, capitals and nation labels; fluid pan/zoom.
import { Application, Container, Sprite, Texture, Graphics, Text } from 'pixi.js';
import { bakeTerrain } from './terrain';
import { cities, nations, nat, COLS, ROWS, hexCenter } from './mapdata';
import { STARTING_UNITS } from './units';
import { buildUnitLayer } from './unitrender';

const PAD = 2; // matches terrain bake padding

async function boot() {
  const app = new Application();
  await app.init({ background: '#0b1016', resizeTo: window, antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
  document.getElementById('app')!.appendChild(app.canvas);

  const { canvas } = bakeTerrain();
  const mapW = canvas.width, mapH = canvas.height;
  const world = new Container(); app.stage.addChild(world);
  world.addChild(new Sprite(Texture.from(canvas)));

  const nationColor = (name: string | null) => {
    const n = nations.find(x => x.name === name); return n ? parseInt(n.color.slice(1), 16) : 0x888888;
  };

  // --- big faint nation labels at land centroids (like War in the East) ---
  const cent: Record<string, { sx: number; sy: number; n: number }> = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const id = nat[r*COLS+c]; if (id < 0) continue;
    const nm = nations[id].name, [x, y] = hexCenter(c, r); (cent[nm] ||= { sx:0, sy:0, n:0 }); cent[nm].sx += x; cent[nm].sy += y; cent[nm].n++; }
  const BIG: Record<string,string> = { USSR:'U S S R', Germany:'G E R M A N Y', France:'F R A N C E', Italy:'I T A L Y', Poland:'P O L A N D',
    Spain:'S P A I N', 'United Kingdom':'B R I T A I N', Yugoslavia:'YUGOSLAVIA', Turkey:'T U R K E Y', Romania:'ROMANIA', Sweden:'SWEDEN', Finland:'FINLAND' };
  const labelLayer = new Container(); world.addChild(labelLayer);
  for (const nm in BIG) { const c = cent[nm]; if (!c || c.n < 12) continue;
    const t = new Text({ text: BIG[nm], style: { fill: 0xffffff, fontSize: 30, fontFamily: 'Georgia, serif', fontWeight: '600' } });
    t.alpha = 0.18; t.anchor.set(0.5); t.x = c.sx/c.n + PAD; t.y = c.sy/c.n + PAD; labelLayer.addChild(t); }

  // --- cities + capitals ---
  const cityLayer = new Container(); world.addChild(cityLayer);
  for (const ct of cities) {
    const [x0, y0] = hexCenter(ct.col, ct.row), x = x0+PAD, y = y0+PAD, col = nationColor(ct.nation);
    const g = new Graphics();
    if (ct.cap) { g.rect(x-5, y-5, 10, 10).fill({ color: col }).stroke({ color: 0x10140c, width: 1.5 });
      g.circle(x, y, 8).stroke({ color: 0xe6bc46, width: 2 }); }
    else { g.circle(x, y, 3.2).fill({ color: col }).stroke({ color: 0x10140c, width: 1.2 }); }
    cityLayer.addChild(g);
    const label = new Text({ text: ct.name, style: { fill: 0xf4f2e8, fontSize: 15, fontFamily: 'Segoe UI, sans-serif',
      stroke: { color: 0x10140c, width: 3 }, fontWeight: ct.cap ? '700' : '400' } });
    label.anchor.set(0.5, 0); label.x = x; label.y = y + (ct.cap?9:5); label.scale.set(0.62); cityLayer.addChild(label);
  }

  // --- unit counters (1939 order of battle) ---
  const unitLayer = buildUnitLayer(STARTING_UNITS, PAD);
  world.addChild(unitLayer);

  // --- fit, pan, zoom ---
  let scale = Math.min(window.innerWidth/mapW, window.innerHeight/mapH) * 0.98;
  const minScale = scale * 0.8, maxScale = scale * 9;
  function clamp() {
    scale = Math.max(minScale, Math.min(maxScale, scale)); world.scale.set(scale);
    const vw = window.innerWidth, vh = window.innerHeight, sw = mapW*scale, sh = mapH*scale;
    world.x = sw <= vw ? (vw-sw)/2 : Math.max(vw-sw, Math.min(0, world.x));
    world.y = sh <= vh ? (vh-sh)/2 : Math.max(vh-sh, Math.min(0, world.y));
    // hide city labels when zoomed far out to avoid clutter
    cityLayer.alpha = scale < minScale*1.6 ? 0.0 : 1.0;
  }
  world.scale.set(scale); world.x = (window.innerWidth-mapW*scale)/2; world.y = (window.innerHeight-mapH*scale)/2; clamp();

  let dragging = false, lx = 0, ly = 0;
  app.canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', e => { if (!dragging) return; world.x += e.clientX-lx; world.y += e.clientY-ly; lx = e.clientX; ly = e.clientY; clamp(); });
  app.canvas.addEventListener('wheel', e => { e.preventDefault();
    const wx = (e.clientX-world.x)/scale, wy = (e.clientY-world.y)/scale;
    scale *= e.deltaY < 0 ? 1.12 : 1/1.12; scale = Math.max(minScale, Math.min(maxScale, scale)); world.scale.set(scale);
    world.x = e.clientX - wx*scale; world.y = e.clientY - wy*scale; clamp(); }, { passive: false });
  window.addEventListener('resize', clamp);

  document.getElementById('loading')?.remove();
  const land = nat.reduce((a, v) => a + (v >= 0 ? 1 : 0), 0);
  const status = document.getElementById('status');
  if (status) status.textContent = `EUROPE · 1938 · ${COLS}×${ROWS} hexes · ${land.toLocaleString()} land · ${cities.length} cities`;
}

boot();
