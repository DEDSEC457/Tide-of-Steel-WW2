# ⚙ Hearts of Iron 5

Tyler's personal turn-based WW2 strategy game project. A fan-made hobby game —
not affiliated with Paradox or the real Hearts of Iron series; the name is a
loving nickname for "the strategy game I always wanted."

**Campaign 1: Operation Barbarossa — Eastern Front 1941.**
The whole game is one file (`index.html`) that runs in any browser:
**100% offline, no installs, no accounts, autosaves every turn.**

## ▶ How to play
- **On any PC:** download `index.html` and double-click it (or use `Play Barbarossa.bat` on Windows).
- Germany invades the USSR on 22 June 1941. Each turn is one week; the campaign
  runs 28 turns into the Russian winter. Play **either side** vs the computer
  (3 difficulties) or **2-player hotseat** on one machine.

## 🧠 What makes it a strategy game
- **Supply & encirclement** — supply reaches only 7 hexes from your map edge or
  from cities you control (forward depots). Surround enemy armies to starve them;
  don't let your panzer spearheads outrun their own supply.
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
- **📰 History unfolds** — real dated dispatches from 1941 pop up as the weeks
  pass (Stalin's "brothers and sisters" speech, the Kiev pocket, the Red Square
  parade, Pearl Harbor…), a few with small production effects. And in mid-August
  the German side faces **the winter question**: divert 10 ⚙ to winter equipment,
  or gamble — as the OKH did — that the war ends before the snow. Gear mostly
  saves the December *defense* and keeps the infantry marching; no greatcoat
  unfreezes a panzer engine.

**Controls:** click a unit → move/attack · `N` next unit · `E` end turn · `Esc` deselect ·
drag to pan · scroll to zoom.

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
- Scenario starts (Smolensk crisis, the December counteroffensive)
- Pacific theater: USA vs Japan carrier war (campaign 2?)
