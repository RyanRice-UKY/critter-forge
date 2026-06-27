// arena-sim.mjs — the development battle harness. Runs many headless matches of
// the bot ladder and reports win rates, so we can tell whether the arena is fun
// (varied, skill-ordered) or degenerate (one brain wins everything / coin-flip).
//
//   node arena-sim.mjs            # 4-way free-for-all, full ladder
//   node arena-sim.mjs 300        # with N matches
import { Arena } from "./arena.js";
import { LADDER } from "./bots.js";

const N = Number(process.argv[2]) || 400;

// A handful of obstacles so positioning matters.
const WALLS = [[7, 4], [7, 5], [7, 6], [7, 8], [7, 9], [7, 10], [4, 7], [5, 7], [9, 7], [10, 7]];

function match(brains, seed) {
  return new Arena({ size: 15, walls: WALLS, berryCount: 5, ticks: 220, brains, seed }).run();
}

// --- 1) Full free-for-all: all 5 brains in one arena ---
console.log(`\n=== Free-for-all (${N} matches, ${LADDER.length} brains) ===`);
const wins = Object.fromEntries(LADDER.map((b) => [b.name, 0]));
let draws = 0, totalKills = 0;
const totalSize = Object.fromEntries(LADDER.map((b) => [b.name, 0]));
for (let i = 0; i < N; i++) {
  const r = match(LADDER, i * 7 + 1);
  if (r.winner === "draw") draws++; else wins[r.winner]++;
  for (const s of r.standings) { totalSize[s.name] += s.size; totalKills += s.kills; }
}
const rows = LADDER.map((b) => ({ name: b.name, win: wins[b.name], pct: (100 * wins[b.name] / N).toFixed(1), avgSize: (totalSize[b.name] / N).toFixed(1) }))
  .sort((a, b) => b.win - a.win);
for (const r of rows) console.log(`  ${r.name.padEnd(10)} ${String(r.win).padStart(4)} wins  ${r.pct.padStart(5)}%   avg size ${r.avgSize}`);
if (draws) console.log(`  (draws: ${draws})`);
console.log(`  combat activity: ${(totalKills / N).toFixed(2)} kills/match (0 = pure forage race)`);

// --- 2) Head-to-head duels (1v1) to expose dominance cycles ---
console.log(`\n=== 1v1 win-rate matrix (row beats column, %) ===`);
const names = LADDER.map((b) => b.name);
process.stdout.write("           " + names.map((n) => n.slice(0, 6).padStart(7)).join("") + "\n");
for (const A of LADDER) {
  let line = "  " + A.name.padEnd(9);
  for (const B of LADDER) {
    if (A === B) { line += "      -"; continue; }
    let w = 0;
    const M = 120;
    for (let i = 0; i < M; i++) {
      const r = match([A, B], i * 13 + 3);
      if (r.winner === A.name) w++;
    }
    line += `${(100 * w / M).toFixed(0).padStart(7)}`;
  }
  console.log(line);
}

// --- 3) Health checks ---
console.log("\n=== health ===");
const top = rows[0], bottom = rows[rows.length - 1];
console.log(`  most wins: ${top.name} (${top.pct}%) | fewest: ${bottom.name} (${bottom.pct}%)`);
console.log(`  skill order holds if Champion >= Hunter >= Greedy >= Wanderer in wins.`);
console.log(`  degenerate if any brain > 75% in the free-for-all.`);
