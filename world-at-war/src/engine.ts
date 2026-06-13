// Game engine — ported from Realistic mode to the European hex map.
// Same rules: Dijkstra movement, ZOC, combined-arms combat, supply BFS,
// entrenchment, OOS attrition, territory ownership. Multi-nation mapped
// to binary sides: G = Axis (Germany/Italy), S = Allied (everyone else).

import { COLS, ROWS, nat, terr as hexTerrain, nations,
         cities as mapCities, NB_EVEN, NB_ODD } from './mapdata';
import { Unit, UnitKind, STARTING_UNITS, MP_MAX } from './units';

// ── Sides ─────────────────────────────────────────────────────────────────────
export type Side = 'G' | 'S';

export function nationSide(nation: string | null): Side | null {
  if (!nation) return null;
  const n = nations.find(x => x.name === nation);
  if (n?.faction === 'axis') return 'G';
  if (n?.faction === 'allies' || n?.faction === 'comintern') return 'S';
  return null;
}
export function unitSide(u: Unit): Side { return nationSide(u.nation) === 'G' ? 'G' : 'S'; }
export function enemyOf(side: Side): Side { return side === 'G' ? 'S' : 'G'; }

// ── Terrain data ─────────────────────────────────────────────────────────────
interface TerrData { move: number; def: number; name: string; dig: number; }
const TERR_DATA: Record<number, TerrData> = {
  0:  { move: 99, def: 1.00, name: 'sea',       dig: 0 },
  1:  { move: 1,  def: 1.00, name: 'plains',    dig: 2 },
  2:  { move: 2,  def: 1.35, name: 'forest',    dig: 2 },
  3:  { move: 2,  def: 1.25, name: 'hills',     dig: 2 },
  4:  { move: 3,  def: 1.60, name: 'mountain',  dig: 1 },
  5:  { move: 2,  def: 1.20, name: 'marsh',     dig: 1 },
  6:  { move: 1,  def: 0.85, name: 'steppe',    dig: 1 },
  7:  { move: 2,  def: 1.00, name: 'tundra',    dig: 1 },
  8:  { move: 1,  def: 0.90, name: 'desert',    dig: 1 },
  9:  { move: 1,  def: 1.00, name: 'medit.',    dig: 2 },
  10: { move: 2,  def: 1.10, name: 'w.steppe',  dig: 2 },
  11: { move: 2,  def: 1.25, name: 'taiga',     dig: 1 },
};
function effTerr(col: number, row: number): TerrData {
  return TERR_DATA[hexTerrain[row * COLS + col]] ?? TERR_DATA[1];
}

// ── Unit kind stats ───────────────────────────────────────────────────────────
const KINDS: Record<UnitKind, { atk: number; def: number; hq: boolean }> = {
  inf:  { atk: 6,  def: 8,  hq: false },
  arm:  { atk: 12, def: 6,  hq: false },
  mot:  { atk: 9,  def: 6,  hq: false },
  art:  { atk: 10, def: 4,  hq: false },
  hq:   { atk: 2,  def: 3,  hq: true  },
  cav:  { atk: 7,  def: 5,  hq: false },
  mtn:  { atk: 7,  def: 9,  hq: false },
  para: { atk: 8,  def: 7,  hq: false },
};

// ── Hex math ──────────────────────────────────────────────────────────────────
export function keyOf(col: number, row: number): string { return `${col},${row}`; }
export function parseKey(k: string): [number, number] {
  const [c, r] = k.split(',').map(Number); return [c, r];
}
export function passable(col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
  return nat[row * COLS + col] >= 0;
}
export function neighbors(col: number, row: number): [number, number][] {
  const nb = (row & 1) ? NB_ODD : NB_EVEN;
  const out: [number, number][] = [];
  for (const [dc, dr] of nb) {
    const nc = col + dc, nr = row + dr;
    if (nc >= 0 && nr >= 0 && nc < COLS && nr < ROWS) out.push([nc, nr]);
  }
  return out;
}
export function hexDist(c1: number, r1: number, c2: number, r2: number): number {
  const toQ = (c: number, r: number) => c - (r - (r & 1)) / 2;
  const q1 = toQ(c1, r1), q2 = toQ(c2, r2);
  const s1 = -q1 - r1, s2 = -q2 - r2;
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2));
}

