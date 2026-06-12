#!/usr/bin/env node
/* Headless test & balance harness for index.html.
   Runs the game's <script> in a sandbox (no DOM), validates the map and
   rules, then plays full AI-vs-AI campaigns to smoke-test and check balance.
   Usage: node devtest.js [runs]                                     */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m){ console.error('FAIL: no <script> block found'); process.exit(1); }

const sandbox = { module: {exports:{}}, console };
vm.createContext(sandbox);
vm.runInContext(m[1], sandbox, {filename: 'barbarossa.js'});
const E = sandbox.module.exports;

let failures = 0;
function check(name, cond, extra){
  if (cond) { console.log('  ok  ' + name); }
  else { failures++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')); }
}

/* ---------------- static data validation ---------------- */
console.log('— map & data —');
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
console.log('— scenario registry —');
for (const id of Object.keys(E.SCENARIOS)){
  const s = E.SCENARIOS[id];
  const land = (x,y) => s.map[y] && s.map[y][x] && s.map[y][x] !== '~';
  check(`[${id}] map is ${s.cols}x${s.rows}, legal terrain`,
    s.map.length===s.rows && s.map.every(r=>r.length===s.cols && /^[.fhsr~]+$/.test(r)));
  check(`[${id}] cities on land, unique hexes`,
    s.cities.every(c=>land(c.x,c.y)) &&
    new Set(s.cities.map(c=>c.x+','+c.y)).size===s.cities.length);
  check(`[${id}] start units on land, unique hexes, known kinds`,
    s.startUnits.every(([k,n,x,y])=>land(x,y) && E.KINDS[k]) &&
    new Set(s.startUnits.map(u=>u[2]+','+u[3])).size===s.startUnits.length);
  check(`[${id}] schedules use known kinds`, s.sovSchedule.every(r=>E.KINDS[r[1]]));
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
}

/* coastal sanity: Riga, Odessa near sea; Moscow not */
console.log('— rules sanity —');
{
  const G = E.newGame('G','normal','ai');
  check('Germany opens, turn 1', G.turn===1 && G.phase==='G');
  check('14 Axis units', E.unitsOf('G').length===14, E.unitsOf('G').length);
  check('18 Soviet units', E.unitsOf('S').length===18, E.unitsOf('S').length);
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
console.log('— air power —');
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
console.log('— generals —');
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
console.log('— territory —');
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
console.log('— QoL —');
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

/* historical events & the winter question */
console.log('— events & winter gear —');
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
console.log(`— ${RUNS} AI-vs-AI campaigns —`);
const results = {};
let crashed = 0;
const vpAt = {8:[], 15:[], 21:[], 28:[]};
let minskT=[], kievT=[], smolenskT=[], moscowFell=0;

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
    console.log(`  run ${run+1}: ${r} — axis VP ${E.axisVP()}, ` +
      `G units ${E.unitsOf('G').length}, S units ${E.unitsOf('S').length}, ` +
      `losses G ${G.stats.G.lost} / S ${G.stats.S.lost}`);
  } catch(err){
    crashed++; failures++;
    console.log(`  run ${run+1}: CRASH — ${err.message}`);
  }
}
function MAXPHASES(){ return 28*2 + 10; }

/* ---------------- UI smoke test (fake DOM) ---------------- */
console.log('— UI smoke test —');
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
      appendChild(){}, addEventListener(){},
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
  if (side==='S') $('pick-sov').onclick();
  $('btn-start').onclick(); drain();         // begin campaign (AI opens if player is S)
  const UI = sb.module.exports;
  let guard = 0;
  while (!UI.getState().over && guard++ < 40){
    // dismiss event popups and answer the winter question like a player would
    for (let i=0;i<3;i++) if ($('btn-event-close').onclick) $('btn-event-close').onclick();
    if (UI.getState().winterGear === 'pending' && $('btn-gear-buy').onclick) $('btn-gear-buy').onclick();
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
  if ($('btn-undo').onclick) $('btn-undo').onclick();
  $('btn-sound').onclick(); drain();
  return {over: UI.getState().over, result: UI.getState().result, uiErrors};
}
for (const side of ['G','S']){
  try {
    const r = uiSmoke(side);
    check(`UI campaign as ${side==='G'?'Germany':'Soviets'} reaches an ending`,
      r.over && r.uiErrors===0,
      r.over ? (r.uiErrors+' UI errors') : 'never ended');
  } catch(err){
    failures++;
    console.log(`  FAIL UI smoke (${side}) — ${err.message}`);
  }
}

const avg = a => a.length ? (a.reduce((x,y)=>x+y,0)/a.length).toFixed(1) : '—';
console.log('— balance summary —');
console.log(`  results: ${JSON.stringify(results)}`);
console.log(`  avg axis VP  t8=${avg(vpAt[8])}  t15=${avg(vpAt[15])}  t21=${avg(vpAt[21])}  end=${avg(vpAt[28])}`);
console.log(`  city falls   Minsk t${avg(minskT)} (${minskT.length}/${RUNS})  Smolensk t${avg(smolenskT)} (${smolenskT.length}/${RUNS})  Kiev t${avg(kievT)} (${kievT.length}/${RUNS})  Moscow ${moscowFell}/${RUNS}`);
check('no crashes in campaign sims', crashed===0, crashed+' crashed');

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
