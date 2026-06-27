// game.js — orchestration: real CPython (Pyodide) runs the player's code in one
// of two modes, the engine renders the critter, held-out seeds grade for
// understanding, and the critter GROWS a stage every level it clears.
//
//  - "script"   (early Act 1): the player gives orders with critter.step(dir, n)
//               and look(). Their code drives the world directly. Teaches
//               function calls + arguments before the reactive loop exists.
//  - "reactive" (Act 1.3+):    the player writes decide(sensors); the engine
//               calls it every tick. This is the sense -> decide -> act loop
//               that carries all the way to the Act 4 policy network.

import { World } from "./engine.js";
import { LEVELS, TOPICS } from "./levels.js";

// Growth spine for Act 1: clearing a whole topic (5 levels) advances one stage.
const GROWTH = [
  { name: "Egg", unlock: "can't move", concept: "—" },
  { name: "Hatchling", unlock: "step() and look()", concept: "function calls + arguments" },
  { name: "Nibbler", unlock: "reads exact distances", concept: "variables + arithmetic" },
  { name: "Forager", unlock: "good vs. bad tiles", concept: "if / elif / else, and / or" },
  { name: "Skittish", unlock: "senses moving predators", concept: "per-tick decide(), booleans" },
  { name: "Scout", unlock: "full 4-way scent + danger", concept: "for loops, range" },
  { name: "Tracker", unlock: "remembers past ticks", concept: "while, state, break / continue" },
  { name: "Hunter", unlock: "full composed brain", concept: "functions, parameters, return" },
];

// --- Python harness. Sensors are plain dicts; decide(s) reads/writes s["memory"]
//     which persists across ticks within one run. ---
const HARNESS = `
import json
from js import _cf_step, _cf_sense

ACTIONS = ["up", "down", "left", "right", "wait", "stay"]

# --- reactive mode: the player defines decide(sensors) ---
_ns = {}
_memory = {}

def load_user_code(src):
    global _ns
    _ns = {}
    exec(src, _ns)
    if "decide" not in _ns or not callable(_ns["decide"]):
        raise NameError("Your code needs a function named 'decide'.")

def reset_memory():
    global _memory
    _memory = {}

def run_decide(payload):
    s = json.loads(payload)
    s["memory"] = _memory          # same dict every tick -> persistent state
    action = _ns["decide"](s)
    if action not in ACTIONS:
        raise ValueError("decide() must return one of " + str(ACTIONS) + ", but returned: " + repr(action))
    return action

# --- command mode: the player gives orders via critter.step() / look() ---
class _Critter:
    def step(self, direction, num_steps=1):
        if direction not in ACTIONS:
            raise ValueError("step() direction must be one of " + str(ACTIONS) + ", got: " + repr(direction))
        for _ in range(int(num_steps)):
            res = json.loads(_cf_step(direction))
            if res["status"] != "playing":
                break
    def look(self):
        return json.loads(_cf_sense())
    def wait(self, num_steps=1):
        self.step("wait", num_steps)

critter = _Critter()

def look():
    return json.loads(_cf_sense())

def run_script(src):
    exec(src, {"critter": critter, "look": look})
`;

let pyodide = null;
let loadUserCode = null;
let runDecide = null;
let runScript = null;
let resetMemory = null;

let editor = null;
let level = LEVELS[0];
let world = null; // the world currently being rendered
let timer = null;
let lastTickAt = 0;
const TICK_MS = 170;

// Bridge target for script mode: critter.step()/look() act on this world.
let activeWorld = null;
let recordedActions = [];

// Player progress / growth.
const state = { cleared: loadCleared() };

const els = {};

async function boot() {
  cache();
  // Expose the engine to Python (script mode) BEFORE the harness imports them.
  globalThis._cf_step = cfStep;
  globalThis._cf_sense = cfSense;

  buildLevelTabs();
  setupEditor();
  bindButtons();
  renderGrowth();
  setStatus("Loading Python (Pyodide)…", "muted");
  pyodide = await loadPyodide();
  await pyodide.runPythonAsync(HARNESS);
  loadUserCode = pyodide.globals.get("load_user_code");
  runDecide = pyodide.globals.get("run_decide");
  runScript = pyodide.globals.get("run_script");
  resetMemory = pyodide.globals.get("reset_memory");
  selectLevel(0);
  setStatus("Ready. Edit the code, then press Run.", "ok");
  els.run.disabled = false;
  startRenderLoop();
}

// --- Pyodide <-> engine bridge (script mode) ---
function cfStep(action) {
  const w = activeWorld;
  if (!w || w.status !== "playing") return JSON.stringify({ status: w ? w.status : "lost" });
  if (recordedActions.length > 4000) throw new Error("Too many steps — is your loop endless?");
  w.apply(action);
  recordedActions.push(action);
  return JSON.stringify({ status: w.status });
}
function cfSense() {
  return JSON.stringify(activeWorld.sense());
}

