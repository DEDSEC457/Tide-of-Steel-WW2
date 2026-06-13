// The World at War — WebGL entry point. Boots PixiJS, bakes the Europe terrain
// to a GPU texture and lets you pan/zoom a large, smooth, hex-overlaid map.

import { Application, Container, Sprite, Texture, Graphics, Text } from 'pixi.js';
import { bakeTerrain } from './terrain';
import { CITIES } from './geography';

async function boot() {
  const app = new Application();
  await app.init({
    background: '#0c1018',
    resizeTo: window,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  document.getElementById('app')!.appendChild(app.canvas);

  // --- bake terrain → texture ---
  const { canvas, pxPerHex } = bakeTerrain();
  const terrainTex = Texture.from(canvas);
  const mapW = canvas.width, mapH = canvas.height;

  // world container that we pan/zoom
  const world = new Container();
  app.stage.addChild(world);
  const terrain = new Sprite(terrainTex);
  world.addChild(terrain);

  // --- cities layer ---
  const cityLayer = new Container();
  world.addChild(cityLayer);
  const COL = { G: 0x3c424e, S: 0xb03428, N: 0xe6e6dc } as const;
  for (const c of CITIES) {
    const px = c.x * pxPerHex, py = c.y * pxPerHex;
    const g = new Graphics();
    const r = c.capital ? 9 : 7;
    g.circle(px, py, r + 2).fill({ color: 0x0e1218, alpha: 0.85 });
    g.circle(px, py, r).fill(COL[c.side]);
    if (c.capital) g.circle(px, py, r + 4).stroke({ color: 0xe6bc46, width: 3 });
    cityLayer.addChild(g);
    const label = new Text({
      text: c.name,
      style: { fill: 0xf2f2ec, fontSize: 18, fontFamily: 'Segoe UI, sans-serif',
        stroke: { color: 0x0a0d12, width: 4 }, fontWeight: c.capital ? '700' : '400' },
    });
    label.anchor.set(0.5, 0); label.x = px; label.y = py + r + 3; label.scale.set(0.7);
    cityLayer.addChild(label);
  }

  // --- fit & center the map ---
  let scale = Math.min(window.innerWidth / mapW, window.innerHeight / mapH) * 0.98;
  const minScale = scale * 0.85, maxScale = scale * 6;
  function clamp() {
    scale = Math.max(minScale, Math.min(maxScale, scale));
    world.scale.set(scale);
    const vw = window.innerWidth, vh = window.innerHeight, sw = mapW * scale, sh = mapH * scale;
    // keep the map on-screen (centered when smaller than the viewport)
    world.x = sw <= vw ? (vw - sw) / 2 : Math.max(vw - sw, Math.min(0, world.x));
    world.y = sh <= vh ? (vh - sh) / 2 : Math.max(vh - sh, Math.min(0, world.y));
  }
  world.scale.set(scale);
  world.x = (window.innerWidth - mapW * scale) / 2;
  world.y = (window.innerHeight - mapH * scale) / 2;
  clamp();

  // --- pan ---
  let dragging = false, lastX = 0, lastY = 0;
  app.canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    world.x += e.clientX - lastX; world.y += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY; clamp();
  });
  // --- zoom around cursor ---
  app.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const wx = (e.clientX - world.x) / scale, wy = (e.clientY - world.y) / scale;
    scale *= e.deltaY < 0 ? 1.12 : 1 / 1.12;
    scale = Math.max(minScale, Math.min(maxScale, scale));
    world.scale.set(scale);
    world.x = e.clientX - wx * scale; world.y = e.clientY - wy * scale; clamp();
  }, { passive: false });

  window.addEventListener('resize', clamp);

  document.getElementById('loading')?.remove();
  const status = document.getElementById('status');
  if (status) status.textContent = `EUROPE · 1939 · ${CITIES.length} cities · ${(mapW)}×${mapH} px theatre`;
}

boot();
