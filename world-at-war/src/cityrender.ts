// City sprites — ported from Realistic mode's drawCity(): little skylines with
// windows, factory smokestacks, a cathedral dome and a gold star for capitals.
// Coloured by nation, scaled to the European hex so zooming in reveals the town.
import { Container, Graphics, Text } from 'pixi.js';
import { hexCenter, SIZE, nations } from './mapdata';
import type { City } from './mapdata';

const SC = SIZE / 34;                            // Realistic art was drawn at S=34

function natColor(name: string | null): number {
  const n = nations.find(x => x.name === name);
  return n ? parseInt(n.color.replace('#', ''), 16) : 0x808890;
}
function shade(rgb: number, f: number): number {
  const r=(rgb>>16)&255, g=(rgb>>8)&255, b=rgb&255;
  return (Math.min(255,r*f)<<16) | (Math.min(255,g*f)<<8) | Math.min(255,b*f);
}
function star(g: Graphics, cx: number, cy: number, rad: number, color: number, alpha = 1) {
  const pts: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI/2 + i*Math.PI/5, rr = i&1 ? rad*0.42 : rad;
    pts.push(cx + Math.cos(a)*rr, cy + Math.sin(a)*rr);
  }
  g.poly(pts).fill({ color, alpha });
}

function drawCity(g: Graphics, city: City) {
  const vp = city.cap ? 4 : 1;
  const body = natColor(city.nation), dark = shade(body, 0.72), roof = shade(body, 0.86);
  const base = 8 * SC;
  const blocks: [number, number, number][] =
    vp >= 3 ? [[-13,8,4],[-8,13,5],[-2,11,5],[4,16,5],[10,9,4]]
            : [[-7,6,5],[-1,9,6],[6,6,5]];

  const lw = Math.max(0.3, 0.9*SC);
  for (const [bx0, bh0, bw0] of blocks) {
    const bx = bx0*SC, bh = bh0*SC, bw = bw0*SC;
    g.rect(bx, base-bh, bw, bh).fill({ color: body }).stroke({ color: 0x000000, width: lw, alpha: 0.7 });
    g.rect(bx, base-bh, bw, Math.max(0.3,1.2*SC)).fill({ color: roof });
    // windows
    for (let wy = base-bh+2.5*SC; wy < base-1.5*SC; wy += 2.6*SC)
      for (let wx = bx+1*SC; wx < bx+bw-1.2*SC; wx += 2.1*SC)
        if ((((wx*7+wy*5)|0) % 3)) g.rect(wx, wy, 1.1*SC, 1.3*SC).fill({ color: 0xffd98a, alpha: 0.55 });
  }

  // factory smokestacks (capitals)
  if (vp >= 2) for (const sx0 of (vp>=3 ? [-16,14] : [13])) {
    const sx = sx0*SC;
    g.rect(sx, base-19*SC, 2.2*SC, 19*SC).fill({ color: dark });
    g.circle(sx+1*SC, base-21*SC, 2.4*SC).fill({ color: 0x969696, alpha: 0.26 });
    g.circle(sx+2.4*SC, base-24*SC, 3*SC).fill({ color: 0x969696, alpha: 0.26 });
  }

  // cathedral dome
  if (vp >= 1) {
    const dx = (vp>=3 ? -2.5 : 1)*SC;
    g.rect(dx, base-15*SC, 5*SC, 15*SC).fill({ color: body }).stroke({ color: 0x000000, width: lw, alpha: 0.7 });
    g.moveTo(dx, base-15*SC)
     .bezierCurveTo(dx-1*SC, base-21*SC, dx+1.5*SC, base-25*SC, dx+2.5*SC, base-25*SC)
     .bezierCurveTo(dx+3.5*SC, base-25*SC, dx+6*SC, base-21*SC, dx+5*SC, base-15*SC)
     .closePath().fill({ color: vp>=3 ? 0xc9a23e : shade(body, 1.15) });
    g.rect(dx+2*SC, base-29*SC, 1*SC, 4*SC).fill({ color: 0xffd34d });   // gold finial
  }

  // capital star (faint glow + solid)
  if (city.cap) {
    const sy = -24*SC;
    star(g, 0, sy, 10*SC, 0xffd34d, 0.20);
    star(g, 0, sy, 5*SC, 0xffd34d, 1);
  }
}

export function buildCityLayer(cities: City[], PAD: number): Container {
  const layer = new Container();
  for (const city of cities) {
    const [x0, y0] = hexCenter(city.col, city.row);
    const cont = new Container();
    cont.x = x0 + PAD; cont.y = y0 + PAD;
    const g = new Graphics();
    drawCity(g, city);
    cont.addChild(g);

    const lbl = new Text({ text: city.name, style: {
      fill: 0xf4f2e8, fontSize: 48, fontFamily: 'Segoe UI, sans-serif',
      fontWeight: city.cap ? '700' : '500', stroke: { color: 0x10140c, width: 7 },
    }});
    lbl.anchor.set(0.5, 0);
    lbl.scale.set((SIZE*0.52)/48);
    lbl.y = SIZE*0.55;
    cont.addChild(lbl);
    layer.addChild(cont);
  }
  return layer;
}
