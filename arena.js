// arena.js — the battle simulator. N critters share one world: eat berries to
// grow, and on contact the BIGGER critter eats the smaller (absorbing its size).
// This is the development battle stage — JS bot brains fight headlessly so we can
// balance it, and a player's Python decide() plugs into the same sensor dict.
//
// Win: last critter standing; if several survive to the time limit, biggest wins
// (berries eaten breaks ties). Forage and combat are both live at once, so we can
// watch which dynamic actually drives the fun.

import { mulberry32 } from "./engine.js";

const DIRS = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  stay: { x: 0, y: 0 }, wait: { x: 0, y: 0 },
};
const CARD = ["up", "down", "left", "right"];
const key = (x, y) => `${x},${y}`;

export class Arena {
  // opts: { size, walls?, berryCount, ticks, brains:[{name,fn,color?}], seed }
  constructor(opts) {
    this.size = opts.size ?? 15;
    this.ticksLimit = opts.ticks ?? 250;
    this.berryCount = opts.berryCount ?? 8;
    const rng = mulberry32((opts.seed ?? 1) >>> 0);
    this.rng = rng;

    this.walls = new Set();
    for (let i = 0; i < this.size; i++) {
      this.walls.add(key(i, 0)); this.walls.add(key(i, this.size - 1));
      this.walls.add(key(0, i)); this.walls.add(key(this.size - 1, i));
    }
    for (const w of opts.walls || []) this.walls.add(key(w[0], w[1]));

    // Spawn critters at spread-out free cells. (this.critters must exist before
    // freeCell() runs, since freeCell checks it for overlap.)
    this.berries = new Set();
    this.critters = [];
    opts.brains.forEach((b, i) => {
      const p = this.freeCell();
      this.critters.push({
        id: i, name: b.name, fn: b.fn, color: b.color,
        x: p.x, y: p.y, px: p.x, py: p.y,
        size: 1, alive: true, berries: 0, kills: 0, memory: {},
      });
    });

    while (this.berries.size < this.berryCount) {
      const p = this.freeCell();
      this.berries.add(key(p.x, p.y));
    }

    this.ticks = 0;
    this.over = false;
    this.winner = null;
    this.log = []; // recent events for the spectacle feed
  }

  occupied(x, y) {
    if (this.walls.has(key(x, y))) return true;
    return this.critters.some((c) => c.alive && c.x === x && c.y === y);
  }
  freeCell() {
    for (let tries = 0; tries < 500; tries++) {
      const x = 1 + Math.floor(this.rng() * (this.size - 2));
      const y = 1 + Math.floor(this.rng() * (this.size - 2));
      if (!this.occupied(x, y) && !this.berries?.has?.(key(x, y))) return { x, y };
    }
    return { x: 1, y: 1 };
  }
  passable(x, y) { return x >= 0 && y >= 0 && x < this.size && y < this.size && !this.walls.has(key(x, y)); }

  // BFS path-distance from every berry (full-range scent gradient).
  berryField() {
    const dist = new Map();
    const q = [];
    for (const b of this.berries) { dist.set(b, 0); const [x, y] = b.split(",").map(Number); q.push([x, y]); }
    let h = 0;
    while (h < q.length) {
      const [x, y] = q[h++];
      const d = dist.get(key(x, y));
      for (const dd of CARD) {
        const nx = x + DIRS[dd].x, ny = y + DIRS[dd].y;
        if (!this.passable(nx, ny)) continue;
        const k = key(nx, ny);
        if (dist.has(k)) continue;
        dist.set(k, d + 1); q.push([nx, ny]);
      }
    }
    return dist;
  }

  sensorsFor(c, field) {
    // nearest berry
    let bx = null, by = null, bd = Infinity;
    for (const b of this.berries) {
      const [x, y] = b.split(",").map(Number);
      const d = Math.abs(x - c.x) + Math.abs(y - c.y);
      if (d < bd) { bd = d; bx = x; by = y; }
    }
    const scent = {}, danger = {}, safe = {};
    for (const d of CARD) {
      const nx = c.x + DIRS[d].x, ny = c.y + DIRS[d].y;
      const dd = field.get(key(nx, ny));
      scent[d] = dd === undefined ? 0 : 1 / (1 + dd);
      const blocked = !this.passable(nx, ny);
      danger[d] = blocked; safe[d] = !blocked;
    }

    const rivals = this.critters
      .filter((o) => o.alive && o.id !== c.id)
      .map((o) => ({ dx: o.x - c.x, dy: o.y - c.y, dist: Math.abs(o.x - c.x) + Math.abs(o.y - c.y), size: o.size, bigger: o.size > c.size }))
      .sort((a, b) => a.dist - b.dist);

    // flee the nearest BIGGER rival (fallback: nearest rival).
    const threat = rivals.find((r) => r.bigger) || rivals[0];
    let fleeDir = "stay";
    if (threat) {
      let best = -Infinity;
      for (const d of CARD) {
        if (!safe[d]) continue;
        const nx = c.x + DIRS[d].x, ny = c.y + DIRS[d].y;
        const score = Math.abs((c.x + threat.dx) - nx) + Math.abs((c.y + threat.dy) - ny) + 0.01 * scent[d];
        if (score > best) { best = score; fleeDir = d; }
      }
    }

    return {
      pos: [c.x, c.y], size: c.size,
      food_dx: bx === null ? 0 : bx - c.x,
      food_dy: by === null ? 0 : by - c.y,
      food_dist: bx === null ? 0 : bd,
      scent, danger, safe, rivals, flee_dir: fleeDir, memory: c.memory,
    };
  }

