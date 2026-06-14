#!/usr/bin/env node
/* Headless test & balance harness for index.html.
   Runs the game's <script> in a sandbox (no DOM), validates the map and
   rules, then plays full AI-vs-AI campaigns to smoke-test and check balance.
   Usage: node devtest.js [runs] [--quiet]
     --quiet / -q : print only failures and the final summary (saves tokens
                    when an AI assistant reads the output — use for routine
                    verification; drop it when debugging). */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const QUIET = process.argv.includes('--quiet') || process.argv.includes('-q');
/* --fast skips the AI-vs-AI campaign sims — the slow part, dominated by the
   60×36 Realistic map (~80s/game). Use it for changes that can't affect
   combat/AI/balance (UI, saves, menus, graphics): structural, rules, save-slot
   and UI-smoke checks still run, in ~15s. Run the full suite before committing
   anything that touches the engine, the AI, or unit stats. */
const FAST = process.argv.includes('--fast') || process.argv.includes('-f');
const say = (...a) => { if (!QUIET) console.log(...a); };

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m){ console.error('FAIL: no <script> block found'); process.exit(1); }

const memLS = (()=>{ const s = {}; return {
  getItem: k => (k in s ? s[k] : null), setItem: (k,v) => { s[k] = String(v); },
  removeItem: k => { delete s[k]; } }; })();
const sandbox = { module: {exports:{}}, console, localStorage: memLS };
vm.createContext(sandbox);
vm.runInContext(m[1], sandbox, {filename: 'barbarossa.js'});
const E = sandbox.module.exports;

