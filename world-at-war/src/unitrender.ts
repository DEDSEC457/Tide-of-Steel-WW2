// NATO unit counters — ported 1:1 from Realistic mode's drawUnit() so the
// zoomed-in look matches: drop shadow, bevelled body, a PALE symbol box with a
// bright NATO symbol (infantry X, armour oval, HQ flag, motorised, cavalry,
// mountain, artillery, airborne), echelon size ticks, a dark strength badge,
// a strength bar, dig-in pips and veterancy chevrons. All vector (crisp at any
// zoom); the strength number is a big-font Text scaled down so it stays sharp.
import { Container, Graphics, Text } from 'pixi.js';
import { hexCenter, hexW, nations } from './mapdata';
import type { Unit, UnitKind, UnitSize } from './units';

// counter size, proportioned like Realistic (w≈1.34·S, h≈0.72·w)
const W = hexW * 0.90;
const H = W * 0.72;

const PALE = 0xe9e5d2;          // NATO symbol ink (bright, high contrast)
const DARK = 0x101208;

const XP_LEVELS = [5, 14, 28];
function unitLevel(xp: number) { let l = 0; for (const t of XP_LEVELS) if (xp >= t) l++; return l; }

function natColor(name: string): number {
  const n = nations.find(x => x.name === name);
  return n ? parseInt(n.color.replace('#', ''), 16) : 0x666666;
}

const echelonTicks: Record<UnitSize, number> = { bde: 1, div: 2, corps: 3, army: 4 };

function drawSymbol(g: Graphics, kind: UnitKind, bx: number, bw: number, bh: number, lw: number) {
  const half = bw/2, halfH = bh/2;
  const stroke = { color: PALE, width: lw } as const;
  switch (kind) {
    case 'inf':                                   // diagonal cross
      g.moveTo(bx-half, -halfH).lineTo(bx+half, halfH);
      g.moveTo(bx+half, -halfH).lineTo(bx-half, halfH);
      g.stroke(stroke);
      break;
    case 'arm':                                   // oval
      g.ellipse(bx, 0, bw*0.34, bh*0.30).stroke(stroke);
      break;
    case 'mot':                                   // oval + cross
      g.moveTo(bx-half, -halfH).lineTo(bx+half, halfH);
      g.moveTo(bx+half, -halfH).lineTo(bx-half, halfH);
      g.stroke(stroke);
      g.ellipse(bx, 0, bw*0.38, bh*0.22).stroke(stroke);
      break;
    case 'cav':                                   // single slash
      g.moveTo(bx-half, halfH).lineTo(bx+half, -halfH).stroke(stroke);
      break;
    case 'mtn':                                   // peak ^
      g.moveTo(bx-half*0.85, halfH*0.8).lineTo(bx, -halfH).lineTo(bx+half*0.85, halfH*0.8).stroke(stroke);
      break;
    case 'art':                                   // filled dot
      g.circle(bx, 0, bh*0.32).fill({ color: PALE });
      break;
    case 'para':                                  // arc + cross
      g.moveTo(bx-half, halfH).lineTo(bx+half, -halfH*0.4);
      g.moveTo(bx+half, halfH).lineTo(bx-half, -halfH*0.4);
      g.stroke(stroke);
      g.arc(bx, -halfH*0.4, bw*0.36, Math.PI, 0).stroke(stroke);
      break;
    case 'hq':                                    // flag on a pole
      g.rect(bx-half*0.9, -halfH, lw*1.4, bh).fill({ color: PALE });
      g.moveTo(bx-half*0.9+lw, -halfH)
       .lineTo(bx+half*0.7, -halfH+bh*0.3)
       .lineTo(bx-half*0.9+lw, -halfH+bh*0.6)
       .closePath().fill({ color: PALE });
      break;
  }
}