function cache() {
  for (const id of [
    "status", "run", "reset", "canvas", "tabs", "concept", "blurb",
    "levelName", "growth", "grade", "toast", "modechip",
  ]) {
    els[id] = document.getElementById(id);
  }
  els.ctx = els.canvas.getContext("2d");
}

function buildLevelTabs() {
  els.tabs.innerHTML = "";
  TOPICS.forEach((topic, ti) => {
    const group = document.createElement("div");
    group.className = "tabgroup";
    const label = document.createElement("div");
    label.className = "tabgroup-label";
    label.textContent = `${ti + 1}. ${topic.label}`;
    group.appendChild(label);
    const row = document.createElement("div");
    row.className = "tabrow";
    LEVELS.forEach((lv, i) => {
      if (lv.topic !== topic.key) return;
      const b = document.createElement("button");
      b.className = "tab";
      b.dataset.index = i;
      b.textContent = lv.id;
      b.title = lv.name;
      b.onclick = () => selectLevel(i);
      row.appendChild(b);
    });
    group.appendChild(row);
    els.tabs.appendChild(group);
  });
}

function setupEditor() {
  editor = CodeMirror(document.getElementById("editor"), {
    value: "",
    mode: "python",
    theme: "material-darker",
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    autofocus: true,
  });
}

function bindButtons() {
  els.run.onclick = run;
  els.reset.onclick = () => {
    editor.setValue(level.starter);
    resetWorld(level.setup);
  };
}

function selectLevel(i) {
  level = LEVELS[i];
  els.tabs.querySelectorAll(".tab").forEach((b) =>
    b.classList.toggle("active", Number(b.dataset.index) === i)
  );
  els.levelName.textContent = `${level.id} — ${level.name}`;
  els.concept.textContent = level.concept;
  els.modechip.textContent = level.mode === "script" ? "command mode" : "reflex mode";
  els.blurb.textContent = level.blurb;
  els.grade.innerHTML = "";
  editor.setValue(level.starter);
  resetWorld(level.setup);
  setStatus("Ready. Edit the code, then press Run.", "ok");
}

function resetWorld(setup, seed = 1) {
  stopTimer();
  world = new World(setup, seed);
  draw(0);
}

function setStatus(msg, kind = "muted") {
  els.status.textContent = msg;
  els.status.className = `status ${kind}`;
}

// --- Run dispatch ---
function run() {
  if (!pyodide) return;
  els.grade.innerHTML = "";
  if (level.mode === "script") runScriptLevel();
  else runReactiveLevel();
}

// Reactive: load decide(), then tick the visible world calling it each step.
function runReactiveLevel() {
  try {
    loadUserCode(editor.getValue());
  } catch (e) {
    setStatus(translateError(e), "err");
    return;
  }
  resetWorld(level.setup, 1);
  resetMemory(); // fresh memory dict for this run
  setStatus("Running…", "muted");
  startTimer(() => runDecide(JSON.stringify(world.sense())));
}

// Script: run the player's orders once to record the action sequence, then
// replay it with animation. Re-runs on held-out seeds for grading.
function runScriptLevel() {
  const src = editor.getValue();
  let result;
  try {
    result = computeScript(level.setup, 1, src);
  } catch (e) {
    setStatus(translateError(e), "err");
    return;
  }
  setStatus("Running…", "muted");
  replayActions(level.setup, 1, result.actions);
}

// Execute the player's script against a fresh seeded world, capturing the
// exact action sequence it produced.
function computeScript(setup, seed, src) {
  const w = new World(setup, seed);
  activeWorld = w;
  recordedActions = [];
  runScript(src); // drives w via cfStep/cfSense
  const actions = recordedActions.slice();
  activeWorld = null;
  return { actions, status: w.status, reason: w.reason };
}

function startTimer(provider) {
  stopTimer();
  lastTickAt = performance.now();
  timer = setInterval(() => {
    if (!world || world.status !== "playing") return;
    let action;
    try {
      action = provider();
    } catch (e) {
      stopTimer();
      setStatus(translateError(e), "err");
      return;
    }
    lastTickAt = performance.now();
    world.apply(action);
    if (world.status !== "playing") {
      stopTimer();
      onRunEnded();
    }
  }, TICK_MS);
}
function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

// Replay a fixed action list (script mode) with the same animated loop.
function replayActions(setup, seed, actions) {
  resetWorld(setup, seed);
  let i = 0;
  startTimer(() => actions[i++] ?? "wait");
}

