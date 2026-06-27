// tower-engine.js — Tower Logic: a coded-turret lane defense (PvZ-style).
// Enemies march left toward the house (col 0). Each tick, every turret runs the
// player's decide(t) and returns ONE action. Core balance rule: fire() does a
// FIXED damage and costs FIXED energy — the player's code only chooses what to
// target and when. Magnitudes are designer constants, so code can't be "OP".

import { mulberry32 } from "./engine.js";

export const ENEMY_TYPES = {
  walker: { hp: 3, moveEvery: 2, flying: false },
  brute: { hp: 9, moveEvery: 3, flying: false },
  sprinter: { hp: 2, moveEvery: 1, flying: false },
  cyclops: { hp: 40, moveEvery: 4, flying: false }, // boss: slow, huge HP (for later worlds)
};

export class Tower {
  constructor(level, seed) {
    this.level = level;
    this.rng = mulberry32((seed ?? 1) >>> 0);
    this.rows = level.rows;
    this.cols = level.cols;
    this.range = level.range;
    this.damage = level.damage;
    this.fireCost = level.fireCost ?? 1;
    this.regenEvery = level.regenEvery ?? 3;
    this.energy = level.energyStart ?? 999;
    this.lives = level.lives ?? 3;
    this.leaks = 0;

    this.turrets = level.turrets.map((p, i) => ({ id: i, row: p.row, col: p.col, memory: {} }));
    this.schedule = level.waves(this.rng).slice().sort((a, b) => a.tick - b.tick);
    this.spawned = 0;
    this.enemies = [];
    this.nextId = 1;

    this.tick = 0;
    this.status = "playing"; // playing | won | lost
    this.reason = "";
    this.shots = []; // {row, from, to} for the viewer
  }

  // Sensor dict for one turret: only enemies ahead of it in its own lane.
  sensorsFor(t) {
    const list = this.enemies
      .filter((e) => e.row === t.row && e.col > t.col)
      .map((e) => ({ id: e.id, row: e.row, col: e.col, dist: e.col - t.col, hp: e.hp, speed: e.moveEvery, type: e.type, flying: e.flying }))
      .sort((a, b) => a.dist - b.dist);
    return { row: t.row, col: t.col, range: this.range, energy: this.energy, ready: true, enemies: list, memory: t.memory };
  }

  step(decide) {
    if (this.status !== "playing") return;

    // 1) spawn anything due
    while (this.spawned < this.schedule.length && this.schedule[this.spawned].tick <= this.tick) {
      const s = this.schedule[this.spawned++];
      const td = ENEMY_TYPES[s.type];
      this.enemies.push({ id: this.nextId++, row: s.row, col: this.cols - 1, pcol: this.cols - 1, hp: td.hp, maxhp: td.hp, type: s.type, moveEvery: td.moveEvery, flying: td.flying, mc: td.moveEvery });
    }

    // 2) every turret fires (one action each); fire costs energy even if it misses
    this.shots = [];
    for (const t of this.turrets) {
      let action;
      try { action = decide(this.sensorsFor(t)); } catch { action = { a: "hold" }; }
      if (!action || action.a !== "fire" || action.id == null) continue;
      if (this.energy < this.fireCost) continue; // out of energy → trigger clicks empty
      this.energy -= this.fireCost;
      const e = this.enemies.find((x) => x.id === action.id);
      if (e && e.row === t.row) {
        const dist = e.col - t.col;
        if (dist > 0 && dist <= this.range) {
          e.hp -= this.damage;
          this.shots.push({ row: t.row, from: t.col, to: e.col });
          if (e.hp <= 0) this.enemies = this.enemies.filter((x) => x !== e);
        }
      }
    }

    // 3) enemies advance
    for (const e of this.enemies) { e.pcol = e.col; e.mc--; if (e.mc <= 0) { e.col -= 1; e.mc = e.moveEvery; } }

    // 4) leaks (reached the house)
    const reached = this.enemies.filter((e) => e.col <= 0);
    if (reached.length) { this.leaks += reached.length; this.enemies = this.enemies.filter((e) => e.col > 0); }

    // 5) energy regen
    this.tick++;
    if (this.tick % this.regenEvery === 0) this.energy += 1;

    // 6) resolve
    if (this.leaks >= this.lives) { this.status = "lost"; this.reason = `${this.leaks} got through.`; return; }
    if (this.spawned >= this.schedule.length && this.enemies.length === 0) { this.status = "won"; this.reason = "Wave cleared!"; return; }
    if (this.tick > 3000) { this.status = this.leaks < this.lives ? "won" : "lost"; }
  }

  run(decide) { while (this.status === "playing") this.step(decide); return this.status === "won"; }
}