  step() {
    if (this.over) return;
    const field = this.berryField();
    const alive = this.critters.filter((c) => c.alive);

    // 1) gather intended targets
    const intents = new Map();
    for (const c of alive) {
      c.px = c.x; c.py = c.y;
      let a = "stay";
      try { a = c.fn(this.sensorsFor(c, field)) || "stay"; } catch { a = "stay"; }
      if (!DIRS[a]) a = "stay";
      const nx = c.x + DIRS[a].x, ny = c.y + DIRS[a].y;
      intents.set(c.id, this.passable(nx, ny) ? { x: nx, y: ny } : { x: c.x, y: c.y });
    }

    // 2) berry pickups (bigger wins a contested berry)
    const wantBerry = new Map(); // berryKey -> critter
    for (const c of alive) {
      const t = intents.get(c.id);
      const bk = key(t.x, t.y);
      if (this.berries.has(bk)) {
        const cur = wantBerry.get(bk);
        if (!cur || c.size > cur.size) wantBerry.set(bk, c);
      }
    }
    for (const [bk, c] of wantBerry) { this.berries.delete(bk); c.size += 1; c.berries += 1; }

    // 3) move everyone
    for (const c of alive) { const t = intents.get(c.id); c.x = t.x; c.y = t.y; }

    // 4) combat: group by final tile; largest eats the rest (tie = all bounce)
    const byTile = new Map();
    for (const c of alive) { const k = key(c.x, c.y); (byTile.get(k) || byTile.set(k, []).get(k)).push(c); }
    for (const [, group] of byTile) {
      if (group.length < 2) continue;
      const maxSize = Math.max(...group.map((g) => g.size));
      const top = group.filter((g) => g.size === maxSize);
      if (top.length > 1) {
        for (const g of group) { g.x = g.px; g.y = g.py; } // stalemate: bounce back
        continue;
      }
      const winner = top[0];
      for (const g of group) {
        if (g === winner) continue;
        winner.size += g.size; winner.kills += 1;
        g.alive = false;
        this.log.push({ tick: this.ticks, type: "eat", who: winner.name, whom: g.name });
      }
    }

    // 4b) lunge: a strictly-bigger critter eats an orthogonally adjacent smaller
    // one. This is what makes combat real — flee must keep distance >= 2, and
    // hunting a smaller rival actually pays off.
    for (const c of this.critters.filter((c) => c.alive).sort((a, b) => b.size - a.size)) {
      if (!c.alive) continue;
      for (const d of CARD) {
        const nx = c.x + DIRS[d].x, ny = c.y + DIRS[d].y;
        const victim = this.critters.find((o) => o.alive && o.id !== c.id && o.x === nx && o.y === ny && o.size < c.size);
        if (victim) {
          c.size += victim.size; c.kills += 1; victim.alive = false;
          this.log.push({ tick: this.ticks, type: "lunge", who: c.name, whom: victim.name });
        }
      }
    }

    // 5) respawn berries to keep forage live
    while (this.berries.size < this.berryCount) {
      const p = this.freeCell();
      this.berries.add(key(p.x, p.y));
    }

    this.ticks += 1;
    this.checkEnd();
  }

  checkEnd() {
    const alive = this.critters.filter((c) => c.alive);
    if (alive.length <= 1) {
      this.over = true;
      this.winner = alive[0] || null;
      return;
    }
    if (this.ticks >= this.ticksLimit) {
      this.over = true;
      this.winner = [...alive].sort((a, b) => b.size - a.size || b.berries - a.berries)[0];
    }
  }

  run() { while (!this.over) this.step(); return this.result(); }
  result() {
    return {
      winner: this.winner ? this.winner.name : "draw",
      ticks: this.ticks,
      standings: [...this.critters]
        .sort((a, b) => (b.alive - a.alive) || (b.size - a.size) || (b.berries - a.berries))
        .map((c) => ({ name: c.name, size: c.size, berries: c.berries, kills: c.kills, alive: c.alive })),
    };
  }
}
