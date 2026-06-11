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
    $('btn-endturn').onclick();              // human passes; AI plays via queued steps
    drain();
  }
  // exercise the modals too
  $('btn-objectives').onclick(); $('btn-obj-close').onclick();
  $('btn-help2').onclick(); $('btn-help-close').onclick();
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
