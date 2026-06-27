// verify.mjs — regression test. Encodes each level's canonical solution and
// runs it across many seeds; every level must clear its own pass threshold.
import { World } from "./engine.js";
import { LEVELS } from "./levels.js";

// ---- command-mode (script) bridge ----
function api(w) {
  const A = ["up", "down", "left", "right", "wait", "stay"];
  return {
    step(d, n = 1) { if (!A.includes(d)) throw new Error("bad dir " + d); for (let i = 0; i < n; i++) { if (w.status !== "playing") break; w.apply(d); } },
    look() { return w.sense(); },
  };
}

// ---- reactive helpers ----
const CARD = ["up", "down", "left", "right"];
const CW = { up: "right", right: "down", down: "left", left: "up" };
const CCW = { right: "up", down: "right", left: "down", up: "left" };
const STEP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

const scentSeek = (s, filterDanger) => {
  let best = -1, bd = "stay";
  for (const d of CARD) { if (filterDanger && s.danger[d]) continue; if (s.scent[d] > best) { best = s.scent[d]; bd = d; } }
  return bd;
};
const fleeScent = (K) => (s) => (s.predator_dist !== null && s.predator_dist < K) ? s.flee_dir : scentSeek(s, true);

function memHeading(s) {
  let best = 0, bd = null;
  for (const d of CARD) if (!s.danger[d] && s.scent[d] > best) { best = s.scent[d]; bd = d; }
  if (bd) return bd;
  let h = s.memory.heading || "right";
  if (s.danger[h]) { for (const d of CARD) if (!s.danger[d]) { h = d; break; } }
  s.memory.heading = h;
  return h;
}
function rightHand(s) {
  let best = 0, bd = null;
  for (const d of CARD) if (!s.danger[d] && s.scent[d] > best) { best = s.scent[d]; bd = d; }
  if (bd) { s.memory.heading = bd; return bd; }
  const h = s.memory.heading || "right";
  for (const d of [CW[h], h, CCW[h], CW[CW[h]]]) if (!s.danger[d]) { s.memory.heading = d; return d; }
  return "stay";
}
function visitedExplore(s) {
  let best = 0, bd = null;
  for (const d of CARD) if (!s.danger[d] && s.scent[d] > best) { best = s.scent[d]; bd = d; }
  if (bd) return bd;
  const v = s.memory.visited || (s.memory.visited = {});
  const [x, y] = s.pos; v[x + "," + y] = true;
  const h = s.memory.heading || "right";
  const order = [CW[h], h, CCW[h], CW[CW[h]]];
  for (const d of order) { if (s.danger[d]) continue; const nx = x + STEP[d][0], ny = y + STEP[d][1]; if (!v[nx + "," + ny]) { s.memory.heading = d; return d; } }
  for (const d of order) if (!s.danger[d]) { s.memory.heading = d; return d; }
  return "stay";
}

