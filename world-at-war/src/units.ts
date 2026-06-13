export type UnitKind = 'inf' | 'arm' | 'mot' | 'art' | 'hq' | 'cav' | 'mtn' | 'para';
export type UnitSize = 'army' | 'corps' | 'div' | 'bde';

export interface Unit {
  id: string;
  name: string;
  nation: string;
  kind: UnitKind;
  size: UnitSize;
  col: number;
  row: number;
  str: number;     // strength 1–10
  mp: number;      // remaining movement points this turn
  mpMax: number;
  moved: boolean;
  attacked: boolean;
}

export const MP_MAX: Record<UnitKind, number> = {
  inf: 3, arm: 5, mot: 4, art: 2, hq: 3, cav: 4, mtn: 2, para: 3,
};

function u(id: string, name: string, nation: string,
           kind: UnitKind, size: UnitSize,
           col: number, row: number, str: number): Unit {
  const mpMax = MP_MAX[kind];
  return { id, name, nation, kind, size, col, row, str, mp: mpMax, mpMax, moved: false, attacked: false };
}

export const STARTING_UNITS: Unit[] = [

  // ── GERMANY ──────────────────────────────────────────────────
  u('de_okh',  'OKH',         'Germany', 'hq',  'army',  54, 70, 10),
  u('de_agn',  'AG Nord',     'Germany', 'hq',  'corps', 68, 62,  8),
  u('de_3pz',  '3.Pz.Gr.',    'Germany', 'arm', 'corps', 63, 64,  8),
  u('de_4arm', '4.Armee',     'Germany', 'inf', 'army',  58, 65,  9),
  u('de_agm',  'AG Mitte',    'Germany', 'hq',  'corps', 61, 71,  8),
  u('de_2pz',  '2.Pz.Gr.',    'Germany', 'arm', 'corps', 57, 77,  8),
  u('de_9arm', '9.Armee',     'Germany', 'inf', 'army',  63, 73,  9),
  u('de_ags',  'AG Süd',      'Germany', 'hq',  'corps', 59, 87,  8),
  u('de_1pz',  '1.Pz.Gr.',    'Germany', 'arm', 'corps', 65, 80,  8),
  u('de_6arm', '6.Armee',     'Germany', 'inf', 'army',  52, 87,  9),
  u('de_obw',  'OB West',     'Germany', 'hq',  'army',  44, 80,  7),
  u('de_1w',   '1.Armee(W)',  'Germany', 'inf', 'army',  41, 75,  8),
  u('de_12w',  '12.Armee(W)', 'Germany', 'inf', 'army',  46, 81,  8),

  // ── USSR ─────────────────────────────────────────────────────
  u('su_stavka', 'Stavka',      'USSR', 'hq',  'army',  103, 57, 10),
  u('su_wf',     'W.Front',     'USSR', 'hq',  'corps',  83, 65,  8),
  u('su_1tk',    '1.Tank.Ar.',  'USSR', 'arm', 'corps',  79, 69,  8),
  u('su_10',     '10.Armee',    'USSR', 'inf', 'army',   85, 67,  9),
  u('su_nwf',    'NW.Front',    'USSR', 'hq',  'corps',  75, 53,  7),
  u('su_3',      '3.Armee',     'USSR', 'inf', 'army',   77, 60,  8),
  u('su_kmd',    'Kiev M.D.',   'USSR', 'hq',  'corps',  89, 78,  8),
  u('su_4tk',    '4.Tank.Ar.',  'USSR', 'arm', 'corps',  86, 77,  8),
  u('su_5',      '5.Armee',     'USSR', 'inf', 'army',   93, 79,  9),
  u('su_lf',     'Len.Front',   'USSR', 'hq',  'corps',  88, 42,  7),
  u('su_7',      '7.Armee',     'USSR', 'inf', 'army',   90, 46,  8),
  u('su_res',    'Reserve',     'USSR', 'inf', 'army',  103, 60, 10),
  u('su_sf',     'S.Front',     'USSR', 'inf', 'army',  101, 82,  8),

  // ── FRANCE ───────────────────────────────────────────────────
  u('fr_gqg',  'GQG',         'France', 'hq',  'army',  31, 84, 9),
  u('fr_1',    '1re Armée',   'France', 'inf', 'army',  34, 80, 9),
  u('fr_2',    '2e Armée',    'France', 'inf', 'army',  38, 83, 8),
  u('fr_3',    '3e Armée',    'France', 'inf', 'army',  28, 80, 8),
  u('fr_alps', 'Armée Alpes', 'France', 'mtn', 'army',  38, 98, 6),

  // ── UNITED KINGDOM ───────────────────────────────────────────
  u('uk_bef',  'BEF',         'United Kingdom', 'hq',  'corps', 33, 78, 8),
  u('uk_1c',   'I Corps',     'United Kingdom', 'inf', 'corps', 35, 77, 8),
  u('uk_home', 'Home Forces', 'United Kingdom', 'inf', 'army',  26, 74, 9),

  // ── POLAND ───────────────────────────────────────────────────
  u('pl_hq',   'Nacz.Dow.',     'Poland', 'hq',  'army',  69, 71, 8),
  u('pl_mod',  'Armia Modlin',  'Poland', 'inf', 'corps', 69, 68, 7),
  u('pl_poz',  'Armia Poznan',  'Poland', 'inf', 'corps', 61, 69, 7),
  u('pl_lodz', 'Armia Łódź',   'Poland', 'inf', 'corps', 66, 73, 7),
  u('pl_krak', 'Armia Kraków', 'Poland', 'inf', 'corps', 67, 79, 7),
  u('pl_karp', 'Armia Karpaty','Poland', 'inf', 'corps', 73, 83, 6),
  u('pl_prus', 'Armia Prusy',  'Poland', 'inf', 'corps', 73, 73, 7),

  // ── ITALY ────────────────────────────────────────────────────
  u('it_cs',  'Cmd.Supremo', 'Italy', 'hq',  'army',  51, 111, 7),
  u('it_1',   '1a Armata',   'Italy', 'inf', 'army',  45,  97, 7),
  u('it_alp', 'Alpini C.',   'Italy', 'mtn', 'corps', 48,  99, 6),
  u('it_8',   '8a Armata',   'Italy', 'inf', 'army',  54, 108, 6),
];
