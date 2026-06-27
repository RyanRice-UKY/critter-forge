// tower-verify.mjs — regression test for Tower Logic. Each level's canonical
// decide() must clear its threshold across many seeds.
//   node tower-verify.mjs
import { Tower } from "./tower-engine.js";
import { TOWER_LEVELS } from "./tower-levels.js";

// action helpers (mirror the in-game Python helpers)
const fire = (e) => ({ a: "fire", id: e ? e.id : null });
const hold = () => ({ a: "hold" });
const nearest = (t) => (t.enemies.length ? t.enemies[0] : null); // sorted by dist asc

// canonical brains
function w1(t) {
  const e = nearest(t);
  if (e && e.dist <= t.range) return fire(e);
  return hold();
}
function w2(t) {
  let target = null;
  for (const e of t.enemies) {
    if (e.dist <= t.range) {
      if (target === null || e.col < target.col) target = e;
    }
  }
  return target ? fire(target) : hold();
}
const BRAIN = { first: w1, target: w2 };

function play(level, seed) {
  const g = new Tower(level, seed);
  return g.run(BRAIN[level.topic]);
}

const seeds = []; for (let i = 0; i < 60; i++) seeds.push(i * 13 + 1);
let allOk = true, topic = "";
for (const lv of TOWER_LEVELS) {
  if (lv.topic !== topic) { topic = lv.topic; console.log(`\n— ${topic} —`); }
  const wins = seeds.filter((s) => play(lv, s)).length;
  const rate = wins / seeds.length;
  const need = lv.passThreshold ?? 0.75;
  const ok = rate >= need;
  if (!ok) allOk = false;
  console.log(`${ok ? "PASS" : "FAIL"} ${lv.id} ${lv.name.padEnd(20)} ${(rate * 100).toFixed(0).padStart(3)}%  (need ${(need * 100).toFixed(0)}%)`);
}
console.log(allOk ? "\nALL LEVELS OK" : "\n*** SOME LEVELS FAIL ***");

// Also confirm World 1 actually PUNISHES blind firing (energy waste), so the
// in-range conditional is genuinely forced, not decorative.
const blind = (t) => fire(nearest(t)); // fires even when out of range
const lvl12 = TOWER_LEVELS.find((l) => l.id === "1.2");
let blindWins = seeds.filter((s) => new Tower(lvl12, s).run(blind)).length;
console.log(`\n1.2 blind-fire (no range check): ${blindWins}/${seeds.length} — should be low (concept is forced).`);
