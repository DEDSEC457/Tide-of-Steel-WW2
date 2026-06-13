# ⚙ Hearts of Iron 5

Tyler's personal turn-based WW2 strategy game project. A fan-made hobby game —
not affiliated with Paradox or the real Hearts of Iron series; the name is a
loving nickname for "the strategy game I always wanted."

Three ways to play, chosen from the main menu.

**🎮 Arcade Mode — five campaigns**, streamlined and quick to learn:
- **⚙ Operation Barbarossa 1941** — Germany races the winter to Moscow
- **❄ The Winter Counteroffensive 1941** — Zhukov throws the frozen Wehrmacht
  back from the gates (now the *Soviets* attack)
- **🏭 Case Blue — Stalingrad 1942** — the Don bend, the Volga, the Caucasus
  oil — and Operation Uranus waiting in November
- **⚓ The Battle of Midway 1942** — carrier war in the Pacific, one turn per
  day: float­ing airfields, fragile flattops, and the ambush of the century
- **🟦 D-Day 1944** — the Allies hit five beaches: win the buildup race, take
  a port, break out of the bocage, and liberate Paris before autumn

**🗺 Realistic Mode — War in the East 1941–42** *(early preview)* — the entire
Eastern Front at operational scale on a 60×36 map, the Baltic to the Caucasus:
- **⛽ Fuel logistics** — panzers, motorized and SS corps burn fuel to move and
  refuel only in supply; a spearhead that outruns its trains runs dry and
  culminates, exactly as the real ones did
- **New formations** — Motorized Corps, SS Panzer Korps, and Soviet Cavalry,
  on top of the rifle armies, tank corps and Guards
- **Lethal encirclement** — cut-off pockets fight at a fraction *and* starve
  fast; close a ring and hold it two turns and the trapped army collapses
- A **40-week campaign** through the autumn mud, the deep winter and the Soviet
  counteroffensive, with the historical mobilization deluge arriving by rail

**🌍 The World at War — grand strategy 1939–45** *(early build)* — a whole second
game: pick a great power (Germany · USSR · Britain · France · Italy) and fight
the entire war across Europe and the Mediterranean, **one month per turn**.
- **Build a war economy** — civilian factories pour into a construction queue
  (build *more* factories, compounding your output); military factories produce
  the divisions that become your field armies; manpower limits how many you raise
- **Fight a multi-front war** on a strategic map — set each front's posture and
  pick where to concentrate your offensive; capitals fall, nations capitulate,
  the victor seizes the loser's industry
- **The real shape of WWII emerges** — France falls in 1940 (the blitz flanks the
  Maginot Line through the Low Countries), Britain holds behind the Channel, the
  USSR is caught off-guard at Barbarossa but its fortified depth turns the tide,
  and the Axis is ground down by 1944 — unless *you* rewrite history
- Dated dispatches (Pearl Harbor & Lend-Lease, Stalingrad, D-Day…) and autosave

The whole game is one file (`index.html`) that runs in any browser:
**100% offline, no installs, no accounts, autosaves every turn.**

## ▶ How to play
- **On any PC:** download `index.html` and double-click it (or use `Play Barbarossa.bat` on Windows).
- Germany invades the USSR on 22 June 1941. Each turn is one week; the campaign
  runs 28 turns into the Russian winter. Play **either side** vs the computer
  (3 difficulties) or **2-player hotseat** on one machine.

## 🧠 What makes it a strategy game
- **Supply & encirclement** — supply reaches only 7 hexes from your map edge or
  from cities you control (forward depots). Encircled units fight at a fraction
  of their strength and starve every turn — surround enemy armies to destroy
  them, and don't let your panzer spearheads outrun their own supply.
- **Terrain & entrenchment** — forests, hills, rivers, fortress cities; units
  that hold still dig in. Battle forecast before every attack. The map is tinted
  with the front line — grey ground is Axis-held, red is Soviet.
- **✈ The air war** — air groups fly Strike (close air support within 8 hexes of
  a friendly city) or Patrol (fighters intercept enemy strikes); idle groups
  repair, flak and dogfights bleed them.
- **Production** — spend ⚙ points to reinforce damaged armies or deploy new ones.
- **⭐ Named generals** — historical commanders lead their real formations:
  Guderian's panzers hit harder, Rokossovsky's riflemen are hard to dislodge,
  Katukov's T-34s ambush German armor. A general is lost with his unit. From
  early October, **Zhukov** takes command of the Moscow defense — Soviet units
  near the capital fight harder while it holds.
