// tower-game.js — Tower Logic controller: real CPython (Pyodide) runs the
// player's decide(t) for every turret each tick; the engine renders the lanes
// and grades on held-out seeds.

import { Tower, ENEMY_TYPES } from "./tower-engine.js";
import { TOWER_LEVELS, TOWER_TOPICS } from "./tower-levels.js";
import { drawPixelEnemy, PIXEL_PALETTE } from "./enemy-art.js";

const HARNESS = `
import json

def fire(e):
    return {"a": "fire", "id": (e["id"] if e is not None else None)}
def hold():
    return {"a": "hold"}
def nearest(t):
    es = t["enemies"]
    return es[0] if es else None

_ns = {}
def load_user_code(src):
    global _ns
    _ns = {"fire": fire, "hold": hold, "nearest": nearest}
    exec(src, _ns)
    if "decide" not in _ns or not callable(_ns["decide"]):
        raise NameError("Your code needs a function named 'decide'.")

def run_turret(payload):
    t = json.loads(payload)
    act = _ns["decide"](t)
    if not isinstance(act, dict):
        raise ValueError("decide() must return fire(...) or hold(), not " + repr(act))
    return json.dumps({"a": act.get("a", "hold"), "id": act.get("id")})
`;

let pyodide = null, loadUserCode = null, runTurret = null;
let editor = null, level = TOWER_LEVELS[0], game = null, timer = null, lastTick = 0;
const TICK_MS = 150;
const SIZE_MUL = { walker: 0.32, brute: 0.42, sprinter: 0.26, cyclops: 0.5 };
const fx = { flash: new Map(), particles: [], lastDraw: performance.now() };
const els = {};

function cellSize() { return { cw: els.arena.width / game.cols, ch: els.arena.height / game.rows }; }
function spawnParticles(col, row, color, n, spread) {
  const { cw, ch } = cellSize();
  const x = (col + 0.5) * cw, y = (row + 0.5) * ch;
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * spread; fx.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0.4 + Math.random() * 0.3, maxlife: 0.7, color, size: 2 + Math.random() * 2 }); }
}
// Compare enemies before/after a tick to drive hit flashes + death debris.
function processFx(before) {
  for (const e of game.enemies) { const b = before.get(e.id); if (b && e.hp < b.hp) { fx.flash.set(e.id, performance.now()); spawnParticles(e.col, e.row, "#ffd43b", 4, 70); } }
  for (const [id, b] of before) { if (!game.enemies.some((e) => e.id === id) && b.col > 1) spawnParticles(b.col, b.row, PIXEL_PALETTE[b.type] || "#f08c00", 12, 120); }
}

async function boot() {
  for (const id of ["tabs", "levelName", "concept", "blurb", "run", "reset", "status", "grade", "arena", "energy", "lives", "wave"]) els[id] = document.getElementById(id);
  els.ctx = els.arena.getContext("2d");
  buildTabs();
  editor = CodeMirror(document.getElementById("editor"), { value: "", mode: "python", theme: "material-darker", lineNumbers: true, indentUnit: 4, tabSize: 4 });
  els.run.onclick = run;
  els.reset.onclick = () => { editor.setValue(level.starter); resetGame(); };
  setStatus("Loading Python (Pyodide)…", "muted");
  pyodide = await loadPyodide();
  await pyodide.runPythonAsync(HARNESS);
  loadUserCode = pyodide.globals.get("load_user_code");
  runTurret = pyodide.globals.get("run_turret");
  selectLevel(0);
  setStatus("Ready. Edit decide(), then press Defend.", "ok");
  els.run.disabled = false;
  loop();
}