// ── Binary min-heap (same as Realistic mode) ─────────────────────────────────
function makeHeap() {
  const a: [number, number, number][] = [];
  return {
    size() { return a.length; },
    push(cost: number, col: number, row: number) {
      a.push([cost, col, row]);
      let i = a.length - 1;
      while (i > 0) { const p = (i-1)>>1; if (a[p][0] <= a[i][0]) break; [a[p],a[i]]=[a[i],a[p]]; i=p; }
    },
    pop(): [number, number, number] {
      const top = a[0], last = a.pop()!;
      if (a.length) {
        a[0] = last; let i = 0;
        for (;;) { let l=2*i+1,r=l+1,s=i; if(l<a.length&&a[l][0]<a[s][0])s=l; if(r<a.length&&a[r][0]<a[s][0])s=r; if(s===i)break; [a[s],a[i]]=[a[i],a[s]]; i=s; }
      }
      return top;
    },
  };
}

// ── City state ────────────────────────────────────────────────────────────────
export interface CityState {
  name: string; col: number; row: number;
  cap: boolean; owner: Side | null; vp: number;
}

// ── Game state ────────────────────────────────────────────────────────────────
export interface GameState {
  turn: number;
  phase: Side;
  units: Unit[];
  cities: CityState[];
  ownership: Int8Array;  // COLS*ROWS: 0=none 1=G 2=S
  stats: Record<Side, { lost: number; killed: number }>;
}

let G: GameState;
export function getG(): GameState { return G; }

// ── Unit & city lookups ───────────────────────────────────────────────────────
export function unitAt(col: number, row: number): Unit | undefined {
  return G.units.find(u => u.col === col && u.row === row);
}
export function unitsOf(side: Side): Unit[] {
  return G.units.filter(u => unitSide(u) === side);
}
export function cityAt(col: number, row: number): CityState | undefined {
  return G.cities.find(c => c.col === col && c.row === row);
}
function killUnit(u: Unit): void { G.units = G.units.filter(x => x.id !== u.id); }

// ── ZOC & supply ──────────────────────────────────────────────────────────────
export function computeZOC(side: Side): Set<string> {
  const z = new Set<string>();
  for (const u of unitsOf(side))
    for (const [nc, nr] of neighbors(u.col, u.row)) z.add(keyOf(nc, nr));
  return z;
}

const SUPPLY_RANGE = 8;
// Major supply hubs per side — supply radiates Dijkstra from these when held
const SUPPLY_HUBS: Record<Side, string[]> = {
  G: ['Berlin','Vienna','Munich','Rome','Milan','Cologne','Frankfurt','Budapest'],
  S: ['Paris','London','Warsaw','Moscow','Leningrad','Kiev','Minsk','Smolensk',
      'Bucharest','Belgrade','Athens'],
};

export function computeSupply(side: Side): Set<string> {
  const foe = enemyOf(side);
  const foeZOC = computeZOC(foe);
  const occ: Record<string, Side> = {};
  for (const u of G.units) occ[keyOf(u.col, u.row)] = unitSide(u);

  const myCities = G.cities.filter(c => c.owner === side);
  const cityKeys = new Set(myCities.map(c => keyOf(c.col, c.row)));

  const dist = new Map<string, number>();
  const heap = makeHeap();
  const seed = (col: number, row: number) => {
    const k = keyOf(col, row);
    if (!dist.has(k)) { dist.set(k, 0); heap.push(0, col, row); }
  };

  // Seed from named hubs (if owned) + all owned cities act as depots
  for (const name of SUPPLY_HUBS[side]) {
    const c = G.cities.find(x => x.name === name && x.owner === side);
    if (c && passable(c.col, c.row) && occ[keyOf(c.col, c.row)] !== foe) seed(c.col, c.row);
  }
  for (const c of myCities)
    if (passable(c.col, c.row) && occ[keyOf(c.col, c.row)] !== foe) seed(c.col, c.row);

  while (heap.size()) {
    const [cost, col, row] = heap.pop();
    const k = keyOf(col, row);
    if (cost > (dist.get(k) ?? 1e9)) continue;
    for (const [nc, nr] of neighbors(col, row)) {
      const nk = keyOf(nc, nr);
      if (!passable(nc, nr) || occ[nk] === foe) continue;
      if (foeZOC.has(nk) && occ[nk] !== side) continue;
      let nc2 = cost + 1;
      if (nc2 > SUPPLY_RANGE) continue;
      if (cityKeys.has(nk)) nc2 = 0;  // city within reach = forward depot
      if (nc2 < (dist.get(nk) ?? 1e9)) { dist.set(nk, nc2); heap.push(nc2, nc, nr); }
    }
  }
  return new Set(dist.keys());
}

