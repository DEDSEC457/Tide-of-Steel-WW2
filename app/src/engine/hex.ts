// Offset-hex grid math (pointy-top, odd-r layout) — ported verbatim from the
// legacy wwNb(). The first typed module of the engine; later ports build on it.

export interface Hex {
  x: number;
  y: number;
}

const ODD_R: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]];
const EVEN_R: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];

/** In-bounds neighbours of (x, y) on a cols×rows offset-hex grid. */
export function neighbors(x: number, y: number, cols: number, rows: number): Hex[] {
  const deltas = (y & 1) ? ODD_R : EVEN_R;
  const out: Hex[] = [];
  for (const [dx, dy] of deltas) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) out.push({ x: nx, y: ny });
  }
  return out;
}