async function onRunEnded() {
  if (world.status === "won") {
    if (level.randomize) {
      setStatus("Reached the berry! Checking held-out maps…", "ok");
      await grade();
    } else {
      setStatus("Solved! 🎉", "ok");
      els.grade.innerHTML = pill("Level complete", "ok");
      onSolved();
    }
  } else {
    setStatus(`Critter died: ${world.reason}`, "err");
    els.grade.innerHTML = hint();
  }
}

// Held-out grading. Uses the right execution mode for the level.
async function grade() {
  const seeds = [101, 202, 303, 404, 505, 606, 707, 808];
  const src = editor.getValue();
  let wins = 0;
  for (const seed of seeds) {
    if (playHeadless(seed, src)) wins++;
  }
  const need = Math.ceil((level.passThreshold || 0.75) * seeds.length);
  const passed = wins >= need;
  if (passed) {
    els.grade.innerHTML =
      pill(`Passed ${wins}/${seeds.length} held-out maps`, "ok") +
      pill("Concept mastered", "ok");
    setStatus("Solved and verified! 🎉", "ok");
    onSolved();
  } else {
    els.grade.innerHTML =
      pill(`Only ${wins}/${seeds.length} held-out maps`, "err") +
      `<div class="hintbox">You beat the map you watched, but not new ones — that's luck, not a rule. Make your code work for <em>any</em> berry/predator position.</div>`;
    setStatus("Works here, fails elsewhere.", "err");
  }
}

function playHeadless(seed, src) {
  if (level.mode === "script") {
    try {
      return computeScript(level.setup, seed, src).status === "won";
    } catch {
      return false;
    }
  }
  const w = new World(level.setup, seed);
  resetMemory(); // each held-out run starts with empty memory
  let guard = 0;
  while (w.status === "playing" && guard++ < 4000) {
    let action;
    try {
      action = runDecide(JSON.stringify(w.sense()));
    } catch {
      return false;
    }
    w.apply(action);
  }
  return w.status === "won";
}

// --- Growth ---
function onSolved() {
  const idx = LEVELS.indexOf(level);
  if (state.cleared <= idx) {
    state.cleared = idx + 1;
    saveCleared(state.cleared);
    if (state.cleared % 5 === 0) {
      // Finished a whole topic → a real growth stage.
      const stage = currentStage();
      showToast(`🌱 Topic cleared — your critter grew → ${GROWTH[stage].name}!  Unlocked: ${GROWTH[stage].unlock}`);
    } else {
      showToast("🍓 Ate a berry — your critter grew a little. Keep practicing this concept.");
    }
  }
  renderGrowth();
}

// One growth stage per topic completed (every 5 levels).
function currentStage() {
  return Math.min(Math.floor(state.cleared / 5), GROWTH.length - 1);
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 3200);
}

function loadCleared() {
  const v = Number(localStorage.getItem("cf_cleared"));
  return Number.isFinite(v) ? v : 0;
}
function saveCleared(v) {
  try { localStorage.setItem("cf_cleared", String(v)); } catch {}
}