const SCRIPT = {
  "1.1": c => c.step("right", 1),
  "1.2": c => c.step("right", 4),
  "1.3": c => { c.step("right", 3); c.step("up", 2); },
  "1.4": c => { const s = c.look(); c.step("down", 1); c.step("right", s.food_dx); c.step("up", 1); },
  "1.5": c => c.step("right", c.look().food_dx),
  "2.1": c => { const s = c.look(); c.step("right", s.food_dx); },
  "2.2": c => { const s = c.look(); c.step("right", s.food_dx); c.step("up", -s.food_dy); },
  "2.3": c => { const s = c.look(); const g = s.food_dx; c.step("right", g); c.step("right", g); },
  "2.4": c => { const s = c.look(); c.step("down", 1); c.step("right", s.food_dx); c.step("up", 1); },
  "2.5": c => { const s = c.look(); c.step("right", s.food_dx); c.step("up", -s.food_dy); },
  "3.1": c => { const s = c.look(); s.food_dx > 0 ? c.step("right", s.food_dx) : c.step("left", -s.food_dx); },
  "3.2": c => { const s = c.look(); if (s.food_dx > 0) c.step("right", s.food_dx); else if (s.food_dx < 0) c.step("left", -s.food_dx); else if (s.food_dy < 0) c.step("up", -s.food_dy); else c.step("down", s.food_dy); },
  "3.3": c => { const s = c.look(); const dx = s.food_dx; if (!s.danger.right) c.step("right", dx); else { c.step("down", 1); c.step("right", dx); c.step("up", 1); } },
  "3.4": c => { const s = c.look(); const dx = s.food_dx; if (!s.danger.right && s.energy > dx + 2) c.step("right", dx); else { c.step("down", 1); c.step("right", dx); c.step("up", 1); } },
  "3.5": c => { const s = c.look(); c.step(s.food_dx > 0 ? "right" : "left", Math.abs(s.food_dx)); c.step(s.food_dy > 0 ? "down" : "up", Math.abs(s.food_dy)); },
};
const REACT = {
  "4.1": s => s.flee_dir,
  "4.2": s => (s.predator_dist !== null && s.predator_dist < 3) ? s.flee_dir : (s.food_dx > 0 ? "right" : "left"),
  "4.3": s => (s.predator_dist !== null && s.predator_dist < 3) ? s.flee_dir : (s.food_dx > 0 ? "right" : "left"),
  "4.4": s => (s.predator_dist !== null && s.predator_dist < 4) ? s.flee_dir : (s.food_dx !== 0 ? (s.food_dx > 0 ? "right" : "left") : (s.food_dy > 0 ? "down" : "up")),
  "4.5": s => {
    if (s.predator_dist !== null && s.predator_dist < 4) return s.flee_dir;
    if (s.food_dx > 0 && !s.danger.right) return "right";
    if (s.food_dy > 0 && !s.danger.down) return "down";
    if (s.food_dy < 0 && !s.danger.up) return "up";
    if (!s.danger.right) return "right";
    return s.flee_dir;
  },
  "5.1": s => scentSeek(s, false),
  "5.2": s => scentSeek(s, true),
  "5.3": s => scentSeek(s, true),
  "5.4": s => { let n = 0; for (const p of s.predators) if (p.dist <= 3) n++; return n >= 1 ? s.flee_dir : scentSeek(s, true); },
  "5.5": fleeScent(3),
  "6.1": memHeading, "6.2": memHeading, "6.3": rightHand, "6.4": visitedExplore, "6.5": visitedExplore,
  "7.1": fleeScent(3), "7.2": fleeScent(3), "7.3": fleeScent(3), "7.4": fleeScent(3), "7.5": fleeScent(4),
};

function play(level, seed) {
  if (level.mode === "script") {
    const w = new World(level.setup, seed);
    SCRIPT[level.id](api(w));
    return w.status === "won";
  }
  const w = new World(level.setup, seed);
  const mem = {};
  let g = 0;
  while (w.status === "playing" && g++ < 4000) {
    const s = w.sense();
    s.memory = mem;
    w.apply(REACT[level.id](s));
  }
  return w.status === "won";
}

const seeds = []; for (let i = 0; i < 60; i++) seeds.push(i * 13 + 1);
let allOk = true;
let topic = "";
for (const lv of LEVELS) {
  if (lv.topic !== topic) { topic = lv.topic; console.log(`\n— ${topic} —`); }
  const wins = seeds.filter(s => play(lv, s)).length;
  const rate = wins / seeds.length;
  const need = lv.passThreshold ?? (lv.randomize ? 0.75 : 1.0);
  const ok = rate >= need;
  if (!ok) allOk = false;
  console.log(`${ok ? "PASS" : "FAIL"} ${lv.id} ${lv.name.padEnd(22)} ${(rate * 100).toFixed(0).padStart(3)}%  (need ${(need * 100).toFixed(0)}%)`);
}
console.log(allOk ? "\nALL LEVELS OK" : "\n*** SOME LEVELS FAIL ***");