export function refreshSupply(): void {
  const nets = { G: computeSupply('G'), S: computeSupply('S') };
  for (const u of G.units) u.oos = !nets[unitSide(u)].has(keyOf(u.col, u.row));
  claimTerritory();
}

// ── Movement ──────────────────────────────────────────────────────────────────
function moveCost(_u: Unit, col: number, row: number): number {
  return effTerr(col, row).move;
}

function underHQ(u: Unit): boolean {
  if (KINDS[u.kind].hq) return false;
  const side = unitSide(u);
  return unitsOf(side).some(h => KINDS[h.kind].hq && hexDist(u.col, u.row, h.col, h.row) <= 5);
}

export function computeReachable(u: Unit): Map<string, number> {
  const side = unitSide(u);
  const mp = MP_MAX[u.kind] + (underHQ(u) ? 1 : 0);
  const foeZOC = computeZOC(enemyOf(side));
  const occ: Record<string, Side> = {};
  for (const t of G.units) if (t.id !== u.id) occ[keyOf(t.col, t.row)] = unitSide(t);

  const best = new Map<string, number>([[keyOf(u.col, u.row), 0]]);
  const heap = makeHeap();
  heap.push(0, u.col, u.row);

  while (heap.size()) {
    const [cost, col, row] = heap.pop();
    const k = keyOf(col, row);
    if (cost > (best.get(k) ?? 1e9)) continue;
    if (foeZOC.has(k) && !(col === u.col && row === u.row)) continue;
    for (const [nc, nr] of neighbors(col, row)) {
      if (!passable(nc, nr)) continue;
      const nk = keyOf(nc, nr);
      if (occ[nk] === enemyOf(side)) continue;
      const nc2 = cost + moveCost(u, nc, nr);
      if (nc2 > mp) continue;
      if (nc2 < (best.get(nk) ?? 1e9)) { best.set(nk, nc2); heap.push(nc2, nc, nr); }
    }
  }
  best.delete(keyOf(u.col, u.row));
  for (const k of [...best.keys()]) { const [c, r] = parseKey(k); if (unitAt(c, r)) best.delete(k); }
  return best;
}

export function doMove(u: Unit, col: number, row: number): void {
  u.col = col; u.row = row;
  u.moved = true; u.entrench = 0;
  const c = cityAt(col, row);
  if (c && c.owner !== unitSide(u)) c.owner = unitSide(u);
  refreshSupply();
}

export function attackableFrom(u: Unit): Set<string> {
  if (u.attacked) return new Set();
  const side = unitSide(u);
  const result = new Set<string>();
  for (const [nc, nr] of neighbors(u.col, u.row)) {
    const t = unitAt(nc, nr);
    if (t && unitSide(t) !== side) result.add(keyOf(nc, nr));
  }
  return result;
}

// ── Combat (same math as Realistic mode) ──────────────────────────────────────
const ENTRENCH_DEF = 0.12;
const OOS_ATK = 0.65, OOS_DEF = 0.80;
const HQ_MUL = 1.05;
const CONCENTRIC = 0.10;
const RETREAT_RATIO = 1.35;