// --- Beginner-friendly error translation ---
function translateError(e) {
  const msg = String(e.message || e);
  const known = [
    "food_dx", "food_dy", "food_dist", "predator_dx", "predator_dy",
    "predator_dist", "predators", "flee_dir", "scent", "danger", "safe",
    "energy", "memory", "pos",
  ];
  const m = msg.match(/name '(\w+)' is not defined/);
  if (m) {
    const near = closest(m[1], known.concat(["decide", "look", "critter"]));
    return `NameError: '${m[1]}' doesn't exist.` + (near ? ` Did you mean '${near}'?` : "");
  }
  const k = msg.match(/KeyError: ['"](\w+)['"]/);
  if (k) {
    const near = closest(k[1], known);
    return `That sensor key '${k[1]}' doesn't exist.` + (near ? ` Did you mean s["${near}"]?` : "");
  }
  if (msg.includes("IndentationError"))
    return "IndentationError: check that your code is indented with 4 spaces.";
  if (msg.includes("SyntaxError"))
    return "SyntaxError: Python couldn't parse your code — check colons and parentheses.";
  const lines = msg.trim().split("\n");
  return lines[lines.length - 1] || msg;
}

function closest(word, options) {
  let best = null, bestD = Infinity;
  for (const o of options) {
    const d = lev(word, o);
    if (d < bestD) { bestD = d; best = o; }
  }
  return bestD <= 3 ? best : null;
}
function lev(a, b) {
  const m = [...Array(a.length + 1)].map((_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(
        m[i - 1][j] + 1,
        m[i][j - 1] + 1,
        m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return m[a.length][b.length];
}

function hint() {
  const reason = world.reason;
  let tip = "";
  if (reason.includes("predator")) tip = "Check sensors.threat_dist and flee when it's small.";
  else if (reason.includes("lava")) tip = "Use sensors.safe[direction] before stepping there.";
  else if (reason.includes("time") || reason.includes("energy"))
    tip = "Your critter wandered. Move toward higher sensors.scent.";
  return `<div class="hintbox"><strong>Why it died:</strong> ${reason} ${tip}</div>`;
}

const pill = (t, k) => `<span class="pill ${k}">${t}</span>`;

// --- Rendering ---
function startRenderLoop() {
  function frame(now) {
    const t = Math.min(1, (now - lastTickAt) / TICK_MS);
    draw(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function draw(t) {
  if (!world) return;
  const ctx = els.ctx;
  const S = els.canvas.width;
  const n = world.size;
  const cell = S / n;
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = "#1b2430";
  for (let i = 0; i <= n; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, S);
    ctx.moveTo(0, i * cell); ctx.lineTo(S, i * cell);
    ctx.stroke();
  }
  for (const w of world.walls) {
    const [x, y] = w.split(",").map(Number);
    ctx.fillStyle = "#30363d";
    ctx.fillRect(x * cell, y * cell, cell, cell);
  }
  for (const l of world.lava) {
    const [x, y] = l.split(",").map(Number);
    ctx.fillStyle = "#7d1f12";
    ctx.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
    ctx.fillStyle = "#ff6b3d";
    ctx.fillRect(x * cell + cell * 0.3, y * cell + cell * 0.3, cell * 0.4, cell * 0.4);
  }
  for (const f of world.foods) {
    const cx = (f.x + 0.5) * cell, cy = (f.y + 0.5) * cell;
    ctx.fillStyle = "#e64980";
    circle(ctx, cx, cy, cell * 0.26);
    ctx.fillStyle = "#51cf66";
    ctx.fillRect(cx - 1.5, cy - cell * 0.3, 3, cell * 0.16);
  }
  for (const p of world.predators) {
    const x = lerp(p.px, p.x, t), y = lerp(p.py, p.y, t);
    drawPredator(ctx, (x + 0.5) * cell, (y + 0.5) * cell, cell * 0.3);
  }
  const cx = lerp(world.prevCritter.x, world.critter.x, t);
  const cy = lerp(world.prevCritter.y, world.critter.y, t);
  // Size grows a little with every berry eaten — knowledge made flesh.
  const r = cell * Math.min(0.34, 0.18 + 0.0055 * state.cleared);
  drawCritter(ctx, (cx + 0.5) * cell, (cy + 0.5) * cell, r);

  if (world.budget) {
    const frac = 1 - Math.min(1, world.ticks / world.budget);
    ctx.fillStyle = "#1b2430";
    ctx.fillRect(6, S - 12, S - 12, 6);
    ctx.fillStyle = frac > 0.3 ? "#51cf66" : "#ffa94d";
    ctx.fillRect(6, S - 12, (S - 12) * frac, 6);
  }
}

function drawCritter(ctx, x, y, r) {
  ctx.fillStyle = "#4dabf7";
  circle(ctx, x, y, r);
  ctx.fillStyle = "#fff";
  circle(ctx, x - r * 0.35, y - r * 0.2, r * 0.22);
  circle(ctx, x + r * 0.35, y - r * 0.2, r * 0.22);
  ctx.fillStyle = "#0b1220";
  circle(ctx, x - r * 0.32, y - r * 0.18, r * 0.1);
  circle(ctx, x + r * 0.38, y - r * 0.18, r * 0.1);
}

function drawPredator(ctx, x, y, r) {
  ctx.fillStyle = "#f03e3e";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const rad = i % 2 === 0 ? r : r * 0.55;
    const px = x + Math.cos(ang) * rad, py = y + Math.sin(ang) * rad;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  circle(ctx, x - r * 0.25, y, r * 0.14);
  circle(ctx, x + r * 0.25, y, r * 0.14);
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
const lerp = (a, b, t) => a + (b - a) * t;

function renderGrowth() {
  const stage = currentStage();
  const rows = GROWTH.slice(1).map((g, i) => {
    const sIdx = i + 1;
    const cls = sIdx < stage ? "done" : sIdx === stage ? "on" : "locked";
    return `<div class="grow ${cls}">
      <span class="dot"></span>
      <span class="gname">${g.name}</span>
      <span class="gunlock">${g.unlock}</span>
      <span class="gconcept">${g.concept}</span>
    </div>`;
  }).join("");
  els.growth.innerHTML = `
    <div class="growhead">Growth — stage ${stage}/5 · <b>${GROWTH[stage].name}</b></div>
    ${rows}
    <div class="grow acts">
      <span class="dot"></span><span class="gname">Juvenile → Apex</span>
      <span class="gunlock">Acts 2–4: NumPy · sklearn · PyTorch RL</span>
      <span class="gconcept">locked</span>
    </div>`;
}

boot();
