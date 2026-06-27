// engine.js — the persistent Critter Forge world.
// Sensors are plain dicts (so the player writes s["food_dx"], iterates
// s["predators"], and reads/writes s["memory"]). The same world powers both
// command mode (look()/step()) and reflex mode (decide(sensors) per tick).

export const ACTIONS = ["up", "down", "left", "right", "wait", "stay"];

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  wait: { x: 0, y: 0 },
  stay: { x: 0, y: 0 },
};
const CARDINAL = ["up", "down", "left", "right"];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const key = (x, y) => `${x},${y}`;

export class World {
  // setup(rng) -> { size, critter:{x,y}, foods:[{x,y}], walls:[[x,y]],
  //   lava:[[x,y]], predators:[{x,y,speed}], budget, scentRadius? }
  constructor(setup, seed) {
    this.seed = seed >>> 0;
    const rng = mulberry32(this.seed);
    const s = setup(rng);

    this.size = s.size;
    this.budget = s.budget;
    this.survive = !!s.survive; // win by lasting the whole budget, not by eating
    this.scentRadius = s.scentRadius ?? Infinity;
    this.critter = { x: s.critter.x, y: s.critter.y };
    this.prevCritter = { ...this.critter };
    this.foods = s.foods.map((f) => ({ ...f }));
    this.totalFood = this.foods.length;
    this.walls = new Set((s.walls || []).map(([x, y]) => key(x, y)));
    this.lava = new Set((s.lava || []).map(([x, y]) => key(x, y)));
    this.predators = (s.predators || []).map((p) => ({
      x: p.x, y: p.y, px: p.x, py: p.y, speed: p.speed || 2,
    }));

    this.ticks = 0;
    this.eaten = 0;
    this.status = "playing"; // playing | won | lost
    this.reason = "";
  }

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.size && y < this.size; }
  isWall(x, y) { return this.walls.has(key(x, y)); }
  isLava(x, y) { return this.lava.has(key(x, y)); }
  hasPredator(x, y) { return this.predators.some((p) => p.x === x && p.y === y); }
  passable(x, y) { return this.inBounds(x, y) && !this.isWall(x, y); }

  nearestFood() {
    let best = null, bestD = Infinity;
    for (const f of this.foods) {
      const d = Math.hypot(f.x - this.critter.x, f.y - this.critter.y);
      if (d < bestD) { bestD = d; best = f; }
    }
    return best;
  }

  nearestPredator() {
    let best = null, bestD = Infinity;
    for (const p of this.predators) {
      const d = Math.abs(p.x - this.critter.x) + Math.abs(p.y - this.critter.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best ? { p: best, d: bestD } : null;
  }

  // BFS path-distance from every food, flowing around walls/lava. Scent beyond
  // scentRadius reads as 0 (no signal) — that's what forces exploration+memory.
  foodDistField() {
    const dist = new Map();
    const q = [];
    for (const f of this.foods) { dist.set(key(f.x, f.y), 0); q.push([f.x, f.y]); }
    let head = 0;
    const steps = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    while (head < q.length) {
      const [x, y] = q[head++];
      const d = dist.get(key(x, y));
      for (const [dx, dy] of steps) {
        const nx = x + dx, ny = y + dy;
        if (!this.passable(nx, ny) || this.isLava(nx, ny)) continue;
        const k = key(nx, ny);
        if (dist.has(k)) continue;
        dist.set(k, d + 1);
        q.push([nx, ny]);
      }
    }
    return dist;
  }

  sense() {
    const c = this.critter;
    const food = this.nearestFood();
    const field = this.foodDistField();

    const scent = {}, safe = {}, danger = {};
    for (const d of CARDINAL) {
      const nx = c.x + DIRS[d].x, ny = c.y + DIRS[d].y;
      const blocked = !this.inBounds(nx, ny) || this.isWall(nx, ny)
        || this.isLava(nx, ny) || this.hasPredator(nx, ny);
      danger[d] = blocked;
      safe[d] = !blocked;
      const dd = field.get(`${nx},${ny}`);
      scent[d] = dd === undefined || dd > this.scentRadius ? 0 : 1 / (1 + dd);
    }

    // flee_dir: safe neighbor maximizing distance to nearest predator (scent tiebreak).
    let fleeDir = "stay";
    const np = this.nearestPredator();
    if (np) {
      let bestScore = -Infinity;
      for (const d of CARDINAL) {
        if (!safe[d]) continue;
        const nx = c.x + DIRS[d].x, ny = c.y + DIRS[d].y;
        const score = Math.abs(np.p.x - nx) + Math.abs(np.p.y - ny) + 0.01 * scent[d];
        if (score > bestScore) { bestScore = score; fleeDir = d; }
      }
    }

    const predators = this.predators.map((p) => ({
      dx: p.x - c.x, dy: p.y - c.y,
      dist: Math.abs(p.x - c.x) + Math.abs(p.y - c.y),
    })).sort((a, b) => a.dist - b.dist);

    const foodDx = food ? food.x - c.x : 0;
    const foodDy = food ? food.y - c.y : 0;
    const foodDist = food ? Math.abs(foodDx) + Math.abs(foodDy) : 0;

    return {
      pos: [c.x, c.y],
      energy: this.budget - this.ticks,
      food_dx: foodDx,
      food_dy: foodDy,
      food_dist: foodDist,
      scent, safe, danger,
      predator_dx: predators.length ? predators[0].dx : null,
      predator_dy: predators.length ? predators[0].dy : null,
      predator_dist: predators.length ? predators[0].dist : null,
      predators,
      flee_dir: fleeDir,
      vector: [foodDx, foodDy, foodDist,
        predators.length ? predators[0].dist : 99,
        scent.up, scent.down, scent.left, scent.right],
    };
  }

  apply(action) {
    if (this.status !== "playing") return;
    if (action === "stay") action = "wait";
    if (!DIRS[action]) action = "wait";

    this.prevCritter = { ...this.critter };
    for (const p of this.predators) { p.px = p.x; p.py = p.y; }

    const nx = this.critter.x + DIRS[action].x;
    const ny = this.critter.y + DIRS[action].y;
    if (this.passable(nx, ny)) { this.critter.x = nx; this.critter.y = ny; }

    if (this.isLava(this.critter.x, this.critter.y)) {
      this.status = "lost"; this.reason = "Walked into lava."; return;
    }

    // Eat any food on this tile; win when every berry is eaten.
    const before = this.foods.length;
    this.foods = this.foods.filter((f) => !(f.x === this.critter.x && f.y === this.critter.y));
    if (this.foods.length < before) {
      this.eaten += before - this.foods.length;
      if (this.foods.length === 0) { this.status = "won"; this.reason = "Ate every berry."; return; }
    }

    this.ticks += 1;
    for (const p of this.predators) {
      if (this.ticks % p.speed !== 0) continue;
      this.stepPredator(p);
      if (p.x === this.critter.x && p.y === this.critter.y) {
        this.status = "lost"; this.reason = "Caught by a predator."; return;
      }
    }

    if (this.ticks >= this.budget) {
      if (this.survive) { this.status = "won"; this.reason = "Survived!"; }
      else { this.status = "lost"; this.reason = "Ran out of energy (out of time)."; }
    }
  }

  stepPredator(p) {
    const candidates = [];
    for (const d of CARDINAL) {
      const nx = p.x + DIRS[d].x, ny = p.y + DIRS[d].y;
      if (!this.passable(nx, ny) || this.isLava(nx, ny)) continue;
      candidates.push({
        x: nx, y: ny,
        d: Math.abs(nx - this.critter.x) + Math.abs(ny - this.critter.y),
      });
    }
    if (!candidates.length) return;
    candidates.sort((a, b) => a.d - b.d);
    p.x = candidates[0].x; p.y = candidates[0].y;
  }
}