function buildTabs() {
  els.tabs.innerHTML = "";
  TOWER_TOPICS.forEach((topic, ti) => {
    const group = document.createElement("div");
    group.className = "tabgroup";
    const label = document.createElement("div");
    label.className = "tabgroup-label";
    label.textContent = `${ti + 1}. ${topic.label}`;
    group.appendChild(label);
    const row = document.createElement("div");
    row.className = "tabrow";
    TOWER_LEVELS.forEach((lv, i) => {
      if (lv.topic !== topic.key) return;
      const b = document.createElement("button");
      b.className = "tab"; b.dataset.index = i; b.textContent = lv.id; b.title = lv.name;
      b.onclick = () => selectLevel(i);
      row.appendChild(b);
    });
    group.appendChild(row);
    els.tabs.appendChild(group);
  });
}

function selectLevel(i) {
  level = TOWER_LEVELS[i];
  els.tabs.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", Number(b.dataset.index) === i));
  els.levelName.textContent = `${level.id} — ${level.name}`;
  els.concept.textContent = level.concept;
  els.blurb.textContent = level.blurb;
  els.grade.innerHTML = "";
  editor.setValue(level.starter);
  resetGame();
  setStatus("Ready. Edit decide(), then press Defend.", "ok");
}

function resetGame(seed = 1) { stop(); game = new Tower(level, seed); draw(0); updateHud(); }
function setStatus(m, k = "muted") { els.status.textContent = m; els.status.className = `status ${k}`; }
function stop() { if (timer) clearInterval(timer); timer = null; }

// Bridge: every turret's decide() goes through Pyodide.
function jsDecide(t) {
  try { return JSON.parse(runTurret(JSON.stringify(t))); }
  catch (e) { throw e; }
}

function run() {
  if (!pyodide) return;
  els.grade.innerHTML = "";
  try { loadUserCode(editor.getValue()); }
  catch (e) { setStatus(translateError(e), "err"); return; }
  resetGame(1);
  setStatus("Defending…", "muted");
  lastTick = performance.now();
  timer = setInterval(() => {
    if (!game || game.status !== "playing") return;
    const before = new Map(game.enemies.map((e) => [e.id, { hp: e.hp, col: e.col, row: e.row, type: e.type }]));
    try { game.step(jsDecide); }
    catch (e) { stop(); setStatus(translateError(e), "err"); return; }
    processFx(before);
    lastTick = performance.now();
    updateHud();
    if (game.status !== "playing") { stop(); onEnd(); }
  }, TICK_MS);
}

async function onEnd() {
  if (game.status === "won") {
    if (level.randomize) { setStatus("Held! Checking held-out waves…", "ok"); await grade(); }
    else { setStatus("Level cleared! 🎉", "ok"); els.grade.innerHTML = pill("Cleared", "ok"); }
  } else {
    setStatus(`Breached: ${game.reason}`, "err");
    els.grade.innerHTML = `<div class="hintbox"><strong>${game.reason}</strong> Try firing only at in-range enemies (check <code>e["dist"] &lt;= t["range"]</code>) so you don't waste energy.</div>`;
  }
}

async function grade() {
  const seeds = [101, 202, 303, 404, 505, 606, 707, 808];
  const src = editor.getValue();
  let wins = 0;
  for (const s of seeds) if (playHeadless(s, src)) wins++;
  const need = Math.ceil((level.passThreshold || 0.75) * seeds.length);
  if (wins >= need) {
    els.grade.innerHTML = pill(`Held ${wins}/${seeds.length} waves`, "ok") + pill("Concept mastered", "ok");
    setStatus("Cleared and verified! 🎉", "ok");
  } else {
    els.grade.innerHTML = pill(`Only ${wins}/${seeds.length} waves`, "err") + `<div class="hintbox">You held the wave you watched but not fresh ones — make decide() robust to any timing/lane.</div>`;
    setStatus("Works here, fails elsewhere.", "err");
  }
}

function playHeadless(seed, src) {
  try { loadUserCode(src); } catch { return false; }
  const g = new Tower(level, seed);
  let guard = 0;
  while (g.status === "playing" && guard++ < 5000) {
    try { g.step(jsDecide); } catch { return false; }
  }
  return g.status === "won";
}

function updateHud() {
  els.energy.textContent = game.energy;
  els.lives.textContent = Math.max(0, game.lives - game.leaks);
  els.wave.textContent = `${game.spawned - game.enemies.length}/${game.schedule.length}`;
}

