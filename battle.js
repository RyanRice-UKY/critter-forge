// battle.js — the watchable battle arena. Pick four brains, press Fight, watch
// them forage and eat each other. JS bots for now; a player's Python decide()
// drops into the same Arena later.

import { Arena } from "./arena.js";
import { LADDER } from "./bots.js";

const WALLS = [[7, 4], [7, 5], [7, 6], [7, 8], [7, 9], [7, 10], [4, 7], [5, 7], [9, 7], [10, 7]];
const SLOT_COLORS = ["#4dabf7", "#ff6b6b", "#fab005", "#51cf66"];
const TICK_MS = 130;

const els = {};
let arena = null;
let timer = null;
let lastTick = 0;
let seed = 1;

function boot() {
  for (const id of ["slots", "fight", "sim", "scores", "winner", "feed", "simout", "arena"]) els[id] = document.getElementById(id);
  els.ctx = els.arena.getContext("2d");
  buildSlots();
  els.fight.onclick = startFight;
  els.sim.onclick = runSims;
  newArena();
  loop();
}

function buildSlots() {
  // default lineup: Champion (you), Hunter, Greedy, Coward
  const defaults = ["Champion", "Hunter", "Greedy", "Coward"];
  els.slots.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const row = document.createElement("div");
    row.className = "slot";
    const sw = document.createElement("span");
    sw.className = "swatch"; sw.style.background = SLOT_COLORS[i];
    const sel = document.createElement("select");
    sel.dataset.slot = i;
    for (const b of LADDER) {
      const o = document.createElement("option");
      o.value = b.name; o.textContent = b.name;
      if (b.name === defaults[i]) o.selected = true;
      sel.appendChild(o);
    }
    row.append(sw, sel);
    els.slots.appendChild(row);
  }
}

function chosenBrains() {
  return [...els.slots.querySelectorAll("select")].map((sel, i) => {
    const b = LADDER.find((x) => x.name === sel.value);
    return { name: `${i + 1}·${b.name}`, fn: b.fn, color: SLOT_COLORS[i] };
  });
}

function newArena() {
  stop();
  arena = new Arena({ size: 15, walls: WALLS, berryCount: 5, ticks: 220, brains: chosenBrains(), seed });
  els.winner.textContent = "";
  els.feed.innerHTML = "";
  render(0);
  renderScores();
}

function startFight() {
  seed++;
  newArena();
  lastTick = performance.now();
  timer = setInterval(tick, TICK_MS);
}
function stop() { if (timer) clearInterval(timer); timer = null; }

function tick() {
  if (!arena || arena.over) return;
  arena.step();
  lastTick = performance.now();
  renderScores();
  renderFeed();
  if (arena.over) {
    stop();
    const r = arena.result();
    els.winner.textContent = r.winner === "draw" ? "Draw." : `🏆 ${displayName(r.winner)} wins!`;
  }
}

function displayName(name) {
  const c = arena.critters.find((c) => c.name === name);
  return c ? c.name : name;
}

function loop() {
  function frame(now) {
    const t = Math.min(1, (now - lastTick) / TICK_MS);
    render(timer ? t : 0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function render(t) {
  if (!arena) return;
  const ctx = els.ctx, S = els.arena.width, n = arena.size, cell = S / n;
  ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = "#161d27";
  for (let i = 0; i <= n; i++) {
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, S);
    ctx.moveTo(0, i * cell); ctx.lineTo(S, i * cell); ctx.stroke();
  }
  for (const w of arena.walls) {
    const [x, y] = w.split(",").map(Number);
    ctx.fillStyle = "#2b3340"; ctx.fillRect(x * cell, y * cell, cell, cell);
  }
  for (const b of arena.berries) {
    const [x, y] = b.split(",").map(Number);
    ctx.fillStyle = "#e64980";
    circle(ctx, (x + 0.5) * cell, (y + 0.5) * cell, cell * 0.22);
  }
  for (const c of arena.critters) {
    if (!c.alive) continue;
    const x = c.px + (c.x - c.px) * t, y = c.py + (c.y - c.py) * t;
    const r = cell * (0.22 + 0.03 * Math.min(8, c.size - 1));
    ctx.fillStyle = c.color;
    circle(ctx, (x + 0.5) * cell, (y + 0.5) * cell, r);
    ctx.fillStyle = "#0b1220";
    circle(ctx, (x + 0.5) * cell - r * 0.3, (y + 0.5) * cell - r * 0.15, r * 0.16);
    circle(ctx, (x + 0.5) * cell + r * 0.3, (y + 0.5) * cell - r * 0.15, r * 0.16);
    ctx.fillStyle = "#e6edf3"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(String(c.size), (x + 0.5) * cell, (y + 0.5) * cell - r - 3);
  }
}
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

function renderScores() {
  const rows = [...arena.critters].sort((a, b) => (b.alive - a.alive) || (b.size - a.size));
  els.scores.innerHTML = rows.map((c) => `
    <div class="scorerow ${c.alive ? "" : "dead"}">
      <span class="sw" style="background:${c.color}"></span>
      <span>${c.name}</span>
      <span class="sz">size ${c.size}</span>
      <span class="kl">${c.kills} kills</span>
    </div>`).join("");
}

function renderFeed() {
  els.feed.innerHTML = arena.log.slice(-8).reverse().map((e) =>
    `<div>t${e.tick}: <b>${e.who}</b> ${e.type === "lunge" ? "lunged and ate" : "ate"} ${e.whom}</div>`).join("");
}

function runSims() {
  els.simout.textContent = "running…";
  setTimeout(() => {
    const brains = chosenBrains();
    const wins = {}; brains.forEach((b) => (wins[b.name] = 0));
    let kills = 0, draws = 0, N = 200;
    for (let i = 0; i < N; i++) {
      const a = new Arena({ size: 15, walls: WALLS, berryCount: 5, ticks: 220, brains, seed: i * 7 + 1 });
      const r = a.run();
      if (r.winner === "draw") draws++; else wins[r.winner]++;
      for (const s of r.standings) kills += s.kills;
    }
    const sorted = brains.map((b) => ({ name: b.name, w: wins[b.name] })).sort((a, b) => b.w - a.w);
    els.simout.innerHTML = sorted.map((s) => `<div><b>${s.name}</b> — ${(100 * s.w / N).toFixed(0)}% (${s.w})</div>`).join("")
      + `<div style="margin-top:6px">${(kills / N).toFixed(2)} kills/match${draws ? `, ${draws} draws` : ""}</div>`;
  }, 20);
}

boot();
