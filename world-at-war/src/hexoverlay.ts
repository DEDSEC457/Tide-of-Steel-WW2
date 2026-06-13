// Draws the selection / movement / attack hex overlays on top of the terrain.

import { Graphics } from 'pixi.js';
import { hexCenter, SIZE } from './mapdata';

const R = SIZE;  // hex radius (same as terrain bake)

function hexPath(g: Graphics, col: number, row: number, PAD: number): void {
  const [cx0, cy0] = hexCenter(col, row);
  const cx = cx0 + PAD, cy = cy0 + PAD;
  g.beginPath?.();
  for (let i = 0; i < 6; i++) {
    const a = (-90 + 60 * i) * Math.PI / 180;
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.closePath?.();
}

export function drawOverlay(
  g: Graphics,
  PAD: number,
  selectedCol: number | null, selectedRow: number | null,
  reachable: Map<string, number> | null,
  attackable: Set<string> | null,
): void {
  g.clear();

  // Reachable move hexes — teal fill
  if (reachable) {
    for (const k of reachable.keys()) {
      const [c, r] = k.split(',').map(Number);
      hexPath(g, c, r, PAD);
      g.fill({ color: 0x40c0c0, alpha: 0.30 });
      g.stroke({ color: 0x30a8a8, width: 0.8, alpha: 0.70 });
    }
  }

  // Attackable hexes — red fill
  if (attackable) {
    for (const k of attackable) {
      const [c, r] = k.split(',').map(Number);
      hexPath(g, c, r, PAD);
      g.fill({ color: 0xe04040, alpha: 0.40 });
      g.stroke({ color: 0xc02020, width: 1.0, alpha: 0.85 });
    }
  }

  // Selected hex — bright yellow border
  if (selectedCol !== null && selectedRow !== null) {
    hexPath(g, selectedCol, selectedRow, PAD);
    g.fill({ color: 0xffd700, alpha: 0.18 });
    g.stroke({ color: 0xffd700, width: 1.4, alpha: 0.95 });
  }
}