function translateError(e) {
  const msg = String(e.message || e);
  const k = msg.match(/KeyError: ['"](\w+)['"]/);
  if (k) return `That key '${k[1]}' doesn't exist on t. Try t["enemies"], t["range"], or e["dist"].`;
  if (msg.match(/name '(\w+)' is not defined/)) return msg.match(/name '(\w+)' is not defined/)[0] + " — available: fire(), hold(), nearest(t).";
  if (msg.includes("IndexError")) return "IndexError: t['enemies'] can be empty — check `if t['enemies']:` first.";
  if (msg.includes("SyntaxError")) return "SyntaxError: check colons and parentheses.";
  return msg.trim().split("\n").pop();
}

const pill = (t, k) => `<span class="pill ${k}">${t}</span>`;

// --- render ---
function loop() { requestAnimationFrame(function f(now) { draw(timer ? Math.min(1, (now - lastTick) / TICK_MS) : 0); requestAnimationFrame(f); }); }

function draw(t) {
  if (!game) return;
  const ctx = els.ctx, Wd = els.arena.width, Ht = els.arena.height;
  const cols = game.cols, rows = game.rows;
  const cw = Wd / cols, ch = Ht / rows;
  ctx.clearRect(0, 0, Wd, Ht);
  ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, Wd, Ht);

  // lanes + house strip
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = r % 2 ? "#0e141c" : "#0c1118";
    ctx.fillRect(0, r * ch, Wd, ch);
  }
  ctx.fillStyle = "#13202e"; ctx.fillRect(0, 0, cw, Ht); // the house column
  ctx.strokeStyle = "#1b2430";
  for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(Wd, r * ch); ctx.stroke(); }

  // shots (flash)
  ctx.strokeStyle = "#ffd43b"; ctx.lineWidth = 2;
  for (const s of game.shots) {
    const y = (s.row + 0.5) * ch;
    ctx.beginPath(); ctx.moveTo((s.from + 0.5) * cw, y); ctx.lineTo((s.to + 0.5) * cw, y); ctx.stroke();
  }
  ctx.lineWidth = 1;

  // turrets
  for (const tr of game.turrets) {
    const x = (tr.col + 0.5) * cw, y = (tr.row + 0.5) * ch;
    ctx.fillStyle = "#4dabf7";
    ctx.fillRect(x - cw * 0.28, y - ch * 0.22, cw * 0.56, ch * 0.44);
    ctx.fillStyle = "#0b1220"; ctx.fillRect(x + cw * 0.1, y - 3, cw * 0.3, 6); // barrel
  }

  // enemies — pixel sprites with hit flash + hp bar
  const now = performance.now();
  for (const e of game.enemies) {
    const cx = (lerp(e.pcol ?? e.col, e.col, t) + 0.5) * cw, cy = (e.row + 0.5) * ch;
    const size = Math.min(cw, ch) * (SIZE_MUL[e.type] || 0.3);
    const ts = fx.flash.get(e.id);
    const hit = ts ? Math.max(0, 1 - (now - ts) / 240) : 0;
    drawPixelEnemy(ctx, cx, cy, size, e.type, now / 1000, hit, e.id * 1.3);
    const w = size * 2, frac = Math.max(0, e.hp / e.maxhp);
    ctx.fillStyle = "#2b0f0f"; ctx.fillRect(cx - size, cy - size - 8, w, 4);
    ctx.fillStyle = "#51cf66"; ctx.fillRect(cx - size, cy - size - 8, w * frac, 4);
  }

  // particles (sparks + death debris)
  const dt = Math.min(0.05, (now - fx.lastDraw) / 1000); fx.lastDraw = now;
  for (const p of fx.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt; p.life -= dt; ctx.globalAlpha = Math.max(0, p.life / p.maxlife); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); }
  ctx.globalAlpha = 1;
  fx.particles = fx.particles.filter((p) => p.life > 0);
}
const lerp = (a, b, t) => a + (b - a) * t;

boot();
