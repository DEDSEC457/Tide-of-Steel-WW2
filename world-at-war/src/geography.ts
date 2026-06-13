// Europe geography: coastline polygons, terrain features, rivers and cities,
// rasterised to a terrain grid at any resolution. Coordinates live in a base
// grid (BASE_W x BASE_H); the renderer bakes this to pixels at high resolution.

export const BASE_W = 92;
export const BASE_H = 64;

export type Terr = '~' | '.' | 'f' | 'm' | 'h' | 's' | 'r'; // sea, plains, forest, mountain, hills, marsh, river
type Poly = [number, number][];

const LAND: Record<string, Poly> = {
  iceland: [[3,9],[7,8],[10,10],[9,12],[5,13],[2,11]],
  ireland: [[19,26],[23,26],[24,29],[22,32],[18,31],[18,28]],
  britain: [[27,18],[29,22],[29,26],[31,28],[30,31],[28,32],[27,30],[26,32],[25,29],[25,23],[26,20]],
  iberia: [[15,45],[21,44],[27,45],[31,48],[29,53],[25,57],[20,57],[17,55],[15,50],[14,47]],
  france: [[25,32],[28,31],[34,31],[39,33],[40,38],[38,44],[34,45],[29,46],[25,45],[23,39],[24,35],[23,34],[25,33]],
  central: [[34,28],[36,26],[40,27],[45,27],[51,27],[58,28],[59,32],[56,36],[51,37],[47,36],[44,36],[41,36],[39,35],[38,32],[36,30],[34,30]],
  jutland: [[39,21],[41,21],[42,25],[39,26],[38,23]], zealand: [[43,23],[45,23],[45,25],[43,25]],
  italy: [[37,38],[41,38],[42,40],[41,42],[43,44],[44,47],[45,49],[44,50],[42,48],[41,45],[40,43],[39,41],[37,39]],
  sicily: [[41,52],[44,52],[44,54],[41,54],[40,53]],
  sardinia: [[34,45],[36,45],[36,49],[34,49]], corsica: [[35,42],[36,42],[36,44],[35,44]],
  balkans: [[48,37],[51,37],[55,38],[60,38],[60,41],[58,43],[59,45],[57,47],[56,49],[54,49],[52,47],[51,44],[50,41],[49,39]],
  greece: [[51,46],[56,46],[56,51],[54,53],[51,53],[50,49]], crete: [[54,55],[58,55],[58,56],[54,56]],
  east: [[59,28],[58,23],[59,19],[62,18],[64,14],[66,9],[69,4],[77,3],[91,6],[91,46],[79,45],[73,44],[70,44],[67,44],[64,42],[62,39],[60,38]],
  scandinavia: [[39,19],[40,13],[42,8],[45,4],[48,3],[50,7],[51,12],[50,16],[48,18],[45,19],[42,18]],
  finland: [[51,12],[54,7],[59,6],[62,9],[62,15],[59,16],[55,16],[52,14]],
  nafrica: [[8,59],[31,58],[47,59],[64,60],[70,63],[8,63]],
  anatolia: [[58,48],[64,47],[73,48],[74,51],[60,52],[57,50]],
};
const SEA: Record<string, Poly> = {
  baltic: [[44,19],[51,18],[58,20],[58,25],[52,26],[46,25],[44,22]],
  bothnia: [[50,9],[54,8],[54,17],[51,17],[50,13]], gulf_fin: [[56,17],[62,16],[62,18],[56,18]],
  blacksea: [[60,40],[68,40],[74,43],[71,45],[62,44],[60,42]], azov: [[69,39],[72,39],[72,42],[69,42]],
  adriatic: [[43,40],[47,41],[51,46],[52,49],[50,50],[47,47],[45,44],[43,42]],
  tyrrhenian: [[37,43],[40,45],[41,49],[38,50],[36,47],[36,44]],
  aegean: [[55,47],[59,47],[59,53],[56,53],[55,50]],
  med: [[16,54],[42,55],[60,56],[71,59],[12,59],[12,55]],
  channel: [[25,31],[34,32],[34,34],[25,34]], biscay: [[14,39],[23,39],[23,46],[14,48]], oresund: [[42,22],[43,22],[43,26],[42,26]],
};
const CRIMEA: Poly = [[64,42],[67,42],[67,44],[64,44]];

// mountain / forest / marsh accent clusters (centre, radius)
const MOUNT: [number, number, number][] = [
  [41,38,1],[43,38,1],[39,37,1],[37,38,1], [27,45,1],[29,45,1],[25,46,1],
  [74,43,1],[77,44,1], [40,42,0],[42,45,0],[43,47,0],
  [40,8,0],[41,11,0],[42,15,0],[43,17,0], [53,35,1],[56,36,1],
];
const HILLS: [number, number, number][] = [[24,49,1],[26,50,1]];
const FOREST: [number, number, number][] = [
  [46,30,1],[50,31,1],[60,28,1],[66,25,1],[72,23,1],[78,28,1],[46,12,1],[57,11,1],[28,40,1],
  [70,18,1],[80,22,1],[63,32,1],[55,33,1],
];
const MARSH: [number, number, number][] = [[60,33,1],[62,34,1]];

