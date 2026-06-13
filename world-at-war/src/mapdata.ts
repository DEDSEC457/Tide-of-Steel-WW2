// Loads the pre-baked accurate 1938 Europe map (built by scripts/build-map.mjs):
// nation per hex, terrain per hex, cities and rivers — decoded once at startup.
import data from './europe.json';

export interface Nation { name: string; color: string; faction: string; }
export interface City { name: string; col: number; row: number; cap: number; nation: string | null; }

function unrle(rle: number[], n: number): Int16Array {
  const a = new Int16Array(n); let k = 0;
  for (let i = 0; i < rle.length; i += 2) { const v = rle[i], c = rle[i + 1]; for (let j = 0; j < c; j++) a[k++] = v; }
  return a;
}

export const COLS: number = (data as any).cols;
export const ROWS: number = (data as any).rows;
export const SIZE: number = (data as any).size;
export const nations: Nation[] = (data as any).nations;
export const nat = unrle((data as any).natRLE, COLS * ROWS);   // nation index per hex, -1 = sea
export const terr = unrle((data as any).terrRLE, COLS * ROWS);  // terrain id per hex
export const cities: City[] = (data as any).cities;
export const rivers: [number, number][][] = (data as any).rivers;

export const hexW = Math.sqrt(3) * SIZE;
export const rowStep = 1.5 * SIZE;
export const mapW = COLS * hexW;
export const mapH = (ROWS - 1) * rowStep + 2 * SIZE;

export function hexCenter(col: number, row: number): [number, number] {
  return [(col + (row & 1 ? 0.5 : 0) + 0.5) * hexW, SIZE + row * rowStep];
}
// odd-r offset neighbours
export const NB_EVEN: [number, number][] = [[1,0],[0,-1],[-1,-1],[-1,0],[-1,1],[0,1]];
export const NB_ODD:  [number, number][] = [[1,0],[1,-1],[0,-1],[-1,0],[0,1],[1,1]];

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