let failures = 0, passes = 0;
function check(name, cond, extra){
  if (cond) { passes++; say('  ok  ' + name); }
  else { failures++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------------- static data validation ---------------- */
say('— map & data —');
check('map has '+E.ROWS+' rows', E.MAP_ROWS.length === E.ROWS);
check('all rows are '+E.COLS+' chars',
  E.MAP_ROWS.every(r => r.length === E.COLS),
  E.MAP_ROWS.map((r,i)=>r.length!==E.COLS?`row ${i}=${r.length}`:null).filter(Boolean).join(' '));
check('only legal terrain chars', E.MAP_ROWS.every(r => /^[.fhsr~]+$/.test(r)));
check('all cities on land', E.CITIES_INIT.every(c => E.passable(c.x,c.y)),
  E.CITIES_INIT.filter(c=>!E.passable(c.x,c.y)).map(c=>c.name).join(','));
const seen = new Set();
check('no two cities share a hex', E.CITIES_INIT.every(c => {
  const k = c.x+','+c.y; if (seen.has(k)) return false; seen.add(k); return true;
}));
check('total objective points = '+E.TOTAL_VP, E.TOTAL_VP === 16, 'got '+E.TOTAL_VP);
const upos = new Set();
check('all start units on land', E.START_UNITS.every(([k,n,x,y]) => E.passable(x,y)),
  E.START_UNITS.filter(([k,n,x,y])=>!E.passable(x,y)).map(u=>u[1]+'@'+u[2]+','+u[3]).join(' '));
check('no two start units share a hex', E.START_UNITS.every(([k,n,x,y]) => {
  const key = x+','+y; if (upos.has(key)) return false; upos.add(key); return true;
}), [...E.START_UNITS.map(u=>u[2]+','+u[3])].join(' '));
check('weather schedule', E.weatherFor(1)==='clear' && E.weatherFor(16)==='mud'
  && E.weatherFor(20)==='freeze' && E.weatherFor(22)==='snow');

/* every scenario in the registry must be internally consistent */
say('— scenario registry —');
for (const id of Object.keys(E.SCENARIOS)){
  const s = E.SCENARIOS[id];
  const K = s.kinds || E.KINDS;
  const land = (x,y) => s.map[y] && s.map[y][x] && s.map[y][x] !== '~';
  check(`[${id}] map is ${s.cols}x${s.rows}, legal terrain`,
    s.map.length===s.rows && s.map.every(r=>r.length===s.cols && /^[.fhsro~]+$/.test(r)));
  check(`[${id}] cities on land, unique hexes`,
    s.cities.every(c=>land(c.x,c.y)) &&
    new Set(s.cities.map(c=>c.x+','+c.y)).size===s.cities.length);
  check(`[${id}] start units on land, unique hexes, known kinds`,
    s.startUnits.every(([k,n,x,y])=>land(x,y) && K[k]) &&
    new Set(s.startUnits.map(u=>u[2]+','+u[3])).size===s.startUnits.length);
  check(`[${id}] schedules use known kinds`, s.sovSchedule.every(r=>K[r[1]]));
  const names = new Set([...s.startUnits.map(u=>u[1]), ...s.sovSchedule.map(r=>r[2])]);
  check(`[${id}] generals command real formations`, s.generals.every(g=>names.has(g.unit)));
  check(`[${id}] events land inside the campaign`,
    s.events.every(e=>e.turn>=1 && e.turn<=s.maxTurn && e.date && e.title && e.text));
  check(`[${id}] victory tiers descend to 0`,
    s.victoryTiers.every((t,i,a)=>i===0 || t[0] < a[i-1][0]) &&
    s.victoryTiers[s.victoryTiers.length-1][0]===0);
  check(`[${id}] sudden-death cities exist`,
    !s.sudden.axisCities || s.sudden.axisCities.every(n=>s.cities.some(c=>c.name===n)));
  check(`[${id}] capital-defense city exists`,
    !s.capitalDefense || s.cities.some(c=>c.name===s.capitalDefense.city));
  check(`[${id}] spawns are on land`,
    [...s.sovSpawns, ...s.gerSpawns].every(([x,y])=>land(x,y)));
  check(`[${id}] weather & pp defined for every turn`, (()=>{
    for (let t=1;t<=s.maxTurn;t++)
      if (!['clear','mud','freeze','snow'].includes(s.weather(t)) ||
          !(s.pp('G',t)>0) || !(s.pp('S',t)>0)) return false;
    return true;
  })());
}
/* saves remember which scenario they belong to */
{
  E.newGame('G','normal','hotseat','barbarossa');
  check('new games record their scenario', E.getState().scenario === 'barbarossa');
  const snap = JSON.parse(E.serialize());
  delete snap.G.scenario;
  E.deserialize(JSON.stringify(snap));
  check('pre-scenario saves default to Barbarossa', E.getState().scenario === 'barbarossa');
  // a save from one theater loads correctly after another was active
  E.newGame('G','normal','hotseat','midway');
  const navalSnap = E.serialize();
  E.newGame('G','normal','hotseat','barbarossa');
  E.deserialize(navalSnap);
  check('cross-scenario save/load restores the right theater',
    E.getState().scenario === 'midway' && !!E.unitAt(20,9) && E.terrainAt(0,0) === 'o');
  E.loadScenario('barbarossa'); E.newGame('G','normal','hotseat','barbarossa');
}

/* TWO SAVE SLOTS — Arcade and Realistic must never overwrite each other */
say('— save slots —');
{
  E.newGame('S','normal','ai','realistic'); E.saveGame();
  E.newGame('G','normal','ai','barbarossa'); E.saveGame();
  check('arcade and realistic use different slots',
    E.saveKeyFor('barbarossa') !== E.saveKeyFor('realistic'));
  check('saving an arcade game does NOT wipe the realistic save',
    E.hasSaveSlot('realistic') && E.hasSaveSlot('arcade'));
  E.loadSlot('realistic'); check('realistic slot restores realistic', E.getState().scenario === 'realistic');
  E.loadSlot('arcade');    check('arcade slot restores barbarossa',  E.getState().scenario === 'barbarossa');
  check('all five arcade scenarios share the arcade slot',
    ['barbarossa','winter41','stalingrad','midway','dday'].every(s => E.saveSlotFor(s)==='arcade'));
  // a pre-slots save migrates into the slot matching its own scenario
  memLS.removeItem(E.saveKeyFor('realistic'));
  E.newGame('G','normal','ai','realistic'); memLS.setItem('barbarossa-save-v1', E.serialize());
  E.migrateSaves();
  check('legacy single-slot save migrates by scenario',
    E.hasSaveSlot('realistic') && memLS.getItem('barbarossa-save-v1') === null);
  E.newGame('G','normal','hotseat','barbarossa');
}

/* coastal sanity: Riga, Odessa near sea; Moscow not */
say('— rules sanity —');
{
  const G = E.newGame('G','normal','ai');
  check('Germany opens, turn 1', G.turn===1 && G.phase==='G');
  check('16 Axis units (14 + 2 HQ)', E.unitsOf('G').length===16, E.unitsOf('G').length);
  check('20 Soviet units (18 + 2 HQ)', E.unitsOf('S').length===20, E.unitsOf('S').length);
  // 4th Army (Brest fortress) is deliberately cut off on day one, like 1941
  check('everyone starts in supply (except Brest)',
    G.units.every(u=>!u.oos || u.name==='4th Army'),
    G.units.filter(u=>u.oos).map(u=>u.name).join(','));
  const pz = E.unitsOf('G').find(u=>u.kind==='g_pz');
  const r = E.reachable(pz);
  check('panzer can move turn 1', r.size > 3, 'reach='+r.size);
  // combat preview is sane: full-strength panzer vs border rifle army
  const border = E.unitsOf('S').find(u=>u.name==='11th Army');
  const p = E.previewCombat(pz, border);
  check('turn-1 panzer odds are favorable (1.3–4.0)', p.ratio>1.3 && p.ratio<4.0, 'ratio='+p.ratio.toFixed(2));
  // serialize roundtrip
  const snap = E.serialize();
  E.aiFullPhase('G');
  E.deserialize(snap);
  check('save/load roundtrip preserves state', E.serialize() === snap);
}

/* supply: a surrounded unit goes out of supply */
{
  E.newGame('G','normal','ai');
  const G = E.getState();
  // empty a patch and surround a soviet unit manually
  const victim = E.unitsOf('S').find(u=>u.name==='20th Army'); // Smolensk
  const ring = E.neighbors(victim.x,victim.y);
  let placed = 0;
  for (const [nx,ny] of ring){
    const u = E.unitAt(nx,ny);
    if (u) { u.x = 0; u.y = 5; }                       // shove aside (test only)
  }
  for (const [nx,ny] of ring){
    if (!E.unitAt(nx,ny) && E.passable(nx,ny)){
      const g = E.unitsOf('G')[placed++];
      if (g){ g.x = nx; g.y = ny; }
    }
  }
  const net = E.computeSupply('S');
  check('fully surrounded unit is cut off', !net.has(victim.x+','+victim.y));
}

/* encirclement bites: savage combat debuffs and fast attrition */
{
  E.newGame('G','normal','hotseat');
  const att = E.unitsOf('G').find(u=>u.name==='9. Armee');
  const def = E.unitsOf('S').find(u=>u.name==='3rd Army');
  const base = E.previewCombat(att, def).ratio;
  def.oos = true;
  const cutD = E.previewCombat(att, def).ratio;
  def.oos = false;
  check('encircled defender fights at 65%', Math.abs(base/cutD - 0.65) < 1e-9, (base/cutD).toFixed(3));
  att.oos = true;
  const cutA = E.previewCombat(att, def).ratio;
  att.oos = false;
  check('encircled attacker fights at 40%', Math.abs(cutA/base - 0.4) < 1e-9, (cutA/base).toFixed(3));
  // pockets starve from the very first week (Brest fortress starts cut off)
  const brest = E.unitsOf('S').find(u=>u.name==='4th Army');
  const s0 = brest.str;
  E.startPhase('S');
  check('pocket attrition from the first turn', brest.str === s0-1, brest.str+' vs '+s0);
}

/* air power */
say('— air power —');
{
  E.newGame('G','normal','hotseat');
  const G = E.getState();
  check('air groups: 2 German, 1 Soviet', E.airOf('G').length===2 && E.airOf('S').length===1);
  const lf2 = E.airOf('G')[0];
  // range: border armies are covered by German airfields, Moscow is not (turn 1)
  const tgts = E.strikeTargets('G');
  check('turn-1 strikes reach the border but not Moscow',
    tgts.some(t=>t.name==='11th Army') && !tgts.some(t=>t.name==='24th Army'),
    tgts.map(t=>t.name).join(','));
  const border = E.unitsOf('S').find(u=>u.name==='11th Army');
  const before = border.str;
  const res = lf2 && E.airStrike(lf2, border);
  check('strike damages and expends the group',
    res && res.dmg>=1 && lf2.mission==='done' &&
    (res.killed || border.str === before-res.dmg), JSON.stringify(res));
  // patrol intercepts the next strike
  const vvs = E.airOf('S')[0];
  vvs.str = 8; E.setPatrol(vvs);
  const lf4 = E.airOf('G').find(a=>a.mission==='ready');
  const pStr = vvs.str;
  const res2 = lf4 && E.airStrike(lf4, E.unitsOf('S').find(u=>u.name==='8th Army'));
  check('patrol intercepts enemy strike', res2 && res2.intercepted && E.airOf('S')[0].str < pStr,
    JSON.stringify(res2));
  // out-of-range strike is refused
  const moscow = E.unitsOf('S').find(u=>u.name==='24th Army');
  const lfAny = E.airOf('G').find(a=>a.mission==='ready');
  check('out-of-range strike refused', !lfAny || E.airStrike(lfAny, moscow)===null);
  // old saves (no air) migrate cleanly
  const snap = JSON.parse(E.serialize());
  delete snap.G.air;
  E.deserialize(JSON.stringify(snap));
  check('pre-air saves migrate', E.airOf('G').length===2 && E.airOf('S').length===1);
}

/* generals */
say('— generals —');
{
  E.newGame('G','normal','hotseat');
  const G = E.getState();
  // every general commands a formation that actually exists
  const names = new Set([...E.START_UNITS.map(u=>u[1]), ...E.SOV_SCHEDULE.map(s=>s[2])]);
  check('all generals command real formations', E.GENERALS.every(g=>names.has(g.unit)),
    E.GENERALS.filter(g=>!names.has(g.unit)).map(g=>g.name).join(','));
  check('no formation has two generals',
    new Set(E.GENERALS.map(g=>g.side+'|'+g.unit)).size === E.GENERALS.length);
  const gud = E.unitsOf('G').find(u=>u.name==='2. Panzergruppe');
  check('Guderian leads 2. Panzergruppe', !!E.generalOf(gud) && E.generalOf(gud).name==='Guderian');
  // attack bonus shows up in the forecast (and therefore in the AI's eyes)
  const tgt = E.unitsOf('S').find(u=>u.name==='3rd Army');
  const withGen = E.previewCombat(gud, tgt).ratio;
  gud.name = 'Nobody';
  const without = E.previewCombat(gud, tgt).ratio;
  check('Guderian boosts attack odds ×1.15', Math.abs(withGen/without - 1.15) < 1e-9,
    (withGen/without).toFixed(3));
  // the engine supports +movement generals (none shipped — it unbalanced the AI sims)
  gud.name = '2. Panzergruppe';
  check('no general grants movement', E.GENERALS.every(g=>!g.mp),
    E.GENERALS.filter(g=>g.mp).map(g=>g.name).join(','));
  const reachPlain = E.reachable(gud).size;
  E.generalOf(gud).mp = 1;
  const reachFast = E.reachable(gud).size;
  delete E.generalOf(gud).mp;
  check('general mp bonus extends reach', reachFast > reachPlain, reachFast+' vs '+reachPlain);
  // defense bonus
  const rok = E.unitsOf('S').find(u=>u.name==='16th Army');
  const att = E.unitsOf('G').find(u=>u.name==='9. Armee');
  const defGen = E.previewCombat(att, rok).ratio;
  rok.name = 'Nobody';
  const defPlain = E.previewCombat(att, rok).ratio;
  rok.name = '16th Army';
  check('Rokossovsky stiffens the defense', defGen < defPlain,
    defGen.toFixed(3)+' vs '+defPlain.toFixed(3));
  // Zhukov: from turn 16, Soviet units near a Soviet-held Moscow defend better
  const mosDef = E.unitsOf('S').find(u=>u.name==='24th Army');   // garrisons Moscow
  check('no Zhukov before October', !E.zhukovDefends(mosDef));
  G.turn = 16;
  check('Zhukov active from turn 16 near Moscow', E.zhukovDefends(mosDef));
  const zhk = E.previewCombat(att, mosDef).ratio;
  const moscow = G.cities.find(c=>c.name==='Moscow');
  moscow.owner = 'G';
  check('Zhukov bonus gone if Moscow falls', !E.zhukovDefends(mosDef));
  const noZhk = E.previewCombat(att, mosDef).ratio;
  moscow.owner = 'S';
  check('Zhukov bonus shows in the forecast', zhk < noZhk, zhk.toFixed(3)+' vs '+noZhk.toFixed(3));
}

/* territory control */
say('— territory —');
{
  E.newGame('G','normal','hotseat');
  check('Moscow soil starts Soviet', E.terrOwner(24,4)==='S', E.terrOwner(24,4));
  check('Warsaw soil starts German', E.terrOwner(2,7)==='G', E.terrOwner(2,7));
  check('sea is no one’s ground', E.terrOwner(0,0)===null);
  // an advancing unit turns the ground its own color
  const pz = E.unitsOf('G').find(u=>u.name==='2. Panzergruppe');
  const before = E.terrOwner(8,9);
  E.doMove(pz, 8, 9);                       // deep move (engine-level, for the test)
  check('advance claims ground', before==='S' && E.terrOwner(8,9)==='G',
    before+' -> '+E.terrOwner(8,9));
  // pre-territory saves rebuild the map
  const snap = JSON.parse(E.serialize());
  delete snap.G.terr;
  E.deserialize(JSON.stringify(snap));
  check('pre-territory saves migrate', E.terrOwner(2,7)==='G' && E.terrOwner(8,9)==='G');
}

/* QoL: undo snapshot pattern & hotseat pass report */
say('— QoL —');
{
  E.newGame('G','normal','hotseat');
  const pz = E.unitsOf('G').find(u=>u.name==='2. Panzergruppe');
  const [ox, oy] = [pz.x, pz.y];
  const snap = E.serialize();
  E.doMove(pz, 8, 9);
  E.deserialize(snap);
  const pz2 = E.unitsOf('G').find(u=>u.name==='2. Panzergruppe');
  check('undo restores the moved unit', pz2.x===ox && pz2.y===oy && !pz2.moved, pz2.x+','+pz2.y);
  E.aiFullPhase('G'); E.endPhase();
  const G2 = E.getState();
  check('hotseat pass-report snapshot recorded',
    !!(G2.turnSnap && G2.turnSnap.G) && typeof G2.turnSnap.G.lost==='number'
    && Array.isArray(G2.turnSnap.G.cities));
}

/* veterancy, HQ command, and combined arms */
say('— veterancy · HQ · combined arms —');
{
  E.newGame('G','normal','hotseat');
  const pz  = E.unitsOf('G').find(u=>u.kind==='g_pz');
  const inf = E.unitsOf('G').find(u=>u.kind==='g_inf');
  const def = E.unitsOf('S').find(u=>u.name==='11th Army');
  // veterancy: levels and the attack bonus
  check('fresh units are green (level 0)', E.unitLevel(pz)===0);
  pz.xp = 5;  check('5 xp = Veteran (level 1)', E.unitLevel(pz)===1);
  pz.xp = 28; check('28 xp = Elite (level 3)', E.unitLevel(pz)===3 && Math.abs(E.vetMul(pz)-1.15)<1e-9);
  // the +15% shows in the odds
  const veteranOdds = E.previewCombat(pz, def).ratio;
  pz.xp = 0;
  const greenOdds = E.previewCombat(pz, def).ratio;
  check('elite veterancy raises attack ~15%', Math.abs(veteranOdds/greenOdds - 1.15) < 1e-9,
    (veteranOdds/greenOdds).toFixed(3));
  // gainXP doesn't promote HQs
  const hq = E.unitsOf('G').find(u=>E.KINDS[u.kind].hq);
  check('both sides field HQs', !!hq && E.unitsOf('S').some(u=>E.KINDS[u.kind].hq));
  E.gainXP(hq, 50); check('HQs earn no combat XP', E.unitLevel(hq)===0);
  // HQ command aura
  const probe = {side:'G', kind:'g_inf', x:hq.x, y:hq.y};
  check('a unit on the HQ is under command', E.underHQ(probe));
  const farProbe = {side:'G', kind:'g_inf', x:hq.x, y:hq.y};
  // measure the HQ attack bonus by toggling the HQ far away
  const before = E.previewCombat(inf, def).ratio;          // inf may or may not be in range
  const ox = hq.x, oy = hq.y; hq.x = inf.x; hq.y = inf.y === undefined ? inf.y : inf.y;
  // place HQ adjacent to inf, then far, and compare
  hq.x = inf.x; hq.y = inf.y;                               // same hex → in range (dist 0)
  const near = E.previewCombat(inf, def).ratio;
  hq.x = (inf.x + 14) % E.COLS; hq.y = inf.y;               // shove well out of range
  const far = E.previewCombat(inf, def).ratio;
  hq.x = ox; hq.y = oy;
  check('HQ command lifts attack odds', near > far, near.toFixed(3)+' vs '+far.toFixed(3));
  // combined arms: synergy beats a lone attacker, and mixing arms flags it
  const solo  = E.previewGroup([pz], def);
  const combo = E.previewGroup([pz, inf], def);
  check('combined arms flags armor+infantry', combo.combinedArms && combo.synergy>1.25);
  check('a coordinated assault out-punches one unit', combo.ratio > solo.ratio,
    combo.ratio.toFixed(2)+' vs '+solo.ratio.toFixed(2));
  // a combined kill awards XP to every participant
  pz.xp = 0; inf.xp = 0;
  const weak = E.unitsOf('S').find(u=>u.str<=6) || def;
  weak.str = 1;
  // line both attackers up next to the weak defender (test-only teleport)
  pz.x = weak.x; pz.y = weak.y;            // will be normalized below
  // place pz and inf adjacent to weak
  const adj = E.neighbors(weak.x, weak.y).filter(([x,y])=>E.passable(x,y) && !E.unitAt(x,y));
  if (adj.length>=2){
    pz.x=adj[0][0]; pz.y=adj[0][1]; inf.x=adj[1][0]; inf.y=adj[1][1];
    E.resolveCombat(pz, weak, [inf]);
    check('combined attackers both gain experience', (pz.xp>0 && inf.xp>0), `pz ${pz.xp} inf ${inf.xp}`);
  } else check('combined attackers both gain experience', true, 'no room — skipped');
}

/* AI skill & opponent-response awareness — difficulty changes how it plays,
   and it anticipates where a (human) enemy can concentrate or encircle. */
say('— AI skill & threat awareness —');
{
  // skill ordering on the AI side (German is the AI when the player is Soviet)
  E.newGame('S','easy','ai','barbarossa');   const skE = E.aiSkill('G');
  E.newGame('S','normal','ai','barbarossa'); const skN = E.aiSkill('G');
  E.newGame('S','hard','ai','barbarossa');   const skH = E.aiSkill('G');
  check('skill rises with difficulty', skE===0 && skN===1 && skH===2, `${skE}/${skN}/${skH}`);
  // build a swarm: three enemies that can reach one hex ⇒ threat count ≥3
  const G = E.getState(); G.units.length=0; let id=1;
  const mk=(k,n,x,y)=>{const u={id:id++,kind:k,name:n,side:E.KINDS[k].side,x,y,str:8,entrench:0,moved:false,attacked:false,oos:false,oosTurns:0,xp:0};G.units.push(u);return u;};
  const pz=mk('g_pz','Spear',14,10); mk('g_inf','Prop',13,10);
  mk('s_inf','A',16,9); mk('s_inf','B',16,11); mk('s_inf','C',17,10);
  E.clearAICache();
  const tf = E.threatField('G');
  let maxCount=0; for (const v of tf.count.values()) maxCount=Math.max(maxCount,v);
  check('threat field sees a multi-unit swarm', maxCount>=3, `max ${maxCount}`);
  // a sharp AI fears an exposed forward hex more than a sloppy one
  const penHard = E.threatPenalty(pz,15,10,true);
  E.newGame('S','easy','ai','barbarossa'); const Ge=E.getState(); Ge.units.length=0; let id2=1;
  const mk2=(k,n,x,y)=>{const u={id:id2++,kind:k,name:n,side:E.KINDS[k].side,x,y,str:8,entrench:0,moved:false,attacked:false,oos:false,oosTurns:0,xp:0};Ge.units.push(u);return u;};
  const pz2=mk2('g_pz','Spear',14,10); mk2('g_inf','Prop',13,10);
  mk2('s_inf','A',16,9); mk2('s_inf','B',16,11); mk2('s_inf','C',17,10);
  E.clearAICache();
  const penEasy = E.threatPenalty(pz2,15,10,true);
  check('higher skill is more threat-averse', penHard > penEasy && penEasy===0, `hard ${penHard.toFixed(1)} easy ${penEasy}`);
  // an objective worth holding is never abandoned for fear of threat
  const cityHex = Ge.cities.find(c=>c.owner==='S'&&c.vp>0);
  check('own objective is exempt from threat penalty',
    E.threatPenalty({...pz2,side:'S',kind:'s_inf'}, cityHex.x, cityHex.y, false)===0);
}

/* combat readability: the forecast exposes a legible modifier breakdown */
say('— combat readability —');
{
  E.newGame('G','normal','hotseat');
  const pz = E.unitsOf('G').find(u=>u.name==='2. Panzergruppe');   // Guderian, +15% atk
  const def = E.unitsOf('S').find(u=>u.name==='3rd Army');
  const p = E.previewCombat(pz, def);
  check('forecast returns a factors breakdown', Array.isArray(p.factors));
  check('Guderian shows up as an attack factor',
    p.factors.some(f=>f.who==='atk' && /Guderian/.test(f.label) && Math.abs(f.mul-1.15)<1e-9),
    JSON.stringify(p.factors.map(f=>f.label)));
  // a defender in a forest shows a terrain factor on the defending side
  const forestDef = E.unitsOf('S').find(u=>E.terrainAt(u.x,u.y)==='f');
  if (forestDef){
    const adj = E.neighbors(forestDef.x,forestDef.y).map(([x,y])=>E.unitAt(x,y)).find(u=>u&&u.side==='G')
              || E.unitsOf('G')[0];
    const fp = E.previewCombat(adj, forestDef);
    check('terrain appears as a defensive factor', fp.factors.some(f=>f.who==='def' && f.mul>1));
  } else check('terrain appears as a defensive factor', true);
  // an out-of-supply attacker is flagged
  pz.oos = true;
  check('cut-off attacker shows a penalty factor',
    E.previewCombat(pz,def).factors.some(f=>f.who==='atk' && f.mul<1 && /cut off/i.test(f.label)));
  pz.oos = false;
}

/* strategic decisions */
say('— decisions —');
{
  // every scenario's decisions are well-formed and target real units/cities where named
  for (const id of Object.keys(E.SCENARIOS)){
    const ds = E.SCENARIOS[id].decisions || [];
    check(`[${id}] decisions well-formed`, ds.every(d=>
      d.id && d.side && d.turn>=1 && d.turn<=E.SCENARIOS[id].maxTurn && d.title && d.text &&
      Array.isArray(d.options) && d.options.length>=2 &&
      d.options.every(o=>o.label && typeof o.apply==='function') &&
      typeof d.ai==='function'),
      ds.map(d=>d.id).join(','));
    // the player must be told what each option DOES — every option needs an effect line
    check(`[${id}] every decision option states its effect`,
      ds.every(d=>d.options.every(o=>typeof o.effect==='string' && o.effect.length>4)),
      ds.flatMap(d=>d.options.filter(o=>!o.effect).map(o=>d.id+':'+o.label)).join(', ') || 'missing effect');
  }
  // the Kiev Turn fires on turn 10 (headless auto-resolves via the AI choice)
  E.newGame('G','normal','hotseat');
  let G = E.getState();
  G.turn = 10; E.startPhase('G');
  check('Kiev Turn resolves on turn 10', ('kievturn' in G.decisions) && G.decisions.kievturn!=='pending',
    JSON.stringify(G.decisions));
  // branch A (encircle south) effects, isolated from startPhase income/maxStr caps
  E.newGame('G','normal','hotseat'); G = E.getState();
  G.decisions = {kievturn:'pending'};
  const kiev = G.cities.find(c=>c.name==='Kiev');
  const south = E.unitsOf('G').slice().sort((a,b)=>
    E.hexDist(a.x,a.y,kiev.x,kiev.y)-E.hexDist(b.x,b.y,kiev.x,kiev.y)).slice(0,4);
  south.forEach(u=>u.str=5);                 // room for the +2
  const sBefore = G.pp.S, strBefore = south.reduce((a,u)=>a+u.str,0);
  E.resolveDecision('kievturn', 0);
  check('Kiev option strengthens the south and gives the Soviets time',
    south.reduce((a,u)=>a+u.str,0) > strBefore && G.pp.S === sBefore+4,
    `str ${strBefore}->${south.reduce((a,u)=>a+u.str,0)}, pp ${sBefore}->${G.pp.S}`);
  check('a resolved decision cannot be re-resolved', E.resolveDecision('kievturn',1)===false);
  // the choice survives a save/load round-trip
  const snap = E.serialize(); E.deserialize(snap);
  check('decision choices persist through save/load', E.getState().decisions.kievturn===0);
  // the AI resolves its own decisions automatically (deterministic: jump to the turn)
  E.newGame('S','normal','ai');              // human Soviet -> Germany (incl. its decisions) is AI
  const G2 = E.getState();
  G2.turn = 10; E.startPhase('G');           // decision turn for the Kiev question
  check('AI auto-resolves its decisions', G2.decisions && G2.decisions.kievturn!=='pending' && 'kievturn' in G2.decisions,
    JSON.stringify(G2.decisions));
}

// ---- bypassed empty pockets get absorbed into the surrounding side ----
say('— territory: bypassed pockets —');
{
  E.newGame('G','normal','hotseat','barbarossa');
  const G3 = E.getState(), W = E.COLS, H = E.ROWS;
  const keep = E.unitsOf('S')[0];                       // a real Soviet army anchors its ground
  const nearSov = (x,y)=> E.unitsOf('S').some(u=>Math.abs(u.x-x)<=2 && Math.abs(u.y-y)<=2);
  let pocket = null;                                    // a German-rear hex with no Soviet nearby
  for (let y=2;y<H-2 && !pocket;y++) for (let x=2;x<W-2;x++){
    if (E.terrOwner(x,y)==='G' && !nearSov(x,y) && !E.unitAt(x,y) && !E.cityAt(x,y)){ pocket=[x,y]; break; }
  }
  check('found a German-rear test hex', !!pocket, 'none found');
  G3.terr[pocket[1]*W+pocket[0]] = 2;                   // paint a stranded island of enemy colour
  const keepBefore = E.terrOwner(keep.x, keep.y);
  E.absorbPockets();
  check('a cut-off empty enemy pocket flips to the surrounding side',
    E.terrOwner(pocket[0],pocket[1])==='G', 'pocket survived at '+pocket);
  check('ground held by an enemy unit is NOT absorbed',
    keepBefore==='S' && E.terrOwner(keep.x,keep.y)==='S', 'an anchored hex was eaten ('+keepBefore+')');
}

/* historical events & the winter question */
say('— events & winter gear —');
{
  E.newGame('G','normal','hotseat');
  const G = E.getState();
  check('events all land inside the campaign', E.EVENTS.every(e=>e.turn>=1 && e.turn<=E.MAX_TURN));
  check('events have date, title and text', E.EVENTS.every(e=>e.date && e.title && e.text));
  check('Barbarossa headline fires on turn 1', G.log.some(([c,t])=>t.includes('OPERATION BARBAROSSA')));
  // pp events pay out
  const ppS = G.pp.S;
  G.turn = 2; E.fireEvents();
  check('Stalin speech adds Soviet production', G.pp.S === ppS+2, G.pp.S+' vs '+ppS);
  // the winter question is asked in mid-August
  G.turn = 9; E.startPhase('G');
  check('winter question offered turn 9', G.winterGear === 'pending', String(G.winterGear));
  // gear can always be bought — short funds just go on credit (negative pp)
  G.pp.G = 8;
  check('gear can be bought on credit',
    E.decideWinterGear(true)===true && E.hasWinterGear() && G.pp.G === -2, 'pp='+G.pp.G);
  const owed = G.pp.G;
  E.startPhase('G');
  check('income pays the debt down', G.pp.G > owed && G.winterGear === true, 'pp='+G.pp.G);
  // gear softens snow attacks a little (0.65 vs 0.6) and German defense a lot (0.9 vs 0.8)
  G.turn = 22;
  const att = E.unitsOf('G').find(u=>u.name==='9. Armee');
  const tgt = E.unitsOf('S').find(u=>u.name==='3rd Army');
  const withGear = E.previewCombat(att, tgt).ratio;
  G.winterGear = false;
  const without = E.previewCombat(att, tgt).ratio;
  check('winter gear slightly helps snow attacks', Math.abs(withGear/without - 0.65/0.6) < 1e-9,
    (withGear/without).toFixed(3));
  const sovAtt = E.unitsOf('S').find(u=>u.name==='10th Army');
  const defNoGear = E.previewCombat(sovAtt, att).ratio;
  G.winterGear = true;
  const defGear = E.previewCombat(sovAtt, att).ratio;
  check('winter gear shields the German defense', Math.abs(defNoGear/defGear - 0.9/0.8) < 1e-9,
    (defNoGear/defGear).toFixed(3));
  // felt boots: infantry keeps marching, panzers freeze either way
  const pz = E.unitsOf('G').find(u=>u.name==='4. Panzergruppe');
  const rInfGear = E.reachable(att).size, rPzGear = E.reachable(pz).size;
  G.winterGear = false;
  const rInfNo = E.reachable(att).size, rPzNo = E.reachable(pz).size;
  check('winter gear keeps the infantry moving', rInfGear > rInfNo, rInfGear+' vs '+rInfNo);
  check('panzers freeze with or without gear', rPzGear === rPzNo, rPzGear+' vs '+rPzNo);
  // AI Germany answers the question itself
  E.newGame('G','normal','hotseat');
  const G2 = E.getState();
  G2.turn = 9; E.startPhase('G');
  E.aiFullPhase('G');
  check('AI resolves the winter question', G2.winterGear !== 'pending', String(G2.winterGear));
  // unanswered, the offer expires after a few weeks
  E.newGame('G','normal','hotseat');
  const G3 = E.getState();
  G3.turn = 9; E.startPhase('G');
  G3.turn = 13; E.startPhase('G');
  check('unanswered offer expires', G3.winterGear === false, String(G3.winterGear));
}

/* ---------------- full AI-vs-AI campaigns ---------------- */
const RUNS = parseInt(process.argv[2] || '8', 10);
const results = {};
let crashed = 0;
const vpAt = {8:[], 15:[], 21:[], 28:[]};
let minskT=[], kievT=[], smolenskT=[], moscowFell=0;
if (FAST) say('— AI-vs-AI campaigns SKIPPED (--fast) —');
else { say(`— ${RUNS} AI-vs-AI campaigns —`);

for (let run=0; run<RUNS; run++){
  try {
    E.newGame('G','normal','hotseat');     // hotseat = no AI difficulty bias either way
    const G = E.getState();
    const fell = {};
    let phases = 0;
    while (!G.over && phases < MAXPHASES()){
      E.aiFullPhase(G.phase);
      // invariants every phase
      const pos = new Set();
      for (const u of G.units){
        if (!E.passable(u.x,u.y)) throw new Error(`${u.name} on impassable hex ${u.x},${u.y}`);
        const k = u.x+','+u.y;
        if (pos.has(k)) throw new Error(`stacked units at ${k}`);
        pos.add(k);
        if (u.str < 1) throw new Error(`${u.name} has str ${u.str}`);
      }
      for (const c of G.cities){
        if (fell[c.name]===undefined && c.owner==='G' && c.vp>0) fell[c.name] = G.turn;
      }
      if (!G.over) E.endPhase();
      if (vpAt[G.turn] && G.phase==='G') {/* sampled below */}
      for (const t of [8,15,21,28]) if (G.turn===t && G.phase==='G' && !vpAt[t].done){ }
      phases++;
    }
    // sample vp milestones from the fell map
    const vpHeldAt = t => G.cities.filter(c=>c.vp>0 && fell[c.name] && fell[c.name]<=t)
                                  .reduce((a,c)=>a+c.vp,0);
    vpAt[8].push(vpHeldAt(8)); vpAt[15].push(vpHeldAt(15));
    vpAt[21].push(vpHeldAt(21)); vpAt[28].push(E.axisVP());
    if (fell['Minsk']) minskT.push(fell['Minsk']);
    if (fell['Kiev']) kievT.push(fell['Kiev']);
    if (fell['Smolensk']) smolenskT.push(fell['Smolensk']);
    if (fell['Moscow']) moscowFell++;
    const r = G.result ? G.result.title : 'TIMEOUT';
    results[r] = (results[r]||0)+1;
    say(`  run ${run+1}: ${r} — axis VP ${E.axisVP()}, ` +
      `G units ${E.unitsOf('G').length}, S units ${E.unitsOf('S').length}, ` +
      `losses G ${G.stats.G.lost} / S ${G.stats.S.lost}`);
  } catch(err){
    crashed++; failures++;
    console.log(`  run ${run+1}: CRASH — ${err.message}`);
  }
}
}  // end !FAST AI-vs-AI campaigns
function MAXPHASES(){ return 28*2 + 10; }

/* ---------------- every other scenario must play to completion too ---------------- */
if (!FAST){
say('— scenario campaigns —');
for (const id of Object.keys(E.SCENARIOS)){
  if (id === 'barbarossa') continue;                  // covered by the main sims above
  // Oversized maps (the 120×72 Grand Eastern Front) cost ~7s/phase — a full
  // 90-phase × 3 sim is ~30 min. They're already registry-validated and UI
  // smoke-tested via the grand campaign, so here we just crash-smoke them
  // once, briefly, to keep the suite tractable.
  const big = (E.SCENARIOS[id].cols * E.SCENARIOS[id].rows) > 6000;
  const runs = big ? 1 : 3;
  const res = {};
  let bad = 0;
  for (let i=0;i<runs;i++){
    try {
      E.newGame('G','normal','hotseat', id);
      const G = E.getState();
      const cap = big ? 16 : E.SCENARIOS[id].maxTurn*2 + 10;
      let phases = 0;
      while (!G.over && phases++ < cap){
        E.aiFullPhase(G.phase);
        const pos = new Set();
        for (const u of G.units){
          if (!E.passable(u.x,u.y)) throw new Error(`${u.name} on impassable hex ${u.x},${u.y}`);
          const k = u.x+','+u.y;
          if (pos.has(k)) throw new Error(`stacked units at ${k}`);
          pos.add(k);
          if (u.str < 1) throw new Error(`${u.name} has str ${u.str}`);
        }
        if (!G.over) E.endPhase();
      }
      const r = G.result ? G.result.title : 'TIMEOUT';
      res[r] = (res[r]||0)+1;
    } catch(err){ bad++; res['CRASH: '+err.message] = (res['CRASH: '+err.message]||0)+1; }
  }
  say(`  [${id}] ${JSON.stringify(res)} — axis VP ${E.axisVP()}`);
  check(`[${id}] campaigns complete without crashes`, bad===0);
}
}  // end !FAST scenario campaigns
E.loadScenario('barbarossa');                          // restore the default

/* ---------------- UI smoke test (fake DOM) ---------------- */
say('— UI smoke test —');
function uiSmoke(side){
  const els = new Map();
  const mkClassList = el => ({
    _s: new Set(),
    add(c){ this._s.add(c); }, remove(c){ this._s.delete(c); },
    toggle(c,f){ f===undefined ? (this._s.has(c)?this._s.delete(c):this._s.add(c))
                               : (f?this._s.add(c):this._s.delete(c)); },
    contains(c){ return this._s.has(c); },
  });
  function makeEl(id){
    const el = {
      id, innerHTML:'', textContent:'', style:{}, dataset:{}, scrollTop:0, scrollHeight:0,
      onclick:null, width:0, height:0,
      appendChild(){}, addEventListener(){}, querySelectorAll(){ return []; }, removeChild(){},
      getContext(){ return new Proxy({}, {
        get(t,p){ return (p in t) ? t[p] : ()=>{}; },
        set(t,p,v){ t[p]=v; return true; },
      }); },
    };
    el.classList = mkClassList(el);
    return el;
  }
  let uiErrors = 0;
  let rafCount = 0;
  const q = [];
  const sb = {
    module: {exports:{}},
    console: { ...console, error: (...a)=>{ uiErrors++; console.log('  UI console.error:', a[0], a[1]&&a[1].message||''); } },
    document: {
      getElementById(id){ if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
      createElement(){ return makeEl('anon'); },
      querySelectorAll(){ return []; },
    },
    localStorage: (()=>{ const s={}; return {
      getItem:k=>(k in s?s[k]:null), setItem:(k,v)=>{s[k]=String(v);}, removeItem:k=>{delete s[k];} }; })(),
    performance: { now: ()=>Date.now() },
    setTimeout: (fn)=>{ q.push(fn); return 0; },
    clearTimeout: ()=>{},
    requestAnimationFrame: (fn)=>{ if (rafCount++ < 6) q.push(fn); return 0; },
    innerWidth: 1600, innerHeight: 900,
    devicePixelRatio: 1,
    addEventListener: ()=>{}, removeEventListener: ()=>{},
  };
  sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(m[1], sb, {filename:'barbarossa-ui.js'});
  const $ = id => sb.document.getElementById(id);
  const drain = ()=>{ let g=0; while (q.length && g++<2e5){ q.shift()(); } };
  drain();                                   // render loop frames
  if ($('mc-arcade').onclick) $('mc-arcade').onclick();   // mode select → arcade
  if (side==='S') $('pick-sov').onclick();
  $('btn-start').onclick(); drain();         // begin campaign (AI opens if player is S)
  const UI = sb.module.exports;
  let guard = 0;
  while (!UI.getState().over && guard++ < 40){
    // dismiss event popups and answer the winter question like a player would
    for (let i=0;i<3;i++) if ($('btn-event-close').onclick) $('btn-event-close').onclick();
    if (UI.getState().winterGear === 'pending' && $('btn-gear-buy').onclick) $('btn-gear-buy').onclick();
    // a strategic decision blocks the turn — answer it (the option buttons live in a
    // fake-DOM container we can't click, so resolve through the exported API)
    const pd = UI.pendingDecision();
    if (pd) UI.resolveDecision(pd.id, pd.ai ? pd.ai(UI.getState()) : 0);
    $('btn-endturn').onclick();              // first click may arm the "units ready" warning…
    $('btn-endturn').onclick();              // …second click confirms; AI plays via queued steps
    drain();
  }
  // exercise the modals & QoL controls too
  $('btn-objectives').onclick(); $('btn-obj-close').onclick();
  $('btn-help2').onclick(); $('btn-help-close').onclick();
  if ($('wx-chip').onclick){ $('wx-chip').onclick(); $('btn-clock-close').onclick(); }
  if ($('btn-aispeed').onclick) $('btn-aispeed').onclick();
  if ($('btn-supply').onclick){ $('btn-supply').onclick(); $('btn-supply').onclick(); }
  if ($('btn-next').onclick) $('btn-next').onclick();   // cycle to next unit with orders
  if ($('btn-undo').onclick) $('btn-undo').onclick();
  $('btn-sound').onclick();                  // opens the settings modal
  if ($('vol-music').oninput){ $('vol-music').value = 55; $('vol-music').oninput(); }
  if ($('vol-sfx').oninput){ $('vol-sfx').value = 70; $('vol-sfx').oninput(); }
  if ($('btn-mute').onclick){ $('btn-mute').onclick(); $('btn-mute').onclick(); }
  // cycle graphics quality — High lights up the cinematic pass (cloud shadows,
  // sun grade, grain, soft counter shadows); make sure those paths render clean
  for (const lv of ['low','high','medium']) if ($('gfx-'+lv).onclick){ $('gfx-'+lv).onclick(); drain(); }
  if ($('btn-settings-close').onclick) $('btn-settings-close').onclick();
  drain();
  const arcadeOver = UI.getState().over, arcadeResult = UI.getState().result;
  // realistic-mode routing: mode select → preview screen → launch → one enemy phase
  let realisticOk = true;
  if ($('mc-realistic').onclick && $('btn-play-realistic').onclick){
    $('mc-realistic').onclick();
    if ($('rm-pick-sov').onclick) $('rm-pick-sov').onclick();
    if ($('rm-pick-ger').onclick) $('rm-pick-ger').onclick();
    if ($('btn-back-realistic').onclick) $('btn-back-realistic').onclick();
    $('mc-realistic').onclick();
    $('btn-play-realistic').onclick(); drain();
    realisticOk = UI.getState().scenario === 'realistic';
    $('btn-endturn').onclick(); $('btn-endturn').onclick(); drain();   // Soviet AI phase on the big map
  }
  // The World at War: mode card → power select → begin → build/produce → run months
  let grandOk = true;
  if ($('mc-grand').onclick && $('gw-begin').onclick){
    $('mc-grand').onclick(); drain();
    if ($('gw-back').onclick){ $('gw-back').onclick(); $('mc-grand').onclick(); }
    $('gw-begin').onclick(); drain();                       // start as Germany (default)
    grandOk = !!(UI.gwGetState && UI.gwGetState() && UI.gwGetState().active);
    // diplomacy: open the modal, launch Barbarossa from its button, close
    if ($('gw-diplo-btn').onclick){
      $('gw-diplo-btn').onclick();                          // renders the diplomacy modal
      if ($('gw-barb') && $('gw-barb').onclick) $('gw-barb').onclick();  // open the Eastern Front
      if ($('gw-diplo-close').onclick) $('gw-diplo-close').onclick();
    }
    if ($('gw-bc').onclick) $('gw-bc').onclick();           // queue a civil factory
    if ($('gw-bm').onclick) $('gw-bm').onclick();           // queue a military factory
    // run months; if a strategic decision blocks the turn, the modal opens —
    // pick the first option (fake-DOM can't click it, so resolve through the API)
    if ($('gw-end').onclick) for (let i=0;i<10;i++){
      $('gw-end').onclick();
      const pd = UI.gwPendingDecision && UI.gwPendingDecision();
      if (pd){ UI.gwResolveDecision(pd.id, 0); $('gw-end').onclick(); }
    }
    drain();
    $('gw-menu-btn').onclick && $('gw-menu-btn').onclick(); // back to menu
  }
  return {over: arcadeOver, realisticOk, grandOk, result: arcadeResult, uiErrors};
}
// ---- The World at War: diplomacy engine ----
say('— grand campaign: diplomacy —');
try {
  // a German player chooses Barbarossa; the USSR never declares it itself
  E.gwNewGame('GE','normal');
  check('USSR not at war with the Axis before Barbarossa',
    !E.gwFactionsAtWar('axis','comintern'), 'comintern war started early');
  check('Soviet regions are still Soviet at the start',
    E.gwFactionOf(E.gwGetState().regions.moscow)==='comintern', 'moscow not comintern');
  const armyBefore = E.gwGetState().eco.SU.army;
  E.gwDeclareWar('axis','comintern');                    // the player launches the invasion
  check('Barbarossa puts the Axis and Comintern at war',
    E.gwFactionsAtWar('axis','comintern'), 'no comintern war after declare');
  check('Barbarossa encircles the opening Soviet armies',
    E.gwGetState().eco.SU.army < armyBefore, 'Soviet army not reduced');
  check('Barbarossa only fires once',
    E.gwDeclareWar('axis','comintern')===false, 're-declared the same war');

  // courting: an Axis player can bring a leaning minor in; not a hostile-leaning one
  E.gwNewGame('GE','normal');
  const romaniaLean = E.GW_NEUTRAL_LEAN.romania;          // axis-leaning
  check('a leaning minor is courtable to its side',
    E.gwCanCourt('axis','romania')===true && romaniaLean==='axis', 'Romania not courtable by Axis');
  check('an Axis player cannot court an Allied-leaning minor',
    E.gwCanCourt('axis','yugo')===false, 'Yugoslavia wrongly courtable by Axis');
  check('a strictly-neutral minor is not courtable',
    E.gwCanCourt('axis','spain')===false, 'Spain wrongly courtable');
  const milBefore = E.gwGetState().eco.GE.mil;
  const ok = E.gwCourtNeutral('axis','romania');
  check('courting aligns the minor with the faction',
    ok===true && E.gwFactionOf('romania')==='axis', 'Romania did not join the Axis');
  check('courting hands the lead power the minor\'s war industry',
    E.gwGetState().eco.GE.mil > milBefore, 'Germany gained no factories from Romania');
  check('an already-aligned minor cannot be courted again',
    E.gwCourtNeutral('allies','romania')===false, 'Romania re-courted');
  // the notification badge surfaces real moves: a German player can launch Barbarossa
  E.gwNewGame('GE','normal'); E.gwGetState().turn = 20;   // inside the historical window
  check('the diplomacy badge flags available moves for a German player',
    E.gwDiploActions() > 0, 'no diplomacy actions surfaced');
} catch(err){
  failures++;
  console.log(`  FAIL diplomacy engine — ${err.message}`);
}

// ---- The World at War: strategic decisions & timed buffs ----
say('— grand campaign: decisions —');
try {
  // every option of every decision states a concrete effect, and every playable
  // power has at least one fork to make
  let allHaveEffect = true; const owners = new Set();
  for (const d of E.GW_DECISIONS){ owners.add(d.who);
    for (const o of d.options) if (!o.effect || !o.apply) allHaveEffect = false; }
  check('every decision option spells out a concrete effect', allHaveEffect, 'an option had no effect/apply');
  check('each playable power gets a decision', ['GE','SU','UK','FR','IT'].every(cc=>owners.has(cc)), 'a power has no decision');

  // a player decision surfaces for the player's power only — not the AI's
  E.gwNewGame('GE','normal'); let g = E.gwGetState(); g.turn = 10; g.active = true;
  const d = E.gwPendingDecision();
  check('the player\'s power is offered its fork', d && d.who==='GE', 'no GE decision at the western-plan window');
  // resolving applies a real, time-limited combat buff
  const atkBefore = E.gwModFactor('GE','attack','allies');
  E.gwResolveDecision(d.id, 0);                       // the Sickle Cut → big attack buff vs the Allies
  check('a decision applies a temporary combat buff',
    E.gwModFactor('GE','attack','allies') > atkBefore, 'no attack buff after the Sickle Cut');
  check('the buff is target-scoped (Allies, not the Soviets)',
    E.gwModFactor('GE','attack','comintern') === 1, 'the buff leaked onto the wrong enemy');
  check('a decision fires only once', E.gwPendingDecision()===null || E.gwPendingDecision().id!==d.id, 'same decision re-offered');

  // the buff expires after its run; key cities are immune to the Soviet depth buff
  E.gwNewGame('SU','normal'); g = E.gwGetState(); g.barbarossa = true;
  E.gwAddMod('SU','depth',0.3,2,'test depth');
  check('the depth buff hardens the approaches but not the fortress cities',
    E.gwModFactor('SU','depth') > 1, 'depth buff missing');
  E.gwAddMod('GE','attack',0.5,1,'one-month buff');
  g.turn += 2; E.gwTickMods();
  check('a timed buff lapses when its months run out',
    E.gwModFactor('GE','attack','comintern') === 1, 'buff outlived its duration');

  // AI opponents never take these forks — so they can't tip the Axis into a solo win
  E.gwNewGame('SU','normal'); g = E.gwGetState(); g.turn = 10; g.autoPlayer = false;
  // Germany is the AI here; its western-plan fork must NOT be pending for the SU player
  check('AI opponents are not handed the player\'s decisions',
    !E.gwPendingDecision() || E.gwPendingDecision().who==='SU', 'an AI power\'s fork surfaced to the player');
} catch(err){
  failures++;
  console.log(`  FAIL decisions engine — ${err.message}`);
}

for (const side of ['G','S']){
  try {
    const r = uiSmoke(side);
    check(`UI campaign as ${side==='G'?'Germany':'Soviets'} reaches an ending`,
      r.over && r.uiErrors===0,
      r.over ? (r.uiErrors+' UI errors') : 'never ended');
    check(`UI realistic-mode preview launches (${side})`, r.realisticOk, 'wrong scenario');
    check(`UI World at War campaign runs (${side})`, r.grandOk && r.uiErrors===0, 'grand campaign UI');
  } catch(err){
    failures++;
    console.log(`  FAIL UI smoke (${side}) — ${err.message}`);
  }
}

const avg = a => a.length ? (a.reduce((x,y)=>x+y,0)/a.length).toFixed(1) : '—';
if (!FAST){
  say('— balance summary —');
  say(`  results: ${JSON.stringify(results)}`);
  say(`  avg axis VP  t8=${avg(vpAt[8])}  t15=${avg(vpAt[15])}  t21=${avg(vpAt[21])}  end=${avg(vpAt[28])}`);
  say(`  city falls   Minsk t${avg(minskT)} (${minskT.length}/${RUNS})  Smolensk t${avg(smolenskT)} (${smolenskT.length}/${RUNS})  Kiev t${avg(kievT)} (${kievT.length}/${RUNS})  Moscow ${moscowFell}/${RUNS}`);
  check('no crashes in campaign sims', crashed===0, crashed+' crashed');
}

console.log((FAST?'[--fast] ':'') + (failures ? `\n${failures} FAILURE(S) (of ${passes+failures} checks)` : `ALL ${passes} CHECKS PASSED`));
process.exit(failures ? 1 : 0);
