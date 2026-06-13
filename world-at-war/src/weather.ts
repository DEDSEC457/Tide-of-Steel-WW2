// Regional, seasonal weather — same idea as Realistic mode (clear / rain-mud /
// snow), but spread across the continent by latitude so winter snows the north
// and east while the Mediterranean only sees rain. Drives the ground tint and
// the falling snow/rain particles.
import { ROWS } from './mapdata';

export const CLEAR = 0, RAIN = 1, SNOW = 2;

// Europe window latitudes (must match scripts/build-map.mjs projection)
const LAT_MAX = 71, LAT_MIN = 32;
export function latOfRow(row: number): number {
  return LAT_MAX - (row / (ROWS - 1)) * (LAT_MAX - LAT_MIN);
}

// turn 1 = 1 Sep 1939, one week per turn
export function monthOfTurn(turn: number): number {
  return new Date(Date.UTC(1939, 8, 1) + (turn - 1) * 7 * 864e5).getUTCMonth();
}

// 0=clear 1=rain/mud 2=snow, by latitude band and month
export function weatherAt(row: number, month: number): number {
  const lat = latOfRow(row);
  const deepWinter = month === 0 || month === 1;          // Jan, Feb
  const winter = month === 11 || deepWinter;              // Dec–Feb
  const shoulder = month === 9 || month === 10 || month === 2 || month === 3; // Oct,Nov,Mar,Apr

  if (winter) {
    if (lat > 52) return SNOW;                 // the whole north & Russia under snow
    if (lat > 44) return deepWinter ? SNOW : RAIN;
    return RAIN;                               // wet winters in the south
  }
  if (shoulder) {
    if (lat > 58) return SNOW;                 // early/late snow in the far north
    if (lat > 46) return RAIN;                 // the rasputitsa mud belt
    return CLEAR;
  }
  // late spring through early autumn: mostly clear, rain only in the far north
  if (lat > 62 && (month === 4 || month === 8)) return RAIN;
  return CLEAR;
}

export function seasonName(month: number): string {
  return ['Winter','Winter','Spring','Spring','Spring','Summer',
          'Summer','Summer','Autumn','Autumn','Autumn','Winter'][month];
}
