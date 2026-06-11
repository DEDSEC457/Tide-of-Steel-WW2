#!/usr/bin/env node
/* Temporary A/B balance experiment — not part of the test suite.
   Usage: node balance-ab.js [runs] [--no-pp] [--no-gear] [--no-generals] */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
const sandbox = { module: {exports:{}}, console };
vm.createContext(sandbox);
vm.runInContext(m[1], sandbox);
const E = sandbox.module.exports;

const RUNS = parseInt(process.argv[2] || '32', 10);
const noPP = process.argv.includes('--no-pp');
const noGear = process.argv.includes('--no-gear');
const noGen = process.argv.includes('--no-generals');

if (noPP) for (const e of E.EVENTS) delete e.pp;
if (noGen) for (const g of E.GENERALS){ delete g.atk; delete g.def; delete g.mp; }

const results = {};
let moscowEver = 0, moscowEnd = 0, vp15 = [], vpEnd = [];
for (let i = 0; i < RUNS; i++){
  E.newGame('G','normal','hotseat');
  const G = E.getState();
  if (noGear) G.winterGear = false;
  let phases = 0, fell15 = 0, everMoscow = false, v15 = null;
  while (!G.over && phases < 66){
    E.aiFullPhase(G.phase);
    if (G.cities.find(c=>c.name==='Moscow').owner==='G') everMoscow = true;
    if (G.turn === 15 && G.phase === 'S' && v15 === null) v15 = E.axisVP();
    if (!G.over) E.endPhase();
    phases++;
  }
  if (everMoscow) moscowEver++;
  if (G.cities.find(c=>c.name==='Moscow').owner==='G') moscowEnd++;
  vp15.push(v15 ?? E.axisVP()); vpEnd.push(E.axisVP());
  const r = G.result ? G.result.title : 'TIMEOUT';
  results[r] = (results[r]||0)+1;
}
const avg = a => (a.reduce((x,y)=>x+y,0)/a.length).toFixed(1);
console.log(`flags: pp=${!noPP} gear=${!noGear} generals=${!noGen} runs=${RUNS}`);
console.log(`results: ${JSON.stringify(results)}`);
console.log(`Moscow ever ${moscowEver}/${RUNS} · at end ${moscowEnd}/${RUNS} · VP t15 ${avg(vp15)} · end ${avg(vpEnd)}`);