// rivers as polylines (base coords)
export const RIVERS: Poly[] = [
  [[38,29],[38,31],[37,33],[37,35],[38,37]],                 // Rhine
  [[62,36],[62,38],[61,40],[62,42]],                          // Dnieper
  [[84,27],[84,30],[83,33],[84,37]],                          // Volga
  [[50,41],[53,41],[56,41],[60,41]],                          // Danube
  [[55,28],[55,31],[54,34]],                                  // Vistula
];

export interface City { name: string; x: number; y: number; side: 'G' | 'S' | 'N'; capital?: boolean; }
export const CITIES: City[] = [
  { name:'Reykjavik', x:5, y:11, side:'S' },
  { name:'London', x:28, y:30, side:'S', capital:true }, { name:'Dublin', x:21, y:29, side:'S' },
  { name:'Paris', x:32, y:39, side:'G', capital:true }, { name:'Madrid', x:24, y:50, side:'N' }, { name:'Lisbon', x:18, y:52, side:'N' },
  { name:'Berlin', x:45, y:30, side:'G', capital:true }, { name:'Hamburg', x:40, y:28, side:'G' },
  { name:'Copenhagen', x:41, y:24, side:'G' }, { name:'Oslo', x:42, y:16, side:'G' }, { name:'Stockholm', x:49, y:14, side:'N' }, { name:'Helsinki', x:58, y:13, side:'G' },
  { name:'Rome', x:42, y:46, side:'G', capital:true }, { name:'Milan', x:39, y:40, side:'G' },
  { name:'Warsaw', x:54, y:30, side:'G' }, { name:'Vienna', x:48, y:35, side:'G' }, { name:'Budapest', x:51, y:38, side:'G' },
  { name:'Belgrade', x:52, y:41, side:'G' }, { name:'Bucharest', x:58, y:40, side:'G' }, { name:'Athens', x:53, y:51, side:'G' },
  { name:'Minsk', x:60, y:29, side:'S' }, { name:'Kiev', x:63, y:35, side:'S' }, { name:'Moscow', x:73, y:26, side:'S', capital:true },
  { name:'Smolensk', x:65, y:28, side:'S' }, { name:'Stalingrad', x:82, y:38, side:'S' }, { name:'Rostov', x:74, y:40, side:'S' },
  { name:'Odessa', x:60, y:39, side:'S' }, { name:'Sevastopol', x:65, y:43, side:'S' },
  { name:'Murmansk', x:69, y:5, side:'S' }, { name:'Leningrad', x:63, y:19, side:'S' }, { name:'Konigsberg', x:55, y:28, side:'G' }, { name:'Riga', x:59, y:24, side:'S' },
  { name:'Tripoli', x:44, y:60, side:'G' }, { name:'Cairo', x:64, y:62, side:'S' }, { name:'Istanbul', x:61, y:49, side:'N' },
];

function fillPoly(grid: Terr[][], poly: Poly, ch: Terr, S: number) {
  const H = grid.length, W = grid[0].length;
  let mn = Infinity, mx = -Infinity;
  for (const [, y] of poly) { mn = Math.min(mn, y); mx = Math.max(mx, y); }
  for (let yy = Math.max(0, Math.floor(mn * S)); yy <= Math.min(H - 1, Math.ceil(mx * S)); yy++) {
    const y = yy / S, xs: number[] = [];
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2)
      for (let xx = Math.ceil(xs[k] * S); xx <= Math.floor(xs[k + 1] * S); xx++)
        if (xx >= 0 && xx < W) grid[yy][xx] = ch;
  }
}
function blot(grid: Terr[][], cx: number, cy: number, r: number, ch: Terr, S: number) {
  const H = grid.length, W = grid[0].length;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.abs(dx) + Math.abs(dy) > r + 1) continue;
    const X = Math.round((cx + dx) * S), Y = Math.round((cy + dy) * S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const yy = Y + j, xx = X + i;
      if (yy >= 0 && yy < H && xx >= 0 && xx < W && grid[yy][xx] === '.') grid[yy][xx] = ch;
    }
  }
}

/** Rasterise the whole of Europe to a terrain grid at S sub-cells per base hex. */
export function rasterize(S: number): { grid: Terr[][]; W: number; H: number } {
  const W = BASE_W * S, H = BASE_H * S;
  const grid: Terr[][] = Array.from({ length: H }, () => new Array<Terr>(W).fill('~'));
  for (const k in LAND) fillPoly(grid, LAND[k], '.', S);
  for (const k in SEA) fillPoly(grid, SEA[k], '~', S);
  fillPoly(grid, CRIMEA, '.', S);
  for (const [x, y, r] of MOUNT) blot(grid, x, y, r, 'm', S);
  for (const [x, y, r] of HILLS) blot(grid, x, y, r, 'h', S);
  for (const [x, y, r] of FOREST) blot(grid, x, y, r, 'f', S);
  for (const [x, y, r] of MARSH) blot(grid, x, y, r, 's', S);
  return { grid, W, H };
}
