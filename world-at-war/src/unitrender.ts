import { Graphics, Container, Text } from 'pixi.js';
import { hexCenter, hexW, nations } from './mapdata';
import type { Unit, UnitKind, UnitSize } from './units';

// Counter dimensions in map pixels (SIZE=8, hexW≈13.86)
const CW = hexW * 0.82;
const CH = hexW * 0.72;

function natColor(name: string): number {
  const n = nations.find(x => x.name === name);
  return n ? parseInt(n.color.replace('#', ''), 16) : 0x666666;
}

// NATO milsym inside the counter body
function drawNatoSymbol(g: Graphics, kind: UnitKind, cx: number, cy: number): void {
  const sw = CW * 0.29, sh = CH * 0.23;
  const lw = Math.max(0.7, CW * 0.09);
  const dk = { color: 0x080810, width: lw };

  switch (kind) {
    case 'inf':
      // X cross — infantry
      g.moveTo(cx - sw, cy - sh).lineTo(cx + sw, cy + sh).stroke(dk);
      g.moveTo(cx + sw, cy - sh).lineTo(cx - sw, cy + sh).stroke(dk);
      break;

    case 'arm':
      // Oval — armour
      g.ellipse(cx, cy, sw * 0.88, sh * 0.6).stroke(dk);
      break;

    case 'mot':
      // Oval + two wheel circles — motorised infantry
      g.ellipse(cx, cy - sh * 0.12, sw * 0.82, sh * 0.5).stroke(dk);
      g.circle(cx - sw * 0.32, cy + sh * 0.55, sh * 0.2).stroke(dk);
      g.circle(cx + sw * 0.32, cy + sh * 0.55, sh * 0.2).stroke(dk);
      break;

    case 'art':
      // Filled circle — artillery
      g.circle(cx, cy, sh * 0.55).fill({ color: 0x080810 });
      break;

    case 'hq':
      // H — headquarters
      g.moveTo(cx - sw * 0.44, cy - sh).lineTo(cx - sw * 0.44, cy + sh).stroke(dk);
      g.moveTo(cx + sw * 0.44, cy - sh).lineTo(cx + sw * 0.44, cy + sh).stroke(dk);
      g.moveTo(cx - sw * 0.44, cy).lineTo(cx + sw * 0.44, cy).stroke(dk);
      break;

    case 'cav':
      // Diagonal slash — cavalry
      g.moveTo(cx - sw, cy + sh).lineTo(cx + sw, cy - sh).stroke(dk);
      break;

    case 'mtn':
      // Mountain peak (^) — mountain troops
      g.moveTo(cx, cy - sh).lineTo(cx - sw * 0.65, cy + sh).stroke(dk);
      g.moveTo(cx, cy - sh).lineTo(cx + sw * 0.65, cy + sh).stroke(dk);
      break;

    case 'para':
      // X-in-circle — airborne / paratroops
      g.moveTo(cx - sw, cy - sh).lineTo(cx + sw, cy + sh).stroke(dk);
      g.moveTo(cx + sw, cy - sh).lineTo(cx - sw, cy + sh).stroke(dk);
      g.circle(cx, cy, sw * 0.88).stroke({ color: 0x080810, width: Math.max(0.5, lw * 0.65) });
      break;
  }
}

// Echelon indicator ticks above the counter top border
function drawEchelon(g: Graphics, size: UnitSize, cx: number, top: number): void {
  const counts: Record<UnitSize, number> = { bde: 1, div: 2, corps: 3, army: 4 };
  const n = counts[size];
  const lw = Math.max(0.6, CW * 0.07);
  const tickH = CH * 0.18;
  const gap = CW * 0.145;
  const x0 = cx - (n - 1) * gap * 0.5;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * gap;
    g.moveTo(x, top - tickH).lineTo(x, top).stroke({ color: 0x080810, width: lw });
  }
}

export function buildUnitLayer(units: Unit[], PAD: number): Container {
  const layer = new Container();

  for (const unit of units) {
    const [x0, y0] = hexCenter(unit.col, unit.row);
    const cx = x0 + PAD, cy = y0 + PAD;
    const col = natColor(unit.nation);
    const left = cx - CW / 2, top = cy - CH / 2;
    const bw = Math.max(0.7, CW * 0.065);

    const g = new Graphics();

    // Counter background
    g.rect(left, top, CW, CH).fill({ color: col, alpha: 0.94 });
    // Counter border
    g.rect(left, top, CW, CH).stroke({ color: 0x050508, width: bw });

    // Echelon ticks (above top edge)
    drawEchelon(g, unit.size, cx, top);

    // NATO symbol (very slightly below center to leave room for echelon visual weight)
    drawNatoSymbol(g, unit.kind, cx, cy + CH * 0.05);

    layer.addChild(g);

    // Strength number — bottom-right corner, tiny
    const fs = Math.max(3, CW * 0.32);
    const strLabel = new Text({
      text: String(unit.str),
      style: {
        fill: 0xf5f0e0,
        fontSize: fs,
        fontFamily: 'Courier New, monospace',
        fontWeight: '700',
      },
    });
    strLabel.anchor.set(1, 1);
    strLabel.x = left + CW - bw - 0.5;
    strLabel.y = top + CH - bw - 0.3;
    layer.addChild(strLabel);

    // Unit name label — appears below counter (very small; visible when zoomed in)
    const nameLabel = new Text({
      text: unit.name,
      style: {
        fill: 0xf0ece0,
        fontSize: Math.max(2.5, CW * 0.28),
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontWeight: '600',
        stroke: { color: 0x050508, width: Math.max(0.4, CW * 0.04) },
      },
    });
    nameLabel.anchor.set(0.5, 0);
    nameLabel.x = cx;
    nameLabel.y = top + CH + bw + 0.4;
    layer.addChild(nameLabel);
  }

  return layer;
}
