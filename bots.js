// bots.js — the opponent ladder. Each brain is decide(s) over the arena sensor
// dict (s.size, s.rivals[{dx,dy,dist,size,bigger}], s.scent, s.danger, s.flee_dir,
// s.memory). These are the bots you battle/balance against during development; a
// player's Python decide() slots into the exact same contract later.

const CARD = ["up", "down", "left", "right"];

function bestScent(s) {
  let best = -1, bd = "stay";
  for (const d of CARD) { if (s.danger[d]) continue; if (s.scent[d] > best) { best = s.scent[d]; bd = d; } }
  return bd;
}
function toward(s, dx, dy) {
  // step along the larger axis toward (dx,dy), preferring a safe tile.
  const order = Math.abs(dx) >= Math.abs(dy)
    ? [dx > 0 ? "right" : "left", dy > 0 ? "down" : "up"]
    : [dy > 0 ? "down" : "up", dx > 0 ? "right" : "left"];
  for (const d of order) if (!s.danger[d]) return d;
  return bestScent(s);
}

// Tier 1 — moves at random. The punching bag.
export function wanderer(s) {
  const opts = CARD.filter((d) => !s.danger[d]);
  return opts.length ? opts[Math.floor(Math.random() * opts.length)] : "stay";
}

// Tier 2 — pure forager: chase berries, ignore everyone (grows fast, dies brave).
export function greedy(s) {
  return bestScent(s);
}

// Tier 3 — survival first: flee anything bigger that's close, else forage.
export function coward(s) {
  const t = s.rivals[0];
  if (t && t.bigger && t.dist <= 3) return s.flee_dir;
  return bestScent(s);
}

// Tier 4 — opportunist hunter: eat smaller rivals in reach, flee bigger, else forage.
export function hunter(s) {
  for (const r of s.rivals) {
    if (r.bigger && r.dist <= 2) return s.flee_dir;
    if (!r.bigger && r.dist <= 4) return toward(s, r.dx, r.dy);
  }
  return bestScent(s);
}

// Tier 5 — the champion: forage to stay ahead, hunt only when safely bigger,
// flee decisively, and use memory to avoid thrashing on a tie.
export function champion(s) {
  const near = s.rivals[0];
  if (near && near.bigger && near.dist <= 3) return s.flee_dir;
  for (const r of s.rivals) {
    if (!r.bigger && r.size + 1 <= s.size && r.dist <= 5) return toward(s, r.dx, r.dy);
  }
  // otherwise grow; if no scent at all, drift on a remembered heading
  const d = bestScent(s);
  if (d !== "stay") { s.memory.heading = d; return d; }
  const h = s.memory.heading || "right";
  return s.danger[h] ? (CARD.find((c) => !s.danger[c]) || "stay") : h;
}

export const LADDER = [
  { name: "Wanderer", fn: wanderer, color: "#868e96" },
  { name: "Greedy", fn: greedy, color: "#51cf66" },
  { name: "Coward", fn: coward, color: "#fab005" },
  { name: "Hunter", fn: hunter, color: "#ff6b6b" },
  { name: "Champion", fn: champion, color: "#4dabf7" },
];