function combatMods(att: Unit, def: Unit) {
  let aMul = 1, dMul = 1;
  const side = unitSide(att);
  dMul *= effTerr(def.col, def.row).def;
  if (def.entrench > 0) dMul *= 1 + ENTRENCH_DEF * def.entrench;
  if (underHQ(att)) aMul *= HQ_MUL;
  if (underHQ(def)) dMul *= HQ_MUL;
  if (att.oos) aMul *= OOS_ATK;
  if (def.oos) dMul *= OOS_DEF;
  let ring = 0;
  for (const [nc, nr] of neighbors(def.col, def.row)) {
    const t = unitAt(nc, nr);
    if (t && unitSide(t) === side && t.id !== att.id) ring++;
  }
  if (ring > 0) aMul *= 1 + CONCENTRIC * Math.min(ring, 3);
  return { aMul, dMul };
}

function combatPower(att: Unit, def: Unit) {
  const m = combatMods(att, def);
  const A = Math.max(0.1, KINDS[att.kind].atk * (att.str / 10) * m.aMul);
  const D = Math.max(0.1, KINDS[def.kind].def * (def.str / 10) * m.dMul);
  return { A, D };
}

export function previewCombat(att: Unit, def: Unit) {
  const { A, D } = combatPower(att, def);
  const r = A / D;
  return {
    ratio: r,
    defLoss: Math.min(def.str, Math.round(1.9 * r)),
    atkLoss: Math.min(att.str, Math.round(1.7 / Math.max(r, 0.35))),
    retreat: r >= RETREAT_RATIO,
    atkTerrName: effTerr(att.col, att.row).name,
    defTerrName: effTerr(def.col, def.row).name,
  };
}

function retreatHex(def: Unit, att: Unit): [number, number] | null {
  const foeZOC = computeZOC(unitSide(att));
  let best: [number, number] | null = null, bestScore = -1e9;
  for (const [nc, nr] of neighbors(def.col, def.row)) {
    if (!passable(nc, nr) || unitAt(nc, nr)) continue;
    let s = hexDist(nc, nr, att.col, att.row) * 3;
    if (foeZOC.has(keyOf(nc, nr))) s -= 8;
    if (s > bestScore) { bestScore = s; best = [nc, nr]; }
  }
  return best;
}

export interface CombatResult {
  defLoss: number; atkLoss: number; ratio: number;
  destroyed: boolean; retreated: boolean; attDestroyed: boolean;
  defFrom: [number, number]; advanced: boolean;
}

export function resolveCombat(att: Unit, def: Unit): CombatResult {
  const { A, D } = combatPower(att, def);
  const rnd = () => 0.75 + Math.random() * 0.5;
  const r = (A * rnd()) / (D * rnd());
  const defLoss = Math.min(def.str, Math.max(r > 0.8 ? 1 : 0, Math.round(1.9 * r * (0.8 + Math.random() * 0.4))));
  const atkLoss = Math.min(att.str, Math.round(1.7 / Math.max(r, 0.35) * (0.8 + Math.random() * 0.4)));
  const defFrom: [number, number] = [def.col, def.row];

  att.attacked = true; att.moved = true; att.entrench = 0;
  def.entrench = Math.max(0, def.entrench - 1);
  def.str -= defLoss; att.str -= atkLoss;
  G.stats[unitSide(def)].lost += defLoss;  G.stats[unitSide(att)].killed += defLoss;
  G.stats[unitSide(att)].lost += atkLoss;  G.stats[unitSide(def)].killed += atkLoss;

  // XP gain for both fighters
  if (att.str > 0 && !KINDS[att.kind].hq) att.xp += def.str <= 0 ? 3 : 2;
  if (def.str > 0 && !KINDS[def.kind].hq) def.xp += 2;

  const result: CombatResult = {
    defLoss, atkLoss, ratio: r,
    destroyed: false, retreated: false, attDestroyed: false,
    defFrom, advanced: false,
  };

  const attSide = unitSide(att);
  if (att.str <= 0) { killUnit(att); result.attDestroyed = true; }

  if (def.str <= 0) {
    killUnit(def); result.destroyed = true;
    if (!result.attDestroyed) {
      att.col = defFrom[0]; att.row = defFrom[1]; att.entrench = 0;
      const c = cityAt(defFrom[0], defFrom[1]);
      if (c && c.owner !== attSide) c.owner = attSide;
      result.advanced = true;
    }
  } else if (!result.attDestroyed && r >= RETREAT_RATIO && defLoss >= 2) {
    const rh = retreatHex(def, att);
    if (rh) {
      def.col = rh[0]; def.row = rh[1]; def.entrench = 0; result.retreated = true;
      // attacker advances into vacated hex
      att.col = defFrom[0]; att.row = defFrom[1]; att.entrench = 0;
      const c = cityAt(defFrom[0], defFrom[1]);
      if (c && c.owner !== attSide) c.owner = attSide;
      result.advanced = true;
    }
  }

  refreshSupply();
  return result;
}