- **The clock** — October mud bogs everything down; December snow cripples German
  attacks while Siberian divisions and fresh Soviet air arrive. Germany must win
  *before* winter; the Soviets must survive *until* it.
- **📰 History unfolds** — real dated dispatches pop up as the weeks pass
  (Stalin's "brothers and sisters" speech, the Kiev pocket, the Red Square
  parade, Pearl Harbor…), a few with small production effects.
- **⚑ Decisions** — the great crossroads are real forks with lasting effects:
  the mid-August **winter question** (divert ⚙ to winter gear or gamble on an
  early victory), **the Kiev Turn** (wheel south for the pocket or drive on
  Moscow), **Nagumo's dilemma** at Midway (re-arm for the island or hold for the
  fleet), and **Mortain** at Normandy (the Führer's counterattack or save the army).
- **🔍 Battle Forecast** — before every attack, see the odds, the expected
  losses, and a full **WHY** breakdown of every modifier deciding the fight.
- **🧠 Smarter AI** — the attacker masses on weak points, pours fast units
  through breakthroughs to exploit a broken front, and reads its posture: it
  drives hard when it has the initiative and digs in when winter turns against it.
  **Difficulty is skill, not just a handicap:** on *Iron Will* the computer judges
  its odds more sharply, holds an unbroken line with no gaps to pour through,
  pulls doomed units out of forming pockets and concentrates its fire to finish
  the wounded — it plays better, it isn't simply handed bonuses.

**Controls:** click a unit → move/attack · **shift-click** several units → combined assault ·
`N` next unit · `E` end turn · `U` undo last move · `S` supply view · `Esc` deselect ·
drag to pan · scroll to zoom · click the weather chip for the campaign clock.

**Command depth:** units gain **experience** (Veteran → Hardened → Elite, +5/+10/+15%) as they
fight; **combined-arms** assaults (shift-click) hit far harder than piecemeal attacks, especially
tanks + infantry together, and you pick who exploits the breakthrough; **HQs** project a command
aura (+5% combat, +1 movement) to nearby units.

**Quality of life:** one-step undo, supply-network overlay, campaign weather clock,
AI turn-speed toggle (normal/fast/instant), "units still ready" end-turn warning,
save-overwrite warning, hotseat turn reports — plus visible rain in the rasputitsa
and falling snow, drifts and snow-capped forests in winter.

**Looks & sound:** a drawn front line snakes across the map between the armies,
coastlines glow, water shimmers, counters cast shadows, battles explode, and the
edges of the map fade into the war room's dark. An **original orchestral score**
— somber minor-key strings, a lone horn, distant timpani and a military snare —
is synthesized live by the game itself (no audio files, still a single
`index.html`). The Settings menu (🔊 button, or from the title screen) has
sliders for music and effects volume.

## 🌐 Play from anywhere (optional)
If you make this repo **public**, you can turn on GitHub Pages
(*Settings → Pages → Deploy from branch → main*) and GitHub gives you a link like
`https://yourguyty.github.io/hearts-of-iron-5/` — the game playable from any
browser, anywhere, no downloads. (The game contains no personal data — it is
just the game.)

## 🔧 For development
`node devtest.js [runs]` — headless test & balance harness. Validates the map
data, exercises the rules engine (supply, combat, air war, saves), plays full
AI-vs-AI campaigns checking for crashes and rule violations, and smoke-tests the
UI against a fake DOM. Run it after any change to `index.html` — it should end
with `ALL CHECKS PASSED`.

`node balance-ab.js [runs] [--no-pp] [--no-gear] [--no-generals]` — balance
A/B tool: plays AI-vs-AI campaigns with individual bonus systems switched off,
so you can see which feature moves the victory distribution.

## 🗺 Roadmap ideas
- **Soviet rail redeployment** — shuttle one army per turn between friendly cities
- **Factory evacuation** — dismantle industry in a threatened city: lose production
  now, gain it back behind the Urals later
- **Partisans** — from October, partisan bands cut German supply behind the lines
- More scenarios — the framework makes them pure data: Kursk 1943, the
  Destruction of Army Group Center 1944, Guadalcanal, Market Garden,
  the Battle of the Bulge