function drawCounter(parent: Container, u: Unit, selected: boolean) {
  const g = new Graphics();
  const body = natColor(u.nation);
  const r = W*0.11;
  const done = u.moved && u.attacked;

  // drop shadow + body
  g.roundRect(-W/2+W*0.045, -H/2+H*0.09, W, H, r).fill({ color: 0x000000, alpha: 0.38 });
  g.roundRect(-W/2, -H/2, W, H, r).fill({ color: body });

  // bevels (light top, dark bottom)
  g.moveTo(-W/2+W*0.1, -H/2+H*0.07).lineTo(W/2-W*0.1, -H/2+H*0.07).stroke({ color: 0xffffff, width: Math.max(0.4,W*0.02), alpha: 0.18 });
  g.moveTo(-W/2+W*0.1,  H/2-H*0.07).lineTo(W/2-W*0.1,  H/2-H*0.07).stroke({ color: 0x000000, width: Math.max(0.4,W*0.02), alpha: 0.30 });

  // outline: gold selected · red OOS · black otherwise
  g.roundRect(-W/2, -H/2, W, H, r).stroke({
    color: selected ? 0xffd98a : u.oos ? 0xff5340 : 0x101014,
    width: selected ? W*0.07 : u.oos ? W*0.055 : W*0.035,
  });

  // echelon ticks above the symbol box
  const n = echelonTicks[u.size], gap = W*0.08, tx0 = -(n-1)*gap/2, ty = -H*0.30;
  for (let i = 0; i < n; i++) g.moveTo(tx0+i*gap, ty-H*0.10).lineTo(tx0+i*gap, ty);
  g.stroke({ color: PALE, width: Math.max(0.4, W*0.022), alpha: 0.9 });

  // NATO symbol box (bright outline) + symbol
  const bw = W*0.50, bh = H*0.46, bx = -W*0.10, lw = Math.max(0.5, W*0.05);
  g.rect(bx-bw/2, -bh/2, bw, bh).stroke({ color: PALE, width: Math.max(0.4, W*0.03) });
  drawSymbol(g, u.kind, bx, bw, bh, lw);

  // strength badge (bottom-right)
  const badW = W*0.30, badH = H*0.34, badX = W/2 - badW - W*0.05, badY = H/2 - badH - H*0.05;
  g.roundRect(badX, badY, badW, badH, W*0.03).fill({ color: DARK });

  // strength bar (bottom edge)
  const frac = Math.max(0, Math.min(1, u.str/10));
  const barY = H/2 - H*0.09, barX = -W/2 + W*0.06, barW = W - W*0.12, barH = H*0.07;
  g.rect(barX, barY, barW, barH).fill({ color: 0x000000, alpha: 0.6 });
  g.rect(barX, barY, barW*frac, barH).fill({ color: frac>0.55 ? 0x7a9d54 : frac>0.3 ? 0xe8b34b : 0xe2493b });

  // dig-in pips (bottom-left)
  for (let i = 0; i < u.entrench; i++)
    g.rect(-W/2+W*0.06+i*W*0.10, H/2-H*0.30, W*0.075, H*0.10).fill({ color: 0xcfe6a8 });

  // veterancy chevrons (top-right)
  const lvl = unitLevel(u.xp);
  for (let i = 0; i < lvl; i++) {
    const yy = -H/2 + H*0.12 + i*H*0.13, cxp = W/2 - W*0.16;
    g.moveTo(cxp-W*0.07, yy+H*0.07).lineTo(cxp, yy).lineTo(cxp+W*0.07, yy+H*0.07)
     .stroke({ color: 0xffe27a, width: Math.max(0.4, W*0.025) });
  }

  if (done) g.roundRect(-W/2, -H/2, W, H, r).fill({ color: 0x000000, alpha: 0.33 });
  parent.addChild(g);

  // strength number — big native font scaled down → crisp at every zoom
  const t = new Text({ text: String(u.str), style: {
    fill: u.str <= 3 ? 0xff8d80 : 0xffe9a8, fontSize: 64, fontWeight: '700', fontFamily: 'Segoe UI, sans-serif',
  }});
  t.anchor.set(0.5);
  t.scale.set((badH*0.78)/64);
  t.x = badX + badW/2; t.y = badY + badH/2;
  parent.addChild(t);
}

export function buildUnitLayer(units: Unit[], PAD: number, selectedId: string | null = null): Container {
  const layer = new Container();
  for (const u of units) {
    const [x0, y0] = hexCenter(u.col, u.row);
    const cont = new Container();
    cont.x = x0 + PAD; cont.y = y0 + PAD;
    drawCounter(cont, u, selectedId === u.id);
    // unit name below the counter (large font, scaled down → sharp)
    const lbl = new Text({ text: u.name, style: {
      fill: 0xf0ece0, fontSize: 48, fontWeight: '600', fontFamily: 'Segoe UI, sans-serif',
      stroke: { color: 0x10140c, width: 6 },
    }});
    lbl.anchor.set(0.5, 0);
    lbl.scale.set((H*0.26)/48);
    lbl.y = H/2 + H*0.12;
    cont.addChild(lbl);
    layer.addChild(cont);
  }
  return layer;
}