// ── Territory ─────────────────────────────────────────────────────────────────
function claimTerritory(): void {
  const zoc = { G: computeZOC('G'), S: computeZOC('S') };
  for (const u of G.units) {
    const side = unitSide(u), me = side === 'G' ? 1 : 2;
    G.ownership[u.row * COLS + u.col] = me;
    for (const [nc, nr] of neighbors(u.col, u.row)) {
      if (!passable(nc, nr)) continue;
      const t = unitAt(nc, nr);
      if (t && unitSide(t) !== side) continue;
      if (zoc[enemyOf(side)].has(keyOf(nc, nr)) && !(t && unitSide(t) === side)) continue;
      G.ownership[nr * COLS + nc] = me;
    }
  }
  for (const c of G.cities) {
    if (c.owner) G.ownership[c.row * COLS + c.col] = c.owner === 'G' ? 1 : 2;
  }
}

// Initial control = political map: each hex belongs to its own nation's coalition.
// Neutrals (Spain, Sweden, Switzerland, the Balkans, Turkey…) stay uncontrolled (0)
// and untinted until someone invades — the front line then grows from the fighting.
function seedOwnership(): void {
  for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
    const i = row * COLS + col;
    const id = nat[i];
    if (id < 0) { G.ownership[i] = 0; continue; }
    const side = nationSide(nations[id].name);
    G.ownership[i] = side === 'G' ? 1 : side === 'S' ? 2 : 0;
  }
}

// ── Turn flow ─────────────────────────────────────────────────────────────────
function startPhase(side: Side): void {
  for (const u of unitsOf(side)) { u.moved = false; u.attacked = false; u.mp = MP_MAX[u.kind]; }
  // OOS attrition — cut-off units bleed
  for (const u of [...unitsOf(side)]) {
    if (u.oos) {
      u.str -= 1; G.stats[side].lost += 1; G.stats[enemyOf(side)].killed += 1;
      if (u.str <= 0) killUnit(u);
    }
  }
  refreshSupply();
}

export function endTurn(side: Side): void {
  // Stationary supplied units dig in
  for (const u of unitsOf(side)) {
    if (!u.moved && !u.attacked && !u.oos && u.entrench < effTerr(u.col, u.row).dig)
      u.entrench++;
  }
  if (side === 'G') {
    G.phase = 'S'; startPhase('S');
  } else {
    G.turn++;
    G.phase = 'G'; startPhase('G');
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initGame(): void {
  const units = STARTING_UNITS.map(u => ({ ...u }));

  const cities: CityState[] = mapCities.map(c => ({
    name: c.name, col: c.col, row: c.row, cap: !!c.cap,
    owner: nationSide(c.nation),
    vp: c.cap ? 2 : 1,
  }));

  G = {
    turn: 1, phase: 'G',
    units, cities,
    ownership: new Int8Array(COLS * ROWS),
    stats: { G: { lost: 0, killed: 0 }, S: { lost: 0, killed: 0 } },
  };

  seedOwnership();
  refreshSupply();
}
