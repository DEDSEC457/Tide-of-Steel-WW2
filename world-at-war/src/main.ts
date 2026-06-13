// The World at War — WebGL entry. Terrain, cities, 1938 NATO counters, playable
// hex movement & combat ported from Realistic mode.
import { Application, Container, Sprite, Texture, Graphics, Text } from 'pixi.js';
import { bakeTerrain } from './terrain';
import { cities, nations, nat, COLS, ROWS, hexCenter, hexW, SIZE } from './mapdata';
import { buildUnitLayer } from './unitrender';
import { drawOverlay } from './hexoverlay';
import {
  initGame, getG, endTurn,
  unitAt, unitSide, keyOf, passable,
  computeReachable, attackableFrom, doMove, resolveCombat,
  type CombatResult,
} from './engine';

const PAD = 2;

async function boot() {
  // ── Init game engine ────────────────────────────────────────────────────────
  initGame();

  // ── PixiJS app ──────────────────────────────────────────────────────────────
  const app = new Application();
  await app.init({ background: '#0b1016', resizeTo: window, antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true });
  document.getElementById('app')!.appendChild(app.canvas);

  // ── Bake terrain ─────────────────────────────────────────────────────────────
  const { canvas } = bakeTerrain();
  const mapW = canvas.width, mapH = canvas.height;
  const world = new Container(); app.stage.addChild(world);
  world.addChild(new Sprite(Texture.from(canvas)));

  // ── Nation labels ─────────────────────────────────────────────────────────────
  const cent: Record<string, { sx: number; sy: number; n: number }> = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const id = nat[r*COLS+c]; if (id < 0) continue;
    const nm = nations[id].name, [x, y] = hexCenter(c, r);
    (cent[nm] ||= { sx: 0, sy: 0, n: 0 }); cent[nm].sx += x; cent[nm].sy += y; cent[nm].n++;
  }
  const BIG: Record<string, string> = {
    USSR: 'U S S R', Germany: 'G E R M A N Y', France: 'F R A N C E',
    Italy: 'I T A L Y', Poland: 'P O L A N D', Spain: 'S P A I N',
    'United Kingdom': 'B R I T A I N', Yugoslavia: 'YUGOSLAVIA',
    Turkey: 'T U R K E Y', Romania: 'ROMANIA', Sweden: 'SWEDEN', Finland: 'FINLAND',
  };
  const labelLayer = new Container(); world.addChild(labelLayer);
  for (const nm in BIG) {
    const c = cent[nm]; if (!c || c.n < 12) continue;
    const t = new Text({ text: BIG[nm], style: { fill: 0xffffff, fontSize: 30, fontFamily: 'Georgia, serif', fontWeight: '600' } });
    t.alpha = 0.18; t.anchor.set(0.5); t.x = c.sx/c.n + PAD; t.y = c.sy/c.n + PAD; labelLayer.addChild(t);
  }

  // ── Cities + capitals ─────────────────────────────────────────────────────────
  const nationColor = (name: string | null) => {
    const n = nations.find(x => x.name === name); return n ? parseInt(n.color.slice(1), 16) : 0x888888;
  };
  const cityLayer = new Container(); world.addChild(cityLayer);
  for (const ct of cities) {
    const [x0, y0] = hexCenter(ct.col, ct.row), x = x0+PAD, y = y0+PAD, col = nationColor(ct.nation);
    const g = new Graphics();
    if (ct.cap) {
      g.rect(x-5, y-5, 10, 10).fill({ color: col }).stroke({ color: 0x10140c, width: 1.5 });
      g.circle(x, y, 8).stroke({ color: 0xe6bc46, width: 2 });
    } else {
      g.circle(x, y, 3.2).fill({ color: col }).stroke({ color: 0x10140c, width: 1.2 });
    }
    cityLayer.addChild(g);
    const label = new Text({ text: ct.name, style: {
      fill: 0xf4f2e8, fontSize: 15, fontFamily: 'Segoe UI, sans-serif',
      stroke: { color: 0x10140c, width: 3 }, fontWeight: ct.cap ? '700' : '400',
    }});
    label.anchor.set(0.5, 0); label.x = x; label.y = y + (ct.cap ? 9 : 5); label.scale.set(0.62);
    cityLayer.addChild(label);
  }

  // ── Hex overlay (selection / move / attack highlights) ────────────────────────
  const overlayG = new Graphics(); world.addChild(overlayG);

  // ── Unit counter layer ────────────────────────────────────────────────────────
  let unitLayer = buildUnitLayer(getG().units, PAD);
  world.addChild(unitLayer);

  // ── Selection state ────────────────────────────────────────────────────────────
  let selectedId: string | null = null;
  let reachable: Map<string, number> | null = null;
  let attackable: Set<string> | null = null;

  function selectedUnit() { return selectedId ? getG().units.find(u => u.id === selectedId) : null; }

  function rebuildUnits() {
    world.removeChild(unitLayer);
    unitLayer.destroy({ children: true });
    unitLayer = buildUnitLayer(getG().units, PAD);
    world.addChild(unitLayer);
  }

  function updateOverlay() {
    const sel = selectedUnit();
    const sc = sel ? sel.col : null, sr = sel ? sel.row : null;
    drawOverlay(overlayG, PAD, sc, sr, reachable, attackable);
  }

  function select(id: string | null) {
    selectedId = id;
    const u = selectedUnit();
    if (u && unitSide(u) === getG().phase && !u.moved) {
      reachable = computeReachable(u);
      attackable = attackableFrom(u);
    } else {
      reachable = null;
      attackable = u ? attackableFrom(u) : null;
    }
    updateOverlay();
    updateInfoPanel();
  }

  function deselect() { selectedId = null; reachable = null; attackable = null; updateOverlay(); updateInfoPanel(); }

  // ── Pixel → hex ────────────────────────────────────────────────────────────────
  // Pointy-top odd-r offset: given canvas pixel (px,py) return (col,row)
  function pixelToHex(px: number, py: number): [number, number] {
    // un-pad
    const x = px - PAD, y = py - PAD;
    // fractional axial
    const fRow = (y - SIZE) / (1.5 * SIZE);
    const row = Math.round(fRow);
    const fCol = (x / hexW) - (row & 1 ? 0.5 : 0) - 0.5;
    const col = Math.round(fCol);
    // nearest-center tie-break
    const [cx, cy] = hexCenter(col, row);
    let bestCol = col, bestRow = row, bestDist2 = (x-cx)**2 + (y-cy)**2;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const tc = col+dc, tr = row+dr;
      if (tc < 0 || tr < 0 || tc >= COLS || tr >= ROWS) continue;
      const [tcx, tcy] = hexCenter(tc, tr);
      const d2 = (x-tcx)**2 + (y-tcy)**2;
      if (d2 < bestDist2) { bestDist2 = d2; bestCol = tc; bestRow = tr; }
    }
    return [bestCol, bestRow];
  }

  // ── Combat result display ──────────────────────────────────────────────────────
  function showCombatResult(res: CombatResult, attName: string, defName: string) {
    const panel = document.getElementById('combat-result')!;
    const lines: string[] = [];
    lines.push(`${attName} attacks ${defName}`);
    lines.push(`Ratio: ${res.ratio.toFixed(2)}:1`);
    lines.push(`Attacker loses: ${res.atkLoss}  Defender loses: ${res.defLoss}`);
    if (res.destroyed) lines.push('⚔ Defender DESTROYED');
    else if (res.retreated) lines.push('↩ Defender retreated');
    if (res.advanced) lines.push('→ Attacker advances');
    if (res.attDestroyed) lines.push('💀 Attacker DESTROYED');
    panel.textContent = lines.join('\n');
    panel.style.display = 'block';
    setTimeout(() => { panel.style.display = 'none'; }, 4000);
  }

  // ── Click handler ──────────────────────────────────────────────────────────────
  let clickMoved = false;

  app.canvas.addEventListener('pointerdown', () => { clickMoved = false; });

  app.canvas.addEventListener('pointerup', e => {
    if (clickMoved) return;
    const G = getG();

    // Convert screen → world → hex
    const wx = (e.clientX - world.x) / scale;
    const wy = (e.clientY - world.y) / scale;
    const [col, row] = pixelToHex(wx, wy);
    if (!passable(col, row)) { deselect(); return; }

    const clickKey = keyOf(col, row);
    const clickedUnit = unitAt(col, row);
    const sel = selectedUnit();

    // ── Attack ────────────────────────────────────────────────────────────────
    if (sel && attackable?.has(clickKey) && clickedUnit && unitSide(clickedUnit) !== G.phase) {
      const res = resolveCombat(sel, clickedUnit);
      showCombatResult(res, sel.name, clickedUnit.name);
      deselect();
      rebuildUnits();
      updateTurnUI();
      return;
    }

    // ── Move ──────────────────────────────────────────────────────────────────
    if (sel && reachable?.has(clickKey) && !clickedUnit) {
      doMove(sel, col, row);
      // recompute attackable from new position (can still attack after moving)
      const newAttackable = attackableFrom(sel);
      attackable = newAttackable.size > 0 ? newAttackable : null;
      reachable = null;
      updateOverlay();
      rebuildUnits();
      updateInfoPanel();
      return;
    }

    // ── Select friendly unit ──────────────────────────────────────────────────
    if (clickedUnit && unitSide(clickedUnit) === G.phase) {
      select(clickedUnit.id);
      return;
    }

    deselect();
  });

  // ── Pan & zoom (with drag-vs-click detection) ──────────────────────────────────
  let dragging = false, lx = 0, ly = 0;
  app.canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; });
  window.addEventListener('pointerup', () => { dragging = false; });
  window.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    if (Math.abs(dx) + Math.abs(dy) > 4) clickMoved = true;
    world.x += dx; world.y += dy; lx = e.clientX; ly = e.clientY; clamp();
  });
  app.canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const wx = (e.clientX - world.x) / scale, wy = (e.clientY - world.y) / scale;
    scale *= e.deltaY < 0 ? 1.12 : 1 / 1.12;
    scale = Math.max(minScale, Math.min(maxScale, scale));
    world.scale.set(scale);
    world.x = e.clientX - wx * scale; world.y = e.clientY - wy * scale; clamp();
  }, { passive: false });
  window.addEventListener('resize', clamp);

  // ── Fit / pan / zoom helpers ──────────────────────────────────────────────────
  let scale = Math.min(window.innerWidth / mapW, window.innerHeight / mapH) * 0.98;
  const minScale = scale * 0.8, maxScale = scale * 9;
  function clamp() {
    scale = Math.max(minScale, Math.min(maxScale, scale));
    world.scale.set(scale);
    const vw = window.innerWidth, vh = window.innerHeight, sw = mapW*scale, sh = mapH*scale;
    world.x = sw <= vw ? (vw-sw)/2 : Math.max(vw-sw, Math.min(0, world.x));
    world.y = sh <= vh ? (vh-sh)/2 : Math.max(vh-sh, Math.min(0, world.y));
    cityLayer.alpha = scale < minScale * 1.6 ? 0.0 : 1.0;
  }
  world.scale.set(scale);
  world.x = (window.innerWidth - mapW * scale) / 2;
  world.y = (window.innerHeight - mapH * scale) / 2;
  clamp();

  // ── HTML UI (turn bar, info panel, end-turn button) ──────────────────────────
  const ui = document.createElement('div');
  ui.id = 'game-ui';
  ui.innerHTML = `
    <div id="turn-bar">
      <span id="turn-label">AXIS TURN — 1939</span>
      <button id="end-turn-btn">End Turn ▶</button>
    </div>
    <div id="info-panel"></div>
    <div id="combat-result"></div>
  `;
  document.body.appendChild(ui);

  const css = document.createElement('style');
  css.textContent = `
    #game-ui { position:fixed; top:0; left:0; right:0; pointer-events:none; z-index:10; font-family:'Segoe UI',sans-serif; }
    #turn-bar { display:flex; align-items:center; gap:12px; background:rgba(10,14,20,0.82); padding:6px 14px; border-bottom:1px solid #2a3a4a; }
    #turn-label { color:#e8dfc0; font-size:13px; font-weight:700; letter-spacing:.06em; flex:1; }
    #end-turn-btn { pointer-events:all; background:#2a3a2a; color:#a8d888; border:1px solid #4a6a3a; padding:5px 16px; border-radius:3px; cursor:pointer; font-size:12px; font-weight:700; }
    #end-turn-btn:hover { background:#3a4a3a; }
    #info-panel { position:fixed; bottom:0; left:0; background:rgba(10,14,20,0.88); color:#e0d8c0; padding:8px 14px; font-size:11px; min-width:200px; border-top:1px solid #2a3a4a; white-space:pre; }
    #combat-result { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(12,8,8,0.94); color:#f0d080; border:2px solid #804020; padding:16px 22px; font-size:13px; font-weight:700; white-space:pre; display:none; z-index:20; border-radius:4px; }
  `;
  document.head.appendChild(css);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function turnDate(turn: number): string {
    const d = new Date(Date.UTC(1939, 8, 1) + (turn - 1) * 7 * 864e5);
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  function updateTurnUI() {
    const G = getG();
    const side = G.phase;
    const label = document.getElementById('turn-label')!;
    const sideLabel = side === 'G' ? '⚔ AXIS TURN' : '🛡 ALLIED TURN';
    label.textContent = `${sideLabel} — ${turnDate(G.turn)} — Turn ${G.turn}`;
    label.style.color = side === 'G' ? '#d0c080' : '#80c0d0';
  }

  function updateInfoPanel() {
    const panel = document.getElementById('info-panel')!;
    const sel = selectedUnit();
    if (!sel) { panel.textContent = ''; return; }
    const ent = sel.entrench > 0 ? ` ▮`.repeat(sel.entrench) : '';
    const oos = sel.oos ? ' [OOS]' : '';
    const mp = reachable ? ` · ${sel.mpMax + (reachable.size > 0 ? 1 : 0)} MP` : '';
    panel.textContent =
      `${sel.name} · ${sel.nation}\n` +
      `Kind: ${sel.kind.toUpperCase()} · Size: ${sel.size}\n` +
      `Strength: ${sel.str}/10${oos}${ent}${mp}`;
  }

  document.getElementById('end-turn-btn')!.addEventListener('click', () => {
    deselect();
    endTurn(getG().phase);
    rebuildUnits();
    updateTurnUI();
  });

  updateTurnUI();

  document.getElementById('loading')?.remove();
  const land = nat.reduce((a, v) => a + (v >= 0 ? 1 : 0), 0);
  const status = document.getElementById('status');
  if (status) status.textContent = `EUROPE · 1939 · ${COLS}×${ROWS} hexes · ${land.toLocaleString()} land · ${cities.length} cities`;

  // Back-to-menu button — posts message to parent if embedded as iframe
  const backBtn = document.createElement('button');
  backBtn.id = 'waw-back-btn';
  backBtn.textContent = '← MENU';
  Object.assign(backBtn.style, {
    position: 'fixed', top: '6px', right: '12px', zIndex: '200',
    background: '#141c10', color: '#90c070', border: '1px solid #364828',
    padding: '4px 12px', fontSize: '11px', letterSpacing: '.05em',
    cursor: 'pointer', fontFamily: 'inherit', borderRadius: '3px',
  });
  backBtn.onclick = () => window.parent.postMessage('waw-back', '*');
  document.body.appendChild(backBtn);
}

boot();
