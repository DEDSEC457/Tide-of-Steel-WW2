# Hearts of Iron 5 — agent guide

Single-file WW2 hex-strategy game. **The entire game is `index.html`** (~4,000 lines:
CSS + HTML + one `<script>`); `devtest.js` is the headless test harness. No build, no
deps, runs offline by double-clicking. Keep it that way.

## Token-frugal workflow (IMPORTANT — context is expensive here)

- **Never Read the whole of `index.html`.** Grep a banner/anchor from the map below,
  then Read only that region (`offset`/`limit`). The file is too big to skim.
- **Match the test to the change — this is the #1 speed lever.** The slow part of
  the suite is the AI-vs-AI campaign sims, dominated by the 60×36 Realistic map
  (~80s/game ⇒ full run ~8 min). So:
  - **UI / saves / menus / graphics / audio / docs →** `node devtest.js --fast`
    (**~15s**; runs every structural, rules, save-slot and UI-smoke check, skips
    the balance sims). These changes *cannot* affect balance, so don't pay for it.
  - **Combat / AI / unit stats / schedules / scenario data →** full
    `node devtest.js` (8 campaigns, verbose) before committing, plus
    `node balance-ab.js 24` for combat-math/stat changes.
- `node devtest.js 2 --quiet` (one-line output) for a quick mid-iteration pulse.
- Pipe test output through `grep FAIL` or `tail` — don't read 150 ok-lines.
- Batch all edits, then test once. Don't re-run tests to grep different patterns;
  `tee /tmp/t.out` and grep the file.
- Commit + push every finished feature: `git push -u origin <branch>` **and**
  `git push origin <branch>:main` (the user wants main always current).

## Map of index.html (grep these banners)

| Anchor (grep string) | What lives there |
|---|---|
| `SCENARIOS.barbarossa =` | Scenario 1 data (map/cities/units/generals/events/tiers) |
| `SCENARIOS.winter41 =` | Scenario 2 — Soviets attack, Road of Life supplySeeds |
| `SCENARIOS.stalingrad =` | Scenario 3 — southern map, allied flank armies |
| `SCENARIOS.kursk =` | Kursk 1943 — axis starts holding VP cities (score moves both ways), dug-in defenders |
| `SCENARIOS.alamein =` | El Alamein 1942 — desert; `'q'` impassable-depression terrain, `terrainColors` palette, `wxLabel`/`wxFx`/`wxMsg` Khamsin relabel |
| `SCENARIOS.dday =` | Scenario 4 — 36×22 map (18 turns), beach supplySeeds, edgeSupply off |
| `SCENARIOS.midway =` | Scenario 5 — naval kinds, carriers, 1-day turns |
| `DEFAULT_KINDS` / `DEFAULT_SIDES` | Eastern-front unit types; side names/flags/colors |
| `function loadScenario` | Sets the mutable mirrors (COLS, KINDS, EVENTS…) engine reads |
| `VETERANCY & HQ` | xp levels, vetMul, underHQ, previewGroup (combined arms) |
| `FUEL (realistic mode)` | usesFuel/fuelOf, FUEL_MAX/REGEN/DEPOT/TRICKLE — gated by `SCN.fuel` |
| `FOG OF WAR (variant)` | sightFor/isSpotted/ghosts/fowMovePlan/airRecon — all gated by `G.variants.fow`; AI never fooled |
| `CAMPAIGN VARIANTS` | applyVariants (chaos-weather wxPlan, shuffled G.sched, veteran cadres, fow) — menu chips `var-*` |
| `SCENARIOS.realistic =` | Realistic Mode — 60×36 front, `fuel`/`harshOOS` flags, g_mot/g_ss/s_cav kinds |
| `============ SUPPLY` | computeSupply (heap Dijkstra; edgeSupply, supplySeeds, range), ZOC, railNetwork |
| `makeHeap` / `railNetwork` | binary heap for the hot Dijkstras; railhead BFS (SCN.railhead) |
| `============ TERRITORY` | terr ownership grid → map tint + front line |
| `============ MOVEMENT` | moveCost, reachable (HQ +1 mp, snow penalties) |
| `============ COMBAT` | combatMods (the WHY factors list!), resolveCombat (groups, xp, advance) |
| `============ PRODUCTION` | reinforce/deploy; buyableKinds (noBuy flag) |
| `============ AIR POWER` | strikes, patrols, carrier-based range, air `home` = ship name |
| `THE WINTER QUESTION` / `HISTORICAL EVENTS` / `DECISIONS` | choice + popup systems |
| `============ TURN FLOW` | startPhase/endPhase (schedules, weather msgs, turnSnap) |
| `============ VICTORY` | axisVP, checkSuddenDeath (SCN.sudden), endGame |
| `============ AI` | aiSpend, bestAttack, gerScoreHex/sovScoreHex, aiPlanHQ, posture |
| `AI SKILL` / `diffCombat` | aiSkill (0/1/2 by difficulty), skillMinR, lineBonus, aiEscape — difficulty changes *play*, not just buffs |
| `SAVE / LOAD` | serialize/deserialize (loads save's scenario; migrations live here) |
| `HEADLESS EXPORTS` | module.exports list — add new engine fns here for tests |
| `function draw()` | canvas: terrain, tint, front-line edges, supply view, weather fx |
| `function drawUnit` | counters: symbols (inf/arm/para/cv/bb/ca/tr/ss/hq), chevrons, bars |
| `canvas.addEventListener('click'` | input: select/shift-group/attack/advance-choice |
| `function updateUnitCard` / `updatePreview` | side-panel cards; combined forecast |
| `soundtrack (original score` | WebAudio music engine; settings sliders nearby |
| `GRAND CAMPAIGN (strategic layer)` | The World at War — wholly separate `GW` state & `gw*` fns: GW_POWERS/GW_REGIONS, gwEcoTick (economy), gwResolveFronts/gwOffenseMod (combat + historical arc), gwAIEco, gwEndMonth, gwDraw/gwUpdateUI (UI). Own localStorage slot `gw-save-v1`. |

## Invariants & gotchas

- **Two sides only**: `'G'` and `'S'`. Scenario `sides` renames/recolors them
  (D-Day: G=Allies; Midway: G=Japan). Engine asymmetries: G moves first, G supplies
  from west edge / S from east (unless `edgeSupply`/`supplySeeds`), victory tiers
  count G-held VP, aiPlanGerman = aggressive / aiPlanSoviet = defensive.
- **Generals & carrier air bind by unit NAME** (`generalOf`, air `home`) — renaming a
  unit in scenario data silently detaches them. The registry tests catch this.
- **Saves**: everything lives in `G` (JSON). New fields need a migration line in
  `deserialize` if old saves must keep working. Scenario id is stored in the save.
- **Fake-DOM smoke test** (`devtest.js uiSmoke`): canvas ctx is a Proxy whose methods
  return `undefined` — guard gradient/measure results (see vignette). New buttons:
  add a guarded click in uiSmoke. New modals are fine (elements auto-create).
  End-turn needs **two** clicks (units-ready safeguard).
- **Map rows are strings** — every row must be exactly `cols` chars; the registry
  tests validate every scenario (lengths, units on land, unique hexes, kind keys,
  general/event/tier integrity). Trust them; don't hand-verify.
- **Balance norm**: tune so AI-vs-AI sims land the *history* tier as median
  (e.g. Barbarossa: Moscow falls ~30%, end VP ~7/16). `balance-ab.js` isolates
  features with `--no-pp --no-gear --no-generals`.
- Don't break: single-file offline play, autosave compatibility, the 147+ checks.
