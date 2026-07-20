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
// seasonal snow accumulation (visual): bare in summer, deepens once it snows, never out of [0,1]
{
  check('no snow before winter', E.snowDepth(1)===0 && E.snowDepth(10)===0);
  const early = E.snowDepth(22), later = E.snowDepth(25);   // turn 22 is the first snow week
  check('snow builds up over successive snow weeks', early>0 && later>early && later<=1);
  let bad=false; for (let t=1;t<=30;t++){ const d=E.snowDepth(t); if (d<0||d>1) bad=true; }
  check('snow depth stays within [0,1]', !bad);
}

/* every scenario in the registry must be internally consistent */
say('— scenario registry —');
for (const id of Object.keys(E.SCENARIOS)){
  const s = E.SCENARIOS[id];
  const K = s.kinds || E.KINDS;
  const land = (x,y) => s.map[y] && s.map[y][x] && s.map[y][x] !== '~' && s.map[y][x] !== 'q';
  check(`[${id}] map is ${s.cols}x${s.rows}, legal terrain`,
    s.map.length===s.rows && s.map.every(r=>r.length===s.cols && /^[.fhsroq~]+$/.test(r)));
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

/* PER-BATTLE SAVE SLOTS — every battle keeps its own save; nothing clobbers */
say('— save slots —');
{
  E.newGame('S','normal','ai','realistic'); E.saveGame();
  E.newGame('G','normal','ai','barbarossa'); E.saveGame();
  check('barbarossa and realistic use different slots',
    E.saveKeyFor('barbarossa') !== E.saveKeyFor('realistic'));
  check('saving an arcade game does NOT wipe the realistic save',
    E.hasSaveSlot('realistic') && E.hasSaveSlot('barbarossa'));
  E.loadSlot('realistic');  check('realistic slot restores realistic', E.getState().scenario === 'realistic');
  E.loadSlot('barbarossa'); check('barbarossa slot restores barbarossa', E.getState().scenario === 'barbarossa');
  const ids = ['barbarossa','winter41','stalingrad','kursk','alamein','dday','bulge','midway','guadalcanal','okinawa','leyte','marketgarden'];
  check('every battle has its own save key',
    new Set(ids.map(s => E.saveKeyFor(s))).size === ids.length);
  // the user story that motivated this: a Guadalcanal campaign survives starting Market Garden
  E.newGame('G','normal','ai','guadalcanal'); E.saveGame();
  E.newGame('G','normal','ai','marketgarden'); E.saveGame();
  check('starting Market Garden does not wipe the Guadalcanal save',
    E.hasSaveSlot('guadalcanal') && E.hasSaveSlot('marketgarden'));
  E.loadSlot('guadalcanal'); check('guadalcanal save restores guadalcanal', E.getState().scenario === 'guadalcanal');
  // a pre-slots save migrates into the slot matching its own scenario
  memLS.removeItem(E.saveKeyFor('realistic'));
  E.newGame('G','normal','ai','realistic'); memLS.setItem('barbarossa-save-v1', E.serialize());
  E.migrateSaves();
  check('legacy single-slot save migrates by scenario',
    E.hasSaveSlot('realistic') && memLS.getItem('barbarossa-save-v1') === null);
  // the old shared arcade slot folds into its battle's own key
  E.newGame('G','normal','ai','kursk');
  memLS.removeItem(E.saveKeyFor('kursk'));
  memLS.setItem('hoi5-save-arcade-v1', E.serialize());
  E.migrateSaves();
  check('legacy shared arcade save migrates to its battle slot',
    E.hasSaveSlot('kursk') && memLS.getItem('hoi5-save-arcade-v1') === null);
  E.newGame('G','normal','hotseat','barbarossa');
}

/* AMPHIBIOUS WARFARE — embark, naval reach, assault, beachhead supply (Italy) */
say('— amphibious warfare —');
{
  const G = E.newGame('S','normal','ai','italy');   // human Axis; AI runs the Allied invasion
  check('amphibious enabled for the invader only',
    E.amphibOn() && E.amphibCanSide('G') && !E.amphibCanSide('S'));
  check('the Strait of Messina is a water gap (no land bridge to Sicily)',
    E.isWater(24,31) && !E.passable(24,31));
  const corps = G.units.find(u=>u.name==='US II Corps');
  check('a Tunisian corps can embark from its coastal hex', !!corps && E.canEmbark(corps));
  const beaches = E.navalReach(corps);
  check('naval reach finds beaches across the sea', beaches.size > 0);
  check('a Sicilian beach is within reach of the invasion fleet',
    [...beaches.keys()].some(k=>{const [x,y]=E.unkey(k); return y>=31 && y<=37 && x>=16 && x<=27;}));
  // no production → no landing craft
  G.pp.G = 0;
  const openBeach = [...beaches.keys()].map(k=>E.unkey(k)).find(([x,y])=>!E.unitAt(x,y));
  check('a landing needs production (blocked at 0 PP)',
    E.amphibiousAssault(corps, openBeach[0], openBeach[1]) === null);
  // fund it and storm an empty beach
  G.pp.G = 20;
  const ev = E.amphibiousAssault(corps, openBeach[0], openBeach[1]);
  check('an unopposed landing puts the division ashore',
    ev && ev.landed && corps.x===openBeach[0] && corps.y===openBeach[1]);
  check('the landing plants a beachhead',
    (G.beachheads||[]).some(b=>b.x===openBeach[0] && b.y===openBeach[1] && b.side==='G'));
  check('the beachhead projects its own supply',
    E.computeSupply('G').has(E.keyOf(openBeach[0],openBeach[1])));
  check('a landed division has spent its turn', corps.moved && corps.attacked);
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
  check('fully surrounded unit is cut off', !net.has(E.keyOf(victim.x,victim.y)));
}

/* naval domain: ships stay at sea, infantry stays ashore, convoys may land */
say('— naval domain —');
{
  E.newGame('G','normal','hotseat','midway');
  const G = E.getState();
  const cv = G.units.find(u=>u.kind==='g_pz');           // a carrier division
  const conv = G.units.find(u=>u.kind==='g_ally');       // the invasion convoy
  const gar = G.units.find(u=>u.kind==='s_mil');         // the Midway garrison (land)
  // Midway atoll land hexes: (18,8) and (20,9)
  check('warships cannot enter land', !E.domainOk('g_pz', 18, 8) && E.domainOk('g_pz', 5, 5));
  check('the invasion convoy may come ashore', E.domainOk('g_ally', 18, 8) && E.domainOk('g_ally', 5, 5));
  check('land formations cannot walk onto open ocean', !E.domainOk('s_mil', 5, 5) && E.domainOk('s_mil', 20, 9));
  // reachable respects the domain: a carrier's reach never includes a land hex
  const r = E.reachable(cv);
  let seaOnly = true;
  for (const k of r.keys()){ const [x,y]=E.unkey(k); if (E.terrainAt(x,y)!=='o') seaOnly=false; }
  check('a carrier task force plots courses only at sea', seaOnly && r.size>0, r.size+' hexes');
  // the garrison, if it could move, may not step into the ocean
  const rg = E.reachable(gar);
  let landOnly = true;
  for (const k of rg.keys()){ const [x,y]=E.unkey(k); if (E.terrainAt(x,y)==='o') landOnly=false; }
  check('the garrison cannot wade into the Pacific', landOnly, rg.size+' hexes');
  // REGRESSION (the "ship spawned on the island / can't move" bug): open ocean is
  // passable to ships, but it is NOT a shore — a unit must never embark from it or
  // land onto it, and scheduled reinforcements must arrive in their own domain.
  E.newGame('G','normal','ai','guadalcanal');
  { const Gd = E.getState();
    // an ocean hex touching land must not be treated as a coast (embark/land shore)
    let oceanByLand = null;
    for (let y=0; y<E.ROWS && !oceanByLand; y++) for (let x=0; x<E.COLS; x++){
      if (E.terrainAt(x,y)==='o' && E.neighbors(x,y).some(([nx,ny])=>E.passable(nx,ny) && !E.isWater(nx,ny))){ oceanByLand=[x,y]; break; } }
    check('open ocean beside land is not a landing shore', oceanByLand ? !E.isCoast(oceanByLand[0],oceanByLand[1]) : false, oceanByLand?oceanByLand.join(','):'no coast found');
    // play the whole campaign out and assert no unit is ever on forbidden terrain
    let ph=0, wrong=null;
    while(!Gd.over && ph < E.SCENARIOS.guadalcanal.maxTurn*2 + 6){
      E.aiFullPhase(Gd.phase); if(!Gd.over) E.endPhase(); ph++;
      // an embarked division riding a transport at sea is legitimate — only a unit
      // sitting on terrain its domain forbids AND not embarked is truly stranded
      for(const u of Gd.units){ if(!u.embarked && !E.domainOk(u.kind,u.x,u.y)){ wrong = u.name+'@'+u.x+','+u.y+' on '+E.terrainAt(u.x,u.y); break; } }
      if(wrong) break;
    }
    check('no unit is ever stranded on the wrong domain (full Guadalcanal game)', !wrong, wrong||'clean');
  }
  // land scenarios are untouched: no kind carries the sea flag
  E.newGame('G','normal','hotseat','barbarossa');
  check('land theaters have no sea kinds', Object.values(E.KINDS).every(k=>!k.sea));
}

/* THE PACIFIC WAR campaign: per-stage side override + arc integrity */
say('— pacific campaign —');
{
  const pac = E.RV_CAMPS.pac;
  check('the Pacific arc exists with four fronts', !!pac && pac.stages.length===4);
  check('every Pacific stage is a real scenario', pac.stages.every(s=>!!E.SCENARIOS[s.scn]));
  check('the player is the US on both engine sides',
    E.rvStageSide('pac',0)==='S' && E.rvStageSide('pac',1)==='G' &&
    E.rvStageSide('pac',2)==='S' && E.rvStageSide('pac',3)==='G');
  check('campaigns without overrides keep their side', E.rvStageSide('rv',3)==='G' && E.rvStageSide('gpw',1)==='S');
  // CRUSADE IN EUROPE: the Western Allies arc swaps sides per stage too
  const wal = E.RV_CAMPS.wal;
  check('the Crusade arc exists with four fronts', !!wal && wal.stages.length===4 && wal.stages.every(s=>!!E.SCENARIOS[s.scn]));
  check('the player is the Allies on both engine sides',
    E.rvStageSide('wal',0)==='S' && E.rvStageSide('wal',1)==='G' &&
    E.rvStageSide('wal',2)==='G' && E.rvStageSide('wal',3)==='S');
  // Market Garden opens with the airborne carpet already down and supplied by air
  const Gm = E.newGame('G','normal','hotseat','marketgarden');
  check('the carpet starts with three air-bridge pockets', (Gm.airdrops||[]).length===3 && Gm.airdrops.every(a=>a.side==='G'&&a.turns>0));
  const para = E.unitsOf('G').find(u=>u.name==='1st Airborne');
  check('the far pocket at Arnhem starts in supply', !!para && E.computeSupply('G').has(E.keyOf(para.x,para.y)));
  E.newGame('G','normal','hotseat','barbarossa');
  // stars respect the stage side: at Midway (US=S) LOW axis VP is the win
  E.newGame('S','normal','ai','midway');
  check('stage stars flip with the stage side', E.rvStars(0,'S')===5 && E.rvStars(0,'G')===0);
  // campaign medals: one per finished arc, metal by difficulty, never downgraded
  memLS.removeItem('hoi5-medals-v1');
  E.medalAward('pac','normal');
  check('finishing an arc hangs a medal', E.medalGet('pac') && E.medalGet('pac').diff==='normal');
  E.medalAward('pac','easy');
  check('an easier re-clear never downgrades the medal', E.medalGet('pac').diff==='normal');
  E.medalAward('pac','brutal');
  check('a harder clear upgrades the medal', E.medalGet('pac').diff==='brutal');
  check('other arcs are untouched', E.medalGet('rv')===null);
  memLS.removeItem('hoi5-medals-v1');
  // theater soundtracks: every battle maps to a palette, every palette is playable
  check('every scenario has a music theater',
    Object.keys(E.SCENARIOS).every(id => ['east','west','pacific'].includes(E.theaterOf(id))));
  check('the Pacific and the Crusade sound like themselves',
    E.theaterOf('okinawa')==='pacific' && E.theaterOf('marketgarden')==='west' && E.theaterOf('barbarossa')==='east');
  check('all three palettes are complete 8-bar loops',
    ['east','west','pacific'].every(t => E.MUSIC[t] && E.MUSIC[t].bpm>0 && E.MUSIC[t].bars.length===8 &&
      E.MUSIC[t].bars.every(b => b.ch.length===3 && b.mel.every(([f,n])=>f>60&&n>0))));
}

/* amphibious no-retreat fix: a cornered defender is never stacked under the attacker */
say('— amphibious waterline —');
{
  for (let trial=0; trial<12; trial++){
    E.newGame('G','normal','hotseat','guadalcanal');
    const G = E.getState();
    // a Japanese defender on the coastal city at Tassafaronga (9,12), cornered:
    // every land neighbour is occupied, and the sea is no retreat for infantry
    const def = E.unitsOf('S').find(u=>u.name==='Esperance Base Force');
    def.x = 9; def.y = 12; def.str = 5;
    const nbs = E.neighbors(9,12).filter(([x,y])=>E.passable(x,y) && E.terrainAt(x,y)!=='o');
    const blockers = E.unitsOf('S').filter(u=>u.id!==def.id).slice(0, nbs.length);
    nbs.forEach(([x,y],i)=>{ if (blockers[i]){ blockers[i].x=x; blockers[i].y=y; } });
    const mar = E.unitsOf('G').find(u=>u.name==='1st Marines');
    G.pp.G = 40; mar.moved = false; mar.attacked = false; mar.str = 9;
    const ev = E.amphibiousAssault(mar, 9, 12);
    // whatever happened — landed, repelled, destroyed — no hex holds two units
    const seen = new Set(); let stacked = false;
    for (const u of G.units){ const k=u.x+'|'+u.y; if (seen.has(k)) stacked = true; seen.add(k); }
    check(`cornered-defender assault never stacks (trial ${trial+1})`, !stacked,
      ev ? JSON.stringify({landed:ev.landed,repelled:ev.repelled}) : 'null');
    if (stacked) break;
  }
  E.newGame('G','normal','hotseat','barbarossa');
}

/* logistics realism: bad weather contracts supply REACH (SCN.weatherLogistics) */
say('— weather logistics —');
{
  E.newGame('G','normal','hotseat','barbarossa');
  const G = E.getState();
  G.turn = 1;    check('clear weather: full supply reach', E.weatherSupplyRange()===0);
  G.turn = 17;   check('mud (Rasputitsa) contracts supply reach', E.weatherSupplyRange() < 0);
  G.turn = 22;   check('deep snow contracts supply reach', E.weatherSupplyRange() < 0);
  // the network physically pulls inward when the mud arrives
  G.turn = 1;  const clearNet = E.computeSupply('G');
  G.turn = 17; const mudNet = E.computeSupply('G');
  check('the mud pulls the supply network inward', mudNet.size < clearNet.size,
    `${clearNet.size} clear → ${mudNet.size} mud`);
  let deep=null; for (const k of clearNet) if (!mudNet.has(k)){ deep=k; break; }
  check('a forward hex supplied in the clear is cut off in the mud', deep!=null);
  // a unit sitting on a depot city is never starved by weather alone (min-range clamp)
  const cap = G.cities.find(c=>c.owner==='G'); G.turn = 17;
  check('depots still feed their own hex in the mud', E.computeSupply('G').has(E.keyOf(cap.x,cap.y)));
  // universal rule: the same contraction applies on every scenario
  E.newGame('G','normal','hotseat','kursk'); E.getState().turn = 2;     // kursk mud (turn 2 storm)
  check('weather logistics is universal (applies on kursk too)', E.weatherSupplyRange() < 0);
  E.newGame('G','normal','hotseat','stalingrad'); E.getState().turn = 21; // stalingrad snow
  check('weather logistics is universal (applies on stalingrad too)', E.weatherSupplyRange() < 0);
  // opt-out: a scenario can switch it off with weatherLogistics:false
  E.newGame('G','normal','hotseat','barbarossa'); const Gs = E.getState(); Gs.turn = 17;
  const on = E.weatherSupplyRange();
  E.SCENARIOS.barbarossa.weatherLogistics = false;
  check('a scenario can opt out (weatherLogistics:false)', on < 0 && E.weatherSupplyRange()===0);
  delete E.SCENARIOS.barbarossa.weatherLogistics;   // restore the default (on)
  E.newGame('G','normal','hotseat','barbarossa');
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
  // close air support: loitering group boosts a covered ground attack, and only
  // for the side flying support — out-of-range and other-side hexes see nothing
  {
    E.newGame('G','normal','hotseat');
    const border2 = E.unitsOf('S').find(u=>u.name==='11th Army');   // within German air range
    const far = E.unitsOf('S').find(u=>u.name==='24th Army');       // Moscow, out of range turn 1
    const base = E.casBonus('G', border2.x, border2.y);
    const g = E.airOf('G').find(a=>a.mission==='ready'); g.str = 8;
    check('no support flying → no CAS bonus', base===1, base);
    check('setSupport takes a ready group off strike duty',
      E.setSupport(g)===true && g.mission==='support');
    const cov = E.casBonus('G', border2.x, border2.y);
    check('support lifts covered attacks', cov>1 && cov<=1.30, cov);
    check('CAS respects air range', E.casBonus('G', far.x, far.y)===1);
    check('CAS is one-sided (helps only its owner)', E.casBonus('S', border2.x, border2.y)===1);
    // enemy fighters on patrol blunt the support
    const s2 = E.airOf('S')[0]; s2.str = 8; E.setPatrol(s2);
    check('enemy patrol contests the support', E.casBonus('G', border2.x, border2.y) < cov);
  }
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
  check('Guderian carries the Panzer Leader trait', E.genTraitId(gud)==='panzer');
  // a plain flat-attack general (Hoepner, no trait) still boosts the forecast — and the AI's eyes
  const hoe = E.unitsOf('G').find(u=>u.name==='4. Panzergruppe');
  const tgt = E.unitsOf('S').find(u=>u.name==='3rd Army');
  const withGen = E.previewCombat(hoe, tgt).ratio;
  const mnm = hoe.name; hoe.name = 'Nobody';
  const without = E.previewCombat(hoe, tgt).ratio;
  hoe.name = mnm;
  check('a flat-attack general boosts attack odds ×1.10', Math.abs(withGen/without - 1.10) < 1e-9,
    (withGen/without).toFixed(3));
  // a Panzer Leader leads with speed, not extra punch: no flat attack bonus on a lone assault
  const gWith = E.previewCombat(gud, tgt).ratio;
  const gnm = gud.name; gud.name = 'Nobody'; const gWithout = E.previewCombat(gud, tgt).ratio; gud.name = gnm;
  check('Panzer Leader adds no flat attack bonus (edge is mobility)', Math.abs(gWith/gWithout - 1) < 1e-9,
    (gWith/gWithout).toFixed(3));
  // the engine supports +movement generals via the field (none shipped — traits handle mobility)
  check('no general grants raw +movement via the mp field', E.GENERALS.every(g=>!g.mp),
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
  // fighting in a city raises its cosmetic ruin level (rendered + saved)
  E.newGame('G','normal','hotseat');
  const Gr2 = E.getState();
  const town = Gr2.cities.find(c=>c.name==='Minsk');
  const dfd = E.unitsOf('S')[0]; dfd.x = town.x; dfd.y = town.y;
  const agr = E.unitsOf('G')[0];
  const nb3 = E.neighbors(town.x,town.y).find(([x,y])=>E.passable(x,y) && !E.unitAt(x,y));
  agr.x = nb3[0]; agr.y = nb3[1];
  E.resolveCombat(agr, dfd);
  check('city fighting scars the city (ruin level rises)', (town.ruin||0) > 0);
  check('ruin level survives a save round-trip',
    (()=>{ E.deserialize(E.serialize()); return (E.getState().cities.find(c=>c.name==='Minsk').ruin||0) > 0; })());
  // campaign replay records a valid opening frame at newGame and grows each turn
  E.newGame('G','normal','hotseat');
  const Grp = E.getState();
  check('replay seeds an opening frame', Array.isArray(Grp.replay) && Grp.replay.length===1
    && Grp.replay[0].t===0 && Grp.replay[0].o.length === E.COLS*E.ROWS);
  for (let i=0;i<8;i++){ E.aiFullPhase(Grp.phase); E.endPhase(); }   // 4 full turns
  check('replay grows one frame per completed turn', Grp.replay.length >= 4
    && Grp.replay[Grp.replay.length-1].t >= 3);
  check('replay frames survive a save round-trip',
    (()=>{ const n=Grp.replay.length; E.deserialize(E.serialize()); return E.getState().replay.length===n; })());
  check('replay frames only use G/S/./~ codes',
    E.getState().replay.every(f => /^[GS.~]+$/.test(f.o)));
  // "hold" keeps a unit in place: the flag clears at the start of its next turn
  E.newGame('G','normal','hotseat');
  const Ghold = E.getState();
  Ghold.units[0].held = true;
  E.startPhase('G');
  check('hold clears at the start of your turn', !Ghold.units[0].held);
}

/* ---------------- standing orders (battle plans) ---------------- */
say('— standing orders —');
{
  E.newGame('G','normal','hotseat');
  const Gs = E.getState();
  const objDist = u => Math.min(...Gs.cities.filter(c=>c.vp>0 && c.owner!=='G').map(c=>E.hexDist(u.x,u.y,c.x,c.y)));
  // an Advance order marches a panzer toward the nearest enemy objective
  const pz = E.unitsOf('G').find(u=>u.name==='2. Panzergruppe');
  pz.order = 'attack';
  const before = objDist(pz);
  const r = E.executeOrder(pz);
  check('Advance order moves a unit toward an enemy objective', (r.moved && objDist(pz) < before) || !!r.atk);
  check('executeOrder marks the unit as acted', pz.moved || pz.attacked);
  // no order → executeOrder is a clean no-op
  const idle = E.unitsOf('G').find(u=>!u.order && !E.KINDS[u.kind].hq && u.id!==pz.id);
  const r2 = E.executeOrder(idle);
  check('no order → executeOrder does nothing', !r2.moved && !r2.atk && !idle.moved);
  // orderObjective points an attacker at a real enemy-held objective
  const obj = E.orderObjective(pz);
  check('orderObjective returns an enemy objective for an attacker',
    Array.isArray(obj) && Gs.cities.some(c=>c.vp>0 && c.owner!=='G' && c.x===obj[0] && c.y===obj[1]));
  // a hold unit already on the front is recognised as holding the line
  E.newGame('G','normal','hotseat');
  const Gs2 = E.getState();
  const foe = E.unitsOf('S')[0];
  const spot = E.neighbors(foe.x,foe.y).find(([x,y])=>E.passable(x,y) && !E.unitAt(x,y));
  const guard = E.unitsOf('G').find(u=>!E.KINDS[u.kind].hq);
  guard.x = spot[0]; guard.y = spot[1]; guard.order = 'hold';
  check('onFront detects a unit up against the enemy', E.onFront(guard));
  const r3 = E.executeOrder(guard);
  check('a hold unit already on the line does not wander off', !r3.moved || E.onFront(guard));
  // orders persist through a save
  E.newGame('G','normal','hotseat');
  E.getState().units[0].order = 'attack'; E.getState().units[1].order = 'hold';
  E.deserialize(E.serialize());
  check('standing orders survive a save round-trip',
    E.getState().units[0].order==='attack' && E.getState().units[1].order==='hold');
}

/* ---------------- encirclement detection ---------------- */
say('— encirclement —');
{
  E.newGame('G','normal','hotseat');
  const Ge = E.getState();
  // a unit safely in its own rear is not encircled
  const rear = E.unitsOf('S').find(u=>!E.KINDS[u.kind].hq);
  check('a supplied rear unit is not encircled', !E.isEncircled(rear));
  // seal one Soviet unit off: ring it with German units on every open neighbour
  E.newGame('G','normal','hotseat');
  const Ge2 = E.getState();
  const victim = E.unitsOf('S').find(u=>!E.KINDS[u.kind].hq && !u.oos);
  // move it somewhere open, then wall it in with movable German units
  const spot = [Math.floor(E.COLS/2), Math.floor(E.ROWS/2)];
  if (E.passable(spot[0],spot[1]) && !E.unitAt(spot[0],spot[1])){ victim.x=spot[0]; victim.y=spot[1]; }
  const wall = E.unitsOf('G').filter(u=>!E.KINDS[u.kind].hq);
  let wi = 0;
  for (const [nx,ny] of E.neighbors(victim.x,victim.y)){
    if (!E.passable(nx,ny) || E.unitAt(nx,ny)) continue;
    if (wi < wall.length){ wall[wi].x = nx; wall[wi].y = ny; wi++; }
  }
  E.startPhase('S');   // recompute supply/oos with the new positions
  const enc = E.encircledIds('S');
  check('a fully walled-in unit is detected as encircled', enc.has(victim.id));
  check('the surrounding attackers are not themselves encircled',
    wall.slice(0,wi).every(w => !enc.has(w.id)));
  // detection never mutates the game (pure): strengths unchanged by the call
  const strBefore = E.unitsOf('S').reduce((a,u)=>a+u.str,0);
  E.encircledIds('S'); E.encircledIds('G');
  check('encirclement detection is side-effect free',
    E.unitsOf('S').reduce((a,u)=>a+u.str,0) === strBefore);
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
  const mn = E.unitsOf('G').find(u=>u.name==='11. Armee');         // von Manstein, +15% atk
  const def = E.unitsOf('S').find(u=>u.name==='3rd Army');
  const p = E.previewCombat(mn, def);
  check('forecast returns a factors breakdown', Array.isArray(p.factors));
  check('a flat-attack general shows up as an attack factor',
    p.factors.some(f=>f.who==='atk' && /Manstein/.test(f.label) && Math.abs(f.mul-1.15)<1e-9),
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
  mn.oos = true;
  check('cut-off attacker shows a penalty factor',
    E.previewCombat(mn,def).factors.some(f=>f.who==='atk' && f.mul<1 && /cut off/i.test(f.label)));
  mn.oos = false;
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

/* the Winter War: SCN.winterSide flips the deep-freeze onto the Red Army */
say('— winter war —');
{
  const Gw = E.newGame('G','normal','hotseat','winterwar');
  Gw.turn = 5;                                        // deep-snow midwinter
  const fin = E.unitsOf('G').find(u=>u.name==='4th Division');
  const sov = E.unitsOf('S').find(u=>u.name==='24th Rifle');
  // Soviet attacks carry the snow penalty; Finnish attacks don't
  const sf = E.previewCombat(sov, fin).factors;
  check('deep snow punishes the SOVIET attacker', sf.some(f=>f.who==='atk' && /snow/i.test(f.label) && f.mul<1),
    JSON.stringify(sf.map(f=>f.label)));
  const ff = E.previewCombat(fin, sov).factors;
  check('Finnish attackers shrug off the snow', !ff.some(f=>f.who==='atk' && /snow/i.test(f.label)),
    JSON.stringify(ff.map(f=>f.label)));
  // the defender penalty falls on Soviet defenders, not Finnish ones
  check('snow saps the SOVIET defense', ff.some(f=>f.who==='def' && /snow/i.test(f.label) && f.mul<1));
  check('Finnish defense is unbothered', !sf.some(f=>f.who==='def' && /snow/i.test(f.label)));
  // ski troops are winter-hardened attackers
  const ski = E.unitsOf('G').find(u=>u.kind==='f_ski');
  const kf = E.previewCombat(ski, sov).factors;
  check('ski groups attack winter-hardened', kf.some(f=>/Winter-hardened/.test(f.label) && f.mul>1));
  // movement: the snow slows the invader, not the defender
  const rSov = E.reachable(sov).size;
  const rFin = E.reachable(fin).size;
  Gw.turn = 13;                                       // February hard frost — snow gone
  const rSovThaw = E.reachable(sov).size;
  check('deep snow slows the Soviet columns', rSovThaw > rSov, rSov+' snow vs '+rSovThaw+' frost');
  // Soviet air freezes while the Finnish handful flies
  Gw.turn = 5;
  check('snow grounds the Red air arm, not the Finnish one',
    E.airWxMul('S') < 0.5 && E.airWxMul('G') >= 0.9, E.airWxMul('S')+','+E.airWxMul('G'));
  // Barbarossa is untouched: the freeze still falls on the Germans there
  E.newGame('G','normal','hotseat','barbarossa');
  E.getState().turn = 23;
  const gu = E.unitsOf('G').find(u=>u.name==='9. Armee') || E.unitsOf('G')[0];
  const su = E.unitsOf('S')[0];
  const bf = E.previewCombat(gu, su).factors;
  check('Barbarossa snow still punishes the German attacker',
    bf.some(f=>f.who==='atk' && /snow/i.test(f.label) && f.mul<1));
  E.newGame('G','normal','hotseat','barbarossa');
}

/* ---------------- campaign variants (replayability mutators) ---------------- */
say('— campaign variants —');
{
  E.newGame('G','normal','hotseat','barbarossa',{wx:true,res:true,vet:true});
  const Gv = E.getState();
  check('variants flag stored in the save state', Gv.variants && Gv.variants.wx && Gv.variants.res && Gv.variants.vet);
  check('chaos weather rolls a full-campaign plan', Array.isArray(Gv.wxPlan) && Gv.wxPlan.length === E.MAX_TURN+1
    && Gv.wxPlan.every(w=>['clear','mud','freeze','snow'].includes(w)));
  check('weatherFor reads the rolled plan', E.weatherFor(5) === Gv.wxPlan[5]);
  check('winter still comes in a chaos-weather Barbarossa', Gv.wxPlan.some(w=>w==='snow'));
  check('shuffled reserves keep every reinforcement', Gv.sched && Gv.sched.length === E.SOV_SCHEDULE.length
    && Gv.sched.every(([t])=>t>=2 && t<=E.MAX_TURN-1));
  const jit = Gv.sched.map(([t],i)=>Math.abs(t - E.SOV_SCHEDULE[i][0]));
  check('shuffle jitter stays within ±2 weeks', jit.every(d=>d<=2));
  check('veteran cadres: three blooded formations per side',
    ['G','S'].every(s=>E.unitsOf(s).filter(u=>(u.xp||0)>0).length===3));
  check('no veteran HQs', E.getState().units.every(u=>!(u.xp>0 && E.KINDS[u.kind].hq)));
  // a variant war survives save/load and plays on cleanly
  const snap = E.serialize(); E.deserialize(snap);
  const Gv2 = E.getState();
  check('variant campaign round-trips through a save', Gv2.wxPlan && Gv2.wxPlan[5]===Gv.wxPlan[5]
    && Gv2.sched && Gv2.sched.length===Gv.sched.length);
  for (let i=0;i<6 && !Gv2.over;i++){ E.aiFullPhase(Gv2.phase); if (!Gv2.over) E.endPhase(); }
  check('variant campaign plays cleanly', Gv2.turn >= 3 || Gv2.over);
  // variant-free games must be completely untouched
  E.newGame('G','normal','hotseat');
  const Gp = E.getState();
  check('no variants → vanilla state', !Gp.variants && !Gp.wxPlan && !Gp.sched
    && Gp.units.every(u=>!(u.xp>0)));
}

/* ---------------- fog of war ---------------- */
say('— fog of war —');
{
  E.newGame('G','normal','ai','barbarossa',{fow:true});
  const Gf = E.getState();
  check('fow: variant state initialised', !!(Gf.variants.fow && Gf.seen && Array.isArray(Gf.recon)));
  const sight = E.sightFor('G');
  check('fow: sight covers every friendly position', E.unitsOf('G').every(u=>sight.has(E.keyOf(u.x,u.y))));
  const seenFoe = E.unitsOf('S').find(t=>sight.has(E.keyOf(t.x,t.y)));
  const hidFoe  = E.unitsOf('S').filter(t=>!sight.has(E.keyOf(t.x,t.y))).pop();  // deepest reserve
  check('fow: frontier enemies spotted, deep reserves hidden',
    !!seenFoe && !!hidFoe && E.isSpotted(seenFoe,'G') && !E.isSpotted(hidFoe,'G'));
  check('fow: your own units are always visible to you', E.unitsOf('G').every(u=>E.isSpotted(u,'G')));

  // ghost memory: scout a hidden reserve, pull the scout back — the marker stays
  const scout = E.unitsOf('G')[0];
  const [ox,oy] = [scout.x, scout.y];
  const nb = E.neighbors(hidFoe.x,hidFoe.y).find(([x,y])=>E.passable(x,y) && !E.unitAt(x,y));
  scout.x = nb[0]; scout.y = nb[1]; Gf.mv = (Gf.mv||0)+1;
  E.sightFor('G');
  check('fow: scouting records the contact', !!Gf.seen.G[hidFoe.id]);
  scout.x = ox; scout.y = oy; Gf.mv++;
  E.sightFor('G');
  check('fow: a contact that slips from view leaves a last-seen ghost',
    Gf.seen.G[hidFoe.id] && Gf.seen.G[hidFoe.id].x===hidFoe.x && Gf.seen.G[hidFoe.id].y===hidFoe.y);
  // watching a hex stay empty clears the ghost
  scout.x = nb[0]; scout.y = nb[1]; Gf.mv++;
  const fx0 = hidFoe.x; hidFoe.x = ox; Gf.mv++;             // foe sneaks off while we watch its hex
  E.sightFor('G');
  check('fow: re-scouting an empty hex clears the ghost', !Gf.seen.G[hidFoe.id] || Gf.seen.G[hidFoe.id].x!==fx0);
  scout.x = ox; scout.y = oy; hidFoe.x = fx0; Gf.mv++;

  // hidden enemies don't dent the move preview — and the march contact-stops
  const pz = E.unitsOf('G').find(u=>u.name==='2. Panzergruppe');
  const r0 = E.reachable(pz);
  let dest=null, path=null;
  for (const k of r0.keys()){                                // longest traced route
    const [x,y] = E.unkey(k);
    const p = E.tracePath(pz, r0, x, y);
    if (p && (!path || p.length>path.length)){ path=p; dest=[x,y]; }
  }
  check('fow: a long route exists to test against', !!path && path.length>=4);
  // plant an ambusher beside a late step of the route, out of everyone's sight.
  // Scan steps from the destination backward so the placement is robust to the
  // exact route length (which shifts with movement/traits).
  let amb = null;
  for (let si=path.length-2; si>=1 && !amb; si--){
    const step = path[si];
    amb = E.neighbors(step[0],step[1]).map(([x,y])=>({x,y}))
      .find(h=>E.passable(h.x,h.y) && !E.unitAt(h.x,h.y) && !E.sightFor('G').has(E.keyOf(h.x,h.y))) || null;
  }
  if (amb){
    hidFoe.x = amb.x; hidFoe.y = amb.y; Gf.mv++;
    const r1 = E.reachable(pz);
    check('fow: the unseen ambusher leaves no hole in the reach preview',
      r1.has(E.keyOf(amb.x,amb.y)) || r1.size >= r0.size - 2);
    const plan = E.fowMovePlan(pz, dest[0], dest[1], r1);
    check('fow: the march halts on surprise contact',
      plan.contact && plan.contact.id===hidFoe.id && !(plan.x===dest[0] && plan.y===dest[1]));
    check('fow: the halt hex is free ground', !E.unitAt(plan.x,plan.y) || (plan.x===pz.x && plan.y===pz.y));
  } else {
    check('fow: ambush spot found beside the route', false, 'no hidden hex next to route');
  }

  // photo-recon reveals a patch, costs the mission, and goes stale next turn
  E.newGame('G','normal','ai','barbarossa',{fow:true});
  const G4 = E.getState();
  const au = G4.air.find(a=>a.side==='G');
  let hit=null;
  outer2: for (let y=0;y<E.ROWS;y++) for (let x=0;x<E.COLS;x++){
    if (!E.passable(x,y) || E.sightFor('G').has(E.keyOf(x,y))) continue;
    if (E.airRecon(au, x, y)){ hit=[x,y]; break outer2; }
  }
  check('fow: photo-recon reveals the target patch', !!hit && E.sightFor('G').has(E.keyOf(hit[0],hit[1])));
  check('fow: recon spends the air group', au.mission==='done');
  E.startPhase('G');
  check('fow: the photos are stale by your next turn', !E.sightFor('G').has(E.keyOf(hit[0],hit[1])));

  // fog survives a save/load and a few AI turns without breaking invariants
  E.newGame('S','normal','ai','barbarossa',{fow:true});   // human plays S → the AI owns G
  E.deserialize(E.serialize());
  const G5 = E.getState();
  check('fow: state round-trips through a save', G5.variants.fow && !!G5.seen);
  for (let i=0;i<6 && !G5.over;i++){
    if (G5.phase==='G') E.aiFullPhase('G');                 // AI side plays under full information
    if (!G5.over) E.endPhase();
  }
  const pos = new Set(); let stacked=false;
  for (const u of G5.units){ const k=u.x+','+u.y; if (pos.has(k)) stacked=true; pos.add(k); }
  check('fow: AI turns keep the no-stacking invariant', !stacked);
}

/* ---------------- The World at War (native Europe strategic layer) ---------------- */
say('— The World at War —');
{
  const D = E.WW_DATA;
  check('WW map is '+D.rows+' rows', D.terr.length===D.rows && D.owner.length===D.rows);
  check('WW terr rows all '+D.cols+' chars', D.terr.every(r=>r.length===D.cols),
    D.terr.map((r,i)=>r.length!==D.cols?i:null).filter(x=>x!==null).join(','));
  check('WW owner rows all '+D.cols+' chars', D.owner.every(r=>r.length===D.cols));
  check('WW terrain chars legal', D.terr.every(r=>/^[.fh~]+$/.test(r)));
  const chars = new Set(D.nations.map(n=>n.c));
  check('WW owner chars map to nations', D.owner.every(r=>[...r].every(c=>c==='.'||chars.has(c))));
  check('WW nation chars unique', chars.size===D.nations.length);
  check('WW nation keys unique', new Set(D.nations.map(n=>n.key)).size===D.nations.length);

  const W = E.wwBuildState();
  check('WW state own grid size', W.own.length===D.cols*D.rows);
  let land=0; for(const r of D.owner) for(const c of r) if(c!=='.') land++;
  let owned=0; for(let i=0;i<W.own.length;i++) if(W.own[i]>=0) owned++;
  check('WW owned hexes == land hexes', owned===land, owned+' vs '+land);
  const sum = W.nat.reduce((a,n)=>a+n.hexes,0);
  check('WW nation hexes sum to land', sum===land, sum+' vs '+land);
  check('WW cities on land', W.cities.every(c=>!E.wwSea(c.x,c.y)),
    W.cities.filter(c=>E.wwSea(c.x,c.y)).map(c=>c.name).join(','));
  for (const k of ['GER','SOV','ENG','FRA','ITA','POL']){
    const n = W.byKey[k];
    check('WW '+k+' present w/ capital + industry',
      !!n && !!E.wwCapitalHex(k) && n.civ>0 && n.hexes>0);
  }
  const f = E.wwFactions();
  check('WW factions populated',
    f.axis.length>0 && f.allies.length>0 && f.comintern.length>0 && f.neutral.length>0);
  check('WW neighbours in-bounds at corners',
    E.wwNb(0,0).every(([x,y])=>x>=0&&x<D.cols&&y>=0&&y<D.rows) &&
    E.wwNb(D.cols-1,D.rows-1).every(([x,y])=>x>=0&&x<D.cols&&y>=0&&y<D.rows));

  // --- game logic: setup, war state, movement, conquest, turns, victory ---
  const G = E.wwSetup('GER');
  check('WW setup places armies', G.armies.length>40 && E.wwArmiesOf('GER').length>0);
  check('WW 1939 war: Axis vs Allies', E.wwAtWar('GER','POL') && E.wwAtWar('GER','FRA'));
  check('WW USSR neutral at start', !E.wwAtWar('GER','SOV') && !E.wwAtWar('GER','ENG')===false);
  check('WW allies are not at war with each other', !E.wwAtWar('ENG','FRA') && E.wwAllied('ENG','FRA'));
  // an army has legal reachable moves and they are passable, unoccupied land
  const ga = E.wwArmiesOf('GER')[0];
  const reach = E.wwReachable(ga);
  check('WW army has reachable moves', reach.length>0 &&
    reach.every(([x,y])=>!E.wwSea(x,y) && E.wwPassableFor('GER',x,y) && !E.wwArmyAt(x,y)));
  // conquest: an overwhelming stack storms Warsaw and Poland capitulates
  const cap = E.wwCapitalHex('POL');
  const polHexes = G.byKey.POL.hexes, gerHexes = G.byKey.GER.hexes;
  const nb0 = E.wwNb(cap[0],cap[1])[0];
  const blitz = {id:9999,nat:'GER',x:nb0[0],y:nb0[1],kind:'arm',str:300,maxStr:300,org:300,maxOrg:300,mp:4,moved:false};
  G.armies.push(blitz);
  for(let i=0;i<10 && !G.byKey.POL.capitulated;i++) E.wwAttack(blitz, cap[0], cap[1]);
  E.wwComputeStats();
  check('WW capturing capital capitulates nation', G.byKey.POL.capitulated===true);
  check('WW capitulation transfers territory to the victors', G.byKey.POL.hexes===0 && G.byKey.GER.hexes>gerHexes);
  check('WW capitulation removes the nation’s armies', E.wwArmiesOf('POL').length===0);
  check('WW ownership stays consistent after conquest',
    (()=>{ let o=0; for(let i=0;i<G.own.length;i++) if(G.own[i]>=0) o++; let land=0;
      for(const r of D.owner) for(const c of r) if(c!=='.') land++; return o===land; })());
  // peace conference: conquered land is split by who militarily OCCUPIES it; co-belligerents
  // who merely declared war (no troops on the ground) get nothing.
  const Gpc = E.wwSetup('GER','normal');
  E.wwDeclareWar('GER','POL'); E.wwDeclareWar('SOV','POL');
  const pcGi=Gpc.byKey.GER.i, pcSi=Gpc.byKey.SOV.i, pcPi=Gpc.byKey.POL.i;
  let polCells=[]; for(let i=0;i<Gpc.own.length;i++) if(Gpc.own[i]===pcPi) polCells.push([i%Gpc.cols,(i/Gpc.cols)|0]);
  polCells.sort((a,b)=>a[0]-b[0]);   // west → east
  Gpc.armies.length=0; let aid=1; const nP=polCells.length;
  for(let k=0;k<Math.floor(nP*0.65);k+=2){ const [x,y]=polCells[k]; Gpc.armies.push({id:aid++,nat:'GER',x,y,kind:'inf',str:5,maxStr:5,org:6,maxOrg:6,mp:2,moved:false}); } // Germany holds the west
  for(let k=Math.floor(nP*0.85);k<nP;k+=2){ const [x,y]=polCells[k]; Gpc.armies.push({id:aid++,nat:'SOV',x,y,kind:'inf',str:5,maxStr:5,org:6,maxOrg:6,mp:2,moved:false}); } // the USSR holds the east
  const pcHi = Gpc.byKey.HUN ? Gpc.byKey.HUN.i : -1;   // a minor that occupies central Poland but isn't a major
  if(pcHi>=0){ const [hx,hy]=polCells[Math.floor(nP*0.75)]; Gpc.armies.push({id:aid++,nat:'HUN',x:hx,y:hy,kind:'inf',str:5,maxStr:5,org:6,maxOrg:6,mp:2,moved:false}); }
  E.wwCapitulate('POL','GER'); E.wwComputeStats();
  let gGain=0,sGain=0,hGain=0; for(const [x,y] of polCells){ const o=Gpc.own[y*Gpc.cols+x]; if(o===pcGi)gGain++; else if(o===pcSi)sGain++; else if(o===pcHi)hGain++; }
  check('WW peace conference splits conquered land by who occupies it (bystanders get nothing)',
    Gpc.byKey.POL.hexes===0 && gGain+sGain===nP && gGain > sGain && sGain > 0);
  check('WW only majors (and the player) sit at the peace table — a minor occupier gets nothing', hGain===0);
  // run many AI turns without crashing; the calendar advances correctly
  const G2 = E.wwSetup('GER'); const y0=G2.date.y, startTurn=G2.turn;
  let vr; for(let t=0;t<30;t++){ vr=E.wwEndTurn(); if(vr.over) break; }
  check('WW end-turn loop is stable & advances the calendar',
    G2.turn>startTurn && (G2.date.y>y0 || G2.date.m>9) && G2.armies.length>0);

  // declaring war makes two nations enemies (both directions)
  const Gw = E.wwSetup('GER');
  check('WW neutral starts at peace', !E.wwAtWar('GER','SWE'));
  E.wwDeclareWar('GER','SWE');
  check('WW declaring war makes nations mutual enemies', E.wwAtWar('GER','SWE') && E.wwAtWar('SWE','GER'));

  // attacking a neutral auto-declares war and seizes the hex
  const Gn = E.wwSetup('GER'); const sw=Gn.byKey.SWE;
  let sx=-1,sy=-1;
  for(let y=0;y<Gn.rows && sx<0;y++) for(let x=0;x<Gn.cols;x++) if(Gn.own[y*Gn.cols+x]===sw.i){ sx=x; sy=y; break; }
  const swnb=E.wwNb(sx,sy)[0];
  Gn.armies.push({id:8888,nat:'GER',x:swnb[0],y:swnb[1],kind:'arm',str:200,maxStr:200,org:200,maxOrg:200,mp:4,moved:false});
  check('WW Sweden is neutral before assault', !E.wwAtWar('GER','SWE'));
  E.wwAttack(Gn.armies[Gn.armies.length-1], sx, sy);
  check('WW attacking a neutral declares war & captures', E.wwAtWar('GER','SWE') && E.wwOwnerAt(sx,sy).key==='GER');

  // a full all-AI campaign produces real conquest (retreats, encirclements, capitulations)
  const Gl = E.wwSetup('GER');
  for(let t=0;t<50;t++){
    for(const nn of Gl.nat){ if(!nn.capitulated && nn.key!=='XXX') E.wwAINation(nn); }
    E.wwProduction();
    for(const a of Gl.armies){ if(!a.moved && E.wwPassableFor(a.nat,a.x,a.y)){ a.org=Math.min(a.maxOrg,a.org+a.maxOrg*0.3); a.str=Math.min(a.maxStr,a.str+0.6); } }
    for(const a of Gl.armies) a.moved=false;
  }
  check('WW living war: at least one nation capitulates over a campaign',
    Gl.nat.some(n=>n.capitulated), Gl.nat.filter(n=>n.capitulated).map(n=>n.key).join(',')||'none fell');
  let ol=0; for(let i=0;i<Gl.own.length;i++) if(Gl.own[i]>=0) ol++;
  check('WW ownership invariant survives a long campaign', ol===owned);

  // --- Phase 4: supply, combined arms, difficulty ---
  check('WW difficulty scales AI power',
    E.wwSetup('GER','easy').aiPow < 1 && E.wwSetup('GER','hard').aiPow > 1 && E.wwSetup('GER','normal').aiPow===1);
  const Gs = E.wwSetup('GER','normal');
  const gcap = E.wwCapitalHex('GER');
  const homeArmy = {nat:'GER',x:gcap[0],y:gcap[1],str:10,maxStr:10,org:10,maxOrg:10,kind:'inf',mp:2,moved:false};
  check('WW army on home soil is in supply', E.wwInSupply(homeArmy));
  let dx=-1,dy=-1; const sovI=Gs.byKey.SOV.i;
  for(let y=0;y<Gs.rows && dx<0;y++) for(let x=Gs.cols-1;x>=0;x--) if(Gs.own[y*Gs.cols+x]===sovI){ dx=x; dy=y; break; }
  const deep = {nat:'GER',x:dx,y:dy,str:10,maxStr:10,org:10,maxOrg:10,kind:'inf',mp:2,moved:false};
  Gs.armies.push(deep); E.wwRecomputeSupply();
  check('WW army deep in enemy land is cut off from supply', !E.wwInSupply(deep));
  // combined arms: friendly support raises attack power
  const tgt=[gcap[0], gcap[1]-2];
  const lead={nat:'GER',x:gcap[0],y:gcap[1],str:10,maxStr:10,org:10,maxOrg:10,kind:'inf',mp:2,moved:false};
  const lonePow=E.wwAtkPower(lead, tgt[0], tgt[1]);
  for(const [x,y] of E.wwNb(tgt[0],tgt[1]).slice(0,2)) Gs.armies.push({nat:'GER',x,y,str:10,maxStr:10,org:10,maxOrg:10,kind:'inf',mp:2,moved:false});
  check('WW combined arms: supported attack is stronger', E.wwAtkPower(lead, tgt[0], tgt[1]) > lonePow + 1);
  // out-of-supply attrition: an isolated army loses organization over a turn
  const Ga = E.wwSetup('GER','normal');
  let ix=-1,iy=-1; const sovI2=Ga.byKey.SOV.i;
  for(let y=0;y<Ga.rows && ix<0;y++) for(let x=Ga.cols-1;x>=0;x--) if(Ga.own[y*Ga.cols+x]===sovI2){ ix=x; iy=y; break; }
  const iso={nat:'GER',x:ix,y:iy,str:10,maxStr:10,org:10,maxOrg:10,kind:'inf',mp:2,moved:false};
  Ga.armies.push(iso); const org0=iso.org; E.wwEndTurn();
  check('WW out-of-supply armies suffer attrition', iso.org < org0);

  // --- Phase 24: railroad supply (railheads creep forward, like Realistic Mode) ---
  const Grail = E.wwSetup('GER','normal'); const gcap2 = E.wwCapitalHex('GER');
  const homeArmy2 = {nat:'GER',x:gcap2[0],y:gcap2[1],kind:'inf',str:6,maxStr:6,org:8,maxOrg:8,mp:2,moved:false};
  check('WW home territory is railed & supplied at start', E.wwInSupply(homeArmy2) && Grail.byKey.GER.railDepth>0);
  check('WW the rail network covers the homeland', E.wwRailNetwork('GER').size > 100);
  // a unit dropped far beyond friendly rail is cut off (no railhead reaches it)
  let frx=-1,fry=-1; const sovi24=Grail.byKey.SOV.i;
  for(let y=0;y<Grail.rows && frx<0;y++) for(let x=Grail.cols-1;x>=0;x--) if(Grail.own[y*Grail.cols+x]===sovi24){ frx=x; fry=y; break; }
  const farU = {nat:'GER',x:frx,y:fry,kind:'inf',str:6,maxStr:6,org:8,maxOrg:8,mp:2,moved:false};
  Grail.armies.push(farU); E.wwRecomputeSupply();
  check('WW a spearhead beyond the railhead is cut off', !E.wwInSupply(farU));
  // the railhead creeps forward each turn (rail re-laid behind the advance)
  const rd0 = Grail.byKey.GER.railDepth; E.wwEndTurn();
  check('WW the railhead extends each turn', Grail.byKey.GER.railDepth > rd0);

  // --- Phase 25: war economy (resources, fuel, manpower, casualties) ---
  const Geco = E.wwSetup('GER','normal');
  check('WW nations have oil, steel, fuel & a manpower pool',
    Geco.byKey.GER.steel>0 && Geco.byKey.GER.fuel>0 && Geco.byKey.GER.manpower>0 && Geco.byKey.ROM.oil>=6);
  // a resource city transfers its output to whoever holds it (Romanian oil)
  const oil0 = Geco.byKey.GER.oil, buc = Geco.cities.find(c=>c.name==='Bucharest');
  Geco.own[buc.y*Geco.cols+buc.x]=Geco.byKey.GER.i; buc.nat='GER'; E.wwComputeStats();
  check('WW capturing an oil city gains its production', Geco.byKey.GER.oil >= oil0+5);
  // production is gated by steel & manpower
  const Gpg = E.wwSetup('GER','normal'); Gpg.byKey.GER.steelStock=0; Gpg.byKey.GER.steel=0; Gpg.byKey.GER.prod=200;
  const a0 = E.wwArmiesOf('GER').length; E.wwProduction();
  check('WW production stalls without steel', E.wwArmiesOf('GER').length===a0);
  // fuel: an armoured force with little oil runs dry
  const Gf2 = E.wwSetup('ITA','normal');
  for(let i=0;i<14;i++) Gf2.armies.push({id:9100+i,nat:'ITA',x:38,y:98,kind:'arm',str:5,maxStr:5,org:6,maxOrg:6,mp:4,moved:false});
  for(let t=0;t<8;t++) E.wwEconomyTick();
  check('WW an armoured force burns fuel toward empty', Gf2.byKey.ITA.fuel < Gf2.byKey.ITA.fuelMax*0.2);
  // casualties mount over a war
  const Gca = E.wwSetup('GER','normal'); Gca.player='NONE';
  for(let t=0;t<20;t++){ for(const nn of Gca.nat){ if(!nn.capitulated&&nn.key!=='XXX') E.wwAINation(nn);} E.wwEconomyTick(); E.wwProduction();
    for(const a of Gca.armies){ if(!a.moved && E.wwInSupply(a)){ a.org=Math.min(a.maxOrg,a.org+a.maxOrg*0.3); } } for(const a of Gca.armies) a.moved=false; }
  check('WW casualties accumulate across a war', Gca.nat.reduce((s,nn)=>s+(nn.casualties||0),0) > 50000);
  // save/load preserves the economy
  E.wwClearSave(); const Gsv = E.wwSetup('GER','normal'); Gsv.byKey.GER.fuel=77; Gsv.byKey.GER.casualties=123456; Gsv.byKey.GER.manpower=88888; E.wwSave();
  E.wwSetup('FRA','easy'); E.wwDeserialize(E.wwLoadSave());
  check('WW save/load preserves the war economy',
    E.WW.byKey.GER.fuel===77 && E.WW.byKey.GER.casualties===123456 && E.WW.byKey.GER.manpower===88888);
  E.wwClearSave();

  // --- Phase 26: production lines (HOI4-style factory allocation) ---
  const Gpl = E.wwSetup('GER','normal'); const gpl=Gpl.byKey.GER;
  check('WW nations run infantry/armour/air production lines',
    gpl.lineMix && gpl.lineEff && gpl.lineProg &&
    Math.abs((gpl.lineMix.inf+gpl.lineMix.arm+gpl.lineMix.air)-1) < 1e-6);
  // a production focus re-weights the lines (normalised)
  E.wwSetLineMix('GER', E.WW_PROD_PRESETS.armoured);
  check('WW a production focus re-weights the lines toward armour',
    gpl.lineMix.arm > gpl.lineMix.inf && gpl.lineMix.arm > gpl.lineMix.air &&
    Math.abs((gpl.lineMix.inf+gpl.lineMix.arm+gpl.lineMix.air)-1) < 1e-6);
  // arbitrary weights are normalised to sum 1
  E.wwSetLineMix('GER', {inf:2,arm:1,air:1});
  check('WW production weights are normalised', Math.abs(gpl.lineMix.inf-0.5)<1e-6);
  // efficiency ramps up the longer a line runs
  const Gef = E.wwSetup('GER','normal'); const gef=Gef.byKey.GER;
  gef.steelStock=99999; gef.manpower=9999999; const eff0=gef.lineEff.inf;
  for(let i=0;i<10;i++) E.wwProduction();
  check('WW line efficiency ramps up while producing', gef.lineEff.inf > eff0);
  // an armoured focus fields more tanks than an infantry focus, given equal industry
  function plTanks(focus){ const G=E.wwSetup('GER','normal'); const g=G.byKey.GER;
    g.steelStock=99999; g.manpower=9999999; E.wwSetLineMix('GER', E.WW_PROD_PRESETS[focus]);
    for(let i=0;i<30;i++) E.wwProduction(); return E.wwArmiesOf('GER').filter(a=>a.kind==='arm').length; }
  check('WW an armoured focus fields more tanks than an infantry focus', plTanks('armoured') > plTanks('infantry'));
  // deploying a finished division places a real counter of the requested kind
  const Gdp = E.wwSetup('GER','normal'); const before26=E.wwArmiesOf('GER').length;
  const okDep = E.wwDeployDivision(Gdp.byKey.GER, 'arm'); const after26=E.wwArmiesOf('GER');
  check('WW a finished division deploys as a counter of its kind',
    okDep && after26.length===before26+1 && after26.some(a=>a.kind==='arm' && a.nat==='GER'));

  // --- Phase 27: battle plans / frontlines (standing orders auto-execute) ---
  const Gfr = E.wwSetup('GER','normal'); E.wwDeclareWar('GER','POL');
  for(const a of E.wwArmiesOf('GER')) E.wwSetOrder(a,'attack');
  const oc = E.wwOrderCounts('GER');
  check('WW divisions accept standing front orders', oc.attack===E.wwArmiesOf('GER').length && oc.front===0);
  // an offensive front advances toward the enemy on its own (no per-hex orders)
  const polCap = E.wwCapitalHex('POL').slice();   // fixed point even if Warsaw is later taken
  const meanDist = () => { const arms=E.wwArmiesOf('GER'); return arms.reduce((s,a)=>s+Math.hypot(a.x-polCap[0],a.y-polCap[1]),0)/arms.length; };
  const d0 = meanDist();
  for(const a of Gfr.armies) a.moved=false;
  E.wwExecuteFront('GER');
  check('WW an offensive front advances toward the enemy unbidden', meanDist() < d0 - 0.001);
  // an offensive seizes undefended ground; a held line digs in and does not lunge forward
  function frontGround(order){ const G=E.wwSetup('GER','normal'); E.wwDeclareWar('GER','POL');
    for(const a of E.wwArmiesOf('GER')) E.wwSetOrder(a,order);
    let own0=0; for(let i=0;i<G.own.length;i++) if(G.own[i]===G.byKey.GER.i) own0++;
    for(const a of G.armies) a.moved=false; E.wwExecuteFront('GER');
    let own1=0; for(let i=0;i<G.own.length;i++) if(G.own[i]===G.byKey.GER.i) own1++;
    return own1-own0; }
  check('WW an offensive seizes more ground than a held line', frontGround('attack') > frontGround('front'));
  // orders survive a save/load round-trip
  E.wwClearSave(); E.wwSetup('GER','normal'); E.wwArmiesOf('GER')[0].order='attack'; E.wwArmiesOf('GER')[1].order='front'; E.wwSave();
  E.wwSetup('FRA','easy'); E.wwDeserialize(E.wwLoadSave());
  check('WW battle-plan orders persist through save/load',
    E.wwOrderCounts('GER').attack>=1 && E.wwOrderCounts('GER').front>=1);
  E.wwClearSave();

  // --- Phase 28: combined arms (mixing infantry & armour on the front) ---
  const Gcom = E.wwSetup('GER','normal'); const gi28=Gcom.byKey.GER.i, cols28=Gcom.cols;
  // a horizontal pair of GER home hexes ([x+1,y] is always a hex-neighbour of [x,y])
  let bx=-1,by=-1;
  for(let y=3;y<Gcom.rows-3 && bx<0;y++) for(let x=3;x<cols28-4;x++){ if(Gcom.own[y*cols28+x]===gi28 && Gcom.own[y*cols28+x+1]===gi28){ bx=x;by=y; break; } }
  const tank={id:1,nat:'GER',x:bx,y:by,kind:'arm',str:5,maxStr:5,org:6,maxOrg:6,mp:4,moved:false};
  const tx28=bx+2, ty28=by;
  Gcom.armies.length=0; Gcom.armies.push(tank); E.wwRecomputeSupply();
  const pAlone=E.wwAtkPower(tank,tx28,ty28), caAlone=E.wwCombinedArms(tank);
  // an ARMOUR neighbour gives generic support but no combined arms
  Gcom.armies.length=1; Gcom.armies.push({id:2,nat:'GER',x:bx+1,y:by,kind:'arm',str:5,maxStr:5,org:6,maxOrg:6,mp:4,moved:false}); E.wwRecomputeSupply();
  const pArmNbr=E.wwAtkPower(tank,tx28,ty28), caArm=E.wwCombinedArms(tank);
  // an INFANTRY neighbour gives the same support PLUS combined arms
  Gcom.armies.length=1; Gcom.armies.push({id:3,nat:'GER',x:bx+1,y:by,kind:'inf',str:6,maxStr:6,org:8,maxOrg:8,mp:2,moved:false}); E.wwRecomputeSupply();
  const pInfNbr=E.wwAtkPower(tank,tx28,ty28), caInf=E.wwCombinedArms(tank);
  check('WW combined arms triggers only for mixed infantry/armour formations', !caAlone && !caArm && caInf);
  check('WW combined arms is a real bonus on top of generic support',
    pArmNbr>pAlone && Math.abs(pInfNbr/pArmNbr - 1.18) < 0.02);
  // the combat forecast surfaces it for the player
  const fcCA = E.wwForecast(tank, tx28, ty28);
  check('WW the combat forecast reports combined arms', fcCA.aCombined===true);

  // --- Phase 5: naval invasions ---
  const Gv = E.wwSetup('ENG','normal');
  let pair=null;
  for(const a of E.wwArmiesOf('ENG')){ if(!E.wwCoastal(a.x,a.y)) continue;
    const beach=E.wwInvadeTargets(a).find(([x,y])=>{ const o=Gv.own[y*Gv.cols+x]; return o>=0 && E.wwAtWar('ENG', Gv.nat[o].key); });
    if(beach){ pair={a,beach}; break; } }
  check('WW the UK can reach an enemy beach by sea', !!pair);
  if(pair){ pair.a.str=40; pair.a.org=40; pair.a.maxStr=40; pair.a.maxOrg=40;
    const r=E.wwInvade(pair.a, pair.beach[0], pair.beach[1]);
    check('WW amphibious assault lands a beachhead & seizes the coast',
      r.result==='landed' && E.wwOwnerAt(pair.beach[0],pair.beach[1]).key==='ENG'); }
  // AI island powers actually cross to the continent over a campaign
  const Gv2 = E.wwSetup('GER','normal');
  for(let t=0;t<30;t++){ for(const nn of Gv2.nat){ if(!nn.capitulated&&nn.key!=='XXX') E.wwAINation(nn);} E.wwProduction(); E.wwRecomputeSupply(); for(const a of Gv2.armies) a.moved=false; }
  check('WW AI mounts amphibious operations (UK reaches the continent)',
    E.wwArmiesOf('ENG').some(a=>a.x>22));
  let ov=0; for(let i=0;i<Gv2.own.length;i++) if(Gv2.own[i]>=0) ov++;
  check('WW ownership invariant survives a naval war', ov===owned);

  // --- Phase 6/12: air power (three wing types) ---
  const Gair = E.wwSetup('GER','normal');
  const gerAir = Gair.byKey.GER.air;
  check('WW air force splits into fighters / CAS / strategic bombers',
    gerAir && gerAir.fighter>0 && gerAir.cas>0 && gerAir.strat>0 && E.wwAirTotal(Gair.byKey.GER) > E.wwAirTotal(Gair.byKey.POL));
  check('WW fighter superiority is asymmetric & swings combat',
    E.wwAirSup('GER','POL') > 0.3 && E.wwAirSup('POL','GER') < -0.3 &&
    E.wwAirFactor('GER','POL') > 1.05 && E.wwAirFactor('POL','GER') < 1.0 &&
    E.wwAirFactor('GER','POL') > E.wwAirFactor('POL','GER'));
  // CAS only pays off with control of the sky: same CAS helps far more when you hold air superiority
  const casWithControl = E.wwAirFactor('GER','POL');           // GER: fighter edge + 90 CAS
  Gair.byKey.GER.air.fighter = 5;                              // surrender the sky
  const casWithoutControl = E.wwAirFactor('GER','POL');
  check('WW CAS needs air superiority to be effective', casWithControl > casWithoutControl + 0.08);
  // production doctrine steers what you build
  const Gdoc = E.wwSetup('GER','normal'); E.wwAirDoctrine('GER','superiority');
  const f0 = Gdoc.byKey.GER.air.fighter, s0 = Gdoc.byKey.GER.air.strat;
  for(let i=0;i<12;i++) E.wwProduction();
  check('WW air doctrine steers production (superiority builds fighters fastest)',
    (Gdoc.byKey.GER.air.fighter-f0) > (Gdoc.byKey.GER.air.strat-s0));

  // --- Phase 7/22: research tech tree & national focus ---
  const Gr7 = E.wwSetup('GER','normal');
  check('WW nations init a tech tree & a branching focus tree',
    Gr7.byKey.GER.techDone && E.wwTechList().length>20 && Gr7.byKey.GER.researching===null &&
    E.wwAvailableFocuses('GER').length===1 && E.wwFocusList('GER').some(f=>f.req && f.req.length));
  check('WW AI auto-starts a focus, player does not',
    !!Gr7.byKey.SOV.focusProg && !Gr7.byKey.GER.focusProg);
  check('WW land bonus starts neutral', E.wwLandBonus('GER')===1);
  // helper: research a specific tech to completion
  const research = (key, id) => { E.wwStartResearch(key, id); const n=E.WW.byKey[key]; let g=0; while(!n.techDone.has(id) && g++<60) E.wwResearchTick(n); };
  // a land tech raises the combat bonus
  const lb0=E.wwLandBonus('GER'); research('GER','inf1');
  check('WW researching a land tech raises combat power', E.wwLandBonus('GER') > lb0);
  // an industry tech adds factories (via computeStats bonus)
  research('GER','con1'); E.wwComputeStats();
  check('WW industry research adds factories', Gr7.byKey.GER.civ >= 38+2);
  // a logistics tech extends supply range
  const baseRange = E.wwSupplyField('GER');
  research('GER','log1'); const farRange = E.wwSupplyField('GER');
  let base=0, far=0; for(let i=0;i<baseRange.length;i++){ base+=baseRange[i]; far+=farRange[i]; }
  check('WW logistics research widens supply', far > base);
  // tech prerequisites gate the tree
  const Gt2 = E.wwSetup('GER','normal');
  check('WW tech prerequisites lock later tiers', !E.wwTechAvail('GER','con2') && E.wwTechAvail('GER','con1'));
  research('GER','con1');
  check('WW completing a tech unlocks its successor', E.wwTechAvail('GER','con2'));
  // prerequisites gate the focus tree: a deep focus is locked until its requirements are done
  const Gtree = E.wwSetup('GER','normal');
  check('WW focus prerequisites lock the branches', !E.wwFocusAvail('GER','panzer') && E.wwFocusAvail('GER','rhein'));
  // an army focus (panzer, needs rhein->wehr) spawns divisions when completed
  const Gf = E.wwSetup('GER','normal');
  Gf.byKey.GER.focusDone = new Set(['rhein','wehr']);
  const army0 = E.wwArmiesOf('GER').length;
  check('WW unlocking prerequisites makes the next focus available', E.wwFocusAvail('GER','panzer'));
  E.wwStartFocus('GER','panzer');
  const wk = Gf.byKey.GER.focusProg.turnsLeft;
  for(let i=0;i<wk;i++) E.wwFocusTick(Gf.byKey.GER);
  check('WW completing an army focus spawns divisions',
    E.wwArmiesOf('GER').length > army0 && Gf.byKey.GER.focusDone.has('panzer'));
  // a war-goal focus (Danzig or War) declares war when it completes
  const Gwg = E.wwSetup('GER','normal');
  Gwg.byKey.GER.focusDone = new Set(['rhein','wehr','ansch','sudet']);
  E.wwStartFocus('GER','danzig'); const wk2=Gwg.byKey.GER.focusProg.turnsLeft;
  for(let i=0;i<wk2;i++) E.wwFocusTick(Gwg.byKey.GER);
  check('WW a war-goal focus declares war on completion', E.wwAtWar('GER','POL') && Gwg.byKey.GER.focusDone.has('danzig'));

  // --- Phase 8: diplomacy & peace conference ---
  const Gd = E.wwSetup('GER','normal');
  check('WW neutrals are not auto-allied (real blocs are)', !E.wwAllied('SWE','SWI') && E.wwAllied('ENG','FRA'));
  check('WW relation helper reports war / ally / peace',
    E.wwRelation('GER','FRA')==='war' && E.wwRelation('GER','ITA')==='ally' && E.wwRelation('GER','SWE')==='peace');
  E.wwDeclareWar('GER','SWE');
  check('WW declaring war pulls in faction allies', E.wwAtWar('ITA','SWE'));
  // peace conference partitions a defeated nation among the victors (Molotov–Ribbentrop)
  const Gp = E.wwSetup('GER','normal');
  E.wwDeclareWar('SOV','POL');
  const gh0=Gp.byKey.GER.hexes, sh0=Gp.byKey.SOV.hexes, wc=E.wwCapitalHex('POL'), wn=E.wwNb(wc[0],wc[1])[0];
  Gp.armies.push({id:7777,nat:'GER',x:wn[0],y:wn[1],kind:'arm',str:300,maxStr:300,org:300,maxOrg:300,mp:4,moved:false});
  for(let i=0;i<10 && !Gp.byKey.POL.capitulated;i++) E.wwAttack(Gp.armies[Gp.armies.length-1], wc[0], wc[1]);
  E.wwComputeStats();
  check('WW peace conference partitions a nation among multiple victors',
    Gp.byKey.POL.hexes===0 && Gp.byKey.GER.hexes>gh0 && Gp.byKey.SOV.hexes>sh0);

  // --- Phase 9: save / load ---
  E.wwClearSave();
  const Gsl = E.wwSetup('FRA','hard');
  research('FRA','inf1'); E.wwStartFocus('FRA','maginot');
  for(let i=0;i<5;i++) E.wwEndTurn();
  check('WW no save slot before saving', !E.wwHasSave());
  E.wwSave();
  check('WW save slot is written', E.wwHasSave());
  const hash = own => Array.from(own).reduce((a,b,i)=>(a+(b+2)*(i%7+1))>>>0,0);
  const want = {turn:Gsl.turn, player:Gsl.player, diff:Gsl.difficulty, armies:Gsl.armies.length,
    fraLand:Gsl.byKey.FRA.bonusLand, gerHexes:Gsl.byKey.GER.hexes, ownHash:hash(Gsl.own)};
  E.wwSetup('GER','easy');                       // corrupt with a different game
  E.wwDeserialize(E.wwLoadSave());               // restore
  const R = E.WW;
  const got = {turn:R.turn, player:R.player, diff:R.difficulty, armies:R.armies.length,
    fraLand:R.byKey.FRA.bonusLand, gerHexes:R.byKey.GER.hexes, ownHash:hash(R.own)};
  check('WW save/load round-trips the full campaign',
    JSON.stringify(want)===JSON.stringify(got), JSON.stringify(want)+' vs '+JSON.stringify(got));
  const tBefore = R.turn; E.wwEndTurn();
  check('WW campaign is playable after loading', R.turn===tBefore+1);
  E.wwClearSave();
  check('WW save slot can be cleared', !E.wwHasSave());

  // --- Phase 10: combat forecast ---
  const Gfc = E.wwSetup('GER','normal');
  const pc = E.wwCapitalHex('POL'), pn = E.wwNb(pc[0],pc[1])[0];
  const atk = {nat:'GER',x:pn[0],y:pn[1],kind:'arm',str:12,maxStr:12,org:12,maxOrg:12,mp:4,moved:false};
  Gfc.armies = Gfc.armies.filter(a=>!(a.x===pc[0]&&a.y===pc[1]));
  Gfc.armies.push(atk);
  Gfc.armies.push({nat:'POL',x:pc[0],y:pc[1],kind:'inf',str:10,maxStr:10,org:12,maxOrg:12,mp:2,moved:false});
  E.wwRecomputeSupply();
  const fc = E.wwForecast(atk, pc[0], pc[1]);
  check('WW combat forecast gives bounded odds, both powers & air factor',
    fc.winPct>=3 && fc.winPct<=97 && fc.ap>0 && fc.dp>0 && fc.air>1);
  const opn = E.wwNb(pn[0],pn[1]).find(([x,y])=>!E.wwArmyAt(x,y)&&!E.wwSea(x,y)&&E.wwOwnerAt(x,y)&&E.wwOwnerAt(x,y).key==='POL');
  if(opn) check('WW forecast vs an undefended hex reads a certain capture', E.wwForecast(atk,opn[0],opn[1]).winPct===100);

  // --- Phase 15: seasons ---
  check('WW season cycle peaks in winter, bottoms in summer',
    E.wwWinterAt({y:1940,m:1,d:20})>0.95 && E.wwWinterAt({y:1940,m:7,d:22})<0.05 && E.wwWinterAt({y:1940,m:4,d:5})>0.2 && E.wwWinterAt({y:1940,m:4,d:5})<0.8);
  check('WW season names by month',
    E.wwSeasonName({y:1940,m:1,d:1})==='Winter' && E.wwSeasonName({y:1940,m:4,d:1})==='Spring' &&
    E.wwSeasonName({y:1940,m:7,d:1})==='Summer' && E.wwSeasonName({y:1940,m:10,d:1})==='Autumn');

  // --- Phase 16: General Winter ---
  const Gwin = E.wwSetup('GER','normal'); Gwin.date={y:1941,m:1,d:15};
  check('WW per-hex winter: deep north, clear south, none in summer',
    E.wwHexWinter(55,12)>0.8 && E.wwHexWinter(46,100)<0.05 &&
    (()=>{ Gwin.date={y:1941,m:7,d:15}; const s=E.wwHexWinter(55,12); Gwin.date={y:1941,m:1,d:15}; return s<0.05; })());
  check('WW cold nations come winter-ready, warm ones do not',
    E.wwGear('FIN')>0.7 && E.wwGear('SOV')>0.5 && E.wwGear('GER')<0.3 && E.wwGear('ITA')<0.2);
  let wsx=-1,wsy=-1; const sovI16=Gwin.byKey.SOV.i;
  for(let y=8;y<40 && wsx<0;y++) for(let x=0;x<Gwin.cols;x++){ if(Gwin.own[y*Gwin.cols+x]===sovI16 && E.wwHexWinter(x,y)>0.6){ wsx=x; wsy=y; break; } }
  const atkW={nat:'GER',x:wsx,y:wsy-1,kind:'arm',str:10,maxStr:10,org:10,maxOrg:10,mp:4,moved:false};
  const defW={nat:'SOV',x:wsx,y:wsy,kind:'inf',str:10,maxStr:10,org:10,maxOrg:10,mp:2,moved:false};
  Gwin.armies.push(atkW,defW); E.wwRecomputeSupply();
  check('WW winter saps the unprepared attacker more than the prepared defender',
    E.wwAtkPower(atkW,wsx,wsy) < E.wwDefPower(defW,wsx,wsy));
  Gwin.byKey.GER.winterGear=0.9; const strongP=E.wwAtkPower(atkW,wsx,wsy);
  Gwin.byKey.GER.winterGear=0.1; const weakP=E.wwAtkPower(atkW,wsx,wsy);
  check('WW winter gear restores combat power in the snow', strongP > weakP);
  // winter attrition on an unequipped army in deep snow
  const Gat=E.wwSetup('GER','normal'); Gat.date={y:1941,m:1,d:15}; Gat.byKey.GER.winterGear=0.1;
  let wax=-1,way=-1; for(let y=8;y<40 && wax<0;y++) for(let x=0;x<Gat.cols;x++){ if(Gat.terr[y][x]!=='~' && E.wwHexWinter(x,y)>0.6){ wax=x; way=y; break; } }
  const coldArmy={nat:'GER',x:wax,y:way,kind:'inf',str:10,maxStr:10,org:12,maxOrg:12,mp:2,moved:false};
  Gat.armies.push(coldArmy); const coldOrg0=coldArmy.org; E.wwEndTurn();
  check('WW troops caught in deep snow suffer winter attrition', coldArmy.org < coldOrg0-1);
  // movement: deep snow shrinks an unprepared army's reach somewhere on the northern front
  const Gmv=E.wwSetup('SOV','normal'); Gmv.byKey.SOV.winterGear=0.05; const sovMv=Gmv.byKey.SOV.i;
  let snowSlows=false;
  for(let y=12;y<46 && !snowSlows;y++) for(let x=2;x<Gmv.cols-2;x++){
    if(Gmv.own[y*Gmv.cols+x]!==sovMv) continue; Gmv.date={y:1941,m:1,d:15}; if(E.wwHexWinter(x,y)<0.7) continue;
    let land=0; for(const [nx,ny] of E.wwNb(x,y)) if(Gmv.own[ny*Gmv.cols+nx]===sovMv) land++; if(land<4) continue;
    const mv={nat:'SOV',x,y,kind:'inf',str:10,maxStr:10,org:10,maxOrg:10,mp:4,moved:false};
    Gmv.date={y:1941,m:7,d:15}; const rS=E.wwReachable(mv).length;
    Gmv.date={y:1941,m:1,d:15}; const rW=E.wwReachable(mv).length;
    if(rW<rS) snowSlows=true;
  }
  check('WW deep snow slows movement (routes close in winter)', snowSlows);
  // winter preparations raise readiness (and cost production)
  const Gp16=E.wwSetup('GER','normal'); Gp16.date={y:1941,m:1,d:15}; E.wwSetWinterizing('GER',true);
  const wgear0=Gp16.byKey.GER.winterGear; E.wwEndTurn();
  check('WW winter preparations raise readiness', Gp16.byKey.GER.winterGear > wgear0);
  // save/load preserves winter state
  E.wwClearSave(); const Gs16=E.wwSetup('GER','normal'); E.wwSetWinterizing('GER',true); Gs16.byKey.GER.winterGear=0.5; E.wwSave();
  E.wwSetup('FRA','easy'); E.wwDeserialize(E.wwLoadSave());
  check('WW save/load preserves winter readiness',
    Math.abs(E.WW.byKey.GER.winterGear-0.5)<0.001 && E.WW.byKey.GER.winterizing===true);
  E.wwClearSave();

  // --- Phase 21: grand-strategy AI ---
  const Gai = E.wwSetup('ENG','normal');
  E.wwAIPlan(Gai.byKey.GER);
  check('WW AI picks a main enemy & a schwerpunkt objective',
    !!Gai.byKey.GER.aiMainEnemy && Array.isArray(Gai.byKey.GER.aiObjective));
  check('WW AI is offensive when its capital is safe', Gai.byKey.GER.aiPosture==='offensive');
  // it turns defensive when the enemy masses on its capital
  const Gd2 = E.wwSetup('POL','normal'); const pcap = E.wwCapitalHex('POL');
  for(let i=0;i<6;i++) Gd2.armies.push({id:5000+i,nat:'GER',x:pcap[0]+(i%3-1),y:pcap[1]-2,kind:'arm',str:30,maxStr:30,org:30,maxOrg:30,mp:4,moved:false});
  E.wwAIPlan(Gd2.byKey.POL);
  check('WW AI defends when the enemy masses on its capital', Gd2.byKey.POL.aiPosture==='defensive');
  // a full all-AI campaign is decisive and stable
  const Gc2 = E.wwSetup('ENG','normal'); Gc2.player='NONE';
  for(let t=0;t<35;t++){ for(const nn of Gc2.nat){ if(!nn.capitulated&&nn.key!=='XXX') E.wwAINation(nn);} E.wwProduction();
    for(const nn of Gc2.nat){ if(!nn.capitulated&&nn.key!=='XXX'){ E.wwResearchTick(nn); E.wwFocusTick(nn);} } E.wwRecomputeSupply(); for(const a of Gc2.armies) a.moved=false; }
  E.wwComputeStats();
  check('WW the grand-strategy AI wages a decisive war', Gc2.nat.filter(nn=>nn.capitulated).length>=2,
    Gc2.nat.filter(nn=>nn.capitulated).map(nn=>nn.key).join(','));
  let aiInv=0; for(let i=0;i<Gc2.own.length;i++) if(Gc2.own[i]>=0) aiInv++;
  check('WW AI campaign keeps the ownership invariant', aiInv===owned);

  // --- Phase 11/12: strategic bombing (needs air superiority to bite) ---
  const Gb = E.wwSetup('GER','normal');
  E.wwDeclareWar('GER','SOV'); E.wwSetBombing('GER','SOV');
  check('WW you can order a strategic bombing campaign', Gb.byKey.GER.bombTarget==='SOV');
  check('WW committing bombers diverts escorts from the front',
    E.wwFrontFighters(Gb.byKey.GER) < Gb.byKey.GER.air.fighter);
  const flips = (()=>{ const t=E.wwSetup('GER','normal'); const f0=E.wwAirFactor('GER','FRA'); E.wwSetBombing('GER','FRA'); return E.wwAirFactor('GER','FRA') < f0; })();
  check('WW bombing trades away air superiority over the front', flips);
  // without command of the sky, bombing achieves little and bleeds the bomber fleet
  const Gnos = E.wwSetup('GER','normal'); E.wwDeclareWar('GER','SOV');
  Gnos.byKey.GER.air.fighter = 20; Gnos.byKey.SOV.air.fighter = 300; Gnos.byKey.GER.air.strat = 120;
  E.wwSetBombing('GER','SOV'); const gStrat0 = Gnos.byKey.GER.air.strat;
  for(let t=0;t<6;t++) E.wwBombingTick();
  check('WW bombing without air superiority is ineffective & costly',
    (Gnos.byKey.SOV.warDmg||0) < 0.06 && Gnos.byKey.GER.air.strat < gStrat0);
  // with fighter superiority the escorted bombers get through and cripple industry
  const Gc = E.wwSetup('GER','normal'); E.wwDeclareWar('GER','SOV');
  Gc.byKey.GER.air.fighter = 500; Gc.byKey.GER.air.strat = 200; Gc.byKey.SOV.air.fighter = 40;
  E.wwSetBombing('GER','SOV');
  const sovMil0 = Gc.byKey.SOV.mil, sovFt0 = Gc.byKey.SOV.air.fighter;
  for(let t=0;t<10;t++){ E.wwBombingTick(); E.wwComputeStats(); }
  check('WW bombing with air superiority cripples enemy industry',
    Gc.byKey.SOV.warDmg > 0.2 && Gc.byKey.SOV.mil < sovMil0);
  check('WW interception bleeds the defender’s fighters', Gc.byKey.SOV.air.fighter < sovFt0);
  const peak = Gc.byKey.SOV.warDmg; E.wwSetBombing('GER','SOV');   // halt
  for(let t=0;t<8;t++) E.wwBombingTick();
  check('WW industry repairs once the bombing stops', Gc.byKey.SOV.warDmg < peak);
  // the AI runs its own bombing campaigns
  const Gba = E.wwSetup('POL','normal');
  for(let t=0;t<4;t++) E.wwEndTurn();
  check('WW the AI mounts strategic bombing of its own', Gba.nat.some(nn=>nn.key!=='POL' && nn.bombTarget));
  // save/load preserves air pools, doctrine & bombing
  E.wwClearSave();
  const Gbs = E.wwSetup('GER','normal'); E.wwDeclareWar('GER','SOV'); E.wwSetBombing('GER','SOV');
  E.wwAirDoctrine('GER','strategic'); Gbs.byKey.SOV.warDmg=0.3; E.wwSave();
  E.wwSetup('FRA','easy'); E.wwDeserialize(E.wwLoadSave());
  check('WW save/load preserves air pools, doctrine & bombing',
    E.WW.byKey.GER.bombTarget==='SOV' && E.WW.byKey.GER.air && E.WW.byKey.GER.air.strat>0 &&
    Math.abs(E.WW.byKey.GER.airBuild.strat-0.45)<0.001 && Math.abs((E.WW.byKey.SOV.warDmg||0)-0.3)<0.001);
  // old numeric-air saves migrate into the three-wing model
  const oldSave = E.wwSerialize(); oldSave.nat.find(x=>x.key==='ITA').air = 120;
  memLS.setItem('ww-save-v1', JSON.stringify(oldSave));
  E.wwDeserialize(E.wwLoadSave());
  check('WW old numeric-air saves migrate to wings',
    E.WW.byKey.ITA.air && E.WW.byKey.ITA.air.fighter===60 && E.WW.byKey.ITA.air.strat===24);
  E.wwClearSave();
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
  // the mission briefing card opens on every fresh battle — read and dismiss it
  const briefed = !$('briefing-modal').classList.contains('hidden') &&
                  ($('brief-objectives').innerHTML||'').includes('VP');
  if ($('btn-briefing-close').onclick) $('btn-briefing-close').onclick();
  // the replayability variants are always-on now — starting through the real
  // menu must hand the campaign all four (proves the always-on wiring works)
  const v0 = UI.getState().variants;
  const variantsForced = !!(v0 && v0.wx && v0.res && v0.vet && v0.fow);
  if ($('btn-threat').onclick) $('btn-threat').onclick();   // exercise the threat overlay live during play
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
  if ($('ui-scale').oninput){ $('ui-scale').value = 110; $('ui-scale').oninput(); }   // interface-size slider
  if ($('view-3d').onclick){ $('view-3d').onclick(); $('view-2d').onclick(); }        // 3D battlefield view toggle
  if ($('btn-tilt').onclick){ $('btn-tilt').onclick(); $('btn-tilt').onclick(); }      // experimental camera tilt on/off
  // the top-bar Pause button opens the pause screen (the discoverable home for
  // settings/save/help) — open it and resume
  if ($('btn-menu').onclick){ $('btn-menu').onclick();
    if ($('btn-pause-resume').onclick) $('btn-pause-resume').onclick(); }
  $('btn-help2').onclick(); $('btn-help-close').onclick();
  if ($('wx-chip').onclick){ $('wx-chip').onclick(); $('btn-clock-close').onclick(); }
  if ($('btn-aispeed').onclick) $('btn-aispeed').onclick();
  if ($('btn-supply').onclick){ $('btn-supply').onclick(); $('btn-supply').onclick(); }
  if ($('btn-threat').onclick){ $('btn-threat').onclick(); $('btn-threat').onclick(); }   // threat overlay on/off
  if ($('btn-next').onclick) $('btn-next').onclick();   // cycle to next unit with orders
  if ($('btn-undo').onclick) $('btn-undo').onclick();
  // the variant chips are now lit-and-inert "always on" indicators — clicking
  // them must NOT toggle anything (onclick removed)
  const chipsInert = ['var-wx','var-res','var-vet','var-fow','rvar-wx','rvar-res','rvar-vet','rvar-fow',
                      'wvar-wx','wvar-res','wvar-vet','wvar-fow'].every(vid => !$(vid).onclick);
  // campaign replay: recorded turn-by-turn, opened from the end screen
  const rep = UI.getState().replay;
  const replayRecorded = Array.isArray(rep) && rep.length >= 2 &&
    rep.every(f => typeof f.o === 'string' && f.o.length === UI.COLS*UI.ROWS);
  if ($('btn-end-replay').onclick) $('btn-end-replay').onclick();        // open the replay viewer
  if ($('rp-mode-heat').onclick){ $('rp-mode-heat').onclick(); $('rp-mode-replay').onclick(); }  // both views
  if ($('rp-scrub').oninput){ $('rp-scrub').value = 1; $('rp-scrub').oninput(); }
  if ($('rp-play').onclick){ $('rp-play').onclick(); $('rp-play').onclick(); }
  drain();
  if ($('rp-close').onclick) $('rp-close').onclick();
  $('btn-sound').onclick();                  // opens the settings modal
  if ($('vol-music').oninput){ $('vol-music').value = 55; $('vol-music').oninput(); }
  if ($('vol-sfx').oninput){ $('vol-sfx').value = 70; $('vol-sfx').oninput(); }
  if ($('btn-mute').onclick){ $('btn-mute').onclick(); $('btn-mute').onclick(); }
  // cycle graphics quality — High lights up the cinematic pass (cloud shadows,
  // sun grade, grain, soft counter shadows); make sure those paths render clean
  for (const lv of ['low','high','medium']) if ($('gfx-'+lv).onclick){ $('gfx-'+lv).onclick(); drain(); }
  if ($('btn-settings-close').onclick) $('btn-settings-close').onclick();
  drain();
  // The World at War — open it, start a game as Germany, fight a turn, then leave
  let wawOk = true;
  if ($('mc-hex').onclick){
    $('mc-hex').onclick(); drain();
    let ok = !!(UI.WW && UI.WW.on === true);
    if (sb.wwStart){
      sb.wwStart('GER'); drain();
      if (UI.WW){ UI.WW.cam.z = 2.6; if (sb.wwRender) sb.wwRender(); drain(); UI.WW.cam.z = 0.7; }   // exercise the zoomed-in detail renderer
      ok = ok && UI.WW.started === true && UI.wwArmiesOf('GER').length > 0;
      // open the focus & research panels and begin a national focus
      if ($('ww-btn-focus').onclick) $('ww-btn-focus').onclick();
      if ($('ww-btn-research').onclick) $('ww-btn-research').onclick();
      if ($('ww-btn-air').onclick) $('ww-btn-air').onclick();
      if ($('ww-btn-diplo').onclick) $('ww-btn-diplo').onclick();
      if (UI.wwAirDoctrine) UI.wwAirDoctrine('GER','superiority');
      if ($('ww-winter-toggle').onclick) $('ww-winter-toggle').onclick();
      if ($('ww-btn-supply').onclick) $('ww-btn-supply').onclick();   // supply map mode (builds front/supply overlays)
      if ($('ww-btn-research').onclick) $('ww-btn-research').onclick();  // open research tree page
      if (UI.wwStartResearch) UI.wwStartResearch('GER','con1');
      if ($('ww-btn-help').onclick) $('ww-btn-help').onclick();        // open the tutorial
      for (let i=0;i<7;i++) if ($('ww-tut-next').onclick) $('ww-tut-next').onclick();   // walk through & finish it
      if (UI.wwStartFocus) UI.wwStartFocus('GER');
      if (UI.wwSetBombing){ const foe = UI.WW.nat.find(nn=>UI.wwAtWar('GER',nn.key)); if(foe) UI.wwSetBombing('GER', foe.key); }
      const t0 = UI.WW.turn;
      if (sb.wwDoEndTurn){ sb.wwDoEndTurn(); drain(); }
      ok = ok && UI.WW.turn === t0 + 1 && !!UI.WW.byKey.GER.focusProg;
    }
    wawOk = ok;
    if ($('ww-back').onclick) $('ww-back').onclick();
  }
  const arcadeOver = UI.getState().over, arcadeResult = UI.getState().result;
  // the finished vs-AI campaign must land in the service record
  let recOk = false;
  try {
    const rec = JSON.parse(sb.localStorage.getItem('barb-record')||'{}');
    recOk = !!(rec.barbarossa && rec.barbarossa.plays >= 1 && rec.barbarossa.best[side]);
  } catch(e){}
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
  // combat juice: a fresh game, force a contact, and run the real player-attack path
  // (resolveCombat → combatJuice: scaled damage numbers, knockback, shake). It must
  // resolve cleanly and spawn its floating feedback without throwing.
  let juiceOk = false;
  try {
    UI.newGame('G','normal','hotseat','barbarossa');
    const j = sb.window.__dbgStageAttack && sb.window.__dbgStageAttack();
    juiceOk = !!(j && j.anims > 0 && j.defBefore > 0);
  } catch(e){ juiceOk = false; }
  return {over: arcadeOver, realisticOk, result: arcadeResult, uiErrors, wawOk, recOk, variantsForced, chipsInert, replayRecorded, briefed, juiceOk};
}

for (const side of ['G','S']){
  try {
    const r = uiSmoke(side);
    check(`UI campaign as ${side==='G'?'Germany':'Soviets'} reaches an ending`,
      r.over && r.uiErrors===0,
      r.over ? (r.uiErrors+' UI errors') : 'never ended');
    check(`UI service record keeps the finished campaign (${side})`, r.recOk, 'no record entry');
    check(`UI variants are always-on through the menu (${side})`, r.variantsForced, 'campaign started without all variants');
    check(`UI mission briefing opens on a fresh battle (${side})`, r.briefed, 'briefing modal missing or empty');
    check(`UI combat juice resolves an attack cleanly (${side})`, r.juiceOk, 'staged attack threw or produced no feedback');
    check(`UI variant chips are inert indicators (${side})`, r.chipsInert, 'a variant chip is still clickable');
    check(`UI campaign replay recorded turn by turn (${side})`, r.replayRecorded, 'no valid replay frames');
    check(`UI realistic-mode preview launches (${side})`, r.realisticOk, 'wrong scenario');
    check(`UI World at War opens (${side})`, r.wawOk, 'WW.on not set');
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
