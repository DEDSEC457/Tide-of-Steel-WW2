# ⚔ Tide of Steel WW2

**A turn-based WW2 hex-strategy game — 19 historical battles, one file, plays
100% offline.** Developed & published by **Tyler Wanuga**. Version 1.0.

Command either side across the great campaigns of the Second World War — the
panzers racing the winter to Moscow, the carrier duel at Midway, the invasion
beaches of Normandy and the island fights of the Pacific — on a hex map, one
week (or one day, or one month) at a time. Three ways to play, chosen from the
main menu.

**🎮 Arcade Mode — 14 battles across three theaters**, streamlined and quick to
learn:
- **⚔ Eastern Front** — 🦅 Poland 1939 · ⛷ Winter War 1939 · ⚙ Barbarossa 1941 ·
  ❄ Winter Counteroffensive 1941 · 🏭 Stalingrad 1942 · 🔥 Kursk 1943
- **🌍 West & Africa** — 🐪 El Alamein 1942 · 🟦 D-Day 1944 · 🌉 Market Garden 1944 ·
  🎄 The Bulge 1944
- **🌊 The Pacific** — ⚓ Midway 1942 · 🌴 Guadalcanal 1942 · ⚔ Leyte Gulf 1944 ·
  🌊 Okinawa 1945 (with amphibious landings, airborne drops, carrier air and
  naval gunnery where the history calls for them)

**🗺 Realistic Mode — War in the East 1941–42** — the entire Eastern Front at
operational scale on a 60×36 map, the Baltic to the Caucasus:
- **⛽ Fuel logistics** — panzers, motorized and SS corps burn fuel to move and
  refuel only in supply; a spearhead that outruns its trains runs dry and
  culminates, exactly as the real ones did
- **New formations** — Motorized Corps, SS Panzer Korps, and Soviet Cavalry,
  on top of the rifle armies, tank corps and Guards
- **Lethal encirclement** — cut-off pockets fight at a fraction *and* starve
  fast; close a ring and hold it two turns and the trapped army collapses
- A **40-week campaign** through the autumn mud, the deep winter and the Soviet
  counteroffensive, with the historical mobilization deluge arriving by rail

The whole game is one file (`index.html`) that runs in any browser:
**100% offline, no installs, no accounts, autosaves every turn.**

## ▶ How to play
- **On any PC:** download `index.html` and double-click it (or use
  `Play Tide of Steel WW2.bat` on Windows). It opens in your browser — **100%
  offline, nothing to install, no account.**
- Pick a battle from the main menu and choose your side. Play **vs the computer**
  (four difficulties, Easy → Brutal — where the AI genuinely plays *smarter*, not
  just tougher) or **2-player hotseat** on one machine. Progress **autosaves every
  turn**, and each battle keeps its own save slot.

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

## 🌐 Play from anywhere & install as an app (recommended)
Make this repo **public** and turn on GitHub Pages (*Settings → Pages → Deploy
from branch → `main` → `/ (root)`*). GitHub gives you a link like
`https://yourname.github.io/hearts-of-iron-5/` — the game playable from any
browser, anywhere, no downloads. (The game contains no personal data — it is
just the game.)

That link is also an **installable app (PWA)**, which is the easiest way to share
it and keep everyone in sync:

- **Install it like a program.** Open the link in Chrome or Edge and click the
  **Install** icon in the address bar (or *⋮ menu → Install Tide of Steel*). Your
  friends get a **desktop icon** and the game opens in its own window — it looks
  and feels like an `.exe`, no app store, no account.
- **It works offline.** After the first visit the whole game is cached, so it
  plays with **no internet** — on a laptop on a plane, wherever.
- **Everyone stays up to date automatically.** Whenever you push a change, players
  who are online get your newest version the next time they open the app, and a
  one-tap **“Update & reload”** banner appears so they can grab it instantly. No
  re-sending files, no reinstalling — you push, they’re current.

Prefer a single file? The plain `index.html` still works exactly as before —
double-click it and play **100% offline**. The install/update features simply
switch on when the game is served from a web address (like GitHub Pages) and stay
out of the way otherwise.

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
- **Partisans** — partisan bands that cut supply behind the lines
- More scenarios — the framework makes them pure data

## © Credits & license
**Tide of Steel WW2** — version 1.0. Developed & published by **Tyler Wanuga**.

Copyright © 2026 Tyler Wanuga. All rights reserved. Free to download, play, and
share unmodified for personal, non-commercial use; not for sale or modification
without permission. See [`LICENSE`](LICENSE) for the full terms. The in-game
**⚙ Settings** panel shows the version and credit at any time.
