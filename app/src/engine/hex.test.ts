import { describe, it, expect } from 'vitest';
import { neighbors } from './hex';

describe('hex neighbours (offset grid)', () => {
  it('an interior hex has six neighbours', () => {
    expect(neighbors(5, 5, 20, 20)).toHaveLength(6);
  });

  it('a corner hex is clamped to the board', () => {
    expect(neighbors(0, 0, 20, 20).length).toBeLessThan(6);
  });

  it('adjacency is symmetric across both row parities', () => {
    const cols = 12;
    const rows = 12;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        for (const n of neighbors(x, y, cols, rows)) {
          const back = neighbors(n.x, n.y, cols, rows);
          expect(back.some((b) => b.x === x && b.y === y)).toBe(true);
        }
      }
    }
  });
});
