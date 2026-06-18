/* eslint-disable */
// Verbatim extraction of the single-file game engine (the strangler base).
// Runs as a classic sloppy-mode script, identical to the original index.html.
// New code is added as typed ES modules in src/ and replaces pieces of this over time.

"use strict";
/* =====================================================================
   OPERATION BARBAROSSA — Eastern Front 1941
   A single-file, fully offline, turn-based strategy game.
   Built for the Claude-Jarvis project: no installs, no internet, no APIs.
   Design pillars (from the classics):
     - Supply & encirclement  (Unity of Command / Hearts of Iron)
     - Terrain & entrenchment (Panzer General)
     - Production & the weather clock (Hearts of Iron)
   ===================================================================== */

/* ============================ SCENARIOS ============================ */
/* All campaign-specific data lives here: map, armies, schedules, weather,
   generals, events, victory conditions. The engine reads only the mutable
   mirrors set by loadScenario() — adding a campaign means adding data. */
const SCENARIOS = {};

/* ---------- Scenario 1: Operation Barbarossa, June–December 1941 ----------
   Map: 30 x 20 hexes, odd-r offset (pointy-top, odd rows shift right).
   ~ water   . plains   f forest   h hills   s swamp   r river        */
SCENARIOS.barbarossa = {
  id: 'barbarossa',
  title: 'OPERATION BARBAROSSA', short: 'BARBAROSSA',
  sub: 'EASTERN FRONT · JUNE — DECEMBER 1941 · TURN-BASED STRATEGY',
  menu: {
    ger: {h:'⬛ Germany (Axis)', p:'Race the clock. Use your panzers to break through, encircle whole Soviet armies, and take Moscow before the winter snows stop you cold.'},
    sov: {h:'🟥 Soviet Union', p:'Trade space for time. Hold the rivers and cities, never let your armies get surrounded, and bleed the invader until winter — then strike back.'},
  },
  cols: 30, rows: 20,
  map: [
/*           0    5    10   15   20   25     */
/* 0*/ "~~~~~~~~~~~~~~.ffffff.ffff.fff",
/* 1*/ "~~~~~~~~~~~~~..f.fff.f.ffff.ff",
/* 2*/ "~~~~....f..f.fff.fffh.f.fff.ff",
/* 3*/ "..f.....rr..f.ff.ff.hh.f.ff.ff",
/* 4*/ ".f.......rr..ff.f.f.......f.ff",
/* 5*/ "f.....f...r.f..f..f...f....f..",
/* 6*/ ".....f..f..r.f.....f.....f..f.",
/* 7*/ "......f.....f..r.f........f..f",
/* 8*/ "....sssss.ss...r....f....f....",
/* 9*/ "...sssssssss..r...........f...",
/*10*/ "....sssssss...r...............",
/*11*/ "..h..ss......r................",
/*12*/ ".h...........r............h...",
/*13*/ ".............r........h.......",
/*14*/ "..............r...............",
/*15*/ "..............r........rr.....",
/*16*/ ".............r................",
/*17*/ "..........~~~~~~~~~~~~~.......",
/*18*/ "....~~~~~~~~~~~~~~~~~~~~~.....",
/*19*/ "...~~~~~~~~~~~~~~~~~~~~~~~....",
  ],
  /* Cities: vp>0 are Axis objectives. owner 'G' | 'S'. */
  cities: [
  {x:1, y:3,  name:'Königsberg',     vp:0, owner:'G'},
  {x:2, y:7,  name:'Warsaw',         vp:0, owner:'G'},
  {x:1, y:15, name:'Bucharest',      vp:0, owner:'G'},
  {x:7, y:2,  name:'Riga',           vp:1, owner:'S'},
  {x:14,y:1,  name:'Leningrad',      vp:3, owner:'S'},
  {x:12,y:2,  name:'Pskov',          vp:0, owner:'S'},
  {x:3, y:8,  name:'Brest',          vp:0, owner:'S'},
  {x:9, y:7,  name:'Minsk',          vp:1, owner:'S'},
  {x:16,y:6,  name:'Smolensk',       vp:1, owner:'S'},
  {x:19,y:5,  name:'Vyazma',         vp:0, owner:'S'},
  {x:21,y:4,  name:'Kalinin',        vp:0, owner:'S'},
  {x:24,y:4,  name:'Moscow',         vp:4, owner:'S'},
  {x:24,y:7,  name:'Tula',           vp:0, owner:'S'},
  {x:18,y:8,  name:'Bryansk',        vp:0, owner:'S'},
  {x:21,y:9,  name:'Orel',           vp:0, owner:'S'},
  {x:13,y:9,  name:'Gomel',          vp:0, owner:'S'},
  {x:10,y:11, name:'Zhitomir',       vp:0, owner:'S'},
  {x:12,y:12, name:'Kiev',           vp:2, owner:'S'},
  {x:19,y:11, name:'Kharkov',        vp:1, owner:'S'},
  {x:16,y:13, name:'Dnepropetrovsk', vp:0, owner:'S'},
  {x:21,y:14, name:'Stalino',        vp:0, owner:'S'},
  {x:9, y:17, name:'Odessa',         vp:1, owner:'S'},
  {x:25,y:16, name:'Rostov',         vp:2, owner:'S'},
  {x:27,y:8,  name:'Voronezh',       vp:0, owner:'S'},
  {x:28,y:3,  name:'Yaroslavl',      vp:0, owner:'S'},
  ],
  /* Reinforcements appear at these (if friendly, supplied, empty), in order:
     interior cities first — fresh armies form near the fighting. */
  sovSpawns: [[24,4],[18,8],[19,11],[27,8],[21,9],[25,16],[29,5],[29,9],[29,13],[28,3]],
  gerSpawns: [[1,3],[2,7],[1,15],[0,3],[0,5],[0,11]],   // Königsberg, Warsaw, Bucharest + the frontier
  /* Starting order of battle. [kind, name, x, y, str] */
  startUnits: [
  // — Army Group North —
  ['g_inf','18. Armee',        4,2, 10], ['g_inf','16. Armee',  4,3, 10],
  ['g_pz' ,'4. Panzergruppe',  5,3, 10],
  // — Army Group Center —
  ['g_inf','9. Armee',         4,5, 10], ['g_pz' ,'3. Panzergruppe', 5,5, 10],
  ['g_inf','2. Armee',         3,6, 10], ['g_pz' ,'2. Panzergruppe', 4,6, 10],
  ['g_inf','4. Armee',         4,7, 10],
  // — Army Group South —
  ['g_inf','6. Armee',         3,11,10], ['g_pz' ,'1. Panzergruppe', 3,12,10],
  ['g_inf','17. Armee',        3,13,10], ['g_inf','11. Armee',       2,14, 9],
  ['g_ally','Romanian 3rd',    2,15, 8], ['g_ally','Romanian 4th',   2,16, 8],
  // — Soviet border armies (caught by surprise: under strength, low entrenchment) —
  ['s_inf','8th Army',   6,2, 6], ['s_inf','11th Army', 6,4, 6],
  ['s_inf','3rd Army',   5,6, 6], ['s_inf','10th Army', 5,7, 6],
  ['s_inf','4th Army',   3,8, 6], ['s_inf','5th Army',  5,11,6],
  ['s_inf','6th Army',   4,12,6], ['s_inf','26th Army', 4,14,6],
  ['s_inf','9th Army',   4,16,6],
  // — Second echelon —
  ['s_inf','27th Army',  9,3, 7], ['s_inf','13th Army',  9,7, 7],
  ['s_inf','20th Army', 16,6, 7], ['s_inf','37th Army', 12,12,7],
  ['s_inf','18th Army',  8,15,6],
  ['s_tank','1st Mech Corps', 7,5, 7], ['s_tank','4th Mech Corps', 7,11,7],
  // — Reserve —
  ['s_inf','16th Army', 19,5, 7], ['s_inf','24th Army', 24,4, 8],
  // — headquarters (command auras; keep them safe) —
  ['g_hq','OKH Mitte', 1,5, 6], ['g_hq','OKH Süd', 1,12, 6],
  ['s_hq','STAVKA', 27,4, 6], ['s_hq','Southwest Front HQ', 26,11, 6],
  ],
  /* Soviet mobilization: extra units per turn [turn, kind, name]. */
  sovSchedule: [
  [2,'s_inf','22nd Army'], [3,'s_inf','21st Army'], [3,'s_inf','29th Army'],
  [4,'s_inf','19th Army'],
  [4,'s_tank','5th Mech Corps'], [5,'s_inf','28th Army'], [6,'s_inf','30th Army'],
  [6,'s_mil','Kiev Militia'], [7,'s_inf','31st Army'], [7,'s_tank','7th Mech Corps'],
  [8,'s_inf','32nd Army'], [9,'s_inf','35th Army'],
  [9,'s_inf','33rd Army'], [10,'s_inf','34th Army'], [10,'s_tank','2nd Tank Corps'],
  [11,'s_inf','38th Army'], [12,'s_inf','40th Army'], [13,'s_inf','43rd Army'],
  [13,'s_mil','Moscow Militia'], [14,'s_inf','49th Army'], [15,'s_inf','50th Army'],
  [15,'s_tank','4th Tank Corps'], [16,'s_inf','52nd Army'], [17,'s_mil','Workers Militia'],
  [17,'s_inf','54th Army'], [18,'s_inf','55th Army'], [19,'s_inf','57th Army'],
  [20,'s_guard','1st Siberian Gds'], [20,'s_inf','58th Army'],
  [21,'s_guard','2nd Siberian Gds'], [22,'s_guard','3rd Siberian Gds'],
  [22,'s_inf','59th Army'], [23,'s_guard','4th Siberian Gds'],
  [24,'s_guard','5th Siberian Gds'], [25,'s_inf','60th Army'],
  [26,'s_inf','61st Army'], [27,'s_inf','62nd Army'],
  ],
  /* Named commanders attached to their historical formations. Small edges:
     atk/def are multipliers, mp is extra movement. The bonus is lost with the
     unit — generals go down with their commands, so guard them well. */
  generals: [
  // — German —
  {side:'G', unit:'2. Panzergruppe', name:'Guderian',     atk:1.15,
   bio:'"Schneller Heinz", father of the blitzkrieg — leads from a radio truck at the point of the spearhead.'},
  {side:'G', unit:'3. Panzergruppe', name:'Hoth',         atk:1.10,
   bio:'"Papa" Hoth — steady, relentless, driving up the Moscow highway.'},
  {side:'G', unit:'4. Panzergruppe', name:'Hoepner',      atk:1.10,
   bio:'The old cavalryman, commanding the armored thrust on Leningrad.'},
  {side:'G', unit:'1. Panzergruppe', name:'von Kleist',   atk:1.10,
   bio:'Aristocrat at the head of the southern panzer wedge, aimed at Kiev and the Donets.'},
  {side:'G', unit:'11. Armee',       name:'von Manstein', atk:1.15,
   bio:'The Wehrmacht’s sharpest operational mind, handed the southern flank in September.'},
  {side:'G', unit:'4. Armee',        name:'von Kluge',    def:1.10,
   bio:'"Clever Hans" — methodical and careful, very hard to catch off balance.'},
  // — Soviet —
  {side:'S', unit:'16th Army',       name:'Rokossovsky',  def:1.15,
   bio:'Master of the flexible defense. His army stands across the road to Moscow.'},
  {side:'S', unit:'19th Army',       name:'Konev',        def:1.10,
   bio:'A hard, unsentimental driver of men — a front commander in the making.'},
  {side:'S', unit:'13th Army',       name:'Yeryomenko',   atk:1.10,
   bio:'Promised Stalin he would smash "the scoundrel Guderian". He keeps trying.'},
  {side:'S', unit:'37th Army',       name:'Kirponos',     def:1.10,
   bio:'Commands the Kiev fortified region — and will not abandon his city.'},
  {side:'S', unit:'5th Army',        name:'Potapov',      def:1.10,
   bio:'His counterattacks out of the Pripyat marshes haunt the German flanks for months.'},
  {side:'S', unit:'4th Tank Corps',  name:'Katukov',      atk:1.15,
   bio:'Ambushes German armor with hull-down T-34s — Guderian learns his name at Mtsensk.'},
  ],
  /* Zhukov sits above army command. Recalled to the capital in early October
     (turn 16 = 5 Oct 1941 — he arrived on the 7th), he directs the Moscow
     defense: Soviet units fighting near the held capital defend harder. */
  capitalDefense: {turn:16, range:5, def:1.25, city:'Moscow',
    announce:'⭐ STAVKA recalls Army General Zhukov from Leningrad to command the Western Front — the defense of Moscow stiffens.'},
  /* Mid-August: the Quartermaster-General reports winter clothing for barely
     one man in five. Divert supply trains to winter equipment — or gamble,
     as the OKH did, that the war ends before the snow falls? */
  winterQuestion: {turn:9, cost:10},
  /* Strategic crossroads. apply(G) runs in engine scope (unitsOf, hexDist,
     KINDS, axisVP, G.pp all available); only the chosen index is serialized. */
  decisions: [
    {
      id:'kievturn', turn:10, side:'G',
      date:'21 August 1941', title:'THE KIEV TURN',
      text:'Against the protests of nearly every general, Hitler wants the panzers to wheel <b>south</b> toward Kiev — “My generals understand nothing of the economic aspects of war.” Guderian and Halder beg to keep driving on <b>Moscow</b> while the autumn roads still hold. The most argued-over order of the war. Here, the choice is yours.',
      options:[
        {label:'Wheel south — close the Kiev pocket',
         effect:'+2 strength to your 4 divisions nearest Kiev, +3⚙ now — but the delay hands the Soviets +4⚙ to fortify Moscow',
         blurb:'Reinforce Army Group South for the largest encirclement in history. The Red Army loses a fortune in the south — but Moscow gains weeks to dig in.',
         log:'⬛ The panzers turn south. The Kiev pocket begins to close — Moscow will have to wait.',
         apply(G){
           const k = G.cities.find(c=>c.name==='Kiev') || {x:12,y:12};
           unitsOf('G').slice().sort((a,b)=>hexDist(a.x,a.y,k.x,k.y)-hexDist(b.x,b.y,k.x,k.y))
             .slice(0,4).forEach(u=>{ u.str = Math.min(KINDS[u.kind].maxStr, u.str+2); });
           G.pp.G = Math.min(40, G.pp.G+3);
           G.pp.S = Math.min(40, G.pp.S+4);     // the delay lets the Soviets prepare the capital
         }},
        {label:'Drive on Moscow — defy the directive',
         effect:'+2 strength to your 3 divisions nearest Moscow, and +5⚙ now — but no help in the south',
         blurb:'Throw the spearheads straight at the capital while the weather holds. The flanks stay exposed and the south is left hanging — but the prize is the prize.',
         log:'⬛ “The objective is Moscow.” The central panzers roll east — flanks be damned.',
         apply(G){
           const mo = G.cities.find(c=>c.name==='Moscow') || {x:24,y:4};
           unitsOf('G').slice().sort((a,b)=>hexDist(a.x,a.y,mo.x,mo.y)-hexDist(b.x,b.y,mo.x,mo.y))
             .slice(0,3).forEach(u=>{ u.str = Math.min(KINDS[u.kind].maxStr, u.str+2); });
           G.pp.G = Math.min(40, G.pp.G+5);
         }},
      ],
      ai(G){ return axisVP() >= 6 ? 1 : 0; },   // ahead of schedule? gun for Moscow; else bag Kiev
    },
    {
      id:'sorge', turn:15, side:'S',
      date:'1 October 1941', title:'THE SORGE TELEGRAM',
      text:'From Tokyo, Richard Sorge has radioed: <b>Japan will strike south</b>, not into Siberia. If you believe him, the divisions watching Manchuria can entrain for Moscow <i>now</i> — weeks before winter. If he is wrong, the Far East lies naked. Stalin has been burned by intelligence before.',
      options:[
        {label:'Trust Sorge — bring the Siberians west',
         effect:'2 fresh Siberian Guards armies deploy at your reinforcement spawn immediately',
         blurb:'Two fresh Siberian Guards divisions arrive immediately, ahead of the winter timetable. If Japan strikes north after all… that is next year\'s problem.',
         log:'🟥 The Trans-Siberian thunders west — the Siberians will be at Moscow before the snow.',
         apply(G){
           for (const n of ['6th Siberian Gds','7th Siberian Gds']){
             const s = deploySpots('S')[0];
             if (s) G.units.push(makeUnit('s_guard', n, s[0], s[1]));
           }
         }},
        {label:'Keep watching Japan — hedge the bet',
         effect:'+6⚙ production now (no new divisions arrive)',
         blurb:'The Far East stays garrisoned. STAVKA banks the production it saves on rail movement and raises new formations the careful way.',
         log:'🟥 The Siberian divisions stay east of the Urals. Moscow must hold with what it has.',
         apply(G){ G.pp.S = Math.min(40, G.pp.S+6); }},
      ],
      ai(G){ return axisVP() >= 6 ? 0 : 1; },   // capital in danger? trust the spy
    },
  ],
  /* "This week in 1941" — real dispatches from the historical war, shown as
     the matching game week begins. pp:{side:n} grants a small production
     bonus. Pure static data keyed by turn — saves stay compatible. */
  events: [
  {turn:1,  date:'22 June 1941',      title:'OPERATION BARBAROSSA',
   text:'At 03:15 the guns open fire along an 1,800-kilometre front. Over three million Axis soldiers — the largest invasion force in history — cross into the Soviet Union. At noon it is Molotov, not Stalin, who tells the nation: “Our cause is just. The enemy will be beaten. Victory will be ours.”'},
  {turn:2,  date:'3 July 1941',       title:'STALIN SPEAKS', pp:{S:2},
   text:'After eleven days of silence Stalin finally addresses the nation — not as the Vozhd, but as no one has heard him before: “Brothers and sisters… my friends.” He orders scorched earth behind the retreating armies: not a locomotive, not a sack of grain for the invader.'},
  {turn:4,  date:'16 July 1941',      title:'SMOLENSK IN FLAMES',
   text:'Guderian’s tanks reach Smolensk, the historic gateway to Moscow. But this pocket does not surrender quietly — Soviet counterattacks hammer the corridor for weeks, and for the first time the German timetable begins to slip.'},
  {turn:5,  date:'21 July 1941',      title:'BOMBS ON MOSCOW',
   text:'By night, 195 Luftwaffe bombers raid Moscow. The flak over the Kremlin is so thick that Muscovites joke it is “the second front.” Damage is light. Moscow will not be bombed out of the war.'},
  {turn:8,  date:'14 August 1941',    title:'THE ATLANTIC CHARTER',
   text:'Roosevelt and Churchill, meeting secretly aboard warships off Newfoundland, pledge a world “freed from want and fear” — and aid for the Soviet Union. The first Arctic convoy sails for Archangelsk within the month.'},
  {turn:11, date:'6 September 1941',  title:'YELNYA: FIRST VICTORY',
   text:'At Yelnya, east of Smolensk, Zhukov’s armies throw the Wehrmacht off captured ground — the Red Army’s first true victory of the war. The divisions that won it receive a new title: the first of the Guards.'},
  {turn:13, date:'19 September 1941', title:'THE KIEV POCKET',
   text:'Kiev falls, and with it the largest encirclement in military history — over 600,000 Red Army soldiers. Colonel-General Kirponos dies leading the breakout attempt. The road south lies open; but precious weeks for Moscow have been spent.'},
  {turn:14, date:'25 September 1941', title:'SORGE’S TELEGRAM',
   text:'From Tokyo, the spy Richard Sorge radios Moscow: Japan will strike south against the Pacific powers, not north into Siberia. If Stalin believes him, the divisions watching Manchuria can come west. Winter will bring them.'},
  {turn:15, date:'2 October 1941',    title:'OPERATION TYPHOON',
   text:'“Today begins the last great, decisive battle of this year.” Two million men and three panzer armies wheel toward Moscow in the Ostheer’s final bid to end the war before winter.'},
  {turn:17, date:'16 October 1941',   title:'THE MOSCOW PANIC',
   text:'Rumour races ahead of the panzers: the Germans are coming. Ministries burn their files; crowds storm the eastbound trains. Then word spreads that Stalin has stayed in the Kremlin — the city steadies, and a quarter of a million Muscovites, most of them women, march out to dig anti-tank ditches.'},
  {turn:20, date:'7 November 1941',   title:'PARADE IN RED SQUARE', pp:{S:2},
   text:'On the anniversary of the Revolution, with the front barely 70 kilometres away, Stalin holds the parade anyway. Fresh divisions march past Lenin’s tomb through the falling snow — and keep marching, straight to the front line.'},
  {turn:25, date:'7 December 1941',   title:'PEARL HARBOR',
   text:'Japanese carrier aircraft devastate the US Pacific Fleet at Pearl Harbor. Four days later, Hitler declares war on the United States. Whatever happens in the snow before Moscow, this is now a world war — and Germany cannot win a long one.'},
  ],
  maxTurn: 28,                              // 28 weeks: 22 Jun 1941 → 4 Jan 1942
  startDate: Date.UTC(1941,5,22),
  // weather: turns 1-15 clear · 16-19 mud · 20-21 freeze · 22+ snow
  weather(turn){ return turn>=22?'snow' : turn>=20?'freeze' : turn>=16?'mud' : 'clear'; },
  pp(side, turn){
    if (side==='G') return turn<=13 ? 6 : 4;           // overstretch after autumn
    return turn<=6 ? 4 : turn<=14 ? 6 : 8;             // Soviet mobilization ramps up
  },
  // Axis victory tiers by objective points held at the end of the campaign
  victoryTiers: [
    [12,'DECISIVE AXIS VICTORY','The Soviet state collapses. Moscow has fallen and the Red Army is shattered — history takes a darker road.'],
    [8,'AXIS OPERATIONAL VICTORY','The Wehrmacht winters deep inside Russia, better placed than history. But the giant is waking…'],
    [5,'STALEMATE — HISTORY REPEATS','Like 1941 itself: vast gains, but the objectives held. Frozen soldiers stare at the spires of Moscow they will never reach.'],
    [0,'SOVIET VICTORY','The invasion is broken on the Red Army’s back. The counteroffensive rolls west through the snow.'],
  ],
  sudden: {
    axisCities: ['Moscow','Leningrad'], minAxisUnits: 5,
    axisTitle: 'DECISIVE AXIS VICTORY',
    axisText:  'Moscow and Leningrad have both fallen — Soviet command collapses. The war in the East is decided.',
    sovTitle:  'DECISIVE SOVIET VICTORY',
    sovText:   'The invading army has been annihilated. The Red Army marches west — years ahead of schedule.',
  },
  airInit: [
    ['G','Luftflotte 2', 9],
    ['G','Luftflotte 4', 7],
    ['S','VVS West Front', 4],              // caught on the ground, 22 June 1941
  ],
  sovAirSchedule: [                         // the Red Air Force rebuilds: [turn, name, str]
    [4,  'VVS Reserve Group', 6],
    [9,  '1st Air Army', 7],
    [18, 'Winter Air Command', 9],
  ],
  setup(st){
    // Soviet border armies start partly dug in along the frontier
    for (const u of st.units) if (u.side==='S' && u.x<=6) u.entrench = 1;
    // Brest fortress: starts beyond supply range, dug in deep — holds out like 1941
    const brest = st.units.find(u=>u.name==='4th Army');
    if (brest) brest.entrench = 3;
  },
  opening(playerSide){ return [
    '22 June 1941 — Operation Barbarossa begins. ' +
      (playerSide==='G' ? 'Strike fast: winter is coming.' : 'Hold the line: winter is coming.'),
    '✈ The Luftwaffe catches the Red Air Force on the ground — over 1,800 Soviet planes lost in a day.',
  ]; },
};

/* ---------- Scenario 2: The Winter Counteroffensive, December 1941 ----------
   Same map, two weeks after Barbarossa's clock runs out: the Wehrmacht stands
   frozen at the gates of Moscow with no winter gear, and Zhukov's fresh
   Siberian armies erupt from the capital. Now the Soviets attack. */
SCENARIOS.winter41 = {
  id: 'winter41',
  title: 'THE WINTER COUNTEROFFENSIVE', short: 'WINTER 1941',
  sub: 'MOSCOW · DECEMBER 1941 — MARCH 1942 · TURN-BASED STRATEGY',
  menu: {
    ger: {h:'⬛ Germany (Axis)', p:'No winter clothing, no reserves, and the Führer\'s order: stand fast. Weather the storm, hold your cities, and keep the army alive until spring.'},
    sov: {h:'🟥 Soviet Union', p:'The invader stands frozen at the gates. Strike with fresh Siberian divisions, carve up the German line, and throw them back from Moscow.'},
  },
  cols: 30, rows: 20,
  map: SCENARIOS.barbarossa.map,
  /* The early-December line: Axis hold the west and the Moscow approaches. */
  cities: [
    {x:1, y:3,  name:'Königsberg',     vp:0, owner:'G'},
    {x:2, y:7,  name:'Warsaw',         vp:0, owner:'G'},
    {x:1, y:15, name:'Bucharest',      vp:0, owner:'G'},
    {x:7, y:2,  name:'Riga',           vp:0, owner:'G'},
    {x:14,y:1,  name:'Leningrad',      vp:3, owner:'S'},
    {x:12,y:2,  name:'Pskov',          vp:0, owner:'G'},
    {x:3, y:8,  name:'Brest',          vp:0, owner:'G'},
    {x:9, y:7,  name:'Minsk',          vp:1, owner:'G'},
    {x:16,y:6,  name:'Smolensk',       vp:1, owner:'G'},
    {x:19,y:5,  name:'Vyazma',         vp:1, owner:'G'},
    {x:21,y:4,  name:'Kalinin',        vp:1, owner:'G'},
    {x:24,y:4,  name:'Moscow',         vp:4, owner:'S'},
    {x:24,y:7,  name:'Tula',           vp:1, owner:'S'},
    {x:18,y:8,  name:'Bryansk',        vp:0, owner:'G'},
    {x:21,y:9,  name:'Orel',           vp:1, owner:'G'},
    {x:13,y:9,  name:'Gomel',          vp:0, owner:'G'},
    {x:10,y:11, name:'Zhitomir',       vp:0, owner:'G'},
    {x:12,y:12, name:'Kiev',           vp:1, owner:'G'},
    {x:19,y:11, name:'Kharkov',        vp:1, owner:'G'},
    {x:16,y:13, name:'Dnepropetrovsk', vp:0, owner:'G'},
    {x:21,y:14, name:'Stalino',        vp:0, owner:'G'},
    {x:9, y:17, name:'Odessa',         vp:0, owner:'G'},
    {x:25,y:16, name:'Rostov',         vp:1, owner:'S'},
    {x:27,y:8,  name:'Voronezh',       vp:0, owner:'S'},
    {x:28,y:3,  name:'Yaroslavl',      vp:0, owner:'S'},
  ],
  sovSpawns: [[24,4],[24,7],[27,8],[28,3],[25,16],[29,5],[29,9],[29,13]],
  gerSpawns: [[16,6],[9,7],[12,12],[0,5],[0,11]],
  /* The Ostheer: deep in Russia, frostbitten, half strength, dug in.
     The Red Army: fresh shock armies and Siberians around the capital. */
  startUnits: [
    // — Axis, north to south —
    ['g_inf','18. Armee',       12,2, 7], ['g_inf','16. Armee',      13,3, 6],
    ['g_pz' ,'3. Panzerarmee',  21,3, 5], ['g_inf','9. Armee',       21,4, 7],
    ['g_pz' ,'4. Panzerarmee',  22,4, 5], ['g_inf','4. Armee',       21,6, 7],
    ['g_pz' ,'2. Panzerarmee',  23,8, 5], ['g_inf','2. Armee',       21,9, 6],
    ['g_inf','6. Armee',        19,11,7], ['g_inf','17. Armee',      17,13,6],
    ['g_pz' ,'1. Panzerarmee',  21,14,6], ['g_inf','11. Armee',      12,16,7],
    ['g_ally','Romanian 3rd',   10,15,6],
    // — Soviet fronts —
    ['s_inf','42nd Army',  14,1, 7], ['s_inf','4th Army',   15,2, 7],
    ['s_inf','54th Army',  16,2, 6], ['s_inf','26th Army',  17,1, 6],
    ['s_inf','22nd Army',  19,2, 6], ['s_inf','30th Army',  22,2, 7],
    ['s_guard','1st Shock Army', 23,3, 9], ['s_guard','20th Army', 22,3, 8],
    ['s_guard','1st Siberian Gds', 24,3, 10],
    ['s_inf','Moscow Defence Zone', 24,4, 7],
    ['s_inf','16th Army',  23,4, 8], ['s_inf','5th Army',   23,5, 8],
    ['s_inf','33rd Army',  22,6, 7], ['s_inf','43rd Army',  23,6, 7],
    ['s_inf','49th Army',  23,7, 7], ['s_inf','50th Army',  24,7, 7],
    ['s_inf','10th Army',  25,8, 8], ['s_inf','3rd Army',   23,10,6],
    ['s_inf','13th Army',  24,11,6], ['s_inf','40th Army',  26,10,6],
    ['s_inf','21st Army',  24,13,6], ['s_inf','37th Army',  24,14,6],
    ['s_inf','9th Army',   22,15,6], ['s_inf','56th Army',  25,16,7],
    ['g_hq','Heeresgruppe Mitte HQ', 14,3, 6], ['g_hq','Heeresgruppe Süd HQ', 19,13, 6],
    ['s_hq','Western Front HQ', 26,4, 6], ['s_hq','Southern Front HQ', 26,15, 6],
  ],
  sovSchedule: [
    [2,'s_inf','39th Army'], [3,'s_guard','2nd Siberian Gds'],
    [4,'s_tank','1st Gds Tank Corps'], [5,'s_inf','61st Army'],
    [6,'s_inf','28th Army'], [7,'s_guard','3rd Siberian Gds'],
    [8,'s_inf','3rd Shock Army'], [10,'s_tank','2nd Tank Corps'],
    [12,'s_inf','48th Army'],
  ],
  generals: [
    // — German: the defensive specialists take over —
    {side:'G', unit:'9. Armee',        name:'Model',       def:1.15,
     bio:'The Führer\'s fireman. Arrives in January to hold the Rzhev salient — and holds it.'},
    {side:'G', unit:'4. Armee',        name:'Heinrici',    def:1.15,
     bio:'The master of the defense: gives up ground an hour before the barrage lands on it.'},
    {side:'G', unit:'3. Panzerarmee',  name:'Reinhardt',   atk:1.10,
     bio:'Panzer leader who reached the Moscow canal — now fighting to keep his army alive.'},
    {side:'G', unit:'2. Panzerarmee',  name:'Guderian',    atk:1.10,
     bio:'Still arguing with Hitler about retreats. He will be sacked by Christmas — make him count first.'},
    // — Soviet —
    {side:'S', unit:'16th Army',       name:'Rokossovsky', atk:1.10,
     bio:'Held the Volokolamsk highway in the dark days. Now he advances down it.'},
    {side:'S', unit:'5th Army',        name:'Govorov',     def:1.10,
     bio:'The artillerist. His gun lines broke the panzers at Mozhaisk.'},
    {side:'S', unit:'1st Shock Army',  name:'Kuznetsov',   atk:1.10,
     bio:'Commands the fresh shock army assembled in secret behind Moscow.'},
    {side:'S', unit:'50th Army',       name:'Boldin',      def:1.10,
     bio:'Twice fought out of German encirclements, then held Tula against Guderian.'},
    {side:'S', unit:'1st Gds Tank Corps', name:'Katukov',  atk:1.15,
     bio:'The Mtsensk ambusher, promoted — his T-34s now lead the counterblow.'},
  ],
  capitalDefense: {turn:1, range:5, def:1.25, city:'Moscow',
    announce:'⭐ Zhukov commands the Western Front — the Moscow axis is a wall.'},
  /* the Road of Life: trucks cross the Ladoga ice — besieged Leningrad
     stays supplied as long as the city itself holds */
  supplySeeds: {S: [[14,1]]},
  gerAI: 'defend',                  // the Westheer is on the back foot all winter — dig in
  sovAI: 'attack',                  // Zhukov's counteroffensive — Soviets push forward
  /* no winterQuestion: it is December, and the gamble has already been lost */
  decisions: [
    {
      id:'haltbefehl', turn:2, side:'G',
      date:'16 December 1941', title:'THE STAND-FAST ORDER',
      text:'The generals beg permission to withdraw to a defensible winter line. The Führer\'s answer is the <b>Haltbefehl</b>: "Stand fast, not one step back — fanatical resistance in place." Brauchitsch is finished; Hitler takes personal command of the army. Obey, or trade ground for the army\'s life?',
      options:[
        {label:'Stand fast — fanatical resistance',
         effect:'Every German division digs in +1 entrenchment immediately (a tougher defense everywhere)',
         blurb:'Every division digs in where it stands. The line hardens immediately — but rigid defense bleeds production that flexible withdrawal would have saved.',
         log:'⬛ The Haltbefehl: the army freezes in place and digs. There will be no retreat.',
         apply(G){
           for (const u of unitsOf('G'))
             u.entrench = Math.min(effTerrain(u.x,u.y).dig, u.entrench+1);
         }},
        {label:'Fighting withdrawal to a winter line',
         effect:'All German units lose their entrenchment (must re-dig), but you gain +7⚙ and save the army',
         blurb:'Disengage and fall back in good order. Prepared positions are abandoned — every man starts digging anew — but the army saves its strength and its supply trains.',
         log:'⬛ Against orders, the army leapfrogs back toward a shorter winter line.',
         apply(G){
           for (const u of unitsOf('G')) u.entrench = 0;
           G.pp.G = Math.min(40, G.pp.G+7);
         }},
      ],
      ai(G){ return 0; },   // the AI obeys the Führer — history's choice
    },
    {
      id:'genoffensive', turn:5, side:'S',
      date:'5 January 1942', title:'THE GENERAL OFFENSIVE',
      text:'Moscow is saved — and Stalin smells total victory. He orders an offensive <b>along the entire front</b>, nine armies attacking everywhere at once. Zhukov protests: concentrate on Army Group Center and destroy it, or the attacks will everywhere be too weak. Stalin: "We must grind the Germans down with all speed."',
      options:[
        {label:'Attack everywhere — grind them down',
         effect:'+1 strength to EVERY Soviet army (a broad but shallow surge)',
         blurb:'Every army joins the offensive. The whole front surges — a little stronger everywhere, decisive nowhere.',
         log:'🟥 The general offensive: nine armies attack from Leningrad to the Crimea.',
         apply(G){
           for (const u of unitsOf('S'))
             u.str = Math.min(KINDS[u.kind].maxStr, u.str+1);
         }},
        {label:'Concentrate on Army Group Center — Zhukov\'s way',
         effect:'+2 strength to your 4 armies nearest the strongest Axis-held city, +2⚙ (a concentrated punch)',
         blurb:'Mass the shock armies against the frozen Wehrmacht before Moscow. The spearhead units are heavily reinforced; the rest of the front holds.',
         log:'🟥 Zhukov masses the Guards. One target: Army Group Center.',
         apply(G){
           const tgt = G.cities.filter(c=>c.owner==='G' && c.vp>0).sort((a,b)=>b.vp-a.vp)[0];
           if (!tgt) return;
           unitsOf('S').slice().sort((a,b)=>hexDist(a.x,a.y,tgt.x,tgt.y)-hexDist(b.x,b.y,tgt.x,tgt.y))
             .slice(0,4).forEach(u=>{ u.str = Math.min(KINDS[u.kind].maxStr, u.str+2); });
           G.pp.S = Math.min(40, G.pp.S+2);
         }},
      ],
      ai(G){ return 1; },   // the AI listens to Zhukov
    },
  ],
  events: [
    {turn:1,  date:'5 December 1941',  title:'THE SLEDGEHAMMER FALLS', pp:{S:2},
     text:'At dawn, in -25° cold, the Kalinin Front attacks. By the next day the whole Moscow line is ablaze. The German army — exhausted, frostbitten, 30 kilometres from the Kremlin — discovers the Red Army it destroyed three times over still has reserves.'},
    {turn:2,  date:'11 December 1941', title:'WAR ON AMERICA',
     text:'Four days after Pearl Harbor, Hitler declares war on the United States — gratuitously, before America could decide for itself. Whatever happens in the snow this winter, Germany is now at war with the three greatest industrial powers on Earth.'},
    {turn:3,  date:'16 December 1941', title:'THE HALTEBEFEHL', pp:{G:2},
     text:'Hitler forbids all retreat: "Dig in and hold every metre." Brauchitsch is dismissed; Hitler appoints himself commander of the army. Brutal — and, many historians concede, perhaps the only order that could have prevented a rout.'},
    {turn:5,  date:'1 January 1942',   title:'THE UNITED NATIONS',
     text:'In Washington, twenty-six nations sign the Declaration by United Nations, pledging to fight the Axis together until victory. The coalition that will decide the war now exists on paper.'},
    {turn:7,  date:'mid-January 1942', title:'THE RZHEV SALIENT',
     text:'The German line bends but does not break, folding back into a great bulge around Rzhev. It will be the bloodiest stretch of front on Earth for the next year — the Red Army will call it "the meat grinder".'},
    {turn:10, date:'8 February 1942',  title:'THE DEMYANSK POCKET',
     text:'Six German divisions — 100,000 men — are fully encircled south of Lake Ilmen. The Luftwaffe vows to supply them by air, and (at terrible cost in transports) succeeds. A precedent is set that will doom a far larger army within the year.'},
  ],
  maxTurn: 14,                              // 14 weeks: 5 Dec 1941 → early Mar 1942
  startDate: Date.UTC(1941,11,5),
  // deep snow into February, then hard frost until the spring thaw looms
  weather(turn){ return turn<=9 ? 'snow' : 'freeze'; },
  pp(side, turn){
    if (side==='G') return turn<=8 ? 4 : 5;            // the line slowly stabilizes
    return turn<=6 ? 9 : 7;                            // the winter surge spends itself
  },
  // Axis objective points held at the end (they start with 7 of 16)
  victoryTiers: [
    [10,'AXIS WINTER TRIUMPH','Moscow falls in the dead of winter — the Haltebefehl gamble succeeds beyond imagination, and the Soviet state staggers.'],
    [8,'AXIS DEFENSIVE VICTORY','The line holds nearly everywhere. The counteroffensive bleeds out in the snowdrifts, and the Ostheer survives the winter intact.'],
    [4,'HISTORY REPEATS — THE FRONT FREEZES','The Wehrmacht is hurled back from Moscow with terrible loss — but it does not break. Rzhev, and three more years of war, lie ahead.'],
    [2,'SOVIET OPERATIONAL VICTORY','Smolensk lost, whole German armies mauled and frostbitten — the Ostheer will never fully recover from this winter.'],
    [0,'DECISIVE SOVIET VICTORY','Army Group Center disintegrates in the snow. The war has turned two years early.'],
  ],
  sudden: {
    axisCities: ['Moscow','Leningrad'], minAxisUnits: 5,
    axisTitle: 'AXIS WINTER TRIUMPH',
    axisText:  'Moscow and Leningrad both fall in midwinter — Soviet command collapses. The unthinkable has happened.',
    sovTitle:  'DECISIVE SOVIET VICTORY',
    sovText:   'The Ostheer is annihilated in the snow. Total collapse on the Eastern Front — the war has turned two years early.',
  },
  airInit: [
    ['G','Luftflotte 2', 5],                // frozen on its fields
    ['S','VVS Moscow', 8],
    ['S','1st Air Army', 6],
  ],
  sovAirSchedule: [
    [6, 'Long-Range Aviation', 7],
  ],
  setup(st){
    // the Haltebefehl: German units are dug in as deep as the ground allows
    for (const u of st.units) if (u.side==='G') u.entrench = effTerrain(u.x,u.y).dig;
    // fortress garrisons
    for (const [name,e] of [['42nd Army',3],['50th Army',2],['Moscow Defence Zone',2]]){
      const u = st.units.find(t=>t.name===name);
      if (u) u.entrench = e;
    }
  },
  opening(playerSide){ return [
    '5 December 1941 — In -25° cold, Zhukov\'s fresh armies erupt from the Moscow defenses against a Wehrmacht with no winter clothing.',
    playerSide==='S'
      ? 'Drive them from Moscow. Encircle and destroy what the Haltebefehl forbids to retreat.'
      : '"Not one step back" — hold your cities, keep your armies alive, and pray for the spring.',
  ]; },
};

/* ---------- Scenario 3: Case Blue — Stalingrad, June–December 1942 ----------
   A new map: the southern steppe from the Donets to the Volga and the
   Caucasus foothills. The Don makes its great bend in the center; the
   Volga runs down the east with Stalingrad on its bank; the Sea of Azov
   and the Caspian pin the corners. Long flanks, brittle allies. */
SCENARIOS.stalingrad = {
  id: 'stalingrad',
  title: 'CASE BLUE — STALINGRAD', short: 'STALINGRAD',
  sub: 'SOUTHERN RUSSIA · JUNE — DECEMBER 1942 · TURN-BASED STRATEGY',
  menu: {
    ger: {h:'⬛ Germany (Axis)', p:'Drive east to the Volga and take the city that bears Stalin\'s name — but every kilometre stretches your flanks thinner, and they are held by allies.'},
    sov: {h:'🟥 Soviet Union', p:'Trade the burning steppe for time. Hold the rubble of Stalingrad house by house while the reserves gather on the far bank for the counterblow.'},
  },
  cols: 30, rows: 20,
  map: [
  /*           0    5    10   15   20   25     */
  /* 0*/ "..ff......r................r..",
  /* 1*/ ".ff........r..............r...",
  /* 2*/ ".....f......r.............r...",
  /* 3*/ ".......f.....r...........r....",
  /* 4*/ "..............r..........r....",
  /* 5*/ "...hh..........r.........r....",
  /* 6*/ ".................r......r.....",
  /* 7*/ "..................r.....r.....",
  /* 8*/ "...................r....r.....",
  /* 9*/ "....................r...r.....",
  /*10*/ "...................r....r.....",
  /*11*/ "..................r......r....",
  /*12*/ "................r........r....",
  /*13*/ "..............r...........r...",
  /*14*/ "............r.............rs..",
  /*15*/ "..........r...hhh.........sr..",
  /*16*/ "~~~~~~...r..hhhhhh.........r..",
  /*17*/ "~~~~~~~~ss...hhhhhh.......~~~~",
  /*18*/ "~~~~~~~~~~....hhhhhh....~~~~~~",
  /*19*/ "~~~~~~~~~~~~...hhhh...~~~~~~~~",
  ],
  /* vp>0 are Axis objectives. Stalingrad is a fortress city on the Volga. */
  cities: [
    {x:2, y:0,  name:'Kursk',       vp:0, owner:'G'},
    {x:3, y:3,  name:'Belgorod',    vp:0, owner:'G'},
    {x:1, y:4,  name:'Kharkov',     vp:0, owner:'G'},
    {x:3, y:9,  name:'Stalino',     vp:0, owner:'G'},
    {x:4, y:13, name:'Taganrog',    vp:0, owner:'G'},
    {x:8, y:1,  name:'Voronezh',    vp:1, owner:'S'},
    {x:8, y:6,  name:'Rossosh',     vp:0, owner:'S'},
    {x:10,y:9,  name:'Millerovo',   vp:0, owner:'S'},
    {x:14,y:10, name:'Morozovsk',   vp:0, owner:'S'},
    {x:19,y:9,  name:'Kalach',      vp:1, owner:'S'},
    {x:23,y:9,  name:'Stalingrad',  vp:4, owner:'S'},
    {x:17,y:12, name:'Kotelnikovo', vp:0, owner:'S'},
    {x:8, y:15, name:'Rostov',      vp:2, owner:'S'},
    {x:10,y:17, name:'Krasnodar',   vp:1, owner:'S'},
    {x:14,y:18, name:'Maikop',      vp:2, owner:'S'},
    {x:19,y:18, name:'Grozny',      vp:2, owner:'S'},
    {x:20,y:14, name:'Elista',      vp:0, owner:'S'},
    {x:25,y:14, name:'Astrakhan',   vp:1, owner:'S'},
    {x:24,y:5,  name:'Kamyshin',    vp:0, owner:'S'},
    {x:27,y:1,  name:'Saratov',     vp:0, owner:'S'},
  ],
  sovSpawns: [[23,9],[25,14],[24,5],[27,1],[29,4],[29,8],[29,12],[8,15],[20,14]],
  gerSpawns: [[1,4],[2,0],[3,9],[0,2],[0,7],[0,12]],
  /* Case Blue order of battle: a strong Axis spearhead, Soviet armies
     still rebuilding after the Kharkov disaster. */
  startUnits: [
    // — Axis: Army Group B (north), Army Group A (south) —
    ['g_inf','2. Armee',        1,1, 9],  ['g_ally','Hungarian 2nd',  1,3, 8],
    ['g_pz' ,'4. Panzerarmee',  2,2, 10], ['g_inf','6. Armee',        2,5, 10],
    ['g_ally','Italian 8th',    2,7, 8],  ['g_pz' ,'1. Panzerarmee',  2,8, 10],
    ['g_ally','Romanian 3rd',   3,10, 8], ['g_inf','17. Armee',       2,11, 9],
    ['g_ally','Romanian 4th',   3,12, 8], ['g_inf','11. Armee',       3,13, 8],
    // — Soviet fronts: thin screens and the tank reserves —
    ['s_inf','40th Army',  6,1, 6],  ['s_inf','21st Army',  6,4, 6],
    ['s_inf','28th Army',  6,6, 6],  ['s_inf','38th Army',  7,8, 6],
    ['s_inf','9th Army',   6,10, 6], ['s_inf','37th Army',  6,12, 6],
    ['s_inf','12th Army',  7,14, 6], ['s_inf','56th Army',  8,15, 7],
    ['s_tank','1st Tank Army', 13,7, 7], ['s_tank','4th Tank Army', 16,8, 7],
    ['s_inf','62nd Army', 19,9, 7],  ['s_inf','64th Army',  17,10, 7],
    ['s_inf','51st Army', 14,13, 6],
    ['g_hq','Heeresgruppe B HQ', 1,2, 6], ['g_hq','Heeresgruppe A HQ', 1,12, 6],
    ['s_hq','Stalingrad Front HQ', 29,8, 6], ['s_hq','Don Front HQ', 28,2, 6],
  ],
  sovSchedule: [
    [3,'s_inf','63rd Army'], [4,'s_inf','60th Army'],
    [5,'s_tank','13th Tank Corps'], [6,'s_inf','57th Army'],
    [8,'s_inf','66th Army'], [9,'s_inf','24th Army'],
    [10,'s_mil','Stalingrad Militia'], [11,'s_inf','1st Guards Army'],
    [13,'s_tank','4th Mech Corps'], [15,'s_tank','5th Tank Army'],
    [17,'s_inf','46th Army'], [19,'s_guard','2nd Guards Army'],
    [21,'s_tank','26th Tank Corps'],
  ],
  generals: [
    // — Axis —
    {side:'G', unit:'6. Armee',        name:'Paulus',       def:1.10,
     bio:'The methodical staff officer marching on Stalingrad — brilliant on paper, cautious in a crisis.'},
    {side:'G', unit:'4. Panzerarmee',  name:'Hoth',         atk:1.10,
     bio:'"Papa" Hoth again — his panzers swing between the Don and the Volga all summer.'},
    {side:'G', unit:'1. Panzerarmee',  name:'von Kleist',   atk:1.10,
     bio:'Driving for the Caucasus oil — the prize the whole war economy is aimed at.'},
    {side:'G', unit:'11. Armee',       name:'von Manstein', atk:1.15,
     bio:'Conqueror of Sevastopol — and the man who will be sent to break any encirclement.'},
    // — Soviet —
    {side:'S', unit:'62nd Army',       name:'Chuikov',      def:1.15,
     bio:'"There is no land for us beyond the Volga." Master of the hugging defense in the rubble.'},
    {side:'S', unit:'64th Army',       name:'Shumilov',     def:1.10,
     bio:'Holds the southern shoulder of the city, rock-steady, for five months.'},
    {side:'S', unit:'1st Tank Army',   name:'Moskalenko',   atk:1.10,
     bio:'Counterattacks in the Don bend bleed the 6th Army a week at a time.'},
    {side:'S', unit:'5th Tank Army',   name:'Romanenko',    atk:1.15,
     bio:'His tank army is the northern pincer of Operation Uranus.'},
    {side:'S', unit:'2nd Guards Army', name:'Malinovsky',   atk:1.10,
     bio:'The finest army the USSR has yet fielded — held back for the killing blow.'},
  ],
  capitalDefense: {turn:10, range:3, def:1.3, city:'Stalingrad',
    announce:'⭐ Stalingrad Front: Yeryomenko takes command in the burning city — every house a fortress, every cellar a strongpoint.'},
  winterQuestion: {turn:16, cost:10},
  decisions: [
    {
      id:'directive45', turn:4, side:'G',
      date:'23 July 1942', title:'DIRECTIVE No. 45',
      text:'The summer drive is rolling and the Führer wants <b>everything at once</b>: Army Group A wheels south for the Caucasus oil while Army Group B takes Stalingrad — two offensives, diverging across a thousand kilometres of steppe. Halder calls it madness. Concentrate on one objective, or reach for both?',
      options:[
        {label:'Split the drive — Stalingrad AND the oil',
         effect:'+7⚙ now (the captured south pays off) — but no reinforcement to your spearheads',
         blurb:'Both prizes at once. The captured economy of the south pays dividends now — but the spearheads thin with every kilometre they diverge.',
         log:'⬛ Directive 45: the army groups part ways across the steppe. The maps look magnificent.',
         apply(G){ G.pp.G = Math.min(40, G.pp.G+7); }},
        {label:'Concentrate on Stalingrad — Halder\'s way',
         effect:'+2 strength to your 4 divisions nearest Stalingrad (a massed punch, no extra ⚙)',
         blurb:'One schwerpunkt. The divisions nearest the Volga are massed and reinforced; the oil can wait until the city of Stalin falls.',
         log:'⬛ The panzers concentrate. One objective: the city on the Volga.',
         apply(G){
           const st = G.cities.find(c=>c.name==='Stalingrad') || {x:23,y:9};
           unitsOf('G').slice().sort((a,b)=>hexDist(a.x,a.y,st.x,st.y)-hexDist(b.x,b.y,st.x,st.y))
             .slice(0,4).forEach(u=>{ u.str = Math.min(KINDS[u.kind].maxStr, u.str+2); });
         }},
      ],
      ai(G){ return 1; },   // the AI takes Halder's advice, not history's
    },
    {
      id:'volga', turn:12, side:'S',
      date:'13 September 1942', title:'ACROSS THE VOLGA',
      text:'Chuikov\'s 62nd Army is bleeding to death in the rubble, and every division STAVKA owns could be fed across the river into the furnace. Zhukov and Vasilevsky urge the opposite: send the <b>minimum</b> to hold the city, hoard everything else for the counterblow forming on the flanks. The city — or the encirclement?',
      options:[
        {label:'Feed the furnace — hold every street',
         effect:'+2 strength AND +1 entrenchment to your 3 armies nearest Stalingrad — but no ⚙ saved for the flanks',
         blurb:'Divisions cross the burning river by night. The defenders of Stalingrad are heavily reinforced and dig into the rubble — but the great counteroffensive is weakened before it begins.',
         log:'🟥 Across the Volga by night ferry — into the city of fire. Not one step back.',
         apply(G){
           const st = G.cities.find(c=>c.name==='Stalingrad') || {x:23,y:9};
           unitsOf('S').slice().sort((a,b)=>hexDist(a.x,a.y,st.x,st.y)-hexDist(b.x,b.y,st.x,st.y))
             .slice(0,3).forEach(u=>{
               u.str = Math.min(KINDS[u.kind].maxStr, u.str+2);
               u.entrench = Math.min(effTerrain(u.x,u.y).dig, u.entrench+1);
             });
         }},
        {label:'Hoard for Uranus — Zhukov\'s way',
         effect:'+7⚙ banked for the counteroffensive (Stalingrad holds with what it has)',
         blurb:'Chuikov gets just enough to keep a foothold. Everything else goes to the quiet flanks, where the Romanian lines are thin and November is coming.',
         log:'🟥 STAVKA\'s answer is cold: the city must hold with what it has. The reserves ride north into the silence.',
         apply(G){ G.pp.S = Math.min(40, G.pp.S+7); }},
      ],
      ai(G){
        const st = G.cities.find(c=>c.name==='Stalingrad');
        return (st && st.owner==='S') ? 1 : 0;   // city safe? hoard. city falling? feed it.
      },
    },
  ],
  events: [
    {turn:1,  date:'28 June 1942',      title:'CASE BLUE',
     text:'The summer offensive erupts across the southern steppe — a million men, aimed not at Moscow but at the Volga and the oil of the Caucasus. Directive No. 45 will soon split the drive in two: Stalingrad AND the oil, at once. The flanks grow longer every week.'},
    {turn:2,  date:'4 July 1942',       title:'SEVASTOPOL FALLS',
     text:'After 250 days of siege, the great fortress of the Crimea surrenders to Manstein\'s 11th Army. Hitler makes him Field Marshal — and begins wondering where else to spend his siege artillery.'},
    {turn:5,  date:'28 July 1942',      title:'ORDER 227', pp:{S:2},
     text:'"Panic-mongers and cowards must be exterminated on the spot. Not one step back!" Stalin\'s order is read to every company in the Red Army. Blocking detachments form behind the lines. The retreat across the steppe is over.'},
    {turn:7,  date:'9 August 1942',     title:'THE OIL OF MAIKOP',
     text:'Kleist\'s panzers roll into Maikop — the first Caucasus oilfield. They find it expertly wrecked: not a barrel will flow for a year. The prize the offensive was aimed at is already burning.'},
    {turn:9,  date:'23 August 1942',    title:'FIRE ON THE VOLGA',
     text:'Luftflotte 4 firebombs Stalingrad with a thousand sorties; perhaps 40,000 die in a single day, and the panzers reach the Volga north of the city. The Stukas have created the perfect fortress: a city of rubble.'},
    {turn:12, date:'13 September 1942', title:'RATTENKRIEG',
     text:'The first great assault goes into the city itself. The war shrinks to grain silos, stairwells and sewers — the Germans call it Rattenkrieg, the war of rats. Chuikov\'s men hug the enemy so close the Stukas cannot strike.'},
    {turn:16, date:'14 October 1942',   title:'THE LAST ASSAULT',
     text:'Paulus throws everything at the tractor works in the heaviest attack of the battle. The 62nd Army is split into islands with the Volga at its back — and holds. In Moscow, Zhukov and Vasilevsky put the finishing touches on something much bigger.'},
    {turn:21, date:'19 November 1942',  title:'OPERATION URANUS', pp:{S:2},
     text:'A million men, 13,500 guns. The Soviet pincers smash through the Romanian armies north and south of the city — exactly where the flanks were weakest. Within four days the spearheads will meet at Kalach, and the 6th Army will be inside the cauldron.'},
    {turn:24, date:'12 December 1942',  title:'WINTER STORM',
     text:'Manstein attacks through the snow toward the pocket — Operation Winter Storm. Inside, a quarter of a million men wait on a promise that the Luftwaffe cannot keep and a relief that will never arrive.'},
  ],
  maxTurn: 24,                              // 24 weeks: 28 Jun → mid-Dec 1942
  startDate: Date.UTC(1942,5,28),
  // a long hot summer, the October rasputitsa, then Uranus weather
  weather(turn){ return turn>=21?'snow' : turn>=19?'freeze' : turn>=16?'mud' : 'clear'; },
  pp(side, turn){
    if (side==='G') return turn<=14 ? 6 : 5;           // the spearhead outruns the railheads
    return turn<=8 ? 5 : turn<=16 ? 7 : 8;             // STAVKA hoards for the counterblow
  },
  // Axis objective points held at the end (14 total; history ≈ 6-7)
  victoryTiers: [
    [12,'DECISIVE AXIS VICTORY','The Volga is cut and the oil fields burn under German control. The Soviet south is broken — the war economy starves.'],
    [9,'AXIS VICTORY','Stalingrad falls and the flanks hold. The city of Stalin is a German winter quarters — history takes a darker road.'],
    [5,'STALEMATE — HISTORY REPEATS','Vast gains across the steppe — but the city holds, the flanks are brittle, and the winter belongs to the Red Army.'],
    [3,'SOVIET VICTORY','The summer offensive dies on the Don. The Ostheer\'s last great attack has failed.'],
    [0,'DECISIVE SOVIET VICTORY','Uranus closes the year of encirclements — the 6th Army dies in the steppe, and with it the myth of the Wehrmacht.'],
  ],
  sudden: {
    axisCities: ['Stalingrad','Astrakhan'], minAxisUnits: 6,
    axisTitle: 'DECISIVE AXIS VICTORY',
    axisText:  'Stalingrad and Astrakhan have fallen — the Volga is severed and the Caucasus cut off. The Soviet war economy is strangled.',
    sovTitle:  'DECISIVE SOVIET VICTORY',
    sovText:   'The Axis southern wing is annihilated on the steppe. The road to the Dnieper — and Berlin — lies open.',
  },
  airInit: [
    ['G','Luftflotte 4', 10],               // Richthofen's air fleet rules the steppe
    ['S','8th Air Army', 5],
  ],
  sovAirSchedule: [
    [8,  '16th Air Army', 6],
    [18, '17th Air Army', 8],
  ],
  setup(st){
    // Rostov's garrison is dug in; the 62nd holds the Don bend at Kalach
    for (const [name,e] of [['56th Army',2],['62nd Army',1],['64th Army',1]]){
      const u = st.units.find(t=>t.name===name);
      if (u) u.entrench = e;
    }
  },
  opening(playerSide){ return [
    '28 June 1942 — CASE BLUE. The panzers roll east across the burning steppe, toward the Don, the Volga, and the oil.',
    playerSide==='G'
      ? 'Take Stalingrad before winter — and mind your flanks: your allies hold them.'
      : 'Screen, delay, survive. The city must hold until the reserves are ready.',
  ]; },
};

/* ---------- Scenario 4: D-Day — Normandy, June–August 1944 ----------
   The Western Front. Side G = the Allies (they move first and their
   captured objectives drive the victory tiers); side S = the Germans.
   The Allies have NO map-edge supply: everything flows from the four
   invasion beaches (supply seeds) and the city-depots they capture —
   the logistics race IS the campaign. */
SCENARIOS.dday = {
  id: 'dday',
  title: 'D-DAY — NORMANDY', short: 'NORMANDY',
  sub: 'THE WESTERN FRONT · JUNE — AUGUST 1944 · TURN-BASED STRATEGY',
  sides: {
    G: {name:'Allied', flag:'🟦', color:'#3f5d40', tint:'rgba(80,130,90,0.28)'},
    S: {name:'German', flag:'⬛', color:'#454d58', tint:'rgba(108,118,132,0.30)'},
  },
  kinds: {
    g_inf:  {side:'G', label:'US Infantry Corps',   atk:5, def:5, mp:3, maxStr:10, cost:10, sym:'inf'},
    g_pz:   {side:'G', label:'US Armored Corps',    atk:8, def:5, mp:6, maxStr:10, cost:18, sym:'arm'},
    g_ally: {side:'G', label:'British & CW Corps',  atk:4, def:5, mp:3, maxStr:10, cost:10, sym:'inf', color:'#4a5a35'},
    g_para: {side:'G', label:'Airborne Division',   atk:4, def:5, mp:3, maxStr:8,  cost:14, sym:'para', noBuy:true},
    s_inf:  {side:'S', label:'Infanterie-Korps',    atk:4, def:5, mp:3, maxStr:9,  cost:9,  sym:'inf'},
    s_tank: {side:'S', label:'Panzer-Korps',        atk:7, def:5, mp:5, maxStr:10, cost:16, sym:'arm'},
    s_guard:{side:'S', label:'Waffen-SS Korps',     atk:6, def:6, mp:4, maxStr:10, cost:16, sym:'inf', color:'#3a3a3a'},
    s_mil:  {side:'S', label:'Static Division',     atk:2, def:4, mp:1, maxStr:6,  cost:4,  sym:'inf', color:'#5a5244'},
    g_hq:   {side:'G', label:'Army Group HQ',       atk:1, def:4, mp:4, maxStr:6,  cost:0, sym:'hq', hq:true, noBuy:true, noCapture:true, color:'#3f5d40'},
    s_hq:   {side:'S', label:'OB West HQ',          atk:1, def:4, mp:4, maxStr:6,  cost:0, sym:'hq', hq:true, noBuy:true, noCapture:true, color:'#2f3742'},
  },
  deployNames: {g_inf:'US Follow-up Corps', g_pz:'US Armored (follow-up)',
                s_inf:'Ersatz-Korps', s_tank:'Panzer Reserve', s_mil:'Alarm Units'},
  menu: {
    ger: {h:'🟦 The Allies (US & British)', p:'You are ashore — now win the buildup race. Take Cherbourg for a port, break out of the bocage, and be across the Seine before autumn.'},
    sov: {h:'⬛ Germany (Westheer)', p:'The Atlantic Wall is breached but the panzers are coming. Pin them in the hedgerows, hold the ports, and throw the invasion back into the sea.'},
  },
  cols: 36, rows: 22,
  /* England across the Channel · the Cotentin · the five beaches ·
     bocage country · Falaise hills · Brittany and Brest · the Seine
     to Paris · the Loire across the south · Biscay in the corner */
  map: [
  /*           0    5    10   15   20   25   30   35  */
  /* 0*/ "..f...........~~~~~~~~~~~~~~~~~~~~~~",
  /* 1*/ ".....f........~~~~~~~~~~~~~~~~~~~~~~",
  /* 2*/ "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  /* 3*/ "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  /* 4*/ "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
  /* 5*/ "~~~~~~...~~~~~~~~~~~~~~.........~~~~",
  /* 6*/ "~~~~~......~~~~~~~~~~~r.............",
  /* 7*/ "~~~~~..................r............",
  /* 8*/ "~~~~..f.s.ff............r..f........",
  /* 9*/ "~~~..f.ss..f..f..........r..........",
  /*10*/ "~~....f..s..f....hhh......r.........",
  /*11*/ "~.f...f...s....f..hh.......r..f.....",
  /*12*/ "....f.....s............f....r.......",
  /*13*/ "...f........f................r......",
  /*14*/ "~..................f................",
  /*15*/ "~~...f..............................",
  /*16*/ "~~~.................f...............",
  /*17*/ "~~~~................................",
  /*18*/ "~~~~~~..............................",
  /*19*/ "~~~~~~~~..rrrrrrrrrrrrrrrrrr........",
  /*20*/ "~~~~~~~~~...........................",
  /*21*/ "~~~~~~~~~~~.........................",
  ],
  /* vp>0 are Allied objectives. All of France starts German-held. */
  cities: [
    {x:6, y:0,  name:'Portsmouth', vp:0, owner:'G'},
    {x:12,y:1,  name:'Dover',      vp:0, owner:'G'},
    {x:6, y:5,  name:'Cherbourg',  vp:2, owner:'S'},
    {x:23,y:5,  name:'Le Havre',   vp:1, owner:'S'},
    {x:9, y:7,  name:'Carentan',   vp:1, owner:'S'},
    {x:25,y:7,  name:'Rouen',      vp:1, owner:'S'},
    {x:13,y:8,  name:'Bayeux',     vp:0, owner:'S'},
    {x:17,y:8,  name:'Caen',       vp:2, owner:'S'},
    {x:20,y:8,  name:'Lisieux',    vp:0, owner:'S'},
    {x:12,y:9,  name:'Saint-Lô',   vp:1, owner:'S'},
    {x:26,y:9,  name:'Evreux',     vp:0, owner:'S'},
    {x:5, y:10, name:'Saint-Malo', vp:0, owner:'S'},
    {x:18,y:10, name:'Falaise',    vp:1, owner:'S'},
    {x:8, y:11, name:'Avranches',  vp:1, owner:'S'},
    {x:26,y:11, name:'Dreux',      vp:0, owner:'S'},
    {x:28,y:11, name:'Paris',      vp:4, owner:'S'},
    {x:1, y:12, name:'Brest',      vp:1, owner:'S'},
    {x:17,y:12, name:'Alençon',    vp:0, owner:'S'},
    {x:19,y:12, name:'Argentan',   vp:0, owner:'S'},
    {x:7, y:13, name:'Rennes',     vp:1, owner:'S'},
    {x:25,y:13, name:'Chartres',   vp:1, owner:'S'},
    {x:15,y:14, name:'Le Mans',    vp:1, owner:'S'},
    {x:4, y:15, name:'Lorient',    vp:0, owner:'S'},
    {x:27,y:16, name:'Orléans',    vp:1, owner:'S'},
    {x:9, y:18, name:'Nantes',     vp:0, owner:'S'},
    {x:19,y:18, name:'Tours',      vp:0, owner:'S'},
  ],
  /* Allied reinforcements land over the beaches; German reserves
     arrive from the Reich and the rear */
  gerSpawns: [[12,7],[14,7],[8,7],[16,7],[15,7]],
  sovSpawns: [[28,11],[25,7],[27,16],[35,8],[35,12],[35,16],[25,13]],
  /* the Mulberries: the five beaches are Allied supply sources; no edge supply */
  supplySeeds: {G: [[8,7],[12,7],[14,7],[15,7],[16,7]]},
  edgeSupply: {G:false, S:true},
  startUnits: [
    // — the Allied lodgement, morning of 6 June —
    ['g_inf','VII Corps (Utah)',    8,7, 8], ['g_para','101st Airborne',  9,8, 7],
    ['g_para','82nd Airborne',      7,8, 7], ['g_inf','V Corps (Omaha)', 12,7, 8],
    ['g_ally','XXX Corps (Gold)',  14,7, 9], ['g_ally','II Cdn Corps (Juno)', 15,7, 8],
    ['g_ally','I Corps (Sword)',   16,7, 9], ['g_para','6th Airborne',   17,7, 7],
    // — the Westheer, from the Atlantic Wall to Paris —
    ['s_inf','243. Infanterie',     6,6, 6], ['s_mil','709. Static',      7,6, 5],
    ['s_inf','91. Luftlande',       8,8, 6], ['s_inf','352. Infanterie', 11,7, 7],
    ['s_mil','716. Static',        13,7, 5], ['s_mil','711. Static',     18,7, 5],
    ['s_inf','LXXXIV Korps',       10,8, 7], ['s_inf','77. Infanterie',   7,9, 6],
    ['s_tank','21. Panzer',        18,8, 8], ['s_guard','12. SS Hitlerjugend', 17,9, 9],
    ['s_tank','Panzer Lehr',       15,9, 9], ['s_inf','3. Fallschirmjäger', 12,10, 8],
    ['s_guard','17. SS PzGren',    11,9, 8], ['s_tank','2. Panzer',      20,10, 8],
    ['s_inf','331. Infanterie',    25,8, 6], ['s_inf','15. Armee Detachment', 26,6, 7],
    ['s_inf','266. Infanterie',     4,11, 6], ['s_inf','275. Infanterie',  9,11, 6],
    ['s_inf','2. Fallschirmjäger',  2,13, 6], ['s_mil','Paris Garrison',  28,11, 5],
    ['g_hq','21st Army Group HQ', 13,8, 6], ['g_hq','First US Army HQ', 10,7, 6],
    ['s_hq','OB West HQ', 27,12, 6], ['s_hq','Panzergruppe West HQ', 22,11, 6],
  ],
  /* mixed schedule: German reserves race the Allied follow-up waves */
  sovSchedule: [
    [2,'s_guard','1. SS Leibstandarte'], [2,'s_tank','2. SS Das Reich'],
    [3,'s_tank','116. Panzer'],          [3,'g_inf','XIX Corps (US)'],
    [4,'s_inf','353. Infanterie'],       [5,'s_guard','9. SS Hohenstaufen'],
    [5,'s_guard','10. SS Frundsberg'],   [5,'g_ally','XII Corps (UK)'],
    [6,'s_inf','276. Infanterie'],       [6,'g_inf','VIII Corps (US)'],
    [7,'s_inf','363. Infanterie'],       [8,'g_pz','Third Army (Patton)'],
    [9,'g_ally','First Canadian Army'],  [10,'g_pz','XV Corps Armored'],
  ],
  generals: [
    // — Allied —
    {side:'G', unit:'VII Corps (Utah)', name:'Collins',   atk:1.15,
     bio:'"Lightning Joe" — takes Cherbourg in three weeks, then leads the breakout.'},
    {side:'G', unit:'XXX Corps (Gold)', name:'Montgomery', def:1.10,
     bio:'Master of the set-piece battle, commanding all Allied ground forces — methodical, and the panzers\' magnet at Caen.'},
    {side:'G', unit:'82nd Airborne',    name:'Ridgway',   def:1.10,
     bio:'Jumped into the dark over the Merderet with his division.'},
    {side:'G', unit:'Third Army (Patton)', name:'Patton', atk:1.20,
     bio:'"We shall attack and attack until we are exhausted, and then we shall attack again."'},
    // — German —
    {side:'S', unit:'Panzer Lehr',      name:'Bayerlein', atk:1.10,
     bio:'Rommel\'s old Afrika chief of staff, leading the strongest panzer division in the West.'},
    {side:'S', unit:'12. SS Hitlerjugend', name:'Meyer',  atk:1.10,
     bio:'"Panzermeyer" — his teenage division fights with fanatic ferocity around Caen.'},
    {side:'S', unit:'3. Fallschirmjäger', name:'Meindl',  def:1.15,
     bio:'His paratroopers make every hedgerow at Saint-Lô cost a day and a company.'},
    {side:'S', unit:'9. SS Hohenstaufen', name:'Hausser', atk:1.10,
     bio:'Veteran SS commander rushed back from the Eastern Front to plug the line.'},
    {side:'S', unit:'2. Fallschirmjäger', name:'Ramcke', def:1.15,
     bio:'Fortress commander of Brest — he will hold the ruins to the last wall.'},
  ],
  decisions: [
    {
      id:'luttich', turn:9, side:'S',
      date:'6 August 1944', title:'OPERATION LÜTTICH',
      text:'With the Americans pouring through Avranches, Hitler orders the panzers to attack <b>west</b> and cut the breakout at the coast. Kluge warns it will only push the army deeper into a sack the Allies are closing around Falaise. Drive for the sea — or save the army?',
      options:[
        {label:'Attack west to Avranches — the Führer\'s order',
         effect:'+2 strength to your 3 panzer divisions nearest Avranches — but the exposed attack hands the Allies +4⚙',
         blurb:'Mass the panzers for a thrust to the coast. They hit hard now — but driving west, under total Allied air power, only deepens the trap forming behind them.',
         log:'⬛ The panzers wheel west toward Avranches. Above them, the fighter-bombers are already circling.',
         apply(G){
           const av = G.cities.find(c=>c.name==='Avranches') || {x:8,y:11};
           unitsOf('S').filter(u=>KINDS[u.kind].sym==='arm')
             .sort((a,b)=>hexDist(a.x,a.y,av.x,av.y)-hexDist(b.x,b.y,av.x,av.y))
             .slice(0,3).forEach(u=>{ u.str = Math.min(KINDS[u.kind].maxStr, u.str+2); });
           G.pp.G = Math.min(40, G.pp.G+4);   // the Allies feast on the exposed columns
         }},
        {label:'Pull back toward the Seine — save the army',
         effect:'+1 strength to your 4 divisions nearest Paris, and +5⚙ — the army survives to fight on',
         blurb:'Defy the order and begin the withdrawal. You give up ground, but the army lives to fight on the next river line instead of dying in the Falaise pocket.',
         log:'⬛ “The army must not be destroyed for nothing.” The panzers disengage and fall back east.',
         apply(G){
           const pa = G.cities.find(c=>c.name==='Paris') || {x:28,y:11};
           unitsOf('S').sort((a,b)=>hexDist(a.x,a.y,pa.x,pa.y)-hexDist(b.x,b.y,pa.x,pa.y))
             .slice(0,4).forEach(u=>{ u.str = Math.min(KINDS[u.kind].maxStr, u.str+1); });
           G.pp.S = Math.min(40, G.pp.S+5);
         }},
      ],
      ai(G){ return 1; },   // the strategically sound choice: don't deepen the trap
    },
    {
      id:'panzers', turn:2, side:'S',
      date:'7 June 1944', title:'RELEASE THE PANZERS',
      text:'The invasion is ashore — and the panzer reserves that could throw it back into the sea sit idle, because <b>only the Führer can release them</b>, and no one at Berchtesgaden will wake him. Rommel: "If we don\'t throw the invaders into the sea within 24 hours, the war is lost." Von Rundstedt demands their release. The OKW hesitates: what if Normandy is the diversion, and the real blow falls at Calais?',
      options:[
        {label:'Release them now — Rommel\'s 24 hours',
         effect:'+2 strength to 3 of your panzer divisions immediately (they reach the beaches battle-ready)',
         blurb:'The armoured reserve rolls for the beaches at once, under the fighter-bombers, before the Allies are dug in. The panzer divisions arrive battle-ready.',
         log:'⬛ The reserve is released. Panzer columns roll north under a sky that belongs to the enemy.',
         apply(G){
           unitsOf('S').filter(u=>KINDS[u.kind].sym==='arm')
             .slice(0,3).forEach(u=>{ u.str = Math.min(KINDS[u.kind].maxStr, u.str+2); });
         }},
        {label:'Hold for Calais — it may be a feint',
         effect:'+6⚙ banked (the reserve waits at Calais; the men on the beaches fight alone)',
         blurb:'Fortitude has worked: the OKW keeps the reserve watching the Pas-de-Calais. The army husbands its strength — and the men on the beaches fight alone.',
         log:'⬛ "Normandy may be the diversion." The panzers wait for an invasion that will never come.',
         apply(G){ G.pp.S = Math.min(40, G.pp.S+6); }},
      ],
      ai(G){ return 0; },   // the AI wakes the Führer
    },
  ],
  events: [
    {turn:1,  date:'6 June 1944',   title:'THE LONGEST DAY',
     text:'156,000 men, 5,000 ships, 11,000 aircraft — the largest amphibious invasion in history goes in across five beaches. By midnight the Atlantic Wall, four years in the building, has been breached in a single morning. "The eyes of the world are upon you."'},
    {turn:2,  date:'13 June 1944',  title:'VENGEANCE WEAPONS',
     text:'The first V-1 flying bombs fall on London — Hitler\'s answer to the invasion. At Villers-Bocage a single Tiger commanded by Michael Wittmann shoots up an entire British armoured column. The hedgerow war has begun.'},
    {turn:3,  date:'19 June 1944',  title:'THE GREAT STORM',
     text:'The worst June gale in forty years wrecks the American Mulberry harbour and strands 800 craft. For four days almost nothing lands over the beaches. The Germans get the breathing space the Luftwaffe could never have bought them.'},
    {turn:4,  date:'27 June 1944',  title:'CHERBOURG',
     text:'Collins takes Cherbourg — the first great port. The Germans have wrecked it so thoroughly that nothing will move through it for weeks: the supply crisis continues, and everything still comes over the sand.'},
    {turn:6,  date:'11 July 1944',  title:'THE BOCAGE',
     text:'A thousand years of Norman hedgerows have turned every field into a fortress. Rifle companies are burning out in days; tank crews weld steel teeth to their hulls to chew through the banks. Nobody trained for this.'},
    {turn:7,  date:'18 July 1944',  title:'OPERATION GOODWOOD',
     text:'Three British armoured divisions attack east of Caen behind the heaviest aerial bombardment yet seen — and lose 400 tanks in three days. But every panzer division drawn to the Caen sector is one that will not be facing the Americans next week.'},
    {turn:8,  date:'25 July 1944',  title:'OPERATION COBRA', pp:{G:2},
     text:'Three thousand aircraft carpet-bomb a six-kilometre box west of Saint-Lô, and Panzer Lehr simply ceases to exist. The hole is real: American armour pours through into open country for the first time.'},
    {turn:10, date:'8 August 1944', title:'MORTAIN',
     text:'Hitler orders the panzers to attack west toward Avranches and cut the breakout. They drive instead into a sack: Allied fighter-bombers work the columns over all day. The further west they attack, the deeper the trap becomes.'},
    {turn:11, date:'15 August 1944', title:'OPERATION DRAGOON',
     text:'A second invasion — the Riviera. Army Group G begins a 700-kilometre retreat up the Rhône valley. Every German soldier in France is now thinking about the distance to the Reich.'},
    {turn:12, date:'21 August 1944', title:'THE FALAISE POCKET', pp:{G:2},
     text:'The pincers meet at Chambois: 50,000 prisoners, the roads west choked for miles with burned-out vehicles. In Paris the Resistance rises and the police seize the Préfecture. The Battle of Normandy is ending in catastrophe for the Westheer.'},
  ],
  maxTurn: 12,                              // 12 weeks: 6 Jun → late Aug 1944
  startDate: Date.UTC(1944,5,6),
  // one week of weather matters: the great Channel storm of 19-22 June
  weather(turn){ return turn===3 ? 'mud' : 'clear'; },
  pp(side, turn){
    if (side==='G') return turn<=2 ? 10 : turn===3 ? 5 : turn<=8 ? 13 : 15;  // buildup; Red Ball Express after Cobra
    return 5;                                                  // the Westheer, strained everywhere
  },
  // Allied objective points held at the end (19 total; history ≈ 17)
  victoryTiers: [
    [16,'TOTAL VICTORY — TO THE GERMAN BORDER','France free, the Westheer destroyed, the spearheads racing for the Rhine — even faster than history.'],
    [12,'HISTORY REPEATS — PARIS LIBERATED','The bells of Notre-Dame ring out — Normandy was bought in blood, but France is free by summer\'s end.'],
    [8,'THE SLOW GRIND','A deep lodgement and hard-won ground, but the breakout never quite came — the war in the West will be longer.'],
    [4,'STALEMATE IN THE BOCAGE','The invasion holds a strip of Normandy bought at terrible cost. The Allies will need another plan — and another year.'],
    [0,'THROWN INTO THE SEA','The greatest amphibious gamble in history has failed. There will not be another for years.'],
  ],
  sudden: {
    axisCities: ['Paris','Rouen'], minAxisUnits: 5,
    axisTitle: 'FRANCE LIBERATED',
    axisText:  'Paris is free and the Seine is crossed in force — the German front in the West has collapsed.',
    sovTitle:  'THE INVASION DEFEATED',
    sovText:   'The lodgement is annihilated on the beaches where it landed. The liberation of Europe is postponed indefinitely.',
  },
  airInit: [
    ['G','Allied Expeditionary AF', 10],
    ['G','RAF 2nd Tactical AF', 9],
    ['S','Luftflotte 3', 4],                // outnumbered twenty to one
  ],
  sovAirSchedule: [],
  setup(st){
    // the Atlantic Wall: coastal and fortress garrisons are dug in
    for (const name of ['709. Static','716. Static','711. Static','352. Infanterie','15. Armee Detachment','Paris Garrison']){
      const u = st.units.find(t=>t.name===name);
      if (u) u.entrench = 2;
    }
  },
  opening(playerSide){ return [
    '6 June 1944 — D-DAY. Before dawn three airborne divisions drop into the dark; at 06:30 the ramps go down on five beaches.',
    playerSide==='G'
      ? 'You are ashore. Now win the buildup race — and remember: your supply comes from the beaches until you take a port.'
      : 'The invasion has come — and not at Calais. Contain the beachhead while the panzers arrive, and drive it into the sea.',
  ]; },
};

/* ---------- Scenario 6: The Battle of the Bulge, December 1944 ----------
   Hitler's last gamble in the West. Germany (side G) attacks WEST out of the
   Eifel through the snowbound Ardennes — Sepp Dietrich's 6th Panzer Army in the
   north, Manteuffel's 5th in the centre toward Bastogne and the Meuse, 7th Army
   guarding the southern flank. The objective: cross the Meuse and take Antwerp,
   splitting the Allied armies in two. The thin US VIII Corps is caught by
   surprise; the 101st digs in at Bastogne; and when the skies clear, Patton
   wheels north and Allied air falls on the columns. `reversed:true` bases the
   attacker in the east. A short, sharp seven-turn race against the thaw. */
SCENARIOS.bulge = (function buildBulge(){
  const C = 32, R = 20;
  const map = [];
  // coherent value-noise so terrain edges are organic, not geometric
  const vh = (i,j)=>{ let h=(i*374761393 ^ j*668265263)>>>0; h=Math.imul(h^(h>>>13),1274126177); return ((h^(h>>>16))>>>0)/2147483648-1; };
  const noise = (x,y)=>{ const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
    const a=vh(xi,yi),b=vh(xi+1,yi),c=vh(xi,yi+1),d=vh(xi+1,yi+1); return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v; };
  // meandering river centrelines, x as a function of y
  const meuse  = y => 7 + (16-y)*0.32 + Math.sin(y*0.6)*1.3;          // Dinant → Namur → Liège
  const our    = y => 25 + Math.sin(y*0.55+1)*1.6;                    // the Our / Sauer — the German border
  const ourthe = y => 13 + (y-6)*0.95 + Math.sin(y*0.8)*0.7;          // an inner valley through the forest
  const onR = (x,fx)=> Math.abs(x-fx) < 0.5;
  for (let y=0; y<R; y++){
    let row = '';
    for (let x=0; x<C; x++){
      let t = '.';
      // 1) the rivers cut first
      if (y>=2 && y<=16 && onR(x, meuse(y))) t='r';
      else if (y>=4 && y<=17 && onR(x, our(y))) t='r';
      else if (y>=6 && y<=14 && onR(x, ourthe(y))) t='r';
      // 2) the High Fens — a boggy plateau on the northern shoulder (split Dietrich's attack)
      if (t==='.'){
        const mg = Math.pow((x-16)/4.5,2) + Math.pow((y-4)/2.2,2);
        if (mg + Math.abs(noise(x*0.7+3,y*0.7))*0.7 < 1.0) t='s';
      }
      // 3) the Ardennes — an organic forest plateau
      if (t==='.'){
        const fe = Math.pow((x-17)/8.8,2) + Math.pow((y-10)/6.4,2);
        if (fe + noise(x*0.5,y*0.5)*0.55 < 1.0) t='f';
      }
      // 4) wooded ridgelines in the deep Ardennes
      if (t==='f' && noise(x*0.9+7,y*0.9) > 0.42) t='h';
      // 5) the Eifel, rising on the German side
      if (t==='.' && x>=23){
        const ei = Math.pow((x-27)/4.5,2) + Math.pow((y-10)/7.5,2);
        if (ei + noise(x*0.6+1,y*0.6)*0.5 < 1.0) t='h';
      }
      // 6) the southern (Oesling) hills of the Luxembourg Ardennes
      if (t==='.' && y>=13){
        const so = Math.pow((x-23)/6,2) + Math.pow((y-17)/3.2,2);
        if (so + noise(x*0.6,y*0.6+2)*0.5 < 1.0) t='h';
      }
      row += t;
    }
    map.push(row);
  }
  return {
  id: 'bulge', reversed: true,
  title: 'THE BATTLE OF THE BULGE', short: 'THE BULGE',
  sub: 'THE ARDENNES · 16 DECEMBER 1944 — JANUARY 1945',
  sides: {
    G: {name:'German', flag:'⬛', color:'#454d58', tint:'rgba(108,118,132,0.30)'},
    S: {name:'US',     flag:'🟦', color:'#2e4d6b', tint:'rgba(70,110,170,0.22)'},
  },
  supplyRange: 8,
  menu: {
    ger: {h:'⬛ Germany (Wacht am Rhein)', p:'The last reserves of the Reich, massed in secret. Punch through the surprised Ardennes front, race the panzers to the Meuse, take Bastogne and drive for Antwerp — before the skies clear and Patton turns north.'},
    sov: {h:'🟦 United States', p:'Your front is paper-thin and the storm has fallen on it. Hold the shoulders, dig in at Bastogne and St. Vith, trade ground for time — and when the weather breaks, throw the bulge back into the snow.'},
  },
  kinds: {
    g_inf:  {side:'G', label:'Volksgrenadier',  atk:5, def:5, mp:3, maxStr:9,  cost:9,  sym:'inf'},
    g_pz:   {side:'G', label:'Panzer-Division', atk:8, def:5, mp:6, maxStr:10, cost:18, sym:'arm'},
    g_ss:   {side:'G', label:'SS-Panzer',       atk:9, def:6, mp:6, maxStr:10, cost:22, sym:'arm', color:'#23262b'},
    g_para: {side:'G', label:'Fallschirmjäger', atk:6, def:6, mp:3, maxStr:8,  cost:12, sym:'para'},
    s_inf:  {side:'S', label:'US Infantry Div', atk:5, def:6, mp:3, maxStr:9,  cost:9,  sym:'inf'},
    s_tank: {side:'S', label:'US Armored Div',  atk:7, def:5, mp:5, maxStr:10, cost:15, sym:'arm'},
    s_guard:{side:'S', label:'Airborne Div',    atk:6, def:7, mp:3, maxStr:9,  cost:14, sym:'para', color:'#3f5d40'},
    s_mil:  {side:'S', label:'Green Regiment',  atk:3, def:4, mp:2, maxStr:6,  cost:4,  sym:'inf', color:'#5a5244'},
    g_hq:   {side:'G', label:'Panzer Army HQ',  atk:1, def:4, mp:4, maxStr:6,  cost:0, sym:'hq', hq:true, noBuy:true, noCapture:true, color:'#2f3742'},
    s_hq:   {side:'S', label:'Army Group HQ',   atk:1, def:4, mp:4, maxStr:6,  cost:0, sym:'hq', hq:true, noBuy:true, noCapture:true, color:'#3f5d40'},
  },
  deployNames: {g_inf:'Volksgrenadier Reserve', g_pz:'Panzer Reserve', g_ss:'SS Reserve',
    s_inf:'Reinforcement Div', s_tank:'Armored Reserve', s_guard:'Airborne Reserve'},
  cols: C, rows: R, map,
  cities: [
    {x:3,  y:2,  name:'Antwerp',    vp:5, owner:'S'},
    {x:4,  y:7,  name:'Brussels',   vp:3, owner:'S'},
    {x:12, y:3,  name:'Liège',      vp:2, owner:'S'},
    {x:10, y:6,  name:'Namur',      vp:2, owner:'S'},
    {x:9,  y:11, name:'Dinant',     vp:2, owner:'S'},
    {x:13, y:9,  name:'Marche',     vp:1, owner:'S'},
    {x:16, y:12, name:'Bastogne',   vp:2, owner:'S'},
    {x:21, y:7,  name:'St. Vith',   vp:1, owner:'S'},
    {x:18, y:9,  name:'Houffalize', vp:0, owner:'S'},
    {x:19, y:5,  name:'Malmedy',    vp:0, owner:'S'},
    {x:24, y:16, name:'Luxembourg', vp:1, owner:'S'},
    {x:30, y:5,  name:'Köln',       vp:0, owner:'G'},
    {x:28, y:15, name:'Trier',      vp:0, owner:'G'},
    {x:27, y:9,  name:'Prüm',       vp:0, owner:'G'},
  ],
  gerSpawns: [[31,3],[31,8],[31,12],[31,16],[30,6]],
  sovSpawns: [[0,4],[0,8],[0,12],[1,6],[2,15]],
  /* 16 December 1944, 05:30 — three German armies burst from the Eifel into a
     fog-bound Ardennes held by four tired American divisions. */
  startUnits: [
    // 6. Panzerarmee (Dietrich) — the northern Schwerpunkt
    ['g_hq', '6.Panzerarmee',     30, 3],
    ['g_ss', '1.SS Leibstandarte',23, 4],
    ['g_ss', '12.SS Hitlerjugend',24, 5],
    ['g_para','3.Fallschirmjäger',24, 3],
    ['g_inf','277.Volksgrenadier',25, 4],
    // 5. Panzerarmee (Manteuffel) — the centre, toward Bastogne and the Meuse
    ['g_hq', '5.Panzerarmee',     30, 10],
    ['g_pz', '2.Panzer',          23, 10],
    ['g_pz', '116.Panzer',        24, 8],
    ['g_pz', 'Panzer Lehr',       23, 12],
    ['g_inf','26.Volksgrenadier', 25, 11],
    ['g_inf','18.Volksgrenadier', 25, 8],
    // 7. Armee — the southern flank guard
    ['g_hq', '7.Armee',           29, 16],
    ['g_inf','5.Fallschirmjäger', 24, 15],
    ['g_inf','352.Volksgrenadier',26, 16],
    // ---- United States (S) ----
    // VIII Corps — the thin, surprised front
    ['s_inf','106th Division',    22, 7, 5],
    ['s_inf','28th Division',     21, 12, 5],
    ['s_mil','14th Cavalry',      22, 6, 4],
    ['s_inf','4th Division',      23, 16, 6],
    // V Corps — the firm northern shoulder
    ['s_inf','99th Division',     22, 4, 6],
    ['s_inf','2nd Division',      21, 3, 7],
    ['s_tank','7th Armored',      20, 7, 7],
    // the reserves rushing in
    ['s_guard','101st Airborne',  16, 12, 8],
    ['s_guard','82nd Airborne',   15, 5, 8],
    ['s_tank','3rd Armored',      13, 4, 7],
    ['s_inf','30th Division',     14, 3, 6],
    ['s_inf','1st Division',      13, 6, 6],
    // the Meuse blocking line and the rear
    ['s_guard','XXX Corps (Br)',   8, 4, 8],
    ['s_mil','Brussels Garrison',  5, 7, 5],
    ['s_hq','12th Army Group',     6, 9],
    ['s_hq','First Army',         11, 5],
  ],
  generals: [
    {side:'G', unit:'1.SS Leibstandarte', name:'Peiper', atk:1.18,
     bio:'Kampfgruppe Peiper — the armoured spearhead of the SS, racing for the Meuse, and the dark name of Malmedy.'},
    {side:'G', unit:'2.Panzer', name:'von Manteuffel', atk:1.14,
     bio:'His 5th Panzer Army drives the deepest thrust of the offensive — to within sight of the Meuse at Dinant.'},
    {side:'G', unit:'12.SS Hitlerjugend', name:'Dietrich', atk:1.08,
     bio:'"Sepp" Dietrich and the 6th Panzer Army carry the main effort on the northern shoulder.'},
    {side:'S', unit:'101st Airborne', name:'McAuliffe', def:1.22,
     bio:'"NUTS!" — his one-word answer to the German surrender demand at Bastogne becomes a legend.'},
    {side:'S', unit:'4th Armored (Patton)', name:'Patton', atk:1.20,
     bio:'Wheels the Third Army ninety degrees in the snow and drives north to relieve Bastogne — the finest hour of his career.'},
    {side:'S', unit:'7th Armored', name:'Clarke', def:1.12,
     bio:'Holds the vital road junction at St. Vith for six days against everything Manteuffel can throw at it.'},
  ],
  sovSchedule: [
    [2,'s_tank','4th Armored (Patton)'], [2,'g_inf','Volksgrenadier Reserve'],
    [3,'s_inf','80th Division'],         [3,'s_tank','2nd Armored'],
    [4,'s_guard','XVIII Airborne'],      [4,'s_inf','35th Division'],
    [5,'s_tank','11th Armored'],         [6,'s_inf','83rd Division'],
    // the reduction of the bulge: a steady US stream, one last German scrape
    [8,'s_inf','75th Division'],         [8,'g_inf','Volksgrenadier (last reserve)'],
    [9,'s_tank','6th Armored'],          [10,'s_inf','87th Division'],
    [11,'s_guard','17th Airborne'],      [12,'s_inf','90th Division'],
    [14,'s_inf','5th Division'],
  ],
  events: [
    {turn:1, date:'16 December 1944', title:'WACHT AM RHEIN',
     text:'In freezing fog before dawn, a thousand guns open along the Ardennes and three German armies pour out of the Eifel — exactly where the Americans thought the front quiet enough to rest tired divisions. Total surprise. The Battle of the Bulge has begun.'},
    {turn:2, date:'18 December 1944', title:'KAMPFGRUPPE PEIPER',
     text:'Peiper\'s SS spearhead races west, overrunning depots and crossroads — and at Malmedy machine-guns its prisoners in the snow. But the fuel dumps it was counting on are blown or driven off, and the column burns gasoline it cannot replace.'},
    {turn:3, date:'21 December 1944', title:'"NUTS!"',
     text:'The crossroads town of Bastogne is surrounded, the 101st Airborne ringed inside it. The German envoy delivers a demand to surrender; General McAuliffe\'s written reply is a single word: "NUTS!" The garrison holds.'},
    {turn:4, date:'23 December 1944', title:'THE SKIES CLEAR', pp:{S:3},
     text:'A high-pressure front sweeps the fog away. For the first time the Allied air forces rise in their thousands — and fall on the German columns jammed nose-to-tail on the icy Ardennes roads. To the south, Patton\'s tanks are already driving north.'},
    {turn:5, date:'25 December 1944', title:'THE HIGH-WATER MARK',
     text:'On Christmas Day the 2nd Panzer reaches Celles, four miles short of the Meuse — and there it stops, out of fuel, and is torn apart by the US 2nd Armored. The tide of the offensive has crested. It will never come this far again.'},
    {turn:6, date:'26 December 1944', title:'BASTOGNE RELIEVED', pp:{S:2},
     text:'Patton\'s 4th Armored punches a corridor into Bastogne. The siege is broken; the most dangerous point of the German line is now an American sally-port. From here the bulge can only shrink.'},
    {turn:7, date:'3 January 1945', title:'REDUCING THE BULGE',
     text:'The Allied counteroffensive grinds in from north and south to pinch off the salient. The last reserves of the West are spent — and behind them, the road to the Rhine lies open.'},
    {turn:9, date:'9 January 1945', title:'SQUEEZING THE SALIENT',
     text:'First Army drives south from the shoulder while Patton presses north out of Bastogne. The bulge the panzers took a week to carve is being pinched shut from both flanks, in waist-deep snow and killing cold.'},
    {turn:12, date:'16 January 1945', title:'JUNCTION AT HOUFFALIZE',
     text:'At the ruined crossroads of Houffalize the US First and Third Armies finally meet. The salient is severed; whatever German armour is still west of the town must run the gauntlet east or be abandoned in the snow.'},
    {turn:16, date:'28 January 1945', title:'THE LINE RESTORED', pp:{S:2},
     text:'The front stands where it stood on 16 December — the bulge erased. The Reich has spent its last mobile reserves in the West for six weeks of borrowed time, and ahead lies only the Rhine.'},
  ],
  maxTurn: 16, turnDays: 3,                 // 16 Dec 1944 → 30 Jan 1945, ~3 days a turn
  startDate: Date.UTC(1944,11,16),
  // freezing fog grounds Allied air through the opening; it clears for the
  // great air days of late December, then a hard January cold snap returns.
  weather(turn){ return turn<=3 ? 'freeze' : turn>=10 ? 'freeze' : 'clear'; },
  pp(side, turn){ return side==='G' ? (turn<=2 ? 10 : turn<=4 ? 6 : turn<=8 ? 3 : 2) : (turn<=3 ? 5 : 8); },
  // German objective points held at the end (19 total). History ≈ 3.
  victoryTiers: [
    [14,'DECISIVE GERMAN VICTORY','The Meuse is crossed and Antwerp falls — the western alliance is cut in two, exactly as Hitler gambled. A victory history never allowed.'],
    [9, 'GERMAN VICTORY','The panzers reach the Meuse and hold Bastogne — a far deeper and more dangerous bulge than the real Ardennes ever became.'],
    [5, 'A DEEPER SALIENT','Ground is taken and the front bent back hard, but the great objectives hold — a costly bulge, like the real one, that buys nothing but a little time.'],
    [0, 'WACHT AM RHEIN FAILS','The offensive is stopped short in the snow, the last reserves of the West spent for nothing — and the road to the Rhine lies open.'],
  ],
  sudden: {
    axisCities: ['Antwerp','Brussels'], minAxisUnits: 3,
    axisTitle: 'THE ALLIES SPLIT',
    axisText:  'Antwerp and Brussels are taken — the British and American army groups are severed and the great port is lost. The gamble has paid off.',
    sovTitle:  'THE BULGE BROKEN',
    sovText:   'The German spearheads are destroyed in the snow far short of the Meuse. The Wehrmacht has shot its last bolt in the West.',
  },
  airInit: [
    ['S','US Ninth Air Force', 9],
    ['S','RAF 2nd TAF',        8],
    ['G','Luftwaffe (West)',   4],
  ],
  sovAirSchedule: [ [4,'IX Tactical Air Command', 8], [5,'Allied Heavy Bombers', 7] ],
  setup(st){
    // the defenders that held: Bastogne, St. Vith and the northern shoulder dig in
    for (const name of ['101st Airborne','7th Armored','2nd Division','99th Division']){
      const u = st.units.find(t=>t.name===name); if (u) u.entrench = 2;
    }
    // the surprised front line is caught in the open
    for (const name of ['106th Division','28th Division','14th Cavalry']){
      const u = st.units.find(t=>t.name===name); if (u) u.entrench = 0;
    }
  },
  opening(playerSide){ return [
    '16 December 1944 — Wacht am Rhein. Out of the fog of the Ardennes, the last panzer reserves of the Reich fall on a sleeping front.',
    playerSide==='G'
      ? 'You have surprise, armour and a week before the skies clear. Reach the Meuse and take Bastogne — then drive for Antwerp.'
      : 'You are surprised and outnumbered at the point of attack. Hold the shoulders, hold Bastogne, and wait for the weather to turn.',
  ]; },
  };
})();

/* ---------- Scenario 5: The Battle of Midway, June 1942 ----------
   The Pacific. One turn = ONE DAY. Almost the whole map is navigable
   ocean; units are naval task forces. Carriers are floating airfields:
   the air war ranges from them (and from Midway itself), and they are
   devastating but fragile. Japan (side G) must take the atoll; the
   ambushing US carriers must make them pay. */
SCENARIOS.midway = {
  id: 'midway',
  title: 'THE BATTLE OF MIDWAY', short: 'MIDWAY',
  sub: 'THE PACIFIC · 4 — 10 JUNE 1942 · ONE TURN = ONE DAY',
  sides: {
    G: {name:'Japanese', flag:'🟥', color:'#7e2f23', tint:'rgba(190,60,45,0.18)'},
    S: {name:'US',       flag:'🟦', color:'#2e4d6b', tint:'rgba(70,110,170,0.20)'},
  },
  /* naval kinds: carriers are floating airfields (their air groups die with
     them), battleships shoot 2 hexes, submarines can't be bombed, and only
     the troop convoy or a garrison can actually take an island */
  kinds: {
    g_pz:   {side:'G', label:'Carrier Division',   atk:8, def:4, mp:5, maxStr:8,  cost:30, sym:'cv', carrier:true, fast:true, noCapture:true},
    g_inf:  {side:'G', label:'Battleship Division',atk:6, def:7, mp:4, maxStr:10, cost:24, sym:'bb', range:2, noCapture:true},
    g_ca:   {side:'G', label:'Cruiser Division',   atk:4, def:5, mp:5, maxStr:8,  cost:18, sym:'ca', fast:true, noCapture:true},
    g_ally: {side:'G', label:'Invasion Convoy',    atk:2, def:3, mp:3, maxStr:8,  cost:20, sym:'tr', color:'#6b5a36'},
    s_tank: {side:'S', label:'Carrier Task Force', atk:7, def:4, mp:5, maxStr:8,  cost:30, sym:'cv', carrier:true, fast:true, noCapture:true},
    s_inf:  {side:'S', label:'Cruiser Task Force', atk:4, def:5, mp:5, maxStr:8,  cost:20, sym:'ca', fast:true, noCapture:true},
    s_sub:  {side:'S', label:'Submarine Patrol',   atk:5, def:2, mp:3, maxStr:4,  cost:15, sym:'ss', lowProfile:true, noCapture:true, noBuy:true},
    s_guard:{side:'S', label:'Fast Battleships',   atk:6, def:7, mp:4, maxStr:10, cost:30, sym:'bb', range:2, noCapture:true},
    s_mil:  {side:'S', label:'Island Garrison',    atk:2, def:5, mp:1, maxStr:8,  cost:10, sym:'inf', color:'#4a5a44'},
  },
  menu: {
    ger: {h:'🟥 Imperial Japan', p:'Four fleet carriers, the finest naval aviators alive, and one objective: take Midway and finish what Pearl Harbor started — before the American carriers interfere.'},
    sov: {h:'🟦 United States Navy', p:'The codebreakers have given you the ambush of the century. Three carriers wait northeast of Midway. Hold the atoll — and sink the Kidō Butai.'},
  },
  cols: 30, rows: 20,
  /* open ocean; Kure atoll (18,8) and Midway (20,9) are the only land */
  map: [
  /* 0*/ "oooooooooooooooooooooooooooooo",
  /* 1*/ "oooooooooooooooooooooooooooooo",
  /* 2*/ "oooooooooooooooooooooooooooooo",
  /* 3*/ "oooooooooooooooooooooooooooooo",
  /* 4*/ "oooooooooooooooooooooooooooooo",
  /* 5*/ "oooooooooooooooooooooooooooooo",
  /* 6*/ "oooooooooooooooooooooooooooooo",
  /* 7*/ "oooooooooooooooooooooooooooooo",
  /* 8*/ "oooooooooooooooooo.ooooooooooo",
  /* 9*/ "oooooooooooooooooooo.ooooooooo",
  /*10*/ "oooooooooooooooooooooooooooooo",
  /*11*/ "oooooooooooooooooooooooooooooo",
  /*12*/ "oooooooooooooooooooooooooooooo",
  /*13*/ "oooooooooooooooooooooooooooooo",
  /*14*/ "oooooooooooooooooooooooooooooo",
  /*15*/ "oooooooooooooooooooooooooooooo",
  /*16*/ "oooooooooooooooooooooooooooooo",
  /*17*/ "oooooooooooooooooooooooooooooo",
  /*18*/ "oooooooooooooooooooooooooooooo",
  /*19*/ "oooooooooooooooooooooooooooooo",
  ],
  cities: [
    {x:20, y:9, name:'Midway', vp:2, owner:'S'},
  ],
  gerSpawns: [], sovSpawns: [],
  supplyRange: 40,                          // fleet trains: nobody starves in a week at sea
  startUnits: [
    // — Kidō Butai and the invasion force, closing from the northwest —
    ['g_pz' ,'1st Carrier Div (Akagi·Kaga)',   9,7,  8],
    ['g_pz' ,'2nd Carrier Div (Hiryū·Sōryū)', 10,9,  8],
    ['g_ca' ,'Cruiser Div 8 (Tone·Chikuma)',  11,8,  7],
    ['g_inf','Battleship Force (Yamato)',      7,9,  10],
    ['g_ca' ,'Destroyer Screen',               8,11, 6],
    ['g_inf','Cruiser Div 7 (Mogami)',         9,12, 8],
    ['g_ally','Midway Invasion Convoy',        7,13, 8],
    // — the American ambush, waiting at Point Luck —
    ['s_tank','TF-16 (Enterprise·Hornet)',    25,5,  8],
    ['s_tank','TF-17 (Yorktown)',             26,7,  7],
    ['s_inf','TF-8 Cruisers',                 24,8,  7],
    ['s_sub','Submarine Picket Line',         16,11, 4],
    ['s_mil','Midway Garrison',               20,9,  7],
  ],
  sovSchedule: [],
  generals: [
    {side:'G', unit:'1st Carrier Div (Akagi·Kaga)', name:'Nagumo', def:1.10,
     bio:'Victor of Pearl Harbor — cautious, unlucky, and about to face the most debated decision of the Pacific war.'},
    {side:'G', unit:'2nd Carrier Div (Hiryū·Sōryū)', name:'Yamaguchi', atk:1.15,
     bio:'The boldest carrier admiral in the fleet. He will go down with Hiryū rather than leave her.'},
    {side:'G', unit:'Battleship Force (Yamato)', name:'Yamamoto', atk:1.10,
     bio:'Architect of the whole operation — watching from Yamato\'s bridge, three hundred miles too far behind.'},
    {side:'S', unit:'TF-16 (Enterprise·Hornet)', name:'Spruance', atk:1.15,
     bio:'The cool-headed cruiser admiral handed Halsey\'s carriers — and about to make every decision right.'},
    {side:'S', unit:'TF-17 (Yorktown)', name:'Fletcher', def:1.10,
     bio:'Veteran of Coral Sea, flying his flag from a carrier patched back together in 72 hours.'},
  ],
  /* Midway itself: the unsinkable carrier — garrison, guns and land-based air */
  capitalDefense: {turn:1, range:1, def:1.2, city:'Midway',
    announce:'⭐ Midway\'s garrison stands to — the island is an unsinkable carrier.'},
  decisions: [
    {
      id:'nagumo', turn:1, side:'G',
      date:'4 June 1942 · 07:45', title:'NAGUMO\'S DILEMMA',
      text:'The first wave reports Midway needs a <b>second strike</b> — and your reserve aircraft sit armed with anti-ship torpedoes for a fleet that scouts say isn\'t there. Re-arm them with land bombs for the island? Or keep them ready in case the Americans <i>are</i> out there? This is the decision the whole battle turned on.',
      options:[
        {label:'Re-arm for a second strike on Midway',
         effect:'Midway’s garrison −2 strength and your air groups +1 — but your carriers −1 strength, caught mid-rearm (decks full of fuel and bombs)',
         blurb:'Commit the reserve to crushing the atoll. The island\'s defenses crumble — but your flight decks fill with fuel and bombs, and a carrier caught mid-rearm is a tinderbox.',
         log:'🟥 The order goes out: re-arm with land bombs. Hangar crews race to swap ordnance — decks crowded, hoses everywhere.',
         apply(G){
           const gar = G.units.find(u=>u.name==='Midway Garrison'); if (gar) gar.str = Math.max(1, gar.str-2);
           airOf('G').forEach(a=>{ a.str = Math.min(AIR_MAXSTR, a.str+1); });
           unitsOf('G').filter(u=>KINDS[u.kind].carrier).forEach(c=>{ c.str = Math.max(1, c.str-1); }); // caught rearming
         }},
        {label:'Hold the reserve armed against the fleet',
         effect:'Your air groups +1 strength AND your carriers +1 strength (decks clear, ready to strike first) — Midway stays dangerous',
         blurb:'Trust the warning and keep the torpedo planes ready. If the enemy carriers appear, you strike first — the only thing that matters in carrier war. Midway stays dangerous.',
         log:'🟥 “Hold them armed for ships.” The reserve stays ready on the hangar deck — and the scouts are sent out again.',
         apply(G){
           airOf('G').forEach(a=>{ a.str = Math.min(AIR_MAXSTR, a.str+1); });
           unitsOf('G').filter(u=>KINDS[u.kind].carrier).forEach(c=>{ c.str = Math.min(KINDS[c.kind].maxStr, c.str+1); });
         }},
      ],
      ai(G){ return 1; },   // the smart, historical-counterfactual choice: keep the decks clear
    },
  ],
  events: [
    {turn:1, date:'4 June 1942', title:'AF IS SHORT OF WATER',
     text:'Weeks ago, Station HYPO\'s codebreakers tricked Japan into revealing its target. Nimitz knows the date, the bearing, and the order of battle. Three American carriers wait at "Point Luck" — northeast of Midway, exactly where Japan believes there is only empty ocean.'},
    {turn:2, date:'5 June 1942', title:'THE FATEFUL FIVE MINUTES',
     text:'History\'s verdict on 4 June: with Japanese decks crowded with rearming aircraft, the dive bombers of Enterprise and Yorktown arrived overhead unseen. In five minutes Akagi, Kaga and Sōryū were burning wrecks. Battles this size are rarely decided so fast — unless someone is caught with their planes on deck.'},
    {turn:3, date:'6 June 1942', title:'HIRYŪ\'S REVENGE',
     text:'Alone, Yamaguchi\'s Hiryū struck back twice and crippled Yorktown before the Americans found her at dusk. The lesson of carrier war: whoever strikes first, wins — and there is no second prize.'},
    {turn:4, date:'7 June 1942', title:'YAMAMOTO TURNS BACK',
     text:'With his carriers gone, Yamamoto\'s battleships — the most powerful surface fleet on Earth — can do nothing but withdraw, unable even to force a night action. The age of the battleship ended this week, in waters it never fired a shot over.'},
  ],
  maxTurn: 7, turnDays: 1,                  // one week of battle, a day at a time
  startDate: Date.UTC(1942,5,4),
  weather(){ return 'clear'; },
  pp(){ return 2; },                        // repairs only — no new fleets in a week
  // Japanese objective points at the end: Midway taken or held
  victoryTiers: [
    [2,'JAPANESE VICTORY — MIDWAY FALLS','The Rising Sun flies over Midway. Hawaii is in range, and the Pacific Fleet must now come out and fight on Japan\'s terms.'],
    [0,'AMERICAN VICTORY — THE AMBUSH HOLDS','Midway holds, and the Kidō Butai has paid in irreplaceable carriers and aviators. The tide of the Pacific war has turned.'],
  ],
  sudden: {
    axisCities: ['Midway'], minAxisUnits: 2,
    axisTitle: 'JAPANESE VICTORY — MIDWAY FALLS',
    axisText:  'The invasion force is ashore and the atoll is taken. The Pacific Fleet has lost its forward sentinel — and perhaps the war\'s initiative.',
    sovTitle:  'DECISIVE AMERICAN VICTORY',
    sovText:   'The Kidō Butai — the finest carrier force on Earth — has been annihilated. Japan will never again take the strategic offensive.',
  },
  /* every carrier air group is tied to its ship — sink the carrier and the
     planes die with her. Midway's own air wing flies from the island. */
  airInit: [
    ['G','Akagi·Kaga Air Group',  9, '1st Carrier Div (Akagi·Kaga)'],
    ['G','Hiryū·Sōryū Air Group', 9, '2nd Carrier Div (Hiryū·Sōryū)'],
    ['S','Enterprise·Hornet Air', 8, 'TF-16 (Enterprise·Hornet)'],
    ['S','Yorktown Air Group',    6, 'TF-17 (Yorktown)'],
    ['S','Midway Air Wing',       5],
  ],
  sovAirSchedule: [],
  setup(st){
    const g = st.units.find(t=>t.name==='Midway Garrison');
    if (g) g.entrench = 2;                  // dug into the coral for months
  },
  opening(playerSide){ return [
    '4 June 1942, 04:30 — the Kidō Butai turns into the wind and launches 108 aircraft at Midway.',
    playerSide==='S'
      ? 'HYPO has broken their code: you know they are coming. Spring the ambush — and strike first.'
      : 'Somewhere out there, the American carriers may be waiting. Find them before they find you.',
  ]; },
};

/* ---------- Realistic Mode: War in the East, 1941–42 ----------
   The full Eastern Front at operational scale on a 60×36 map — Finland to the
   Crimea, the frontier to the Volga. Step 1 of the realistic-mode build:
   the theater itself. Deeper mechanics (fuel, railheads) arrive in later steps. */
SCENARIOS.realistic = {
  id: 'realistic',
  realistic: true,
  title: 'WAR IN THE EAST',
  short: 'WAR IN THE EAST',
  sub: 'EASTERN FRONT 1941–42 · REALISTIC MODE · OPERATIONAL SCALE',
  menu: {
    ger: {h:'⬛ Germany (Axis)', p:'Three army groups, one campaigning season. Leningrad, Moscow, the Donbas — take them before the winter, on a front two thousand kilometres wide.'},
    sov: {h:'🟥 Soviet Union', p:'Trade a continent for time. Hold the river lines, save the armies from the pockets, and when the snow falls — strike back.'},
  },
  fuel: true,                                   // mechanized formations burn & refuel fuel
  harshOOS: true,                               // pockets fight at a fraction and starve fast
  railhead: {G: true},                          // German forward depots lag behind the railhead
  supplyRange: 12,                              // hexes are ~half-scale here, so supply reaches further
                                                //   (keeps the depot chain intact on the 60-wide map;
                                                //    encirclement still cuts via ZOC, not distance)
  /* operational scale: ~40 km per hex, one week per turn. Movement is slower
     than arcade mode — a panzer group covers ~160 km a week in open country,
     infantry half that. The tempo of the real campaign, not the arcade dash.
     fuel:true kinds burn fuel to move (see the FUEL section). */
  kinds: {
    g_inf:  {side:'G', label:'Infantry Army',    atk:5, def:5, mp:2, maxStr:10, cost:10, sym:'inf'},
    g_mot:  {side:'G', label:'Motorized Corps',  atk:6, def:5, mp:3, maxStr:9,  cost:14, sym:'mot', fast:true, fuel:true, color:'#46504a'},
    g_pz:   {side:'G', label:'Panzer Group',     atk:8, def:5, mp:4, maxStr:10, cost:18, sym:'arm', fuel:true},
    g_ss:   {side:'G', label:'SS Panzer Korps',  atk:9, def:7, mp:4, maxStr:10, cost:24, sym:'arm', fuel:true, color:'#23262b'},
    g_ally: {side:'G', label:'Allied Army',      atk:3, def:3, mp:2, maxStr:8,  cost:8,  sym:'inf', color:'#5c5536'},
    s_inf:  {side:'S', label:'Rifle Army',       atk:3, def:5, mp:2, maxStr:8,  cost:8,  sym:'inf'},
    s_tank: {side:'S', label:'Tank Corps',       atk:5, def:4, mp:4, maxStr:8,  cost:12, sym:'arm', fuel:true},
    s_cav:  {side:'S', label:'Cavalry Corps',    atk:4, def:4, mp:4, maxStr:7,  cost:9,  sym:'cav', fast:true, winter:true, color:'#7a6a3a'},
    s_guard:{side:'S', label:'Guards Army',      atk:6, def:6, mp:3, maxStr:10, cost:14, sym:'inf', winter:true, color:'#b04a18'},
    s_mil:  {side:'S', label:'Militia',          atk:2, def:3, mp:2, maxStr:6,  cost:4,  sym:'inf', color:'#7a4a3a'},
    g_hq:   {side:'G', label:'Army Group HQ',    atk:1, def:4, mp:3, maxStr:6,  cost:0,  sym:'hq', hq:true, noBuy:true, noCapture:true, color:'#2f3742'},
    s_hq:   {side:'S', label:'Front HQ',         atk:1, def:4, mp:3, maxStr:6,  cost:0,  sym:'hq', hq:true, noBuy:true, noCapture:true, color:'#6e2620'},
  },
  deployNames: {g_inf:'Ersatz Armee', g_mot:'Motorized Reserve', g_pz:'Panzer Reserve',
    g_ss:'SS Reserve Korps', s_inf:'Reserve Army', s_tank:'Tank Reserve',
    s_cav:'Cavalry Reserve', s_mil:'People’s Militia'},
  cols: 60, rows: 36,
  map: [
/*           0    5    10   15   20   25   30   35   40   45   50   55     */
/* 0*/ "~~~~~~~~~~ffff~~~~~~~~fff....fffffffffffffffffffffffffffffff",
/* 1*/ "~~~~~~~~~~~~~~~~~~~~~~...~~~~fffffffffffffffffffffffffffffff",
/* 2*/ "~~~~~~~~~~~~~~~~~~~~~~..~~~~~fffff.....fffffffffffffffffffff",
/* 3*/ "~~~~~~~~~~~ffff..........~~~~.................ffffffffffffff",
/* 4*/ "~~~~~~~~~~fffff..fff.sss...........................fffffffff",
/* 5*/ "~~~~~~~~~~~.fff~~fffssss.......r...............fffffffffffff",
/* 6*/ "~~~~~~~~~~..frf~~fff..ffff.hhhh.r.......ffff...fffffffffffff",
/* 7*/ "~~~~~~~~~.....r..ffff.ffffhhhhhh.rrfff..ffffffffffffffffffff",
/* 8*/ "...............rfffff.ffffffffff...ffff.fffffffffff.....ffff",
/* 9*/ "............ffffrrfff.fffffffffffff.f...fff.fff.............",
/*10*/ "............ffffffrrr........ffffff.....fff..fff............",
/*11*/ "............fffffff.fffr............ffff..ffffff............",
/*12*/ "................fff..ffr...........ffff...ffffff............",
/*13*/ "......................r.....ffffff........fff...............",
/*14*/ "......................r....fffffff...................r......",
/*15*/ "............sssssss..r......ffff.....................r......",
/*16*/ "..........sssssssssssr..f...........................r.......",
/*17*/ ".........sssssssssssrs...f..........................r.......",
/*18*/ ".........sssssssssssrs...................r...........r......",
/*19*/ "..........ssssssssssr...................r............r......",
/*20*/ "............sssssssr...f...............r..............r.....",
/*21*/ "..................r....................r..............r.....",
/*22*/ "..h...............r...............r.....r............r......",
/*23*/ "hhhh...............r...............r.....r...........r......",
/*24*/ "hhhhhhr.............r.............hhr.....r.........r.......",
/*25*/ "hhhhhhhr..............r.r............r.....r........r.......",
/*26*/ "hhhhhh..r................r............r...r........r........",
/*27*/ "hhhhhh...r..............r..............rr.r.........r.......",
/*28*/ "hhhh.r....rr...........r.....~~~~~~~.................r...~~~",
/*29*/ ".....r....~~r~~.......r~.~~~~~~~~~~~~.................r..~~~",
/*30*/ "......r.~~~~~~~~~~~~~~......~~~~~~~~~~~................r.~~~",
/*31*/ ".......r~~~~~~~~~~~~~~......~~~~~~~~~~~................~~~~~",
/*32*/ "......~~~~~~~~~~~~~~~~~....~~~~~~~~~~~~.....hhhhhhhhh..~~~~~",
/*33*/ "......~~~~~~~~~~~~~~~~~....~~~~~~~~~~~~.hhhhhhhhhhhhhhh~~~~~",
/*34*/ "......~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.hhhhhhhhhhhhhhh~~~~~",
/*35*/ "......~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.hhhhhhhhhhhhhhh~~~~~",
  ],
  cities: [
    {x:4,  y:8,  name:'Königsberg',     vp:0, owner:'G'},
    {x:3,  y:15, name:'Warsaw',         vp:0, owner:'G'},
    {x:9,  y:28, name:'Jassy',          vp:0, owner:'G'},
    {x:8,  y:17, name:'Brest',          vp:0, owner:'S'},
    {x:7,  y:22, name:'Lvov',           vp:1, owner:'S'},
    {x:12, y:6,  name:'Riga',           vp:1, owner:'S'},
    {x:13, y:10, name:'Vilnius',        vp:0, owner:'S'},
    {x:17, y:13, name:'Minsk',          vp:1, owner:'S'},
    {x:16, y:7,  name:'Pskov',          vp:0, owner:'S'},
    {x:21, y:6,  name:'Novgorod',       vp:1, owner:'S'},
    {x:23, y:3,  name:'Leningrad',      vp:3, owner:'S'},
    {x:21, y:10, name:'Vitebsk',        vp:1, owner:'S'},
    {x:22, y:15, name:'Mogilev',        vp:0, owner:'S'},
    {x:26, y:11, name:'Smolensk',       vp:2, owner:'S'},
    {x:33, y:8,  name:'Kalinin',        vp:1, owner:'S'},
    {x:37, y:10, name:'Moscow',         vp:5, owner:'S'},
    {x:37, y:13, name:'Tula',           vp:1, owner:'S'},
    {x:33, y:15, name:'Orel',           vp:1, owner:'S'},
    {x:30, y:16, name:'Bryansk',        vp:0, owner:'S'},
    {x:35, y:18, name:'Kursk',          vp:1, owner:'S'},
    {x:41, y:17, name:'Voronezh',       vp:1, owner:'S'},
    {x:19, y:21, name:'Kiev',           vp:3, owner:'S'},
    {x:33, y:21, name:'Kharkov',        vp:2, owner:'S'},
    {x:27, y:25, name:'Dnepropetrovsk', vp:1, owner:'S'},
    {x:33, y:25, name:'Stalino',        vp:1, owner:'S'},
    {x:16, y:29, name:'Odessa',         vp:1, owner:'S'},
    {x:24, y:33, name:'Sevastopol',     vp:1, owner:'S'},
    {x:43, y:28, name:'Rostov',         vp:2, owner:'S'},
    {x:52, y:26, name:'Stalingrad',     vp:3, owner:'S'},
    {x:45, y:6,  name:'Gorky',          vp:1, owner:'S'},
    {x:50, y:12, name:'Penza',          vp:0, owner:'S'},
    {x:48, y:21, name:'Saratov',        vp:1, owner:'S'},
  ],
  sovSpawns: [[37,10],[23,3],[33,8],[37,13],[41,17],[33,21],[43,28],[52,26],
              [45,6],[48,21],[59,10],[59,16],[59,22]],
  gerSpawns: [[4,8],[3,15],[9,28],[0,12],[0,16],[0,20]],
  /* 22 June 1941. Three army groups on the frontier; the Red Army's border
     districts caught mid-deployment, reserves echeloned deep behind them. */
  startUnits: [
    ['g_inf','18th Army',          10,6],
    ['g_pz', '4th Panzer Group',   10,7],
    ['g_inf','16th Army',          10,9],
    ['g_pz', '3rd Panzer Group',   10,11],
    ['g_inf','9th Army',           9, 12],
    ['g_ss', 'SS Panzer Korps',    10,13],
    ['g_inf','4th Army',           9, 14],
    ['g_pz', '2nd Panzer Group',   9, 16],
    ['g_hq', 'AGC Headquarters',   6, 13],
    ['g_inf','6th Army',           8, 19],
    ['g_mot','XXXIX Motorized',    7, 19],
    ['g_pz', '1st Panzer Group',   8, 21],
    ['g_inf','17th Army',          7, 23],
    ['g_ally','3rd Romanian Army', 8, 27],
    ['g_inf','11th Army',          8, 29],
    ['g_hq', 'AGS Headquarters',   5, 21],
    ['s_inf','8th Army',           12,7,  6],
    ['s_inf','11th Army',          13,11, 6],
    ['s_inf','3rd Army',           11,13, 6],
    ['s_inf','10th Army',          11,15, 6],
    ['s_inf','4th Army',           10,17, 6],
    ['s_tank','6th Mech Corps',    13,14, 7],
    ['s_inf','5th Army',           12,20, 7],
    ['s_inf','6th Army',           10,22, 6],
    ['s_tank','4th Mech Corps',    12,23, 7],
    ['s_inf','26th Army',          9, 24, 6],
    ['s_inf','12th Army',          9, 26, 6],
    ['s_inf','9th Army',           13,28, 7],
    ['s_tank','8th Mech Corps',    10,20, 7],
    /* the second strategic echelon — reserve armies on the Dvina–Dnieper line,
       and garrisons in the great cities (this depth is what stopped the real blitz) */
    ['s_inf','13th Army',          17,13, 7],
    ['s_inf','20th Army',          26,11, 7],
    ['s_inf','21st Army',          22,15, 7],
    ['s_inf','37th Army',          19,21, 8],
    ['s_inf','Coastal Army',       16,29, 7],
    ['s_inf','16th Army',          26,12, 8],
    ['s_inf','19th Army',          20,20, 8],
    ['s_mil','Leningrad Militia',  23,4],
    ['s_inf','55th Army',          23,3,  8],
    ['s_inf','48th Army',          21,6,  7],
    ['s_inf','23rd Army',          24,4,  8],
    ['s_inf','42nd Army',          22,7,  7],
    ['s_inf','32nd Army',          37,10, 8],
    ['s_inf','24th Army',          30,11, 8],
    ['s_inf','22nd Army',          22,9,  7],
    ['s_hq', 'STAVKA Reserve',     36,11],
  ],
  /* mobilization: the USSR raised armies faster than the Ostheer could destroy
     them — but the early waves are raw and the Germans get a couple of allied
     armies of their own. Tuned so the historical stalemate is the median result. */
  sovSchedule: [
    [4, 's_mil','Moscow Militia'], [6, 's_inf','29th Army'],
    [9, 's_inf','30th Army'],      [11,'s_inf','33rd Army'],
    [13,'s_inf','49th Army'],      [14,'g_inf','2nd Army'],
    [16,'s_tank','2nd Tank Corps'],[18,'s_guard','1st Shock Army'],
    [20,'s_guard','1st Siberian Gds'], [20,'g_ally','8th Italian Army'],
    [22,'s_guard','2nd Siberian Gds'], [22,'s_cav','2nd Cavalry Corps'],
    [24,'s_guard','3rd Siberian Gds'], [26,'s_inf','60th Army'],
    [28,'s_tank','3rd Tank Corps'],     [30,'s_guard','4th Siberian Gds'],
  ],
  generals: [
  {side:'G', unit:'2nd Panzer Group', name:'Guderian', atk:1.15,
   bio:'"Schneller Heinz" — the prophet of the panzer arm leads its strongest group toward Smolensk and beyond.'},
  {side:'G', unit:'3rd Panzer Group', name:'Hoth',     atk:1.10,
   bio:'Guderian\'s quieter partner — together their pincers close the great pockets of 1941.'},
  {side:'G', unit:'1st Panzer Group', name:'von Kleist', atk:1.10,
   bio:'Leads the armored fist of Army Group South across the Ukraine toward the Dnieper bend.'},
  {side:'G', unit:'4th Panzer Group', name:'Hoepner',  atk:1.08,
   bio:'Drives through the Baltic states toward Leningrad — and will be cashiered in the winter for retreating.'},
  {side:'G', unit:'11th Army',        name:'von Manstein', atk:1.12,
   bio:'The finest operational mind of the war takes 11th Army south — toward the Crimea and Sevastopol.'},
  {side:'S', unit:'5th Army',         name:'Potapov',  def:1.10,
   bio:'His counterattacks out of the Pripyat marshes haunt the German flank for months.'},
  {side:'S', unit:'16th Army',        name:'Rokossovsky', def:1.12,
   bio:'Released from prison camp to command — ends the war a Marshal taking the surrender of Berlin.'},
  {side:'S', unit:'19th Army',        name:'Konev',    def:1.08,
   bio:'Hard-driving and unsentimental; Zhukov\'s great rival commands the reserve front before Moscow.'},
  {side:'S', unit:'4th Mech Corps',   name:'Vlasov',   atk:1.10,
   bio:'One of the heroes of the border battles — history has a darker road waiting for him.'},
  ],
  capitalDefense: {turn:16, range:5, def:1.25, city:'Moscow',
    announce:'⭐ STAVKA recalls Army General Zhukov to command the Western Front — the defense of Moscow stiffens.'},
  winterQuestion: {turn:9, cost:12},
  events: [
  {turn:1,  date:'22 June 1941',      title:'OPERATION BARBAROSSA',
   text:'At 03:15 the guns open along an 1,800-kilometre front — from the Baltic to the Black Sea, the largest invasion in history. Three army groups, three objectives: Leningrad, Moscow, the Ukraine.'},
  {turn:2,  date:'29 June 1941',      title:'THE FRONTIER BATTLES', pp:{G:2},
   text:'Minsk is encircled within a week — two Soviet armies in the pocket. At Brest the fortress garrison fights on behind the front. The Red Army loses more aircraft in three days than Britain possesses.'},
  {turn:4,  date:'16 July 1941',      title:'SMOLENSK',
   text:'Guderian and Hoth close the Smolensk pocket — the gateway to Moscow. But the pocket does not surrender quietly, and for the first time the timetable begins to slip.'},
  {turn:7,  date:'7 August 1941',     title:'STALIN TAKES COMMAND', pp:{S:2},
   text:'Stalin appoints himself Supreme Commander. Order No. 270 follows: surrender is treason, and the families of officers taken prisoner answer for it. The Red Army will be held together by iron.'},
  {turn:10, date:'28 August 1941',    title:'THE DNIEPER LINE',
   text:'The Wehrmacht stands on the Dnieper from Smolensk to the bend. Hitler\'s eyes turn south: the Kiev pocket is forming, and with it the greatest encirclement of the war.'},
  {turn:13, date:'19 September 1941', title:'KIEV FALLS', pp:{G:2},
   text:'Kiev falls and with it over 600,000 men — the largest encirclement in military history. The road into the Ukraine lies open; but the weeks spent winning it belonged to Moscow.'},
  {turn:15, date:'2 October 1941',    title:'OPERATION TYPHOON',
   text:'"Today begins the last great, decisive battle of this year." Three panzer armies wheel toward Moscow in the Ostheer\'s final bid to end the war before winter.'},
  {turn:17, date:'16 October 1941',   title:'THE MOSCOW PANIC',
   text:'Ministries burn their files; crowds storm the eastbound trains. Then word spreads that Stalin has stayed in the Kremlin — and a quarter of a million Muscovites march out to dig anti-tank ditches.'},
  {turn:20, date:'7 November 1941',   title:'PARADE IN RED SQUARE', pp:{S:2},
   text:'On the anniversary of the Revolution, with the front 70 kilometres away, Stalin holds the parade anyway. The divisions march past Lenin\'s tomb and keep marching — straight to the front.'},
  {turn:22, date:'22 November 1941',  title:'THE SIBERIANS', pp:{S:2},
   text:'Sorge\'s telegram from Tokyo proved true: Japan strikes south, not north. The divisions that watched Manchuria are detraining west of Moscow in white winter camouflage, fresh and full-strength.'},
  {turn:25, date:'7 December 1941',   title:'PEARL HARBOR',
   text:'Japanese carrier aircraft devastate the US Pacific Fleet. Four days later Hitler declares war on the United States. Whatever happens in the snow before Moscow — this is now a world war.'},
  {turn:28, date:'1 January 1942',    title:'THE GENERAL OFFENSIVE', pp:{S:3},
   text:'Stalin orders the counteroffensive widened to the whole front: "The Germans are in disarray from the defeat at Moscow." Nine fronts attack from Leningrad to the Crimea.'},
  {turn:34, date:'15 February 1942',  title:'HOLDING ON', pp:{G:2},
   text:'The Führer\'s stand-fast order — condemned by every general it applied to — has held the front together through the worst of the winter. The line is bent, gapped, but unbroken.'},
  {turn:38, date:'15 March 1942',     title:'THE THAW',
   text:'The rasputitsa returns — this time as an ally of nobody. Both armies, bled white, sink into the mud and wait for the ground to dry. Everyone knows what summer will bring.'},
  ],
  maxTurn: 40,                              // 40 weeks: 22 Jun 1941 → late March 1942
  startDate: Date.UTC(1941,5,22),
  weather(turn){
    if (turn>=38) return 'clear';                       // late March: drying out
    if (turn>=34) return 'mud';                         // spring rasputitsa
    if (turn>=33) return 'freeze';
    if (turn>=22) return 'snow';                        // deep winter
    if (turn>=20) return 'freeze';
    if (turn>=16) return 'mud';                         // autumn rasputitsa
    return 'clear';
  },
  pp(side, turn){
    if (side==='G') return turn<=13 ? 9 : 6;            // the summer hammer, then overstretch
    return turn<=6 ? 5 : turn<=14 ? 7 : 11;             // Soviet mobilization ramps up
  },
  /* Tuned to correct-supply reality: with the logistics modelled honestly, the
     Wehrmacht takes the western objectives and culminates short of the deep
     ones — exactly as it did. Holding the gains IS the historical stalemate;
     reaching Moscow/Leningrad/Stalingrad is doing better than history. */
  victoryTiers: [
    [18,'DECISIVE AXIS VICTORY','The Soviet state collapses west of the Volga. History takes its darkest road.'],
    [12,'AXIS OPERATIONAL VICTORY','The Wehrmacht winters far deeper than history — a deep objective has fallen and the line bulges east when the ground dries.'],
    [5, 'STALEMATE — HISTORY REPEATS','Vast conquests, but the great objectives held. The front freezes where the real one did — and the long war begins.'],
    [0, 'SOVIET VICTORY','The invasion is broken short of its gains. The Red Army counterattacks across the whole front, a year ahead of schedule.'],
  ],
  sudden: {
    axisCities: ['Moscow','Leningrad'], minAxisUnits: 6,
    axisTitle: 'DECISIVE AXIS VICTORY',
    axisText:  'Moscow and Leningrad have both fallen — Soviet command collapses. The war in the East is decided.',
    sovTitle:  'DECISIVE SOVIET VICTORY',
    sovText:   'The invading army has been annihilated in the field. The Red Army marches west — years ahead of schedule.',
  },
  airInit: [
    ['G','Luftflotte 1', 8],
    ['G','Luftflotte 2', 10],
    ['G','Luftflotte 4', 9],
    ['S','VVS Northwest Front', 4],
    ['S','VVS Western Front',   5],
    ['S','VVS Southwest Front', 5],
  ],
  sovAirSchedule: [
    [5,  'VVS Reserve Group', 6],
    [12, '1st Air Army', 7],
    [20, 'Winter Air Command', 9],
    [30, '2nd Air Army', 8],
  ],
  setup(st){
    // border armies start partly dug in along the frontier line
    for (const u of st.units) if (u.side==='S' && u.x<=13) u.entrench = 1;
    // city garrisons start lightly fortified — the blitz fights through them
    for (const u of st.units)
      if (u.side==='S' && st.cities.some(c=>c.x===u.x && c.y===u.y && c.vp>0)) u.entrench = 1;
    const lm = st.units.find(u=>u.name==='Leningrad Militia');
    if (lm) lm.entrench = 2;
  },
  opening(playerSide){ return [
    '22 June 1941 — Operation Barbarossa begins on a front two thousand kilometres wide. ' +
    (playerSide==='G'
      ? 'Three army groups, one campaigning season. The objectives: Leningrad, Moscow, the Ukraine — before the snow.'
      : 'The border armies are caught mid-deployment. Trade space for time, hold the river lines, and survive until winter.'),
  ]; },
};

/* ---------- Realistic scenario 2: BATTLE OF FRANCE, May–June 1940 ----------
   Fall Gelb on the same operational engine, with true geography: Germany attacks
   WEST out of the Rhineland (the right/east edge). The Maginot Line walls off the
   direct route, so the Schwerpunkt swings through the Ardennes while Army Group B
   drives into the Low Countries — and the panzers race for the Channel to trap the
   Allied armies in Belgium. "reversed:true" flips the engine's home edges and AI
   bias so the attacker is based in the east. The map is built procedurally so
   every row is exactly cols wide. */
SCENARIOS.france = (function buildFrance(){
  const C = 46, R = 28;
  const box = (x,y,a,b,c,d)=> x>=a && x<=c && y>=b && y<=d;
  const map = [];
  for (let y=0; y<R; y++){
    let row = '';
    for (let x=0; x<C; x++){
      let t = '.';
      const britain = box(x,y,2,0,10,3);                          // England — an island in the NW
      if (!britain){
        const coast = x<12 ? 5 : x<28 ? 4 : x<40 ? 2 : 3;         // the Channel / North Sea coast
        if (y < coast) t = '~';
      }
      if (t==='.'){
        if (x===41 && y>=4 && y<=22) t='r';                                  // the Rhine
        else if (Math.abs(x-(38-(y-10)*1.1))<0.5 && y>=10 && y<=16) t='r';   // the Meuse (Sedan)
        else if (Math.abs(x-(18-(14-y)*0.45))<0.6 && y>=5 && y<=14) t='r';   // the Seine
        if (t==='.' && box(x,y,32,9,39,13) && (x*3+y*5)%5!==0) t='f';        // the Ardennes
        else if (t==='.' && box(x,y,30,6,34,8) && (x+y)%4===0) t='f';        // Belgian woods
        if (t==='.' && box(x,y,33,2,41,5) && (x*y)%3===0) t='s';             // Dutch polders
        if (t==='.' && box(x,y,37,13,41,22)) t='h';                          // the Maginot Line
        if (t==='.' && y>=22 && x>=22) t='h';                                // the Jura / Alps (south)
        if (t==='.' && box(x,y,30,18,40,23) && (x*y)%4===0) t='h';           // foothills
      }
      row += t;
    }
    map.push(row);
  }
  return {
  id: 'france', realistic: true, reversed: true,
  title: 'BATTLE OF FRANCE', short: 'FRANCE 1940',
  sub: 'THE WESTERN FRONT · MAY — JUNE 1940 · REALISTIC MODE',
  sides: {
    G: {name:'German', flag:'⬛', color:'#454d58', tint:'rgba(108,118,132,0.30)'},
    S: {name:'Allied', flag:'🟦', color:'#3a4f7a', tint:'rgba(70,100,170,0.24)'},
  },
  fuel: true, harshOOS: true, supplyRange: 11,
  menu: {
    ger: {h:'⬛ Germany (Wehrmacht)', p:'Swing the Schwerpunkt through the Ardennes while Army Group B fixes the Allies in Belgium — cross the Meuse, race the panzers west to the Channel, and trap the northern armies before Dunkirk.'},
    sov: {h:'🟦 Allies (France & BEF)', p:'You are strong but deployed forward. Hold the Meuse at Sedan, pull the armies in Belgium back before they are cut off, and keep the road to Paris closed.'},
  },
  kinds: {
    g_inf:  {side:'G', label:'Infanterie-Korps', atk:5, def:5, mp:2, maxStr:10, cost:10, sym:'inf'},
    g_mot:  {side:'G', label:'Motorisiert',      atk:6, def:5, mp:3, maxStr:9,  cost:14, sym:'mot', fast:true, fuel:true, color:'#46504a'},
    g_pz:   {side:'G', label:'Panzer-Division',  atk:8, def:5, mp:4, maxStr:10, cost:18, sym:'arm', fuel:true},
    g_ss:   {side:'G', label:'SS-Division',      atk:8, def:6, mp:4, maxStr:10, cost:22, sym:'arm', fuel:true, color:'#23262b'},
    s_inf:  {side:'S', label:'French Army',      atk:4, def:6, mp:2, maxStr:9,  cost:9,  sym:'inf'},
    s_tank: {side:'S', label:'DCR (Armor)',      atk:6, def:5, mp:4, maxStr:8,  cost:13, sym:'arm', fuel:true},
    s_guard:{side:'S', label:'BEF Corps',        atk:5, def:6, mp:3, maxStr:9,  cost:12, sym:'inf', color:'#3f5d40'},
    s_mil:  {side:'S', label:'Reserve Division', atk:2, def:4, mp:2, maxStr:6,  cost:4,  sym:'inf', color:'#5a5244'},
    g_hq:   {side:'G', label:'Army Group HQ',    atk:1, def:4, mp:3, maxStr:6,  cost:0, sym:'hq', hq:true, noBuy:true, noCapture:true, color:'#2f3742'},
    s_hq:   {side:'S', label:'GQG',              atk:1, def:4, mp:3, maxStr:6,  cost:0, sym:'hq', hq:true, noBuy:true, noCapture:true, color:'#28406e'},
  },
  deployNames: {g_inf:'Ersatz-Korps', g_mot:'Mot. Reserve', g_pz:'Panzer Reserve',
    s_inf:'Réserve Générale', s_tank:'DCR Reserve', s_mil:'Dépôt Division'},
  cols: C, rows: R, map,
  cities: [
    {x:6,  y:2,  name:'London',      vp:0, owner:'S'},
    {x:10, y:3,  name:'Dover',       vp:0, owner:'S'},
    {x:43, y:7,  name:'Köln',        vp:0, owner:'G'},
    {x:40, y:8,  name:'Aachen',      vp:0, owner:'G'},
    {x:42, y:17, name:'Saarbrücken', vp:0, owner:'G'},
    {x:37, y:3,  name:'Amsterdam',   vp:1, owner:'S'},
    {x:35, y:4,  name:'Rotterdam',   vp:1, owner:'S'},
    {x:33, y:4,  name:'Antwerp',     vp:1, owner:'S'},
    {x:31, y:6,  name:'Brussels',    vp:2, owner:'S'},
    {x:35, y:8,  name:'Liège',       vp:1, owner:'S'},
    {x:38, y:11, name:'Luxemburg',   vp:0, owner:'S'},
    {x:27, y:4,  name:'Dunkirk',     vp:2, owner:'S'},
    {x:24, y:4,  name:'Calais',      vp:1, owner:'S'},
    {x:14, y:5,  name:'Le Havre',    vp:1, owner:'S'},
    {x:28, y:6,  name:'Lille',       vp:1, owner:'S'},
    {x:22, y:7,  name:'Amiens',      vp:1, owner:'S'},
    {x:18, y:7,  name:'Rouen',       vp:0, owner:'S'},
    {x:33, y:11, name:'Sedan',       vp:1, owner:'S'},
    {x:26, y:11, name:'Reims',       vp:1, owner:'S'},
    {x:34, y:13, name:'Verdun',      vp:1, owner:'S'},
    {x:38, y:14, name:'Metz',        vp:1, owner:'S'},
    {x:39, y:16, name:'Nancy',       vp:0, owner:'S'},
    {x:41, y:18, name:'Strasbourg',  vp:1, owner:'S'},
    {x:19, y:14, name:'Paris',       vp:5, owner:'S'},
    {x:16, y:17, name:'Orléans',     vp:1, owner:'S'},
    {x:28, y:18, name:'Dijon',       vp:1, owner:'S'},
    {x:23, y:21, name:'Lyon',        vp:2, owner:'S'},
    {x:12, y:18, name:'Tours',       vp:0, owner:'S'},
    {x:9,  y:15, name:'Le Mans',     vp:0, owner:'S'},
    {x:5,  y:13, name:'Rennes',      vp:1, owner:'S'},
    {x:1,  y:10, name:'Brest',       vp:1, owner:'S'},
    {x:6,  y:19, name:'Nantes',      vp:1, owner:'S'},
    {x:4,  y:24, name:'Bordeaux',    vp:2, owner:'S'},
  ],
  gerSpawns: [[45,5],[45,9],[45,12],[45,16],[44,7]],
  sovSpawns: [[0,10],[0,14],[0,18],[1,8],[2,22]],
  /* 10 May 1940 — Army Group A massed in the Eifel opposite the Ardennes, Army
     Group B driving into the Low Countries, and the Allies wheeling forward into
     Belgium exactly as the German plan requires. */
  startUnits: [
    // Army Group B — fixes the Allies in the north
    ['g_inf','18. Armee',       39, 4],
    ['g_pz', '9. Panzer',       40, 5],
    ['g_inf','6. Armee',        40, 7],
    ['g_hq', 'HG B',            44, 4],
    // Army Group A — the Schwerpunkt opposite the Ardennes
    ['g_inf','4. Armee',        40, 9],
    ['g_pz', 'Pz.Gr. Kleist',   40, 10],
    ['g_pz', 'Pz.Gr. Guderian', 40, 11],
    ['g_pz', '7. Panzer',       40, 12],
    ['g_inf','12. Armee',       43, 10],
    ['g_inf','16. Armee',       43, 12],
    ['g_hq', 'HG A',            44, 11],
    // Army Group C — holds opposite the Maginot
    ['g_inf','1. Armee',        43, 15],
    ['g_inf','7. Armee',        43, 18],
    ['g_hq', 'HG C',            45, 17],
    // ---- Allies (S) ----
    // forward into the Low Countries — the Dyle–Breda gamble
    ['s_inf', '7e Armée',      33, 4, 8],
    ['s_inf', 'Dutch Army',    36, 3, 6],
    ['s_inf', 'Belgian Army',  32, 6, 7],
    ['s_guard','BEF',          30, 6, 9],
    ['s_inf', '1re Armée',     29, 7, 8],
    // the Meuse hinge at Sedan — the historical weak point
    ['s_inf', '9e Armée',      33, 11, 6],
    ['s_inf', '2e Armée',      35, 13, 7],
    // the Maginot armies — strong and static in the south
    ['s_inf', '3e Armée',      37, 15, 8],
    ['s_inf', '4e Armée',      38, 18, 8],
    ['s_inf', '5e Armée',      39, 20, 8],
    // the operational reserves (the depth France historically lacked)
    ['s_tank','1re DCR',       28, 9, 7],
    ['s_tank','4e DCR',        26, 12, 7],
    ['s_inf', '6e Armée',      24, 13, 7],
    ['s_inf', '10e Armée',     22, 15, 7],
    ['s_mil', 'Paris Garrison',19, 14, 6],
    ['s_hq',  'GQG',           16, 15],
  ],
  generals: [
    {side:'G', unit:'Pz.Gr. Guderian', name:'Guderian', atk:1.18,
     bio:'The panzer prophet leads the Sedan breakthrough — and races west for the Channel against his own high command\'s nerves.'},
    {side:'G', unit:'7. Panzer', name:'Rommel', atk:1.15,
     bio:'The "Ghost Division" — Rommel drives so fast and so far that his own headquarters loses track of where he is.'},
    {side:'G', unit:'Pz.Gr. Kleist', name:'von Kleist', atk:1.10,
     bio:'Commands the massed armor of Army Group A through the Ardennes — the largest concentration of tanks yet seen.'},
    {side:'S', unit:'4e DCR', name:'de Gaulle', atk:1.18,
     bio:'His lone armored counterattack at Montcornet bloodies the German flank — a glimpse of a war France could have fought.'},
    {side:'S', unit:'2e Armée', name:'Huntziger', def:1.06,
     bio:'Holds the hinge at Sedan where the whole campaign will be decided — with too few men and too little armor.'},
  ],
  sovSchedule: [
    [2, 's_inf','Armée des Alpes'], [3, 's_mil','Réserve de Paris'],
    [4, 's_tank','2e DCR'],         [5, 's_inf','Groupe Weygand'],
  ],
  events: [
    {turn:1, date:'10 May 1940',  title:'FALL GELB',
     text:'At dawn the Wehrmacht strikes west. Gliders land atop Eben-Emael; paratroops drop on the Dutch bridges; and the Allies wheel forward into Belgium — straight into the plan. Behind the Ardennes, seven panzer divisions begin to move.'},
    {turn:2, date:'13 May 1940',  title:'CROSSING THE MEUSE', pp:{G:2},
     text:'Guderian\'s panzers reach the Meuse at Sedan after an unbelievable march through "impassable" forest. Under a sky black with Stukas, the infantry paddles across. By nightfall the hinge of the Allied line is cracked.'},
    {turn:3, date:'18 May 1940',  title:'THE SICKLE CUT',
     text:'The panzers turn west and run — not south to Paris, but toward the sea, to trap the armies in the north. Forty miles a day through open country, their flanks naked. Nobody on either side has ever seen anything like it.'},
    {turn:4, date:'24 May 1940',  title:'THE HALT ORDER',
     text:'The spearheads reach the Channel; the BEF and the French First Army are cut off. Then comes the order to halt before Dunkirk — and across the water, a thousand little ships begin to sail.'},
    {turn:5, date:'5 June 1940',  title:'FALL ROT', pp:{G:2},
     text:'With the north destroyed, the Germans wheel south against what France has left. The line along the Somme and Aisne is thin, brave, and doomed. Paris is declared an open city.'},
    {turn:6, date:'14 June 1940', title:'PARIS',
     text:'German troops march down the Champs-Élysées. The government has fled to Bordeaux; Reynaud falls, Pétain rises, and a little-known general broadcasts defiance from London.'},
  ],
  maxTurn: 7,
  startDate: Date.UTC(1940,4,10),
  weather(turn){ return turn>=7 ? 'mud' : 'clear'; },
  pp(side, turn){ return side==='G' ? 9 : (turn<=2 ? 6 : 5); },
  victoryTiers: [
    [22,'DECISIVE GERMAN VICTORY','France is overrun in six weeks and the BEF destroyed on the beaches. The myth of the Wehrmacht is born — and the war turns west.'],
    [15,'GERMAN VICTORY','Paris falls and the armies of the north are trapped. France signs the armistice in the railway car at Compiègne, as history demanded.'],
    [8, 'A HARDER FALL','France is beaten but bleeds the Wehrmacht far more than history — the panzers are battered, the timetable wrecked, and much of the BEF gets away.'],
    [0, 'MIRACLE ON THE MEUSE','The sickle cut is blunted. The front holds on the Meuse, the war in the west settles into a siege — and everything that follows is different.'],
  ],
  sudden: {
    axisCities: ['Paris','Lyon'], minAxisUnits: 4,
    axisTitle: 'DECISIVE GERMAN VICTORY',
    axisText:  'Paris and Lyon are taken — the French state collapses and sues for terms. The campaign is decided.',
    sovTitle:  'MIRACLE ON THE MEUSE',
    sovText:   'The German offensive is broken in the field. The panzers that were to win the war in the west lie wrecked along the Meuse.',
  },
  airInit: [
    ['G','Luftflotte 2', 9],
    ['G','Luftflotte 3', 8],
    ['S','Armée de l\'Air', 4],
    ['S','RAF Component',   4],
  ],
  sovAirSchedule: [ [3,'RAF Reinforcements', 5] ],
  setup(st){
    for (const u of st.units){
      if (u.side==='S' && u.x>=37 && u.y>=13) u.entrench = 2;          // Maginot — heavily fortified
      if (u.side==='S' && st.cities.some(c=>c.x===u.x && c.y===u.y && c.vp>0)) u.entrench = Math.max(u.entrench||0,1);
    }
    const hinge = st.units.find(u=>u.name==='9e Armée'); if (hinge) hinge.entrench = 0;  // the unready hinge
  },
  opening(playerSide){ return [
    '10 May 1940 — Fall Gelb. The panzers move into the Ardennes while the world watches Belgium.',
    playerSide==='G'
      ? 'Break the Meuse at Sedan, race west to the Channel, and trap the north before it reaches Dunkirk.'
      : 'Hold the Meuse, pull the Belgian armies back before they are encircled, and keep Paris.',
  ]; },
  };
})();


/* ---- GRAND EASTERN FRONT: the Realistic eastern front, programmatically scaled
   up 2× into a larger operational map and a longer 1941–43 campaign. Same engine,
   rules, rendering, units, generals and events — just more room to
   manoeuvre. mp and supply reach scale with the finer hexes to keep the tempo;
   fuel/railhead are left off here (their constants are map-scale and would need
   separate tuning). This is the "make a larger eastern front" experiment. */
SCENARIOS.wawtest = (function buildBig(){
  const B = SCENARIOS.realistic, N = 2;          // 2× the eastern front (4× the area)
  const C = B.cols*N, R = B.rows*N;
  const jh = (x,y)=>{ let h=(x*374761393 ^ y*668265263)>>>0; h=Math.imul(h^(h>>>13),1274126177); return (h^(h>>>16))>>>0; };
  const at = (ox,oy)=>{ const row=B.map[Math.max(0,Math.min(B.rows-1,oy))]; return row[Math.max(0,Math.min(B.cols-1,ox))]||'.'; };
  const map = [];
  for (let ty=0; ty<R; ty++){
    const oy = Math.floor(ty/N), sy = ty%N; let line='';
    for (let tx=0; tx<C; tx++){
      const ox = Math.floor(tx/N), sx = tx%N, h = jh(tx,ty);
      let gx=ox, gy=oy;                                  // centre cell = pure source
      if (sx!==1 && (h&3)===0)      gx = ox + (sx===0?-1:1);   // jitter edges so
      if (sy!==1 && ((h>>2)&3)===0) gy = oy + (sy===0?-1:1);   // regions look organic
      line += at(gx,gy);
    }
    map.push(line.length>=C ? line.slice(0,C) : line.padEnd(C,'.'));
  }
  // ── organic terrain passes ────────────────────────────────────────
  // These make the doubled map look like a real front instead of a scaled checkerboard.
  const _vh=(x,y,s=0)=>{let h=(x*374761393^y*668265263^s*1234567)>>>0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/0x100000000;};
  const _sn=(x,y,s=0)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;const a=_vh(ix,iy,s),b=_vh(ix+1,iy,s),c=_vh(ix,iy+1,s),d=_vh(ix+1,iy+1,s);return a*(1-fx)*(1-fy)+b*fx*(1-fy)+c*(1-fx)*fy+d*fx*fy;};
  const _fn2=(x,y,s=0)=>_sn(x/7,y/7,s)*0.60+_sn(x/3.5,y/3.5,s+77)*0.40;
  // Convert to mutable char arrays
  const _ma=map.map(r=>r.split(''));
  // Forest coherence: blob-fill enclosed plains; trim isolated forest fingers
  for (let _p=0;_p<2;_p++){
    for (let _y=1;_y<R-1;_y++) for (let _x=1;_x<C-1;_x++){
      const _t=_ma[_y][_x];
      const _fN=[_ma[_y-1][_x],_ma[_y+1][_x],_ma[_y][_x-1],_ma[_y][_x+1]].filter(c=>c==='f'||c==='s').length;
      const _pN=[_ma[_y-1][_x],_ma[_y+1][_x],_ma[_y][_x-1],_ma[_y][_x+1]].filter(c=>c==='.'||c==='h').length;
      if (_t==='.'&&_fN>=3) _ma[_y][_x]='f';
      if (_t==='.'&&_fN>=2&&_fn2(_x,_y,1)>0.56) _ma[_y][_x]='f';
      if (_t==='f'&&_pN>=4) _ma[_y][_x]='.';
      if (_t==='f'&&_pN>=3&&_fn2(_x,_y,2)<0.28) _ma[_y][_x]='.';
    }
  }
  // Clear blocky doubled river bands, then trace organic meandering rivers
  for (let _y=0;_y<R;_y++) for (let _x=0;_x<C;_x++){
    if (_ma[_y][_x]==='r'){ const _oy=Math.floor(_y/N),_ox=Math.floor(_x/N); if (at(_ox,_oy)==='r') _ma[_y][_x]='.'; }
  }
  const _trRiv=(pts,amp=2.2,per=0.18,sd=1)=>{
    for (let _i=0;_i<pts.length-1;_i++){
      const [_x0,_y0]=pts[_i],[_x1,_y1]=pts[_i+1];
      const _steps=Math.max(Math.abs(_x1-_x0),Math.abs(_y1-_y0))*4;
      for (let _s=0;_s<=_steps;_s++){
        const _t=_s/_steps,_ph=_i*1.57+sd;
        const _mx=Math.sin(_t*Math.PI*2*((_y1-_y0)/20)*per+_ph)*amp+Math.sin(_t*Math.PI*3.7+_ph*1.3)*amp*0.3;
        const _x=Math.round(_x0+(_x1-_x0)*_t+_mx),_y=Math.round(_y0+(_y1-_y0)*_t);
        if (_y>=0&&_y<R&&_x>=0&&_x<C&&_ma[_y][_x]!=='~'&&_ma[_y][_x]!=='s') _ma[_y][_x]='r';
      }
    }
  };
  _trRiv([[24,10],[22,14],[20,18],[18,22],[16,28],[14,32]],2.0,0.20,2);   // Western Dvina
  _trRiv([[30,16],[28,20],[26,26],[28,32],[32,38],[34,44],[32,52],[30,56]],2.5,0.18,5); // Dnieper
  _trRiv([[8,44],[10,50],[12,54],[14,58]],1.8,0.25,9);                    // Dnestr
  _trRiv([[82,28],[84,34],[84,40],[82,46],[80,52],[80,58]],2.0,0.22,13);  // Don
  _trRiv([[104,20],[106,26],[108,32],[108,38],[106,44],[106,50],[108,56]],1.5,0.15,17); // Volga
  // Rebuild map strings (must stay exactly C chars)
  for (let _y=0;_y<R;_y++) map[_y]=_ma[_y].join('').slice(0,C).padEnd(C,'.');
  const P = x => x*N+1;                                  // features at block centre
  const sxy = a => a.map(([x,y])=>[P(x),P(y)]);
  // movement scales ×2 (not ×3): a more deliberate WitE-style tempo, and far
  // cheaper pathfinding floods — which keeps the AI quick with a full front.
  const MS = 2, kinds = {};
  for (const k in B.kinds){ kinds[k] = {...B.kinds[k], mp: Math.max(2, B.kinds[k].mp*MS)}; }

  // ---- fill the front into a continuous War-in-the-East line ----
  // Start from the upscaled historical armies, then thread a dense front between
  // them with operational depth behind — Soviets numerous and thin, Germans
  // fewer but with concentrated panzer reserves, exactly the WitE2 texture.
  const units = B.startUnits.map(u=>{ const v=u.slice(); v[2]=P(u[2]); v[3]=P(u[3]); return v; });
  const occ = new Set(units.map(u=>u[2]+','+u[3]));
  const land = (x,y)=>{ if (x<1||y<1||x>=C-1||y>=R-1) return false; const row=map[y]; const t=row&&row[x]; return !!t && t!=='~' && t!=='o'; };
  const place = (kind,name,x,y,str)=>{
    for (const [dx,dy] of [[0,0],[0,-1],[0,1],[-1,0],[1,0],[0,-2],[0,2],[-2,0]]){
      const X=x+dx, Y=y+dy;
      if (land(X,Y) && !occ.has(X+','+Y)){ const u=[kind,name,X,Y]; if(str!=null)u.push(str); units.push(u); occ.add(X+','+Y); return true; }
    }
    return false;
  };
  const gName = (k,n)=> ({g_inf:'Korps ',g_mot:'mot.Korps ',g_pz:'Pz.Korps ',g_ss:'SS-Korps ',res:'Res.Korps '}[k]||'Korps ')+'z'+n;
  const sName = (k,n)=> ({s_inf:'Rifle Corps ',s_tank:'Tank Corps ',res:'Reserve Rifle '}[k]||'Rifle Corps ')+n;
  // Axis satellite armies on the southern flank — weaker, historically fragile, set up Uranus
  for (const [x,y,str,name] of [
    [P(6),P(29),7,'4th Romanian Army'], // southern Romania / Crimea axis
    [P(6),P(23),7,'Hungarian 2nd Army'],// Army Group South centre
    [P(7),P(25),7,'8th Italian Army'],  // Don bend — collapses at Uranus
    [P(6),P(21),6,'Slovak Fast Div'],   // light northern satellite
  ]) place('g_ally', name, x, y, str);
  // per-row contact line, derived from the existing armies (smoothed to nearest row)
  const gF=new Array(R).fill(null), sF=new Array(R).fill(null);
  for (const u of units){ const side=kinds[u[0]].side, x=u[2], y=u[3];
    if (side==='G'){ if(gF[y]==null||x>gF[y]) gF[y]=x; } else { if(sF[y]==null||x<sF[y]) sF[y]=x; } }
  const near=(arr,y)=>{ for(let d=0;d<R;d++){ if(y-d>=0&&arr[y-d]!=null) return arr[y-d]; if(y+d<R&&arr[y+d]!=null) return arr[y+d]; } return null; };
  let gi=0, si=0, hg=0, hs=0;
  for (let y=3; y<R-3; y++){
    const g=near(gF,y), s=near(sF,y); if (g==null||s==null) continue;
    const k = Math.round((g+s)/2);                            // contact column
    if (y%3===0) place((y%12===0)?'g_pz':(y%6===0)?'g_mot':'g_inf', gName('g_inf',++gi), k-1, y, 9);  // German line
    if (y%2===0) place((y%10===0)?'s_tank':'s_inf', sName('s_inf',++si), k+1, y, 7);                    // Soviet line — a continuous wall
    if (y%8===0) place((y%16===0)?'g_ss':'g_pz', gName('res',++gi), k-5, y, 9);                         // German mobile reserve
    if (y%6===0) place((y%12===0)?'s_tank':'s_inf', sName('res',++si), k+5, y, 7);                      // Soviet operational reserve
    if (y%14===0){ place('g_inf', gName('res',++gi), k-9, y, 8); place('s_inf', sName('res',++si), k+9, y, 6); } // deep reserves
    if (y%20===10){ place('g_hq','Korps-HQ '+(++hg), k-6, y); place('s_hq','Front-HQ '+(++hs), k+7, y); }          // HQs
  }

  // ---- a long, escalating campaign deep into 1942–43 ----
  // Past the historical 40 weeks the front doesn't just stop: both sides keep
  // raising armies (the Soviets faster), the seasons keep turning, and the war
  // grinds on toward Berlin or the Volga. This is the "it ends too fast" fix.
  const MAXT = 90, START = Date.UTC(1941,5,22);
  const longSched = B.sovSchedule.slice();
  const pickS = t => (t%8===0)?'s_tank':(t%14===0)?'s_guard':'s_inf';
  const pickG = t => (t%9===0)?'g_pz':(t%15===0)?'g_mot':'g_inf';
  for (let t=42; t<=MAXT; t++){
    if (t%2===0) longSched.push([t, pickS(t), 'Reserve Army '+t]);     // Soviets reinforce hard
    if (t%3===0) longSched.push([t, pickG(t), 'Verstärkung '+t]);      // Germans more slowly
  }
  // Uranus buildup and pincers — these arrive regardless of schedule parity
  for (const [t,k,n] of [[8,'g_ally','2nd Hungarian Army'],[14,'g_ally','Romanian Reserve Corps'],
    [20,'s_tank','Southwest Front Tanks'],[21,'s_tank','Uranus Shock Army (N)'],
    [21,'s_tank','Uranus Shock Army (S)'],[22,'s_inf','Don Front Reserve']])
    longSched.push([t,k,n]);
  const longWeather = turn => {
    const m = new Date(START + (turn-1)*7*864e5).getUTCMonth();
    if (m===11||m===0||m===1) return 'snow';                           // Dec–Feb deep winter
    if (m===2) return 'freeze';                                        // March hard frost
    if (m===3||m===9||m===10) return 'mud';                            // spring & autumn rasputitsa
    return 'clear';                                                    // summer campaigning season
  };
  const longPP = (side, turn) => side==='G'
    ? (turn<=13 ? 9 : turn<=40 ? 6 : 7)
    : (turn<=6 ? 5 : turn<=14 ? 7 : turn<=40 ? 11 : 12);               // Soviet output keeps climbing
  const extraEvents = [
    {turn:46, date:'May 1942',     title:'THE SPRING LULL', text:'The rasputitsa drains away. Both armies, bled white through the winter, rebuild for the summer. The front held — now the question is who strikes first.'},
    {turn:64, date:'September 1942',title:'A SECOND WINTER NEARS', pp:{S:2}, text:'A second year of war in the East. The Soviet reserves run deeper now, the German spearheads blunter. The cold is coming again — and this time the Red Army is ready for it.'},
    {turn:80, date:'January 1943',  title:'THE TIDE', pp:{S:3}, text:'Eighteen months of grinding war. Where the line stands now decides whether this is the road to Berlin — or the high-water mark of the Reich.'},
    // Stalingrad arc
    {turn:16, date:'September 1942', title:'DRIVE ON STALINGRAD',
     text:'Army Group B drives south-east through the steppe toward the Volga. The flanks — held by Romanian and Italian armies — stretch dangerously thin as the Sixth Army approaches the city.'},
    {turn:21, date:'19 November 1942', title:'OPERATION URANUS', pp:{S:3},
     text:'Two Soviet armoured thrusts burst through the satellite armies north and south of Stalingrad. The Romanian and Italian flanks collapse within hours. The Sixth Army is surrounded — a quarter-million men.'},
    {turn:23, date:'December 1942', title:'WINTER STORM',
     text:'Manstein\'s relief force drives to within 48 km of the pocket — but Hitler refuses to allow a breakout. The last chance to save the Sixth Army dies in the snow.'},
  ];

  return { ...B,
    id:'wawtest', realistic:true,
    title:'GRAND EASTERN FRONT', short:'GRAND EASTERN FRONT',
    sub:'BARBAROSSA TO 1943 · 2× OPERATIONAL SCALE · A LONG, HARD WAR',
    cols:C, rows:R, map, kinds,
    maxTurn: MAXT, weather: longWeather, pp: longPP,
    sovSchedule: longSched, events: [...B.events, ...extraEvents],
    cities: B.cities.map(c=>({...c, x:P(c.x), y:P(c.y)})),
    startUnits: units,
    sovSpawns: sxy(B.sovSpawns), gerSpawns: sxy(B.gerSpawns),
    supplyRange: (B.supplyRange||12)*N,
    fuel:false, railhead:undefined,
    capitalDefense: {...B.capitalDefense, range:(B.capitalDefense.range||5)*N},
    setup(st){
      for (const u of st.units) if (u.side==='S' && u.x <= 13*N+1) u.entrench = 1;
      for (const u of st.units)
        if (u.side==='S' && st.cities.some(c=>c.x===u.x && c.y===u.y && c.vp>0)) u.entrench = 1;
      const lm = st.units.find(u=>u.name==='Leningrad Militia'); if (lm) lm.entrench = 2;
    },
  };
})();

/* ---- side identities & unit types: scenarios may override ---- */
const DEFAULT_SIDES = {
  G: {name:'Axis',   flag:'⬛', color:'#454d58', tint:'rgba(108,118,132,0.30)'},
  S: {name:'Soviet', flag:'🟥', color:'#9c2e22', tint:'rgba(186,52,40,0.24)'},
};
const DEFAULT_KINDS = {
  g_inf:  {side:'G', label:'Infantry Army',  atk:5, def:5, mp:3, maxStr:10, cost:10, sym:'inf'},
  g_pz:   {side:'G', label:'Panzer Group',   atk:8, def:5, mp:6, maxStr:10, cost:18, sym:'arm'},
  g_ally: {side:'G', label:'Allied Army',    atk:3, def:3, mp:3, maxStr:8,  cost:8,  sym:'inf', color:'#5c5536'},
  s_inf:  {side:'S', label:'Rifle Army',     atk:3, def:5, mp:3, maxStr:8,  cost:8,  sym:'inf'},
  s_tank: {side:'S', label:'Tank Corps',     atk:5, def:4, mp:5, maxStr:8,  cost:12, sym:'arm'},
  s_guard:{side:'S', label:'Guards Army',    atk:6, def:6, mp:4, maxStr:10, cost:14, sym:'inf', winter:true, color:'#b04a18'},
  s_mil:  {side:'S', label:'Militia',        atk:2, def:3, mp:2, maxStr:6,  cost:4,  sym:'inf', color:'#7a4a3a'},
  g_hq:   {side:'G', label:'Army Group HQ',  atk:1, def:4, mp:4, maxStr:6,  cost:0,  sym:'hq', hq:true, noBuy:true, noCapture:true, color:'#2f3742'},
  s_hq:   {side:'S', label:'Front HQ',       atk:1, def:4, mp:4, maxStr:6,  cost:0,  sym:'hq', hq:true, noBuy:true, noCapture:true, color:'#6e2620'},
};

/* ---- current scenario: mutable mirrors the engine reads ---- */
let SCN = null;
let COLS, ROWS, MAP_ROWS, CITIES_INIT, TOTAL_VP, SOV_SPAWNS, GER_SPAWNS,
    START_UNITS, SOV_SCHEDULE, GENERALS, GEN_BY_UNIT, EVENTS,
    AIR_INIT, SOV_AIR_SCHEDULE, MAX_TURN, START_DATE, VICTORY_TIERS,
    KINDS, SIDES;
function loadScenario(id){
  SCN = SCENARIOS[id] || SCENARIOS.barbarossa;
  COLS = SCN.cols; ROWS = SCN.rows; MAP_ROWS = SCN.map;
  CITIES_INIT = SCN.cities; TOTAL_VP = SCN.cities.reduce((a,c)=>a+c.vp,0);
  SOV_SPAWNS = SCN.sovSpawns; GER_SPAWNS = SCN.gerSpawns;
  START_UNITS = SCN.startUnits; SOV_SCHEDULE = SCN.sovSchedule;
  GENERALS = SCN.generals; GEN_BY_UNIT = new Map(GENERALS.map(g => [g.side+'|'+g.unit, g]));
  EVENTS = SCN.events;
  AIR_INIT = SCN.airInit; SOV_AIR_SCHEDULE = SCN.sovAirSchedule;
  MAX_TURN = SCN.maxTurn; START_DATE = SCN.startDate;
  VICTORY_TIERS = SCN.victoryTiers;
  KINDS = SCN.kinds || DEFAULT_KINDS;
  SIDES = SCN.sides || DEFAULT_SIDES;
  return SCN;
}
loadScenario('barbarossa');

/* ---- scenario-driven helpers ---- */
function weatherFor(turn){ return SCN.weather(turn); }
function ppFor(side, turn){ return SCN.pp(side, turn); }
function generalOf(u){ return GEN_BY_UNIT.get(u.side+'|'+u.name) || null; }
function genBonusText(g){
  const b = [];
  if (g.atk) b.push('+'+Math.round((g.atk-1)*100)+'% attack');
  if (g.def) b.push('+'+Math.round((g.def-1)*100)+'% defense');
  if (g.mp)  b.push('+'+g.mp+' movement');
  return b.join(' · ');
}
function zhukovDefends(def){
  const cd = SCN.capitalDefense;
  if (!cd || def.side !== 'S' || G.turn < cd.turn) return false;
  const cap = G.cities.find(c => c.name === cd.city);
  return !!cap && cap.owner === 'S' && hexDist(def.x, def.y, cap.x, cap.y) <= cd.range;
}
function hasWinterGear(){ return G.winterGear === true; }
function decideWinterGear(buy){
  if (!G || G.winterGear !== 'pending') return false;
  if (buy){
    // the order can be placed on credit: production goes negative and
    // future income pays it off (nothing else can be bought meanwhile)
    G.pp.G -= SCN.winterQuestion.cost;
    G.winterGear = true;
    logMsg('l-g', '⬛ Supply trains divert east — greatcoats, felt boots and stoves for three million men.' +
      (G.pp.G < 0 ? ' The quartermasters run up a debt doing it.' : ''));
  } else {
    G.winterGear = false;
    logMsg('l-g', '⬛ "The campaign will be decided before winter." Every train carries ammunition and fuel.');
  }
  return true;
}
function fireEvents(){
  const evs = EVENTS.filter(e => e.turn === G.turn);
  for (const e of evs){
    if (e.pp) for (const s of ['G','S']) if (e.pp[s]) G.pp[s] = Math.min(40, G.pp[s] + e.pp[s]);
    logMsg('sys', `📰 ${e.date} — ${e.title}`);
  }
  if (evs.length && typeof onEvents === 'function') onEvents(evs);
  return evs;
}

/* ============================ TERRAIN ============================ */
const TERRAIN = {
  '.': {name:'Plains',  move:1, def:1.00, dig:1, color:'#4a5234'},
  'f': {name:'Forest',  move:2, def:1.30, dig:2, color:'#33422a'},
  'h': {name:'Hills',   move:2, def:1.40, dig:2, color:'#56503a'},
  's': {name:'Marshes', move:3, def:1.15, dig:1, color:'#3c4a42'},
  'r': {name:'River',   move:3, def:0.85, dig:0, color:'#33505e'},
  '~': {name:'Sea',     move:0, def:1.00, dig:0, color:'#1d2c38'},
  'o': {name:'Open Ocean', move:1, def:1.00, dig:0, color:'#16314a'}, // navigable, for naval theaters
  'c': {name:'City',    move:1, def:1.70, dig:3, color:'#5a5648'}, // virtual: hex with a city
};

/* ============================ RULES CONSTANTS ============================ */
const ENTRENCH_DEF = 0.15;                 // +15% defense per dig-in pip
const CONCENTRIC = 0.12;                   // +12% attack per extra adjacent friend
const OOS_ATK = 0.4, OOS_DEF = 0.65;       // encircled: savage combat penalties
const RIVER_ATK = 0.6;                     // attacking out of a river hex
const WX_LABEL = {clear:'Clear', mud:'Mud — Rasputitsa', freeze:'Hard Frost', snow:'Deep Snow'};

/* ============================ HEX MATH (odd-r offset, pointy-top) ============================ */
function inMap(x,y){ return x>=0 && x<COLS && y>=0 && y<ROWS; }
function terrainAt(x,y){ return MAP_ROWS[y][x]; }
function passable(x,y){ return inMap(x,y) && terrainAt(x,y) !== '~'; }
function neighbors(x,y){
  const odd = y & 1;
  const d = odd ? [[1,0],[-1,0],[0,-1],[1,-1],[0,1],[1,1]]
                : [[1,0],[-1,0],[-1,-1],[0,-1],[-1,1],[0,1]];
  const out = [];
  for (const [dx,dy] of d){ const nx=x+dx, ny=y+dy; if (inMap(nx,ny)) out.push([nx,ny]); }
  return out;
}
function cubeOf(x,y){ const q = x - ((y - (y&1)) >> 1); return [q, y, -q - y]; }
function hexDist(x1,y1,x2,y2){
  const a=cubeOf(x1,y1), b=cubeOf(x2,y2);
  return Math.max(Math.abs(a[0]-b[0]), Math.abs(a[1]-b[1]), Math.abs(a[2]-b[2]));
}
const keyOf = (x,y) => x + ',' + y;

/* ============================ GAME STATE ============================ */
let G = null;          // the whole game state (serializable)
let nextId = 1;

function cityAt(x,y){ return G.cities.find(c => c.x===x && c.y===y); }
function unitAt(x,y){ return G.units.find(u => u.x===x && u.y===y); }
function unitsOf(side){ return G.units.filter(u => u.side===side); }
function enemyOf(side){ return side==='G' ? 'S' : 'G'; }
function effTerrain(x,y){
  const c = cityAt(x,y);
  if (!c) return TERRAIN[terrainAt(x,y)];
  // Moscow & Leningrad are fortress cities: deep defense lines, ringed in concrete
  return c.vp >= 3 ? {...TERRAIN['c'], name:'Fortress City', def:1.9} : TERRAIN['c'];
}

function makeUnit(kind, name, x, y, str){
  const k = KINDS[kind];
  const u = { id: nextId++, kind, name, side:k.side, x, y,
           str: str ?? k.maxStr, entrench: 0, moved:false, attacked:false,
           oos:false, oosTurns:0, xp:0 };
  if (SCN && SCN.fuel && k.fuel) u.fuel = FUEL_MAX;
  return u;
}

/* ============================ VETERANCY & HQ ============================ */
/* Units harden as they fight. Three ranks, +5%/+10%/+15% to attack AND
   defense. Newly raised formations are green. */
const XP_LEVELS = [5, 14, 28];                // xp for Veteran · Hardened · Elite — a long-game reward
const RANK_NAME = ['Green','Veteran','Hardened','Elite'];
function unitLevel(u){ const xp = u.xp||0; let l = 0; for (const t of XP_LEVELS) if (xp>=t) l++; return l; }
function vetMul(u){ return 1 + 0.05*unitLevel(u); }
function gainXP(u, n){
  if (!u || KINDS[u.kind].hq) return;         // HQs direct, they don't brawl for XP
  const before = unitLevel(u);
  u.xp = (u.xp||0) + n;
  const after = unitLevel(u);
  if (after > before){
    logMsg(u.side==='G'?'l-g':'l-s', `${flag(u.side)} ${u.name} is now ${RANK_NAME[after]} (rank ${after}).`);
    if (typeof onLevelUp === 'function') onLevelUp(u);
  }
}

/* Headquarters project a command aura: friendly units within HQ_RANGE get a
   small attack/defense edge and +1 movement. HQs are fragile and can't take
   ground — keep them safe behind the line. */
const HQ_RANGE = 5, HQ_MUL = 1.05;
function underHQ(u){
  if (KINDS[u.kind].hq) return false;
  return unitsOf(u.side).some(h => KINDS[h.kind].hq && hexDist(u.x,u.y,h.x,h.y) <= HQ_RANGE);
}

/* ============================ FUEL (realistic mode) ============================ */
/* Operational logistics. Mechanized formations (kinds flagged fuel:true) burn
   fuel to move and refuel only while in supply — more when sitting on a depot
   city. Panzers that outrun their supply lines run dry and must wait for the
   trains, and the infantry, to catch up. All gated by SCN.fuel, so the five
   arcade scenarios never touch a drop of it. */
const FUEL_MAX = 18, FUEL_REGEN = 6, FUEL_DEPOT = 12, FUEL_TRICKLE = 2;
function usesFuel(u){ return !!(SCN && SCN.fuel) && !!KINDS[u.kind].fuel; }
function fuelOf(u){ return u.fuel == null ? FUEL_MAX : u.fuel; }

/* combined-arms forecast — shared by the UI and the engine. Each attacker
   brings its own power; coordinating several adds synergy, and mixing armor
   with infantry adds more (the real combined-arms punch). */
function previewGroup(attackers, def){
  const D = combatPower(attackers[0], def).D;
  let A = 0, hasArm = false, hasInf = false;
  for (const u of attackers){
    A += combatPower(u, def).A;
    const s = KINDS[u.kind].sym;
    if (s==='arm') hasArm = true;
    if (s==='inf' || s==='para' || s==='mot' || s==='cav') hasInf = true;   // foot/horse/truck all count as the infantry arm
  }
  let synergy = 1;
  if (attackers.length > 1){ synergy *= 1.10; if (hasArm && hasInf) synergy *= 1.15; }
  A *= synergy;
  const r = A/Math.max(D,0.1);
  return { ratio:r, defLoss:Math.min(def.str, Math.round(1.9*r)),
           atkLoss:Math.min(attackers.reduce((s,u)=>s+u.str,0), Math.round(1.7/Math.max(r,0.35))),
           synergy, combinedArms:hasArm&&hasInf, count:attackers.length };
}

function newGame(playerSide, difficulty, mode, scenario){
  loadScenario(scenario || (SCN && SCN.id) || 'barbarossa');
  nextId = 1;
  G = {
    scenario: SCN.id,
    turn: 1, phase: 'G',                       // Axis always moves first
    playerSide, difficulty: difficulty||'normal', mode: mode||'ai',
    cities: CITIES_INIT.map(c => ({...c})),
    units: START_UNITS.map(([k,n,x,y,s]) => makeUnit(k,n,x,y,s)),
    air: AIR_INIT.map(([sd,n,s,hm]) => makeAir(sd,n,s,hm)),
    pp: {G:0, S:0},
    winterGear: null,                          // null = not yet asked · 'pending' · true/false
    railDepth: {G: RAIL_START, S: RAIL_START},  // railhead reach from each home edge (realistic mode)
    decisions: {},                             // decision id -> chosen option index (or 'pending')
    turnSnap: {G:null, S:null},                // hotseat: state when each player handed over
    log: [],
    over: false, result: null,
    stats: {G:{lost:0,killed:0}, S:{lost:0,killed:0}},
  };
  if (SCN.setup) SCN.setup(G);                 // scenario-specific touches (fortresses etc.)
  G.pp.G = ppFor('G',1) + diffPP('G');
  G.pp.S = ppFor('S',1) + diffPP('S');
  refreshSupply();
  for (const line of SCN.opening(playerSide)) logMsg('sys', line);
  fireEvents();
  return G;
}

function diffPP(side){
  if (G.mode==='hotseat') return 0;
  const aiSide = enemyOf(G.playerSide);
  if (G.difficulty==='easy')   return side===G.playerSide ? 1 : -1;
  if (G.difficulty==='hard')   return side===aiSide ? 2 : -1;
  if (G.difficulty==='brutal') return side===aiSide ? 3 : -2;       // enemy out-produces you
  return 0;
}
function diffCombat(side){           // small attack-multiplier tweak for AI difficulty
  if (G.mode==='hotseat') return 1;
  const aiSide = enemyOf(G.playerSide);
  if (side!==aiSide) return 1;
  // the bulk of the difficulty now comes from how the AI PLAYS (aiSkill), so the
  // raw combat thumb-on-the-scale is light
  return G.difficulty==='easy' ? 0.9 : G.difficulty==='hard' ? 1.1 : G.difficulty==='brutal' ? 1.2 : 1;
}
/* AI SKILL — the heart of difficulty. 0 = sloppy (easy), 1 = solid (normal),
   2 = sharp (hard). A higher skill makes the AI judge odds better, hold an
   unbroken line, pull doomed units out of pockets and concentrate its fire —
   it plays smarter, it isn't just handed bonuses. Humans / hotseat play at 1. */
function aiSkill(side){
  if (G.mode==='hotseat' || side===G.playerSide) return 1;
  return G.difficulty==='easy' ? 0 : (G.difficulty==='hard' || G.difficulty==='brutal') ? 2 : 1;
}
/* sharper play presses good-but-not-perfect attacks; sloppier play waits for a
   sure thing (or over-commits to a bad one). */
function skillMinR(side, base){ return base - (aiSkill(side)-1)*0.15; }
/* line coherence: near the front a unit wants friendly units beside it, so the
   line has no 1-hex hole for the enemy to pour through. Skill-scaled — a sharp
   AI keeps a solid line; a sloppy one leaves the gaps you exploit now. */
function lineBonus(u, x, y){
  const sk = aiSkill(u.side);
  if (sk === 0) return 0;
  const foe = enemyOf(u.side);
  let nearFoe = false, adj = 0;            // one pass: near the front? friends beside us?
  for (const t of G.units){
    if (t.id === u.id) continue;
    const d = hexDist(x,y,t.x,t.y);
    if (t.side === foe){ if (d <= 2) nearFoe = true; }
    else if (d === 1) adj++;
  }
  if (!nearFoe) return 0;
  const isoPen = sk >= 2 ? -5 : -3;                     // Hard AI never leaves a 1-hex gap
  return (adj===0 ? isoPen : Math.min(adj,2)*1.4) * sk;
}
/* a unit about to be cut off pulls back toward its own supply. Skill-gated: a
   sharp AI saves the formation, an easy AI lets it be encircled. */
function aiEscape(u){
  if (aiSkill(u.side) === 0) return null;
  const adj = adjacentEnemies(u);
  const danger = adj.length>=3 || u.oos || (u.str<=3 && adj.length>=1) || (u.str<=4 && adj.length>=2);
  if (!danger) return null;
  const reach = reachable(u);
  const net = computeSupply(u.side);
  let best=null, bestS=-1e9;
  for (const k of reach.keys()){
    const [x,y] = k.split(',').map(Number);
    let s = (net.has(k)?10:0) + (rearDir(u.side)>0 ? x : COLS-x)*0.3;  // toward home edge & supply
    let e=0; for (const [nx,ny] of neighbors(x,y)){ const t=unitAt(nx,ny); if (t&&t.side!==u.side) e++; }
    s -= e*3;
    s += (effTerrain(x,y).def-1)*3;
    if (s > bestS){ bestS=s; best=[x,y]; }
  }
  if (best && (adj.length>=3 || !net.has(keyOf(u.x,u.y))))
    return {type:'move', u:u.id, x:best[0], y:best[1]};
  return null;
}

function logMsg(cls, text){
  G.log.push([cls, text]);
  if (G.log.length > 80) G.log.shift();
  if (typeof onLog === 'function') onLog();
}

/* ============================ SUPPLY & ZOC ============================ */
/* A hex is in a side's Zone of Control if adjacent to that side's unit. */
function computeZOC(side){
  const z = new Set();
  for (const u of unitsOf(side))
    for (const [nx,ny] of neighbors(u.x,u.y)) z.add(keyOf(nx,ny));
  return z;
}

/* Supply spreads from the home map edge AND from friendly-owned cities, but
   only SUPPLY_RANGE hexes at a time — each city you control is a depot that
   pushes the network further (Unity-of-Command style). It cannot flow through
   enemy units or enemy ZOC (unless a friendly unit holds the hex).
   This is why the blitzkrieg must take cities — and why it runs out of steam. */
const SUPPLY_RANGE = 7;
/* Binary min-heap for the Dijkstra floods (supply, reachable, distField). On
   the big realistic map these run per-unit, hundreds of times a turn — a sorted
   array was O(n^2); the heap makes them near-linear without changing results. */
function makeHeap(){
  const a = [];               // entries: [cost, x, y]
  return {
    size(){ return a.length; },
    push(c,x,y){ a.push([c,x,y]); let i=a.length-1;
      while(i>0){ const p=(i-1)>>1; if(a[p][0]<=a[i][0])break; const t=a[p];a[p]=a[i];a[i]=t; i=p; } },
    pop(){ const top=a[0], last=a.pop();
      if(a.length){ a[0]=last; let i=0; const n=a.length;
        for(;;){ let l=2*i+1, r=l+1, s=i;
          if(l<n && a[l][0]<a[s][0]) s=l;
          if(r<n && a[r][0]<a[s][0]) s=r;
          if(s===i) break; const t=a[s];a[s]=a[i];a[i]=t; i=s; } }
      return top; },
  };
}
/* ---- railheads (realistic mode) ----
   An advancing army's rail repair lags behind its spearheads — Soviet broad
   gauge had to be re-laid before trains could follow. Until rail reaches a
   captured city it is NOT a forward depot, so a fast advance outruns its own
   supply and the panzers culminate. The railhead grows RAIL_RATE hexes a turn
   through secured territory. Gated per side by SCN.railhead (only the attacker
   is limited; the defender falls back along intact rail). */
const RAIL_START = 15, RAIL_RATE = 2;
/* Which way is a side's rear? By default the attacker (G) is based on the WEST
   edge and advances east, the defender (S) on the EAST. A scenario can set
   `reversed:true` (e.g. Battle of France — Germany attacks WEST out of the
   Rhineland) to flip the home edges, retreat directions and AI fall-back bias.
   Returns +1 if the side's rear lies toward higher x, −1 toward lower x. */
function rearDir(side){
  const rev = !!(SCN && SCN.reversed);
  return side==='G' ? (rev ? 1 : -1) : (rev ? -1 : 1);
}
function homeEdgeX(side){ return rearDir(side) > 0 ? COLS-1 : 0; }
function railSide(side){ return !!(SCN.railhead && SCN.railhead[side]); }
function railDepthOf(side){ return (G.railDepth && G.railDepth[side]) ?? RAIL_START; }
/* BFS from the home edge through secured (friendly, un-contested) territory,
   capped at the current railhead depth. Returns the railed hex set, the parent
   pointers (for drawing the line) and the distance map (for the supply wash). */
function railNetwork(side){
  const foe = enemyOf(side);
  const foeZOC = computeZOC(foe);
  const occ = {};
  for (const u of G.units) occ[keyOf(u.x,u.y)] = u.side;
  const depth = railDepthOf(side);
  const homeX = homeEdgeX(side);
  const dist = new Map(), parent = new Map();
  // every step costs 1, so a plain FIFO breadth-first sweep gives shortest
  // distances — no priority queue (this runs inside computeSupply, which the
  // AI hits hundreds of times a turn, so it has to be O(n))
  let frontier = [];
  for (let y=0;y<ROWS;y++){
    const k = keyOf(homeX,y);
    if (passable(homeX,y) && occ[k] !== foe){ dist.set(k,0); frontier.push([homeX,y]); }
  }
  for (let c=0; c<depth && frontier.length; c++){
    const next = [];
    for (const [x,y] of frontier){
      for (const [nx,ny] of neighbors(x,y)){
        const k = keyOf(nx,ny);
        if (dist.has(k) || !passable(nx,ny) || occ[k] === foe) continue;
        if (foeZOC.has(k) && occ[k] !== side) continue;
        dist.set(k, c+1); parent.set(k, keyOf(x,y)); next.push([nx,ny]);
      }
    }
    frontier = next;
  }
  return { railed: new Set(dist.keys()), parent, dist };
}

function computeSupply(side){
  const foe = enemyOf(side);
  const foeZOC = computeZOC(foe);
  const occ = {};                     // occupancy map for speed
  for (const u of G.units) occ[keyOf(u.x,u.y)] = u.side;
  let myCities = G.cities.filter(c=>c.owner===side);
  // railheads: only cities the rail has reached project supply (the attacker's
  // forward depots lag behind the front; the defender's whole rear stays railed)
  if (railSide(side)){
    const rn = railNetwork(side);
    myCities = myCities.filter(c => rn.railed.has(keyOf(c.x,c.y)));
  }
  const cityKeys = new Set(myCities.map(c=>keyOf(c.x,c.y)));
  const dist = new Map();             // hex -> hexes since last depot
  const range = SCN.supplyRange ?? SUPPLY_RANGE;
  // Dijkstra over a binary heap (stepping costs 1; arriving at a friendly depot
  // city costs 0 and re-sources the network). The heap keeps this near-linear —
  // vital because the AI computes supply hundreds of times a turn, and on the
  // 60-wide map the old sorted-array queue was O(n^2).
  const heap = makeHeap();
  const seed = (x,y) => { const k=keyOf(x,y); if(!dist.has(k)){ dist.set(k,0); heap.push(0,x,y); } };
  // home map edge (scenarios can turn this off — e.g. an invader supplied only by sea)
  if ((SCN.edgeSupply && SCN.edgeSupply[side]) ?? true){
    const homeX = homeEdgeX(side);
    for (let y=0;y<ROWS;y++)
      if (passable(homeX,y) && occ[keyOf(homeX,y)] !== foe) seed(homeX,y);
  }
  // scenario lifelines (e.g. Leningrad's "Road of Life" over the Ladoga ice):
  for (const [sx,sy] of (SCN.supplySeeds && SCN.supplySeeds[side]) || []){
    const c = cityAt(sx,sy);
    if (c && c.owner !== side) continue;
    if (passable(sx,sy) && occ[keyOf(sx,sy)] !== foe) seed(sx,sy);
  }
  while (heap.size()){
    const [c,x,y] = heap.pop();
    if (c > (dist.get(keyOf(x,y)) ?? 1e9)) continue;
    for (const [nx,ny] of neighbors(x,y)){
      const k = keyOf(nx,ny);
      if (!passable(nx,ny)) continue;
      if (occ[k] === foe) continue;
      if (foeZOC.has(k) && occ[k] !== side) continue;
      let nc = c + 1;
      if (nc > range) continue;                 // too far to reach — a city out here is no depot
      if (cityKeys.has(k)) nc = 0;              // a city WITHIN reach is a forward depot
      if (nc < (dist.get(k) ?? 1e9)){ dist.set(k, nc); heap.push(nc,nx,ny); }
    }
  }
  return new Set(dist.keys());
}

function refreshSupply(){
  for (const side of ['G','S']){
    const net = computeSupply(side);
    for (const u of unitsOf(side)) u.oos = !net.has(keyOf(u.x,u.y));
  }
  claimTerritory();
}

/* ============================ TERRITORY ============================ */
/* Every land hex remembers who holds it, and the map is tinted to match —
   grey ground behind the German advance, red behind Soviet lines.
   Territory is rebuilt from scratch on every call via a simultaneous
   multi-source BFS from all unit + city anchors, so the whole map
   updates correctly even when units advance many hexes at once. */
function seedTerritory(){ claimTerritory(); }   // legacy alias — BFS handles this now
function terrOwner(x,y){
  if (!G || !G.terr) return null;
  const v = G.terr[y*COLS+x];
  return v===1 ? 'G' : v===2 ? 'S' : null;
}
function claimTerritory(){
  if (typeof _tintDirty !== 'undefined') _tintDirty = true;
  const n = COLS*ROWS;
  if (!G.terr || G.terr.length !== n) G.terr = new Array(n).fill(0);
  else G.terr.fill(0);
  // Collect seeds for each side, then interleave so both BFS fronts expand
  // at the same rate — the territory frontier ends up equidistant (Voronoi).
  const qG = [], qS = [];
  for (const u of G.units){
    if (u.side==='G') qG.push(u.x,u.y,1); else qS.push(u.x,u.y,2);
  }
  for (const c of G.cities){
    if (c.owner==='G') qG.push(c.x,c.y,1); else qS.push(c.x,c.y,2);
  }
  const q = [];
  let gi=0, si=0;
  while (gi<qG.length || si<qS.length){
    if (gi<qG.length){ q.push(qG[gi],qG[gi+1],qG[gi+2]); gi+=3; }
    if (si<qS.length){ q.push(qS[si],qS[si+1],qS[si+2]); si+=3; }
  }
  // Mark seed hexes, then BFS-expand into unclaimed passable land
  for (let i=0;i<q.length;i+=3){
    const x=q[i],y=q[i+1],me=q[i+2];
    if (passable(x,y)) G.terr[y*COLS+x]=me;
  }
  let head=0;
  while (head<q.length){
    const x=q[head],y=q[head+1],me=q[head+2]; head+=3;
    for (const [nx,ny] of neighbors(x,y)){
      if (!passable(nx,ny)) continue;
      const k=ny*COLS+nx;
      if (G.terr[k]) continue;
      G.terr[k]=me; q.push(nx,ny,me);
    }
  }
  absorbPockets();
}
/* A bypassed enemy pocket with no troops in it — ground the front has simply
   flowed around — flips to the side that surrounds it, so the map shows the real
   front line instead of stranded islands of colour you'd have to march back
   through to recolour. An enemy hex survives only if it can trace a path, through
   enemy-held ground, back to an enemy unit or an enemy-held city. An encircled
   enemy UNIT is its own anchor, so a real pocket keeps its ground (and the colour
   warning) until the defender is destroyed — only empty, cut-off land is absorbed. */
function absorbPockets(){
  if (!G.terr) return;
  for (const [foeVal, mineVal, foeSide] of [[2,1,'S'],[1,2,'G']]){
    const connected = new Set(), stack = [];
    const anchor = (x,y)=>{ const k=y*COLS+x; if (G.terr[k]===foeVal && !connected.has(k)){ connected.add(k); stack.push(x,y); } };
    for (const u of unitsOf(foeSide)) anchor(u.x,u.y);          // every enemy unit anchors its ground
    for (const c of G.cities) if (c.owner===foeSide) anchor(c.x,c.y);   // and every enemy-held city
    while (stack.length){
      const y = stack.pop(), x = stack.pop();
      for (const [nx,ny] of neighbors(x,y)){
        if (!passable(nx,ny)) continue;
        const k = ny*COLS+nx;
        if (G.terr[k]===foeVal && !connected.has(k)){ connected.add(k); stack.push(nx,ny); }
      }
    }
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++){
      const k = y*COLS+x;
      if (G.terr[k]===foeVal && !connected.has(k)) G.terr[k] = mineVal;   // cut-off & empty → absorbed
    }
  }
}

/* ============================ MOVEMENT ============================ */
function moveCost(u, x, y){
  let c = effTerrain(x,y).move;
  const wx = weatherFor(G.turn);
  if (wx === 'mud') c += 1;
  if (wx === 'snow' && KINDS[u.kind].sym === 'arm') c += 1;
  return c;
}

/* Dijkstra flood: returns Map key->cost of hexes the unit can END on.
   Enemy ZOC stops movement; friendly units can be passed through but not
   stopped on; enemy hexes are impassable. */
function reachable(u){
  const wx = weatherFor(G.turn);
  let mp = KINDS[u.kind].mp + (generalOf(u)?.mp || 0);
  // felt boots keep the infantry marching; frozen engines stop the panzers regardless
  if (wx==='snow' && u.side==='G' && !(hasWinterGear() && KINDS[u.kind].sym==='inf'))
    mp = Math.max(1, mp-1);
  if (underHQ(u)) mp += 1;                      // forward HQ keeps the formation moving
  if (usesFuel(u)) mp = Math.min(mp, Math.max(1, fuelOf(u))); // low on fuel = short hops; dry = a 1-hex crawl back to supply
  const foeZOC = computeZOC(enemyOf(u.side));
  const occ = {};
  for (const t of G.units) if (t.id!==u.id) occ[keyOf(t.x,t.y)] = t.side;
  const best = new Map([[keyOf(u.x,u.y), 0]]);
  const heap = makeHeap(); heap.push(0,u.x,u.y);
  while (heap.size()){
    const [c,x,y] = heap.pop();
    if (c > (best.get(keyOf(x,y)) ?? 1e9)) continue;
    if (foeZOC.has(keyOf(x,y)) && !(x===u.x&&y===u.y)) continue;  // ZOC: stop here
    for (const [nx,ny] of neighbors(x,y)){
      if (!passable(nx,ny)) continue;
      const k = keyOf(nx,ny);
      if (occ[k] === enemyOf(u.side)) continue;
      const nc = c + moveCost(u,nx,ny);
      if (nc > mp) continue;
      if (nc < (best.get(k) ?? 1e9)){ best.set(k, nc); heap.push(nc,nx,ny); }
    }
  }
  best.delete(keyOf(u.x,u.y));
  for (const [k] of [...best]) {                       // can't end on any unit
    const [x,y] = k.split(',').map(Number);
    if (unitAt(x,y)) best.delete(k);
  }
  return best;
}

function doMove(u, x, y){
  if (usesFuel(u)){                              // burn fuel equal to the distance covered
    const cost = reachable(u).get(keyOf(x,y));
    u.fuel = Math.max(0, fuelOf(u) - (cost ?? hexDist(u.x,u.y,x,y)));
  }
  u.x = x; u.y = y; u.moved = true; u.entrench = 0;
  const c = cityAt(x,y);
  if (c && c.owner !== u.side && !KINDS[u.kind].noCapture){
    c.owner = u.side;
    logMsg(u.side==='G'?'l-g':'l-s', `${flag(u.side)} ${c.name} ${c.vp?'— OBJECTIVE —':''} captured by ${u.name}!`);
    if (typeof onCityTaken === 'function') onCityTaken(c);
  }
  refreshSupply();
  checkSuddenDeath();
}
function flag(side){ return SIDES[side].flag; }
function sideName(side){ return SIDES[side].name; }

/* ============================ COMBAT ============================ */
function combatMods(att, def){
  const wx = weatherFor(G.turn);
  const tDef = effTerrain(def.x, def.y).def;
  let aMul = 1, dMul = 1;
  // `factors` is a legible breakdown for the forecast: {who:'atk'|'def', label, mul}
  const F = [];
  const af = (label, mul) => { aMul *= mul; if (Math.abs(mul-1) > 1e-9) F.push({who:'atk', label, mul}); };
  const df = (label, mul) => { dMul *= mul; if (Math.abs(mul-1) > 1e-9) F.push({who:'def', label, mul}); };
  // terrain & entrenchment (rolled into the defender's base multiplier)
  df(effTerrain(def.x,def.y).name, tDef);
  if (def.entrench > 0) df('Dug in '+'▮'.repeat(def.entrench), 1 + ENTRENCH_DEF*def.entrench);
  const ag = generalOf(att), dg = generalOf(def);
  if (ag && ag.atk) af('⭐ '+ag.name, ag.atk);
  if (dg && dg.def) df('⭐ '+dg.name, dg.def);
  if (zhukovDefends(def)) df('⭐ '+ (SCN.capitalDefense.city) +' defense', SCN.capitalDefense.def);
  const al = unitLevel(att), dl = unitLevel(def);
  if (al > 0) af('✚ '+RANK_NAME[al], 1+0.05*al);
  if (dl > 0) df('✚ '+RANK_NAME[dl], 1+0.05*dl);
  if (underHQ(att)) af('⌂ HQ command', HQ_MUL);
  if (underHQ(def)) df('⌂ HQ command', HQ_MUL);
  if (terrainAt(att.x,att.y)==='r') af('Attacking across river', RIVER_ATK);
  if (att.oos) af('Attacker cut off', SCN.harshOOS ? 0.35 : OOS_ATK);
  if (def.oos) df('Defender cut off', SCN.harshOOS ? 0.60 : OOS_DEF);
  // concentric attack: every other friendly unit adjacent to the defender
  let ring = 0;
  for (const [nx,ny] of neighbors(def.x,def.y)){
    const t = unitAt(nx,ny);
    if (t && t.side===att.side && t.id!==att.id) ring++;
  }
  if (ring > 0) af((Math.min(ring,3)+1)+'-sided attack', 1 + CONCENTRIC*Math.min(ring,3));
  // weather
  if (wx==='mud'){ af('Rasputitsa mud', KINDS[att.kind].sym==='arm' ? 0.5 : 0.6); }
  if (wx==='freeze'){ af('Hard frost', 0.9); }
  if (wx==='snow'){
    // winter gear saves the defense, not the offensive — no December blitz
    if (att.side==='G') af(hasWinterGear()?'Deep snow (geared)':'Deep snow', hasWinterGear() ? 0.65 : 0.6);
    if (def.side==='G') df(hasWinterGear()?'Deep snow (geared)':'Deep snow', hasWinterGear() ? 0.9 : 0.8);
    if (KINDS[att.kind].winter) af('Winter-hardened', 1.2);
  }
  const dc = diffCombat(att.side);
  if (dc !== 1) af('Difficulty', dc);
  return {aMul, dMul, ring, tDef, factors:F};
}

function combatPower(att, def){
  const m = combatMods(att, def);
  const A = KINDS[att.kind].atk * (att.str/10) * m.aMul;
  const D = KINDS[def.kind].def * (def.str/10) * m.dMul;
  return {A: Math.max(A,0.1), D: Math.max(D,0.1), ...m};
}

/* Expected (dice-free) result — used for the on-screen forecast and the AI. */
const RETREAT_RATIO = 1.35;
function previewCombat(att, def){
  const cp = combatPower(att,def);
  const {A,D} = cp;
  const r = A/D;
  const defLoss = Math.min(def.str, Math.round(1.9*r));
  const atkLoss = Math.min(att.str, Math.round(1.7/Math.max(r,0.35)));
  return {ratio:r, defLoss, atkLoss, retreat: r>=RETREAT_RATIO && defLoss>=2, factors:cp.factors};
}

function retreatHex(def, att){
  // best adjacent hex: empty, passable, away from attacker, ideally out of enemy ZOC
  const foeZOC = computeZOC(att.side);
  let best=null, bestScore=-1e9;
  for (const [nx,ny] of neighbors(def.x,def.y)){
    if (!passable(nx,ny) || unitAt(nx,ny)) continue;
    let s = hexDist(nx,ny,att.x,att.y)*3;
    s += rearDir(def.side) * nx;                      // bias toward own rear
    if (foeZOC.has(keyOf(nx,ny))) s -= 8;
    if (s > bestScore){ bestScore=s; best=[nx,ny]; }
  }
  return best;
}

function advanceInto(u, fx, fy, events){
  u.x = fx; u.y = fy;
  const c = cityAt(fx,fy);
  if (c && c.owner!==u.side && !KINDS[u.kind].noCapture){
    c.owner = u.side;
    logMsg(u.side==='G'?'l-g':'l-s', `${flag(u.side)} ${c.name} ${c.vp?'— OBJECTIVE —':''} overrun by ${u.name}!`);
    if (typeof onCityTaken === 'function') onCityTaken(c);
  }
  events.advance = [fx,fy];
}
function resolveCombat(att, def, supports){
  supports = (supports||[]).filter(s => s && s.id!==att.id && s.side===att.side);
  const group = [att, ...supports];
  const combined = supports.length > 0;
  const adjacentKill = group.some(p => hexDist(p.x,p.y,def.x,def.y) === 1);  // ranged kills can't be exploited
  // combined attack power: each attacker's own power, plus combined-arms synergy
  const D = combatPower(att, def).D;
  let A = 0, hasArm = false, hasInf = false;
  for (const u of group){
    A += combatPower(u, def).A;
    const s = KINDS[u.kind].sym;
    if (s==='arm') hasArm = true;
    if (s==='inf' || s==='para' || s==='mot' || s==='cav') hasInf = true;   // foot/horse/truck all count as the infantry arm
  }
  if (combined){ A *= 1.10; if (hasArm && hasInf) A *= 1.15; }
  const rnd = () => 0.75 + Math.random()*0.5;
  const r = (A*rnd())/(D*rnd());
  let defLoss = Math.min(def.str, Math.max(r>0.8?1:0, Math.round(1.9*r*(0.8+Math.random()*0.4))));
  let atkLossTotal = Math.round(1.7/Math.max(r,0.35)*(0.8+Math.random()*0.4));
  for (const u of group){ u.attacked = true; u.moved = true; u.entrench = 0; }
  def.entrench = Math.max(0, def.entrench - 1);
  def.str -= defLoss;
  G.stats[def.side].lost += defLoss; G.stats[att.side].killed += defLoss;
  // spread attacker losses across the group — the strongest absorb first
  let atkLoss = 0, guard = 0;
  while (atkLossTotal > 0 && guard++ < 80){
    const alive = group.filter(u => u.str > 0).sort((a,b)=>b.str-a.str);
    if (!alive.length) break;
    alive[0].str -= 1; atkLoss++; atkLossTotal--;
    G.stats[att.side].lost += 1; G.stats[def.side].killed += 1;
  }
  // experience: everyone who fought hardens — attacker and defender alike,
  // so a stubborn defense seasons troops as fast as a winning advance
  const defDead = def.str <= 0;
  for (const u of group) if (u.str > 0) gainXP(u, defDead ? 3 : 2);
  if (!defDead) gainXP(def, 2);

  const events = {defLoss, atkLoss, ratio:r, destroyed:false, retreated:false,
                  attDied:false, advance:null, choose:null, combined, defFrom:[def.x,def.y]};
  for (const u of group){
    if (u.str <= 0){
      if (u.id===att.id) events.attDied = true;
      killUnit(u);
      logMsg(att.side==='G'?'l-g':'l-s', `${flag(att.side)} ${u.name} destroyed itself attacking ${def.name}!`);
    }
  }
  const lead = group.find(u => u.str > 0) || null;
  const tag = combined ? att.name+' & co.' : att.name;
  const defCity = cityAt(def.x,def.y);
  const fortress = defCity && defCity.vp >= 3 && defCity.owner === def.side;
  if (def.str <= 0){
    events.destroyed = true;
  } else if (fortress && r >= RETREAT_RATIO && defLoss >= 2 && lead){
    def.str -= 1; G.stats[def.side].lost += 1; G.stats[att.side].killed += 1;   // no retreat: fights in the ruins
    if (def.str <= 0) events.destroyed = true;
  } else if (r >= RETREAT_RATIO && defLoss >= 2 && lead){
    const rh = retreatHex(def, lead);
    if (rh){
      def.x = rh[0]; def.y = rh[1]; def.entrench = 0; events.retreated = true;
      const c = cityAt(rh[0],rh[1]);
      if (c && c.owner!==def.side) c.owner = def.side;
    } else {
      def.str -= 2; G.stats[def.side].lost += 2; G.stats[att.side].killed += 2;
      if (def.str <= 0) events.destroyed = true;
      else logMsg('sys', `${def.name} has nowhere to retreat — mauled in the pocket!`);
    }
  }
  if (events.destroyed){
    killUnit(def);
    logMsg(att.side==='G'?'l-g':'l-s', `${flag(att.side)} ${tag} destroys ${def.name}${defNoEscape(events)?' — pocket closed!':'!'}`);
  } else {
    logMsg(att.side==='G'?'l-g':'l-s', `${flag(att.side)} ${tag} hits ${def.name}: ${defLoss} losses inflicted, ${atkLoss} taken.`);
  }
  // advance into a vacated adjacent hex
  if ((events.destroyed || events.retreated) && lead && adjacentKill && !unitAt(...events.defFrom)){
    const [fx,fy] = events.defFrom;
    const eligible = group.filter(u => u.str>0 && hexDist(u.x,u.y,fx,fy)===1 &&
      !(KINDS[u.kind].noCapture && cityAt(fx,fy) && cityAt(fx,fy).owner!==u.side));
    if (combined && eligible.length){
      events.choose = eligible.map(u => u.id);                  // the player picks who advances
    } else if (!combined && (KINDS[lead.kind].sym==='arm' || KINDS[lead.kind].fast) && eligible.includes(lead)){
      advanceInto(lead, fx, fy, events);                        // lone armor exploits automatically
    }
  }
  refreshSupply();
  checkSuddenDeath();
  return events;
}
function defNoEscape(ev){ return ev.destroyed && !ev.retreated; }
function killUnit(u){
  const g = generalOf(u);
  if (g) logMsg('sys', `⭐ ${g.name} is lost with this command — a grievous blow.`);
  // carrier air groups go down with their ship
  for (const a of G.air.filter(a => a.home === u.name)){
    killAir(a);
    logMsg('sys', `✈ ${a.name} is lost with ${u.name} — pilots and planes together.`);
  }
  G.units = G.units.filter(t => t.id !== u.id);
}

/* ============================ PRODUCTION ============================ */
function canReinforce(u){
  if (u.str >= KINDS[u.kind].maxStr || u.oos || u.moved || u.attacked) return false;
  const adjEnemy = neighbors(u.x,u.y).some(([x,y]) => { const t=unitAt(x,y); return t && t.side!==u.side; });
  const cost = adjEnemy ? 2 : 1;            // pricier at the front line
  return G.pp[u.side] >= cost ? {cost, steps: adjEnemy ? 1 : Math.min(KINDS[u.kind].maxStr - u.str, Math.floor(G.pp[u.side]/cost), 3)} : false;
}
function doReinforce(u){
  const r = canReinforce(u);
  if (!r) return false;
  u.str += r.steps; G.pp[u.side] -= r.cost * r.steps;
  u.moved = true;                            // reinforcing costs the unit its turn
  logMsg(u.side==='G'?'l-g':'l-s', `${flag(u.side)} ${u.name} reinforced to strength ${u.str}.`);
  return true;
}
function deploySpots(side){
  const spawns = side==='G' ? GER_SPAWNS : SOV_SPAWNS;
  const net = computeSupply(side);
  return spawns.filter(([x,y]) => {
    const c = cityAt(x,y);
    if (c && c.owner!==side) return false;
    return passable(x,y) && !unitAt(x,y) && net.has(keyOf(x,y));
  });
}
function buyableKinds(side){
  return Object.keys(KINDS).filter(k => KINDS[k].side===side && k!=='g_ally' && k!=='s_guard' && !KINDS[k].noBuy)
    .filter(k => KINDS[k].cost <= G.pp[side]);
}
function doDeploy(side, kind, x, y){
  const k = KINDS[kind];
  if (!k || k.side!==side || G.pp[side] < k.cost) return false;
  if (!deploySpots(side).some(([sx,sy]) => sx===x && sy===y)) return false;
  G.pp[side] -= k.cost;
  const names = SCN.deployNames || {g_inf:'Ersatz Armee', g_pz:'Panzer Reserve', s_inf:'Reserve Army',
                 s_tank:'Tank Reserve', s_mil:'People’s Militia'};
  const u = makeUnit(kind, names[kind]||k.label, x, y, k.maxStr);
  u.moved = true; u.attacked = true;        // arrives unready
  G.units.push(u);
  logMsg(side==='G'?'l-g':'l-s', `${flag(side)} ${u.name} (${k.label}) deployed at ${cityAt(x,y)?.name||'the front'}.`);
  refreshSupply();
  return true;
}

/* ============================ AIR POWER ============================ */
/* Off-map air groups. Each turn a group can STRIKE (bomb a ground unit:
   damage + blasts away entrenchment), PATROL (intercept enemy strikes until
   your next turn), or rest to repair. Strikes only reach AIR_RANGE hexes
   from a city you control — airfields advance with the front. */
const AIR_RANGE = 8;
const AIR_MAXSTR = 10;
function makeAir(side, name, str, home){ return {id:nextId++, side, name, str, mission:'ready', home: home||null}; }
function airOf(side){ return G.air.filter(a => a.side===side); }
function airWxMul(side){
  const wx = weatherFor(G.turn);
  if (wx==='mud') return 0.7;
  if (wx==='freeze') return 0.85;
  if (wx==='snow') return side==='G' ? 0.45 : 0.9;   // the Luftwaffe freezes solid
  return 1;
}
function airfieldCovered(side, x, y){
  if (G.cities.some(c => c.owner===side && hexDist(c.x,c.y,x,y) <= AIR_RANGE)) return true;
  // naval theaters: aircraft carriers are floating airfields
  return unitsOf(side).some(u => KINDS[u.kind].carrier && hexDist(u.x,u.y,x,y) <= AIR_RANGE);
}
function strikeTargets(side){
  return unitsOf(enemyOf(side)).filter(t => !KINDS[t.kind].lowProfile && airfieldCovered(side, t.x, t.y));
}
function enemyPatrol(side){
  return airOf(enemyOf(side)).filter(p => p.mission==='patrol' && p.str>0)
                             .sort((a,b)=>b.str-a.str)[0] || null;
}
function previewStrike(au, t){
  const eff = (au.str/10)*airWxMul(au.side);
  const p = enemyPatrol(au.side);
  return {dmg: Math.min(2, Math.max(0, Math.round(eff*(p?0.7:1.45)))), intercepted: !!p};
}
function killAir(au){ G.air = G.air.filter(a => a.id !== au.id); }
function setPatrol(au){
  if (au.mission!=='ready') return false;
  au.mission = 'patrol';
  logMsg(au.side==='G'?'l-g':'l-s', `${flag(au.side)} ✈ ${au.name} flies fighter patrols.`);
  return true;
}
function airStrike(au, t){
  if (au.mission!=='ready' || !t || t.side===au.side) return null;
  if (!airfieldCovered(au.side, t.x, t.y)) return null;
  au.mission = 'done';
  let eff = (au.str/10)*airWxMul(au.side);
  const res = {dmg:0, intercepted:false, flak:false, lostGroup:false, killed:false, target:t};
  const patrol = enemyPatrol(au.side);
  if (patrol){
    res.intercepted = true;
    au.str -= patrol.str > au.str ? 2 : 1;
    patrol.str -= 1;
    if (patrol.str <= 0) killAir(patrol);
    eff *= 0.5;
    logMsg('sys', `✈ Air battle over ${cityAt(t.x,t.y)?.name||'the front'} — ${patrol.name} intercepts ${au.name}!`);
    if (au.str <= 0){
      killAir(au); res.lostGroup = true;
      logMsg('sys', `✈ ${au.name} is wiped out by enemy fighters.`);
      return res;
    }
  }
  if (Math.random() < 0.25){
    au.str -= 1; res.flak = true;
    if (au.str <= 0){ killAir(au); res.lostGroup = true; }
  }
  res.dmg = Math.min(2, t.str, Math.max(0, Math.round(eff*(1.1 + Math.random()*0.7))));
  t.str -= res.dmg;
  // field entrenchments are blasted open — but bombed cities just become rubble fortresses
  if (t.entrench > 0 && !cityAt(t.x,t.y)) t.entrench--;
  G.stats[t.side].lost += res.dmg; G.stats[au.side].killed += res.dmg;
  if (t.str <= 0){
    res.killed = true; killUnit(t);
    logMsg(au.side==='G'?'l-g':'l-s', `${flag(au.side)} ✈ ${au.name} annihilates ${t.name} from the air!`);
    refreshSupply(); checkSuddenDeath();
  } else {
    logMsg(au.side==='G'?'l-g':'l-s', `${flag(au.side)} ✈ ${au.name} bombs ${t.name}: ${res.dmg} losses${res.flak?' (flak damage taken)':''}.`);
  }
  if (typeof onAirStrike === 'function') onAirStrike(au, t, res);
  return res;
}

/* ---- raising & re-equipping air groups with production ---- */
/* Air groups still trickle back +1/turn when rested, but production now lets
   you re-equip a mauled group faster, or raise a whole new wing — so your air
   arm is a lever you control, not a fixed gift of the scenario script. */
const AIR_BUILD_COST = 16, AIR_BUILD_STR = 6, AIR_REINF_COST = 2, AIR_REINF_MAX = 3;
function airInUse(side){ return (AIR_INIT && AIR_INIT.length>0) || airOf(side).length>0; }
function canBuildAir(side){ return airInUse(side) && G.pp[side] >= AIR_BUILD_COST; }
function airBuildName(side){
  if (!G.airBuilt) G.airBuilt = {G:0, S:0};
  const n = (G.airBuilt[side]||0) + 1; G.airBuilt[side] = n;
  const base = (SCN.airBuildName && SCN.airBuildName[side]) || (SIDES[side].name + ' Air Reserve');
  return base + ' ' + n;
}
function buildAir(side){
  if (!canBuildAir(side)) return false;
  G.pp[side] -= AIR_BUILD_COST;
  const au = makeAir(side, airBuildName(side), AIR_BUILD_STR);
  au.mission = 'done';                                  // raised this turn — flies next turn
  G.air.push(au);
  logMsg(side==='G'?'l-g':'l-s', `${flag(side)} ✈ ${au.name} is raised — a fresh air wing joins the order of battle.`);
  return true;
}
function canReinfAir(au){
  if (au.str >= AIR_MAXSTR) return false;
  const steps = Math.min(AIR_MAXSTR - au.str, AIR_REINF_MAX, Math.floor(G.pp[au.side]/AIR_REINF_COST));
  return steps > 0 ? {steps, cost: steps*AIR_REINF_COST} : false;
}
function reinforceAir(au){
  const r = canReinfAir(au);
  if (!r) return false;
  au.str += r.steps; G.pp[au.side] -= r.cost;
  if (au.mission === 'ready') au.mission = 'done';      // re-equipping spends the sortie
  logMsg(au.side==='G'?'l-g':'l-s', `${flag(au.side)} ✈ ${au.name} re-equips to strength ${au.str}.`);
  return true;
}
/* the AI invests any air surplus last, after its ground needs are met */
function aiAirBuild(side){
  if (!airInUse(side)) return;
  const my = airOf(side), foe = airOf(enemyOf(side));
  const myStr = my.reduce((a,p)=>a+p.str,0), foeStr = foe.reduce((a,p)=>a+p.str,0);
  // re-equip one badly mauled group that wouldn't fly anyway — keep a ground cushion
  const hurt = my.filter(a=>a.str>0 && a.str<=4 && a.mission!=='done').sort((a,b)=>a.str-b.str)[0];
  if (hurt && G.pp[side] >= AIR_REINF_COST + 8) reinforceAir(hurt);
  // raise a new wing when outnumbered in the air and flush with cash
  if (foeStr > myStr + 2 && G.pp[side] >= AIR_BUILD_COST + 10) buildAir(side);
}

/* ============================ TURN FLOW ============================ */
function dateStr(turn){
  const d = new Date(START_DATE + (turn-1)*(SCN.turnDays||7)*864e5);
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getUTCDate()} ${m[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function startPhase(side){
  G.phase = side;
  // the railhead creeps forward: engineers re-lay track behind the advance
  if (railSide(side) && G.railDepth)
    G.railDepth[side] = Math.min(COLS + 8, railDepthOf(side) + RAIL_RATE);
  for (const u of unitsOf(side)){ u.moved = false; u.attacked = false; }
  for (const a of airOf(side)) a.mission = 'ready';   // patrols land, bombers rearm
  refreshSupply();
  // attrition for cut-off units: pockets starve from the very first week. In
  // realistic mode a formation that stays cut off TWO turns or more collapses
  // twice as fast — so a deliberate encirclement is lethal, but a spearhead that
  // briefly outruns supply and then reconnects (or takes a city) survives.
  for (const u of [...unitsOf(side)]){
    if (u.oos){
      u.oosTurns++;
      const bleed = (SCN.harshOOS && u.oosTurns >= 2) ? 2 : 1;
      u.str -= bleed; G.stats[side].lost += bleed; G.stats[enemyOf(side)].killed += bleed;
      if (u.str <= 0){
        killUnit(u);
        logMsg('sys', `${flag(side)} ${u.name} surrenders — starved out in the pocket.`);
      }
    } else u.oosTurns = 0;
  }
  // mechanized formations refuel when supplied — a depot city fills the tanks
  // fast; an outrun spearhead gets only a trickle (fuel trucks, captured stocks),
  // so it culminates and slows but never freezes solid mid-breakthrough
  if (SCN.fuel) for (const u of unitsOf(side)){
    if (!KINDS[u.kind].fuel) continue;
    let gain;
    if (u.oos) gain = FUEL_TRICKLE;
    else {
      const onDepot = !!cityAt(u.x,u.y) ||
        neighbors(u.x,u.y).some(([nx,ny])=>{ const c=cityAt(nx,ny); return c && c.owner===side; });
      gain = onDepot ? FUEL_DEPOT : FUEL_REGEN;
    }
    u.fuel = Math.min(FUEL_MAX, fuelOf(u) + gain);
  }
  G.pp[side] += ppFor(side, G.turn) + diffPP(side);
  if (G.pp[side] > 40) G.pp[side] = 40;
  // the winter question: asked in mid-August, and not open forever
  const wq = SCN.winterQuestion;
  if (wq && side==='G' && G.winterGear == null && G.turn >= wq.turn && G.turn <= wq.turn+3){
    G.winterGear = 'pending';
    logMsg('sys', '⬛ The Quartermaster-General reports: winter clothing for one soldier in five.');
    if (typeof onWinterDecision === 'function') onWinterDecision();
  } else if (wq && side==='G' && G.winterGear === 'pending' && G.turn > wq.turn+3){
    G.winterGear = false;
    logMsg('sys', '⬛ The railways are saturated — winter equipment stays in Warsaw depots. The army gambles on an early victory.');
  }
  fireDecisions(side);
  checkSuddenDeath();
}

/* ============================ STRATEGIC DECISIONS ============================ */
/* Historical crossroads turned into real forks. Each decision belongs to one
   side and fires on its turn; the human gets a modal, the AI resolves itself.
   G.decisions[id] holds the chosen option index (or 'pending'). Effects live
   in the scenario (functions, never serialized), so saves stay portable. */
function decisionsFor(side){
  return (SCN.decisions || []).filter(d => d.side === side);
}
function decisionById(id){ return (SCN.decisions || []).find(d => d.id === id); }
function fireDecisions(side){
  if (!G.decisions) G.decisions = {};
  for (const d of decisionsFor(side)){
    if (G.turn !== d.turn || d.id in G.decisions) continue;
    G.decisions[d.id] = 'pending';
    logMsg(side==='G'?'l-g':'l-s', `${flag(side)} ⚑ A decision is demanded: ${d.title}.`);
    const human = G.mode==='hotseat' || side===G.playerSide;
    if (human && typeof onDecision === 'function') onDecision(d);
    else resolveDecision(d.id, d.ai ? d.ai(G) : 0);
  }
}
function pendingDecision(){
  for (const id in (G.decisions||{}))
    if (G.decisions[id]==='pending'){ const d = decisionById(id); if (d) return d; }
  return null;
}
function resolveDecision(id, choice){
  const d = decisionById(id);
  if (!d || G.decisions[id] !== 'pending') return false;
  G.decisions[id] = choice;
  const opt = d.options[choice];
  if (opt){
    if (opt.log) logMsg(d.side==='G'?'l-g':'l-s', opt.log);
    if (opt.apply) opt.apply(G);
  }
  refreshSupply();
  return true;
}

function endPhase(){
  const side = G.phase;
  // hotseat: remember how things stood when this player handed over, so the
  // pass screen can report what happened while they looked away
  if (G.mode==='hotseat'){
    if (!G.turnSnap) G.turnSnap = {G:null, S:null};
    G.turnSnap[side] = { lost: G.stats[side].lost, killed: G.stats[side].killed,
                         cities: G.cities.filter(c=>c.owner===side).map(c=>c.name) };
  }
  for (const u of unitsOf(side)){
    if (!u.moved && !u.attacked && !u.oos){
      const cap = effTerrain(u.x,u.y).dig;
      if (u.entrench < cap) u.entrench++;
    }
  }
  for (const a of airOf(side))                       // groups that rested repair
    if (a.mission==='ready' && a.str < AIR_MAXSTR) a.str++;
  if (side === 'G'){
    startPhase('S');
  } else {
    // Soviet reinforcements arrive at the top of the new turn
    G.turn++;
    if (G.turn > MAX_TURN){ endGame(); return; }
    const wxNew = weatherFor(G.turn), wxOld = weatherFor(G.turn-1);
    if (wxNew !== wxOld){
      const msg = {mud:'The autumn rains begin — the rasputitsa swallows roads, men and machines.',
                   freeze:'The ground freezes hard. Movement is possible again… and winter is close.',
                   snow: hasWinterGear()
                     ? 'DEEP SNOW. The army shivers — but it is clothed. The winter-equipment gamble pays off. Siberian divisions are arriving.'
                     : 'DEEP SNOW. German attacks falter in -30° cold — frostbite claims more men than bullets. Siberian divisions are arriving.'}[wxNew];
      if (msg) logMsg('sys', '❄ ' + msg);
    }
    fireEvents();
    const cd = SCN.capitalDefense;
    if (cd && G.turn === cd.turn && G.cities.find(c=>c.name===cd.city)?.owner==='S')
      logMsg('sys', cd.announce);
    for (const [t,kind,name] of SOV_SCHEDULE){
      if (t === G.turn){
        const sd = KINDS[kind].side;                   // schedules can reinforce either side
        const spot = deploySpots(sd)[0];
        if (spot){
          const u = makeUnit(kind, name, spot[0], spot[1]);
          G.units.push(u);
          logMsg(sd==='G'?'l-g':'l-s', `${flag(sd)} ${name} (${KINDS[kind].label}) arrives at ${cityAt(spot[0],spot[1])?.name||'the front'}.`);
        }
      }
    }
    for (const [t,name,str,sd] of SOV_AIR_SCHEDULE){
      if (t === G.turn){
        const side2 = sd || 'S';
        G.air.push(makeAir(side2, name, str));
        logMsg(side2==='G'?'l-g':'l-s', `${flag(side2)} ✈ ${name} reaches the front.`);
      }
    }
    refreshSupply();
    startPhase('G');
  }
}

/* ============================ VICTORY ============================ */
function axisVP(){
  return G.cities.filter(c => c.vp>0 && c.owner==='G').reduce((a,c)=>a+c.vp,0);
}
function checkSuddenDeath(){
  if (G.over) return;
  const sd = SCN.sudden;
  if (sd.axisCities && sd.axisCities.every(n => G.cities.find(c=>c.name===n)?.owner==='G')){
    endGame('axis-sudden'); return;
  }
  if (unitsOf('G').length < (sd.minAxisUnits ?? 5)){
    endGame('soviet-sudden'); return;
  }
}
function endGame(sudden){
  if (G.over) return;
  G.over = true;
  const vp = axisVP();
  let title, text;
  if (sudden==='axis-sudden'){
    title = SCN.sudden.axisTitle; text = SCN.sudden.axisText;
  } else if (sudden==='soviet-sudden'){
    title = SCN.sudden.sovTitle; text = SCN.sudden.sovText;
  } else {
    for (const [min,t,x] of VICTORY_TIERS){ if (vp >= min){ title=t; text=x; break; } }
  }
  G.result = {title, text, vp};
  logMsg('sys', `CAMPAIGN OVER — ${title}`);
  if (typeof onGameOver === 'function') onGameOver();
}

/* ============================ AI ============================ */
/* The AI plans ONE action at a time so the browser can animate each step.
   aiPlanAction(side) -> {type:'move'|'attack'|'hold', ...} or null when done. */

let dfCache = {};
let threatCache = {};
function clearAICache(){ dfCache = {}; threatCache = {}; }

/* ---- OPPONENT-RESPONSE AWARENESS (the anti-human core) ----
   AI-vs-AI tuning makes the AI good against a passive mirror; a human is
   adversarial and hunts blunders. So before committing a unit to a hex, the AI
   asks "where can the enemy hit me next turn?" — a threat field over the board.
   It models where the foe could concentrate fire or close a pocket, and steers
   units away from being cheaply destroyed or encircled by a thinking opponent. */
function enemyReach(f){
  // cheap terrain-only movement flood for a foe unit; conservative — it ignores
  // my units as blockers, since I may move them out of the way before its turn
  const mp = KINDS[f.kind].mp + (generalOf(f)?.mp || 0);
  const out = new Set([keyOf(f.x,f.y)]);
  const best = new Map([[keyOf(f.x,f.y),0]]);
  const heap = makeHeap(); heap.push(0,f.x,f.y);
  while (heap.size()){
    const [c,x,y] = heap.pop();
    if (c > (best.get(keyOf(x,y)) ?? 1e9)) continue;
    for (const [nx,ny] of neighbors(x,y)){
      if (!passable(nx,ny)) continue;
      const nc = c + effTerrain(nx,ny).move;
      if (nc > mp) continue;
      if (nc < (best.get(keyOf(nx,ny)) ?? 1e9)){ best.set(keyOf(nx,ny),nc); out.add(keyOf(nx,ny)); heap.push(nc,nx,ny); }
    }
  }
  return out;
}
/* Threat TO `side`: for each hex, how much enemy attack power can strike it next
   turn and how many distinct enemy units (≥3 ⇒ encirclement risk). Cached per
   AI sub-phase — enemy positions don't change while I move (recomputed on kills
   via clearAICache). */
function threatField(side){
  if (threatCache[side]) return threatCache[side];
  const power = new Map(), count = new Map();
  for (const f of unitsOf(enemyOf(side))){
    if (KINDS[f.kind].hq) continue;
    const atk = KINDS[f.kind].atk * (f.str/10) * (generalOf(f)?.atk || 1);
    const hit = new Set();
    for (const k of enemyReach(f)){                       // a foe here threatens its neighbours
      const [x,y] = k.split(',').map(Number);
      for (const [nx,ny] of neighbors(x,y)) if (passable(nx,ny)) hit.add(keyOf(nx,ny));
    }
    for (const k of hit){ power.set(k,(power.get(k)||0)+atk); count.set(k,(count.get(k)||0)+1); }
  }
  return threatCache[side] = {power, count};
}
/* The danger of a unit ending at (x,y). The thing a human exploits is LOCAL
   INFERIORITY — concentrating more attackers on a hex than the AI can support,
   then encircling — not merely being near the enemy. So the penalty is how
   badly the unit would be OUTNUMBERED there, net of friendly support and good
   ground. A supported line position, or an objective worth holding, costs
   nothing: the AI holds its front but won't leave a lone unit in a kill-sack. */
function threatPenalty(u, x, y, offensive){
  const sk = aiSkill(u.side);
  if (sk === 0) return 0;
  const c = cityAt(x,y);
  if (c && c.owner===u.side && c.vp>0) return 0;          // never abandon your own objective
  const tf = threatField(u.side), k = keyOf(x,y);
  const tc = tf.count.get(k) || 0;
  if (tc < 2) return 0;                                   // a single threat is just the front line
  let support = 0;                                        // friends who'd fight alongside here
  for (const fr of unitsOf(u.side)) if (fr.id!==u.id && hexDist(x,y,fr.x,fr.y) <= 1) support++;
  const ground = effTerrain(x,y).def + (u.entrench||0)*0.15;
  let outnum = (tc - support - 1) - (ground - 1)*2;       // hills/forts/dug-in shrug it off
  if (outnum <= 0) return 0;
  return outnum * (offensive ? 1.0 : 1.6) * sk;
}

/* Dijkstra distance field TO (tx,ty) for `side`, over terrain move costs.
   Enemy-held hexes are near-walls, enemy ZOC is sticky — paths route around. */
function distField(side, tx, ty){
  const ck = side + ':' + tx + ',' + ty;
  if (dfCache[ck]) return dfCache[ck];
  const foe = enemyOf(side);
  const foeZOC = computeZOC(foe);
  const occ = {};
  for (const u of G.units) occ[keyOf(u.x,u.y)] = u.side;
  const f = new Map([[keyOf(tx,ty), 0]]);
  const heap = makeHeap(); heap.push(0,tx,ty);
  while (heap.size()){
    const [c,x,y] = heap.pop();
    if (c > (f.get(keyOf(x,y)) ?? 1e9)) continue;
    for (const [nx,ny] of neighbors(x,y)){
      if (!passable(nx,ny)) continue;
      const k = keyOf(nx,ny);
      let step = TERRAIN[terrainAt(nx,ny)].move;
      if (occ[k]===foe) step += 12;
      else if (foeZOC.has(k)) step += 1.5;
      const nc = c + step;
      if (nc < (f.get(k) ?? 1e9)){ f.set(k,nc); heap.push(nc,nx,ny); }
    }
  }
  dfCache[ck] = f;
  return f;
}

function adjacentEnemies(u){
  const out = [];
  for (const [nx,ny] of neighbors(u.x,u.y)){
    const t = unitAt(nx,ny);
    if (t && t.side !== u.side) out.push(t);
  }
  return out;
}
/* naval gunnery: units with a range stat (battleships) attack at distance */
function attackRange(u){ return KINDS[u.kind].range || 1; }
function enemiesInRange(u){
  const r = attackRange(u);
  if (r <= 1) return adjacentEnemies(u);
  return unitsOf(enemyOf(u.side)).filter(t => hexDist(u.x,u.y,t.x,t.y) <= r);
}
function nearestEnemyDist(u){
  let d = 99;
  for (const t of unitsOf(enemyOf(u.side))) d = Math.min(d, hexDist(u.x,u.y,t.x,t.y));
  return d;
}

/* ---- air missions at the start of an AI phase ---- */
function aiAir(side){
  for (const au of airOf(side)){
    if (au.mission !== 'ready') continue;
    const myTotal  = airOf(side).reduce((a,p)=>a+p.str,0);
    const foeTotal = airOf(enemyOf(side)).reduce((a,p)=>a+p.str,0);
    // badly outmatched in the air: keep one group on defensive patrol
    if (foeTotal > myTotal*1.5 && foeTotal > 4 &&
        !airOf(side).some(p=>p.mission==='patrol')){ setPatrol(au); continue; }
    if (airWxMul(side) < 0.5) continue;               // grounded by winter: rest & repair
    if (au.str <= 3) continue;                        // too mauled to fly: repair
    let best=null, bestS=1;                           // only fly if it's worth it
    for (const t of strikeTargets(side)){
      let s = t.str*0.3 + t.entrench*1.2 + (t.oos?2:0);
      const adjMine = neighbors(t.x,t.y).filter(([x,y])=>{const u=unitAt(x,y);return u&&u.side===side;}).length;
      s += adjMine*2;                                 // soften what we're about to assault
      if (adjMine===0) s -= 3;
      if (KINDS[t.kind].carrier) s += 6;              // enemy flattops are always worth a strike
      if (KINDS[t.kind].sym==='tr') s += 3;           // so are loaded transports
      const c = cityAt(t.x,t.y);
      if (c && c.vp>0 && c.owner!==side) s += 1.5;
      if (s > bestS){ bestS=s; best=t; }
    }
    if (best) airStrike(au, best);
  }
}

/* ---- economy: spend PP at the start of an AI phase ---- */
function aiSpend(side){
  // the winter question: insurance for gains worth holding — if there's cash to spare
  if (side==='G' && G.winterGear === 'pending')
    decideWinterGear(G.pp.G >= SCN.winterQuestion.cost + 4 && axisVP() >= 5);
  aiAir(side);
  // 1. reinforce hurt units (cheap, in the rear first)
  const mine = unitsOf(side).slice().sort((a,b)=>
    (KINDS[b.kind].cost - KINDS[a.kind].cost) || (a.str - b.str));
  for (const u of mine){
    if (u.str <= KINDS[u.kind].maxStr - 3){
      const r = canReinforce(u);
      if (r && (nearestEnemyDist(u) > 1 || u.str <= 4)) doReinforce(u);
    }
  }
  // 2. deploy fresh formations
  let guard = 0;
  while (guard++ < 6){
    const spots = deploySpots(side);
    if (!spots.length) break;
    let kind = null;
    if (side==='S'){
      if (G.pp.S >= 12 && unitsOf('S').filter(u=>u.kind==='s_tank').length < 5 && G.turn>=8) kind='s_tank';
      else if (G.pp.S >= 8) kind='s_inf';
      else if (G.pp.S >= 4 && G.turn >= 4) kind='s_mil';
    } else {
      if (G.pp.G >= 22 && unitsOf('G').filter(u=>u.kind==='g_pz').length < 5) kind='g_pz';
      else if (G.pp.G >= 16 && unitsOf('G').length < 15) kind='g_inf';
    }
    if (!kind) break;
    if (!doDeploy(side, kind, spots[0][0], spots[0][1])) break;
  }
  aiAirBuild(side);                          // spend any leftover air surplus last
}

/* ---- attack choice shared by both AIs ---- */
function bestAttack(u, minRatio){
  let best = null, bestU = -1e9;
  if (KINDS[u.kind].carrier) minRatio += 0.6;   // carriers don't brawl unless it's a massacre
  for (const t of enemiesInRange(u)){
    const p = previewCombat(u, t);
    const wouldDestroy = p.defLoss >= t.str;
    const noRetreat = p.retreat && !retreatHex(t, u);
    let ok = p.ratio >= minRatio
          || (wouldDestroy && p.ratio >= minRatio-0.25)
          || (t.oos && p.ratio >= minRatio-0.2)
          || (noRetreat && p.ratio >= minRatio-0.2);
    if (!ok) continue;
    const sk = aiSkill(u.side);
    let util = p.defLoss*1.6 - p.atkLoss + (wouldDestroy ? 6+2*sk : 0) + (noRetreat?4:0)
             + (t.oos?2:0) + (cityAt(t.x,t.y)?1:0) + p.ratio
             + (t.str<=4 ? sk*1.5 : 0);                 // focus fire: finish off the weakened
    if (sk > 0){
      // don't trade into a hex where the human destroys my weakened unit next turn
      const tp = threatField(u.side).power.get(keyOf(u.x,u.y)) || 0;
      const afterStr = u.str - p.atkLoss;
      if (!wouldDestroy && afterStr <= 5 && tp > 5) util -= (tp - 5) * (0.4 + 0.3*sk);
      // an isolated enemy (no friends beside it) is easy to finish and exploit
      let efr = 0; for (const [nx,ny] of neighbors(t.x,t.y)){ const q=unitAt(nx,ny); if (q&&q.side===t.side) efr++; }
      if (efr === 0) util += sk*1.5;
    }
    if (util > bestU){ bestU = util; best = t; }
  }
  return best;
}

/* ---- German planner ---- */
/* POSTURE: an army pushes deep only when it has the strength to. >1 means we
   outweigh the enemy (exploit, accept supply risk); <1 means consolidate and
   defend. Computed once per phase — this is what stops the AI from charging
   into encirclement when it should be digging in (e.g. winter '41). */
let aiPostureG = 1;
function computePosture(side){
  if (side !== 'G') return 1.2;
  // scenarios where Germany is the one being invaded say so outright
  if (SCN.gerAI === 'defend') return 0.6;
  // an attacking army digs in only in deep snow — unless it still dominates.
  // (matches 1941–42: summer drives, winter halts, without turning timid just
  //  because the enemy out-numbers it.)
  if (weatherFor(G.turn) === 'snow'){
    const mine = unitsOf('G').reduce((a,u)=>a+u.str,0);
    const foe  = unitsOf('S').reduce((a,u)=>a+u.str,0);
    return mine > foe*1.3 ? 1.0 : 0.6;
  }
  return 1.2;
}
/* threat to a city from whoever it doesn't belong to */
function threatToCity(c){
  const foe = enemyOf(c.owner);
  let t = 0;
  for (const g of unitsOf(foe)) t += (KINDS[g.kind].atk*g.str/10) / Math.pow(hexDist(c.x,c.y,g.x,g.y)+1, 2);
  return t;
}
/* how strongly the enemy holds a hex: its garrison + adjacent defenders */
function enemyStrengthAt(side, x, y){
  const foe = enemyOf(side);
  let s = 0; const on = unitAt(x,y);
  if (on && on.side===foe) s += on.str + KINDS[on.kind].def;
  for (const [nx,ny] of neighbors(x,y)){
    const t = unitAt(nx,ny);
    if (t && t.side===foe) s += t.str*0.6;
  }
  return s;
}
function gerPickTarget(u){
  // on the back foot: rally to the most threatened friendly objective and defend
  if (aiPostureG < 0.9){
    let best=null, bestW=-1e9;
    for (const c of G.cities){
      if (c.owner!=='G' || c.vp===0) continue;
      const w = threatToCity(c)*(c.vp+1)*3 - hexDist(u.x,u.y,c.x,c.y)*0.4;
      if (w > bestW){ bestW=w; best=c; }
    }
    if (best) return best;
  }
  // on the offensive: mass on the SOFT objectives — value up, distance down,
  // defenders down — so the army converges on the weakest valuable point.
  let best=null, bestW=-1e9;
  for (const c of G.cities){
    if (c.owner==='G' || c.vp===0) continue;
    const w = c.vp*3 - hexDist(u.x,u.y,c.x,c.y)*0.9 - enemyStrengthAt('G',c.x,c.y)*0.4;
    if (w > bestW){ bestW=w; best=c; }
  }
  return best || G.cities.slice().sort((a,b)=>b.vp-a.vp)[0];
}

function gerScoreHex(u, x, y, df, isArm, myNet){
  const offensive = aiPostureG >= 1.0;
  let s = -(df.get(keyOf(x,y)) ?? 60) * 2.2;
  s += (effTerrain(x,y).def - 1) * (offensive ? 3 : 6);        // dig into good ground when defending
  const c = cityAt(x,y);
  if (c && c.owner!=='G' && !KINDS[u.kind].noCapture) s += 6 + c.vp*4;   // capture!
  if (c && c.owner==='G' && c.vp>0 && !offensive && !unitAt(x,y)) s += 6;  // garrison our own
  // don't outrun the supply net — fast units on the attack accept a little risk
  // (capturing a city restores supply, so the capture hex is exempt)
  const oosPen = (isArm && offensive) ? 6 : 7;
  if (myNet && !myNet.has(keyOf(x,y)) && !(c && c.owner!=='G')) s -= oosPen;
  let friendsNear = 0, adjEnemy = 0;
  for (const f of unitsOf('G')) if (f.id!==u.id && hexDist(x,y,f.x,f.y)<=2) friendsNear++;
  for (const [nx,ny] of neighbors(x,y)){ const t = unitAt(nx,ny); if (t && t.side==='S') adjEnemy++; }
  if (friendsNear===0) s -= isArm ? 1.5 : 4;                    // infantry keeps a line
  s += lineBonus(u, x, y);                                      // hold an unbroken front (skill-scaled)
  s += gangSetup(u, x, y);                                      // converge force on a shared target
  s -= threatPenalty(u, x, y, offensive);                      // don't step where the enemy can punish you
  if (!offensive && adjEnemy >= 3) s -= 8;                      // when weak, don't walk into a pocket
  // EXPLOITATION: when we hold the initiative, a fast unit in a clean lane
  // (no adjacent enemy) that gets meaningfully closer to its objective pours
  // through the gap. Suppressed on the defensive so we don't over-extend.
  if (isArm && offensive && adjEnemy===0){
    const here = df.get(keyOf(u.x,u.y)) ?? 60, there = df.get(keyOf(x,y)) ?? 60;
    if (there < here - 1) s += 3 + Math.min(5, (here-there)*0.5);   // pour through the gap
  }
  // closing with a weak enemy is good — unless you're a carrier (stand off!)
  for (const [nx,ny] of neighbors(x,y)){
    const t = unitAt(nx,ny);
    if (t && t.side==='S'){
      if (KINDS[u.kind].carrier){ s -= 9; continue; }
      const mock = {...u, x, y};
      const p = previewCombat(mock, t);
      if (p.ratio >= 1.1) s += 2 + Math.min(p.ratio,3);
      else if (p.ratio < 0.7) s -= 2;
    }
  }
  return s;
}

/* does parking a unit at (x,y) cut any Soviet unit out of supply?
   Recomputing enemy supply is expensive, so skip it unless this hex actually
   sits on the enemy's doorstep — you can't pocket anyone from empty ground. */
function cutoffValue(u, x, y){
  let nearFoe = false;
  for (const t of unitsOf('S')) if (hexDist(x,y,t.x,t.y) <= 2){ nearFoe = true; break; }
  if (!nearFoe) return 0;
  const ox=u.x, oy=u.y;
  u.x=x; u.y=y;
  const net = computeSupply('S');
  let cut = 0;
  for (const t of unitsOf('S')) if (!net.has(keyOf(t.x,t.y)) && !t.oos) cut++;
  u.x=ox; u.y=oy;
  return cut;
}

/* proactive gang-up: moving next to an enemy a comrade is already beside sets up
   a combined assault — this is how the AI gathers force on a point like a human
   does, instead of only ganging up when units happen to already be in range. */
function gangSetup(u, x, y){
  const sk = aiSkill(u.side);
  if (sk === 0) return 0;
  const foe = enemyOf(u.side);
  let bonus = 0;
  for (const [nx,ny] of neighbors(x,y)){
    const t = unitAt(nx,ny);
    if (!t || t.side!==foe || KINDS[t.kind].hq) continue;
    for (const [mx,my] of neighbors(t.x,t.y)){          // a friend already on this target?
      const f = unitAt(mx,my);
      if (f && f.side===u.side && f.id!==u.id){ bonus += 1.2*sk; break; }
    }
  }
  return bonus;
}

/* ---- combined assault planner (shared by both sides) ----
   When 2+ friendly units are already in range of the same enemy, coordinate a
   pile-on. Returns the best {type:'combined', ...} action or null. */
function aiBestCombinedAssault(side){
  const foe = enemyOf(side);
  const wx  = weatherFor(G.turn);
  let bestAction=null, bestScore=-1e9;
  for (const def of unitsOf(foe)){
    const ready = unitsOf(side).filter(u =>
      !u.attacked && !KINDS[u.kind].hq &&
      hexDist(u.x, u.y, def.x, def.y) <= attackRange(u));
    if (ready.length < 2) continue;
    ready.sort((a,b) => combatPower(b,def).A - combatPower(a,def).A);
    const lead    = ready[0];
    const helpers = ready.slice(1, 4);
    const pGroup  = previewGroup([lead, ...helpers], def);
    const pSingle = previewCombat(lead, def);
    const minR = skillMinR(side, wx==='snow' ? 1.1 : wx==='mud' ? 1.0 : 0.85);
    if (pGroup.ratio < minR) continue;
    const wouldKill   = pGroup.defLoss >= def.str;
    const singleKills = pSingle.defLoss >= def.str;
    // pile on whenever it's clearly better than going alone — and ALWAYS when the
    // group secures a kill a single unit can't (the human's concentrate-to-destroy)
    if (!(wouldKill && !singleKills) && pGroup.ratio < pSingle.ratio * 1.06 && helpers.length < 2) continue;
    const score = pGroup.ratio*2 + (wouldKill?5:0) + (wouldKill&&!singleKills?4:0)
                + (pGroup.combinedArms?2:0) + helpers.length;
    if (score > bestScore){ bestScore=score; bestAction={type:'combined', lead:lead.id, helpers:helpers.map(h=>h.id), d:def.id}; }
  }
  return bestAction;
}

function aiPlanGerman(){
  aiPostureG = computePosture('G');           // offensive when we outweigh the enemy
  // mass on a single target when multiple German units are already in range
  const combo = aiBestCombinedAssault('G');
  if (combo) return combo;
  const fastK = k => (KINDS[k].sym==='arm' || KINDS[k].fast) ? 0 : 1;
  const order = unitsOf('G').slice().sort((a,b)=> fastK(a.kind) - fastK(b.kind) || a.id-b.id);
  for (const u of order){
    if (u.attacked) continue;
    if (KINDS[u.kind].hq) return aiPlanHQ(u);
    // 1. attack if a good fight is adjacent
    const wx = weatherFor(G.turn);
    const minR = skillMinR('G', wx==='snow' ? 1.45 : wx==='mud' ? 1.3 : 1.05);
    const tgt = bestAttack(u, minR);
    if (tgt) return {type:'attack', a:u.id, d:tgt.id};
    if (u.moved){ u.attacked = true; continue; }
    // 1b. pull a spearhead back before it is encircled (sharper AI saves its army)
    const esc = aiEscape(u);
    if (esc) return esc;
    // 2. otherwise move with purpose
    const isArm = KINDS[u.kind].sym==='arm' || KINDS[u.kind].fast;
    const city = gerPickTarget(u);
    const df = distField('G', city.x, city.y);
    const myNet = computeSupply('G');
    const reach = reachable(u);
    let best=[u.x,u.y], bestS = gerScoreHex(u,u.x,u.y,df,isArm,myNet) + (u.entrench>0?1:0) - 0.5;
    const cand = [...reach.keys()].map(k=>k.split(',').map(Number));
    for (const [x,y] of cand){
      let s = gerScoreHex(u,x,y,df,isArm,myNet);
      if (s > bestS-6 && isArm){
        const cut = cutoffValue(u,x,y);
        s += cut * 5;                                           // panzers love pockets
      }
      if (s > bestS){ bestS=s; best=[x,y]; }
    }
    if (best[0]!==u.x || best[1]!==u.y) return {type:'move', u:u.id, x:best[0], y:best[1]};
    return {type:'hold', u:u.id};
  }
  return null;
}

/* HQs never lead an assault — they shadow the army and flee the front */
function aiPlanHQ(u){
  if (u.moved) return {type:'hold', u:u.id};
  if (nearestEnemyDist(u) >= 4) return {type:'hold', u:u.id};
  const reach = reachable(u);
  let best = [u.x,u.y], bestS = -1e9;
  for (const k of reach.keys()){
    const [x,y] = k.split(',').map(Number);
    let ed = 99; for (const t of unitsOf(enemyOf(u.side))) ed = Math.min(ed, hexDist(x,y,t.x,t.y));
    let fr = 0; for (const f of unitsOf(u.side)) if (f.id!==u.id && hexDist(x,y,f.x,f.y)<=3) fr++;
    const s = ed*2 + fr*1.5 + rearDir(u.side)*x*0.3;           // toward safety & friends & home edge
    if (s > bestS){ bestS = s; best = [x,y]; }
  }
  return (best[0]!==u.x || best[1]!==u.y) ? {type:'move', u:u.id, x:best[0], y:best[1]} : {type:'hold', u:u.id};
}

/* ---- Soviet planner ---- */
function sovThreat(c){
  let t = 0;
  for (const g of unitsOf('G')) t += (KINDS[g.kind].atk * g.str/10) / Math.pow(hexDist(c.x,c.y,g.x,g.y)+1, 2);
  return t;
}
function sovPickCity(u){
  let best=null, bestW=-1e9;
  for (const c of G.cities){
    if (c.owner!=='S' || c.vp===0) continue;
    const w = sovThreat(c)*(c.vp+1)*3 - hexDist(u.x,u.y,c.x,c.y)*0.4;
    if (w > bestW){ bestW=w; best=c; }
  }
  return best || G.cities.slice().sort((a,b)=>b.vp-a.vp)[0];
}

function sovScoreHex(u, x, y, df, myNet){
  let s = -(df.get(keyOf(x,y)) ?? 60) * 1.8;
  s += (effTerrain(x,y).def - 1) * 6;                           // dig into good ground
  if (myNet && !myNet.has(keyOf(x,y))) s -= 7;                  // stay supplied
  const c = cityAt(x,y);
  if (c && c.owner==='S' && c.vp>0 && !unitAt(x,y)) s += 7;     // garrison objectives
  if (c && c.owner==='G' && !KINDS[u.kind].noCapture) s += 8 + c.vp*4;   // retake!
  let adjE = 0, weakest = null;
  for (const [nx,ny] of neighbors(x,y)){
    const t = unitAt(nx,ny);
    if (t && t.side==='G'){ adjE++; if (!weakest || t.str<weakest.str) weakest=t; }
  }
  if (adjE >= 3) s -= 10;                                       // don't walk into a pocket
  else if (adjE === 2) s -= 3;
  s += lineBonus(u, x, y);                                      // hold an unbroken front (skill-scaled)
  s += gangSetup(u, x, y);                                      // converge force on a shared target
  s -= threatPenalty(u, x, y, SCN.sovAI==='attack');          // don't step where the enemy can punish you
  if (KINDS[u.kind].carrier && adjE >= 1) s -= 12;              // carriers stand off and strike
  const wx = weatherFor(G.turn);
  if (wx==='snow' && weakest){
    const mock = {...u, x, y};
    if (previewCombat(mock, weakest).ratio >= 0.95) s += 4;     // winter counterattack
  }
  return s;
}

/* Soviet offensive target picker (used in winter41 and any sovAI:'attack' scenario) */
function sovPickOffensiveTarget(u){
  let best=null, bestW=-1e9;
  for (const c of G.cities){
    if (c.owner!=='G' || c.vp===0) continue;
    const w = c.vp*4 - hexDist(u.x,u.y,c.x,c.y)*0.8 - enemyStrengthAt('S',c.x,c.y)*0.3;
    if (w > bestW){ bestW=w; best=c; }
  }
  return best || sovPickCity(u);
}

function aiPlanSoviet(){
  // mass on a single target when multiple Soviet units are already in range
  const combo = aiBestCombinedAssault('S');
  if (combo) return combo;
  const wx = weatherFor(G.turn);
  const sovOffensive = SCN.sovAI === 'attack';
  for (const u of unitsOf('S')){
    if (u.attacked) continue;
    if (KINDS[u.kind].hq) return aiPlanHQ(u);
    const adj = adjacentEnemies(u);
    // 1. fight: cautious normally, bold in snow or when on the offensive
    const minR = skillMinR('S', wx==='snow' ? 0.9 : (sovOffensive ? 1.15 : 1.5));
    const tgt = bestAttack(u, minR);
    if (tgt) return {type:'attack', a:u.id, d:tgt.id};
    if (u.moved){ u.attacked = true; continue; }
    // 2. escape encirclement (or pull badly hurt units out of the line)
    const danger = adj.length >= 3 || u.oos
                || (u.str <= 3 && adj.length >= 1) || (u.str <= 4 && adj.length >= 2);
    if (danger){
      const reach = reachable(u);
      const net = computeSupply('S');
      let best=null, bestS=-1e9;
      for (const k of reach.keys()){
        const [x,y] = k.split(',').map(Number);
        let s = (net.has(k)?10:0) + rearDir(u.side)*x*0.6;       // fall back toward own supply
        let e=0; for (const [nx,ny] of neighbors(x,y)){ const t=unitAt(nx,ny); if (t&&t.side==='G') e++; }
        s -= e*3;
        s += (effTerrain(x,y).def-1)*3;
        if (s > bestS){ bestS=s; best=[x,y]; }
      }
      if (best && (adj.length>=3 ? true : !net.has(keyOf(u.x,u.y))))
        return {type:'move', u:u.id, x:best[0], y:best[1]};
    }
    // 3. garrisons sit tight; frontline units in good ground dig in
    const onCity = cityAt(u.x,u.y);
    if (onCity && onCity.owner==='S' && onCity.vp>0){ return {type:'hold', u:u.id}; }
    const near = nearestEnemyDist(u);
    if (near <= 2 && (effTerrain(u.x,u.y).def >= 1.15 || u.entrench >= 1) && adj.length < 3){
      return {type:'hold', u:u.id};
    }
    // 4. reserves flow to most threatened objective (or attack target on offensive)
    const city = sovOffensive ? sovPickOffensiveTarget(u) : sovPickCity(u);
    const df = distField('S', city.x, city.y);
    const myNet = computeSupply('S');
    const reach2 = reachable(u);
    let best=[u.x,u.y], bestS = sovScoreHex(u,u.x,u.y,df,myNet) + (u.entrench>0?2:0) + (sovOffensive?0:-0.5);
    for (const k of reach2.keys()){
      const [x,y] = k.split(',').map(Number);
      let s = sovScoreHex(u,x,y,df,myNet);
      // offensive: closing with a weak enemy is extra valuable (mirrors German exploitation)
      if (sovOffensive) for (const [nx,ny] of neighbors(x,y)){
        const t = unitAt(nx,ny);
        if (t && t.side==='G' && t.str <= 5) s += 1.5;
      }
      if (s > bestS){ bestS=s; best=[x,y]; }
    }
    if (best[0]!==u.x || best[1]!==u.y) return {type:'move', u:u.id, x:best[0], y:best[1]};
    return {type:'hold', u:u.id};
  }
  return null;
}

function aiPlanAction(side){
  return side==='G' ? aiPlanGerman() : aiPlanSoviet();
}

function applyAction(a){
  if (!a) return null;
  if (a.type==='hold'){
    const u = G.units.find(t=>t.id===a.u);
    if (u){ u.moved = true; u.attacked = true; }
    return {type:'hold'};
  }
  if (a.type==='move'){
    const u = G.units.find(t=>t.id===a.u);
    if (u && !unitAt(a.x,a.y)){ doMove(u, a.x, a.y); return {type:'move', unit:u}; }
    return {type:'hold'};
  }
  if (a.type==='attack'){
    const att = G.units.find(t=>t.id===a.a), def = G.units.find(t=>t.id===a.d);
    if (att && def){ const ev = resolveCombat(att,def); clearAICache(); return {type:'attack', att, def, ev}; }
    return {type:'hold'};
  }
  if (a.type==='combined'){
    const lead = G.units.find(t=>t.id===a.lead), def = G.units.find(t=>t.id===a.d);
    const helpers = (a.helpers||[]).map(id=>G.units.find(t=>t.id===id)).filter(Boolean);
    if (lead && def){ const ev = resolveCombat(lead, def, helpers); clearAICache(); return {type:'attack', att:lead, def, ev}; }
    return {type:'hold'};
  }
  return null;
}

/* run a full AI phase instantly (used by hotseat-skip & the test harness) */
function aiFullPhase(side){
  clearAICache();
  aiSpend(side);
  let guard = 0, cap = (unitsOf(side).length+2) * 8;
  while (guard++ < cap && !G.over){
    const a = aiPlanAction(side);
    if (!a) break;
    applyAction(a);
  }
}

/* ============================ SAVE / LOAD ============================ */
/* Two independent slots — Arcade and Realistic — so starting (or autosaving)
   a game in one mode never clobbers the other's campaign. A pre-slots save is
   migrated into the slot matching its own scenario. */
const SAVE_KEYS = { arcade:'hoi5-save-arcade-v1', realistic:'hoi5-save-realistic-v1', wawtest:'hoi5-save-wawtest-v1', france:'hoi5-save-france-v1' };
const OLD_SAVE_KEY = 'barbarossa-save-v1';
function saveSlotFor(scnId){ return scnId === 'realistic' ? 'realistic' : scnId === 'wawtest' ? 'wawtest' : scnId === 'france' ? 'france' : 'arcade'; }
function saveKeyFor(scnId){ return SAVE_KEYS[saveSlotFor(scnId)]; }
function serialize(){ return JSON.stringify({G, nextId}); }
function deserialize(json){
  const d = JSON.parse(json);
  loadScenario((d.G && d.G.scenario) || 'barbarossa');               // saves remember their campaign
  G = d.G; nextId = d.nextId;
  if (!G.scenario) G.scenario = SCN.id;
  if (!G.air) G.air = AIR_INIT.map(([sd,n,s]) => makeAir(sd,n,s));   // migrate pre-air saves
  if (SCN.fuel) for (const u of G.units)                            // migrate pre-fuel saves
    if (KINDS[u.kind].fuel && u.fuel == null) u.fuel = FUEL_MAX;
  if (SCN.railhead && !G.railDepth) G.railDepth = {G: RAIL_START, S: RAIL_START}; // pre-rail saves
  refreshSupply();
}
function saveGame(){
  try { if (typeof localStorage!=='undefined' && G) localStorage.setItem(saveKeyFor(G.scenario), serialize()); } catch(e){}
}
function hasSaveSlot(slot){
  try { return typeof localStorage!=='undefined' && !!localStorage.getItem(SAVE_KEYS[slot]); } catch(e){ return false; }
}
function loadSlot(slot){
  try {
    if (typeof localStorage==='undefined') return false;
    const j = localStorage.getItem(SAVE_KEYS[slot]);
    if (!j) return false;
    deserialize(j);
    return true;
  } catch(e){ return false; }
}
function clearSave(){
  try { if (typeof localStorage!=='undefined' && G) localStorage.removeItem(saveKeyFor(G.scenario)); } catch(e){}
}
/* one-time migration of a single-slot save into its proper slot */
function migrateSaves(){
  try {
    if (typeof localStorage==='undefined') return;
    const old = localStorage.getItem(OLD_SAVE_KEY);
    if (!old) return;
    let slot = 'arcade';
    try { const d = JSON.parse(old); slot = saveSlotFor(d.G && d.G.scenario); } catch(e){}
    if (!localStorage.getItem(SAVE_KEYS[slot])) localStorage.setItem(SAVE_KEYS[slot], old);
    localStorage.removeItem(OLD_SAVE_KEY);
  } catch(e){}
}

/* ============================ HOOKS (used by the engine) ============================ */
let onLog = null, onCityTaken = null, onGameOver = null, onAirStrike = null,
    onEvents = null, onWinterDecision = null, onDecision = null, onLevelUp = null;

const WW_DATA = {
  cols:110, rows:120,
  terr:["~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~~.~.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.....~~","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~..~.~.~.~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...~.~","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~......~...~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~....~.........~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~.....~........~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~..~~.............~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.............f......~..~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~..~..........fff........~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~....~........fff.........~~~~~~~~~~~~~~~~~~~~~~~~..~~~~~~~~~~~~~","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...ff....fff.......ff.......~~~~~~~~~~~~~~~~~~~~...~~~~~~~~~~~~","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~..~~...ffffffffff.....fffff........~~~~~~~~~~~~~~~~~~..~~~~~~.~~~~~~","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...~...ffffffffff....fffffff........~~~~~~~~~~~~~~~~~.~~~~~~.~~~~~~~","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~.~....ffffffffff....fffff...........~~~~~~~~....~~~~~~~~~.~..~~....","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hh~.......fffffffff...ffff.............~~~~~~~~...~~~~~~~~....~~.....","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~h~~h........fffffffffffffff...............~~~~~~....~~~~~~............","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hh........fffffffffffffff...............~~~~~~....~~~~..............","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~h......fffffffffffffffff................~~~~~..~~~~~........hhhhhh.","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~h....fffffffffffffffffffff...............~~~~~.~~~~~.........hhhhhh.","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...fffffff..fffffffffffff................~~~~..~~~~........hhhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhh..fffffffffffffffffffffff...............~~~~~..~~~.......hhhhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhh.ffffffffffffffffffffffff~............~~~~~~...........hhhhhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhh.fffffffffffffffffffffffff~~~.........~~~~~~............hhhhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhh..ffffffffffffffffffffffff~~~~.......~~~..~............hhhhhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhh...ff.fffffffffffffffffffff..~~~~~..~~~~.................hhhhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhh.......ffffffffffffffffffff....~~~~~~~~~...................hhhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhh.........fff~~~~fffffffffff....~~~~~~~~~.....................hhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhh.........ff~~~~~~fffffffff.....~~~~~~~~......................hhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhh..........f~~~~~~ffffffff......~~~~~~~~~.....................hhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhh............~~~~~~~ffffffff.......~~..~~~~.....................hhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhh............~~~~~ffffffffff.......~~~...~......................hhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhh..........f~~~~ffffffffff.......~~~...........................hhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhhhhhh......f~~~~ffffffffffff........~~~.........................hhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hh~hhhhhhhh......f~~~ffffffffffffff..ffffff~ff........................hhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhhhhhhhh.....~~~~fffffffffffff..ffffffffff......f.................hhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhhhhhhhhhhh...~~~~~fffffffffffff...fffffff........fffffffff.........hhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhhhhhhhhhh..~~~~~fffffffffffff....fffffff........ffffffffffff.....hhhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhhhhhhhhhhhh..~~~~fffffffffffff....ffffffff........ffffffffffffff...hhhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhhhhhhhhhh..~~~~~ffffffffffffff.ffffffffff........ffffffffffffff....hhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhhhhhhhhhhh..~~~~~~fffffffffffffffffffffffff........fffffffffffffff....hhhhhh","~~~~~~~.~~~~~~~~~~~~~~~~~~~hhhhhhhhhhhhhhhh...~~~~~~fffffffffffffffffffffffff.....fff..ffffffffffffff....hhhh.","~~~~~~~~~~~~~~~~~~~~~~~~~~~h~hhhhhhhhhhhhhh...~~~~~~~fffffffffffffffffffffffff..fffffffffffffffffffff....hhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhhhhhhhhhhhhh..~~~~~~~fffffffffffffffffffffffffffffffffffffffffffffffff..hhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhhhhhhhhhhhhhh.~~~~~~~fffffffffffffffffffffffffffffffffffffffffffffffff..hhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~....hhhh..hhhhhhhh.~~~~~~.fffffff..ffffffffffffffffffffffffffffffffffffffff..hhhhhh","~~~~~~~~~~~~~~~~~.~~~~~~~~~h...hhhhhhhhhhhhhh.~~~~~~ffffffff..ffffffffffffffffffffffffffffffffffffffff.hhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~hh~hhhhhhhhhhhhh.h..~~~~~~fffffff~~~~ffffffffffffffffffffffffffffffffffffff.hhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~hhhhhhhhhhhh.........~~~~~~ffff~~~~~~~~fffffffffffffffffffffffffffffffffff..hhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~...hhhhhhhhh.........f~~~~~~~~~~~~~~~ffffffffffffffffffffffffffffffffffffff.hhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~.....hhh~hh..........~~~~~~~~~~~f~~~fffffffffffffffffffffffffffffffffffffff.hhhhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~.......h~hh..........~~~~~~~~~fffffffffffffffffffffffffffffffffffffffffffff...hhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~.......~hh.........~~~~~~~.~.fff..fffffffffffffffffffffffffffffffffffffffff..hhhhh","~~~~~~~~~~~~~~~~~~~~~~~~~~~~.....~~~h.........~~~~~~~~.~......ffffffffffffffffffffffffffffffffffffffff...hhhhh","~~~~~~~~~~~...~~~~~~~~~~~~~~.....~~~~........~~~~~~~~..~......ffffffffffffffffffffffffffffffffffffff...hhhhhhh","~~~~~~~~.~...~~~~~~~~~~~~~~~~..~~~~~~........~~~~~~~~~~~~.....fffffffffffffffffffffffffffffffffffff..hhhhhhhhh","~~~~~~~~~~...~~~~~~~~~~~~~~~~~~~~~~~~........~~~.~~~~~~~~.....ffffffffffffffffffffffffffffffffffff...hhhhhhhhh","~~~~~~~~.~......~~~~~~~~~~~~~~~~~~.~~~.......~~.~~~~~..~~....fffffffffffffffffffffffffffffffffffffff...hhhhhhh","~~~~~~~~~.......~~~~~~~~~~~~~~~~~~.~~~fffffff.~.~~~~~..~~...fffffffffffffffffffffffffffffffffffff.ffff...hhhhh","~~~~~~~~~~.....~~~~~~~~~~~~~~~~~...~~~fffffff~~~~~~~.....ff.ffffffffffffffffffffffffffffffffffff..fffff..hhhhh","~~~~~~~~.~~....~~~~~~~~~~~~~~~~~~..~~~~fffff~~~~~~~~....ffffffffffffffffffffffffffffffffffffffff..fffff..hhhhh","~~~~~~~~~~.....~~~~~~~~~~~~~~~~~..f.~~ffffff~~~~~~~~...ffffffffffffffffffffffffffffffffffffffffff.fffff...hhhh","~~~~~~~~~~~~...~~~~~~~~~~~~~~~~~..f~~~fff~~~~~~~~~~~..fffffffffffffffffffffffffffffffffffffffffff..f...f..hhhh","~~~~~~~~~~......~~~~~~~~~~~~~~~~..~~fffff~~~~~~~~~~~ffffffffffffffffffffffffffffffff...ffffffffff......f..hhhh","~~~~~~~.~~~.....~~~~~~~~~~~~~~~~..ffff~~~~~~~~~~~~~~fffffffffffffffffffffffffffffffff..ffffffffffffff....hhhhh","~~~~~~....~......~~~~~~~~~~~~~~~...~~ff~~~~~~~~~~~~~ffffffffffffffffffffffffffffffffff.ffffffff.........hhhhhh","~~~~~.....~~~....~~~~~~~~~~~~~~~~..~~~~~~~~~~~ff~~ffffffffffffffffffffffffffffffffffff.................hhhhhhh","~~~~~.....~~~.....~~~~~~~~~~~~~~....~~f~~~~~fffffffffffffffffffffffffffffffffffffffff..................hhhhhhh","~~~......~~~~~.....~~~~~~~~~~~~~~...~ffff~fffffffffffffffffffffffffffffffffffffff.......................hhhhhh","~~~......~~~~~.....~~~~~~~~~~~.~..fffffffffffffffffffffffffffffffffffffffffffffff........................hhhhh","~~~~.....~~~~.~....~~~~~~~~~......fffffffffffffffffffffffffffffffffffffffffffffff........................hhhhh","~~~~.....~~~.......~~~~~~~~.......fffffffffffffffffffffffffffffffffffffffffffffff........................hhhhh","~~~.~....~~~..........~~~~..........fffffffffffffffffffffffffffffffffffffffffffff........................hhhhh","~~~......~~~.........~~~~~...........ffffffffffffffffffffffffffffffffffffffffffff.......................hhhhhh","~~~...~~~~~..........~~~~............ffffffffffffffffffffffffffffffffffffffffffff.......................hhhhhh","~~~~.~~~~~~~~.~.....~~~~.............ffffffffffffffffffffffffffffffffffffffffffff......................hhhhhhh","~~~~~~~~~~~~~~.......~~..............fffffffffffffffffffffffffff.fffffffffffffffff....................hhhhhhhh","~~~~~~~~~~~~........~.................fffffffffffffffffffffffff....ffffffffffffffff..................hhhhhhhhh","~~~~~~~~~~~..~~~~~~~~................ffffffffffffffffffffffffff....fff...ffffffffff...................hhhhhhhh","~~~~~~~~~~.~~~~~~~~~~...............ffffffffffffffff....fffffff...ffff....fffffff......................hhhhhhh","~~~~~~~~~~~~~~~~~~~................ffffhhffffffffhhhhhhh...fffff.fffff....ffffff........................hhhhhh","~~~~~~~~~~~~~~~~.~~................ffffhhhhhhfffhhhhhhhh....ff....ffff......ffff........................hhhhhh","~~~~~~~~~~~~~~~~....................ffhhhhhhhfffhhhhhhhhhhh.............................................hhhhhh","~~~~~~~~~~~~..~.~..................fhhhhhhhhhhffhhhhh..hhhhh............................................hhhhhh","~~~~~~~~~~~~.............hhhh......hhhhhhhhhhhffhhhhf..hhhhh............................................hhhhhh","~~~~~~~~~~~~.............hhhhhh....hhhhhhhhhhhhhhhhhh..hhhhh............................................hhhhh.","~~~~~~~~~~~~~~~............hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh................................................","~~~~~~~~~~~~~~~~...........hhhhhhhhhhhf.ffhhhhhhhhhhhhhhhhhhhh.................~~.............................","~~~~~~~~~~~~~~~~...........hhhhhhhhhhh...fhhhhhhhhhhhhhhhhhhhhh.............~~~...................~~~~........","~~~~~~~~~~~~~~~~~..........hhhhhhhhhhhh.fhhhhhhhhhhhhhhhhhhhhh.....~~.....~~~~~.................~~~~~~........","~~~~~~~~~~~~~~~~~.........hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh......~~~~~~..~~~~.................~~~~~~~........","~~~~~~~~~~~~~~~~~........hhhhhhhhhhhhh~~hhhhhhhhhhhhhhhhhhhh.....~~~~~....~~~~................~~~~~~~~........","~~~~~~~~~~~~~~~~~.h......hhhhhhhhhhhhh~~h~hhhhhhhhhhhhhhhhhh.....~~~~~~~.....................~~~~~~...........","~~~~~~~~~~~~~~~~~.h.......hhhhhhhhhhhh~~~hhhhhhhhhhhhhhhhhhh....~~~~~~~~.~~~~~.......hhh....~~~~~~~...........","~~~~~~~~~~~~~~~~~.hhhh....hh..hh~hhhhh~~~~~hhhhhhhhhhhhhhhhhhh..~~~~~~~~~~~~~~~~.....hhhhhhhh~~~~~............","~~~~~~~~~~~~~~~~~hhhhhhh..h....h~~~hhhh~~~~hhhhhhhhhhhhhhhhhhh..~~~~~~~~~~~~~~~~~...hhhhhhhhh~~~~~~...........","~~~~~~.....~~~~~.hhhhhhh......~~~~~..hhh~~~~~hhhhhhhhhhhhhhh....~~~~~~~~~~~~~~~~~...hhhhhhhhhh~~~~~...........","~~~~.....hhh......hhhhhh~~~~~~~~~~~.hhhhh~~~~~hhhhhhhhhh.......~~~~~~~~~~~~~~~~~~~~hhhhhhhhhh~~~~~~~..........","~~~~~..hhhhhh...........~~~~~~~~~.~~hhhhh~~~~~~hhhhhhhhhh.....~~~~~~~~~~~~~~~~~~~~~~hhhhhhhhhh~~~~~~~~........","~~~~~.hhhhhhhh...hhhhhhh~~~~~~~~..~~~hhhhh~~~~~~~hhhhhhhh......~~~~~~~~~~~~~~~~~~~~~hhhhhhhhhh.~~~~~~.........","~~~~~..hhhhhhhhhhhhhhhhh~~~~~~~~~.~~~~hhhhhh~~~~~~hhh..hhh.....~~~~~~~....~~~~~~~~~~hhhhhhhhhhh~~~~~~.~~......","~~~~~...hhhhhhhhhhhhhh~~~~~~~~~~~~~~~~~hhhhh~~~~~hhh............~~~~~hh..hhh~~~~~~~~hhhhhhhhhhhh~~~~~~~~......","~~~~~....hhhhhhhhhhh~~~~~~~~~~~~~h~~~~~~~hhhhh~~~hhh..........~~~hhhhhhhhhhhhh.~hhhhhhhhhhhhhhhh~~~~~~~~~.....","~~~~~....hhhhhhhhhhh~~~~~~~~~~~~hh~~~~~~~~hhhh.~~.....~.~~~~~~~~hhhhhhhhhhhhhhh.hhhhhhhh...hhhhhh.~~~~........","~~~~~......hhhhhhh.~~~~~~~~~~~~~hh~~~~~~~~~hh~~.~~....~~.~~~...hhhhhhhhhhhhhhhhhhhhhhhh.....hhh..~~~~~........","~~~~~.......hhhhhh~~~~~.~~~~~~~~hh~~~~~~~~~~h~~~~~.....~~~~~...hhhhhhhhhhhhhhhhhhhhhhhh.....hhh.~~~~~~~.......","~~~~........hhhhhh~~~~~~~~~~~~~~hh~~~~~~~~~~..~~~~~.....~~~.~..hhhhhhhhhhhhhhhhhhhhhhhh......h..~~~~~~~.......","~~~~.....hhhhhhhhh.~~~~~~~~~~~~~~~~~~~~~~~~~.~~~~~~~...~~~~~~..hhhhhhhhhhhhhhhhhhhhhhhh.........~~~~~~~~......","~~~~~....hhhhhhhh.~~~~~~~~~~~~~~~~~~~~~~~~~~.~~~~~~~~~~.~~~~..hh.......hhhhhhhhhhhhhhhhh........~~~~~~~.......","~~~~~....hh.hhhh..~~~~~~~~~~~~~~~~~~~~.....~~~~~~~~~...~.~~~~~h..........hhhhhhhhhhhhhhh........~~~~~~~.......","~~~~~....h..hhhh~~~~~~~~~~~~~~~~~~~~~~~~...~~~~~~~~~~...~~~~~~......................hhhh..........~~~~~~......","~~~~~~~~~....hhh~~~~~~~~~~~~~..~...~~~~~~..~~~~~~~~~~~.~~~~~~~~......................hhh..........~~~~~~......","~~~~~~~~~..~~~~~~~~~~...............~~~~~~~~~~~~~~~~~~~~~~~~~~~~~..~~....~~...........h.......................","~~~~~~~~~~~~~~~~~~~................~~~~~~~~~~~~~~~~~~~~~~~~~~~.~~~~~~~~~~~~...................................","~~~~~~~~~..~~~~~~...................~~~~~~~~~~~~~~~~~~~~~~~~~.~~~~~~~~~~~~~...................................","~~~~~~~~~......~....................~~~~~~~~~~~~~~~~~~~~~~..~~~~~~~~~~..~~~...................................","~~~~~~~~~...........................~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...................................","~~~~~~~~...........................~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...................................","~~~~~~~............................~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~...................................","~~~~~................................~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~....................................","~~~~~....................................~~~~~~~~~~~...~~~~~~~~~~~~~~~~~~~....................................","~~~~.......................................~~~~~~~~....~~~~~~~~~~~~~~~~~~~...................................."],
  owner:[".........................................................M..M.M........................................CCCCC..",".........................................................MM.M.M.M.......................................CCC.C.",".......................................................M.MMMMMM.MMM...........................................","......................................................MMMM.MMMMMMMMM..........................................","...................................................M.MMMMM.MMMMMMMM...........................................","................................................MM..MMMMMMMMMMOMM.............................................","................................................MMMMMMMMMMMMOOOOMMMC.CC.......................................","..............................................MM.MMMMMMMMMMMOOOOOMCCCC........................................","..............................................MMMM.MMMMMMMMOOOOOOMCCCCC........................CC.............","...............................................MMMMMOMMMMMMOOOOOMCCCCCCCCCC....................CCC............","..........................................MM..MMMMMNOOMMMMMOOOOOCCCCCCCCCCCCC..................CC......C......","..........................................MMM.MMMMMNOOMMOMOOOOOOCCCCCCCCCCCCCC.................C......C.......","...........................................M.MMNMMNNNOOOOOOOOOOOCCCCCCCCCCCCCCC........CCCC.........C.CC..CCCC",".........................................MM.MMMNNNNNNNNOOOOOOOOOCCCCCCCCCCCCCCCC........CCC........CCCC..CCCCC","........................................M..MMMMNNNNNNNNNOOOOOOOOOCCCCCCCCCCCCCCCCC......CCCC......CCCCCCCCCCCC","..........................................MMMNNNNNNNNNNNOOOOOOOOOCCCCCCCCCCCCCCCCC......CCCC....CCCCCCCCCCCCCC","...........................................MMNNNNNNNNNNNOOOOOOOOOOCCCCCCCCCCCCCCCCC.....CC.....CCCCCCCCCCCCCCC","..........................................MMNNNNNNNNNNNNOOOOOOOOOOCCCCCCCCCCCCCCCCC.....C.....CCCCCCCCCCCCCCCC","...........................................MMNNNNNNNNNNNOOOOOOOOOCCCCCCCCCCCCCCCCCCC....CC....CCCCCCCCCCCCCCCC",".........................................MMMMNNNNNNNNNNNOOOOOOOOOCCCCCCCCCCCCCCCCCCC.....CC...CCCCCCCCCCCCCCCC",".........................................MMMNNNNNNNNNNNNNOOOOOOOOCCCCC.CCCCCCCCCCCC......CCCCCCCCCCCCCCCCCCCCC","........................................MMMNNNNNNNNNNNNNOOOOOOOOOCCCCCC...CCCCCCCCC......CCCCCCCCCCCCCCCCCCCCC",".......................................MMMMNNNNNNNNNNNNNOOOOOOOOOCCCCCC....CCCCCCC...CC.CCCCCCCCCCCCCCCCCCCCCC","......................................MMMMNNNNNNNNNNNNNNOOOOOOOOOOCCCCCCC.....CC....CCCCCCCCCCCCCCCCCCCCCCCCCC",".......................................MMMNNNNNNNNNNNNNNNOOOOOOOOOCCCCCCCC.........CCCCCCCCCCCCCCCCCCCCCCCCCCC",".....................................MMMMMNNNNNNNNNNNN....OOOOOOOOCCCCCCC.........CCCCCCCCCCCCCCCCCCCCCCCCCCCC","......................................MMMMNNNNNNNNNNN......OOOOOOOCCCCCCC........CCCCCCCCCCCCCCCCCCCCCCCCCCCCC",".......................................MMNNNNNNNNNNNN......OOOOOOOCCCCCCC.........CCCCCCCCCCCCCCCCCCCCCCCCCCCC",".....................................MMMMNNNNNNNNNNN.......OOOOOOCCCCCCCCC..CC....CCCCCCCCCCCCCCCCCCCCCCCCCCCC",".....................................MMMMNNNNNNNNNNN.....OOOOOOOOOCCCCCCCC...CCC.CCCCCCCCCCCCCCCCCCCCCCCCCCCCC","....................................MMMMMNNNNNNNNNNNN....OOOOOOOOOCCCCCCCC...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...................................MMMMMMNNNNNNNNNNN....OOOOOOOOOOOCCCCCCCCC...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","..................................MM.MMNNNNNNNNNNNNN...OOOOOOOOOOOOCCCCCCCCCC.CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","..................................MMMMNNNNNNNNNNNNN....OOOOOOOOOOOCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...............................MMMMMMMNNNNNNNNNNN.....OOOOOOOOOOOOOCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","................................MMMMMMNNNNNNNNNN.....OOOOOOOOOOOOOOOCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","..............................MMMMMMMMNNNNNNNNNN....OOOOOOOOOOOOOOOOCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...............................MMMMMMMNNNNNNNNN.....OOOOOOOOOOOOOOOOCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",".............................MMMMMMMMMNNNNNNNN......OOOOOOOOOOOOOOOOCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",".......1...................MMMMMMMMMMMNNNNNNNN......OOOOOOOOOOOOOOOCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...........................M.MMMMMMMMMNNNNNNNN.......OOOOOOOOOOOOOCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...........................MMMMMMMMMMMNNNNNNNN.......OOOOOOOOOOOOOCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...........................MMMMMMMMMMMMNNNNNNN.......OOOOOOOOOOOOCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...........................MMMMMMMMMMMNNNNNNNN......OOOOOOOOOOOOCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",".................E.........MMMMMMMMMMMNNNNNNNN......OOOOOOOOOOOCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...........................MM.MMMMMMMMMNNNNNNNN......OOOOOOO....CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...........................MMMMMMMMMMMMNNNNNNNNN......OOOO........CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...........................MMMMMMMMMMMNNNNNNNNNNN...............CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...........................MMMMMMMM.MNNNNNNNNNNN...........X...CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...........................MMMMMMMM.MNNNNNNNNNNN.........XXXXXXCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","............................MMMMMMM.NNNNNNNNNNN.......X.XXXXXXCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","............................MMMMM...NNNNNNNNNN........X.XXXXXXCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...........EEE..............MMMMM....NNNNNNNN........XX.XXXXXXCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","........E.EEE................MM......NNNNNNNN............XXXXXCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","..........EEE........................NNNNNNNN...N........YYYXXCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","........E.EEEEEE..................L...NNNNNNN..N.....YY..YYYYYCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",".........EEEEEEE..................L...NNNNNNNN.N.....YY..YYYYYYCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","..........EEEEE.................LLL...NNNNNNN.......YYYYYYYYYYCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","........E..EEEE..................LL....NNNNN........YYYYYYYYYYYCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","..........EEEEE.................LLLL..NNNNNN........YZZZZZYYYYYCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","............EEE.................LLL...LNN...........ZZZZZZZZYYCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","..........EEEEEE................LL..LLLNN...........ZZZZZZZZZCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",".......W...EEEEE................LLLLLL..............ZZZZZZZZZCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","......WEEE.EEEEEE...............LLL..LL.............CCZZZZZZCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",".....WEEEE...EEEE................AA...........FF..CCCCCZZZZCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",".....WEEEE...EEEEE..............AAAA..A.....FFFFFFFFFFFZZZZCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...WWWWWW.....EEEEE..............AAA.AAAA.FFFFFFFFFFFFFFZZCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...WWWWWW.....EEEEE...........A.AAAAAAAAAFFFFFFFFFFFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","....WWWWW....E.EEEE.........IIAAAAAAAAAAAFFFFFFFFFFFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","....WWWWW...EEEEEEE........IIIAAAAAAAAAAAFFFFFFFFFFFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...W.WWWW...EEEEEEEEEE....IIIAAAAAAAAAAAAAFFFFFFFFFFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...WWWWWW...EEEEEEEEE.....IIIIAAAAAAAAAAAAFFFFFFFFFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...WWW.....EEEEEEEEEE....IIIIAAAAAAAAAAAAAFFFFFFFFFFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","....W........E.EEEEE....IIIIAAAAAAAAAAAAAAFFFFFFFFFFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","..............EEEEEEE..JJJJJAAAAAAAAAAAAAAFFFFFFFFFFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","............EEEEEEEE.DDJJJJJAAAAAAAAAAAAAAAFFFFFFFFFFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...........EE........DDDJJJJJAAAAAAAAAAAAAAAAFFFFFFFFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","..........E..........DDDDJJJAAAAAAAAAAAAAAAAAAAFFFFFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...................DDDDDDDDJAAAAAAAAAAAAAAAAAAAAFFFFFFFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","................D..DDDDDDDDDDAAAAAAAAAAAAAAAAAAA00FF0FFCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","................DDDDDDDDDDDDDDDAAAAAAAAAAAAAAAA0000000CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","............DD.D.DDDDDDDDDDDDDDAAAAAAAAAAAAAAA00000000CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","............DDDDDDDDDDDDDDDDDDDAAAAAAAAAAAAAA000000PPPCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","............DDDDDDDDDDDDDDDDDDDAAAAAAAAAAAAAAA00PPPPPPPQQQCQQQCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","...............DDDDDDDDDDDDDDDDKKKAAAAAAAAAAAPPPPPPPPQQQQQQQQQCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC","................DDDDDDDDDDDDDKKKKKAAAAAAAAAAAPPPPPPPPQQQQQQQQQQCCCCCCCCCCCCCCCC..CCCCCCCCCCCCCCCCCCCCCCCCCCCCC","................DDDDDDDDDDDDDKKKKKKBBBAAAAAASPPPPPPPPQQQQQQQQQQCCCCCCCCCCCCC...CCCCCCCCCCCCCCCCCCC....CCCCCCCC",".................DDDDDDDDDDDKDKKKBBBBBBBSSSSSPPPPPPPQQQQQQQQQQQCCCC..CCCCC.....CCCCCCCCCCCCCCCCC......CCCCCCCC",".................DDDDDDDDDDDDDBBBBBBBBBBSSSSSSPPPSSQQQQQQQQQQQQCCC......CC....CCCCCCCCCCCCCCCCC.......CCCCCCCC",".................DDDDDDDDDDDDDBBBBBBBB..SSSSSSSSSSSSQQQQQQQQQQQCC.....CCCC....CCCCCCCCCCCCCCCC........CCCCCCCC",".................DDDDDDDDDDDDBBBBBBBBB..S.SSSSSSSSSSSQQQQQQQQQQQQ.......CCCCCCCCCCCCCCCCCCCCC......CCCCCCCCCCC",".................DDDDDDDDDDDDDBBBBBBBB...SSSSSSSSSSSSQQQQQQQQQQQ........C.....CCCCCCCCCCCCCC.......CCCCCCCCCCC",".................DDDDDDDDDDDDDBB.BBBBB.....SSSSSSSSSSSQQQQQQQQQQ................CCCCCCCCCCCCC.....CCCCCCCCCCCC",".................DDDDDDDDDDDDDDB...BBBB....SSSSSSSSSSSRQQQQQRRRQ.................CCCCCCCCCCCC......CCCCCCCCCCC","......GGGGG.....DDDDDDDDDDDDDD.....BBBBB.....SSSSSSSSSRRRRRRRRRR.................CCCCCCCCCCCCC.....CCCCCCCCCCC","....GGGGGGGGGGGGGDDDDDDD...........BBBBBB.....SSSSSSSSSRRRRRRRR....................CCCCCCCCCC.......CCCCCCCCCC",".....GGGGGGGGGGGGGGGGDDD.........D..BBBBB......SSSSSSSRRRRRRRR......................CCCCCCCCCC........CCCCCCCC",".....GGGGGGGGGGGGGGGGGGG........DD...BBBBB.......VVSSSRRRRRRRRR.....................UUCCCCCCCCC......CCCCCCCCC",".....HHHHGGGGGGGGGGGGGGG.........D....BBBBBB......VSSSSRRRRRUUU.......UUUU..........UUUUCCCCCCC......C..CCCCCC",".....HHHHGGGGGGGGGGGGG.................BBBBB.....VVSSSSTTTRRTUUU.....UUUUUUU........UUUUUCCCCCCC........CCCCCC",".....HHHGGGGGGGGGGGG.............B.......BBBBB...VVSSTTTTTTTUU...UUUUUUUUUUUUUU.UUUUUUUUUUCCCCCC.........CCCCC",".....HHHGGGGGGGGGGGG............BB........BBBBB..VVVTT.T........UUUUUUUUUUUUUUUUUUUUUUUUUUUCCCCCCC....EECCCCCC",".....HHHGGGGGGGGGGG.............BB.........BB..B..VTTT..T...UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUCCCCC.....EEEEEEEE",".....HHGGGGGGGGGGG.....G........BB..........B.....TTTTT.....UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUCCCC.......EEEEEEE","....HHHHGGGGGGGGGG..............BB..........BB.....TTTTT...T.UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUCCC.......EEEEEEE","....HHHGGGGGGGGGGGG.........................B.......TTT......UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUCC........EEEEEE",".....HHHGGGGGGGGGG..........................B..........T....UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU.......EEEEEEE",".....HHGGGGGGGGGGG....................BBBBB.........TTT.T.....UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU.......EEEEEEE",".....HHGGGGGGGGG........................BBB..........TTT......UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU......EEEEEE",".........GGGGGGG.............DD.DDD......BB...........T........UUUUUUUUUUUUUUUUUUUDDDEEEEEEEEEEEEE......EEEEEE",".........GG..........DDDDDDDDDDDDDDD.............................UU..UUUU..UDDDDDDDDEEEEEEEEEEEEEEEEEEEEEEEEEE","...................DDDDDDDDDDDDDDDD...........................T............UDDDDDDDDEEEEEEEEEEEEEEEEEEEEEEEEEE",".........DD......DDDDDDDDDDDDDDDDDDD.........................T.............DDDDDDDDDEEEEEEEEEEEEEEEEEEEEEEEEEE",".........DDDDDD.DDDDDDDDDDDDDDDDDDDD......................TT..........11...DDDDDDDDDEEEEEEEEEEEEEEEEEEEEEEEEEE",".........DDDDDDDDDDDDDDDDDDDDDDDDDDD.......................................DDDDDDDDEEEEEEEEEEEEEEEEEEEEEEEEEEE","........DDDDDDDDDDDDDDDDDDDDDDDDDDD........................................DDDDDDDEEEEEEEEEEEEEEEEEEEEEEEEEEEE",".......DDDDDDDDDDDDDDDDDDDDDDDDDDDD........................................DDDDDDEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",".....DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD.....................................DDDDDDEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE",".....DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDBBBB...........BBB...................DDDDDEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE","....DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDBBBBBBB........BBBB...................DDDDEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"],
  nations:[{"c":"A","key":"GER","name":"Germany","col":"#7a7a6a","fac":"axis","cap":"Berlin"},{"c":"B","key":"ITA","name":"Italy","col":"#3f8a6f","fac":"axis","cap":"Rome"},{"c":"C","key":"SOV","name":"Soviet Union","col":"#c0392b","fac":"comintern","cap":"Moscow"},{"c":"D","key":"FRA","name":"France","col":"#3f6fb0","fac":"allies","cap":"Paris"},{"c":"E","key":"ENG","name":"United Kingdom","col":"#b6985a","fac":"allies","cap":"London"},{"c":"F","key":"POL","name":"Poland","col":"#c9b13a","fac":"allies","cap":"Warsaw"},{"c":"G","key":"SPA","name":"Spain","col":"#cf7a36","fac":"neutral","cap":"Madrid"},{"c":"H","key":"POR","name":"Portugal","col":"#3f9a6a","fac":"neutral","cap":"Lisbon"},{"c":"I","key":"HOL","name":"Netherlands","col":"#e08a2a","fac":"neutral","cap":"Amsterdam"},{"c":"J","key":"BEL","name":"Belgium","col":"#9a8a3a","fac":"neutral","cap":"Brussels"},{"c":"K","key":"SWI","name":"Switzerland","col":"#b04a4a","fac":"neutral","cap":"Bern"},{"c":"L","key":"DEN","name":"Denmark","col":"#cf5a6a","fac":"neutral","cap":"Copenhagen"},{"c":"M","key":"NOR","name":"Norway","col":"#6f8ac0","fac":"neutral","cap":"Oslo"},{"c":"N","key":"SWE","name":"Sweden","col":"#4f6ab0","fac":"neutral","cap":"Stockholm"},{"c":"O","key":"FIN","name":"Finland","col":"#7ab0d0","fac":"neutral","cap":"Helsinki"},{"c":"P","key":"HUN","name":"Hungary","col":"#4f9a9a","fac":"axis","cap":"Budapest"},{"c":"Q","key":"ROM","name":"Romania","col":"#bba84a","fac":"axis","cap":"Bucharest"},{"c":"R","key":"BUL","name":"Bulgaria","col":"#9a7a4a","fac":"axis","cap":"Sofia"},{"c":"S","key":"YUG","name":"Yugoslavia","col":"#7a5a9a","fac":"neutral","cap":"Belgrade"},{"c":"T","key":"GRE","name":"Greece","col":"#4fa0c0","fac":"neutral","cap":"Athens"},{"c":"U","key":"TUR","name":"Turkey","col":"#cf5a4a","fac":"neutral","cap":"Ankara"},{"c":"V","key":"ALB","name":"Albania","col":"#9a3030","fac":"axis","cap":"Tirana"},{"c":"W","key":"IRE","name":"Ireland","col":"#4f9a5a","fac":"neutral","cap":"Dublin"},{"c":"X","key":"EST","name":"Estonia","col":"#7ab0a0","fac":"neutral","cap":"Tallinn"},{"c":"Y","key":"LAT","name":"Latvia","col":"#8a5a5a","fac":"neutral","cap":"Riga"},{"c":"Z","key":"LIT","name":"Lithuania","col":"#b0a050","fac":"neutral","cap":"Kaunas"},{"c":"0","key":"SLO","name":"Slovakia","col":"#8a8a4a","fac":"axis","cap":"Bratislava"},{"c":"1","key":"XXX","name":"Neutral","col":"#5b5b5b","fac":"neutral","cap":""}],
  cities:[{"name":"London","x":18,"y":73,"cap":1,"nat":"ENG"},{"name":"Paris","x":22,"y":80,"cap":1,"nat":"FRA"},{"name":"Berlin","x":39,"y":70,"cap":1,"nat":"GER"},{"name":"Rome","x":38,"y":98,"cap":1,"nat":"ITA"},{"name":"Madrid","x":13,"y":101,"cap":1,"nat":"SPA"},{"name":"Moscow","x":77,"y":61,"cap":1,"nat":"SOV"},{"name":"Leningrad","x":66,"y":47,"cap":0,"nat":"SOV"},{"name":"Stalingrad","x":88,"y":81,"cap":0,"nat":"SOV"},{"name":"Warsaw","x":51,"y":71,"cap":1,"nat":"POL"},{"name":"Vienna","x":44,"y":82,"cap":0,"nat":"GER"},{"name":"Kiev","x":66,"y":76,"cap":0,"nat":"SOV"},{"name":"Stockholm","x":47,"y":49,"cap":1,"nat":"SWE"},{"name":"Oslo","x":35,"y":47,"cap":1,"nat":"NOR"},{"name":"Belgrade","x":51,"y":91,"cap":1,"nat":"YUG"},{"name":"Bucharest","x":59,"y":92,"cap":1,"nat":"ROM"},{"name":"Amsterdam","x":26,"y":71,"cap":1,"nat":"HOL"},{"name":"Helsinki","x":57,"y":45,"cap":1,"nat":"FIN"},{"name":"Lisbon","x":4,"y":105,"cap":1,"nat":"POR"},{"name":"Ankara","x":70,"y":102,"cap":1,"nat":"TUR"},{"name":"Athens","x":56,"y":107,"cap":1,"nat":"GRE"},{"name":"Budapest","x":48,"y":84,"cap":1,"nat":"HUN"},{"name":"Sofia","x":55,"y":96,"cap":1,"nat":"BUL"},{"name":"Brussels","x":25,"y":75,"cap":1,"nat":"BEL"},{"name":"Copenhagen","x":38,"y":61,"cap":1,"nat":"DEN"},{"name":"Bern","x":30,"y":86,"cap":1,"nat":"SWI"},{"name":"Dublin","x":8,"y":68,"cap":1,"nat":"IRE"},{"name":"Tirana","x":49,"y":99,"cap":1,"nat":"ALB"},{"name":"Bratislava","x":45,"y":82,"cap":1,"nat":"SLO"},{"name":"Tallinn","x":57,"y":49,"cap":1,"nat":"EST"},{"name":"Riga","x":56,"y":57,"cap":1,"nat":"LAT"},{"name":"Kaunas","x":56,"y":63,"cap":1,"nat":"LIT"},{"name":"Hamburg","x":34,"y":67,"cap":0,"nat":"GER"},{"name":"Munich","x":37,"y":82,"cap":0,"nat":"GER"},{"name":"Milan","x":33,"y":89,"cap":0,"nat":"ITA"},{"name":"Naples","x":41,"y":100,"cap":0,"nat":"ITA"},{"name":"Barcelona","x":21,"y":98,"cap":0,"nat":"SPA"},{"name":"Marseille","x":27,"y":94,"cap":0,"nat":"FRA"},{"name":"Lyon","x":26,"y":88,"cap":0,"nat":"FRA"},{"name":"Cologne","x":29,"y":75,"cap":0,"nat":"GER"},{"name":"Minsk","x":62,"y":66,"cap":0,"nat":"SOV"},{"name":"Kharkov","x":75,"y":77,"cap":0,"nat":"SOV"},{"name":"Odessa","x":66,"y":86,"cap":0,"nat":"SOV"},{"name":"Rostov","x":81,"y":85,"cap":0,"nat":"SOV"},{"name":"Sevastopol","x":72,"y":90,"cap":0,"nat":"SOV"},{"name":"Smolensk","x":69,"y":64,"cap":0,"nat":"SOV"},{"name":"Gorky","x":88,"y":59,"cap":0,"nat":"SOV"},{"name":"Manchester","x":15,"y":67,"cap":0,"nat":"ENG"},{"name":"Birmingham","x":15,"y":70,"cap":0,"nat":"ENG"},{"name":"Glasgow","x":12,"y":60,"cap":0,"nat":"ENG"},{"name":"Venice","x":37,"y":88,"cap":0,"nat":"ITA"},{"name":"Turin","x":30,"y":90,"cap":0,"nat":"ITA"},{"name":"Prague","x":41,"y":77,"cap":0,"nat":"GER"},{"name":"Krakow","x":50,"y":77,"cap":0,"nat":"POL"},{"name":"Lwow","x":56,"y":78,"cap":0,"nat":"SOV"},{"name":"Konigsberg","x":51,"y":64,"cap":0,"nat":"SOV"},{"name":"Stuttgart","x":33,"y":81,"cap":0,"nat":"GER"},{"name":"Frankfurt","x":32,"y":77,"cap":0,"nat":"GER"},{"name":"Bordeaux","x":17,"y":91,"cap":0,"nat":"FRA"},{"name":"Nantes","x":16,"y":85,"cap":0,"nat":"FRA"},{"name":"Seville","x":9,"y":108,"cap":0,"nat":"SPA"},{"name":"Bilbao","x":13,"y":95,"cap":0,"nat":"SPA"},{"name":"Porto","x":5,"y":100,"cap":0,"nat":"POR"},{"name":"Gothenburg","x":37,"y":54,"cap":0,"nat":"SWE"},{"name":"Bergen","x":27,"y":45,"cap":0,"nat":"NOR"},{"name":"Trondheim","x":35,"y":34,"cap":0,"nat":"NOR"},{"name":"Salonika","x":55,"y":101,"cap":0,"nat":"GRE"},{"name":"Izmir","x":61,"y":106,"cap":0,"nat":"TUR"},{"name":"Istanbul","x":63,"y":99,"cap":0,"nat":"TUR"},{"name":"Voronezh","x":80,"y":73,"cap":0,"nat":"SOV"},{"name":"Tula","x":77,"y":65,"cap":0,"nat":"SOV"}]
};

/* ============================ THE WORLD AT WAR (native strategic layer) ============================
   A multi-nation grand-strategy game on a real 110x120 Europe hex map. Map data (terrain, nation
   ownership, cities) lives in WW_DATA above, generated by eumap_gen.js from Natural Earth coastlines
   and borders. The engine logic here is headless and test-covered; rendering, input and UI live in
   the browser IIFE further below. */

const WW = { on:false };   // live game state (populated by wwBuildState)

// hex neighbours — pointy-top, odd rows shoved right (matches the generator's layout)
function wwNb(x,y){
  const odd=y&1;
  const d = odd ? [[1,0],[-1,0],[0,-1],[1,-1],[0,1],[1,1]]
                : [[1,0],[-1,0],[-1,-1],[0,-1],[-1,1],[0,1]];
  const out=[];
  for(const [dx,dy] of d){ const nx=x+dx, ny=y+dy;
    if(nx>=0&&nx<WW.cols&&ny>=0&&ny<WW.rows) out.push([nx,ny]); }
  return out;
}
function wwIdx(x,y){ return y*WW.cols+x; }
function wwSea(x,y){ return WW.terr[y][x]==='~'; }
function wwTerrAt(x,y){ return WW.terr[y][x]; }
function wwOwnerAt(x,y){ const v=WW.own[y*WW.cols+x]; return v<0?null:WW.nat[v]; }
function wwCapitalHex(natKey){ const c=WW.cities.find(c=>c.nat===natKey && c.cap); return c?[c.x,c.y]:null; }

// curated 1939 industrial base for the major powers (civilian + military factories, manpower).
// minors are scaled from territory/cities in wwComputeStats.
// ---- war economy: resources, fuel, manpower ----
const WW_ECO = { GER:{oil:2,steel:11}, SOV:{oil:4,steel:14}, ENG:{oil:3,steel:9}, FRA:{oil:1,steel:7}, ITA:{oil:1,steel:3}, POL:{oil:1,steel:3} };
// resource-rich cities (whoever holds them gets the output) — the oil & steel of the war
const WW_CITY_RES = { Bucharest:{oil:6}, Rostov:{oil:3}, Stalingrad:{oil:2}, Gorky:{oil:1,steel:2},
  Cologne:{steel:5}, Kharkov:{steel:4}, Stockholm:{steel:3}, Manchester:{steel:3}, Stuttgart:{steel:2}, Krakow:{steel:2}, Lwow:{steel:1} };
const WW_FUEL_PER_OIL=4, WW_ARMOR_FUEL=2, WW_AIR_FUEL=0.025, WW_MP_PER_STR=1500, WW_DIV_MP=10000, WW_DIV_STEEL=10;
function wwEffMp(a){ const n=WW.byKey[a.nat]; return (a.kind==='arm' && n && n.lowFuel) ? a.mp*0.5 : a.mp; }
function wwEconomyTick(){
  for(const n of WW.nat){ if(n.capitulated||n.key==='XXX') continue;
    const armor=wwArmiesOf(n.key).reduce((s,a)=>s+(a.kind==='arm'?1:0),0);
    const burn=armor*WW_ARMOR_FUEL + wwAirTotal(n)*WW_AIR_FUEL;
    n.fuelMax=200 + (n.civ||0)*6;
    n.fuel=Math.max(0, Math.min(n.fuelMax, (n.fuel||0) + (n.oil||0)*WW_FUEL_PER_OIL - burn));
    n.lowFuel = (n.fuel<=0 && (n.oil||0)*WW_FUEL_PER_OIL < burn);
    n.steelStock=Math.min(400, (n.steelStock||0) + (n.steel||0));
    n.manpower=Math.min((n.mp||0)*0.08, (n.manpower||0) + (n.mp||0)*0.001);
  }
}
const WW_POWER = {
  GER:{civ:38,mil:24,mp:80}, SOV:{civ:55,mil:30,mp:170}, ENG:{civ:35,mil:18,mp:48},
  FRA:{civ:28,mil:14,mp:42}, ITA:{civ:18,mil:10,mp:45}, POL:{civ:10,mil:5,mp:35},
};

function wwBuildState(){
  const D = WW_DATA, W = WW;
  W.cols=D.cols; W.rows=D.rows;
  W.terr=D.terr.slice();
  W.nat=D.nations.map((n,i)=>Object.assign({}, n, {i}));
  W.byKey={}; W.byChar={};
  W.nat.forEach(n=>{ W.byKey[n.key]=n; W.byChar[n.c]=n; });
  W.own=new Int16Array(W.cols*W.rows).fill(-1);
  for(let y=0;y<W.rows;y++){ const row=D.owner[y];
    for(let x=0;x<W.cols;x++){ const ch=row[x]; if(ch!=='.'){ const n=W.byChar[ch]; if(n) W.own[y*W.cols+x]=n.i; } } }
  W.homeOwn=W.own.slice();   // original 1939 ownership — each nation's home rail territory
  W.cities=D.cities.map(c=>Object.assign({}, c));
  W.date={y:1939,m:9,d:1};
  W.turn=0;
  wwComputeStats();
  W.on=true;
  return W;
}

// derived per-nation stats: territory, cities, victory points, industry, manpower
function wwComputeStats(){
  const W=WW;
  for(const n of W.nat){ n.hexes=0; n.cityList=[]; n.vp=0; }
  for(let i=0;i<W.own.length;i++){ const v=W.own[i]; if(v>=0) W.nat[v].hexes++; }
  for(const c of W.cities){ const n=W.byKey[c.nat]; if(n){ n.cityList.push(c); n.vp += c.cap?5:1; } }
  for(const n of W.nat){
    const P=WW_POWER[n.key];
    if(P){ n.civ=P.civ; n.mil=P.mil; n.mp=P.mp*100000; }
    else {
      n.civ = Math.max(1, Math.round(n.hexes/30) + n.cityList.length);
      n.mil = Math.max(0, Math.round(n.hexes/55));
      n.mp  = Math.max(50000, n.hexes*8000 + n.cityList.length*40000);
    }
    n.civ += n.bonusCiv||0; n.mil += n.bonusMil||0;
    if(n.warDmg>0){ n.civ=Math.max(1,Math.round(n.civ*(1-n.warDmg))); n.mil=Math.max(0,Math.round(n.mil*(1-n.warDmg))); }
    const eb = WW_ECO[n.key] || {oil:Math.max(0,Math.round(n.hexes/250)), steel:Math.max(1,Math.round(n.hexes/55))};
    let oil=eb.oil||0, steel=eb.steel||0;
    for(const c of n.cityList){ const r=WW_CITY_RES[c.name]; if(r){ oil+=r.oil||0; steel+=r.steel||0; } }
    n.oil=oil; n.steel=steel;
  }
}

// faction roster (for legends / diplomacy)
function wwFactions(){
  const W=WW, out={axis:[],allies:[],comintern:[],neutral:[]};
  for(const n of W.nat){ (out[n.fac]||out.neutral).push(n); }
  return out;
}


/* ---- The World at War: game logic (armies, movement, combat, conquest, AI, turns) ---- */

const WW_ENEMY = { axis:{allies:1}, allies:{axis:1}, comintern:{} };  // 1939: Axis vs Allies; USSR neutral until provoked
function wwAtWar(aKey,bKey){
  const a=WW.byKey[aKey], b=WW.byKey[bKey];
  if(!a||!b||aKey===bKey||a.capitulated||b.capitulated) return false;
  if(a.atWar && a.atWar.has(bKey)) return true;
  if(b.atWar && b.atWar.has(aKey)) return true;
  if(a.fac===b.fac) return false;
  return !!(WW.warOn && WW_ENEMY[a.fac] && WW_ENEMY[a.fac][b.fac]);
}
function wwDeclareWar(aKey,bKey){
  const a=WW.byKey[aKey], b=WW.byKey[bKey]; if(!a||!b||aKey===bKey) return;
  if(a.atWar && a.atWar.has(bKey)) return;
  const blocs={axis:1,allies:1,comintern:1};
  const aSide = blocs[a.fac] ? WW.nat.filter(m=>m.fac===a.fac && !m.capitulated) : [a];
  const bSide = blocs[b.fac] ? WW.nat.filter(m=>m.fac===b.fac && !m.capitulated) : [b];
  for(const x of aSide){ x.atWar=x.atWar||new Set();
    for(const y of bSide){ y.atWar=y.atWar||new Set(); if(x.key!==y.key){ x.atWar.add(y.key); y.atWar.add(x.key); } } }
  if(WW.log) WW.log.push(a.name+' declares war on '+b.name+'!'+((aSide.length>1||bSide.length>1)?' Allies are drawn in.':''));
}
function wwAllied(aKey,bKey){ const a=WW.byKey[aKey], b=WW.byKey[bKey]; return !!(a&&b&&a.fac===b.fac && a.fac!=='neutral'); }
function wwRelation(aKey,bKey){ if(aKey===bKey) return 'self'; if(wwAtWar(aKey,bKey)) return 'war'; if(wwAllied(aKey,bKey)) return 'ally'; return 'peace'; }

function wwArmyAt(x,y){ for(const a of WW.armies) if(a.x===x&&a.y===y) return a; return null; }
function wwArmiesOf(natKey){ return WW.armies.filter(a=>a.nat===natKey); }
function wwRemoveArmy(a){ const i=WW.armies.indexOf(a); if(i>=0) WW.armies.splice(i,1); }
function wwMakeArmy(id,nat,x,y,kind){ const arm=kind==='arm';
  // smaller formations: more divisions on the map so nations can man multiple fronts at once
  return {id,nat,x,y,kind, str:arm?5:6, maxStr:arm?5:6, org:arm?6:8, maxOrg:arm?6:8, mp:arm?4:2, moved:false}; }

function wwTerrCost(x,y){ const t=WW.terr[y][x]; return (t==='h'||t==='f')?2:1; }
function wwTerrDef(x,y){ const t=WW.terr[y][x]; return t==='h'?1.5 : t==='f'?1.3 : 1.0; }
function wwPassableFor(natKey,x,y){
  if(wwSea(x,y)) return false;
  const o=WW.own[y*WW.cols+x]; if(o<0) return false;
  const owner=WW.nat[o]; return owner.key===natKey || wwAllied(owner.key,natKey);
}

// even-spread pick of up to n entries from a list
function wwSpread(list,n){ if(list.length<=n) return list.slice();
  const out=[], step=list.length/n; for(let i=0;i<n;i++) out.push(list[Math.floor(i*step)]); return out; }

function wwFrontier(natIdx){
  const out=[];
  for(let y=0;y<WW.rows;y++) for(let x=0;x<WW.cols;x++){
    if(WW.own[y*WW.cols+x]!==natIdx) continue;
    for(const [nx,ny] of wwNb(x,y)){ if(WW.own[ny*WW.cols+nx]!==natIdx){ out.push([x,y]); break; } }
  }
  return out;
}

function wwPlaceArmies(){
  WW.armies=[]; let id=1; const occupied=new Set();
  for(const n of WW.nat){
    if(n.key==='XXX'||!n.hexes) continue;
    const front=wwFrontier(n.i);
    const count=Math.max(4, Math.min(26, Math.round((n.mil||1)*0.85)+4));
    const picks=wwSpread(front, count);
    for(const [x,y] of picks){ const k=x+','+y; if(occupied.has(k)) continue; occupied.add(k);
      WW.armies.push(wwMakeArmy(id++, n.key, x, y, 'inf')); }
    const cap=wwCapitalHex(n.key);
    if(cap && WW_POWER[n.key]){ const k=cap[0]+','+cap[1];
      if(!occupied.has(k)){ occupied.add(k); WW.armies.push(wwMakeArmy(id++, n.key, cap[0], cap[1], 'arm')); } }
  }
}

// set the 1939 war: Axis vs Allies (Comintern neutral until provoked)
function wwSetup(playerKey, difficulty){
  wwBuildState();
  WW.player = playerKey || 'GER';
  WW.difficulty = difficulty || 'normal';
  WW.aiPow = WW.difficulty==='easy'?0.82 : WW.difficulty==='hard'?1.18 : 1.0;
  WW.warOn = true;
  for(const n of WW.nat){ n.capitulated=false; n.prod=0; n.atWar=new Set(); n.air=wwBaseAir(n); n.airBuild=wwDefaultBuild(n); n.bombTarget=null; n.warDmg=0; n.winterGear=WW_WINTER_BASE[n.key]||0.2; n.winterizing=false; n.railDepth=WW_RAIL_START; n.fuelMax=200+(n.civ||0)*6; n.fuel=Math.round(n.fuelMax*0.5); n.manpower=Math.round((n.mp||100000)*0.03); n.steelStock=100; n.casualties=0; n.lowFuel=false; wwInitLines(n); wwTechInit(n); wwFocusInit(n); }
  wwPlaceArmies();
  wwRecomputeSupply();
  for(const n of WW.nat){ if(n.key!==WW.player && n.key!=='XXX' && !n.capitulated) wwStartFocus(n.key); }
  WW.result=null;
  return WW;
}

function wwReachable(a){
  const out=[], best={}, sk=a.x+','+a.y; best[sk]=0;
  const pq=[[0,a.x,a.y]];
  while(pq.length){
    let bi=0; for(let i=1;i<pq.length;i++) if(pq[i][0]<pq[bi][0]) bi=i;
    const [c,x,y]=pq.splice(bi,1)[0];
    if(c>(best[x+','+y]??1e9)) continue;
    for(const [nx,ny] of wwNb(x,y)){
      if(!wwPassableFor(a.nat,nx,ny) || wwArmyAt(nx,ny)) continue;
      const nc=c+wwTerrCost(nx,ny)+wwHexWinter(nx,ny)*1.6*(1-wwGear(a.nat)*0.7);
      if(nc<=wwEffMp(a) && nc<(best[nx+','+ny]??1e9)){ best[nx+','+ny]=nc; pq.push([nc,nx,ny]); out.push([nx,ny]); }
    }
  }
  return out;
}
function wwForecast(a, tx, ty){
  const d=wwArmyAt(tx,ty), oi=WW.own[ty*WW.cols+tx], owner=oi>=0?WW.nat[oi]:null;
  const foeKey = d ? d.nat : (owner?owner.key:null);
  const amphibious = !wwNb(a.x,a.y).some(p=>p[0]===tx&&p[1]===ty);
  let ap=wwAtkPower(a,tx,ty); if(amphibious) ap*=0.55; ap*=wwAirFactor(a.nat, foeKey||a.nat);
  const dp = d ? wwDefPower(d,tx,ty)*wwAirFactor(d.nat,a.nat) : 0;
  const winPct = dp<=0 ? 100 : Math.max(3, Math.min(97, Math.round(100*ap/(ap+dp))));
  return { a, d, tx, ty, foeKey, ap, dp, winPct, amphibious,
    aSup:wwSupport(a,tx,ty), dSup:d?wwSupport(d,tx,ty):0, aCombined:wwCombinedArms(a), dCombined:d?wwCombinedArms(d):false, terr:wwTerrDef(tx,ty),
    air:wwAirFactor(a.nat, foeKey||a.nat), airSup:wwAirSup(a.nat, foeKey||a.nat), aSupply:wwInSupply(a), dSupply:d?wwInSupply(d):true,
    winter:wwHexWinter(tx,ty), atkGear:wwGear(a.nat) };
}
function wwForeignAdj(a, includeNeutral){
  const out=[];
  for(const [nx,ny] of wwNb(a.x,a.y)){
    if(wwSea(nx,ny)) continue;
    const o=WW.own[ny*WW.cols+nx]; const owner=o>=0?WW.nat[o]:null; const d=wwArmyAt(nx,ny);
    const enemyOwner = owner && wwAtWar(a.nat,owner.key);
    const enemyArmy  = d && wwAtWar(a.nat,d.nat);
    const neutralTgt = includeNeutral && owner && owner.key!==a.nat &&
      !wwAllied(a.nat,owner.key) && !owner.capitulated && !enemyOwner;
    if(enemyOwner||enemyArmy||neutralTgt) out.push([nx,ny]);
  }
  return out;
}
function wwAttackTargets(a){ return wwForeignAdj(a,false); }
function wwAttackTargetsPlayer(a){ return wwForeignAdj(a,true); }
function wwMoveArmy(a,x,y){ a.x=x; a.y=y; a.moved=true; }

function wwCaptureHex(x,y,natKey){
  const me=WW.byKey[natKey]; const prev=WW.own[y*WW.cols+x];
  WW.own[y*WW.cols+x]=me.i;
  WW._stratDirty=true;
  const city=WW.cities.find(c=>c.x===x&&c.y===y);
  if(city && city.cap && prev>=0){ const fallen=WW.nat[prev];
    if(fallen && fallen.key===city.nat && !fallen.capitulated) wwCapitulate(fallen.key, natKey); }
}
function wwCapitulate(fallenKey, byKey){
  const f=WW.byKey[fallenKey]; if(!f||f.capitulated) return;
  const by=WW.byKey[byKey];
  // the peace conference: only the major powers (and the human player) sit at the table —
  // minor co-belligerents who merely declared war don't carve off the spoils. Their occupied
  // hexes fall to the nearest major instead. If no major is involved, the original victors split it.
  let victors=WW.nat.filter(m=>!m.capitulated && m.key!==fallenKey && wwAtWar(m.key,fallenKey));
  if(by && !by.capitulated && by.key!==fallenKey && victors.indexOf(by)<0) victors.push(by);
  const majors=victors.filter(v=> WW_POWER[v.key] || v.key===WW.player );
  if(majors.length) victors=majors;
  f.capitulated=true; f.focusProg=null;
  const caps=victors.map(v=>({v,cap:wwCapitalHex(v.key)})).filter(o=>o.cap);
  const assign=(x,y)=>{ if(!caps.length) return by||victors[0]||f; let best=caps[0].v, bd=1e18;
    for(const o of caps){ const dd=(o.cap[0]-x)*(o.cap[0]-x)+(o.cap[1]-y)*(o.cap[1]-y); if(dd<bd){ bd=dd; best=o.v; } } return best; };
  if(victors.length<=1){ const w=victors[0]||by; if(w){ for(let i=0;i<WW.own.length;i++) if(WW.own[i]===f.i) WW.own[i]=w.i;
      for(const c of WW.cities) if(c.nat===fallenKey) c.nat=w.key; } }
  else { // peace conference: each fallen hex goes to the victor that militarily OCCUPIES it
         // (its nearest army), so the power that actually did the conquering keeps the land —
         // not whoever merely shared a border. Nearest-capital is only a fallback for gaps.
    const vArmies = WW.armies.filter(ar=>{ const v=WW.byKey[ar.nat]; return v && v.key!==fallenKey && victors.indexOf(v)>=0; });
    const occupier=(x,y)=>{ let best=null, bd=1e18;
      for(const ar of vArmies){ const dd=(ar.x-x)*(ar.x-x)+(ar.y-y)*(ar.y-y); if(dd<bd){ bd=dd; best=ar; } }
      return best ? WW.byKey[best.nat] : assign(x,y); };
    for(let i=0;i<WW.own.length;i++){ if(WW.own[i]!==f.i) continue; const x=i%WW.cols, y=(i/WW.cols)|0; WW.own[i]=occupier(x,y).i; }
    for(const c of WW.cities) if(c.nat===fallenKey){ const o=WW.own[c.y*WW.cols+c.x]; c.nat = o>=0?WW.nat[o].key:(by||victors[0]).key; } }
  WW.armies=WW.armies.filter(ar=>ar.nat!==fallenKey);
  if(WW.log) WW.log.push(f.name+(victors.length>1?' is partitioned among the victors at the peace table!':' capitulates to '+((by||victors[0])?(by||victors[0]).name:'the enemy')+'!'));
}

// supply: BFS from a nation's owned cities across friendly-owned land, limited range.
// the rail network: home territory is always railed; rail is RE-LAID into conquered
// land at a limited reach (railDepth), which creeps forward a few hexes each turn.
// A blitz that outruns its railhead culminates — exactly like Realistic Mode.
const WW_RAIL_START=6, WW_RAIL_RATE=3, WW_RAIL_MAX=48, WW_OFFRAIL=4;
function wwRailNetwork(natKey){
  const n=WW.byKey[natKey]; if(!n||!WW.homeOwn) return new Set();
  const cols=WW.cols, depth=(n.railDepth!=null?n.railDepth:WW_RAIL_START);
  const railed=new Set(); const q=[]; let qi=0;
  for(let i=0;i<WW.own.length;i++){ if(WW.own[i]===n.i && WW.homeOwn[i]===n.i){ railed.add(i); q.push([i%cols,(i/cols)|0]); } } // home sources
  // distance map (hops into conquered land); home hexes are dist 0
  const dist={}; for(const i of railed) dist[i]=0;
  while(qi<q.length){ const [x,y]=q[qi++]; const d=dist[y*cols+x];
    for(const [nx,ny] of wwNb(x,y)){ const j=ny*cols+nx; if(railed.has(j)) continue;
      const o=WW.own[j]; if(o<0) continue; const owner=WW.nat[o]; if(owner.key!==natKey && !wwAllied(owner.key,natKey)) continue;
      const nd = (WW.homeOwn[j]===n.i)?0:d+1; if(nd>depth) continue; railed.add(j); dist[j]=nd; q.push([nx,ny]); } }
  return railed;
}
function wwSupplyField(natKey){
  const n=WW.byKey[natKey], cols=WW.cols; if(!n) return new Uint8Array(cols*WW.rows);
  const railed=wwRailNetwork(natKey);
  const off=WW_OFFRAIL + ((n.bonusSupply)||0);          // logistics tech extends the off-rail reach
  const sup=new Uint8Array(cols*WW.rows), q=[]; let qi=0;
  for(const i of railed){ sup[i]=1; q.push([i%cols,(i/cols)|0,0]); }   // the railed corridor is supplied
  while(qi<q.length){ const [x,y,d]=q[qi++]; if(d>=off) continue;
    for(const [nx,ny] of wwNb(x,y)){ const j=ny*cols+nx; if(sup[j]) continue;
      const o=WW.own[j]; if(o<0) continue; const owner=WW.nat[o]; if(owner.key!==natKey && !wwAllied(owner.key,natKey)) continue;
      sup[j]=1; q.push([nx,ny,d+1]); } }
  return sup;
}
function wwRecomputeSupply(){ WW.supply={}; for(const k of new Set(WW.armies.map(a=>a.nat))) WW.supply[k]=wwSupplyField(k); }
function wwInSupply(a){ if(!WW.supply) wwRecomputeSupply(); const f=WW.supply[a.nat]; return f? !!f[a.y*WW.cols+a.x] : true; }

// combat power = strength x concentration (adjacent friendly support) x supply x terrain x difficulty
function wwSupport(of, tx, ty){ let s=0;
  for(const [nx,ny] of wwNb(tx,ty)){ const u=wwArmyAt(nx,ny); if(u&&u!==of&&(u.nat===of.nat||wwAllied(u.nat,of.nat))) s++; }
  return Math.min(3,s); }
// combined arms (HOI4): armour fighting alongside infantry (or vice-versa) hits harder —
// a mixed formation on the front beats a pure-tank or pure-infantry stack.
function wwCombinedArms(of){
  if(!of || (of.kind!=='inf'&&of.kind!=='arm')) return false;
  for(const [nx,ny] of wwNb(of.x,of.y)){ const u=wwArmyAt(nx,ny);
    if(u&&u!==of&&(u.nat===of.nat||wwAllied(u.nat,of.nat))&&(u.kind==='inf'||u.kind==='arm')&&u.kind!==of.kind) return true; }
  return false; }
function wwAtkPower(a,tx,ty){ let p=a.str*(1+0.30*wwSupport(a,tx,ty));
  if(wwCombinedArms(a)) p*=1.18;
  if(!wwInSupply(a)) p*=0.6; p*=wwLandBonus(a.nat); p*=(1 - wwHexWinter(tx,ty)*(1-wwGear(a.nat))*0.35); if(a.nat!==WW.player) p*=(WW.aiPow||1); return p; }
function wwDefPower(d,tx,ty){ let p=d.str*(1+0.20*wwSupport(d,tx,ty))*wwTerrDef(tx,ty);
  if(wwCombinedArms(d)) p*=1.08;
  if(!wwInSupply(d)) p*=0.6; p*=wwLandBonus(d.nat); p*=(1 - wwHexWinter(tx,ty)*(1-wwGear(d.nat))*0.30); if(d.nat!==WW.player) p*=(WW.aiPow||1); return p; }

function wwRetreat(d, fromX, fromY){
  let best=null, bd=-1;
  for(const [nx,ny] of wwNb(d.x,d.y)){
    if(wwSea(nx,ny)||wwArmyAt(nx,ny)||!wwPassableFor(d.nat,nx,ny)) continue;
    const dist=(nx-fromX)*(nx-fromX)+(ny-fromY)*(ny-fromY);
    if(dist>bd){ bd=dist; best=[nx,ny]; }
  }
  if(best){ d.x=best[0]; d.y=best[1]; d.org=Math.max(d.org, d.maxOrg*0.15); return true; }
  return false;
}
function wwAttack(a,tx,ty){
  const d=wwArmyAt(tx,ty), tdef=wwTerrDef(tx,ty);
  const oi=WW.own[ty*WW.cols+tx], owner=oi>=0?WW.nat[oi]:null;
  const foeKey = d ? d.nat : (owner?owner.key:null);
  if(foeKey && !wwAtWar(a.nat,foeKey)) wwDeclareWar(a.nat,foeKey);
  let took=false; a.moved=true;
  if(d){
    const atk=wwAtkPower(a,tx,ty)*(0.55+Math.random()*0.45)*wwAirFactor(a.nat,foeKey);
    const def=wwDefPower(d,tx,ty)*(0.50+Math.random()*0.35)*wwAirFactor(foeKey,a.nat);
    d.org-=atk*0.85; d.str-=atk*0.20;
    a.org-=def*0.80; a.str-=def*0.18;
    { const dn=WW.byKey[d.nat], an=WW.byKey[a.nat]; if(dn) dn.casualties=(dn.casualties||0)+atk*0.20*WW_MP_PER_STR; if(an) an.casualties=(an.casualties||0)+def*0.18*WW_MP_PER_STR; }
    if(a.str<=1.0){ wwRemoveArmy(a); return {result:'attacker-lost'}; }
    if(d.str<=1.0){ wwRemoveArmy(d); took=true; }
    else if(d.org<=0){ const fled=wwRetreat(d,a.x,a.y); if(!fled){ wwRemoveArmy(d); took=true; } else took=true; }
  } else took=true;
  if(took){ wwCaptureHex(tx,ty,a.nat); if(!wwArmyAt(tx,ty)){ a.x=tx; a.y=ty; } return {result:'taken'}; }
  return {result:'held'};
}

// nearest enemy-owned hex to (x,y), measured by lightweight ring scan
function wwNearestEnemyHex(natKey,x,y,maxR){
  for(let r=1;r<=(maxR||30);r++){
    for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==r) continue;
      const nx=x+dx, ny=y+dy; if(nx<0||nx>=WW.cols||ny<0||ny>=WW.rows) continue;
      if(wwSea(nx,ny)) continue; const o=WW.own[ny*WW.cols+nx];
      if(o>=0 && wwAtWar(natKey, WW.nat[o].key)) return [nx,ny];
    }
  }
  return null;
}
function wwAIObjective(natKey,x,y){
  let best=null,bd=1e9;
  for(const m of WW.nat){ if(m.capitulated||!wwAtWar(natKey,m.key)) continue;
    const c=wwCapitalHex(m.key); if(!c) continue;
    const d=(c[0]-x)*(c[0]-x)+(c[1]-y)*(c[1]-y); if(d<bd){ bd=d; best=c; } }
  return best || wwNearestEnemyHex(natKey,x,y,30);
}
function wwAIStep(a){
  const tgt=wwAIObjective(a.nat,a.x,a.y); if(!tgt) return null;
  const reach=wwReachable(a); if(!reach.length) return null;
  let best=null, bd=1e9;
  for(const [x,y] of reach){ const d=(x-tgt[0])*(x-tgt[0])+(y-tgt[1])*(y-tgt[1]); if(d<bd){ bd=d; best=[x,y]; } }
  const cur=(a.x-tgt[0])*(a.x-tgt[0])+(a.y-tgt[1])*(a.y-tgt[1]);
  return (best && bd<cur) ? best : null;
}
function wwAIStep2(a, obj){
  if(!obj) obj=wwAIObjective(a.nat,a.x,a.y); if(!obj) return null;
  const reach=wwReachable(a); if(!reach.length) return null;
  const curD=Math.hypot(a.x-obj[0],a.y-obj[1]);
  let best=null, bestScore=-1e9;
  for(const [x,y] of reach){
    let score=(curD-Math.hypot(x-obj[0],y-obj[1]))*2; let fr=0, en=0;
    for(const [nx,ny] of wwNb(x,y)){ const s=wwArmyAt(nx,ny);
      if(s){ if(s.nat===a.nat||wwAllied(s.nat,a.nat)) fr++; else if(wwAtWar(a.nat,s.nat)) en++; }
      const o=WW.own[ny*WW.cols+nx]; if(o>=0 && wwAtWar(a.nat,WW.nat[o].key)) en+=0.3; }
    score += fr*0.8 - Math.max(0,en-fr)*0.7;
    if(score>bestScore){ bestScore=score; best=[x,y]; }
  }
  return best;
}
// ---- research: tech levels that compound a nation's war effort ----
// research is a HOI4-style tech tree shared by every nation; the tiers are years.
const WW_TECH_YEARS=['1936','1937','1939','1941','1943'];
const WW_TECH=[
 {id:'con1',name:'Construction I',x:0,y:0,cost:50,fx:['factory',2,0]},
 {id:'prod1',name:'Industrial Production',x:1,y:0,cost:50,fx:['factory',1,1]},
 {id:'con2',name:'Construction II',x:0,y:1,cost:70,req:['con1'],fx:['factory',2,1]},
 {id:'prod2',name:'Production Efficiency',x:1,y:1,cost:70,req:['prod1'],fx:['factory',1,1]},
 {id:'con3',name:'Construction III',x:0,y:2,cost:100,req:['con2'],fx:['factory',3,1]},
 {id:'prod3',name:'Assembly Lines',x:1,y:2,cost:100,req:['prod2'],fx:['factory',2,2]},
 {id:'con4',name:'Advanced Construction',x:0,y:3,cost:140,req:['con3'],fx:['factory',3,2]},
 {id:'prod4',name:'War Production',x:1,y:3,cost:140,req:['prod3'],fx:['factory',2,3]},
 {id:'con5',name:'Industrial Complex',x:0,y:4,cost:190,req:['con4'],fx:['factory',4,2]},
 {id:'inf1',name:'Infantry Weapons I',x:2,y:0,cost:50,fx:['land',0.03]},
 {id:'inf2',name:'Infantry Weapons II',x:2,y:1,cost:70,req:['inf1'],fx:['land',0.04]},
 {id:'inf3',name:'Improved Infantry',x:2,y:2,cost:100,req:['inf2'],fx:['land',0.05]},
 {id:'inf4',name:'Advanced Infantry',x:2,y:3,cost:140,req:['inf3'],fx:['land',0.05]},
 {id:'arm1',name:'Light Tanks',x:3,y:0,cost:55,fx:['land',0.03]},
 {id:'arm2',name:'Medium Tanks',x:3,y:1,cost:80,req:['arm1'],fx:['land',0.05]},
 {id:'arm3',name:'Heavy Tanks',x:3,y:2,cost:110,req:['arm2'],fx:['land',0.05]},
 {id:'arm4',name:'Armoured Doctrine',x:3,y:3,cost:150,req:['arm3'],fx:['land',0.06]},
 {id:'ftr1',name:'Fighter I',x:4,y:0,cost:50,fx:['air',25]},
 {id:'cas1',name:'Close Air Support',x:5,y:0,cost:50,fx:['air',20]},
 {id:'ftr2',name:'Fighter II',x:4,y:1,cost:80,req:['ftr1'],fx:['air',30]},
 {id:'strat1',name:'Strategic Bomber',x:5,y:1,cost:80,req:['cas1'],fx:['air',25]},
 {id:'ftr3',name:'Heavy Fighter',x:4,y:2,cost:110,req:['ftr2'],fx:['air',35]},
 {id:'strat2',name:'Heavy Bomber',x:5,y:2,cost:120,req:['strat1'],fx:['air',35]},
 {id:'log1',name:'Logistics Company',x:6,y:0,cost:50,fx:['log',2]},
 {id:'eng1',name:'Combat Engineers',x:6,y:1,cost:70,req:['log1'],fx:['land',0.03]},
 {id:'log2',name:'Motorised Logistics',x:6,y:2,cost:100,req:['eng1'],fx:['log',3]},
 {id:'radio',name:'Radio & Encryption',x:6,y:3,cost:130,req:['log2'],fx:['research',60]},
];
function wwTechInit(n){ n.techDone=new Set(); n.research=0; n.researching=null; n.bonusCiv=0; n.bonusMil=0; n.bonusLand=0; n.bonusSupply=0; }
function wwTechList(){ return WW_TECH; }
function wwTechById(id){ return WW_TECH.find(t=>t.id===id); }
function wwTechAvail(natKey,id){ const n=WW.byKey[natKey]; if(!n) return false; if(n.techDone&&n.techDone.has(id)) return false;
  const t=wwTechById(id); if(!t) return false; return (t.req||[]).every(r=>n.techDone&&n.techDone.has(r)); }
function wwAvailableTechs(natKey){ const n=WW.byKey[natKey]; if(!n) return [];
  return WW_TECH.filter(t=>!(n.techDone&&n.techDone.has(t.id)) && (t.req||[]).every(r=>n.techDone.has(r))); }
function wwAIPickTech(n, av){ const pr=t=>{ const f=t.fx[0];
  if(f==='factory') return n.techDone.size<5?6:4; if(f==='land') return 5; if(f==='air') return 3; if(f==='log') return 2; if(f==='research') return 1; return 3; };
  return av.slice().sort((a,b)=>pr(b)-pr(a) || a.cost-b.cost)[0].id; }
function wwStartResearch(natKey, id){ const n=WW.byKey[natKey]; if(!n||!wwTechAvail(natKey,id)) return false; n.researching=id; return true; }
function wwLandBonus(natKey){ const n=WW.byKey[natKey]; if(!n) return 1; return 1 + (n.bonusLand||0); }
function wwResearchOutput(n){ return (n.civ||1)*0.6; }
function wwResearchTick(n){ if(!n.techDone) wwTechInit(n);
  if(!n.researching){ if(n.key!==WW.player){ const av=wwAvailableTechs(n.key); if(av.length) n.researching=wwAIPickTech(n,av); } if(!n.researching) return; }
  n.research += wwResearchOutput(n);
  const t=wwTechById(n.researching); if(!t){ n.researching=null; return; }
  if(n.research >= t.cost){ n.research -= t.cost; n.techDone.add(t.id); wwApplyFocus(n, t.fx);
    if(n.key===WW.player) (WW.notify=WW.notify||[]).push({kind:'research', name:t.name, fx:t.fx});
    n.researching=null; if(n.key!==WW.player){ const av=wwAvailableTechs(n.key); if(av.length) n.researching=wwAIPickTech(n,av); } } }

// ---- national focus: a short scripted tree of historical decisions per major ----
const WW_FOCUS = {
  GER:[
   {id:'rhein',name:'Remilitarise the Rhineland',x:3,y:0,days:35,fx:['land',0.05]},
   {id:'4yr',name:'The Four Year Plan',x:1,y:1,days:70,req:['rhein'],fx:['factory',3,1]},
   {id:'wehr',name:'Reorganise the Wehrmacht',x:3,y:1,days:60,req:['rhein'],fx:['land',0.05]},
   {id:'ribb',name:'Molotov–Ribbentrop Pact',x:5,y:1,days:60,req:['rhein'],fx:['research',80]},
   {id:'wareco',name:'War Economy',x:1,y:2,days:70,req:['4yr'],fx:['factory',4,2]},
   {id:'panzer',name:'Panzer Divisions',x:3,y:2,days:70,req:['wehr'],fx:['army',3]},
   {id:'ansch',name:'Anschluss',x:4,y:2,days:50,req:['wehr'],fx:['factory',3,1]},
   {id:'ussr',name:'Treaty with the USSR',x:6,y:2,days:50,req:['ribb'],fx:['research',60]},
   {id:'totmob',name:'Total Mobilisation',x:1,y:3,days:80,req:['wareco'],fx:['army',3]},
   {id:'luft',name:'Luftwaffe Doctrine',x:3,y:3,days:70,req:['panzer'],fx:['air',80]},
   {id:'sudet',name:'Demand Sudetenland',x:4,y:3,days:50,req:['ansch'],fx:['factory',3,1]},
   {id:'danzig',name:'Danzig or War',x:4,y:4,days:70,req:['sudet'],fx:['wargoal','POL']},
   {id:'yellow',name:'Case Yellow',x:2,y:5,days:80,req:['danzig'],fx:['wargoal','FRA']},
   {id:'weser',name:'Operation Weserübung',x:4,y:5,days:60,req:['danzig'],fx:['army',3]},
   {id:'barb',name:'Generalplan Ost',x:6,y:5,days:90,req:['danzig','luft'],fx:['wargoal','SOV']},
   {id:'sealion',name:'Operation Sea Lion',x:2,y:6,days:80,req:['yellow'],fx:['army',4]},
   {id:'winterk',name:'Winterausrüstung',x:6,y:6,days:60,req:['barb'],fx:['gear',0.45]},
  ],
  ENG:[
   {id:'rearm',name:'Rearmament',x:2,y:0,days:50,fx:['factory',3,1]},
   {id:'shadow',name:'Shadow Factories',x:1,y:1,days:60,req:['rearm'],fx:['factory',3,1]},
   {id:'raf',name:'Expand the RAF',x:3,y:1,days:60,req:['rearm'],fx:['air',70]},
   {id:'fleet',name:'The Home Fleet',x:4,y:1,days:60,req:['rearm'],fx:['army',2]},
   {id:'warind',name:'War Industry',x:1,y:2,days:70,req:['shadow'],fx:['factory',4,2]},
   {id:'bomber',name:'Bomber Command',x:3,y:2,days:70,req:['raf'],fx:['air',80]},
   {id:'radar',name:'Chain Home Radar',x:4,y:2,days:60,req:['fleet'],fx:['research',90]},
   {id:'imp',name:'Imperial Conscription',x:1,y:3,days:70,req:['warind'],fx:['army',4]},
   {id:'cont',name:'Continental Doctrine',x:3,y:3,days:70,req:['bomber'],fx:['land',0.06]},
   {id:'lease',name:'Cash and Carry',x:4,y:3,days:60,req:['radar'],fx:['factory',3,1]},
   {id:'bef',name:'The Expeditionary Force',x:2,y:4,days:80,req:['imp','cont'],fx:['army',4]},
   {id:'overlord',name:'Plan for Liberation',x:4,y:4,days:90,req:['cont','lease'],fx:['army',4]},
  ],
  FRA:[
   {id:'maginot',name:'Extend the Maginot Line',x:2,y:0,days:60,fx:['land',0.08]},
   {id:'entente',name:'The Little Entente',x:1,y:1,days:60,req:['maginot'],fx:['army',2]},
   {id:'rearm',name:'Rearm the Army',x:3,y:1,days:60,req:['maginot'],fx:['factory',3,1]},
   {id:'alliance',name:'Anglo-French Alliance',x:1,y:2,days:60,req:['entente'],fx:['research',90]},
   {id:'charb',name:'Char B Production',x:3,y:2,days:70,req:['rearm'],fx:['army',3]},
   {id:'airf',name:'Modernise l’Armée de l’Air',x:4,y:2,days:70,req:['rearm'],fx:['air',60]},
   {id:'colonial',name:'Colonial Divisions',x:1,y:3,days:60,req:['alliance'],fx:['army',3]},
   {id:'mech',name:'Mechanise the Army',x:3,y:3,days:70,req:['charb'],fx:['land',0.06]},
   {id:'ardennes',name:'Fortify the Ardennes',x:4,y:3,days:60,req:['airf'],fx:['land',0.05]},
   {id:'levee',name:'Levée en Masse',x:2,y:4,days:80,req:['mech','colonial'],fx:['army',5]},
  ],
  SOV:[
   {id:'fyp',name:'First Five Year Plan',x:3,y:0,days:60,fx:['factory',4,1]},
   {id:'collect',name:'Collectivisation',x:1,y:1,days:70,req:['fyp'],fx:['factory',4,1]},
   {id:'heavy',name:'Heavy Industry',x:3,y:1,days:70,req:['fyp'],fx:['factory',3,2]},
   {id:'avia',name:'Aviation Industry',x:5,y:1,days:70,req:['fyp'],fx:['air',70]},
   {id:'kolkhoz',name:'Kolkhoz Mobilisation',x:1,y:2,days:70,req:['collect'],fx:['army',3]},
   {id:'tankp',name:'Tank Production',x:3,y:2,days:70,req:['heavy'],fx:['army',4]},
   {id:'vvs',name:'Reform the VVS',x:5,y:2,days:70,req:['avia'],fx:['air',80]},
   {id:'siberia',name:'Siberian Industry',x:1,y:3,days:70,req:['kolkhoz'],fx:['factory',4,1]},
   {id:'deepb',name:'Deep Battle Doctrine',x:3,y:3,days:80,req:['tankp'],fx:['land',0.06]},
   {id:'winterw',name:'Winter Warfare',x:5,y:3,days:60,req:['vvs'],fx:['gear',0.3]},
   {id:'massmob',name:'Mass Mobilisation',x:2,y:4,days:90,req:['deepb','siberia'],fx:['army',6]},
   {id:'guards',name:'Guards Divisions',x:4,y:4,days:80,req:['deepb','winterw'],fx:['army',4]},
  ],
  ITA:[
   {id:'autarky',name:'Autarky',x:2,y:0,days:60,fx:['factory',3,1]},
   {id:'corp',name:'The Corporate State',x:1,y:1,days:60,req:['autarky'],fx:['factory',3,1]},
   {id:'regia',name:'Regia Aeronautica',x:3,y:1,days:70,req:['autarky'],fx:['air',60]},
   {id:'marina',name:'Regia Marina',x:4,y:1,days:60,req:['autarky'],fx:['army',2]},
   {id:'black',name:'Blackshirt Legions',x:1,y:2,days:60,req:['corp'],fx:['army',3]},
   {id:'mare',name:'Mare Nostrum',x:3,y:2,days:70,req:['regia'],fx:['army',3]},
   {id:'libya',name:'Fortify Libya',x:4,y:2,days:60,req:['marina'],fx:['land',0.05]},
   {id:'alpini',name:'Alpini Mountain Corps',x:1,y:3,days:60,req:['black'],fx:['gear',0.2]},
   {id:'balkan',name:'Balkan Ambitions',x:3,y:3,days:80,req:['mare'],fx:['wargoal','YUG']},
   {id:'empire',name:'A New Roman Empire',x:2,y:4,days:90,req:['balkan','alpini'],fx:['army',4]},
   {id:'greece',name:'War with Greece',x:4,y:4,days:80,req:['balkan','libya'],fx:['wargoal','GRE']},
  ],
  POL:[
   {id:'fort',name:'Fortify the Frontier',x:2,y:0,days:60,fx:['land',0.07]},
   {id:'cir',name:'Central Industrial Region',x:1,y:1,days:70,req:['fort'],fx:['factory',3,2]},
   {id:'modern',name:'Modernise the Army',x:3,y:1,days:60,req:['fort'],fx:['research',90]},
   {id:'steel',name:'Expand the Steelworks',x:1,y:2,days:70,req:['cir'],fx:['factory',3,1]},
   {id:'cav',name:'Motorise the Cavalry',x:3,y:2,days:60,req:['modern'],fx:['army',3]},
   {id:'airf',name:'Lotnictwo Wojskowe',x:4,y:2,days:60,req:['modern'],fx:['air',40]},
   {id:'winterw',name:'Winter Readiness',x:1,y:3,days:50,req:['steel'],fx:['gear',0.25]},
   {id:'westplan',name:'Plan West',x:3,y:3,days:60,req:['cav'],fx:['land',0.05]},
   {id:'inter',name:'Intermarium',x:2,y:4,days:70,req:['cav','steel'],fx:['army',3]},
   {id:'natdef',name:'National Defence',x:3,y:4,days:80,req:['westplan'],fx:['army',4]},
  ],
};
function wwFocusInit(n){ n.focusDone=new Set(); n.focusProg=null; }
function wwFocusList(natKey){ return WW_FOCUS[natKey] || []; }
function wwFocusById(natKey,id){ return wwFocusList(natKey).find(f=>f.id===id); }
function wwFocusAvail(natKey,id){ const n=WW.byKey[natKey]; if(!n||n.capitulated||n.focusProg) return false;
  if(n.focusDone && n.focusDone.has(id)) return false; const f=wwFocusById(natKey,id); if(!f) return false;
  return (f.req||[]).every(r=>n.focusDone && n.focusDone.has(r)); }
function wwAvailableFocuses(natKey){ const n=WW.byKey[natKey]; if(!n||n.focusProg) return [];
  return wwFocusList(natKey).filter(f=>!(n.focusDone&&n.focusDone.has(f.id)) && (f.req||[]).every(r=>n.focusDone.has(r))); }
function wwAIPickFocus(n, av){ const w=wwAtWar.bind(null); const atWar=n.atWar&&n.atWar.size>0;
  const pr=f=>{ const t=f.fx[0];
    if(t==='wargoal') return atWar?1:6;          // open new wars only when not already busy
    if(t==='army') return atWar?6:3;
    if(t==='gear') return (wwWinterAt(WW.date)>0.3)?7:1;
    if(t==='factory') return atWar?3:5;
    if(t==='air'||t==='land'||t==='research') return 4;
    return 3; };
  return av.slice().sort((a,b)=>pr(b)-pr(a))[0].id; }
function wwStartFocus(natKey, id){ const n=WW.byKey[natKey]; if(!n||n.focusProg||n.capitulated) return false;
  if(!id){ const av=wwAvailableFocuses(natKey); if(!av.length) return false; id=wwAIPickFocus(n, av); }
  if(!wwFocusAvail(natKey,id)) return false;
  const f=wwFocusById(natKey,id); n.focusProg={ id, turnsLeft:Math.max(1,Math.round(f.days/7)) }; return true; }
function wwSpawnDivisions(n,count){ const cap=wwCapitalHex(n.key); if(!cap) return;
  let placed=0, id=(WW.armies.reduce((m,a)=>Math.max(m,a.id),0)||0)+1;
  for(const [x,y] of [cap, ...wwNb(cap[0],cap[1])]){ if(placed>=count) break;
    if(wwSea(x,y)||wwArmyAt(x,y)||WW.own[y*WW.cols+x]!==n.i) continue;
    WW.armies.push(wwMakeArmy(id++, n.key, x, y, placed%2?'arm':'inf')); placed++; } }
function wwApplyFocus(n,fx){ const t=fx[0];
  if(t==='factory'){ n.bonusCiv=(n.bonusCiv||0)+fx[1]; n.bonusMil=(n.bonusMil||0)+(fx[2]||0); }
  else if(t==='air'){ wwAddAir(n,fx[1]); }
  else if(t==='research'){ n.research=(n.research||0)+fx[1]; }
  else if(t==='land'){ n.bonusLand=(n.bonusLand||0)+fx[1]; }
  else if(t==='log'){ n.bonusSupply=(n.bonusSupply||0)+fx[1]; }
  else if(t==='army'){ wwSpawnDivisions(n,fx[1]); }
  else if(t==='gear'){ n.winterGear=Math.min(0.95,(n.winterGear||0)+fx[1]); }
  else if(t==='wargoal'){ wwDeclareWar(n.key,fx[1]); } }
function wwFocusTick(n){
  if(!n.focusProg){ if(n.key!==WW.player) wwStartFocus(n.key); return; }
  n.focusProg.turnsLeft--;
  if(n.focusProg.turnsLeft<=0){ const f=wwFocusById(n.key, n.focusProg.id);
    if(f){ n.focusDone=n.focusDone||new Set(); n.focusDone.add(f.id); wwApplyFocus(n,f.fx);
      if(n.key===WW.player) (WW.notify=WW.notify||[]).push({kind:'focus', name:f.name, fx:f.fx});
      else if(WW.log) WW.log.push(n.name+' completes focus: '+f.name); }
    n.focusProg=null; if(n.key!==WW.player) wwStartFocus(n.key); } }

// air power: a national air force that grows from industry and tips battles via air superiority
// air force = three wing types. fighters win air superiority (and escort/intercept),
// CAS supports ground battles but only with control of the sky, strategic bombers
// wreck industry. Curated mixes for the majors; minors scaled from territory.
const WW_AIR = { GER:[110,90,40], ENG:[95,25,80], SOV:[80,90,15], FRA:[75,45,20], ITA:[55,45,20], POL:[22,14,4] };
const WW_DOCTRINE = { balanced:{fighter:0.40,cas:0.35,strat:0.25}, superiority:{fighter:0.65,cas:0.20,strat:0.15},
  support:{fighter:0.40,cas:0.50,strat:0.10}, strategic:{fighter:0.45,cas:0.10,strat:0.45} };
function wwBaseAir(nat){ const P=WW_AIR[nat.key];
  if(P) return {fighter:P[0],cas:P[1],strat:P[2]};
  const tot=Math.round((nat.hexes||0)/35 + (nat.cityList?nat.cityList.length:0)*4);
  return {fighter:Math.round(tot*0.5),cas:Math.round(tot*0.3),strat:Math.round(tot*0.2)}; }
function wwDefaultBuild(nat){ const a=nat.air||wwBaseAir(nat); const t=(a.fighter+a.cas+a.strat)||1;
  return {fighter:a.fighter/t, cas:a.cas/t, strat:a.strat/t}; }
function wwAirTotal(n){ const a=n&&n.air; return a?(a.fighter+a.cas+a.strat):0; }
function wwAddAir(n, amt){ const a=n.air||(n.air=wwBaseAir(n)); const b=n.airBuild||WW_DOCTRINE.balanced;
  a.fighter+=amt*b.fighter; a.cas+=amt*b.cas; a.strat+=amt*b.strat; }
function wwAirDoctrine(natKey, preset){ const n=WW.byKey[natKey], d=WW_DOCTRINE[preset];
  if(n&&d) n.airBuild={fighter:d.fighter,cas:d.cas,strat:d.strat}; }
// fighters over the front — escorts are diverted while running a bombing campaign
function wwFrontFighters(n){ const a=n&&n.air; if(!a) return 0; return a.fighter * (n.bombTarget?0.6:1) * (n.lowFuel?0.8:1); }
function wwAirSup(meKey, foeKey){ const me=WW.byKey[meKey], foe=WW.byKey[foeKey]; if(!me||!foe) return 0;
  const mf=wwFrontFighters(me), ff=wwFrontFighters(foe); if(mf+ff<=0) return 0;
  return Math.max(-1, Math.min(1, (mf-ff)/(mf+ff))); }
function wwAirFactor(meKey, foeKey){
  const me=WW.byKey[meKey], foe=WW.byKey[foeKey]; if(!me||!foe) return 1;
  const sup=wwAirSup(meKey,foeKey);
  let f=1 + 0.16*sup;                                               // fighter superiority swings the battle
  const cas=me.air?me.air.cas:0;
  if(cas>0) f += Math.min(0.22, cas/500)*(0.4 + 0.6*Math.max(0,sup));  // CAS needs control of the sky
  return f; }
function wwSetBombing(natKey, targetKey){ const nn=WW.byKey[natKey]; if(!nn) return;
  if(!targetKey || nn.bombTarget===targetKey){ nn.bombTarget=null; return; }
  if(wwAtWar(natKey,targetKey)) nn.bombTarget=targetKey; }
function wwAIBombing(nn){
  if(wwAirTotal(nn) < 80){ nn.bombTarget=null; return; }
  if(nn.bombTarget){ const t=WW.byKey[nn.bombTarget]; if(t && !t.capitulated && wwAtWar(nn.key,t.key)) return; nn.bombTarget=null; }
  let best=null, bv=-1;
  for(const m of WW.nat){ if(m.capitulated||!wwAtWar(nn.key,m.key)) continue; const v=(m.mil||0)+(m.civ||0)*0.5; if(v>bv){ bv=v; best=m; } }
  if(best) nn.bombTarget=best.key;
}
function wwBombingTick(){
  for(const nn of WW.nat){ if(nn.capitulated||!nn.bombTarget) continue;
    const t=WW.byKey[nn.bombTarget];
    if(!t||t.capitulated||!wwAtWar(nn.key,t.key)){ nn.bombTarget=null; continue; }
    const strat=nn.air?nn.air.strat:0; if(strat<5) continue;
    const sup=wwAirSup(nn.key,t.key);                            // escort advantage over the target
    const penetration=Math.max(0.2, Math.min(1, 0.5+0.5*sup));   // share of bombers reaching the target
    const raw=strat*penetration, interceptors=t.air?t.air.fighter:0;
    t.warDmg=Math.min(0.6, (t.warDmg||0) + raw*raw/(raw+interceptors*0.7+1)*0.0017);
    nn.air.strat=Math.max(2, strat - interceptors*0.018*(1-0.5*Math.max(0,sup)));     // bombers downed
    if(nn.air.fighter>0) nn.air.fighter=Math.max(2, nn.air.fighter - interceptors*0.004); // escorts lost
    if(t.air) t.air.fighter=Math.max(2, t.air.fighter - raw*0.006);                   // defenders lost
    if(WW.log && Math.random()<0.12) WW.log.push(nn.name+' bombs '+t.name+'’s industry');
  }
  for(const nn of WW.nat){ if(nn.warDmg>0) nn.warDmg=Math.max(0, nn.warDmg-0.015); }   // repair
}
function wwCoastal(x,y){ if(wwSea(x,y)) return false; for(const [nx,ny] of wwNb(x,y)) if(wwSea(nx,ny)) return true; return false; }
// every coastal land hex reachable by sea from an army on the coast (amphibious targets)
function wwInvadeTargets(a){
  if(!a || !wwCoastal(a.x,a.y)) return [];
  const RANGE=20, cols=WW.cols, seen=new Uint8Array(cols*WW.rows), q=[]; let qi=0;
  for(const [nx,ny] of wwNb(a.x,a.y)) if(wwSea(nx,ny)){ const idx=ny*cols+nx; if(!seen[idx]){ seen[idx]=1; q.push([nx,ny,1]); } }
  const land=new Set();
  while(qi<q.length){ const [x,y,d]=q[qi++];
    for(const [nx,ny] of wwNb(x,y)){
      if(wwSea(nx,ny)){ if(d<RANGE){ const idx=ny*cols+nx; if(!seen[idx]){ seen[idx]=1; q.push([nx,ny,d+1]); } } }
      else { if(nx===a.x&&ny===a.y) continue; const u=wwArmyAt(nx,ny);
        if(u && (u.nat===a.nat||wwAllied(u.nat,a.nat))) continue; land.add(nx+','+ny); } } }
  return [...land].map(k=>{ const p=k.split(','); return [+p[0],+p[1]]; });
}
function wwInvade(a,tx,ty){
  const d=wwArmyAt(tx,ty), oi=WW.own[ty*WW.cols+tx], owner=oi>=0?WW.nat[oi]:null;
  const friendlyDest = owner && (owner.key===a.nat||wwAllied(owner.key,a.nat)) && !d;
  const foeKey = d ? d.nat : (owner?owner.key:null);
  if(!friendlyDest && foeKey && !wwAtWar(a.nat,foeKey)) wwDeclareWar(a.nat,foeKey);
  a.moved=true; a.org=Math.max(1,a.org-a.maxOrg*0.22);   // the sea crossing costs organization
  if(friendlyDest){ a.x=tx; a.y=ty; return {result:'landed'}; }
  if(d){
    const atk=wwAtkPower(a,tx,ty)*0.55*(0.55+Math.random()*0.45)*wwAirFactor(a.nat,d.nat);   // amphibious assault penalty
    const def=wwDefPower(d,tx,ty)*(0.60+Math.random()*0.40)*wwAirFactor(d.nat,a.nat);
    d.org-=atk*0.85; d.str-=atk*0.20; a.org-=def*0.9; a.str-=def*0.22;
    if(a.str<=1.0){ wwRemoveArmy(a); return {result:'invasion-lost'}; }
    if(d.str<=1.0){ wwRemoveArmy(d); }
    else if(d.org<=0){ if(!wwRetreat(d,a.x,a.y)) wwRemoveArmy(d); }
    else return {result:'repelled'};   // the beach held — landing thrown back
  }
  wwCaptureHex(tx,ty,a.nat); if(!wwArmyAt(tx,ty)){ a.x=tx; a.y=ty; } return {result:'landed'};
}
// grand strategy: pick a main enemy (the weakest, nearest), a schwerpunkt to drive on,
// and a posture (defend if the capital is threatened and we are outnumbered)
function wwAIPlan(n){
  const cap=wwCapitalHex(n.key);
  const enemies=WW.nat.filter(m=>!m.capitulated && wwAtWar(n.key,m.key));
  if(!enemies.length){ n.aiPosture='consolidate'; n.aiObjective=null; n.aiMainEnemy=null; return; }
  const str=k=>wwArmiesOf(k).reduce((s,a)=>s+a.str,0);
  // local balance around the capital sets posture (do not turtle just because the coalition is large)
  let nearMine=0, nearEnemy=0;
  if(cap){ for(const a of WW.armies){ if(Math.hypot(a.x-cap[0],a.y-cap[1])>9) continue;
    if(a.nat===n.key||wwAllied(a.nat,n.key)) nearMine+=a.str; else if(wwAtWar(n.key,a.nat)) nearEnemy+=a.str; } }
  let main=null, bestScore=-1e18;
  for(const m of enemies){ const mc=wwCapitalHex(m.key); if(!mc) continue;
    const dist=cap?Math.hypot(mc[0]-cap[0],mc[1]-cap[1]):0;
    const score=-str(m.key)*0.6 - dist*0.5 + (m.hexes<70?15:0);
    if(score>bestScore){ bestScore=score; main=m; } }
  n.aiMainEnemy=main?main.key:enemies[0].key;
  n.aiObjective=(main&&wwCapitalHex(main.key)) || wwNearestEnemyHex(n.key, cap?cap[0]:55, cap?cap[1]:60, 50);
  n.aiPosture=(nearEnemy>5 && nearEnemy>nearMine*1.2) ? 'defensive' : 'offensive';
}
function wwAINation(n){
  wwAIPlan(n);
  const cap=wwCapitalHex(n.key), mine=wwArmiesOf(n.key);
  const defensive=n.aiPosture==='defensive', oddsNeed=defensive?1.15:0.85;
  // 1) press attacks (posture-aware odds; bias toward the schwerpunkt)
  for(const a of mine){ if(a.moved) continue; const tg=wwAttackTargets(a); if(!tg.length) continue;
    let bestT=null, bestScore=-1e9;
    for(const [x,y] of tg){ const d=wwArmyAt(x,y);
      const ap=wwAtkPower(a,x,y), dp=d?wwDefPower(d,x,y):0.1; let score=ap/(dp+0.1);
      if(!d) score+=1.6; else if(d.org<d.maxOrg*0.45) score+=0.7;
      if(n.aiObjective) score -= Math.hypot(x-n.aiObjective[0],y-n.aiObjective[1])*0.02;
      if(score>bestScore){ bestScore=score; bestT=[x,y]; } }
    if(bestT){ const d=wwArmyAt(bestT[0],bestT[1]);
      const ap=wwAtkPower(a,bestT[0],bestT[1]), dp=d?wwDefPower(d,bestT[0],bestT[1]):0;
      if(!d || ap>=dp*oddsNeed || (d && d.org<d.maxOrg*0.45)) wwAttack(a,bestT[0],bestT[1]); } }
  // 2) concentrate reserves on the objective (or fall back to the capital when defending)
  const objective = defensive ? (cap||n.aiObjective) : (n.aiObjective||cap);
  for(const a of mine){ if(a.moved) continue;
    if(cap && a.x===cap[0] && a.y===cap[1]){
      const threat=wwNb(a.x,a.y).some(([x,y])=>{ const o=WW.own[y*WW.cols+x]; return o>=0 && wwAtWar(n.key,WW.nat[o].key); });
      if(!threat) continue; }   // hold the capital garrison
    const dest=wwAIStep2(a, objective); if(dest) wwMoveArmy(a,dest[0],dest[1]); }
  // 3) amphibious assault toward the main objective
  let inv=0;
  for(const a of mine){ if(a.moved||inv>=1) continue; if(!wwCoastal(a.x,a.y)||a.org<a.maxOrg*0.55) continue;
    const beaches=wwInvadeTargets(a).filter(([x,y])=>{ const o=WW.own[y*WW.cols+x]; return o>=0 && wwAtWar(n.key,WW.nat[o].key); });
    if(!beaches.length) continue;
    const obj=n.aiObjective;
    beaches.sort((p,q)=>{ const dp=wwArmyAt(p[0],p[1]), dq=wwArmyAt(q[0],q[1]); const sp=dp?dp.str:0, sq=dq?dq.str:0;
      if(sp!==sq) return sp-sq; if(!obj) return 0; return Math.hypot(p[0]-obj[0],p[1]-obj[1])-Math.hypot(q[0]-obj[0],q[1]-obj[1]); });
    const [tx,ty]=beaches[0], d=wwArmyAt(tx,ty);
    if(!d || a.str>=d.str*0.95){ wwInvade(a,tx,ty); inv++; } }
}

// ---- battle plans: standing front orders the player paints onto divisions ----
// 'front'  = hold the line — march up to the border, then dig in and defend;
// 'attack' = offensive — push toward the enemy capital, taking favourable fights.
// Ordered divisions auto-execute at the start of each turn (the same primitives
// the AI fronts use), so the player commands armies, not individual hexes (HOI4).
function wwSetOrder(a, order){ if(!a) return; a.order = (order==='front'||order==='attack') ? order : null; }
function wwOnFront(a){
  for(const [x,y] of wwNb(a.x,a.y)){
    const o=WW.own[y*WW.cols+x]; if(o>=0 && wwAtWar(a.nat,WW.nat[o].key)) return true;
    const s=wwArmyAt(x,y); if(s && wwAtWar(a.nat,s.nat)) return true; }
  return false;
}
function wwOrderCounts(natKey){ let front=0,attack=0; for(const a of wwArmiesOf(natKey)){ if(a.order==='front')front++; else if(a.order==='attack')attack++; } return {front,attack}; }
function wwExecuteFront(natKey){
  const n=WW.byKey[natKey]; if(!n) return; const mine=wwArmiesOf(natKey);
  // 1) ordered divisions press attacks (offensive = lenient odds; the line strikes only when strong)
  for(const a of mine){ if(a.moved || !a.order) continue;
    const tg=wwAttackTargets(a); if(!tg.length) continue;
    const oddsNeed = a.order==='attack' ? 0.85 : 1.4;
    let bestT=null,bestScore=-1e9;
    for(const [x,y] of tg){ const d=wwArmyAt(x,y);
      const ap=wwAtkPower(a,x,y), dp=d?wwDefPower(d,x,y):0.1; let score=ap/(dp+0.1);
      if(!d) score+=1.6; else if(d.org<d.maxOrg*0.45) score+=0.7;
      if(score>bestScore){ bestScore=score; bestT=[x,y]; } }
    if(!bestT) continue; const d=wwArmyAt(bestT[0],bestT[1]);
    const ap=wwAtkPower(a,bestT[0],bestT[1]), dp=d?wwDefPower(d,bestT[0],bestT[1]):0;
    const take = d ? (ap>=dp*oddsNeed || (a.order==='attack' && d.org<d.maxOrg*0.4))
                   : (a.order==='attack');   // the line won't chase into empty enemy land
    if(take) wwAttack(a,bestT[0],bestT[1]);
  }
  // 2) ordered divisions advance — offensives march on the objective, the line plugs gaps
  for(const a of mine){ if(a.moved || !a.order) continue;
    if(a.order==='front' && wwOnFront(a)) continue;            // already holding the line
    const obj = a.order==='attack' ? (n.aiObjective || wwAIObjective(natKey,a.x,a.y))
                                   : (wwNearestEnemyHex(natKey,a.x,a.y,40) || wwAIObjective(natKey,a.x,a.y));
    if(!obj) continue;
    const dest=wwAIStep2(a, obj); if(dest) wwMoveArmy(a,dest[0],dest[1]);
  }
}

// production lines: military factories are split across Infantry / Armour / Aircraft;
// each line's efficiency ramps the longer it runs (HOI4). The air line feeds the
// air force (split by air doctrine); the land lines deploy divisions, gated by
// steel + manpower, with armour costing more.
const WW_PROD_PRESETS = { balanced:{inf:0.5,arm:0.3,air:0.2}, infantry:{inf:0.7,arm:0.15,air:0.15},
  armoured:{inf:0.35,arm:0.5,air:0.15}, airforce:{inf:0.35,arm:0.2,air:0.45} };
function wwInitLines(n){ n.lineMix={inf:0.5,arm:0.3,air:0.2}; n.lineEff={inf:0.3,arm:0.3,air:0.3}; n.lineProg={inf:0,arm:0,air:0}; }
function wwSetLineMix(natKey, mix){ const n=WW.byKey[natKey]; if(!n) return; let s=(mix.inf||0)+(mix.arm||0)+(mix.air||0); if(s<=0) s=1;
  n.lineMix={inf:(mix.inf||0)/s, arm:(mix.arm||0)/s, air:(mix.air||0)/s}; }
function wwDeployDivision(n, kind){
  const cap=wwCapitalHex(n.key); let spot=null;
  if(cap && WW.own[cap[1]*WW.cols+cap[0]]===n.i && !wwArmyAt(cap[0],cap[1])) spot=cap;
  else { const fr=wwFrontier(n.i); for(const [x,y] of fr) if(!wwArmyAt(x,y)){ spot=[x,y]; break; } }
  if(!spot) return false; const id=(WW.armies.reduce((m,a)=>Math.max(m,a.id),0)||0)+1;
  WW.armies.push(wwMakeArmy(id,n.key,spot[0],spot[1],kind)); return true;
}
function wwProduction(){
  for(const n of WW.nat){ if(n.capitulated||n.key==='XXX'||!n.mil) continue;
    if(!n.lineMix) wwInitLines(n);
    const milEff=n.mil*(n.winterizing?0.7:1);
    for(const L of ['inf','arm','air']){ const fac=milEff*(n.lineMix[L]||0);
      n.lineEff[L] = fac>0.05 ? Math.min(1, (n.lineEff[L]||0.3)+0.06) : Math.max(0.25, (n.lineEff[L]||0.3)-0.04);
      const out=fac*n.lineEff[L];
      if(L==='air'){ wwAddAir(n, out*0.5); continue; }
      n.lineProg[L]=(n.lineProg[L]||0)+out;
      const cost=L==='arm'?150:110, steelC=L==='arm'?16:10, mpC=L==='arm'?12000:10000;
      let guard=0;
      while(n.lineProg[L]>=cost && (n.manpower||0)>=mpC && (n.steelStock||0)>=steelC && guard++<3){
        n.lineProg[L]-=cost; n.manpower-=mpC; n.steelStock-=steelC; wwDeployDivision(n,L); }
    }
  }
}

function wwDayOfYear(d){ const M=[0,31,59,90,120,151,181,212,243,273,304,334]; return M[d.m-1]+d.d; }
function wwWinterAt(date){ const doy=wwDayOfYear(date); return (1+Math.cos(2*Math.PI*(doy-20)/365.25))/2; }   // 1 deep winter ~Jan 20, 0 mid summer
function wwSeasonName(date){ const m=date.m; return (m>=12||m<=2)?'Winter':m<=5?'Spring':m<=8?'Summer':'Autumn'; }
const WW_GEO={LON_W:-12,LON_E:58,LAT_N:71,LAT_S:32};
const wwMercY=d=>Math.log(Math.tan(Math.PI/4 + d*Math.PI/360));
function wwLatOf(y){ const YN=wwMercY(WW_GEO.LAT_N), YS=wwMercY(WW_GEO.LAT_S); const mY=YN+(y+0.5)/WW.rows*(YS-YN); return (2*Math.atan(Math.exp(mY))-Math.PI/2)*180/Math.PI; }
// per-hex winter severity 0..1 — snow line creeps south as winter deepens; mountains colder
function wwHexWinter(x,y){ const w=wwWinterAt(WW.date); if(w<=0.03) return 0; let line=82-36*w; if(WW.terr[y][x]==='h') line-=6;
  return Math.max(0, Math.min(1, (wwLatOf(y)-line)/12)); }
// national winter readiness: cold nations come prepared, the rest get caught out
const WW_WINTER_BASE={ SOV:0.62, FIN:0.85, NOR:0.62, SWE:0.55, EST:0.5, LAT:0.5, LIT:0.45, POL:0.4, DEN:0.35, IRE:0.3,
  ENG:0.3, FRA:0.25, GER:0.2, HUN:0.25, ROM:0.25, BUL:0.2, YUG:0.2, TUR:0.18, GRE:0.12, ITA:0.1, SPA:0.1, POR:0.1, HOL:0.25, BEL:0.25, SWI:0.5, SLO:0.35, ALB:0.15 };
function wwGear(natKey){ const n=WW.byKey[natKey]; return n?(n.winterGear!=null?n.winterGear:(WW_WINTER_BASE[natKey]||0.2)):0; }
function wwSetWinterizing(natKey, on){ const n=WW.byKey[natKey]; if(n) n.winterizing=!!on; }
const WW_MDAYS=[31,28,31,30,31,30,31,31,30,31,30,31];
function wwAdvanceDate(days){
  const d=WW.date; d.d+=days;
  while(true){ const md=WW_MDAYS[d.m-1]+((d.m===2 && d.y%4===0)?1:0);
    if(d.d<=md) break; d.d-=md; d.m++; if(d.m>12){ d.m=1; d.y++; } }
}
function wwCheckVictory(){
  const me=WW.byKey[WW.player];
  if(me.capitulated){ WW.result={over:true,win:false}; return WW.result; }
  const enemies=WW.nat.filter(n=>!n.capitulated && wwAtWar(WW.player,n.key));
  if(enemies.length===0){ WW.result={over:true,win:true}; return WW.result; }
  return {over:false};
}
function wwSerialize(){
  return { v:1, player:WW.player, difficulty:WW.difficulty, aiPow:WW.aiPow, warOn:WW.warOn,
    date:WW.date, turn:WW.turn, result:WW.result, own:Array.from(WW.own),
    armies:WW.armies.map(a=>({id:a.id,nat:a.nat,x:a.x,y:a.y,kind:a.kind,str:a.str,maxStr:a.maxStr,org:a.org,maxOrg:a.maxOrg,mp:a.mp,moved:a.moved,order:a.order||null})),
    cities:WW.cities.map(c=>({name:c.name,x:c.x,y:c.y,cap:c.cap,nat:c.nat})),
    nat:WW.nat.map(nn=>({key:nn.key,capitulated:!!nn.capitulated,prod:nn.prod||0,air:nn.air,airBuild:nn.airBuild,atWar:[...(nn.atWar||[])],
      techDone:[...(nn.techDone||[])],research:nn.research||0,researching:nn.researching||null,bonusCiv:nn.bonusCiv||0,bonusMil:nn.bonusMil||0,bonusLand:nn.bonusLand||0,bonusSupply:nn.bonusSupply||0,
      focusDone:[...(nn.focusDone||[])],focusProg:nn.focusProg||null,bombTarget:nn.bombTarget||null,warDmg:nn.warDmg||0,winterGear:nn.winterGear,winterizing:!!nn.winterizing,railDepth:nn.railDepth,fuel:nn.fuel||0,manpower:nn.manpower||0,steelStock:nn.steelStock||0,casualties:nn.casualties||0,lineMix:nn.lineMix,lineEff:nn.lineEff,lineProg:nn.lineProg})) };
}
function wwDeserialize(s){
  if(!s||s.v!==1) return null;
  wwBuildState();
  WW.player=s.player; WW.difficulty=s.difficulty||'normal'; WW.aiPow=s.aiPow||1; WW.warOn=!!s.warOn;
  WW.date=s.date; WW.turn=s.turn||0; WW.result=s.result||null;
  WW.own=Int16Array.from(s.own);
  WW.armies=(s.armies||[]).map(a=>Object.assign({},a));
  if(s.cities) WW.cities=s.cities.map(c=>Object.assign({},c));
  for(const ns of (s.nat||[])){ const nn=WW.byKey[ns.key]; if(!nn) continue;
    nn.capitulated=ns.capitulated; nn.prod=ns.prod; nn.atWar=new Set(ns.atWar||[]);
    nn.air = (typeof ns.air==='number') ? {fighter:Math.round(ns.air*0.5),cas:Math.round(ns.air*0.3),strat:Math.round(ns.air*0.2)} : (ns.air||wwBaseAir(nn));
    nn.airBuild = ns.airBuild || wwDefaultBuild(nn);
    nn.techDone=new Set(ns.techDone||[]); nn.research=ns.research||0; nn.researching=ns.researching||null;
    nn.bonusCiv=ns.bonusCiv; nn.bonusMil=ns.bonusMil; nn.bonusLand=ns.bonusLand; nn.bonusSupply=ns.bonusSupply||0;
    nn.focusDone=new Set(ns.focusDone||[]); nn.focusProg=ns.focusProg||null; nn.bombTarget=ns.bombTarget||null; nn.warDmg=ns.warDmg||0;
    nn.winterGear=ns.winterGear!=null?ns.winterGear:(WW_WINTER_BASE[ns.key]||0.2); nn.winterizing=!!ns.winterizing; nn.railDepth=ns.railDepth!=null?ns.railDepth:WW_RAIL_START;
    nn.fuel=ns.fuel||0; nn.manpower=ns.manpower||0; nn.steelStock=ns.steelStock||0; nn.casualties=ns.casualties||0;
    if(ns.lineMix){ nn.lineMix=ns.lineMix; nn.lineEff=ns.lineEff||{inf:0.3,arm:0.3,air:0.3}; nn.lineProg=ns.lineProg||{inf:0,arm:0,air:0}; } else wwInitLines(nn); }
  WW.started=true; WW.on=true; WW._mapDirty=true;
  wwComputeStats(); wwRecomputeSupply();
  return WW;
}
function wwSave(){ try{ if(typeof localStorage!=='undefined'){ localStorage.setItem('ww-save-v1', JSON.stringify(wwSerialize())); return true; } }catch(e){} return false; }
function wwLoadSave(){ try{ if(typeof localStorage==='undefined') return null; const s=localStorage.getItem('ww-save-v1'); return s?JSON.parse(s):null; }catch(e){ return null; } }
function wwHasSave(){ try{ return typeof localStorage!=='undefined' && !!localStorage.getItem('ww-save-v1'); }catch(e){ return false; } }
function wwClearSave(){ try{ if(typeof localStorage!=='undefined') localStorage.removeItem('ww-save-v1'); }catch(e){} }

function wwEndTurn(){
  WW.log=WW.log||[];
  wwRecomputeSupply();
  if(WW.player && WW.byKey[WW.player] && !WW.byKey[WW.player].capitulated) wwExecuteFront(WW.player);
  for(const n of WW.nat){ if(n.key===WW.player||n.capitulated||n.key==='XXX') continue; wwAINation(n); }
  for(const n of WW.nat){ if(n.key===WW.player||n.capitulated||n.key==='XXX') continue; wwAIBombing(n); }
  for(const n of WW.nat){ if(n.capitulated||n.key==='XXX') continue;
    const base=WW_WINTER_BASE[n.key]||0.2;
    if(n.key!==WW.player) n.winterizing = base<0.55 && wwWinterAt(WW.date)>0.35 && n.atWar && n.atWar.size>0;
    if(n.winterGear==null) n.winterGear=base;
    n.winterGear = n.winterizing ? Math.min(0.95, n.winterGear+0.06) : Math.max(base, n.winterGear-0.015);
    n.railDepth = Math.min(WW_RAIL_MAX, (n.railDepth!=null?n.railDepth:WW_RAIL_START) + WW_RAIL_RATE); }
  wwBombingTick();
  wwComputeStats();
  wwEconomyTick();
  wwProduction();
  for(const n of WW.nat){ if(n.capitulated||n.key==='XXX') continue; wwResearchTick(n); wwFocusTick(n); }
  wwRecomputeSupply();
  for(const a of WW.armies){ const sup=wwInSupply(a);
    const en=WW.byKey[a.nat];
    if(!a.moved){ if(sup){ a.org=Math.min(a.maxOrg,a.org+a.maxOrg*0.30);
                    const want=Math.min(0.6, a.maxStr-a.str); if(want>0 && en){ const got=Math.min(want,(en.manpower||0)/WW_MP_PER_STR); a.str+=got; en.manpower=Math.max(0,(en.manpower||0)-got*WW_MP_PER_STR); } }
                  else { a.org=Math.max(1,a.org-a.maxOrg*0.20); const l=Math.min(0.4,a.str-1); if(l>0){ a.str-=l; if(en) en.casualties=(en.casualties||0)+l*WW_MP_PER_STR; } } }
    else if(!sup){ a.org=Math.max(1,a.org-a.maxOrg*0.12); }
    const wsev=wwHexWinter(a.x,a.y)*(1-wwGear(a.nat));
    if(wsev>0.02){ a.org=Math.max(1,a.org-a.maxOrg*wsev*0.25); const l=Math.min(wsev*0.5,a.str-1); if(l>0){ a.str-=l; if(en) en.casualties=(en.casualties||0)+l*WW_MP_PER_STR; } } }
  wwAdvanceDate(7);
  for(const a of WW.armies) a.moved=false;
  WW.turn++; WW._stratDirty=true;
  wwComputeStats();
  return wwCheckVictory();
}

/* ====================================================================
   Everything below is browser-only: rendering, input, UI, sound.
   The game engine above runs headless too (used by the test harness).
   ==================================================================== */
if (typeof document !== 'undefined') (function(){

/* ---------------- canvas & camera ---------------- */
const canvas = document.getElementById('map');
const ctx = canvas.getContext('2d');
const S = 34, HX = Math.sqrt(3)*S, VY = 1.5*S, M = 60;
const mapW = () => HX*(COLS+0.5)+M*2, mapH = () => VY*(ROWS-1)+2*S+M*2;  // per-scenario size
let cam = {x:0, y:0, z:1};
/* ---- graphics quality: players pick a level to match their PC ----
   Each preset scales the work the renderer does: pixel density (huge lever on
   high-DPI screens), frame-rate cap, per-hex terrain decorations & ground
   dressing, weather particles, and the big-map cache resolution. */
const GFX_PRESETS = {
  low:    { dpr:1,   fpsMs:50, decor:false, dressing:false, variation:false, particles:false, cacheMax:2600,
            lighting:false, clouds:false, grain:false, softShadow:false },
  medium: { dpr:1.5, fpsMs:33, decor:true,  dressing:true,  variation:true,  particles:true,  cacheMax:4096,
            lighting:false, clouds:false, grain:false, softShadow:false },
  // "high" adds a cinematic pass: drifting cloud shadows, a directional sun
  // grade, soft blurred counter shadows and a faint film grain.
  high:   { dpr:2,   fpsMs:16, decor:true,  dressing:true,  variation:true,  particles:true,  cacheMax:5200,
            lighting:true,  clouds:true,  grain:true,  softShadow:true },
};
let GFX = Object.assign({ level:'medium' }, GFX_PRESETS.medium);
function loadGfx(){ try{ const l = localStorage.getItem('hoi5-gfx'); if (l && GFX_PRESETS[l]) GFX = Object.assign({level:l}, GFX_PRESETS[l]); }catch(e){} }
loadGfx();
function setGfx(level){
  if (!GFX_PRESETS[level]) return;
  GFX = Object.assign({level}, GFX_PRESETS[level]);
  try{ localStorage.setItem('hoi5-gfx', level); }catch(e){}
  if (typeof resize === 'function') resize();                 // re-apply pixel density
  try{ _cacheKey=''; _terrCacheCv=null; _tintCacheCv=null; }catch(e){}   // re-bake terrain at new quality
  if (typeof requestRender === 'function') requestRender();
}

let DPR = 1;

function resize(){
  DPR = Math.min(window.devicePixelRatio || 1, GFX.dpr);
  canvas.width = innerWidth*DPR; canvas.height = innerHeight*DPR;
  canvas.style.width = innerWidth+'px'; canvas.style.height = innerHeight+'px';
}
window.addEventListener('resize', resize); resize();

// lowest zoom we allow — small maps stay readable (0.35), but big maps (the
// 3×-scale World-at-War-Test) may zoom out far enough to see the whole front.
function minZoom(){
  return Math.min(0.35, Math.min(innerWidth/mapW(), (innerHeight-60)/mapH()) * 0.85);
}
function fitCamera(){
  const mw = mapW(), mh = mapH();
  const z = Math.min(innerWidth/mw, (innerHeight-60)/mh);
  cam.z = Math.max(minZoom(), Math.min(1.4, z));
  cam.x = (mw - innerWidth/cam.z)/2;
  cam.y = (mh - (innerHeight)/cam.z)/2 - 20/cam.z;
}
function hexCenter(x,y){ return [M + HX*(x + 0.5*(y&1)) + HX/2, M + VY*y + S]; }
function toScreen(px,py){ return [(px-cam.x)*cam.z, (py-cam.y)*cam.z]; }
function toWorld(sx,sy){ return [sx/cam.z + cam.x, sy/cam.z + cam.y]; }
function hexFromPixel(wx,wy){
  let best=null, bd=1e9;
  const gy = Math.round((wy - M - S)/VY);
  for (let y=Math.max(0,gy-1); y<=Math.min(ROWS-1,gy+1); y++){
    const gx = Math.round((wx - M - HX/2)/HX - 0.5*(y&1));
    for (let x=Math.max(0,gx-1); x<=Math.min(COLS-1,gx+1); x++){
      const [cx,cy] = hexCenter(x,y);
      const d = (cx-wx)**2 + (cy-wy)**2;
      if (d < bd){ bd=d; best=[x,y]; }
    }
  }
  return bd <= (S*1.05)**2 ? best : null;
}

/* ---------------- ui state ---------------- */
let sel = null;            // selected unit id
let reach = null;          // Map of reachable keys for sel
let selSet = [];           // ids in a combined-arms assault group
let advanceChoice = null;  // {x,y,ids} — pick who advances after a combined kill
let hover = null;          // [x,y] under mouse
let deployKind = null;     // kind being placed
let airTarget = null;      // air group id picking a strike target
let anims = [];            // floating texts / flashes
let scars = [];            // lingering scorched ground & smoke at battle sites
let moveAnim = null;       // {unit, fx,fy, tx,ty, t0, dur}
let aiRunning = false;
let muted = false;
try { muted = localStorage.getItem('barb-muted')==='1'; } catch(e){}
let undoSnap = null;       // serialized state before the player's last move
let showSupply = false, supplyView = null;
let aiSpeed = 0;           // 0 normal · 1 fast · 2 instant
try { aiSpeed = Math.min(2, parseInt(localStorage.getItem('barb-aispeed'),10) || 0); } catch(e){}
let vignette = null, vgW = 0, vgH = 0;
let _sunGrad = null, _sunW = 0, _clouds = null, _grainTile = null, _grainTried = false;

/* High-quality cinematic pass — all guarded so the headless fake-DOM (whose
   canvas methods return undefined) silently skips them. */
function drawCloudShadows(now, vL, vT, vR, vB){
  if (!ctx.createRadialGradient) return;                  // no gradients → skip (fake DOM)
  if (!_clouds){                                          // seed a drifting overcast once
    _clouds = [];
    for (let i=0;i<6;i++) _clouds.push({
      x: ((i*263)%1000)/1000*mapW(), y:((i*457)%1000)/1000*mapH(),
      r: 200+ (i%3)*120, sp: 5+(i%4)*3, ph: i*1.7, sq: 0.55+(i%2)*0.12 });
  }
  const span = mapW()+900;
  for (const c of _clouds){
    let cx = (c.x + now*0.001*c.sp) % span; if (cx<0) cx+=span; cx-=450;
    const cy = c.y + Math.sin(now*0.00018 + c.ph)*36;
    if (cx+c.r < vL || cx-c.r > vR || cy+c.r < vT || cy-c.r > vB) continue;   // off-screen
    const g = ctx.createRadialGradient(cx,cy,c.r*0.15, cx,cy,c.r);
    if (!g || !g.addColorStop) return;
    g.addColorStop(0,'rgba(18,22,28,0.17)'); g.addColorStop(0.7,'rgba(18,22,28,0.09)'); g.addColorStop(1,'rgba(18,22,28,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx,cy,c.r,c.r*c.sq,0.4,0,Math.PI*2); ctx.fill();
  }
}
function grainTile(){                                      // a small noise tile, built once
  if (_grainTile || _grainTried) return _grainTile;
  _grainTried = true;
  try {
    const cv = document.createElement('canvas'); cv.width = cv.height = 96;
    const c = cv.getContext('2d'); if (!c || !c.createImageData) return null;
    const img = c.createImageData(96,96); if (!img || !img.data) return null;
    for (let i=0;i<img.data.length;i+=4){ const v=(Math.random()*255)|0;
      img.data[i]=img.data[i+1]=img.data[i+2]=v; img.data[i+3]=255; }
    c.putImageData(img,0,0); _grainTile = cv;
  } catch(e){ _grainTile = null; }
  return _grainTile;
}
function drawPremiumOverlay(){                             // screen-space sun grade + film grain
  if (GFX.lighting && ctx.createLinearGradient){
    if (!_sunGrad || _sunW!==innerWidth){
      const g = ctx.createLinearGradient(0,0,innerWidth*0.85,innerHeight);
      if (g && g.addColorStop){
        g.addColorStop(0,'rgba(255,241,206,0.12)'); g.addColorStop(0.5,'rgba(255,241,206,0)');
        g.addColorStop(1,'rgba(12,22,42,0.16)'); _sunGrad = g; _sunW = innerWidth;
      }
    }
    if (_sunGrad){ ctx.globalCompositeOperation='soft-light'; ctx.fillStyle=_sunGrad;
      ctx.fillRect(0,0,innerWidth,innerHeight); ctx.globalCompositeOperation='source-over'; }
  }
  if (GFX.grain){
    const g = grainTile();
    if (g){
      ctx.globalAlpha = 0.04; ctx.globalCompositeOperation='overlay';
      const ox=(Math.random()*96)|0, oy=(Math.random()*96)|0;
      for (let x=-ox; x<innerWidth; x+=96) for (let y=-oy; y<innerHeight; y+=96) ctx.drawImage(g,x,y);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation='source-over';
    }
  }
}

const $ = id => document.getElementById(id);
const show = (id,on) => $(id).classList.toggle('hidden', !on);

/* ---------------- sound (tiny WebAudio synth) ---------------- */
let AC = null;
let sfxVol = 0.8, musicVol = 0.4;
try {
  const sv = parseFloat(localStorage.getItem('barb-sfxvol'));  if (!isNaN(sv)) sfxVol = sv;
  const mv = parseFloat(localStorage.getItem('barb-musvol'));  if (!isNaN(mv)) musicVol = mv;
} catch(e){}
function ac(){ if (!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function tone(f, dur, type='square', vol=0.06, slide=0){
  if (muted || sfxVol<=0) return; const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = f;
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40,f+slide), a.currentTime+dur);
  g.gain.value = vol*sfxVol; g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime+dur);
  o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+dur);
}
function noise(dur, vol=0.12){
  if (muted || sfxVol<=0) return; const a = ac(); if (!a) return;
  const n = a.sampleRate*dur, buf = a.createBuffer(1,n,a.sampleRate), d = buf.getChannelData(0);
  for (let i=0;i<n;i++) d[i] = (Math.random()*2-1) * (1-i/n);
  const src = a.createBufferSource(); src.buffer = buf;
  const g = a.createGain(); g.gain.value = vol*sfxVol;
  src.connect(g); g.connect(a.destination); src.start();
}

/* ---------------- soundtrack (original score, synthesized live) ----------------
   In the somber-orchestral spirit of the grand-strategy classics: slow minor-key
   string pads, a lone horn-like melody, distant timpani and a military snare.
   Composed for this game — eight bars in A minor, looping with variations. */
const MUSIC = {
  bpm: 56,
  bars: [   // ch: chord pad (Hz) · mel: [freq, beats] · drum/snare: percussion
    {ch:[110.00,130.81,164.81], mel:[[329.63,2],[261.63,2]], drum:1},   // Am
    {ch:[ 87.31,110.00,130.81], mel:[[261.63,2],[220.00,2]]},           // F
    {ch:[130.81,164.81,196.00], mel:[[196.00,2],[329.63,2]]},           // C
    {ch:[ 98.00,123.47,146.83], mel:[[293.66,2],[246.94,2]], drum:1},   // G
    {ch:[110.00,130.81,164.81], mel:[[220.00,4]]},                      // Am
    {ch:[ 87.31,110.00,130.81], mel:[[261.63,2],[293.66,2]]},           // F
    {ch:[ 73.42, 87.31,110.00], mel:[[349.23,2],[293.66,2]], drum:1},   // Dm
    {ch:[ 82.41,103.83,123.47], mel:[[329.63,4]], snare:1},             // E
  ],
};
let musicGain = null, musicTimer = null, musicBar = 0;
function applyMusicVol(){ if (musicGain) musicGain.gain.value = muted ? 0 : musicVol*0.55; }
function startMusic(){
  const a = ac(); if (!a || musicGain) return;
  musicGain = a.createGain(); applyMusicVol();
  musicGain.connect(a.destination);
  scheduleBar();
}
function padNote(a, f, t, dur){
  for (const det of [1, 1.004]){
    const o = a.createOscillator(), fl = a.createBiquadFilter(), g = a.createGain();
    o.type = 'sawtooth'; o.frequency.value = f*det;
    fl.type = 'lowpass'; fl.frequency.value = 480; fl.Q.value = 0.4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045, t+1.1);
    g.gain.setValueAtTime(0.045, t+dur-0.9);
    g.gain.linearRampToValueAtTime(0.0001, t+dur+0.6);
    o.connect(fl); fl.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t+dur+0.8);
  }
}
function hornNote(a, f, t, dur){
  const o = a.createOscillator(), fl = a.createBiquadFilter(), g = a.createGain();
  const lfo = a.createOscillator(), lg = a.createGain();
  o.type = 'triangle'; o.frequency.value = f;
  lfo.frequency.value = 4.6; lg.gain.value = 2.4;
  lfo.connect(lg); lg.connect(o.frequency);
  fl.type = 'lowpass'; fl.frequency.value = 1500;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.075, t+0.18);
  g.gain.linearRampToValueAtTime(0.05, t+dur*0.7);
  g.gain.linearRampToValueAtTime(0.0001, t+dur+0.25);
  o.connect(fl); fl.connect(g); g.connect(musicGain);
  o.start(t); lfo.start(t); o.stop(t+dur+0.4); lfo.stop(t+dur+0.4);
}
function timpani(a, t){
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(38, t+0.5);
  g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t+0.7);
  o.connect(g); g.connect(musicGain); o.start(t); o.stop(t+0.8);
}
function snareHit(a, t, vol){
  const n = a.sampleRate*0.07, buf = a.createBuffer(1,n,a.sampleRate), d = buf.getChannelData(0);
  for (let i=0;i<n;i++) d[i] = (Math.random()*2-1)*(1-i/n);
  const src = a.createBufferSource(); src.buffer = buf;
  const fl = a.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = 1800;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(fl); fl.connect(g); g.connect(musicGain); src.start(t);
}
function scheduleBar(){
  if (!musicGain || !AC) return;
  const a = AC;
  const beat = 60/MUSIC.bpm, barDur = beat*4;
  const t = a.currentTime + 0.08;
  const bar = MUSIC.bars[musicBar % MUSIC.bars.length];
  const loop = Math.floor(musicBar / MUSIC.bars.length);
  for (const f of bar.ch) padNote(a, f, t, barDur);
  if (loop % 2 === 0){                                  // melody alternates with pad-only passes
    let bt = 0;
    for (const [f, beats] of bar.mel){ hornNote(a, f, t + bt*beat, beats*beat*0.96); bt += beats; }
  }
  if (bar.drum) timpani(a, t);
  if (bar.snare) for (let i=0;i<3;i++) snareHit(a, t + barDur - (0.45 - i*0.15), 0.05 + i*0.015);
  musicBar++;
  musicTimer = setTimeout(scheduleBar, barDur*1000 - 60);
}
// the browser unlocks audio on the first gesture — start the score then
window.addEventListener('pointerdown', ()=>{
  const a = ac();
  if (a && a.state === 'suspended') a.resume();
  if (musicVol > 0) startMusic();
}, {once:false});
const sClick = ()=>tone(660,0.05,'square',0.04);
const sMove  = ()=>tone(220,0.1,'triangle',0.05,-80);
const sShot  = ()=>{ noise(0.18,0.1); tone(120,0.15,'sawtooth',0.05,-60); };
const sBoom  = ()=>{ noise(0.4,0.18); tone(70,0.4,'sawtooth',0.08,-40); };
const sCity  = ()=>{ tone(523,0.12,'square',0.05); setTimeout(()=>tone(659,0.12,'square',0.05),120); setTimeout(()=>tone(784,0.2,'square',0.05),240); };

/* ---------------- engine hooks ---------------- */
onLog = function(){
  const el = $('log');
  el.innerHTML = G.log.slice(-30).map(([c,t])=>`<div class="${c}">${t}</div>`).join('');
  el.scrollTop = el.scrollHeight;
};
onCityTaken = function(c){
  if (c.vp>0) sCity();
  boomAt(c.x, c.y, true);
  floatText(c.x, c.y, '★ '+c.name+' taken', '#ffd34d');
};
onGameOver = function(){ setTimeout(showEnd, 600); };
onAirStrike = function(au, t, res){
  boomAt(t.x, t.y, res.killed);
  floatText(t.x, t.y, '✈ −'+res.dmg, '#9fd8ff');
  if (res.killed) floatText(t.x, t.y, '✕', '#ff5340');
};
onLevelUp = function(u){
  if (G && !G.over && u.side===G.phase) floatText(u.x, u.y, '✚ '+RANK_NAME[unitLevel(u)], '#ffe27a');
};

/* ---------------- historical events, decisions & the winter question ---------------- */
let eventQueue = [];
onEvents = function(evs){ eventQueue.push(...evs); showNextEvent(); };
onWinterDecision = function(){ if (!eventQueue.length && !maybeShowDecision()) maybeShowGear(); };
// in hotseat the seated player may differ from the phase that just started —
// defer to the pass screen; vs the AI, control is returning to us now, so show it
onDecision = function(){ if (G.mode!=='hotseat' && !eventQueue.length) maybeShowDecision(); };
function showNextEvent(){
  if (!eventQueue.length){ show('event-modal', false); if (!maybeShowDecision()) maybeShowGear(); return; }
  const e = eventQueue[0];
  $('event-date').textContent = e.date;
  $('event-title').textContent = e.title;
  $('event-text').innerHTML = e.text;
  const fx = [];
  if (e.pp){
    if (e.pp.G) fx.push(`${flag('G')} ${sideName('G')} production +${e.pp.G} ⚙`);
    if (e.pp.S) fx.push(`${flag('S')} ${sideName('S')} production +${e.pp.S} ⚙`);
  }
  $('event-effect').innerHTML = fx.join(' · ');
  show('event-modal', true);
}
$('btn-event-close').onclick = ()=>{ sClick(); eventQueue.shift(); showNextEvent(); };

/* ---- strategic decisions ---- */
function maybeShowDecision(){
  if (!G || G.over) return false;
  const d = pendingDecision();
  if (!d || d.side !== G.phase) return false;
  if (G.mode !== 'hotseat' && d.side !== G.playerSide) return false;   // AI decides itself
  $('decision-date').textContent = d.date || '';
  $('decision-title').textContent = d.title;
  $('decision-text').innerHTML = d.text;
  const box = $('decision-options'); box.innerHTML = '';
  d.options.forEach((opt, i)=>{
    const b = document.createElement('button');
    b.className = 'primary';
    b.style.cssText = 'text-align:left;padding:10px 14px;';
    b.innerHTML = `<b>${opt.label}</b>`
      + (opt.effect?`<div style="margin-top:5px;font-weight:700;color:#cfe8a8;font-size:12px;">→ ${opt.effect}</div>`:'')
      + (opt.blurb?`<div style="margin-top:3px;font-weight:400;color:#ffe9b8;font-size:12px;">${opt.blurb}</div>`:'');
    b.onclick = ()=>{
      resolveDecision(d.id, i); clearUndo(); sCity();
      show('decision-modal', false);
      updateAll();
      if (!maybeShowDecision()) maybeShowGear();    // chain any further pending decisions
    };
    box.appendChild(b);
  });
  show('decision-modal', true);
  return true;
}

function maybeShowGear(){
  if (!G || G.winterGear !== 'pending' || G.phase !== 'G') return;
  if (G.mode !== 'hotseat' && G.playerSide !== 'G') return;   // AI Germany decides itself
  show('gear-modal', true);
}
$('btn-gear-buy').onclick  = ()=>{ if (decideWinterGear(true)){  clearUndo(); sCity();  show('gear-modal', false); updateAll(); } };
$('btn-gear-front').onclick = ()=>{ if (decideWinterGear(false)){ clearUndo(); sClick(); show('gear-modal', false); updateAll(); } };

/* ---------------- undo · supply view · campaign clock · AI speed ---------------- */
function clearUndo(){ undoSnap = null; updateUndoBtn(); }
function updateUndoBtn(){ $('btn-undo').classList.toggle('hidden', !undoSnap); }
$('btn-undo').onclick = ()=>{
  if (!undoSnap || !G || G.over || aiRunning) return;
  deserialize(undoSnap);
  undoSnap = null; moveAnim = null; scars = [];
  sel = null; reach = null; deployKind = null; airTarget = null;
  sMove(); updateAll(); saveGame();
};
$('btn-next').onclick = ()=>{
  if (!G || G.over || aiRunning) return;
  if (!(G.mode==='hotseat' || G.phase===G.playerSide)) return;
  sClick(); selectNext();
};

function refreshSupplyView(){
  supplyView = (showSupply && G && !G.over)
    ? computeSupply(G.mode==='hotseat' ? G.phase : G.playerSide) : null;
}
$('btn-supply').onclick = ()=>{
  showSupply = !showSupply; sClick();
  $('btn-supply').style.borderColor = showSupply ? 'var(--cyan)' : '';
  $('btn-supply').style.color = showSupply ? 'var(--cyan)' : '';
  refreshSupplyView();
};

const AI_SPEED_LABEL = ['AI: ▶', 'AI: ▶▶', 'AI: ⚡'];
function aiSpeedLabel(){ $('btn-aispeed').textContent = AI_SPEED_LABEL[aiSpeed]; }
$('btn-aispeed').onclick = ()=>{
  aiSpeed = (aiSpeed+1)%3;
  try { localStorage.setItem('barb-aispeed', aiSpeed); } catch(e){}
  aiSpeedLabel(); sClick();
};
aiSpeedLabel();

$('wx-chip').onclick = ()=>{ if (!G) return; buildClock(); show('clock-modal', true); };
$('btn-clock-close').onclick = ()=>show('clock-modal', false);
const WX_FX = {
  clear: ['Clear skies', 'Full marching speed. The attacker’s window — make your gains now.'],
  mud:   ['Mud — Rasputitsa', 'Both sides: +1 movement cost everywhere, attacks ×0.5–0.6, air weakened.'],
  freeze:['Hard frost', 'The ground hardens — movement is normal again, attacks ×0.9. A last window before the snow.'],
  snow:  ['Deep snow', 'German attacks ×0.6 and defense ×0.8 (winter gear softens both), −1 German movement, the Luftwaffe nearly grounded. Winter-hardened troops attack ×1.2.'],
};
function buildClock(){
  // derive the weather phases from this scenario's calendar
  const segs = [];
  for (let t=1; t<=MAX_TURN; t++){
    const w = weatherFor(t);
    if (!segs.length || segs[segs.length-1].w !== w) segs.push({w, a:t, b:t});
    else segs[segs.length-1].b = t;
  }
  let html = '';
  for (const {w, a, b} of segs){
    const [name, fx] = WX_FX[w] || [WX_LABEL[w]||w, ''];
    const now = G.turn >= a && G.turn <= b;
    html += `<div class="clk${now?' now':''}">
      <span class="c-turns">Turns ${a}–${b} · from ${dateStr(a)}</span>
      <div><b>${name}${now?` — NOW (turn ${G.turn})`:''}</b><br><span style="color:var(--dim)">${fx}</span></div></div>`;
  }
  const gearNote = !SCN.winterQuestion ? ''
    : G.winterGear===true ? '✓ Winter equipment ordered — December will bite less.'
    : G.winterGear===false ? '✗ No winter equipment — December will be brutal for the Wehrmacht.'
    : G.winterGear==='pending' ? '⚠ The winter question awaits an answer at German headquarters.'
    : `The winter question reaches German headquarters in mid-August (turn ${SCN.winterQuestion.turn}).`;
  const _td = SCN.turnDays||7, _tdesc = _td===7 ? 'one week' : _td===1 ? 'one day' : _td+' days';
  html += `<div style="margin-top:10px;color:var(--dim);font-size:13px;">Each turn is ${_tdesc}.
    The campaign ends after turn ${MAX_TURN} (${dateStr(MAX_TURN)}).${gearNote?'<br>'+gearNote:''}</div>`;
  $('clock-body').innerHTML = html;
}

/* ---------------- drawing ---------------- */
function hexPath(cx,cy,s){
  ctx.beginPath();
  for (let i=0;i<6;i++){
    const a = Math.PI/180*(60*i-30);
    const px = cx + s*Math.cos(a), py = cy + s*Math.sin(a);
    i ? ctx.lineTo(px,py) : ctx.moveTo(px,py);
  }
  ctx.closePath();
}

/* ---- big-map terrain cache ----
   On the 3×-scale map, re-drawing ~19,000 hexes (trees, contours, coastlines)
   every frame is what grinds weak machines. Instead we bake the STATIC terrain
   to an offscreen canvas once (rebuilt only when the weather changes) and the
   moving front line to a second one (rebuilt only when territory changes), then
   blit those two images each frame. Zoom in close and we fall back to the live
   per-hex draw (few hexes survive the cull) so the detail stays crisp. */
let _terrCacheCv=null, _tintCacheCv=null, _cacheKey='', _cacheF=1, _tintDirty=true;
function _bigMap(){ return COLS*ROWS > 6000; }
function hexPathC(c,cx,cy,s){
  c.beginPath();
  for (let i=0;i<6;i++){ const a=Math.PI/180*(60*i-30), px=cx+s*Math.cos(a), py=cy+s*Math.sin(a); i?c.lineTo(px,py):c.moveTo(px,py); }
  c.closePath();
}
function _cacheCtx(prev){
  const f = Math.min(1, GFX.cacheMax/mapW()); _cacheF = f;
  const W = Math.max(1,Math.ceil(mapW()*f)), H = Math.max(1,Math.ceil(mapH()*f));
  const cv = prev || document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.setTransform(f,0,0,f,0,0);
  return {cv,c};
}
function renderTerrCache(wx){
  const {cv,c} = _cacheCtx(_terrCacheCv); _terrCacheCv = cv;
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++){
    const t=terrainAt(x,y), [cx,cy]=hexCenter(x,y);
    hexPathC(c,cx,cy,S-0.6);
    let col=TERRAIN[t].color;
    if (wx==='snow'&&t!=='~') col={'.':'#9aa295','f':'#6f7d6e','h':'#a8a89a','s':'#8b9389','r':'#7e93a0'}[t]||col;
    else if (wx==='mud'&&(t==='.'||t==='s')) col=t==='.'?'#54482e':'#463f2e';
    c.fillStyle=col; c.fill();
    const hv=(x*2654435761 ^ y*40503)>>>0;
    c.fillStyle = (t==='~'||t==='o') ? `rgba(255,255,255,${(0.022+0.018*Math.sin(hv)).toFixed(3)})`
      : (hv&1)?'rgba(255,255,255,0.030)':'rgba(0,0,0,'+(0.02+(hv%4)*0.012)+')';
    c.fill();
    c.strokeStyle='#00000033'; c.lineWidth=1; c.stroke();
    if (GFX.decor){
    c.save(); c.translate(cx,cy);
    if (t==='f'){ c.fillStyle = wx==='snow' ? '#4e6052' : '#243520';
      for (const [dx,dy] of [[-10,2],[2,-7],[10,6]]){ c.beginPath(); c.moveTo(dx,dy+6); c.lineTo(dx+5,dy-6); c.lineTo(dx+10,dy+6); c.closePath(); c.fill(); }
      if (wx==='snow'){ c.fillStyle='rgba(255,255,255,0.55)';
        for (const [dx,dy] of [[-10,2],[2,-7],[10,6]]){ c.beginPath(); c.moveTo(dx+1.6,dy-2); c.lineTo(dx+5,dy-6); c.lineTo(dx+8.4,dy-2); c.closePath(); c.fill(); } } }
    if (t==='h'){ c.strokeStyle='#00000040'; c.lineWidth=2; c.beginPath(); c.moveTo(-12,6); c.quadraticCurveTo(-6,-6,0,6); c.moveTo(2,2); c.quadraticCurveTo(8,-8,14,4); c.stroke(); }
    if (t==='s'){ c.strokeStyle='#5d7a6a88'; c.lineWidth=1.5;
      for (const [dx,dy] of [[-10,-4],[0,4],[9,-3]]){ c.beginPath(); c.moveTo(dx-4,dy); c.lineTo(dx+4,dy); c.moveTo(dx,dy); c.lineTo(dx,dy-5); c.stroke(); } }
    if (t==='r'){ c.strokeStyle='#7db3c977'; c.lineWidth=3; c.beginPath(); c.moveTo(-S*0.7,-4); c.quadraticCurveTo(0,6,S*0.7,-2); c.stroke(); }
    if (t==='~'){ c.strokeStyle='#3e586e66'; c.lineWidth=1.5; c.beginPath(); c.moveTo(-12,-3); c.quadraticCurveTo(-6,-7,0,-3); c.quadraticCurveTo(6,1,12,-3); c.stroke(); }
    if (t==='o'){ c.strokeStyle='#48719455'; c.lineWidth=1.2; c.beginPath(); c.moveTo(-10,2); c.quadraticCurveTo(-5,-2,0,2); c.quadraticCurveTo(5,6,10,2); c.stroke(); }
    const hs=(x*73856093 ^ y*19349663)>>>0;
    if (wx==='snow'&&t!=='~'&&t!=='r'){ c.fillStyle='rgba(255,255,255,0.30)';
      if (hs%3===0){ c.beginPath(); c.ellipse(-5+(hs%9),6-(hs%4)*2,9,3.2,0,0,Math.PI*2); c.fill(); }
      if (hs%4===1){ c.beginPath(); c.ellipse(7-(hs%6),-4+(hs%5),6,2.4,0,0,Math.PI*2); c.fill(); } }
    if (wx==='mud'&&(t==='.'||t==='s')&&hs%3!==2){
      c.fillStyle='rgba(26,21,10,0.42)'; c.beginPath(); c.ellipse(-4+(hs%8),4-(hs%5),7+(hs%4),3,0,0,Math.PI*2); c.fill();
      c.fillStyle='rgba(140,165,185,0.13)'; c.beginPath(); c.ellipse(-4+(hs%8),3-(hs%5),4,1.3,0,0,Math.PI*2); c.fill(); }
    c.restore();
    }
  }
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++){                   // static coastlines
    const t1=terrainAt(x,y), [ax,ay]=hexCenter(x,y);
    for (const [nx,ny] of neighbors(x,y)){
      if (ny<y||(ny===y&&nx<x)) continue;
      const t2=terrainAt(nx,ny), w1=t1==='~'||t1==='o', w2=t2==='~'||t2==='o';
      if (w1===w2) continue;
      const [bx,by]=hexCenter(nx,ny), mx=(ax+bx)/2, my=(ay+by)/2;
      let dx=bx-ax, dy=by-ay; const L=Math.hypot(dx,dy)||1; dx/=L; dy/=L;
      const ex=-dy*S*0.5, ey=dx*S*0.5;
      c.beginPath(); c.moveTo(mx-ex,my-ey); c.lineTo(mx+ex,my+ey);
      c.strokeStyle='#cdbd8a55'; c.lineWidth=2; c.stroke();
    }
  }
}
function renderTintCache(){
  const {cv,c} = _cacheCtx(_tintCacheCv); _tintCacheCv = cv;
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++){
    const t=terrainAt(x,y); if (t==='~'||t==='o') continue;
    const to=terrOwner(x,y); if (!to) continue;
    const [cx,cy]=hexCenter(x,y); hexPathC(c,cx,cy,S-0.6); c.fillStyle=SIDES[to].tint; c.fill();
  }
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++){                   // front line
    const t1=terrainAt(x,y); if (t1==='~') continue;
    const fa=terrOwner(x,y); if (!fa) continue;
    const [ax,ay]=hexCenter(x,y);
    for (const [nx,ny] of neighbors(x,y)){
      if (ny<y||(ny===y&&nx<x)) continue;
      const t2=terrainAt(nx,ny); if (t2==='~') continue;
      const fb=terrOwner(nx,ny); if (!fb||fb===fa) continue;
      const [bx,by]=hexCenter(nx,ny), mx=(ax+bx)/2, my=(ay+by)/2;
      let dx=bx-ax, dy=by-ay; const L=Math.hypot(dx,dy)||1; dx/=L; dy/=L;
      const ex=-dy*S*0.5, ey=dx*S*0.5;
      c.beginPath(); c.moveTo(mx-ex,my-ey); c.lineTo(mx+ex,my+ey);
      c.strokeStyle='#160d08'; c.lineWidth=4; c.stroke();
      c.strokeStyle='#c4453a'; c.lineWidth=1.6; c.stroke();
    }
  }
  _tintDirty=false;
}
function ensureBigCache(wx){
  const key = SCN.id+'|'+wx+'|'+COLS+'x'+ROWS;
  if (key!==_cacheKey || !_terrCacheCv){ _cacheKey=key; renderTerrCache(wx); _tintDirty=true; }
  if (_tintDirty || !_tintCacheCv) renderTintCache();
}

/* Style A railhead overlay: a warm wash over the railed corridor, a rail line
   with sleepers tracing from the home edge out to each forward depot, gold
   diamonds on railed depot cities and hollow ones on captured-but-not-yet-railed
   cities. Background art — nothing here is a counter. */
function drawRailhead(){
  const rn = railNetwork('G');
  // 1. supplied-corridor wash, fading with distance from the edge
  for (const k of rn.railed){
    const [x,y] = k.split(',').map(Number);
    if (terrainAt(x,y)==='~') continue;
    const [cx,cy] = hexCenter(x,y);
    const a = Math.max(0.04, 0.15 - (rn.dist.get(k)||0)*0.006);
    hexPath(cx,cy,S-0.6); ctx.fillStyle = 'rgba(232,179,75,'+a.toFixed(3)+')'; ctx.fill();
  }
  // 2. rail line: trace every railed German city back to the edge via parents
  const segs = new Set();
  for (const c of G.cities){
    if (c.owner!=='G' || !rn.railed.has(keyOf(c.x,c.y))) continue;
    let k = keyOf(c.x,c.y);
    while (rn.parent.has(k)){ const p = rn.parent.get(k); segs.add(k+'>'+p); k = p; }
  }
  ctx.lineCap = 'round';
  for (const s of segs){                                  // the rail bed
    const [k1,k2] = s.split('>');
    const [x1,y1] = k1.split(',').map(Number), [x2,y2] = k2.split(',').map(Number);
    const [ax,ay] = hexCenter(x1,y1), [bx,by] = hexCenter(x2,y2);
    ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by);
    ctx.strokeStyle = '#1a140c'; ctx.lineWidth = 3.4; ctx.stroke();
    ctx.strokeStyle = '#b9a06a'; ctx.lineWidth = 1.8; ctx.stroke();
  }
  for (const s of segs){                                  // the sleepers (ties)
    const [k1,k2] = s.split('>');
    const [x1,y1] = k1.split(',').map(Number), [x2,y2] = k2.split(',').map(Number);
    const [ax,ay] = hexCenter(x1,y1), [bx,by] = hexCenter(x2,y2);
    let dx=bx-ax, dy=by-ay; const len=Math.hypot(dx,dy)||1, nx=-dy/len, ny=dx/len;
    const n = Math.max(2, Math.round(len/8));
    ctx.strokeStyle = '#d8c48e'; ctx.lineWidth = 1.3;
    for (let i=0;i<=n;i++){ const t=i/n, px=ax+dx*t, py=ay+dy*t;
      ctx.beginPath(); ctx.moveTo(px-nx*3.6, py-ny*3.6); ctx.lineTo(px+nx*3.6, py+ny*3.6); ctx.stroke(); }
  }
  ctx.lineCap = 'butt';
  // 3. forward-depot diamonds: gold = railed & supplying · hollow = captured, rail not here yet
  for (const c of G.cities){
    if (c.owner!=='G') continue;
    const railed = rn.railed.has(keyOf(c.x,c.y));
    const [cx,cy] = hexCenter(c.x,c.y);
    ctx.save(); ctx.translate(cx, cy - S*0.52); ctx.rotate(Math.PI/4);
    if (railed){ ctx.fillStyle = '#ffd98a'; ctx.fillRect(-3.2,-3.2,6.4,6.4);
      ctx.strokeStyle='#7a5a16'; ctx.lineWidth=1; ctx.strokeRect(-3.2,-3.2,6.4,6.4); }
    else { ctx.strokeStyle = '#b6b09a'; ctx.lineWidth = 1.4; ctx.strokeRect(-3,-3,6,6); }
    ctx.restore();
  }
}

/* a city's skyline, drawn at the hex centre (caller has already translated).
   An industrial-era silhouette — building blocks with lit windows, factory
   smokestacks, a domed cathedral — scaled by importance; the great capitals
   (Moscow) get a gold dome. Cosmetic only. */
function drawCity(owner, vp){
  const body = owner==='G' ? '#474e59' : '#6e2a24',
        dark = owner==='G' ? '#363c46' : '#561f1a',
        roof = owner==='G' ? '#3d434d' : '#5f231d';
  ctx.lineWidth = 0.9; ctx.lineJoin = 'round';
  const base = 8;
  const blocks = vp>=5 ? [[-14,9,4],[-10,15,5],[-4,12,5],[2,19,5],[8,13,5],[13,8,4]]
               : vp>=3 ? [[-13,8,4],[-8,13,5],[-2,11,5],[4,16,5],[10,9,4]]
               : vp>=1 ? [[-10,7,5],[-4,12,6],[3,9,5],[9,7,4]]
               :          [[-7,6,5],[-1,9,6],[6,6,5]];
  for (const [bx,bh,bw] of blocks){
    ctx.fillStyle = body; ctx.strokeStyle = '#000a';
    ctx.beginPath(); ctx.rect(bx, base-bh, bw, bh); ctx.fill(); ctx.stroke();
    ctx.fillStyle = roof; ctx.fillRect(bx, base-bh, bw, 1.2);                 // roofline
    ctx.fillStyle = '#ffd98a88';                                             // window grid
    for (let wy=base-bh+2.5; wy<base-1.5; wy+=2.6)
      for (let wx=bx+1; wx<bx+bw-1.2; wx+=2.1)
        if (((wx*7+wy*5)|0)%3) ctx.fillRect(wx, wy, 1.1, 1.3);
  }
  if (vp>=2){ ctx.strokeStyle = '#000a';                                     // factory smokestacks
    for (const sx of (vp>=3 ? [-16,14] : [13])){
      ctx.fillStyle = dark; ctx.fillRect(sx, base-19, 2.2, 19);
      ctx.fillStyle = 'rgba(150,150,150,0.26)';
      ctx.beginPath(); ctx.arc(sx+1, base-21, 2.4, 0, Math.PI*2); ctx.arc(sx+2.4, base-24, 3, 0, Math.PI*2); ctx.fill();
    }
  }
  if (vp>=1){                                                               // domed cathedral
    const dx = vp>=3 ? -2.5 : 1;
    ctx.fillStyle = body; ctx.strokeStyle = '#000a';
    ctx.beginPath(); ctx.rect(dx, base-15, 5, 15); ctx.fill(); ctx.stroke();
    ctx.fillStyle = vp>=5 ? '#c9a23e' : (owner==='G' ? '#6b7480' : '#9a4034');
    ctx.beginPath(); ctx.moveTo(dx, base-15);
    ctx.bezierCurveTo(dx-1, base-21, dx+1.5, base-25, dx+2.5, base-25);
    ctx.bezierCurveTo(dx+3.5, base-25, dx+6, base-21, dx+5, base-15);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(dx+2, base-29, 1, 4);            // finial
  }
  ctx.lineJoin = 'miter';
  if (vp>0){ const sy = vp>=3 ? -24 : -19; ctx.fillStyle = '#ffd34d2e'; star(0,sy,10); ctx.fillStyle = '#ffd34d'; star(0,sy,5); }
}

/* a battle leaves scorched ground and a drifting smoke column that fade over a
   few seconds — so you can read where the front has been bleeding. */
function addScar(x,y){
  scars.push({x, y, t0: performance.now()});
  if (scars.length > 48) scars.shift();
}
function drawScars(){
  const now = performance.now(), LIFE = 9000;
  if (scars.length) scars = scars.filter(s => now - s.t0 < LIFE);
  for (const s of scars){
    const [cx,cy] = hexCenter(s.x, s.y);
    const fade = 1 - (now - s.t0)/LIFE, secs = (now - s.t0)/1000;
    hexPath(cx, cy, S-2.5);                                                  // scorched earth
    ctx.fillStyle = 'rgba(18,12,7,'+(0.42*fade).toFixed(3)+')'; ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,'+(0.26*fade).toFixed(3)+')';                // craters
    const seed = s.x*31 + s.y*47;
    for (let i=0;i<3;i++){ const a = seed + i*2.3;
      ctx.beginPath(); ctx.ellipse(cx+Math.cos(a)*S*0.28, cy+Math.sin(a)*S*0.28, 2.6, 1.7, 0, 0, Math.PI*2); ctx.fill(); }
    for (let i=0;i<3;i++){                                                   // rising, drifting smoke
      const rise = (secs*9 + i*13) % 42;
      const sa = Math.max(0, 0.30*fade*(1 - rise/42));
      if (sa <= 0.01) continue;
      ctx.fillStyle = 'rgba(64,58,52,'+sa.toFixed(3)+')';
      const drift = Math.sin((secs+i)*0.7)*5*(rise/42);
      ctx.beginPath(); ctx.arc(cx + drift, cy - rise, 3 + rise*0.14, 0, Math.PI*2); ctx.fill();
    }
  }
}

function draw(){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle = '#0a0c08'; ctx.fillRect(0,0,innerWidth,innerHeight);
  ctx.scale(cam.z,cam.z); ctx.translate(-cam.x,-cam.y);
  if (!G) return;
  const wx = weatherFor(G.turn);
  const now = performance.now();
  // viewport cull bounds (world space) — only draw what's on screen. Cheap on the
  // small arcade/realistic maps, essential on the 3×-scale World-at-War-Test map.
  const vL = cam.x - S, vT = cam.y - S,
        vR = cam.x + innerWidth/cam.z + S, vB = cam.y + innerHeight/cam.z + S;

  // big maps: blit the cached terrain + front-line images instead of re-drawing
  // ~19,000 hexes a frame. Zoomed in close, fall through to the crisp live draw.
  const useCache = _bigMap() && cam.z <= 1.05;
  if (useCache){
    ensureBigCache(wx);
    ctx.drawImage(_terrCacheCv, 0, 0, mapW(), mapH());
    ctx.drawImage(_tintCacheCv, 0, 0, mapW(), mapH());
  } else {

  // terrain
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++){
    const t = terrainAt(x,y), [cx,cy] = hexCenter(x,y);
    if (cx<vL || cx>vR || cy<vT || cy>vB) continue;
    hexPath(cx,cy,S-0.6);
    let col = TERRAIN[t].color;
    if (wx==='snow' && t!=='~') col = {'.':'#9aa295','f':'#6f7d6e','h':'#a8a89a','s':'#8b9389','r':'#7e93a0'}[t]||col;
    else if (wx==='mud' && (t==='.'||t==='s')) col = t==='.'?'#54482e':'#463f2e';
    ctx.fillStyle = col; ctx.fill();
    // subtle per-hex ground variation; living water shimmer
    if (GFX.variation){
      const hv = (x*2654435761 ^ y*40503) >>> 0;
      if (t==='~' || t==='o'){
        ctx.fillStyle = `rgba(255,255,255,${(0.022 + 0.018*Math.sin(now*0.0011 + hv)).toFixed(3)})`;
      } else {
        ctx.fillStyle = (hv & 1) ? 'rgba(255,255,255,0.030)' : 'rgba(0,0,0,'+(0.02+(hv%4)*0.012)+')';
      }
      ctx.fill();
    }
    // translucent territory tint in each side's color
    const to = t!=='~' && terrOwner(x,y);
    if (to){
      hexPath(cx,cy,S-0.6);
      ctx.fillStyle = SIDES[to].tint;
      ctx.fill();
    }
    ctx.strokeStyle = '#00000033'; ctx.lineWidth = 1; ctx.stroke();
    // decorations (terrain features + seasonal dressing) — skipped on Low quality
    if (GFX.decor || GFX.dressing){
    ctx.save(); ctx.translate(cx,cy);
    if (GFX.decor){
    if (t==='f'){ ctx.fillStyle = wx==='snow' ? '#4e6052' : '#243520';
      for (const [dx,dy] of [[-10,2],[2,-7],[10,6]]){
        ctx.beginPath(); ctx.moveTo(dx,dy+6); ctx.lineTo(dx+5,dy-6); ctx.lineTo(dx+10,dy+6); ctx.closePath(); ctx.fill(); }
      if (wx==='snow'){ ctx.fillStyle = 'rgba(255,255,255,0.55)';   // snow-capped trees
        for (const [dx,dy] of [[-10,2],[2,-7],[10,6]]){
          ctx.beginPath(); ctx.moveTo(dx+1.6,dy-2); ctx.lineTo(dx+5,dy-6); ctx.lineTo(dx+8.4,dy-2); ctx.closePath(); ctx.fill(); } } }
    if (t==='h'){ ctx.strokeStyle='#00000040'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-12,6); ctx.quadraticCurveTo(-6,-6,0,6); ctx.moveTo(2,2); ctx.quadraticCurveTo(8,-8,14,4); ctx.stroke(); }
    if (t==='s'){ ctx.strokeStyle='#5d7a6a88'; ctx.lineWidth=1.5;
      for (const [dx,dy] of [[-10,-4],[0,4],[9,-3]]){
        ctx.beginPath(); ctx.moveTo(dx-4,dy); ctx.lineTo(dx+4,dy); ctx.moveTo(dx,dy); ctx.lineTo(dx,dy-5); ctx.stroke(); } }
    if (t==='r'){ ctx.strokeStyle='#7db3c977'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-S*0.7,-4); ctx.quadraticCurveTo(0,6,S*0.7,-2); ctx.stroke(); }
    if (t==='~'){ ctx.strokeStyle='#3e586e66'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-12,-3); ctx.quadraticCurveTo(-6,-7,0,-3); ctx.quadraticCurveTo(6,1,12,-3); ctx.stroke(); }
    if (t==='o'){ ctx.strokeStyle='#48719455'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(-10,2); ctx.quadraticCurveTo(-5,-2,0,2); ctx.quadraticCurveTo(5,6,10,2); ctx.stroke(); }
    }
    // seasonal ground dressing: snowdrifts in winter, puddles in the rasputitsa
    if (GFX.dressing){
    const hs = (x*73856093 ^ y*19349663) >>> 0;
    if (wx==='snow' && t!=='~' && t!=='r'){
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      if (hs%3===0){ ctx.beginPath(); ctx.ellipse(-5+(hs%9), 6-(hs%4)*2, 9, 3.2, 0, 0, Math.PI*2); ctx.fill(); }
      if (hs%4===1){ ctx.beginPath(); ctx.ellipse(7-(hs%6), -4+(hs%5), 6, 2.4, 0, 0, Math.PI*2); ctx.fill(); }
    }
    if (wx==='mud' && (t==='.'||t==='s')){
      if (hs%3!==2){
        ctx.fillStyle = 'rgba(26,21,10,0.42)';                       // mud pools
        ctx.beginPath(); ctx.ellipse(-4+(hs%8), 4-(hs%5), 7+(hs%4), 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(140,165,185,0.13)';                    // wet sheen
        ctx.beginPath(); ctx.ellipse(-4+(hs%8), 3-(hs%5), 4, 1.3, 0, 0, Math.PI*2); ctx.fill();
      }
    }
    }
    ctx.restore();
    }
  }

  // coastlines, and the front line drawn on the shared edges between territories
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++){
    const t1 = terrainAt(x,y);
    const [ax,ay] = hexCenter(x,y);
    if (ax<vL || ax>vR || ay<vT || ay>vB) continue;
    for (const [nx,ny] of neighbors(x,y)){
      if (ny<y || (ny===y && nx<x)) continue;                 // draw each edge once
      const t2 = terrainAt(nx,ny);
      const w1 = t1==='~'||t1==='o', w2 = t2==='~'||t2==='o';
      const coast = w1 !== w2;
      let front = false;
      if (t1!=='~' && t2!=='~'){
        const fa = terrOwner(x,y), fb = terrOwner(nx,ny);
        front = !!fa && !!fb && fa!==fb;
      }
      if (!coast && !front) continue;
      const [bx,by] = hexCenter(nx,ny);
      const mx=(ax+bx)/2, my=(ay+by)/2;
      let dx=bx-ax, dy=by-ay; const L=Math.hypot(dx,dy)||1; dx/=L; dy/=L;
      const ex=-dy*S*0.5, ey=dx*S*0.5;
      ctx.beginPath(); ctx.moveTo(mx-ex,my-ey); ctx.lineTo(mx+ex,my+ey);
      if (front){
        ctx.strokeStyle = '#160d08'; ctx.lineWidth = 4; ctx.stroke();
        ctx.strokeStyle = '#c4453a'; ctx.lineWidth = 1.6; ctx.stroke();
      } else {
        ctx.strokeStyle = '#cdbd8a55'; ctx.lineWidth = 2; ctx.stroke();
      }
    }
  }
  }  // end live terrain/coastline draw (else of useCache)

  if (GFX.clouds) drawCloudShadows(now, vL, vT, vR, vB);   // high: drifting overcast

  drawScars();   // lingering scorched ground & drifting smoke at battle sites

  // the railhead: rail line, sleepers, supplied-corridor wash, forward depots
  if (railSide('G') && G.railDepth) drawRailhead();

  // supply view: darken everything outside your network
  if (supplyView){
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++){
      if (!passable(x,y) || supplyView.has(keyOf(x,y))) continue;
      const [cx,cy] = hexCenter(x,y);
      hexPath(cx,cy,S-0.6); ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fill();
    }
  }

  // cities
  for (const c of G.cities){
    const [cx,cy] = hexCenter(c.x,c.y);
    ctx.save(); ctx.translate(cx,cy);
    drawCity(c.owner, c.vp);
    ctx.font = '600 11px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillStyle = '#000c'; ctx.fillText(c.name, 1, 25);
    ctx.fillStyle = c.vp>0 ? '#ffe9a8' : '#cfccba'; ctx.fillText(c.name, 0, 24);
    ctx.restore();
  }

  // movement / deploy / attack overlays
  if (deployKind){
    for (const [x,y] of deploySpots(G.phase)){
      const [cx,cy] = hexCenter(x,y);
      hexPath(cx,cy,S-3); ctx.fillStyle = '#69c5c94d'; ctx.fill();
      ctx.strokeStyle = '#69c5c9'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  if (airTarget){
    for (const t of strikeTargets(G.phase)){
      const [cx,cy] = hexCenter(t.x,t.y);
      hexPath(cx,cy,S-2.5); ctx.strokeStyle = '#69c5c9'; ctx.lineWidth = 3; ctx.stroke();
    }
  }
  const su = sel && G.units.find(u=>u.id===sel);
  if (su && reach){
    for (const k of reach.keys()){
      const [x,y] = k.split(',').map(Number);
      const [cx,cy] = hexCenter(x,y);
      hexPath(cx,cy,S-3); ctx.fillStyle = '#e8b34b55'; ctx.fill();
      ctx.strokeStyle = '#ffd98acc'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    if (!su.attacked) for (const t of enemiesInRange(su)){
      const [cx,cy] = hexCenter(t.x,t.y);
      hexPath(cx,cy,S-2.5); ctx.strokeStyle = '#e2493b'; ctx.lineWidth = 3; ctx.stroke();
    }
    // pulsing ring under the selected unit
    const [scx,scy] = hexCenter(su.x,su.y);
    hexPath(scx,scy, S-2 + Math.sin(now*0.006)*1.6);
    ctx.globalAlpha = 0.55 + 0.3*Math.sin(now*0.006);
    ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // combined-arms assault group
  if (selSet.length){
    for (const id of selSet){
      const gu = G.units.find(t=>t.id===id); if (!gu) continue;
      const [cx,cy] = hexCenter(gu.x,gu.y);
      hexPath(cx,cy,S-4); ctx.strokeStyle = '#69c5c9'; ctx.lineWidth = 2.6; ctx.stroke();
    }
  }
  // HQ command aura when an HQ is selected
  if (su && KINDS[su.kind].hq){
    for (let yy=0;yy<ROWS;yy++) for (let xx=0;xx<COLS;xx++){
      if (!passable(xx,yy) || hexDist(xx,yy,su.x,su.y) > HQ_RANGE) continue;
      const [cx,cy] = hexCenter(xx,yy);
      hexPath(cx,cy,S-3); ctx.fillStyle = '#7a9d5418'; ctx.fill();
    }
  }
  // advance-choice: pick who exploits the captured hex
  if (advanceChoice){
    const [tx,ty] = hexCenter(advanceChoice.x, advanceChoice.y);
    hexPath(tx,ty,S-3); ctx.fillStyle = '#69c5c955'; ctx.fill();
    ctx.strokeStyle = '#69c5c9'; ctx.lineWidth = 3; ctx.stroke();
    for (const id of advanceChoice.ids){
      const gu = G.units.find(t=>t.id===id); if (!gu) continue;
      const [ux,uy] = hexCenter(gu.x,gu.y);
      hexPath(ux,uy,S-3); ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2.5; ctx.stroke();
    }
  }
  if (hover){
    const [cx,cy] = hexCenter(hover[0],hover[1]);
    hexPath(cx,cy,S-1.5); ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // units
  const showReady = !aiRunning && (G.mode==='hotseat' || G.phase===G.playerSide);
  const readyPulse = 0.5 + 0.5*Math.sin(now*0.005);
  for (const u of G.units){
    let [cx,cy] = hexCenter(u.x,u.y);
    if (moveAnim && moveAnim.unit.id===u.id){
      const p = Math.min(1,(now-moveAnim.t0)/moveAnim.dur);
      const e = p<0.5 ? 2*p*p : 1-((-2*p+2)**2)/2;
      cx = moveAnim.fx + (cx-moveAnim.fx)*e; cy = moveAnim.fy + (cy-moveAnim.fy)*e;
      if (p>=1) moveAnim = null;
    }
    drawUnit(u, cx, cy);
    // amber "still has orders" pip, top-right of the counter — only your side, your turn
    if (showReady && u.side===G.phase && u.id!==sel && isActionable(u)){
      const px = cx + S*0.52, py = cy - S*0.58;
      ctx.globalAlpha = 0.35 + 0.45*readyPulse;
      ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(px, py, 3.2, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#5a4410'; ctx.lineWidth = 1; ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // floating texts & explosions
  anims = anims.filter(a => now - a.t0 < 1100);
  for (const a of anims){
    const p = (now-a.t0)/1100;
    if (a.type === 'arrow'){
      const pr = Math.min(1, p*2.4);
      const gx = a.x1 + (a.x2-a.x1)*pr, gy = a.y1 + (a.y2-a.y1)*pr;
      ctx.globalAlpha = (1-p)*0.9;
      ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(a.x1,a.y1); ctx.lineTo(gx,gy); ctx.stroke();
      const ang = Math.atan2(a.y2-a.y1, a.x2-a.x1);
      ctx.fillStyle = '#ffd98a';
      ctx.beginPath();
      ctx.moveTo(gx,gy);
      ctx.lineTo(gx-9*Math.cos(ang-0.5), gy-9*Math.sin(ang-0.5));
      ctx.lineTo(gx-9*Math.cos(ang+0.5), gy-9*Math.sin(ang+0.5));
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    if (a.type === 'boom'){
      const pr = Math.min(1, p*1.7);
      const r = (a.big?26:15)*pr + 4;
      ctx.globalAlpha = (1-pr)*0.85;
      ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 3*(1-pr)+0.5;
      ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, Math.PI*2); ctx.stroke();
      ctx.fillStyle = '#ff6b35';
      for (let i=0;i<6;i++){
        const ang = (a.seed + i*60) * Math.PI/180;
        ctx.beginPath();
        ctx.arc(a.x+Math.cos(ang)*r*1.15, a.y+Math.sin(ang)*r*1.15, 2.2*(1-pr)+0.4, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      continue;
    }
    ctx.globalAlpha = 1-p;
    ctx.font = '700 15px Segoe UI'; ctx.textAlign='center';
    ctx.fillStyle = a.color;
    ctx.fillText(a.text, a.x, a.y - p*26);
    ctx.globalAlpha = 1;
  }

  // vignette: focus the eye on the front
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if (!vignette || vgW!==innerWidth || vgH!==innerHeight){
    const g2 = ctx.createRadialGradient
      && ctx.createRadialGradient(innerWidth/2, innerHeight/2, Math.min(innerWidth,innerHeight)*0.45,
                                  innerWidth/2, innerHeight/2, Math.max(innerWidth,innerHeight)*0.78);
    if (g2 && g2.addColorStop){
      g2.addColorStop(0,'rgba(0,0,0,0)'); g2.addColorStop(1,'rgba(0,0,0,0.33)');
      vignette = g2; vgW = innerWidth; vgH = innerHeight;
    }
  }
  if (vignette){ ctx.fillStyle = vignette; ctx.fillRect(0,0,innerWidth,innerHeight); }
  drawPremiumOverlay();                          // high: directional sun grade + film grain
  ctx.scale(cam.z,cam.z); ctx.translate(-cam.x,-cam.y);

  // falling weather: autumn rain in the mud, snowfall in winter (screen space)
  if (wx !== 'clear' && GFX.particles){
    ctx.setTransform(DPR,0,0,DPR,0,0);
    if (wx==='mud'){
      ctx.strokeStyle = 'rgba(150,170,195,0.28)'; ctx.lineWidth = 1;
      for (let i=0;i<70;i++){
        const px = ((i*131 + now*0.18*(1+(i%5)*0.12)) % (innerWidth+60)) - 30;
        const py = ((i*97  + now*(0.30+(i%7)*0.05)) % (innerHeight+40)) - 20;
        ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px-3,py+11); ctx.stroke();
      }
    } else {
      const flakes = wx==='snow' ? 90 : 25;              // a few flurries in the frost
      ctx.fillStyle = '#fff';
      for (let i=0;i<flakes;i++){
        const px = ((i*149 + Math.sin(now*0.0007 + i)*16 + now*0.02*((i%3)+1)) % (innerWidth+40)) - 20;
        const py = ((i*83  + now*(0.05+(i%6)*0.013)) % (innerHeight+30)) - 15;
        ctx.globalAlpha = 0.3 + (i%4)*0.12;
        ctx.beginPath(); ctx.arc(px, py, 1 + (i%3)*0.7, 0, Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

function star(x,y,r){
  ctx.beginPath();
  for (let i=0;i<10;i++){
    const a = Math.PI/5*i - Math.PI/2, rr = i%2 ? r*0.45 : r;
    const px = x+rr*Math.cos(a), py = y+rr*Math.sin(a);
    i ? ctx.lineTo(px,py) : ctx.moveTo(px,py);
  }
  ctx.closePath(); ctx.fill();
}

function drawUnit(u, cx, cy){
  const w = S*1.34, h = S*0.96, k = KINDS[u.kind];
  ctx.save(); ctx.translate(cx,cy);
  // drop shadow, counter, bevel — high quality lifts the counter with a soft
  // blurred shadow; otherwise a cheap hard-offset shadow
  if (GFX.softShadow && cam.z >= 0.62){
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 7;
    ctx.shadowOffsetX = 1.5; ctx.shadowOffsetY = 3;
    ctx.fillStyle = k.color || SIDES[u.side].color;
    roundRect(-w/2,-h/2,w,h,5); ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    roundRect(-w/2+2, -h/2+3, w, h, 5); ctx.fill();
    ctx.fillStyle = k.color || SIDES[u.side].color;
    roundRect(-w/2,-h/2,w,h,5); ctx.fill();
  }
  ctx.strokeStyle = (sel===u.id) ? '#ffd98a' : u.oos ? '#ff5340' : '#000c';
  ctx.lineWidth = (sel===u.id) ? 2.5 : u.oos ? 2 : 1.2; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(-w/2+4,-h/2+1.3); ctx.lineTo(w/2-4,-h/2+1.3); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.moveTo(-w/2+4,h/2-1.3); ctx.lineTo(w/2-4,h/2-1.3); ctx.stroke();
  if (u.side===G.phase && u.moved && (u.attacked || !adjacentEnemies(u).length)){
    roundRect(-w/2,-h/2,w,h,5); ctx.fillStyle = '#00000055'; ctx.fill();
  }
  // NATO-style symbol box (land) and ship silhouettes (naval)
  const bw = w*0.52, bh = h*0.52;
  const bx = -(w*0.13), pale = '#e9e5d2';
  ctx.strokeStyle = pale; ctx.lineWidth = 1.6;
  ctx.strokeRect(bx-bw/2, -bh/2, bw, bh);
  ctx.fillStyle = pale;
  if (k.sym==='inf'){
    ctx.beginPath();
    ctx.moveTo(bx-bw/2,-bh/2); ctx.lineTo(bx+bw/2,bh/2);
    ctx.moveTo(bx+bw/2,-bh/2); ctx.lineTo(bx-bw/2,bh/2); ctx.stroke();
  } else if (k.sym==='arm'){
    ctx.beginPath(); ctx.ellipse(bx,0,bw*0.32,bh*0.3,0,0,Math.PI*2); ctx.stroke();
  } else if (k.sym==='para'){
    ctx.beginPath();                                      // airborne: X under a canopy
    ctx.moveTo(bx-bw/2,bh/2); ctx.lineTo(bx+bw/2,-bh/6);
    ctx.moveTo(bx+bw/2,bh/2); ctx.lineTo(bx-bw/2,-bh/6); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, -bh/6, bw*0.36, Math.PI, 0); ctx.stroke();
  } else if (k.sym==='mot'){                              // motorized: infantry cross + wheels
    ctx.beginPath();
    ctx.moveTo(bx-bw/2,-bh/2); ctx.lineTo(bx+bw/2,bh/2);
    ctx.moveTo(bx+bw/2,-bh/2); ctx.lineTo(bx-bw/2,bh/2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(bx,0,bw*0.36,bh*0.22,0,0,Math.PI*2); ctx.stroke();
  } else if (k.sym==='cav'){                              // cavalry: single diagonal slash
    ctx.beginPath();
    ctx.moveTo(bx-bw/2,bh/2); ctx.lineTo(bx+bw/2,-bh/2); ctx.stroke();
  } else if (k.sym==='cv'){
    ctx.fillRect(bx-bw*0.42, -2.6, bw*0.84, 2.6);         // flight deck
    ctx.fillRect(bx-bw*0.34, 0, bw*0.68, 3);              // hull
    ctx.fillRect(bx+bw*0.10, -5.6, 3.6, 3);               // island
  } else if (k.sym==='bb'){
    ctx.beginPath();                                      // hull with raked bow
    ctx.moveTo(bx-bw*0.42, 0); ctx.lineTo(bx+bw*0.34, 0);
    ctx.lineTo(bx+bw*0.46, -2.4); ctx.lineTo(bx-bw*0.42, -2.4);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(bx-bw*0.42, 0, bw*0.84, 2.6);
    ctx.fillRect(bx-bw*0.24, -5.2, 4, 3);                 // fore turret
    ctx.fillRect(bx+bw*0.05, -5.2, 4, 3);                 // aft turret
    ctx.fillRect(bx-bw*0.04, -7, 1.6, 4.5);               // mast
  } else if (k.sym==='ca'){
    ctx.fillRect(bx-bw*0.34, 0, bw*0.68, 2.4);            // hull
    ctx.fillRect(bx-bw*0.12, -4.4, 3.4, 2.6);             // turret
    ctx.fillRect(bx+bw*0.08, -5.2, 1.6, 3.4);             // funnel
  } else if (k.sym==='tr'){
    ctx.fillRect(bx-bw*0.36, 0, bw*0.72, 2.6);            // hull
    ctx.fillRect(bx-3.8, -4.6, 7.6, 4);                   // deck cargo
  } else if (k.sym==='ss'){
    ctx.beginPath(); ctx.ellipse(bx, 0, bw*0.38, 2.6, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(bx-1.6, -4.6, 3.2, 3.2);                 // sail
    ctx.fillRect(bx+0.2, -6.4, 1, 2.4);                   // periscope
  } else if (k.sym==='hq'){
    ctx.fillRect(bx-bw*0.34, -bh*0.42, 1.6, bh*0.84);     // flagpole
    ctx.beginPath();                                      // command pennant
    ctx.moveTo(bx-bw*0.34+1.6, -bh*0.42);
    ctx.lineTo(bx+bw*0.4, -bh*0.42+3);
    ctx.lineTo(bx-bw*0.34+1.6, -bh*0.42+6);
    ctx.closePath(); ctx.fill();
  }
  // strength badge
  ctx.fillStyle = '#101208'; roundRect(w/2-15,h/2-15,13,12,3); ctx.fill();
  ctx.fillStyle = u.str<=3 ? '#ff8d80' : '#ffe9a8';
  ctx.font = '700 10px Segoe UI'; ctx.textAlign='center';
  ctx.fillText(u.str, w/2-8.5, h/2-5.5);
  // strength bar along the bottom edge
  const frac = Math.max(0, Math.min(1, u.str / k.maxStr));
  ctx.fillStyle = '#000a'; ctx.fillRect(-w/2+3, h/2-2.6, w-6, 2);
  ctx.fillStyle = frac > 0.55 ? '#7a9d54' : frac > 0.3 ? '#e8b34b' : '#e2493b';
  ctx.fillRect(-w/2+3, h/2-2.6, (w-6)*frac, 2);
  // fuel strip just above it (realistic mode, mechanized only)
  if (usesFuel(u)){
    const ff = Math.max(0, Math.min(1, fuelOf(u)/FUEL_MAX));
    ctx.fillStyle = '#000a'; ctx.fillRect(-w/2+3, h/2-4.7, w-6, 1.4);
    ctx.fillStyle = ff > 0.5 ? '#5fa8d8' : ff > 0.2 ? '#e8b34b' : '#e2493b';
    ctx.fillRect(-w/2+3, h/2-4.7, (w-6)*ff, 1.4);
  }
  // entrench pips
  ctx.fillStyle = '#cfe6a8';
  for (let i=0;i<u.entrench;i++) ctx.fillRect(-w/2+3+i*5, h/2-7, 3.5, 3.5);
  // a general's command flies his star
  if (generalOf(u)){ ctx.fillStyle = '#ffd34d'; star(-w/2+8, -h/2+5, 3.5); }
  // veterancy chevrons (top-right): ✚ rank pips
  const lvl = unitLevel(u);
  if (lvl > 0){
    ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 1.5;
    for (let i=0;i<lvl;i++){
      const yy = -h/2 + 4 + i*3.4, cxp = w/2 - 8;
      ctx.beginPath(); ctx.moveTo(cxp-4, yy+2.6); ctx.lineTo(cxp, yy); ctx.lineTo(cxp+4, yy+2.6); ctx.stroke();
    }
  }
  // out of supply
  if (u.oos){
    ctx.fillStyle = '#ff5340'; ctx.font='700 12px Segoe UI';
    ctx.fillText('⚠', w/2-8, -h/2+10);
  }
  ctx.restore();
}
function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}

function floatText(x,y,text,color){
  const [cx,cy] = hexCenter(x,y);
  anims.push({x:cx, y:cy-S*0.4, text, color, t0:performance.now()});
}
function boomAt(x,y,big){
  const [cx,cy] = hexCenter(x,y);
  anims.push({type:'boom', x:cx, y:cy, big:!!big, seed:(x*31+y*47)%360, t0:performance.now()});
  addScar(x,y);                                  // leave scorched ground & smoke behind
}
function attackArrow(att, def){
  const [x1,y1] = hexCenter(att.x,att.y), [x2,y2] = hexCenter(def.x,def.y);
  anims.push({type:'arrow', x1, y1, x2, y2, t0:performance.now()});
}


/* render scheduler: cap to ~30fps and only repaint when something is actually
   moving or has changed. The old loop ran a full repaint 60×/second forever —
   murder on a weak machine, and on the 3×-scale map it re-drew ~19,000 hexes
   every frame. Now idle frames are skipped (a slow heartbeat self-heals any
   missed update), animations run at a capped rate, and input forces a repaint. */
let _needRender = true, _lastFrameTs = 0;
function requestRender(){ _needRender = true; }
function _sceneAnimating(){
  if (typeof aiRunning !== 'undefined' && aiRunning) return true;
  if (!G) return false;
  if (GFX.clouds || GFX.grain) return true;                            // high: living overcast/grain
  const wx = weatherFor(G.turn);
  if ((wx === 'mud' || wx === 'snow') && GFX.particles) return true;    // falling rain/snow
  if (typeof scars !== 'undefined' && scars && scars.length) return true; // drifting smoke
  return false;
}
(function loop(ts){
  requestAnimationFrame(loop);
  ts = ts || (typeof performance!=='undefined' && performance.now ? performance.now() : Date.now());
  const anim = _sceneAnimating();
  const elapsed = ts - _lastFrameTs;
  if (!_needRender && !anim && elapsed < 120) return;                   // idle: ~8fps self-heal
  if (elapsed < GFX.fpsMs) return;                                      // frame-rate cap by quality
  _lastFrameTs = ts; _needRender = false;
  try{ if (G) draw(); }
  catch(e){ if (!window.__drawErr){ window.__drawErr = 1; console.error('draw error:', e); } }
})();

/* ---------------- input ---------------- */
let dragging=false, dragMoved=false, lastMx=0, lastMy=0;
canvas.addEventListener('mousedown', e=>{ dragging=true; dragMoved=false; lastMx=e.clientX; lastMy=e.clientY; canvas.classList.add('dragging'); requestRender(); });
window.addEventListener('mouseup', ()=>{ dragging=false; canvas.classList.remove('dragging'); requestRender(); });
window.addEventListener('mousemove', e=>{
  if (dragging){
    const dx=e.clientX-lastMx, dy=e.clientY-lastMy;
    if (Math.abs(dx)+Math.abs(dy) > 3) dragMoved=true;
    cam.x -= dx/cam.z; cam.y -= dy/cam.z; lastMx=e.clientX; lastMy=e.clientY;
  }
  const [wx,wy] = toWorld(e.clientX, e.clientY);
  hover = hexFromPixel(wx,wy);
  updateTerrainCard(); updatePreview();
  requestRender();
});
canvas.addEventListener('wheel', e=>{
  e.preventDefault();
  const f = e.deltaY < 0 ? 1.12 : 1/1.12;
  const [wx,wy] = toWorld(e.clientX,e.clientY);
  cam.z = Math.max(minZoom(), Math.min(2.2, cam.z*f));
  cam.x = wx - e.clientX/cam.z; cam.y = wy - e.clientY/cam.z;
  requestRender();
}, {passive:false});

canvas.addEventListener('click', e=>{
  if (dragMoved || !G || G.over || aiRunning) return;
  const isHuman = G.mode==='hotseat' || G.phase===G.playerSide;
  if (!isHuman) return;
  const [wx,wy] = toWorld(e.clientX,e.clientY);
  const h = hexFromPixel(wx,wy);
  if (!h) { deselect(); return; }
  const [x,y] = h;
  // air strike targeting mode
  if (airTarget){
    const au = G.air.find(a=>a.id===airTarget);
    const t = unitAt(x,y);
    airTarget = null;
    if (au && t && t.side!==G.phase){
      const res = airStrike(au, t);
      if (res){ clearUndo(); res.killed ? sBoom() : sShot(); }
    }
    $('hint').innerHTML = defaultHint();
    updateAll(); return;
  }
  // deploy mode
  if (deployKind){
    if (doDeploy(G.phase, deployKind, x, y)){ clearUndo(); sCity(); updateAll(); }
    deployKind = null; updateUnitCard(); return;
  }
  const u = unitAt(x,y);
  // advance-choice mode after a combined kill: click a candidate to move it in
  if (advanceChoice){
    if (u && advanceChoice.ids.includes(u.id)) finishAdvance(u);
    else cancelAdvance();
    return;
  }
  const su = sel && G.units.find(t=>t.id===sel);
  if (u && u.side===G.phase){
    if (e.shiftKey){ toggleGroup(u); return; }
    selectUnit(u); selSet = []; sClick(); return;
  }
  if (u && u.side!==G.phase){
    const attackers = combinedAttackers(u);
    if (attackers.length >= 2){ playerGroupAttack(attackers, u); return; }
    if (attackers.length === 1){ playerAttack(attackers[0], u); return; }
  }
  if (su && !su.moved && reach && reach.has(keyOf(x,y))){
    playerMove(su,x,y); return;
  }
  deselect();
});

// right-click cancels whatever you're in the middle of (deploy / air target /
// assault group / selection) without committing anything
canvas.addEventListener('contextmenu', e=>{
  e.preventDefault();
  if (!G || G.over) return;
  if (deployKind || airTarget || advanceChoice || selSet.length || sel){
    deselect(); deployKind=null; airTarget=null; advanceChoice=null; selSet=[];
    $('hint').innerHTML = defaultHint(); updateAll();
  }
});

// double-click recenters the map on that spot (handy on the big maps)
canvas.addEventListener('dblclick', e=>{
  if (!G || dragMoved) return;
  const [wx,wy] = toWorld(e.clientX,e.clientY);
  const h = hexFromPixel(wx,wy);
  if (h) centerOn(h[0],h[1]);
});

/* which currently-selected units can actually reach this enemy */
function combinedAttackers(target){
  const ids = selSet.length ? selSet : (sel ? [sel] : []);
  const out = [];
  for (const id of ids){
    const u = G.units.find(t=>t.id===id);
    if (u && u.side===G.phase && !u.attacked && hexDist(u.x,u.y,target.x,target.y) <= attackRange(u)) out.push(u);
  }
  return out;
}
function toggleGroup(u){
  if (u.attacked) return;                       // a committed unit can't join an assault
  if (sel && sel!==u.id && !selSet.includes(sel)){
    const s0 = G.units.find(t=>t.id===sel);
    if (s0 && !s0.attacked) selSet.push(sel);   // fold the current selection into the group
  }
  if (selSet.includes(u.id)) selSet = selSet.filter(id=>id!==u.id);
  else selSet.push(u.id);
  sel = u.id; reach = (!u.moved) ? reachable(u) : new Map();
  sClick(); updateUnitCard();
  $('hint').innerHTML = selSet.length >= 2
    ? `<b>⚔ Combined assault</b> — ${selSet.length} units · click an adjacent enemy to attack together · Esc clears`
    : 'Shift-click more of your units to add them to a combined assault.';
}
function finishAdvance(u){
  const {x,y} = advanceChoice;
  if (!unitAt(x,y) && hexDist(u.x,u.y,x,y)===1){
    const [fx,fy] = hexCenter(u.x,u.y);
    doMove(u,x,y);
    moveAnim = {unit:u, fx, fy, t0:performance.now(), dur:240}; sMove();
  }
  advanceChoice = null; deselect(); updateAll();
}
function cancelAdvance(){ advanceChoice = null; deselect(); updateAll(); }
function zoomAt(cx, cy, f){            // zoom keeping the given screen point fixed
  const [wx,wy] = toWorld(cx,cy);
  cam.z = Math.max(minZoom(), Math.min(2.2, cam.z*f));
  cam.x = wx - cx/cam.z; cam.y = wy - cy/cam.z;
  requestRender();
}
window.addEventListener('keydown', e=>{
  if (!G || G.over) return;
  // don't hijack typing or keys meant for an open dialog
  if (document.querySelector('.modal-back:not(.hidden)')) return;
  const k = e.key;
  if (k==='Escape'){ deselect(); deployKind=null; airTarget=null; selSet=[]; advanceChoice=null; updateAll(); return; }
  // map navigation — arrow keys pan, +/- (and scroll wheel) zoom
  const pan = 90/cam.z;
  if (k==='ArrowLeft'){  cam.x-=pan; requestRender(); e.preventDefault(); return; }
  if (k==='ArrowRight'){ cam.x+=pan; requestRender(); e.preventDefault(); return; }
  if (k==='ArrowUp'){    cam.y-=pan; requestRender(); e.preventDefault(); return; }
  if (k==='ArrowDown'){  cam.y+=pan; requestRender(); e.preventDefault(); return; }
  if (k==='+' || k==='='){ zoomAt(innerWidth/2, innerHeight/2, 1.15); return; }
  if (k==='-' || k==='_'){ zoomAt(innerWidth/2, innerHeight/2, 1/1.15); return; }
  if (k==='n' || k==='N' || k===' ' || k==='Tab'){ selectNext(); e.preventDefault(); return; }
  if (k==='c' || k==='C'){ const su=sel&&G.units.find(t=>t.id===sel); if (su) centerOn(su.x,su.y); else selectNext(); return; }
  if (k==='e' || k==='E') $('btn-endturn').click();
  if (k==='u' || k==='U'){ if (!$('btn-undo').classList.contains('hidden')) $('btn-undo').onclick(); }
  if (k==='s' || k==='S') $('btn-supply').onclick();
});

function selectUnit(u){
  sel = u.id;
  reach = (!u.moved) ? reachable(u) : new Map();
  updateUnitCard();
}
function deselect(){ sel=null; reach=null; selSet=[]; updateUnitCard(); requestRender(); }
/* a unit still has orders to give if it can move, or can still attack something */
function isActionable(u){ return !u.moved || (!u.attacked && enemiesInRange(u).length>0); }
function actionableUnits(side){ return unitsOf(side).filter(isActionable); }
function centerOn(x,y){
  const [cx,cy] = hexCenter(x,y);
  cam.x = cx - innerWidth/cam.z/2; cam.y = cy - innerHeight/cam.z/2;
  requestRender();
}
function selectNext(){
  const mine = actionableUnits(G.phase);
  if (!mine.length){ $('hint').innerHTML = '<b>All units have their orders.</b> Press <b>E</b> to end the turn.'; return; }
  const i = mine.findIndex(u=>u.id===sel);
  const u = mine[(i+1) % mine.length];        // stable cycle through everyone with orders left
  selectUnit(u); sClick();
  centerOn(u.x,u.y);
}

function playerMove(u,x,y){
  undoSnap = serialize();                    // one-step undo, until anything else happens
  const [fx,fy] = hexCenter(u.x,u.y);
  doMove(u,x,y);
  moveAnim = {unit:u, fx, fy, t0:performance.now(), dur:240};
  sMove();
  reach = new Map();
  updateAll(); updateUnitCard();
}
function playerAttack(att,def){
  clearUndo();
  sShot();
  attackArrow(att, def);
  const ev = resolveCombat(att,def);
  if (ev.defLoss>0 || ev.destroyed) boomAt(ev.defFrom[0], ev.defFrom[1], ev.destroyed);
  if (ev.defLoss>0) floatText(ev.defFrom[0],ev.defFrom[1],'-'+ev.defLoss,'#ff8d80');
  if (ev.atkLoss>0) floatText(att.x,att.y,'-'+ev.atkLoss,'#ffd98a');
  if (ev.destroyed){ sBoom(); floatText(ev.defFrom[0],ev.defFrom[1],'✕ DESTROYED','#ff5340'); }
  deselect(); updateAll();
}
function playerGroupAttack(attackers, def){
  clearUndo();
  sShot();
  const lead = attackers[0];
  for (const a of attackers) attackArrow(a, def);
  const ev = resolveCombat(lead, def, attackers.slice(1));
  if (ev.defLoss>0 || ev.destroyed) boomAt(ev.defFrom[0], ev.defFrom[1], true);
  if (ev.defLoss>0) floatText(ev.defFrom[0],ev.defFrom[1],'-'+ev.defLoss,'#ff8d80');
  if (ev.destroyed){ sBoom(); floatText(ev.defFrom[0],ev.defFrom[1],'✕ DESTROYED','#ff5340'); }
  selSet = [];
  if (ev.choose && ev.choose.length){
    advanceChoice = {x:ev.defFrom[0], y:ev.defFrom[1], ids:ev.choose};
    sel = null; reach = null;
    updateAll();
    $('hint').innerHTML = '<b>Choose who advances</b> into the captured hex — click a ringed unit, or click away to hold.';
    return;
  }
  deselect(); updateAll();
}

/* ---------------- side panel ---------------- */
function updateUnitCard(){
  const body = $('unit-body'), act = $('unit-actions');
  act.innerHTML = '';
  const u = sel && G.units.find(t=>t.id===sel);
  const isHuman = !aiRunning && !G.over && (G.mode==='hotseat' || G.phase===G.playerSide);
  if (!u){
    let html = 'Select one of your units.<br><span style="color:var(--dim)">Shift-click to gang up · N next · E end turn · U undo · S supply</span>';
    body.innerHTML = html;
    if (isHuman){
      for (const k of buyableKinds(G.phase)){
        const b = document.createElement('button');
        b.textContent = `Deploy ${KINDS[k].label} (${KINDS[k].cost}⚙)`;
        b.onclick = ()=>{ deployKind = (deployKind===k?null:k); sClick();
          $('hint').innerHTML = deployKind ? 'Click a <b>highlighted city</b> to deploy — Esc cancels.' : defaultHint(); };
        act.appendChild(b);
      }
    }
    return;
  }
  const k = KINDS[u.kind];
  const g = generalOf(u);
  const cls = u.side==='G'?'ger':'sov';
  body.innerHTML = `
    <div class="${cls}"><span class="big">${flag(u.side)} ${u.name}</span></div>
    <div style="color:var(--dim);margin-bottom:4px;">${k.label}${k.winter?' · winter-hardened':''}</div>
    ${g ? `<div style="color:var(--amber);margin-bottom:2px;">⭐ Gen. ${g.name} · ${genBonusText(g)}</div>
           <div style="color:var(--dim);font-size:12px;font-style:italic;margin-bottom:4px;">${g.bio}</div>` : ''}
    <div class="statrow"><span>Strength</span><span>${u.str} / ${k.maxStr}</span></div>
    <div class="statrow"><span>Attack / Defense</span><span>${k.atk} / ${k.def}</span></div>
    <div class="statrow"><span>Movement</span><span>${k.mp}</span></div>
    ${usesFuel(u) ? `<div class="statrow"><span>⛽ Fuel</span><span class="${fuelOf(u)<=3?'bad':fuelOf(u)>=FUEL_MAX?'good':''}">${fuelOf(u)} / ${FUEL_MAX}${fuelOf(u)<=0?' — DRY':''}</span></div>` : ''}
    ${(k.range||1)>1 ? `<div class="statrow"><span>Gunnery range</span><span>${k.range} hexes</span></div>` : ''}
    ${k.carrier ? `<div class="statrow"><span>Air operations</span><span>✈ floating airfield</span></div>` : ''}
    <div class="statrow"><span>Dug in</span><span>${'▮'.repeat(u.entrench)||'—'}</span></div>
    ${!k.hq ? `<div class="statrow"><span>Experience</span><span>${unitLevel(u)>0?'✚'.repeat(unitLevel(u))+' ':''}${RANK_NAME[unitLevel(u)]}${unitLevel(u)<3?` <span style="color:var(--dim)">(${u.xp||0}/${XP_LEVELS[unitLevel(u)]} xp)</span>`:''}</span></div>` : ''}
    ${underHQ(u) ? `<div class="statrow"><span>Command</span><span class="good">⌂ under HQ (+5% · +1 mp)</span></div>` : ''}
    ${k.hq ? `<div class="statrow"><span>Command radius</span><span>⌂ ${HQ_RANGE} hexes</span></div>` : ''}
    <div class="statrow"><span>Supply</span><span class="${u.oos?'bad':'good'}">${u.oos?'⚠ CUT OFF':'In supply'}</span></div>
    <div class="statrow"><span>This turn</span><span>${u.moved? (u.attacked?'done':'moved') : 'ready'}</span></div>`;
  if (isHuman && u.side===G.phase){
    const r = canReinforce(u);
    if (r){
      const b = document.createElement('button');
      b.textContent = `Reinforce +${r.steps} (${r.cost*r.steps}⚙)`;
      b.onclick = ()=>{ clearUndo(); doReinforce(u); sCity(); updateAll(); updateUnitCard(); };
      act.appendChild(b);
    }
  }
}

function updateAirCard(){
  const body = $('air-body');
  const side = (G.mode==='hotseat') ? G.phase : G.playerSide;
  const mine = airOf(side), foe = airOf(enemyOf(side));
  const isHuman = !aiRunning && !G.over && (G.mode==='hotseat' || G.phase===G.playerSide);
  if (!mine.length && !foe.length && !(isHuman && canBuildAir(side))){ body.innerHTML = '—'; return; }
  body.innerHTML = '';
  for (const au of mine){
    const row = document.createElement('div');
    const status = au.mission==='ready' ? '<span class="good">ready</span>'
                 : au.mission==='patrol' ? '<span style="color:var(--cyan)">on patrol</span>'
                 : '<span style="color:var(--dim)">flown</span>';
    row.innerHTML = `<div class="statrow"><span>✈ ${au.name}</span><span>str ${au.str} · ${status}</span></div>`;
    if (isHuman && au.mission==='ready'){
      const act = document.createElement('div');
      act.style.cssText = 'display:flex;gap:6px;margin:2px 0 6px;';
      const bs = document.createElement('button');
      bs.textContent = '💥 Strike'; bs.style.cssText = 'padding:2px 10px;font-size:12px;';
      bs.onclick = ()=>{ sClick(); airTarget = (airTarget===au.id ? null : au.id);
        $('hint').innerHTML = airTarget
          ? 'Click a <b>ringed enemy</b> to bomb it (damage + digs them out) — Esc cancels.'
          : defaultHint(); };
      const bp = document.createElement('button');
      bp.textContent = '🛡 Patrol'; bp.style.cssText = 'padding:2px 10px;font-size:12px;';
      bp.onclick = ()=>{ clearUndo(); sClick(); setPatrol(au); airTarget=null; updateAll(); };
      act.appendChild(bs); act.appendChild(bp);
      row.appendChild(act);
    }
    if (isHuman){
      const r = canReinfAir(au);
      if (r){
        const ar = document.createElement('div');
        ar.style.cssText = 'margin:0 0 6px;';
        const br = document.createElement('button');
        br.textContent = `⚙ Re-equip +${r.steps} (${r.cost}⚙)`;
        br.style.cssText = 'padding:2px 10px;font-size:12px;';
        br.title = 'Pay production to restore strength now, instead of waiting for the slow rebuild.';
        br.onclick = ()=>{ clearUndo(); sClick(); reinforceAir(au); updateAll(); };
        ar.appendChild(br); row.appendChild(ar);
      }
    }
    body.appendChild(row);
  }
  const foePat = foe.some(p=>p.mission==='patrol');
  const note = document.createElement('div');
  note.style.cssText = 'color:var(--dim);font-size:12px;margin-top:2px;';
  note.innerHTML = foe.length
    ? `Enemy air: ${foe.reduce((a,p)=>a+p.str,0)} str${foePat ? ' — <span class="bad">fighters on patrol!</span>' : ''}`
    : 'Enemy air force destroyed.';
  body.appendChild(note);
  const wm = airWxMul(side);
  if (wm < 1){
    const w = document.createElement('div');
    w.style.cssText = 'color:var(--dim);font-size:12px;';
    w.textContent = wm < 0.5 ? '❄ Aircraft frozen on their fields — barely able to fly.'
                             : 'Bad flying weather — strikes are weakened.';
    body.appendChild(w);
  }
  if (isHuman && canBuildAir(side)){
    const bb = document.createElement('button');
    bb.textContent = `➕ Build Air Wing (${AIR_BUILD_COST}⚙)`;
    bb.style.cssText = 'margin-top:8px;padding:4px 12px;font-size:12px;';
    bb.title = `Raise a fresh air wing at strength ${AIR_BUILD_STR}. It flies next turn.`;
    bb.onclick = ()=>{ clearUndo(); sClick(); buildAir(side); updateAll(); };
    body.appendChild(bb);
  }
}

function updateTerrainCard(){
  if (!hover || !G){ return; }
  const [x,y] = hover;
  const t = effTerrain(x,y), c = cityAt(x,y);
  let html = `<span class="big">${c ? c.name : t.name}</span>`;
  if (c) html += ` <span style="color:var(--dim)">(${t.name}${c.vp?` · ★ objective ×${c.vp}`:''} · ${sideName(c.owner)})</span>`;
  html += `<div class="statrow"><span>Defense bonus</span><span>×${t.def.toFixed(2)}</span></div>
           <div class="statrow"><span>Move cost</span><span>${t.move||'—'}</span></div>
           <div class="statrow"><span>Max dig-in</span><span>${t.dig}</span></div>`;
  const to = terrOwner(x,y);
  if (to) html += `<div class="statrow"><span>Ground held by</span><span>${flag(to)} ${sideName(to)}</span></div>`;
  const u = unitAt(x,y);
  if (u){
    const ug = generalOf(u);
    html += `<div style="margin-top:4px;border-top:1px solid var(--line);padding-top:4px;">
      ${flag(u.side)} <b>${u.name}</b>${ug?' · ⭐ '+ug.name:''} — str ${u.str}${u.oos?' <span class="bad">⚠ no supply</span>':''}</div>`;
  }
  $('terrain-body').innerHTML = html;
}

function updatePreview(){
  const t = hover && unitAt(hover[0],hover[1]);
  if (!G || aiRunning || !t || t.side===G.phase){ show('preview-card', false); return; }
  const attackers = combinedAttackers(t);
  if (!attackers.length){ show('preview-card', false); return; }
  show('preview-card', true);
  // combined-arms assault forecast
  if (attackers.length >= 2){
    const g = previewGroup(attackers, t);
    const list = attackers.map(a=>`${flag(a.side)} ${a.name}`).join('<br>');
    $('preview-body').innerHTML = `
      <div style="color:var(--cyan);font-weight:600;margin-bottom:3px;">⚔ COMBINED ASSAULT ×${attackers.length}</div>
      <div style="font-size:12px;margin-bottom:3px;">${list}</div>
      <div class="vs"><span>${flag(t.side)} ${t.name}</span><span>str ${t.str}</span></div>
      <div class="statrow"><span>Combined odds</span><span class="${g.ratio>=1.2?'good':g.ratio<0.8?'bad':''}">${g.ratio.toFixed(2)} : 1</span></div>
      <div class="statrow"><span>Their expected losses</span><span class="good">≈ ${g.defLoss}</span></div>
      <div class="statrow"><span>Coordination bonus</span><span class="good">+${Math.round((g.synergy-1)*100)}%${g.combinedArms?' · combined arms!':''}</span></div>
      <div style="color:var(--dim);margin-top:3px;">Click the enemy to attack together. If it falls, you choose who advances.</div>`;
    return;
  }
  const su = attackers[0];
  const p = previewCombat(su, t);
  // legible modifier breakdown — green helps the attacker, red helps the defender
  const fmt = m => (m>=1?'+':'−') + Math.round(Math.abs(m-1)*100) + '%';
  const rows = p.factors.map(f=>{
    const helpsAtk = (f.who==='atk') === (f.mul>=1);   // atk×>1 or def×<1 both favor us
    const cls = helpsAtk ? 'good' : 'bad';
    const tag = f.who==='atk' ? 'atk' : 'def';
    return `<div class="statrow" style="font-size:12px"><span style="color:var(--dim)">${f.label} <i>(${tag})</i></span><span class="${cls}">${fmt(f.mul)}</span></div>`;
  }).join('');
  $('preview-body').innerHTML = `
    <div class="vs"><span>${flag(su.side)} ${su.name}</span><span>str ${su.str}</span></div>
    <div class="vs"><span>${flag(t.side)} ${t.name}</span><span>str ${t.str}</span></div>
    <div class="statrow"><span>Odds</span><span class="${p.ratio>=1.2?'good':p.ratio<0.8?'bad':''}">${p.ratio.toFixed(2)} : 1</span></div>
    <div class="statrow"><span>Their expected losses</span><span class="good">≈ ${p.defLoss}</span></div>
    <div class="statrow"><span>Our expected losses</span><span class="bad">≈ ${p.atkLoss}</span></div>
    ${rows ? `<div style="border-top:1px solid var(--line);margin:5px 0 2px;padding-top:3px;color:var(--dim);font-size:11px;letter-spacing:1px;">WHY</div>${rows}` : '<div style="color:var(--dim);font-size:12px;">Even ground, no modifiers.</div>'}
    ${p.retreat ? '<div style="color:var(--amber);margin-top:3px;">Likely to force a retreat'+(retreatHex(t,su)?'':' — NO ESCAPE ROUTE!')+'</div>' : ''}
    <div style="color:var(--dim);margin-top:3px;">Click the enemy to attack.</div>`;
}

function defaultHint(){
  const human = G.mode==='hotseat' || G.phase===G.playerSide;
  if (!human) return 'Enemy is moving…';
  const left = actionableUnits(G.phase).length;
  return left
    ? `<b>${sideName(G.phase)} turn</b> — ${left} unit${left===1?'':'s'} with orders left · <b>N</b>/Space cycles them · drag to pan`
    : `<b>${sideName(G.phase)} turn</b> — all units have orders · press <b>E</b> to end the turn`;
}

function updateTop(){
  $('date-chip').innerHTML = `<b>Turn ${G.turn}/${MAX_TURN}</b> · ${dateStr(G.turn)}`;
  const wx = weatherFor(G.turn);
  const chip = $('wx-chip');
  chip.innerHTML = `Weather: <b>${WX_LABEL[wx]}</b>`;
  chip.className = 't-chip ' + wx;
  $('vp-chip').innerHTML = `${sideName('G')} objectives: <b>${axisVP()}</b>/${TOTAL_VP}`;
  const side = (G.mode==='hotseat') ? G.phase : G.playerSide;
  $('pp-chip').innerHTML = `${sideName(side)} production: <b>${G.pp[side]}</b> ⚙`;
  // "Next" button: shows how many of the active human's units still have orders
  const human = !G.over && !aiRunning && (G.mode==='hotseat' || G.phase===G.playerSide);
  const ready = human ? actionableUnits(G.phase).length : 0;
  const nb = $('btn-next');
  nb.classList.toggle('hidden', ready===0);
  nb.textContent = `⏭ Next · ${ready}`;
}
function updateAll(){ updateTop(); updateUnitCard(); updateAirCard(); onLog(); updateUndoBtn(); refreshSupplyView(); $('hint').innerHTML = defaultHint(); requestRender(); }

/* ---------------- objectives modal ---------------- */
$('btn-objectives').onclick = ()=>{
  const list = G.cities.filter(c=>c.vp>0).sort((a,b)=>b.vp-a.vp).map(c=>
    `<div>${flag(c.owner)} <b>${c.name}</b> — ${'★'.repeat(c.vp)} ${c.owner==='G'?`<span style="color:#9fb0c4">${sideName('G')}-held</span>`:`<span style="color:#e09a90">${sideName('S')}-held</span>`}</div>`).join('');
  $('obj-list').innerHTML = list;
  const vp = axisVP();
  const tierLine = VICTORY_TIERS.slice(0,-1).map(([min,t])=>`★ ${min}+ ${t.toLowerCase()}`).join(' · ');
  const lastTier = VICTORY_TIERS[VICTORY_TIERS.length-1][1].toLowerCase();
  const sdc = SCN.sudden.axisCities;
  $('obj-summary').innerHTML =
    `${sideName('G')} hold <b>${vp}</b> of ${TOTAL_VP} objective points. At the end of turn ${MAX_TURN}:<br>
     ${tierLine} · otherwise ${lastTier}.` +
    (sdc && sdc.length ? `<br>Capturing <b>${sdc.join(' and ')}</b> ends the war at once.` : '');
  show('obj-modal', true);
};
$('btn-obj-close').onclick = ()=>show('obj-modal', false);

/* ---------------- help ---------------- */
$('btn-help').onclick = ()=>show('help-modal',true);
$('btn-help2').onclick = ()=>show('help-modal',true);
$('btn-help-close').onclick = ()=>show('help-modal',false);

/* ---------------- sound / menu buttons ---------------- */
/* ---------------- settings: volume sliders & mute ---------------- */
function syncSoundUI(){
  $('btn-sound').textContent = muted ? '🔇' : '🔊';
  $('btn-mute').textContent = muted ? 'Sound: MUTED' : 'Sound: ON';
  $('vol-music-val').textContent = Math.round(musicVol*100)+'%';
  $('vol-sfx-val').textContent = Math.round(sfxVol*100)+'%';
}
$('btn-sound').onclick = ()=>{ $('vol-music').value = Math.round(musicVol*100);
  $('vol-sfx').value = Math.round(sfxVol*100); syncSoundUI(); syncGfxUI(); show('settings-modal', true); };
$('btn-settings-menu').onclick = $('btn-sound').onclick;
$('btn-settings-main').onclick = $('btn-sound').onclick;
$('btn-settings-close').onclick = ()=>{ show('settings-modal', false); sClick(); };
$('btn-mute').onclick = ()=>{
  muted = !muted;
  try{ localStorage.setItem('barb-muted', muted?'1':'0'); }catch(e){}
  applyMusicVol(); syncSoundUI();
};
$('vol-music').oninput = ()=>{
  musicVol = $('vol-music').value/100;
  try{ localStorage.setItem('barb-musvol', musicVol); }catch(e){}
  if (musicVol > 0) startMusic();
  applyMusicVol(); syncSoundUI();
};
$('vol-sfx').oninput = ()=>{
  sfxVol = $('vol-sfx').value/100;
  try{ localStorage.setItem('barb-sfxvol', sfxVol); }catch(e){}
  syncSoundUI(); tone(440,0.08,'square',0.06);
};
syncSoundUI();

/* ---- graphics quality controls ---- */
const GFX_DESC = {
  low:    'Flat terrain, no decorations or weather effects, 20fps. Best for older / work PCs.',
  medium: 'Trees, contours, weather effects, 30fps, standard pixel density. A good balance.',
  high:   'Cinematic: drifting cloud shadows, directional sunlight, soft counter shadows & film grain — plus 60fps and retina rendering. For a strong gaming PC.',
};
function syncGfxUI(){
  for (const l of ['low','medium','high']) $('gfx-'+l).classList.toggle('sel', GFX.level===l);
  $('gfx-desc').textContent = GFX_DESC[GFX.level] || '';
}
for (const l of ['low','medium','high'])
  $('gfx-'+l).onclick = ()=>{ setGfx(l); syncGfxUI(); sClick(); };
syncGfxUI();
/* ============ THE WORLD AT WAR — native render / input / UI (browser only) ============ */
const WW_S=14, WW_HX=Math.sqrt(3)*WW_S, WW_VY=1.5*WW_S, WW_PAD=20;
const WW_MAJORS=[
  ['GER','Germany','Forge the Axis: smash Poland, then turn west on France.'],
  ['ENG','United Kingdom','Hold the Channel and the seas; bleed the Axis white.'],
  ['FRA','France','Man the line, hold the Ardennes, save the Republic.'],
  ['SOV','Soviet Union','Neutral colossus — arm, expand, and bide your time.'],
  ['ITA','Italy','Mare Nostrum: the Mediterranean and the Balkans beckon.'],
  ['POL','Poland','Defy the giants on both flanks and survive 1939.'],
];
function wwHexCenter(x,y){ return [WW_PAD + WW_HX*(x+0.5*(y&1)) + WW_HX/2, WW_PAD + WW_VY*y + WW_S]; }
function wwHexPath(g,cx,cy,s){ g.beginPath();
  for(let i=0;i<6;i++){ const a=Math.PI/180*(60*i-30), px=cx+s*Math.cos(a), py=cy+s*Math.sin(a); i?g.lineTo(px,py):g.moveTo(px,py); }
  g.closePath(); }
function wwW2S(wx,wy){ const c=WW.cam; return [wx*c.z+c.x, wy*c.z+c.y]; }

let wwRAFpending=false, wwDrag=false, wwDragMoved=false, wwLMx=0, wwLMy=0;
let wwSelNat=null, wwSelHexes=null, wwSelArmy=null, wwReachSet=null, wwTargetSet=null, wwDeclareSet=null, wwInvadeSet=null, wwBound=false;

function wwOpen(){
  show('mode-select', false);
  wwBuildState();
  WW.started=false; WW._mapDirty=true; WW.mapCanvas=null;
  wwSelNat=null; wwSelHexes=null; wwSelArmy=null; wwReachSet=null; wwTargetSet=null; wwDeclareSet=null; wwInvadeSet=null;
  $('ww-screen').classList.remove('hidden');
  $('ww-info').classList.add('hidden');
  $('ww-endturn').classList.add('hidden');
  $('ww-btn-focus').classList.add('hidden'); $('ww-btn-research').classList.add('hidden'); $('ww-btn-air').classList.add('hidden'); $('ww-btn-prod').classList.add('hidden'); $('ww-btn-diplo').classList.add('hidden'); $('ww-winter-toggle').classList.add('hidden'); $('ww-btn-supply').classList.add('hidden'); $('ww-minimap').classList.add('hidden'); $('ww-btn-help').classList.add('hidden'); $('ww-tut').classList.add('hidden');
  $('ww-focus').classList.add('hidden'); $('ww-research').classList.add('hidden'); $('ww-diplo').classList.add('hidden');
  $('ww-pstat').classList.add('hidden');
  $('ww-end').classList.add('hidden');
  $('ww-playerflag').style.display='none'; $('ww-playername').textContent=''; $('ww-turn').textContent='';
  wwBindInput(); wwResize(); wwFit(); wwFillLegend(); wwFillPick(); wwUpdateHUD();
  $('ww-pick').classList.remove('hidden');
  wwRequest();
  if (typeof sClick==='function') sClick();
}
function wwClose(){ WW.on=false; const sc=$('ww-screen'); if(sc) sc.classList.add('hidden'); const fp=$('ww-focus-page'); if(fp) fp.classList.add('hidden'); const rp=$('ww-research-page'); if(rp) rp.classList.add('hidden'); }

function wwFillPick(){
  const row=$('ww-pick-row'); if(!row) return; let html='';
  for(const [key,name,desc] of WW_MAJORS){ const n=WW.byKey[key]; if(!n) continue;
    html+='<div class="ww-pick-card" data-key="'+key+'">'+
      '<div class="ph"><span class="pf" style="background:'+n.col+'"></span><span class="pn">'+name+'</span></div>'+
      '<div class="pd">'+desc+'</div></div>'; }
  row.innerHTML=html;
  for(const el of row.querySelectorAll('.ww-pick-card')) el.onclick=()=>wwStart(el.dataset.key);
  WW._pickDiff=WW._pickDiff||'normal';
  const dr=$('ww-diff-row');
  if(dr){ for(const el of dr.querySelectorAll('.ww-diff')){ el.onclick=()=>{ WW._pickDiff=el.dataset.diff;
    for(const e2 of dr.querySelectorAll('.ww-diff')) e2.classList.toggle('sel', e2===el); }; } }
  const cont=$('ww-continue');
  if(cont){ cont.classList.toggle('hidden', !wwHasSave()); cont.onclick=wwContinue; }
}
function wwEnterGameUI(){
  WW.started=true; WW._mapDirty=true; WW.mapCanvas=null;
  wwSelNat=null; wwSelHexes=null; wwSelArmy=null; wwReachSet=null; wwTargetSet=null; wwDeclareSet=null; wwInvadeSet=null;
  $('ww-pick').classList.add('hidden');
  $('ww-endturn').classList.remove('hidden');
  $('ww-pstat').classList.remove('hidden');
  $('ww-btn-focus').classList.remove('hidden'); $('ww-btn-research').classList.remove('hidden'); $('ww-btn-air').classList.remove('hidden'); $('ww-btn-prod').classList.remove('hidden'); $('ww-btn-diplo').classList.remove('hidden'); $('ww-winter-toggle').classList.remove('hidden'); $('ww-btn-supply').classList.remove('hidden'); $('ww-btn-help').classList.remove('hidden'); wwSetTips();
  WW.mapMode='political'; WW._stratDirty=true; { const mm=$('ww-minimap'); if(mm){ mm.classList.remove('hidden'); mm.width=184; mm.height=180; } } $('ww-btn-supply').classList.remove('on');
  const n=WW.byKey[WW.player];
  $('ww-playerflag').style.display='block'; $('ww-playerflag').style.background=n.col;
  $('ww-playername').textContent=n.name;
  wwFit(); wwUpdateHUD(); wwUpdateInfo(); wwRequest();
  if (typeof sClick==='function') sClick();
}
function wwStart(key){ wwSetup(key, WW._pickDiff||'normal'); wwEnterGameUI(); wwSave(); if(typeof startMusic==='function') startMusic(); wwTutStart(false); }
function wwContinue(){ const s=wwLoadSave(); if(!s||!wwDeserialize(s)) return; wwEnterGameUI(); if(typeof startMusic==='function') startMusic(); }

function wwWorldSize(){ return [WW_HX*(WW.cols+0.5)+WW_PAD*2, WW_VY*(WW.rows-1)+2*WW_S+WW_PAD*2]; }
function wwResize(){ const cv=$('wwCanvas'); const dpr=Math.min(window.devicePixelRatio||1,2);
  const cw=cv.clientWidth||window.innerWidth||1600, ch=cv.clientHeight||window.innerHeight||900;
  cv.width=Math.max(1,Math.floor(cw*dpr)); cv.height=Math.max(1,Math.floor(ch*dpr)); WW._dpr=dpr; }
function wwFit(){ const cv=$('wwCanvas'); const [wW,wH]=wwWorldSize();
  const vw=cv.clientWidth||window.innerWidth, vh=cv.clientHeight||window.innerHeight;
  let z=Math.min(vw/wW,vh/wH)*0.98;
  // when a player nation is chosen, frame a bit tighter on their capital
  const cap = WW.started && wwCapitalHex(WW.player);
  if(cap){ z=Math.min(2.0, z*2.1); const [wx,wy]=wwHexCenter(cap[0],cap[1]);
    WW.cam={ z, x:vw/2-wx*z, y:vh/2-wy*z };
  } else { WW.cam={ z, x:(vw-wW*z)/2, y:(vh-wH*z)/2 }; } }
// smooth, eased zoom: wheel notches push a target the camera glides toward, anchored
// under the cursor. While it animates we draw the cheap cached map (see wwRender's
// _interacting check) and snap back to crisp vector hexes once it settles.
let wwZoomState=null, wwZoomRAF=0;
function wwZoomAt(mx,my,f){
  const cam=WW.cam, curTarget = wwZoomState ? wwZoomState.target : cam.z;
  const target = Math.max(0.18, Math.min(4.5, curTarget*f));
  if(Math.abs(target-cam.z) < 1e-4){ return; }
  wwZoomState = { sx:mx, sy:my, wx:(mx-cam.x)/cam.z, wy:(my-cam.y)/cam.z, target };
  WW._interacting = true;
  if(!wwZoomRAF) wwZoomRAF = requestAnimationFrame(wwZoomTick);
}
function wwZoomTick(){
  wwZoomRAF=0; const st=wwZoomState; if(!st||!WW.on){ WW._interacting=false; wwZoomState=null; return; }
  const cam=WW.cam;
  cam.z += (st.target - cam.z) * 0.33;                        // exponential ease toward the target
  if(Math.abs(st.target - cam.z) <= st.target*0.004) cam.z = st.target;
  cam.x = st.sx - st.wx*cam.z; cam.y = st.sy - st.wy*cam.z;   // keep the cursor over the same world point
  wwRender();
  if(cam.z === st.target){ wwZoomState=null; WW._interacting=false; wwRequest(); }   // settled → one crisp redraw
  else wwZoomRAF = requestAnimationFrame(wwZoomTick);
}

const WW_DETAIL_LO = 0.6, WW_DETAIL_HI = 0.74;   // crisp vector hexes cross-fade in here; the supersampled cache covers below
function wwSmooth(a,b,x){ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
// lon/lat -> world pixel (matches the generator's Mercator grid), for drawing rivers
function wwLonLatToWorld(lon,lat){ const g=WW_GEO, YN=wwMercY(g.LAT_N), YS=wwMercY(g.LAT_S);
  const gx=(lon-g.LON_W)/(g.LON_E-g.LON_W)*WW.cols, gy=(wwMercY(lat)-YN)/(YS-YN)*WW.rows;
  return [WW_PAD + WW_HX*(gx+0.25) + WW_HX/2, WW_PAD + WW_VY*gy + WW_S]; }
const WW_RIVERS=[
  {w:1.05,p:[[8.5,46.5],[9.2,47.5],[7.6,47.6],[7.75,48.6],[8.3,50.0],[6.96,50.94],[6.1,51.85],[4.5,51.9]]},
  {w:1.32,p:[[8.2,48.0],[11.0,48.8],[12.1,49.0],[13.4,48.55],[16.4,48.2],[19.0,47.5],[20.5,44.85],[22.5,44.6],[26.1,44.1],[29.6,45.2]]},
  {w:1.36,p:[[32.0,57.2],[35.9,56.85],[40.0,56.6],[44.0,56.3],[47.5,56.0],[48.0,53.4],[45.0,50.5],[44.5,48.7],[47.5,46.3]]},
  {w:1.05,p:[[31.5,54.8],[30.5,52.5],[30.5,50.45],[32.0,49.4],[34.0,48.6],[33.5,47.5],[32.6,46.6]]},
  {w:0.95,p:[[19.5,49.5],[19.9,50.06],[21.0,51.4],[21.0,52.25],[19.3,52.6],[18.6,53.0],[18.65,54.35]]},
  {w:0.95,p:[[15.8,50.5],[14.4,50.6],[13.7,51.05],[12.2,51.85],[11.6,52.13],[10.0,53.5],[8.9,53.88]]},
  {w:0.85,p:[[18.0,49.6],[17.6,50.2],[17.0,51.1],[15.6,52.0],[14.55,52.34],[14.27,53.0],[14.27,53.87]]},
  {w:0.80,p:[[7.0,44.7],[7.7,45.07],[9.2,45.1],[11.0,45.05],[12.0,45.03],[12.5,44.95]]},
  {w:0.78,p:[[4.8,47.7],[3.0,48.4],[2.35,48.85],[1.5,49.0],[1.1,49.4],[0.2,49.45]]},
  {w:0.85,p:[[4.0,45.0],[3.0,46.5],[1.9,47.9],[0.7,47.4],[-1.0,47.25],[-2.1,47.28]]},
  {w:1.05,p:[[38.5,53.5],[40.0,51.5],[41.5,49.5],[42.5,48.0],[40.5,47.5],[39.4,47.1]]},
];
// Catmull-Rom smoothing for natural meanders
function wwSmoothPath(p, seg){ if(p.length<3) return p.slice(); const out=[];
  for(let i=0;i<p.length-1;i++){ const a=p[i-1]||p[i], b=p[i], c=p[i+1], d=p[i+2]||p[i+1];
    for(let t=0;t<seg;t++){ const s=t/seg, s2=s*s, s3=s2*s;
      out.push([ 0.5*((2*b[0])+(-a[0]+c[0])*s+(2*a[0]-5*b[0]+4*c[0]-d[0])*s2+(-a[0]+3*b[0]-3*c[0]+d[0])*s3),
                 0.5*((2*b[1])+(-a[1]+c[1])*s+(2*a[1]-5*b[1]+4*c[1]-d[1])*s2+(-a[1]+3*b[1]-3*c[1]+d[1])*s3) ]); } }
  out.push(p[p.length-1]); return out; }
// layered, tapered river (dark bank + water body + light sheen), narrow at source -> wide at mouth
// the smoothed river polylines are static — build them once, not every frame
let wwRiverPathCache=null;
function wwRiverPaths(){ if(wwRiverPathCache) return wwRiverPathCache;
  wwRiverPathCache = WW_RIVERS.map(riv=>({ w:riv.w, pts: wwSmoothPath(riv.p.map(q=>wwLonLatToWorld(q[0],q[1])), 7) }));
  return wwRiverPathCache; }
function wwDrawRivers(g){ g.lineCap='round'; g.lineJoin='round';
  const cv=$('wwCanvas'), cam=WW.cam, vw=cv.clientWidth||1600, vh=cv.clientHeight||900, M=30/cam.z;
  const wx0=(0-cam.x)/cam.z-M, wx1=(vw-cam.x)/cam.z+M, wy0=(0-cam.y)/cam.z-M, wy1=(vh-cam.y)/cam.z+M;
  for(const riv of wwRiverPaths()){ const pts=riv.pts, N=pts.length;
    for(let i=1;i<N;i++){ const a=pts[i-1], b=pts[i];
      if((a[0]<wx0&&b[0]<wx0)||(a[0]>wx1&&b[0]>wx1)||(a[1]<wy0&&b[1]<wy0)||(a[1]>wy1&&b[1]>wy1)) continue;   // off-screen
      const f=i/N, wd=(0.5+f*1.9)*riv.w;
      g.strokeStyle='rgba(16,34,52,0.42)'; g.lineWidth=wd+1.1; g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(b[0],b[1]); g.stroke();
      g.strokeStyle='rgba(62,122,176,0.96)'; g.lineWidth=wd;     g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(b[0],b[1]); g.stroke();
      if(wd>1.05){ g.strokeStyle='rgba(158,203,234,0.5)'; g.lineWidth=wd*0.32; g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(b[0],b[1]); g.stroke(); } } }
  g.lineCap='butt'; }
// ---- seasonal snow (severity from the engine's wwHexWinter) ----
function wwSnowPass(g,c0,c1,r0,r1,w){ if(w<=0.03) return;
  for(let y=r0;y<=r1;y++) for(let x=c0;x<=c1;x++){ const s=wwHexWinter(x,y); if(s<0.03) continue; const [cx,cy]=wwHexCenter(x,y); wwHexPath(g,cx,cy,WW_S-0.3);
    g.fillStyle=wwSea(x,y)?'rgba(208,226,240,'+(s*0.26).toFixed(3)+')':'rgba(238,244,250,'+(s*0.6).toFixed(3)+')'; g.fill(); } }
// per-hex terrain decorations drawn only when zoomed in (forest tufts, hill ridges, field stipple)
function wwHexDecor(g, cx, cy, t, hv){
  g.save(); g.translate(cx,cy);
  if(t==='f'){
    g.fillStyle='rgba(22,46,26,0.72)';
    const pts=[[-3.6,1.6],[1,-2.6],[3.4,2],[-1.2,3.2],[2.6,-0.4],[0.2,0.7]], k=hv%pts.length;
    for(let i=0;i<4;i++){ const p=pts[(i+k)%pts.length]; g.beginPath(); g.moveTo(p[0],p[1]+2.3); g.lineTo(p[0]+1.9,p[1]-2.5); g.lineTo(p[0]+3.8,p[1]+2.3); g.closePath(); g.fill(); }
    g.fillStyle='rgba(130,170,120,0.16)'; g.beginPath(); g.moveTo(0.4,-0.5); g.lineTo(1.1,-1.7); g.lineTo(1.8,-0.5); g.closePath(); g.fill();
  } else if(t==='h'){
    g.fillStyle='rgba(255,245,225,0.11)'; g.beginPath(); g.moveTo(-4.6,-1.0); g.lineTo(-0.2,-4.6); g.lineTo(1.6,-2.4); g.lineTo(-2.6,1.2); g.closePath(); g.fill();
    g.fillStyle='rgba(0,0,0,0.17)'; g.beginPath(); g.moveTo(4.6,1.6); g.lineTo(0.4,4.6); g.lineTo(-1.6,2.8); g.lineTo(2.6,-0.4); g.closePath(); g.fill();
    g.strokeStyle='rgba(0,0,0,0.36)'; g.lineWidth=0.9; g.beginPath();
    g.moveTo(-4.2,1.9); g.quadraticCurveTo(-1.6,-1.9,1,1.6); g.moveTo(0.4,3.1); g.quadraticCurveTo(2.6,-0.4,4.6,2.6); g.stroke();
    g.strokeStyle='rgba(255,255,255,0.16)'; g.lineWidth=0.7; g.beginPath(); g.moveTo(-3.6,0.8); g.quadraticCurveTo(-1.3,-2.5,1.2,0.8); g.stroke();
  } else {
    g.fillStyle='rgba(255,255,255,0.05)'; const px=((hv>>3)%5)-2, py=((hv>>6)%5)-2;
    g.fillRect(px,py,1.1,1.1); g.fillRect(px+3,py-1,1.0,1.0); g.fillRect(px-2,py+2,0.9,0.9);
  }
  g.restore();
}
function wwVisibleHexes(){
  const cv=$('wwCanvas'), cam=WW.cam;
  const vw=cv.clientWidth||window.innerWidth, vh=cv.clientHeight||window.innerHeight;
  const wy0=(0-cam.y)/cam.z, wy1=(vh-cam.y)/cam.z, wx0=(0-cam.x)/cam.z, wx1=(vw-cam.x)/cam.z;
  return { c0:Math.max(0,Math.floor((wx0-WW_PAD-WW_HX)/WW_HX)-1), c1:Math.min(WW.cols-1,Math.ceil((wx1-WW_PAD)/WW_HX)+1),
           r0:Math.max(0,Math.floor((wy0-WW_PAD-WW_S)/WW_VY)-1), r1:Math.min(WW.rows-1,Math.ceil((wy1-WW_PAD-WW_S)/WW_VY)+1) };
}
function wwDrawHexesDetailed(g){
  const W=WW, R=wwVisibleHexes();
  for(let y=R.r0;y<=R.r1;y++) for(let x=R.c0;x<=R.c1;x++){ const t=W.terr[y][x], [cx,cy]=wwHexCenter(x,y);
    wwHexPath(g,cx,cy,WW_S-0.3);
    if(t==='~'){ g.fillStyle='#16293b'; g.fill(); const hv=(x*2654435761^y*40503)>>>0; if(hv&3){ g.fillStyle='rgba(0,0,0,0.05)'; g.fill(); } continue; }
    const nn=wwOwnerAt(x,y); g.fillStyle=nn?nn.col:'#5b5b5b'; g.fill();
    if(t==='h'){ g.fillStyle='rgba(0,0,0,0.20)'; g.fill(); } else if(t==='f'){ g.fillStyle='rgba(0,0,0,0.11)'; g.fill(); }
    const hv=(x*2654435761^y*40503)>>>0; g.fillStyle=(hv&1)?'rgba(255,255,255,0.03)':'rgba(0,0,0,'+(0.02+(hv%4)*0.012)+')'; g.fill();
    wwHexDecor(g,cx,cy,t,hv); }
  wwSnowPass(g, R.c0,R.c1,R.r0,R.r1, wwWinterAt(WW.date));
  // coastline foam: sea hexes that touch land get a soft lighter rim
  g.lineWidth=1.1; g.strokeStyle='rgba(150,200,235,0.16)';
  for(let y=R.r0;y<=R.r1;y++) for(let x=R.c0;x<=R.c1;x++){ if(!wwSea(x,y)) continue;
    let coast=false; for(const [nx,ny] of wwNb(x,y)){ if(!wwSea(nx,ny)){ coast=true; break; } }
    if(coast){ const [cx,cy]=wwHexCenter(x,y); wwHexPath(g,cx,cy,WW_S-1.5); g.stroke(); } }
  wwDrawRivers(g);
  g.lineWidth=0.4; g.strokeStyle='rgba(0,0,0,0.22)';
  for(let y=R.r0;y<=R.r1;y++) for(let x=R.c0;x<=R.c1;x++){ if(wwSea(x,y)) continue; const [cx,cy]=wwHexCenter(x,y); wwHexPath(g,cx,cy,WW_S-0.3); g.stroke(); }
  g.lineWidth=1.3; g.strokeStyle='rgba(0,0,0,0.62)'; g.lineJoin='round';
  for(let y=R.r0;y<=R.r1;y++) for(let x=R.c0;x<=R.c1;x++){ if(wwSea(x,y)) continue; const o=W.own[y*W.cols+x];
    let edge=false; for(const [nx,ny] of wwNb(x,y)){ if(wwSea(nx,ny)||W.own[ny*W.cols+nx]!==o){ edge=true; break; } }
    if(edge){ const [cx,cy]=wwHexCenter(x,y); wwHexPath(g,cx,cy,WW_S-0.3); g.stroke(); } }
  g.textAlign='center';
  for(const c of W.cities){ if(c.x<R.c0||c.x>R.c1||c.y<R.r0||c.y>R.r1) continue; const [cx,cy]=wwHexCenter(c.x,c.y);
    g.beginPath(); g.arc(cx,cy,c.cap?4.6:2.9,0,Math.PI*2); g.fillStyle=c.cap?'#ffd34d':'#e8edf2'; g.fill();
    g.lineWidth=1; g.strokeStyle='#000c'; g.stroke();
    g.font=(c.cap?'700 ':'600 ')+(c.cap?11:8)+'px "Segoe UI",sans-serif';
    g.fillStyle='rgba(0,0,0,0.8)'; g.fillText(c.name,cx+0.4,cy-6.2);
    g.fillStyle=c.cap?'#ffe9a8':'#dfe7ef'; g.fillText(c.name,cx,cy-6.6); }
}
function wwBuildMapCache(){
  const W=WW, [wW,wH]=wwWorldSize(); WW._cacheW=wwWinterAt(WW.date);
  // supersample the cached base map so the camera can scale it up without going blurry
  // (the cache serves the zoomed-out range; crisp vector hexes take over up close).
  // SS is capped so the offscreen canvas stays under mobile's ~16M-pixel limit.
  const SS=Math.max(1, Math.min(1.5, Math.sqrt(14e6/(wW*wH)))); WW._mapSS=SS; WW._mapW=wW; WW._mapH=wH;
  const mc=document.createElement('canvas'); mc.width=Math.ceil(wW*SS); mc.height=Math.ceil(wH*SS);
  const g=mc.getContext('2d'); g.scale(SS,SS); g.fillStyle='#0c1622'; g.fillRect(0,0,wW,wH);
  for(let y=0;y<W.rows;y++) for(let x=0;x<W.cols;x++){ const t=W.terr[y][x], [cx,cy]=wwHexCenter(x,y);
    wwHexPath(g,cx,cy,WW_S-0.3);
    if(t==='~'){ g.fillStyle='#16293b'; g.fill(); const hv=(x*2654435761^y*40503)>>>0; if(hv&3){ g.fillStyle='rgba(0,0,0,0.05)'; g.fill(); } continue; }
    const n=wwOwnerAt(x,y); g.fillStyle=n?n.col:'#5b5b5b'; g.fill();
    if(t==='h'){ g.fillStyle='rgba(0,0,0,0.20)'; g.fill(); } else if(t==='f'){ g.fillStyle='rgba(0,0,0,0.11)'; g.fill(); }
    const hv=(x*2654435761^y*40503)>>>0; g.fillStyle=(hv&1)?'rgba(255,255,255,0.03)':'rgba(0,0,0,'+(0.02+(hv%4)*0.012)+')'; g.fill(); }
  g.lineWidth=0.4; g.strokeStyle='rgba(0,0,0,0.22)';
  wwSnowPass(g, 0, W.cols-1, 0, W.rows-1, WW._cacheW);
  for(let y=0;y<W.rows;y++) for(let x=0;x<W.cols;x++){ if(wwSea(x,y)) continue; const [cx,cy]=wwHexCenter(x,y); wwHexPath(g,cx,cy,WW_S-0.3); g.stroke(); }
  g.lineWidth=1.3; g.strokeStyle='rgba(0,0,0,0.62)'; g.lineJoin='round';
  for(let y=0;y<W.rows;y++) for(let x=0;x<W.cols;x++){ if(wwSea(x,y)) continue; const o=W.own[y*W.cols+x];
    let edge=false; for(const [nx,ny] of wwNb(x,y)){ if(wwSea(nx,ny)||W.own[ny*W.cols+nx]!==o){ edge=true; break; } }
    if(edge){ const [cx,cy]=wwHexCenter(x,y); wwHexPath(g,cx,cy,WW_S-0.3); g.stroke(); } }
  g.textAlign='center';
  for(const c of W.cities){ const [cx,cy]=wwHexCenter(c.x,c.y);
    g.beginPath(); g.arc(cx,cy,c.cap?4.6:2.7,0,Math.PI*2); g.fillStyle=c.cap?'#ffd34d':'#e8edf2'; g.fill();
    g.lineWidth=1; g.strokeStyle='#000c'; g.stroke();
    if(c.cap){ g.font='700 11px "Segoe UI",sans-serif'; g.fillStyle='rgba(0,0,0,0.75)'; g.fillText(c.name,cx+0.6,cy-6.4);
      g.fillStyle='#ffe9a8'; g.fillText(c.name,cx,cy-7); } }
  WW.mapCanvas=mc; WW._mapDirty=false;
}

// builds the front-line overlay (red ticks on contested borders) and the supply overlay
function wwBuildStrategic(){
  const W=WW, cols=W.cols, sz=wwWorldSize(), wW=sz[0], wH=sz[1];
  const fc=document.createElement('canvas'); fc.width=Math.ceil(wW); fc.height=Math.ceil(wH); const fg=fc.getContext('2d');
  fg.lineCap='round'; fg.strokeStyle='rgba(214,42,32,0.95)'; fg.lineWidth=2.3;
  for(let y=0;y<W.rows;y++) for(let x=0;x<cols;x++){ if(wwSea(x,y)) continue; const o=W.own[y*cols+x]; if(o<0) continue; const A=W.nat[o];
    for(const [nx,ny] of wwNb(x,y)){ const o2=W.own[ny*cols+nx]; if(o2<0||o2<=o) continue; if(!wwAtWar(A.key, W.nat[o2].key)) continue;
      const a=wwHexCenter(x,y), b=wwHexCenter(nx,ny), mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2;
      const ex=b[0]-a[0], ey=b[1]-a[1], L=Math.hypot(ex,ey)||1, px=-ey/L, py=ex/L, hh=WW_S*0.52;
      fg.beginPath(); fg.moveTo(mx+px*hh,my+py*hh); fg.lineTo(mx-px*hh,my-py*hh); fg.stroke(); } }
  W._frontCanvas=fc;
  const sm=new Uint8Array(cols*W.rows);
  for(const nat of W.nat){ if(nat.key==='XXX'||!nat.hexes) continue; const f=wwSupplyField(nat.key);
    for(let i=0;i<sm.length;i++){ if(W.own[i]===nat.i) sm[i]= f[i]?1:2; } }
  const sc=document.createElement('canvas'); sc.width=Math.ceil(wW); sc.height=Math.ceil(wH); const sg=sc.getContext('2d');
  for(let y=0;y<W.rows;y++) for(let x=0;x<cols;x++){ const v=sm[y*cols+x]; if(!v) continue; const c=wwHexCenter(x,y); wwHexPath(sg,c[0],c[1],WW_S-0.3);
    sg.fillStyle= v===1?'rgba(55,195,90,0.30)':'rgba(232,55,45,0.52)'; sg.fill(); }
  W._supCanvas=sc; W._stratDirty=false;
}
function wwDrawMinimap(){
  const mm=$('ww-minimap'); if(!mm||!WW.mapCanvas) return; const g=mm.getContext('2d'); const MW=mm.width||184, MH=mm.height||180;
  g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,MW,MH); g.fillStyle='#0a121c'; g.fillRect(0,0,MW,MH);
  const mc=WW.mapCanvas, sc=Math.min(MW/mc.width, MH/mc.height), dw=mc.width*sc, dh=mc.height*sc, ox=(MW-dw)/2, oy=(MH-dh)/2;
  const scW=sc*(WW._mapSS||1);   // world-units → minimap-pixels (cache is supersampled)
  g.imageSmoothingEnabled=true; g.drawImage(mc, ox,oy,dw,dh);
  if(WW.mapMode==='supply' && WW._supCanvas) g.drawImage(WW._supCanvas, ox,oy,dw,dh);
  if(WW._frontCanvas) g.drawImage(WW._frontCanvas, ox,oy,dw,dh);
  WW._mm={sc:scW,ox,oy};
  const cam=WW.cam, cv=$('wwCanvas'), vw=cv.clientWidth||1, vh=cv.clientHeight||1;
  const wx0=(0-cam.x)/cam.z, wy0=(0-cam.y)/cam.z, wx1=(vw-cam.x)/cam.z, wy1=(vh-cam.y)/cam.z;
  g.strokeStyle='rgba(255,255,255,0.9)'; g.lineWidth=1.3; g.strokeRect(ox+wx0*scW, oy+wy0*scW, (wx1-wx0)*scW, (wy1-wy0)*scW);
}
const WW_TUT=[
 'Welcome to <b>THE WORLD AT WAR</b>. You command <b>{NATION}</b>. Bring every enemy that takes up arms against you to capitulation, and Europe is yours.',
 'Drag to pan, scroll to zoom. Zoom in and the map blooms into detailed terrain; the <b>minimap</b> (bottom-left) lets you click to jump anywhere.',
 'Click one of your <b>division counters</b> to select it. Then: <span style="color:#8fb4d8">blue = move</span>, <span style="color:#e0856a">red = attack</span>, <span style="color:#ffd34d">amber = declare war</span>, <span style="color:#7be0ee">teal = invade by sea</span>.',
 'Run your war effort from the top bar: <b>★ Focus</b> (national agenda) · <b>⚗ Research</b> · <b>✈ Air</b> (fighters, CAS &amp; bombers) · <b>⚑ Diplomacy</b> · <b>❄ Winter Prep</b> · <b>🗺 Supply</b> view.',
 'General Winter is real — snow slows movement, saps unprepared troops and weakens their attacks. Keep an eye on the <b>Supply</b> view for cut-off units, and prepare your <b>winter gear</b> before the freeze.',
 'When your orders are set, press <b>END TURN</b> (or the Space bar). The enemy moves, then it is your turn again. Good luck, commander.'
];
function wwTutShow(){ const el=$('ww-tut'); if(!el) return; const me=WW.byKey[WW.player];
  const t=(WW_TUT[WW._tutStep]||'').replace('{NATION}', me?me.name:'your nation');
  $('ww-tut-text').innerHTML=t;
  $('ww-tut-dots').innerHTML=WW_TUT.map((_,i)=>'<span class="ww-tut-dot'+(i===WW._tutStep?' on':'')+'"></span>').join('');
  $('ww-tut-next').textContent = WW._tutStep>=WW_TUT.length-1?'Got it ✓':'Next ▶';
  el.classList.remove('hidden'); }
function wwTutStart(force){ if(!force){ try{ if(localStorage.getItem('ww-tut-done')) return; }catch(e){} } WW._tutStep=0; wwTutShow(); }
function wwTutNext(){ WW._tutStep=(WW._tutStep||0)+1; if(WW._tutStep>=WW_TUT.length){ wwTutDone(); } else wwTutShow(); }
function wwTutDone(){ const el=$('ww-tut'); if(el) el.classList.add('hidden'); try{ localStorage.setItem('ww-tut-done','1'); }catch(e){} }
function wwSetTips(){
  const T={ 'ww-btn-focus':'National Focus — your nation’s agenda of decisions and bonuses',
    'ww-btn-research':'Research — Land Doctrine, Industry, Aircraft and Logistics',
    'ww-btn-air':'Air Force — fighters (air superiority), CAS (ground support) & strategic bombers; pick a production doctrine',
    'ww-btn-prod':'Production — military factories building infantry, armour & air wings; pick a production focus',
    'ww-btn-diplo':'Diplomacy — every nation by bloc and its relation to you',
    'ww-winter-toggle':'Winter Preparations — divert ~30% of production to ready your troops for the cold',
    'ww-btn-supply':'Supply map — green = supplied, red = cut off (and encircled enemy pockets)',
    'ww-btn-help':'Replay the tutorial', 'ww-back':'Return to the menu (your campaign autosaves)',
    'ww-endturn':'End your turn — the enemy acts, then it’s yours again (Space)' };
  for(const id in T){ const e=$(id); if(e) e.title=T[id]; } }
function wwToggleSupply(){ wwSfx('click'); WW.mapMode = (WW.mapMode==='supply')?'political':'supply'; WW._stratDirty=true;
  const b=$('ww-btn-supply'); if(b) b.classList.toggle('on', WW.mapMode==='supply'); wwRequest(); }
function wwRequest(){ if(wwRAFpending||!WW.on) return; wwRAFpending=true;
  requestAnimationFrame(()=>{ wwRAFpending=false; wwRender(); }); }
function wwRender(){
  if(!WW.on) return;
  const cv=$('wwCanvas'), ctx=cv.getContext('2d'), dpr=WW._dpr||1, cam=WW.cam;
  if(Math.abs(wwWinterAt(WW.date)-(WW._cacheW==null?-9:WW._cacheW))>0.05) WW._mapDirty=true;
  if(WW._mapDirty||!WW.mapCanvas) wwBuildMapCache();
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle='#0a0f16'; ctx.fillRect(0,0,cv.clientWidth,cv.clientHeight);
  ctx.translate(cam.x,cam.y); ctx.scale(cam.z,cam.z);
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  // while zooming/panning, draw the cheap cached map when lots of hexes are on screen
  // (zoomed out / mid); when zoomed in only a handful are visible, so keep crisp detail.
  const dA = (WW._interacting && cam.z < 1.3) ? 0 : wwSmooth(WW_DETAIL_LO, WW_DETAIL_HI, cam.z);
  if(dA>=1){ wwDrawHexesDetailed(ctx); }
  else if(dA<=0){ ctx.drawImage(WW.mapCanvas,0,0,WW._mapW,WW._mapH); }
  else { ctx.drawImage(WW.mapCanvas,0,0,WW._mapW,WW._mapH); ctx.save(); ctx.globalAlpha=dA; wwDrawHexesDetailed(ctx); ctx.restore(); }
  if(WW.started){ if(WW._stratDirty||!WW._frontCanvas) wwBuildStrategic();
    if(WW.mapMode==='supply' && WW._supCanvas) ctx.drawImage(WW._supCanvas,0,0);
    if(WW._frontCanvas) ctx.drawImage(WW._frontCanvas,0,0); }
  // selected nation glow
  if(wwSelHexes && !wwSelArmy){ ctx.fillStyle='rgba(255,255,255,0.13)';
    for(const [x,y] of wwSelHexes){ const [cx,cy]=wwHexCenter(x,y); wwHexPath(ctx,cx,cy,WW_S-0.3); ctx.fill(); }
    ctx.lineWidth=2.2/cam.z; ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineJoin='round';
    for(const [x,y] of wwSelHexes){ const o=WW.own[y*WW.cols+x]; let edge=false;
      for(const [nx,ny] of wwNb(x,y)){ if(WW.own[ny*WW.cols+nx]!==o){ edge=true; break; } }
      if(edge){ const [cx,cy]=wwHexCenter(x,y); wwHexPath(ctx,cx,cy,WW_S-0.3); ctx.stroke(); } } }
  // move/attack highlights for a selected army
  if(wwSelArmy && wwReachSet){ ctx.fillStyle='rgba(90,160,255,0.30)';
    for(const k of wwReachSet){ const [x,y]=k.split(',').map(Number); const [cx,cy]=wwHexCenter(x,y); wwHexPath(ctx,cx,cy,WW_S-0.6); ctx.fill(); } }
  if(wwSelArmy && wwTargetSet){ ctx.fillStyle='rgba(230,70,60,0.42)'; ctx.lineWidth=1.6/cam.z; ctx.strokeStyle='rgba(255,90,80,0.9)';
    for(const k of wwTargetSet){ const [x,y]=k.split(',').map(Number); const [cx,cy]=wwHexCenter(x,y); wwHexPath(ctx,cx,cy,WW_S-0.6); ctx.fill(); ctx.stroke(); } }
  if(wwSelArmy && wwDeclareSet){ ctx.fillStyle='rgba(235,170,60,0.38)'; ctx.lineWidth=1.5/cam.z; ctx.strokeStyle='rgba(255,200,90,0.9)';
    for(const k of wwDeclareSet){ const [x,y]=k.split(',').map(Number); const [cx,cy]=wwHexCenter(x,y); wwHexPath(ctx,cx,cy,WW_S-0.6); ctx.fill(); ctx.stroke(); } }
  if(wwSelArmy && wwInvadeSet){ ctx.fillStyle='rgba(70,200,215,0.26)'; ctx.lineWidth=1.3/cam.z; ctx.strokeStyle='rgba(120,230,240,0.85)';
    for(const k of wwInvadeSet){ const [x,y]=k.split(',').map(Number); const [cx,cy]=wwHexCenter(x,y); wwHexPath(ctx,cx,cy,WW_S-0.6); ctx.fill(); ctx.stroke(); } }
  if(wwSelArmy){ const [cx,cy]=wwHexCenter(wwSelArmy.x,wwSelArmy.y); ctx.lineWidth=2.6/cam.z; ctx.strokeStyle='#ffe9a8'; wwHexPath(ctx,cx,cy,WW_S-0.3); ctx.stroke(); }
  // armies (screen space, fixed-ish readable size)
  { const seas=wwSeasonName(WW.date), wtr=wwWinterAt(WW.date);
    const tint = seas==='Winter'?'rgba(202,217,237,'+(0.03+wtr*0.05).toFixed(3)+')' : seas==='Autumn'?'rgba(150,108,52,0.055)' : seas==='Spring'?'rgba(118,172,118,0.04)' : null;
    if(tint){ ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle=tint; ctx.fillRect(0,0,cv.clientWidth,cv.clientHeight); } }
  if(WW.started && WW.armies){ ctx.setTransform(dpr,0,0,dpr,0,0); wwDrawArmies(ctx); }
  if(WW.started) wwDrawMinimap();
}
function wwRoundPath(ctx,x,y,w,h,r){ ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function wwDrawArmies(ctx){
  const z=WW.cam.z;
  // counters scale with the map exactly like the other game modes (sz tracks the hex size),
  // and the whole layer fades out into the strategic view when you zoom way out — HOI4 style.
  const layerA = wwSmooth(0.42, 0.66, z);
  if(layerA<=0.02) return;
  const sz = WW_S*z;                                          // == the on-screen hex radius
  const w=sz*1.34, h=sz*0.96, r=Math.min(5, sz*0.20), pale='#e9e5d2';
  const symW=Math.max(1, sz*0.09), edgeW=Math.max(1, sz*0.085);
  const showSym = sz>8.5, showBars = sz>10.5;
  ctx.save(); ctx.globalAlpha=layerA; ctx.lineJoin='round';
  for(const a of WW.armies){
    const [wx,wy]=wwHexCenter(a.x,a.y); const [sx,sy]=wwW2S(wx,wy); const n=WW.byKey[a.nat];
    if(sx< -40||sy< -40||sx>ctx.canvas.width+40||sy>ctx.canvas.height+40) continue;
    ctx.save(); ctx.translate(sx,sy);
    // classic counter: cheap offset drop-shadow, then the coloured body
    ctx.fillStyle='rgba(0,0,0,0.33)'; wwRoundPath(ctx,-w/2+sz*0.08,-h/2+sz*0.12,w,h,r); ctx.fill();
    ctx.fillStyle=n?n.col:'#888'; wwRoundPath(ctx,-w/2,-h/2,w,h,r); ctx.fill();
    // bevel: a light top edge and a dark bottom edge give the counter depth
    if(sz>9){ ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-w/2+3,-h/2+1.2); ctx.lineTo(w/2-3,-h/2+1.2); ctx.stroke();
      ctx.strokeStyle='rgba(0,0,0,0.30)'; ctx.beginPath(); ctx.moveTo(-w/2+3,h/2-1.2); ctx.lineTo(w/2-3,h/2-1.2); ctx.stroke(); }
    ctx.strokeStyle = a.moved?'rgba(255,255,255,0.22)':'rgba(0,0,0,0.82)'; ctx.lineWidth=edgeW; wwRoundPath(ctx,-w/2,-h/2,w,h,r); ctx.stroke();
    // classic NATO symbol: a pale bordered box with infantry's X or armour's ellipse
    if(showSym){ const bw=w*0.52, bh=h*0.52;
      ctx.strokeStyle=pale; ctx.lineWidth=symW; ctx.strokeRect(-bw/2,-bh/2,bw,bh);
      ctx.beginPath();
      if(a.kind==='arm'){ ctx.ellipse(0,0,bw*0.32,bh*0.32,0,0,Math.PI*2); ctx.stroke(); }
      else { ctx.moveTo(-bw/2,-bh/2); ctx.lineTo(bw/2,bh/2); ctx.moveTo(bw/2,-bh/2); ctx.lineTo(-bw/2,bh/2); ctx.stroke(); } }
    if(a.moved){ wwRoundPath(ctx,-w/2,-h/2,w,h,r); ctx.fillStyle='#0000003a'; ctx.fill(); }   // spent this turn → dim
    ctx.restore();
    if(WW.supply && !wwInSupply(a)){ ctx.save(); ctx.strokeStyle='rgba(240,95,75,0.95)'; ctx.lineWidth=Math.max(1.4,sz*0.11);
      ctx.setLineDash([sz*0.22,sz*0.16]); ctx.strokeRect(sx-w/2-2,sy-h/2-2,w+4,h+4); ctx.restore(); }
    // battle-plan badge: a corner flash marks divisions under standing orders
    if(a.order && a.nat===WW.player){ ctx.save();
      ctx.fillStyle = a.order==='attack' ? '#ff6a4d' : '#5ad0ff'; const t=Math.max(4,sz*0.34);
      ctx.beginPath(); ctx.moveTo(sx-w/2,sy-h/2); ctx.lineTo(sx-w/2+t,sy-h/2); ctx.lineTo(sx-w/2,sy-h/2+t); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.lineWidth=0.8; ctx.stroke(); ctx.restore(); }
    // org/str pip bars under the counter when big enough
    if(showBars){ const bw=w, bx=sx-w/2, by=sy+h/2+sz*0.10, bhh=Math.max(1.8,sz*0.16), gap=bhh+0.6;
      ctx.fillStyle='#0008'; ctx.fillRect(bx,by,bw,bhh);
      ctx.fillStyle='#7fd08a'; ctx.fillRect(bx,by,bw*Math.max(0,a.str/a.maxStr),bhh);
      ctx.fillStyle='#0008'; ctx.fillRect(bx,by+gap,bw,bhh);
      ctx.fillStyle='#76b6ff'; ctx.fillRect(bx,by+gap,bw*Math.max(0,a.org/a.maxOrg),bhh); }
  }
  ctx.restore();
}

function wwPick(sx,sy){ const cam=WW.cam, wx=(sx-cam.x)/cam.z, wy=(sy-cam.y)/cam.z;
  const ry=Math.round((wy-WW_PAD-WW_S)/WW_VY); let best=null,bd=1e9;
  for(let y=Math.max(0,ry-1);y<=Math.min(WW.rows-1,ry+1);y++){ const rx=Math.round((wx-WW_PAD-WW_HX/2)/WW_HX-0.5*(y&1));
    for(let x=Math.max(0,rx-1);x<=Math.min(WW.cols-1,rx+1);x++){ const [cx,cy]=wwHexCenter(x,y); const d=(cx-wx)*(cx-wx)+(cy-wy)*(cy-wy); if(d<bd){ bd=d; best=[x,y]; } } }
  return (best && bd<=WW_S*WW_S*1.25)?best:null; }

function wwSelectArmy(a){
  wwSelArmy=a; wwSelNat=null; wwSelHexes=null;
  if(a && !a.moved){
    wwReachSet=new Set(wwReachable(a).map(p=>p[0]+','+p[1]));
    const enemyT=new Set(wwAttackTargets(a).map(p=>p[0]+','+p[1]));
    const allT=wwAttackTargetsPlayer(a).map(p=>p[0]+','+p[1]);
    wwTargetSet=enemyT; wwDeclareSet=new Set(allT.filter(k=>!enemyT.has(k)));
    if(wwCoastal(a.x,a.y)){
      const closer=new Set([...wwReachSet, ...wwTargetSet, ...wwDeclareSet]);
      wwInvadeSet=new Set(wwInvadeTargets(a).map(p=>p[0]+','+p[1]).filter(k=>!closer.has(k)));
    } else wwInvadeSet=null;
  } else { wwReachSet=null; wwTargetSet=null; wwDeclareSet=null; wwInvadeSet=null; }
  wwUpdateInfo(); wwRequest();
}
function wwSelectNation(hit){
  wwSelArmy=null; wwReachSet=null; wwTargetSet=null; wwDeclareSet=null; wwInvadeSet=null;
  if(!hit||wwSea(hit[0],hit[1])){ wwSelNat=null; wwSelHexes=null; }
  else { const n=wwOwnerAt(hit[0],hit[1]); wwSelNat=n||null; wwSelHexes=null;
    if(n){ wwSelHexes=[]; for(let y=0;y<WW.rows;y++) for(let x=0;x<WW.cols;x++) if(WW.own[y*WW.cols+x]===n.i) wwSelHexes.push([x,y]); } }
  wwUpdateInfo(); wwRequest();
}
function wwClickHex(hit){
  if(!hit){ wwSelectNation(null); return; }
  const [x,y]=hit, key=x+','+y, army=wwArmyAt(x,y);
  if(WW.started && wwSelArmy && !wwSelArmy.moved){
    if((wwTargetSet&&wwTargetSet.has(key))||(wwDeclareSet&&wwDeclareSet.has(key))){ const r=wwAttack(wwSelArmy, x, y); WW._mapDirty=true; wwAfterAction(r); return; }
    if(wwReachSet && wwReachSet.has(key)){ wwMoveArmy(wwSelArmy, x, y); wwAfterAction({result:'moved'}); return; }
    if(wwInvadeSet && wwInvadeSet.has(key)){ const r=wwInvade(wwSelArmy, x, y); WW._mapDirty=true; wwAfterAction(r); return; }
  }
  if(WW.started && army && army.nat===WW.player){ wwSelectArmy(army); return; }
  wwSelectNation(hit);
}
function wwAfterAction(r){
  wwComputeStats();
  const _rr=r&&r.result;
  if(_rr==='moved'||_rr==='landed') wwSfx('move');
  else if(_rr==='taken') wwSfx('boom');
  else if(_rr==='held'||_rr==='repelled') wwSfx('shot');
  else if(_rr==='attacker-lost'||_rr==='invasion-lost') wwSfx('boom');
  // the acting army has used its turn → drop the selection, refresh
  wwSelArmy=null; wwReachSet=null; wwTargetSet=null; wwDeclareSet=null; wwInvadeSet=null;
  wwRenderCombat(null);
  if(r && r.result==='taken') wwToast('Position captured');
  else if(r && r.result==='landed') wwToast('Troops landed ashore');
  else if(r && r.result==='repelled') wwToast('The landing was thrown back');
  else if(r && r.result==='invasion-lost') wwToast('The invasion force was lost at sea');
  // surface any capitulations the action triggered
  wwDrainLog();
  wwUpdateHUD(); wwUpdateInfo(); wwRequest();
  const v=wwCheckVictory(); if(v.over) wwShowEnd(v);
}
function wwDoEndTurn(){ wwSfx('endturn');
  if(!WW.started || (WW.result&&WW.result.over)) return;
  const v=wwEndTurn(); WW._mapDirty=true; wwSave();
  wwSelArmy=null; wwReachSet=null; wwTargetSet=null; wwDeclareSet=null; wwInvadeSet=null;
  wwDrainLog(); wwDrainNotify();
  wwUpdateHUD(); wwUpdateInfo(); wwRequest();
  if(!$('ww-focus-page').classList.contains('hidden')) wwRenderFocusTree();
  if(!$('ww-research-page').classList.contains('hidden')) wwRenderResearchTree();
  if(!$('ww-air').classList.contains('hidden')) wwRenderAir();
  if(!$('ww-prod').classList.contains('hidden')) wwRenderProduction();
  if(!$('ww-diplo').classList.contains('hidden')) wwRenderDiplo();
  if(v.over) wwShowEnd(v);
}
function wwSfx(name){ try{
  if(name==='click'){ sClick(); }
  else if(name==='move'){ sMove(); }
  else if(name==='shot'){ sShot(); }
  else if(name==='boom'){ sBoom(); }
  else if(name==='city'){ sCity(); }
  else if(name==='endturn'){ tone(294,0.07,'triangle',0.05); setTimeout(()=>tone(247,0.12,'triangle',0.05),90); }
  else if(name==='notify'){ tone(659,0.09,'triangle',0.05); setTimeout(()=>tone(880,0.10,'triangle',0.05),95); setTimeout(()=>tone(1175,0.20,'triangle',0.05),195); }
  else if(name==='win'){ [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,0.26,'square',0.06),i*150)); }
  else if(name==='lose'){ [392,330,262,196].forEach((f,i)=>setTimeout(()=>tone(f,0.36,'sawtooth',0.06),i*200)); }
}catch(e){} }
function wwDrainLog(){ if(!WW.log) return; while(WW.log.length){ const msg=WW.log.shift();
  if(/capitulat|partition/i.test(msg)) wwSfx('city'); else if(/declares war/i.test(msg)) wwSfx('boom');
  wwToast(msg); } }
// HOI4-style completion popup for the player's national focus & research
function wwFxDesc(fx){ if(!fx||!fx.length) return ''; const t=fx[0];
  if(t==='factory'){ const c=fx[1]||0, mil=fx[2]||0; return (c?'+'+c+' civilian':'')+(c&&mil?' · ':'')+(mil?'+'+mil+' military':'')+' factories'; }
  if(t==='air') return '+'+fx[1]+' aircraft';
  if(t==='research') return '+'+fx[1]+' research';
  if(t==='land') return '+'+Math.round(fx[1]*100)+'% land combat power';
  if(t==='log') return '+'+fx[1]+' supply range';
  if(t==='army') return '+'+fx[1]+' divisions deployed';
  if(t==='gear') return '+'+Math.round(fx[1]*100)+'% winter readiness';
  if(t==='wargoal') return 'War declared on '+((WW.byKey[fx[1]]&&WW.byKey[fx[1]].name)||fx[1]);
  return ''; }
let wwNotifyQueue=[], wwNotifyActive=false, wwNotifyTimer=0;
function wwDrainNotify(){ if(WW.notify&&WW.notify.length){ while(WW.notify.length) wwNotifyQueue.push(WW.notify.shift()); }
  if(!wwNotifyActive) wwNotifyNext(); }
function wwNotifyNext(){ const ev=wwNotifyQueue.shift(); const el=$('ww-notify'); if(!el) return;
  if(!ev){ wwNotifyActive=false; el.classList.remove('show'); el.classList.add('hidden'); return; }
  wwNotifyActive=true; const isFocus=ev.kind==='focus'; const desc=wwFxDesc(ev.fx);
  wwSfx('notify');
  el.innerHTML='<div class="ww-noti '+(isFocus?'foc':'res')+'">'+
    '<div class="ww-noti-ico">'+(isFocus?'★':'⚗')+'</div>'+
    '<div class="ww-noti-bd"><div class="ww-noti-kind">'+(isFocus?'National Focus Completed':'Research Completed')+'</div>'+
    '<div class="ww-noti-name">'+ev.name+'</div>'+(desc?'<div class="ww-noti-fx">'+desc+'</div>':'')+'</div>'+
    '<div class="ww-noti-x">✕</div></div>';
  el.classList.remove('hidden'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(wwNotifyTimer);
  const dismiss=()=>{ clearTimeout(wwNotifyTimer); el.classList.remove('show'); setTimeout(wwNotifyNext, 260); };
  el.onclick=dismiss;
  wwNotifyTimer=setTimeout(dismiss, 4600);
}

function wwDateStr(){ const M=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const d=WW.date; return d.d+' '+M[d.m-1]+' '+d.y; }
function wwFmtNum(v){ v=Math.round(v||0); return v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?Math.round(v/1e3)+'k':''+v; }
function wwUpdateHUD(){
  const dt=$('ww-date'); if(dt) dt.textContent=wwDateStr();
  const tn=$('ww-turn'); if(tn) tn.textContent = WW.started ? ('Week '+(WW.turn+1)+' · '+wwSeasonName(WW.date)) : '';
  const ps=$('ww-pstat');
  if(ps){ if(WW.started){ const me=WW.byKey[WW.player];
      const enemies=WW.nat.filter(n=>!n.capitulated && wwAtWar(WW.player,n.key)).length;
      ps.innerHTML='<b>'+me.name+'</b> <span style="color:#8ba2b8">('+(WW.difficulty||'normal')+')</span><br>'+
        'Territory: '+me.hexes+' hexes<br>Armies: '+wwArmiesOf(WW.player).length+
        (function(){ const oc=wwOrderCounts(WW.player); return (oc.front||oc.attack)?' <span style="color:#8ba2b8">(⚔'+oc.attack+' 🛡'+oc.front+')</span>':''; })()+
        '<br>Factories: '+me.civ+'c / '+me.mil+'m'+(me.warDmg>0.01?' <span style="color:#e0856a">(−'+Math.round(me.warDmg*100)+'%)</span>':'')+
        '<br>🛢 Oil '+(me.oil||0)+' · ⚙ Steel '+(me.steel||0)+' ('+(me.steelStock||0)+')'+
        '<br>⛽ Fuel '+Math.round(me.fuel||0)+'/'+(me.fuelMax||0)+(me.lowFuel?' <span style="color:#e0856a">LOW</span>':'')+
        '<br>👥 Manpower '+wwFmtNum(me.manpower)+' · ☠ '+wwFmtNum(me.casualties)+' lost'+
        '<br>Air: '+Math.round(wwAirTotal(me))+' <span style="color:#8ba2b8">('+Math.round(me.air.fighter)+'F '+Math.round(me.air.cas)+'C '+Math.round(me.air.strat)+'S)</span>'+(me.bombTarget?'<br><span style="color:#c98ac9">Bombing '+(WW.byKey[me.bombTarget]?WW.byKey[me.bombTarget].name:'?')+'</span>':'')+
        '<br>Focus: '+wwFocusStatus(me)+'<br>Research: '+(me.researching?(wwTechById(me.researching)?wwTechById(me.researching).name:'—'):'<i style="color:#9fb4c9">choose</i>')+
        '<br>❄ Winter readiness: '+Math.round((me.winterGear||0)*100)+'%'+(me.winterizing?' <span style="color:#9fd0e8">(preparing)</span>':'')+
        '<br>Enemies left: '+enemies;
      const _wb=$('ww-winter-toggle'); if(_wb){ _wb.textContent='❄ Winter prep: '+(me.winterizing?'ON':'OFF'); _wb.classList.toggle('on', !!me.winterizing); }
    } else ps.classList.add('hidden'); }
}
function wwFocusStatus(me){
  if(me.focusProg){ const f=wwFocusById(WW.player,me.focusProg.id); return (f?f.name:'?')+' ('+me.focusProg.turnsLeft+'w)'; }
  const av=wwAvailableFocuses(WW.player); return av.length?'<i style="color:#9fb4c9">choose one</i>':'complete';
}
const WW_FOC_COLW=164, WW_FOC_ROWH=110, WW_FOC_NW=134, WW_FOC_NH=64, WW_FOC_PAD=36;
function wwRenderFocusTree(){
  const me=WW.byKey[WW.player]; if(!me) return; const list=wwFocusList(WW.player);
  const lines=$('ww-foc-lines'), nodes=$('ww-foc-nodes'), inner=$('ww-foc-inner');
  let maxX=0,maxY=0; for(const f of list){ if(f.x>maxX)maxX=f.x; if(f.y>maxY)maxY=f.y; }
  const W=maxX*WW_FOC_COLW+WW_FOC_NW+WW_FOC_PAD*2, H=maxY*WW_FOC_ROWH+WW_FOC_NH+WW_FOC_PAD*2;
  lines.width=W; lines.height=H; if(inner){ inner.style.width=W+'px'; inner.style.height=H+'px'; }
  const g=lines.getContext('2d'); g.clearRect(0,0,W,H);
  const nx=f=>WW_FOC_PAD+f.x*WW_FOC_COLW, ny=f=>WW_FOC_PAD+f.y*WW_FOC_ROWH, cx=f=>nx(f)+WW_FOC_NW/2;
  g.lineWidth=2;
  for(const f of list){ for(const r of (f.req||[])){ const p=wwFocusById(WW.player,r); if(!p) continue;
    const x1=cx(p), y1=ny(p)+WW_FOC_NH, x2=cx(f), y2=ny(f), my=(y1+y2)/2;
    g.strokeStyle=(me.focusDone&&me.focusDone.has(r))?'rgba(110,200,130,0.7)':'rgba(110,140,175,0.42)';
    g.beginPath(); g.moveTo(x1,y1); g.lineTo(x1,my); g.lineTo(x2,my); g.lineTo(x2,y2); g.stroke(); } }
  let html='';
  for(const f of list){ const done=me.focusDone&&me.focusDone.has(f.id), prog=me.focusProg&&me.focusProg.id===f.id, avail=wwFocusAvail(WW.player,f.id);
    const cls=done?'done':prog?'prog':avail?'avail':'locked';
    const sub=prog?('◷ '+me.focusProg.turnsLeft+' wk'):(done?'completed ✓':wwFocusDesc(f.fx));
    html+='<button class="ww-foc-node '+cls+'" data-id="'+f.id+'" style="left:'+nx(f)+'px;top:'+ny(f)+'px"><div class="fn">'+f.name+'</div><div class="fd">'+sub+'</div></button>'; }
  nodes.innerHTML=html;
  for(const b of nodes.querySelectorAll('.ww-foc-node')) b.onclick=()=>{ const id=b.dataset.id;
    if(wwFocusAvail(WW.player,id)){ wwStartFocus(WW.player,id); wwSfx('city'); wwRenderFocusTree(); wwUpdateHUD(); } };
  const tt=$('ww-foc-title'); if(tt) tt.textContent=me.name+' — NATIONAL FOCUS';
}
function wwOpenFocusPage(){ wwSfx('click'); const p=$('ww-focus-page'); if(!p) return; p.classList.remove('hidden'); wwRenderFocusTree(); }
function wwCloseFocusPage(){ const p=$('ww-focus-page'); if(p) p.classList.add('hidden'); }
const WW_RES_COLW=150, WW_RES_ROWH=118, WW_RES_NW=122, WW_RES_NH=58, WW_RES_PAD=30, WW_RES_LABELW=58;
function wwRenderResearchTree(){
  const me=WW.byKey[WW.player]; if(!me) return; const list=wwTechList();
  const lines=$('ww-res-lines'), nodes=$('ww-res-nodes'), inner=$('ww-res-inner');
  let maxX=0,maxY=0; for(const t of list){ if(t.x>maxX)maxX=t.x; if(t.y>maxY)maxY=t.y; }
  const W=WW_RES_LABELW+maxX*WW_RES_COLW+WW_RES_NW+WW_RES_PAD*2, H=maxY*WW_RES_ROWH+WW_RES_NH+WW_RES_PAD*2;
  lines.width=W; lines.height=H; if(inner){ inner.style.width=W+'px'; inner.style.height=H+'px'; }
  const g=lines.getContext('2d'); g.clearRect(0,0,W,H);
  const nx=t=>WW_RES_LABELW+WW_RES_PAD+t.x*WW_RES_COLW, ny=t=>WW_RES_PAD+t.y*WW_RES_ROWH, cx=t=>nx(t)+WW_RES_NW/2;
  g.font='700 13px sans-serif'; g.textAlign='left';
  for(let y=0;y<=maxY;y++){ const yy=WW_RES_PAD+y*WW_RES_ROWH+WW_RES_NH/2;
    g.strokeStyle='rgba(120,150,180,0.08)'; g.lineWidth=1; g.beginPath(); g.moveTo(WW_RES_LABELW,yy); g.lineTo(W,yy); g.stroke();
    g.fillStyle='rgba(170,195,220,0.55)'; g.fillText(WW_TECH_YEARS[y]||'', 10, yy+4); }
  g.lineWidth=2;
  for(const t of list){ for(const r of (t.req||[])){ const p=wwTechById(r); if(!p) continue;
    const x1=cx(p), y1=ny(p)+WW_RES_NH, x2=cx(t), y2=ny(t), my=(y1+y2)/2;
    g.strokeStyle=(me.techDone&&me.techDone.has(r))?'rgba(110,200,130,0.7)':'rgba(110,140,175,0.4)';
    g.beginPath(); g.moveTo(x1,y1); g.lineTo(x1,my); g.lineTo(x2,my); g.lineTo(x2,y2); g.stroke(); } }
  let html='';
  for(const t of list){ const done=me.techDone&&me.techDone.has(t.id), cur=me.researching===t.id, avail=wwTechAvail(WW.player,t.id);
    const cls=done?'done':cur?'prog':avail?'avail':'locked';
    const pct=cur?Math.min(100,Math.round(100*(me.research||0)/t.cost)):0;
    const sub=cur?('researching '+pct+'%'):(done?'researched ✓':wwFocusDesc(t.fx));
    html+='<button class="ww-foc-node '+cls+'" data-id="'+t.id+'" style="left:'+nx(t)+'px;top:'+ny(t)+'px;width:'+WW_RES_NW+'px;height:'+WW_RES_NH+'px"><div class="fn">'+t.name+'</div><div class="fd">'+sub+'</div></button>'; }
  nodes.innerHTML=html;
  for(const b of nodes.querySelectorAll('.ww-foc-node')) b.onclick=()=>{ const id=b.dataset.id;
    if(wwTechAvail(WW.player,id)){ wwStartResearch(WW.player,id); wwSfx('click'); wwRenderResearchTree(); wwUpdateHUD(); } };
  const tt=$('ww-res-title'); if(tt) tt.textContent=me.name+' — RESEARCH';
}
function wwOpenResearchPage(){ wwSfx('click'); const p=$('ww-research-page'); if(!p) return; p.classList.remove('hidden'); wwRenderResearchTree(); }
function wwCloseResearchPage(){ const p=$('ww-research-page'); if(p) p.classList.add('hidden'); }
function wwFocusDesc(fx){ const t=fx[0];
  return t==='factory'?('+'+fx[1]+' civ / +'+(fx[2]||0)+' mil factories')
    : t==='air'?('+'+fx[1]+' air wings') : t==='army'?('+'+fx[1]+' divisions')
    : t==='land'?('+'+Math.round(fx[1]*100)+'% land combat') : t==='research'?('+'+fx[1]+' research')
    : t==='gear'?('+'+Math.round(fx[1]*100)+'% winter gear') : t==='log'?('+'+fx[1]+' supply range')
    : t==='wargoal'?('war goal: '+(WW.byKey[fx[1]]?WW.byKey[fx[1]].name:fx[1])) : ''; }
function wwRenderFocus(){
  const el=$('ww-focus'); if(!el) return; const me=WW.byKey[WW.player], list=wwFocusList(WW.player);
  let html='<h3>NATIONAL FOCUS</h3>';
  if(!list.length){ el.innerHTML=html+'<div style="color:#90a6bb;font-size:12px">No focus tree for this nation.</div>'; return; }
  list.forEach((f,i)=>{ const done=i<me.focusIdx, active=me.focusProg&&me.focusProg.idx===i;
    const cls=done?'done':active?'active':'', icon=done?'✓':active?'◷':(i===me.focusIdx?'▸':'·');
    const sub=active?('in progress — '+me.focusProg.turnsLeft+' wk'):wwFocusDesc(f.fx);
    html+='<div class="ww-foc '+cls+'"><div class="fi">'+icon+'</div><div><div class="fn">'+f.name+'</div><div class="fd">'+sub+'</div></div></div>'; });
  const canStart=!me.focusProg && me.focusIdx<list.length;
  html+='<button class="ww-pbtn" id="ww-focus-start"'+(canStart?'':' disabled')+'>'+
    (me.focusIdx>=list.length?'All focuses complete':(canStart?('Begin: '+list[me.focusIdx].name):'Focus in progress…'))+'</button>';
  el.innerHTML=html;
  const b=$('ww-focus-start'); if(b&&canStart) b.onclick=()=>{ wwStartFocus(WW.player); wwRenderFocus(); wwUpdateHUD(); };
}
function wwRenderResearch(){
  const el=$('ww-research'); if(!el) return; const me=WW.byKey[WW.player]; if(!me.tech){ el.innerHTML=''; return; }
  const cats=[['land','Land Doctrine','combat'],['ind','Industry','factories'],['air','Aircraft','air'],['log','Logistics','supply']];
  let html='<h3>RESEARCH</h3>';
  for(const [k,name,desc] of cats) html+='<div class="ww-tech"><span class="tl">'+name+' <span style="color:#7d93ab;font-size:11px">'+desc+'</span></span><span class="tv">Lv '+(me.tech[k]||0)+'</span></div>';
  const cost=wwResearchCost(me.tech[me.researching]||0), pct=Math.min(100,100*(me.research||0)/cost);
  html+='<div style="margin-top:9px;font-size:11px;color:#9fb4c9">Researching: <b style="color:#eaf2fb">'+me.researching+'</b></div>';
  html+='<div class="ww-bar" style="margin-top:4px"><i style="width:'+pct+'%;background:#6fb0e0"></i></div><div style="margin-top:8px">';
  for(const [k,name] of cats) html+='<span class="ww-rbtn'+(me.researching===k?' sel':'')+'" data-cat="'+k+'">'+name+'</span>';
  el.innerHTML=html+'</div>';
  for(const b of el.querySelectorAll('.ww-rbtn')) b.onclick=()=>{ me.researching=b.dataset.cat; wwRenderResearch(); wwUpdateHUD(); };
}
function wwRenderDiplo(){
  const el=$('ww-diplo'); if(!el) return;
  let html='<h3>DIPLOMACY</h3>';
  for(const [fac,label] of [['axis','Axis'],['allies','Allies'],['comintern','Comintern'],['neutral','Neutral']]){
    const mem=WW.nat.filter(n=>n.fac===fac && n.key!=='XXX'); if(!mem.length) continue;
    html+='<div style="margin:8px 0 3px;font-weight:700;color:#cfe0f2;font-size:11px;letter-spacing:1.5px">'+label.toUpperCase()+'</div>';
    for(const n of mem){ const rel=wwRelation(WW.player,n.key);
      const tag=rel==='self'?'<span style="color:#ffd34d">you</span>':rel==='war'?'<span style="color:#e0856a">at war</span>':rel==='ally'?'<span style="color:#7fb0e8">ally</span>':'<span style="color:#90a6bb">peace</span>';
      html+='<div style="display:flex;align-items:center;gap:6px;font-size:12px;margin:2px 0'+(n.capitulated?';opacity:.42':'')+'">'+
        '<span class="ww-sw" style="background:'+n.col+'"></span><span style="flex:1">'+n.name+(n.capitulated?' ✝':'')+'</span>'+tag+'</div>'; } }
  el.innerHTML=html;
}
function wwClosePanels(except){ for(const id of ['ww-focus','ww-research','ww-air','ww-prod','ww-diplo']){ if(id!==except){ const e=$(id); if(e) e.classList.add('hidden'); } } }
function wwTogglePanel(id, render){ wwSfx('click'); wwClosePanels(id); const e=$(id); if(!e) return;
  const show=e.classList.contains('hidden'); e.classList.toggle('hidden', !show); if(show) render(); }
function wwToggleFocus(){ wwTogglePanel('ww-focus', wwRenderFocus); }
function wwToggleResearch(){ wwTogglePanel('ww-research', wwRenderResearch); }
function wwToggleDiplo(){ wwTogglePanel('ww-diplo', wwRenderDiplo); }
function wwBuildName(b){ if(!b) return 'balanced'; let best='balanced',bd=1e9;
  for(const k in WW_DOCTRINE){ const d=WW_DOCTRINE[k]; const dist=Math.abs(d.fighter-b.fighter)+Math.abs(d.cas-b.cas)+Math.abs(d.strat-b.strat); if(dist<bd){bd=dist;best=k;} } return best; }
function wwRenderAir(){
  const el=$('ww-air'); if(!el) return; const me=WW.byKey[WW.player]; if(!me||!me.air){ el.innerHTML=''; return; }
  const tot=wwAirTotal(me)||1;
  let html='<h3>AIR FORCE</h3>';
  for(const [k,name,col,desc] of [['fighter','Fighters','#7fb0e8','air superiority · escort'],['cas','Close Air Support','#e0a06a','ground support (needs the sky)'],['strat','Strategic Bombers','#c98ac9','bomb enemy industry']]){
    const v=me.air[k]||0;
    html+='<div class="ww-tech"><span class="tl">'+name+' <span style="color:#7d93ab;font-size:10px">'+desc+'</span></span><span class="tv">'+Math.round(v)+'</span></div>';
    html+='<div class="ww-bar"><i style="width:'+(100*v/tot)+'%;background:'+col+'"></i></div>'; }
  html+='<div style="margin-top:10px;font-size:11px;color:#9fb4c9">Production doctrine</div><div style="margin-top:4px">';
  const cur=wwBuildName(me.airBuild);
  for(const [k,name] of [['superiority','Air Superiority'],['support','Ground Support'],['strategic','Strategic'],['balanced','Balanced']])
    html+='<span class="ww-rbtn'+(cur===k?' sel':'')+'" data-doc="'+k+'">'+name+'</span>';
  html+='</div>';
  const foes=WW.nat.filter(nn=>!nn.capitulated && wwAtWar(WW.player,nn.key));
  if(foes.length){ html+='<div style="margin-top:11px;font-size:11px;color:#9fb4c9">Air superiority over the front</div>';
    for(const fo of foes.slice(0,7)){ const s=Math.round(wwAirSup(WW.player,fo.key)*100);
      const c=s>=10?'#7fd08a':s<=-10?'#e0856a':'#ffd34d';
      html+='<div style="display:flex;justify-content:space-between;font-size:12px;margin:2px 0"><span>'+fo.name+'</span><span style="color:'+c+'">'+(s>0?'+':'')+s+'%</span></div>'; } }
  el.innerHTML=html;
  for(const b of el.querySelectorAll('.ww-rbtn')) b.onclick=()=>{ wwAirDoctrine(WW.player, b.dataset.doc); wwRenderAir(); };
}
function wwToggleAir(){ wwTogglePanel('ww-air', wwRenderAir); }
function wwProdPresetName(mix){ if(!mix) return 'balanced'; let best='balanced',bd=1e9;
  for(const k in WW_PROD_PRESETS){ const p=WW_PROD_PRESETS[k]; const dist=Math.abs(p.inf-mix.inf)+Math.abs(p.arm-mix.arm)+Math.abs(p.air-mix.air); if(dist<bd){bd=dist;best=k;} } return best; }
function wwRenderProduction(){
  const el=$('ww-prod'); if(!el) return; const me=WW.byKey[WW.player]; if(!me){ el.innerHTML=''; return; }
  if(!me.lineMix) wwInitLines(me);
  let cInf=0,cArm=0; for(const a of WW.armies){ if(a.nat===me.key){ if(a.kind==='arm') cArm++; else cInf++; } }
  let html='<h3>PRODUCTION</h3>';
  html+='<div style="font-size:11px;color:#9fb4c9;margin-bottom:7px">'+Math.round(me.mil)+' military factories · Steel '+wwFmtNum(me.steelStock||0)+' · MP '+wwFmtNum(me.manpower||0)+(me.lowFuel?' · <span style="color:#e0856a">LOW FUEL −30%</span>':'')+'</div>';
  const lines=[['inf','Infantry','#7fb0e8',cInf,110],['arm','Armour','#e0a06a',cArm,150],['air','Air Wings','#c98ac9',Math.round(wwAirTotal(me)),0]];
  for(const [k,name,col,count,cost] of lines){
    const mix=me.lineMix[k]||0, eff=me.lineEff[k]||0, fac=(me.mil||0)*mix;
    html+='<div class="ww-tech" style="margin-top:9px"><span class="tl">'+name+' <span style="color:#7d93ab;font-size:10px">'+fac.toFixed(1)+' factories · '+count+' deployed</span></span><span class="tv">'+Math.round(mix*100)+'%</span></div>';
    html+='<div style="font-size:10px;color:#7d93ab;margin:3px 0 1px">efficiency '+Math.round(eff*100)+'%</div>';
    html+='<div class="ww-bar"><i style="width:'+(100*eff).toFixed(0)+'%;background:'+col+'"></i></div>';
    if(cost>0){ const prog=Math.min(1,(me.lineProg[k]||0)/cost);
      html+='<div class="ww-bar" style="margin-top:2px;height:4px"><i style="width:'+(100*prog).toFixed(0)+'%;background:#5c7d4a"></i></div>'; }
  }
  html+='<div style="margin-top:12px;font-size:11px;color:#9fb4c9">Production focus</div><div style="margin-top:4px">';
  const cur=wwProdPresetName(me.lineMix);
  for(const [k,name] of [['balanced','Balanced'],['infantry','Infantry'],['armoured','Armoured'],['airforce','Air Force']])
    html+='<span class="ww-rbtn'+(cur===k?' sel':'')+'" data-mix="'+k+'">'+name+'</span>';
  html+='</div>';
  el.innerHTML=html;
  for(const b of el.querySelectorAll('.ww-rbtn')) b.onclick=()=>{ wwSetLineMix(WW.player, WW_PROD_PRESETS[b.dataset.mix]); wwRenderProduction(); };
}
function wwToggleProduction(){ wwTogglePanel('ww-prod', wwRenderProduction); }
function wwRenderCombat(fc){
  const el=$('ww-combat'); if(!el) return;
  if(!fc){ el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  const aKind=fc.a.kind==='arm'?'Armour':'Infantry';
  const dName=fc.d?(fc.d.kind==='arm'?'Armoured division':'Infantry division'):((WW.byKey[fc.foeKey]?WW.byKey[fc.foeKey].name:'Enemy')+' — undefended');
  const col=fc.winPct>=60?'#7fd08a':fc.winPct>=42?'#ffd34d':'#e0856a';
  const fx=[];
  fx.push(fc.amphibious?'amphibious −45%':'frontal assault');
  if(fc.terr>1.01) fx.push('terrain +'+Math.round((fc.terr-1)*100)+'% def');
  if(fc.aSup>0) fx.push('your support +'+(fc.aSup*30)+'%');
  if(fc.aCombined) fx.push('combined arms +18%');
  if(fc.dSup>0) fx.push('enemy line +'+(fc.dSup*20)+'% def');
  if(fc.dCombined) fx.push('enemy combined arms +8% def');
  if(fc.air>1.02) fx.push('air support +'+Math.round((fc.air-1)*100)+'%');
  else if(fc.air<0.98) fx.push('enemy air −'+Math.round((1-fc.air)*100)+'%');
  if(fc.winter>0.05){ const wp=Math.round(fc.winter*(1-(fc.atkGear||0))*35); if(wp>1) fx.push('winter −'+wp+'%'); }
  if(!fc.aSupply) fx.push('you cut off −40%');
  if(fc.d && !fc.dSupply) fx.push('enemy cut off −40%');
  el.innerHTML='<div class="wc-head">'+aKind+' &nbsp;▸&nbsp; '+dName+'</div>'+
    '<div class="wc-bars"><div class="wc-side"><span>YOU</span><b>'+fc.ap.toFixed(0)+'</b></div>'+
    '<div class="wc-odds" style="color:'+col+'">'+fc.winPct+'%</div>'+
    '<div class="wc-side"><span>ENEMY</span><b>'+(fc.d?fc.dp.toFixed(0):'—')+'</b></div></div>'+
    '<div class="wc-meter"><i style="width:'+fc.winPct+'%;background:'+col+'"></i></div>'+
    '<div class="wc-fx">'+fx.join(' · ')+'</div>';
}
function wwHoverForecast(sx,sy){
  if(!(WW.started && wwSelArmy && !wwSelArmy.moved)){ wwRenderCombat(null); return; }
  const hit=wwPick(sx,sy); if(!hit){ wwRenderCombat(null); return; }
  const key=hit[0]+','+hit[1];
  if((wwTargetSet&&wwTargetSet.has(key))||(wwDeclareSet&&wwDeclareSet.has(key))||(wwInvadeSet&&wwInvadeSet.has(key)))
    wwRenderCombat(wwForecast(wwSelArmy, hit[0], hit[1]));
  else wwRenderCombat(null);
}
function wwUpdateInfo(){
  const info=$('ww-info'); if(!info) return;
  if(wwSelArmy){ const a=wwSelArmy, n=WW.byKey[a.nat];
    info.classList.remove('hidden');
    info.innerHTML='<div class="ww-card-head"><span class="ww-flag" style="background:'+n.col+'"></span>'+
      '<div><div class="ww-name">'+(a.kind==='arm'?'Armoured Division':'Infantry Division')+'</div>'+
      '<div class="ww-fac ww-'+n.fac+'">'+n.name+'</div></div></div>'+
      '<table class="ww-stats"><tr><td>Strength</td><td>'+a.str.toFixed(1)+' / '+a.maxStr+'</td></tr></table>'+
      '<div class="ww-bar"><i style="width:'+(100*Math.max(0,a.str/a.maxStr))+'%;background:#7fd08a"></i></div>'+
      '<table class="ww-stats"><tr><td>Organization</td><td>'+a.org.toFixed(1)+' / '+a.maxOrg+'</td></tr></table>'+
      '<div class="ww-bar"><i style="width:'+(100*Math.max(0,a.org/a.maxOrg))+'%;background:#76b6ff"></i></div>'+
      '<table class="ww-stats"><tr><td>Movement</td><td>'+a.mp+'</td></tr>'+
      '<tr><td>Supply</td><td>'+(wwInSupply(a)?'in supply':'<span style="color:#e0856a">cut off</span>')+'</td></tr>'+
      '<tr><td>Combined arms</td><td>'+(wwCombinedArms(a)?'<span style="color:#7fd08a">yes +18%</span>':'<span style="color:#8ba2b8">'+(a.kind==='arm'?'pair with infantry':'pair with armour')+'</span>')+'</td></tr>'+
      '<tr><td>Orders</td><td>'+(a.moved?'used':'ready')+'</td></tr></table>'+
      (a.nat===WW.player && !a.moved ? '<div style="font-size:11px;color:#8fb4d8;margin-top:8px">Blue = move · red = attack · amber = declare war'+
        (wwCoastal(a.x,a.y)?' · <span style="color:#7be0ee">teal = invade by sea</span>':'')+'.</div>' : '')+
      (a.nat===WW.player ? '<div style="font-size:11px;color:#9fb4c9;margin-top:9px">Battle plan</div>'+
        '<div style="margin-top:4px" id="ww-order-btns">'+
        '<span class="ww-rbtn'+(a.order==='attack'?' sel':'')+'" data-ord="attack">⚔ Offensive</span>'+
        '<span class="ww-rbtn'+(a.order==='front'?' sel':'')+'" data-ord="front">🛡 Hold Line</span>'+
        '<span class="ww-rbtn'+(!a.order?' sel':'')+'" data-ord="manual">✋ Manual</span></div>'+
        '<div style="font-size:10px;color:#7d93ab;margin-top:4px">Ordered divisions advance & fight on their own every turn.</div>' : '');
    if(a.nat===WW.player){ const ob=$('ww-order-btns'); if(ob) for(const b of ob.querySelectorAll('.ww-rbtn')) b.onclick=()=>{ wwSetOrder(a, b.dataset.ord==='manual'?null:b.dataset.ord); wwSfx('click'); wwUpdateInfo(); wwUpdateHUD(); wwRequest(); }; }
    return; }
  if(wwSelNat){ const n=wwSelNat; info.classList.remove('hidden');
    const facName={axis:'Axis',allies:'Allies',comintern:'Comintern',neutral:'Neutral'}[n.fac]||'Neutral';
    const rel = WW.started ? (n.key===WW.player?'— You —': n.capitulated?'Capitulated': wwAtWar(WW.player,n.key)?'At war': wwAllied(WW.player,n.key)?'Ally':'Neutral') : '';
    info.innerHTML='<div class="ww-card-head"><span class="ww-flag" style="background:'+n.col+'"></span>'+
      '<div><div class="ww-name">'+n.name+'</div><div class="ww-fac ww-'+n.fac+'">'+facName+(rel?' · '+rel:'')+'</div></div></div>'+
      '<table class="ww-stats">'+
      '<tr><td>Capital</td><td>'+(n.cap||'—')+'</td></tr>'+
      '<tr><td>Territory</td><td>'+n.hexes+' hexes</td></tr>'+
      '<tr><td>Cities</td><td>'+n.cityList.length+'</td></tr>'+
      '<tr><td>Civ. factories</td><td>'+n.civ+'</td></tr>'+
      '<tr><td>Mil. factories</td><td>'+n.mil+'</td></tr>'+
      '<tr><td>Air force</td><td>'+Math.round(wwAirTotal(n))+' <span style="color:#8ba2b8">('+Math.round(n.air?n.air.fighter:0)+'F/'+Math.round(n.air?n.air.cas:0)+'C/'+Math.round(n.air?n.air.strat:0)+'S)</span></td></tr>'+
      (WW.started && n.key!==WW.player && wwAtWar(WW.player,n.key) ? '<tr><td>Your air superiority</td><td>'+(wwAirSup(WW.player,n.key)>=0?'+':'')+Math.round(wwAirSup(WW.player,n.key)*100)+'%</td></tr>' : '')+
      '<tr><td>Manpower</td><td>'+(n.mp/1e6).toFixed(1)+'M</td></tr>'+
      '<tr><td>Oil / Steel</td><td>'+(n.oil||0)+' / '+(n.steel||0)+'</td></tr>'+
      '<tr><td>Fuel</td><td>'+Math.round(n.fuel||0)+'/'+(n.fuelMax||0)+(n.lowFuel?' ⚠':'')+'</td></tr>'+
      (n.casualties>0?'<tr><td>Casualties</td><td>'+wwFmtNum(n.casualties)+'</td></tr>':'')+
      '<tr><td>Victory pts</td><td>'+n.vp+'</td></tr></table>'+
      (WW.started && n.key!==WW.player && wwAtWar(WW.player,n.key) && !n.capitulated ?
        '<div style="margin-top:9px">'+
        (n.warDmg>0.01?'<div style="font-size:11px;color:#e0a06a;margin-bottom:6px">Industry crippled: '+Math.round(n.warDmg*100)+'%</div>':'')+
        '<button class="ww-pbtn" id="ww-bomb-btn" style="margin-top:0;background:'+(WW.byKey[WW.player].bombTarget===n.key?'#7a3030':'#234a8a')+'">'+
        (WW.byKey[WW.player].bombTarget===n.key?'■ Halt bombing':'✈ Bomb industry')+'</button></div>' : '');
    { const bb=$('ww-bomb-btn'); if(bb) bb.onclick=()=>{ wwSetBombing(WW.player, n.key); wwUpdateInfo(); wwUpdateHUD(); }; }
    return; }
  info.classList.add('hidden');
}
function wwFillLegend(){ const el=$('ww-legend'); if(!el) return;
  const f=wwFactions(), order=[['axis','Axis'],['allies','Allies'],['comintern','Comintern'],['neutral','Neutral']]; let html='';
  for(const [k,label] of order){ if(!f[k].length) continue;
    html+='<div class="ww-leg-row"><span class="ww-leg-label">'+label+'</span>';
    html+=f[k].slice(0,10).map(n=>'<span class="ww-sw" style="background:'+n.col+'" title="'+n.name+'"></span>').join(''); html+='</div>'; }
  el.innerHTML=html; }

function wwToast(msg){ const box=$('ww-toast'); if(!box) return;
  const el=document.createElement('div'); el.className='ww-toast-msg'; el.textContent=msg; box.appendChild(el);
  setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); }, 3600); }
function wwShowEnd(v){ const el=$('ww-end'); if(!el) return; el.classList.remove('hidden'); wwSfx(v.win?'win':'lose');
  const me=WW.byKey[WW.player];
  el.innerHTML = v.win
    ? '<h1 style="color:#ffe08a">VICTORY</h1><p>'+me.name+' stands triumphant over Europe. Every enemy that took up arms against you has been brought to capitulation.</p>'
    : '<h1 style="color:#e08a7a">DEFEAT</h1><p>'+me.name+' has capitulated. The war is lost.</p>';
  const b=document.createElement('button'); b.textContent='RETURN TO MENU'; b.onclick=()=>{ wwClose(); showModeSelect(); }; el.appendChild(b); }

function wwBindInput(){
  if(wwBound) return; wwBound=true; const cv=$('wwCanvas');
  cv.addEventListener('mousedown',e=>{ if(!WW.on) return; wwDrag=true; wwDragMoved=false; wwLMx=e.clientX; wwLMy=e.clientY; cv.classList.add('drag'); });
  // (panning renders the cheap cached map; full detail returns on release — see _interacting)
  window.addEventListener('mousemove',e=>{ if(!WW.on) return;
    if(wwDrag){ const dx=e.clientX-wwLMx, dy=e.clientY-wwLMy;
      if(Math.abs(dx)+Math.abs(dy)>3){ wwDragMoved=true; WW._interacting=true; } WW.cam.x+=dx; WW.cam.y+=dy; wwLMx=e.clientX; wwLMy=e.clientY; wwRequest(); return; }
    const r=cv.getBoundingClientRect(); wwHoverForecast(e.clientX-r.left, e.clientY-r.top); });
  window.addEventListener('mouseup',e=>{ if(!WW.on){ wwDrag=false; return; }
    if(wwDrag && !wwDragMoved){ const r=cv.getBoundingClientRect(); wwClickHex(wwPick(e.clientX-r.left, e.clientY-r.top)); }
    wwDrag=false; cv.classList.remove('drag');
    if(wwDragMoved && !wwZoomState){ WW._interacting=false; wwRequest(); } });   // settled → one crisp redraw
  cv.addEventListener('wheel',e=>{ if(!WW.on) return; e.preventDefault(); const r=cv.getBoundingClientRect(); wwZoomAt(e.clientX-r.left, e.clientY-r.top, e.deltaY<0?1.12:1/1.12); }, {passive:false});
  window.addEventListener('resize',()=>{ if(WW.on){ wwResize(); wwRequest(); } });
  window.addEventListener('keydown',e=>{ if(!WW.on) return;
    if(e.key==='Escape'){ wwClose(); showModeSelect(); }
    else if((e.key===' '||e.key==='Enter') && WW.started){ e.preventDefault(); wwDoEndTurn(); }
    else if(e.key==='+'||e.key==='='){ const c=$('wwCanvas'); wwZoomAt(c.clientWidth/2,c.clientHeight/2,1.15); }
    else if(e.key==='-'||e.key==='_'){ const c=$('wwCanvas'); wwZoomAt(c.clientWidth/2,c.clientHeight/2,1/1.15); } });
  const bk=$('ww-back'); if(bk) bk.onclick=()=>{ if(WW.started && !(WW.result&&WW.result.over)) wwSave(); wwClose(); showModeSelect(); };
  const et=$('ww-endturn'); if(et) et.onclick=wwDoEndTurn;
  const bf=$('ww-btn-focus'); if(bf) bf.onclick=wwOpenFocusPage;
  const fcl=$('ww-foc-close'); if(fcl) fcl.onclick=wwCloseFocusPage;
  const br=$('ww-btn-research'); if(br) br.onclick=wwOpenResearchPage;
  const rcl=$('ww-res-close'); if(rcl) rcl.onclick=wwCloseResearchPage;
  const ba=$('ww-btn-air'); if(ba) ba.onclick=wwToggleAir;
  const bp=$('ww-btn-prod'); if(bp) bp.onclick=wwToggleProduction;
  const bd=$('ww-btn-diplo'); if(bd) bd.onclick=wwToggleDiplo;
  const bs=$('ww-btn-supply'); if(bs) bs.onclick=wwToggleSupply;
  const bh=$('ww-btn-help'); if(bh) bh.onclick=()=>{ wwSfx('click'); wwTutStart(true); };
  const tn=$('ww-tut-next'); if(tn) tn.onclick=wwTutNext;
  const tsk=$('ww-tut-skip'); if(tsk) tsk.onclick=wwTutDone;
  const mm=$('ww-minimap'); if(mm) mm.addEventListener('mousedown', e=>{ if(!WW.on||!WW._mm) return; const r=mm.getBoundingClientRect();
    const wx=(e.clientX-r.left-WW._mm.ox)/WW._mm.sc, wy=(e.clientY-r.top-WW._mm.oy)/WW._mm.sc, cv2=$('wwCanvas');
    WW.cam.x=cv2.clientWidth/2-wx*WW.cam.z; WW.cam.y=cv2.clientHeight/2-wy*WW.cam.z; wwRequest(); });
  const wt=$('ww-winter-toggle'); if(wt) wt.onclick=()=>{ if(!WW.started) return; const me=WW.byKey[WW.player]; me.winterizing=!me.winterizing;
    wwToast(me.winterizing?'Winter preparations begun — diverting 30% of production':'Winter preparations halted'); wwUpdateHUD(); };
}
// expose a few entry points on window for debugging / headless rendering (no-op in tests)
if(typeof window!=='undefined'){ window.wwStart=wwStart; window.wwRender=wwRender; window.wwDoEndTurn=wwDoEndTurn; window.wwSelectArmy=wwSelectArmy; window.wwFit=wwFit; window.wwZoomAt=wwZoomAt; }

/* mode-select routing — each sub-menu shows its own Continue button only if that
   slot actually holds a saved campaign */
function showModeSelect(){ show('mode-select', true); show('menu', false); show('realistic-menu', false); show('waw-menu', false); if(typeof wwClose==='function') wwClose(); }
/* ---- THE WORLD AT WAR — native Europe grand-strategy (wwOpen defined above) ---- */
$('mc-hex').onclick = wwOpen;
/* ---- Grand Eastern Front: side + difficulty select ---- */
let wawSide = 'G', wawDiff = 'hard';
const WAW_DIFF_DESC = {
  easy:   'A gentler war — the AI is cautious and you out-produce it. Good for learning the bigger map.',
  normal: 'A fair fight — the AI plays a solid game with no bonuses.',
  hard:   'The AI plays sharply, holds its line, and out-produces you. A real test.',
  brutal: 'A pitiless enemy: out-produces you heavily, hits harder, and gives no ground. For veterans.',
};
function syncWawUI(){
  $('waw-pick-ger').classList.toggle('sel', wawSide==='G');
  $('waw-pick-sov').classList.toggle('sel', wawSide==='S');
  document.querySelectorAll('#waw-diff-row .opt').forEach(o=>o.classList.toggle('sel', o.dataset.d===wawDiff));
  $('waw-diff-desc').textContent = WAW_DIFF_DESC[wawDiff] || '';
}
$('mc-wawtest').onclick = ()=>{
  show('mode-select', false); show('waw-menu', true); sClick();
  $('waw-continue').classList.toggle('hidden', !hasSaveSlot('wawtest'));
  syncWawUI();
};
$('waw-pick-ger').onclick = ()=>{ wawSide='G'; syncWawUI(); };
$('waw-pick-sov').onclick = ()=>{ wawSide='S'; syncWawUI(); };
for (const el of document.querySelectorAll('#waw-diff-row .opt')) el.onclick = ()=>{ wawDiff=el.dataset.d; syncWawUI(); };
$('waw-back').onclick = ()=>{ show('waw-menu', false); show('mode-select', true); };
$('waw-play').onclick = ()=>{
  eventQueue.length = 0;
  newGame(wawSide, wawDiff, 'ai', 'wawtest');
  show('waw-menu', false);
  startCampaign();
};
$('waw-continue').onclick = ()=>{
  eventQueue.length = 0; show('event-modal', false);
  if (loadSlot('wawtest')){ show('waw-menu', false); startCampaign(true); }
};
$('mc-arcade').onclick = ()=>{
  show('mode-select', false); show('menu', true); sClick();
  $('btn-continue').classList.toggle('hidden', !hasSaveSlot('arcade'));
};
let rmSide = 'G', rmDiff = 'normal', rmScenario = 'realistic', rmPendingUntil = 0;
/* keep the side-pick cards and Continue button in step with the chosen scenario */
function syncRmMenu(){
  document.querySelectorAll('#rm-scn-row .pick').forEach(o=>o.classList.toggle('sel', o.dataset.scn===rmScenario));
  const sc = SCENARIOS[rmScenario];
  const g=$('rm-pick-ger'), s=$('rm-pick-sov');
  if (sc && sc.menu && typeof g.querySelector === 'function'){
    g.querySelector('h4').textContent = sc.menu.ger.h;
    g.querySelector('p').textContent  = sc.menu.ger.p;
    s.querySelector('h4').textContent = sc.menu.sov.h;
    s.querySelector('p').textContent  = sc.menu.sov.p;
  }
  $('btn-play-realistic').textContent = (sc ? sc.short : 'CAMPAIGN') + ' — BEGIN ▶';
  $('btn-continue-realistic').classList.toggle('hidden', !hasSaveSlot(saveSlotFor(rmScenario)));
}
$('mc-realistic').onclick = ()=>{
  show('mode-select', false); show('realistic-menu', true); sClick();
  syncRmMenu();
};
$('btn-back-realistic').onclick = ()=>{ show('realistic-menu', false); show('mode-select', true); };
for (const el of document.querySelectorAll('#rm-scn-row .pick')) el.onclick = ()=>{ rmScenario=el.dataset.scn; rmPendingUntil=0; syncRmMenu(); };
$('rm-pick-ger').onclick = ()=>{ rmSide='G'; $('rm-pick-ger').classList.add('sel'); $('rm-pick-sov').classList.remove('sel'); };
$('rm-pick-sov').onclick = ()=>{ rmSide='S'; $('rm-pick-sov').classList.add('sel'); $('rm-pick-ger').classList.remove('sel'); };
for (const el of document.querySelectorAll('#rm-diff-row .opt')) el.onclick = ()=>{ rmDiff=el.dataset.d;
  document.querySelectorAll('#rm-diff-row .opt').forEach(o=>o.classList.toggle('sel', o===el)); };
$('btn-play-realistic').onclick = ()=>{
  // warn before wiping an unfinished campaign in this scenario's own save slot
  if (hasSaveSlot(saveSlotFor(rmScenario)) && performance.now() > rmPendingUntil){
    rmPendingUntil = performance.now() + 3000;
    $('btn-play-realistic').textContent = '⚠ OVERWRITES YOUR SAVE — SURE?';
    setTimeout(()=>{ if (performance.now() >= rmPendingUntil) syncRmMenu(); }, 3100);
    return;
  }
  rmPendingUntil = 0;
  eventQueue.length = 0;
  newGame(rmSide, rmDiff, 'ai', rmScenario);
  show('realistic-menu', false);
  startCampaign();
};
$('btn-continue-realistic').onclick = ()=>{
  eventQueue.length = 0; show('event-modal', false);
  if (loadSlot(saveSlotFor(rmScenario))){ show('realistic-menu', false); startCampaign(true); }
};
$('btn-back-arcade').onclick = ()=>{ show('menu', false); show('mode-select', true); };

$('btn-menu').onclick = ()=>{
  saveGame();                        // autosave into this game's own slot
  showModeSelect();                  // continue buttons are set when each sub-menu opens
};

/* ---------------- end turn & AI driver ---------------- */
let endPendingUntil = 0;
$('btn-endturn').onclick = ()=>{
  if (!G || G.over || aiRunning) return;
  const human = G.mode==='hotseat' || G.phase===G.playerSide;
  if (!human) return;
  // a strategic decision must be answered before the turn can end
  if (maybeShowDecision()) return;
  // safeguard: units still have orders? ask for a second click
  const ready = actionableUnits(G.phase).length;
  if (ready > 0 && performance.now() > endPendingUntil){
    endPendingUntil = performance.now() + 2500;
    $('btn-endturn').textContent = `⚠ ${ready} still ready — end anyway?`;
    setTimeout(()=>{ if (performance.now() >= endPendingUntil) $('btn-endturn').textContent = 'End Turn ▶'; }, 2600);
    return;
  }
  endPendingUntil = 0;
  $('btn-endturn').textContent = 'End Turn ▶';
  sClick(); deselect(); deployKind = null; clearUndo();
  endPhase();
  saveGame();
  if (G.over) return;
  proceed();
};

function proceed(){
  updateAll();
  if (G.over) return;
  const human = G.mode==='hotseat' || G.phase===G.playerSide;
  if (G.mode==='hotseat'){
    $('pass-title').textContent = 'PASS THE KEYBOARD';
    $('pass-text').innerHTML = `It is now the <b>${flag(G.phase)} ${sideName(G.phase)}</b> player's turn ${G.turn} (${dateStr(G.turn)}).`;
    // turn report: what happened while this player looked away
    const snap = G.turnSnap && G.turnSnap[G.phase];
    let rep = '';
    if (snap){
      const lost = G.stats[G.phase].lost - snap.lost;
      const killed = G.stats[G.phase].killed - snap.killed;
      const held = new Set(G.cities.filter(c=>c.owner===G.phase).map(c=>c.name));
      const lostC = snap.cities.filter(n=>!held.has(n));
      rep = `<div style="margin-top:8px;font-size:13px;color:var(--dim);">While you were away — ` +
            `strength lost: <b style="color:var(--redL)">${lost}</b> · inflicted: <b style="color:var(--grn)">${killed}</b>` +
            (lostC.length ? `<br>Cities lost: <b style="color:var(--redL)">${lostC.join(', ')}</b>` : '') + `</div>`;
    }
    $('pass-report').innerHTML = rep;
    show('pass-modal', true);
    return;
  }
  if (!human) runAIPhase();
}

function runAIPhase(){
  aiRunning = true;
  clearUndo();
  show('ai-banner', true);
  $('ai-banner').textContent = flag(G.phase) + ' ' + sideName(G.phase).toUpperCase() + ' TURN…';
  clearAICache();
  aiSpend(G.phase);
  updateAll();
  let guard = 0;
  const cap = (unitsOf(G.phase).length+2)*8;
  function step(){
    if (G.over){ finish(); return; }
    if (guard++ > cap){ finish(); return; }
    const a = aiPlanAction(G.phase);
    if (!a){ finish(); return; }
    // pace the show: snappier when the army is huge, scaled by the AI speed toggle
    const mult = aiSpeed===2 ? 0 : aiSpeed===1 ? 0.35 : 1;
    const n = unitsOf(G.phase).length;
    const mDelay = Math.max(40, 150 - n*2), aDelay = Math.max(120, 300 - n*3);
    const res = applyAction(a);
    if (res && res.type==='move'){
      if (mult) sMove();
      setTimeout(step, mDelay*mult);
    } else if (res && res.type==='attack'){
      sShot();
      attackArrow(res.att, res.def);
      const ev = res.ev;
      if (ev.defLoss>0 || ev.destroyed) boomAt(ev.defFrom[0], ev.defFrom[1], ev.destroyed);
      if (ev.defLoss>0) floatText(ev.defFrom[0],ev.defFrom[1],'-'+ev.defLoss,'#ff8d80');
      if (ev.destroyed){ sBoom(); floatText(ev.defFrom[0],ev.defFrom[1],'✕','#ff5340'); }
      updateAll();
      setTimeout(step, aDelay*mult);
    } else {
      setTimeout(step, 0);
    }
  }
  function finish(){
    show('ai-banner', false);
    aiRunning = false;
    if (!G.over){
      endPhase();
      saveGame();
      if (!G.over){
        const human = G.phase===G.playerSide;
        if (!human){ runAIPhase(); return; }
      }
    }
    updateAll();
  }
  setTimeout(step, aiSpeed===2 ? 0 : 350);
}

$('btn-pass-go').onclick = ()=>{ show('pass-modal', false); updateAll();
  if (!maybeShowDecision()) maybeShowGear(); };   // the new player faces any pending choice

/* ---------------- end screen ---------------- */
function showEnd(){
  const r = G.result; if (!r) return;
  const youAxis = G.playerSide==='G' && G.mode!=='hotseat';
  const axisWon = r.title.includes('AXIS');
  const sovietWon = r.title.includes('SOVIET');
  let cls = 'win';
  if (G.mode!=='hotseat'){
    cls = (youAxis && axisWon) || (!youAxis && sovietWon) ? 'win' : (r.title.includes('STALEMATE') ? '' : 'lose');
  }
  $('end-title').textContent = r.title;
  $('end-title').className = cls;
  $('end-text').textContent = r.text;
  $('end-stats').innerHTML = `
    <div class="statrow"><span>${sideName('G')} objective points</span><span>${r.vp} / ${TOTAL_VP}</span></div>
    <div class="statrow"><span>${flag('G')} ${sideName('G')} losses</span><span>${G.stats.G.lost} strength</span></div>
    <div class="statrow"><span>${flag('S')} ${sideName('S')} losses</span><span>${G.stats.S.lost} strength</span></div>
    <div class="statrow"><span>Campaign length</span><span>${Math.min(G.turn,MAX_TURN)} ${(SCN.turnDays||7)===7?'weeks':(SCN.turnDays||7)===1?'days':'turns'}</span></div>`;
  show('end-modal', true);
  if (cls==='win') sCity(); else sBoom();
  clearSave();
}
$('btn-end-menu').onclick = ()=>{ show('end-modal',false); showModeSelect(); $('btn-continue').classList.add('hidden'); };

/* ---------------- menu ---------------- */
let mSide='G', mDiff='normal', mMode='ai', mScn='barbarossa';
function applyScenarioMenu(){
  const s = SCENARIOS[mScn];
  $('menu-title').textContent = s.title;
  $('menu-sub').textContent = s.sub;
  $('pick-ger').innerHTML = `<h4>${s.menu.ger.h}</h4><p>${s.menu.ger.p}</p>`;
  $('pick-sov').innerHTML = `<h4>${s.menu.sov.h}</h4><p>${s.menu.sov.p}</p>`;
}
for (const el of document.querySelectorAll('#scn-row .opt')){
  el.onclick = ()=>{
    mScn = el.dataset.s;
    document.querySelectorAll('#scn-row .opt').forEach(o=>o.classList.remove('sel'));
    el.classList.add('sel');
    applyScenarioMenu(); sClick();
  };
}
$('pick-ger').onclick = ()=>{ mSide='G'; $('pick-ger').classList.add('sel'); $('pick-sov').classList.remove('sel'); };
$('pick-sov').onclick = ()=>{ mSide='S'; $('pick-sov').classList.add('sel'); $('pick-ger').classList.remove('sel'); };
for (const el of document.querySelectorAll('#diff-row .opt')){
  el.onclick = ()=>{
    mDiff = el.dataset.d;
    document.querySelectorAll('#diff-row .opt').forEach(o=>o.classList.remove('sel'));
    el.classList.add('sel');
  };
}
$('mode-ai').onclick = ()=>{ mMode='ai'; $('mode-ai').classList.add('sel'); $('mode-hotseat').classList.remove('sel'); };
$('mode-hotseat').onclick = ()=>{ mMode='hotseat'; $('mode-hotseat').classList.add('sel'); $('mode-ai').classList.remove('sel'); };

let startPendingUntil = 0;
$('btn-start').onclick = ()=>{
  // safeguard: an unfinished Arcade campaign is saved — ask before wiping it
  // (the Realistic slot is independent and untouched)
  if (hasSaveSlot('arcade') && performance.now() > startPendingUntil){
    startPendingUntil = performance.now() + 3000;
    $('btn-start').textContent = '⚠ OVERWRITES YOUR SAVE — SURE?';
    setTimeout(()=>{ if (performance.now() >= startPendingUntil) $('btn-start').textContent = 'BEGIN CAMPAIGN'; }, 3100);
    return;
  }
  startPendingUntil = 0;
  $('btn-start').textContent = 'BEGIN CAMPAIGN';
  eventQueue.length = 0;                       // drop popups from a previous campaign
  newGame(mSide, mDiff, mMode, mScn);          // fires the turn-1 event
  startCampaign();
};
$('btn-continue').onclick = ()=>{
  eventQueue.length = 0; show('event-modal', false);
  if (loadSlot('arcade')) startCampaign(true);
};
function startCampaign(loaded){
  undoSnap = null;
  $('game-title').textContent = '⚙ ' + SCN.short;
  show('menu', false);
  show('topbar', true); show('side', true); show('hint', true);
  fitCamera();
  updateAll();
  if (!eventQueue.length && !maybeShowDecision() && G.winterGear === 'pending') maybeShowGear();   // saved mid-decision
  if (!loaded) saveGame();
  // if the human plays the Soviets, the German AI opens the war
  if (!G.over && G.mode==='ai' && G.phase!==G.playerSide) runAIPhase();
  if (!G.over && G.mode==='hotseat') updateAll();
}
migrateSaves();                                        // fold any old single-slot save into its slot
$('btn-continue').classList.toggle('hidden', !hasSaveSlot('arcade'));

})();

/* ============================ HEADLESS EXPORTS (for tests) ============================ */
if (typeof module !== 'undefined' && module.exports){
  module.exports = {
    newGame, aiFullPhase, endPhase, startPhase, axisVP, weatherFor,
    computeSupply, computeZOC, reachable, previewCombat, resolveCombat, railNetwork,
    threatField, threatPenalty, aiSkill, aiPlanAction, clearAICache,
    doMove, doReinforce, doDeploy, deploySpots, serialize, deserialize,
    unitsOf, unitAt, cityAt, neighbors, hexDist, passable, terrainAt,
    airOf, airStrike, setPatrol, strikeTargets, airfieldCovered, previewStrike,
    buildAir, reinforceAir, canBuildAir, canReinfAir, aiAirBuild,
    GENERALS, generalOf, zhukovDefends,
    EVENTS, fireEvents, decideWinterGear, hasWinterGear, terrOwner, absorbPockets, claimTerritory,
    fireDecisions, resolveDecision, pendingDecision, decisionsFor,
    unitLevel, vetMul, underHQ, previewGroup, gainXP, HQ_RANGE,
    SCENARIOS, loadScenario,
    saveGame, loadSlot, hasSaveSlot, saveKeyFor, saveSlotFor, clearSave, migrateSaves,
    MAP_ROWS, CITIES_INIT, START_UNITS, SOV_SCHEDULE, KINDS, COLS, ROWS, MAX_TURN, TOTAL_VP,
    WW_DATA, WW, wwBuildState, wwComputeStats, wwFactions, wwNb, wwOwnerAt, wwSea, wwCapitalHex,
    wwSetup, wwAtWar, wwAllied, wwArmyAt, wwArmiesOf, wwReachable, wwAttackTargets, wwMoveArmy,
    wwAttack, wwCaptureHex, wwCapitulate, wwEndTurn, wwCheckVictory, wwProduction, wwAINation,
    wwPlaceArmies, wwAdvanceDate, wwTerrDef, wwPassableFor, wwNearestEnemyHex,
    wwDeclareWar, wwForeignAdj, wwAttackTargetsPlayer, wwRetreat, wwAIObjective, wwAIPlan, wwRelation,
    wwSupplyField, wwRailNetwork, wwRecomputeSupply, wwInSupply, wwAtkPower, wwDefPower, wwSupport, wwCombinedArms, wwAIStep2,
    wwEconomyTick, wwEffMp, WW_CITY_RES, WW_ECO,
    wwInitLines, wwSetLineMix, wwDeployDivision, WW_PROD_PRESETS,
    wwSetOrder, wwOnFront, wwExecuteFront, wwOrderCounts,
    wwCoastal, wwInvadeTargets, wwInvade, wwAirFactor, wwBaseAir, wwForecast,
    wwAirTotal, wwAirSup, wwFrontFighters, wwAddAir, wwAirDoctrine, WW_DOCTRINE,
    wwSetBombing, wwAIBombing, wwBombingTick,
    wwSerialize, wwDeserialize, wwSave, wwLoadSave, wwHasSave, wwClearSave,
    wwDayOfYear, wwWinterAt, wwSeasonName, wwLatOf, wwHexWinter, wwGear, wwSetWinterizing, WW_WINTER_BASE,
    WW_FOCUS, WW_TECH, WW_TECH_YEARS, wwTechInit, wwLandBonus, wwResearchTick,
    wwTechList, wwTechById, wwTechAvail, wwAvailableTechs, wwAIPickTech, wwStartResearch,
    wwFocusInit, wwFocusList, wwFocusById, wwFocusAvail, wwAvailableFocuses, wwAIPickFocus, wwStartFocus, wwFocusTick, wwApplyFocus, wwSpawnDivisions,
    getState: () => G,
  };
}
