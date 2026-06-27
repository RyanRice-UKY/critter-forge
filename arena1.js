// arena1.js — The Wildwood. The bow teaches variables + basic math. The enemy
// APPROACHES and looms (a pause) while the player completes ONE blank in an
// otherwise-written program; on a correct answer the archer looses arrows.
// Includes a survivor who screams for help (a print line) that you answer.

const HARNESS = `
import json, sys, io
def run_user(src):
    ns = {}; err = None; buf = io.StringIO(); old = sys.stdout; sys.stdout = buf
    try:
        exec(src, ns)
    except Exception as e:
        err = type(e).__name__ + ": " + str(e)
    finally:
        sys.stdout = old
    out = {}
    for k, v in ns.items():
        if k.startswith("__") or isinstance(v, bool): continue
        if isinstance(v, (int, float, str)): out[k] = v
    return json.dumps({"vars": out, "err": err, "stdout": buf.getvalue()})
`;

const okv = () => ({ pass: true });
const fail = (msg) => ({ pass: false, msg });

const BEATS = [
  {
    learn: "variables + addition", scene: "charge", fireCount: 7,
    narr: "Your quiver is empty and a fevered one breaks from the trees, charging. Arrows litter the grass — grab them and total your count.",
    npc: "“4 by your boot, 3 in the dirt — you need at least 5 to drop it!”",
    template: "boot_arrows = 4\ngrass_arrows = 3\narrows = boot_arrows + {blank}   # total them to survive",
    vars: { arrows: 7 }, reply: "Seven arrows nocked — you loose, and the charger drops a pace from your boots.",
  },
  {
    learn: "variables + subtraction", scene: "overrun", fireCount: 5,
    narr: "More spill from the dark. You had 7 arrows and fire 5 into the pack.",
    npc: "“How many are left in your quiver?”",
    template: "arrows = 7\nfired = 5\narrows_left = arrows - {blank}   # what you just loosed",
    vars: { arrows_left: 2 }, reply: "Two arrows left — just enough. Up ahead, someone is screaming.",
  },
  {
    learn: "print() — answer the call", scene: "help", textRule: true,
    narr: "A survivor is pinned against a tree, a fevered one clawing at them. They scream into the dark.",
    npc: "Answer them — fill the blank so your shout has real words in it.",
    template: 'print("HELP! It\'s on me!")     # the survivor screams\nprint("Hold on — {blank}!")      # shout back, keep them steady',
    reply: "Your voice cuts through the panic. You loose your last arrows and haul them free.",
  },
  {
    learn: "variables + multiplication", scene: "reward",
    narr: "Safe for now, the survivor presses coins into your hand — five for every arrow you spent saving them.",
    npc: "“You loosed 2 arrows, at 5 coins each. Count it.”",
    template: "arrows_spent = 2\ncoins_each = 5\ncoins = arrows_spent * {blank}   # 5 coins per arrow",
    vars: { coins: 10 }, reply: "Ten coins, warm in your palm. They nod toward a trader down the path.",
  },
  {
    learn: "variables + division (change)", scene: "merchant",
    narr: "A trader guards a stall of fresh quivers. “Six coins,” she rasps. You hand over your ten — and she only keeps 2-coin chips.",
    npc: "“Your change is ten minus six. How many 2-coin chips is that?”",
    template: "paid = 10\nprice = 6\nchange = paid - price\nchips = change / {blank}   # change comes in 2-coin chips",
    vars: { change: 4, chips: 2 }, reply: "Two chips clink into your hand — fair change. You shoulder a full quiver. The Wildwood is yours.",
  },
];

let pyodide = null, runUser = null;
let beat = 0, passed = false;
const els = {};
const sc = { enemies: [], survivor: null, phase: "idle", coins: false, arrows: [], loomed: false, fire: { active: false, state: "idle", t: 0, targets: [], drawAmt: 0 } };
let lastMs = performance.now();

async function boot() {
  for (const id of ["prog", "narr", "npc", "task", "run", "next", "status", "scene", "code"]) els[id] = document.getElementById(id);
  els.ctx = els.scene.getContext("2d");
  els.run.onclick = solve;
  els.next.onclick = advance;
  loadBeat(0);
  loop();
  setStatus("Loading Python… read the code while it loads.", "muted");
  pyodide = await loadPyodide();
  await pyodide.runPythonAsync(HARNESS);
  runUser = pyodide.globals.get("run_user");
  els.run.disabled = false;
  setStatus("Fill the blank, then press Loose.", "muted");
  // dev aid: arena1.html#demo auto-solves once the enemy looms (for screenshots)
  if (location.hash === "#demo") { const iv = setInterval(() => { if (sc.phase === "loom" && els.blank) { els.blank.value = "3"; solve(); clearInterval(iv); } }, 80); }
}

// ---- code template with one editable blank ----
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function hlLine(line) {
  const ci = line.indexOf("#"); let main = line, com = "";
  if (ci >= 0) { main = line.slice(0, ci); com = line.slice(ci); }
  let h = esc(main).replace(/(".*?"|'.*?')/g, '<span class="str">$1</span>').replace(/\b(\d+)\b/g, '<span class="num">$1</span>').replace(/\b(print)\b/g, '<span class="kw">$1</span>');
  if (com) h += '<span class="com">' + esc(com) + "</span>";
  return h;
}
function renderCode(tmpl) {
  let html = "";
  for (const line of tmpl.split("\n")) {
    if (line.includes("{blank}")) { const [pre, post] = line.split("{blank}"); html += hlLine(pre) + '<input id="blank" class="blank" placeholder="?" autocomplete="off" spellcheck="false">' + hlLine(post); }
    else html += hlLine(line);
    html += "\n";
  }
  els.code.innerHTML = html;
  els.blank = document.getElementById("blank");
  els.blank.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); solve(); } });
  setTimeout(() => els.blank && els.blank.focus(), 30);
}

function loadBeat(i) {
  beat = i; passed = false;
  const b = BEATS[i];
  els.prog.textContent = `Arena 1 · beat ${i + 1} of ${BEATS.length} · learning: ${b.learn}`;
  els.narr.textContent = b.narr; els.npc.textContent = b.npc;
  els.task.textContent = "Read the code, then type only what belongs in the glowing blank:";
  renderCode(b.template);
  els.next.style.display = "none";
  setupScene(b);
  setStatus("Fill the blank, then press Loose.", "muted");
}

function solve() {
  if (!pyodide || !els.blank) return;
  const val = els.blank.value;
  if (!val.trim()) { setStatus("Type your answer in the glowing blank first.", "err"); return; }
  const src = BEATS[beat].template.replace("{blank}", val);
  let res;
  try { res = JSON.parse(runUser(src)); }
  catch (e) { setStatus(String(e.message || e), "err"); return; }
  if (res.err) { setStatus(translate(res.err), "err"); return; }
  const b = BEATS[beat], v = check(b, val, res.vars);
  if (v.pass) { passed = true; onPass(b, res); }
  else setStatus(v.msg, "err");
}

function check(b, val, vars) {
  if (b.textRule && !/[a-zA-Z]/.test(val)) return fail("Shout something with real words — letters, not just a symbol.");
  if (b.vars) for (const [k, want] of Object.entries(b.vars)) {
    if (!(k in vars)) return fail(`I can't find a variable named ${k}. Is the blank filled in correctly?`);
    if (Number(vars[k]) !== want) return fail(`${k} came out as ${vars[k]}, but it should be ${want}. Re-read the numbers in the code.`);
  }
  return okv();
}

function onPass(b, res) {
  if (b.scene === "charge" || b.scene === "overrun" || b.scene === "help") {
    sc.phase = "fire";
    if (b.scene === "help") sc.say = res.stdout.split("\n").filter((l) => l.trim());
    // queue a slow, one-at-a-time volley: one arrow per enemy
    sc.fire.targets = sc.enemies.filter((e) => !e.dead);
    if (sc.fire.targets.length) { sc.fire.active = true; sc.fire.state = "draw"; sc.fire.t = 0; sc.fire.drawAmt = 0; }
  } else if (b.scene === "reward" || b.scene === "merchant") { sc.coins = true; }
  setStatus("✓ " + b.reply, "ok");
  els.next.textContent = beat < BEATS.length - 1 ? "Continue ▸" : "Finish Arena 1 ▸";
  els.next.style.display = "inline-block";
}

function advance() { if (beat < BEATS.length - 1) loadBeat(beat + 1); else finish(); }
function finish() {
  els.prog.textContent = "Arena 1 cleared";
  els.narr.textContent = "You added to survive, answered a cry for help, multiplied your reward and divided for fair change. Variables and arithmetic — the bones of everything ahead.";
  els.npc.textContent = "“Next, you won't count arrows one at a time. You'll loose a whole volley — as many as you say.”";
  els.code.innerHTML = '<span class="com"># Next: the for-loop volley.</span>';
  els.task.textContent = "✓ Learned: variables, print(), and + − × ÷.";
  els.next.style.display = "none";
  setStatus("Arena 1 complete — the for-loop volley is next.", "ok");
}

function translate(err) {
  const m = err.match(/name '(\w+)' is not defined/);
  if (m) return `Python doesn't know “${m[1]}”. Put a number, or the name of a variable from the code above, in the blank.`;
  if (err.includes("SyntaxError")) return "That doesn't fit the line — try just a number or a single variable name in the blank.";
  if (err.includes("ZeroDivision")) return "You divided by zero — the blank needs a number bigger than 0.";
  return err;
}
function setStatus(m, k) { els.status.textContent = m; els.status.className = `status ${k}`; }

// ---------- scene ----------
const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, Math.ceil(w), Math.ceil(h)); };
function person(c, x, y, cloth, skin, hair, bow, cower, drawAmt = 0) {
  const dy = cower ? 5 : 0;
  px(c, x - 4, y + 8, 4, 9 - dy, "#3a2c18"); px(c, x + 1, y + 8, 4, 9 - dy, "#3a2c18");
  px(c, x - 5, y - 4 + dy, 11, 13 - dy, cloth); px(c, x - 4, y - 13 + dy, 9, 9, skin); px(c, x - 5, y - 14 + dy, 11, 3, hair);
  if (bow) {
    // bow stave
    c.strokeStyle = "#9c6b3f"; c.lineWidth = 2.5; c.beginPath(); c.arc(x + 12, y - 1, 11, -1.15, 1.15); c.stroke();
    // string — its midpoint is pulled back (left) as the bow is drawn
    const sx = x + 12 - drawAmt * 10;
    c.strokeStyle = "#e9dcc0"; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 12, y - 12); c.lineTo(sx, y - 1); c.lineTo(x + 12, y + 10); c.stroke();
    // nocked arrow, drawn back with the string
    if (drawAmt > 0.12) { c.strokeStyle = "#f1e3c0"; c.lineWidth = 2; c.beginPath(); c.moveTo(sx, y - 1); c.lineTo(x + 22, y - 1); c.stroke(); c.fillStyle = "#d6dee8"; c.fillRect(x + 22, y - 2.5, 4, 3); }
    // drawing arm pulls back with the string
    px(c, sx - 1, y - 2, 6, 3, skin);
  }
}
function zombie(c, x, y, lunge) {
  // dark outline so it pops against the grass
  px(c, x - 6, y - 5, 13, 15, "#10200c"); px(c, x - 5 - lunge, y - 14, 11, 11, "#10200c"); px(c, x + 3, y - 7, 9, 4, "#10200c");
  px(c, x - 5, y - 4, 11, 13, "#8a9a6a"); px(c, x - 4 - lunge, y - 13, 9, 9, "#aab98a");
  px(c, x - 2 - lunge, y - 11, 2, 2, "#ff3b3b"); px(c, x + 1 - lunge, y - 11, 2, 2, "#ff3b3b");
  px(c, x - 1 - lunge, y - 8, 3, 1, "#3a0a0a"); // grimace
  px(c, x - 4, y + 8, 3, 9, "#2a2014"); px(c, x + 2, y + 8, 3, 9, "#2a2014");
  px(c, x + 4, y - 6, 6, 2, "#aab98a"); // reaching arm
}
// Characters are tiny by default — draw them bigger so the action reads.
const CH = 1.7;
function P(c, x, y, ...a) { c.save(); c.translate(x, y); c.scale(CH, CH); person(c, 0, 0, ...a); c.restore(); }
function Z(c, x, y, lunge) { c.save(); c.translate(x, y); c.scale(CH, CH); zombie(c, 0, 0, lunge); c.restore(); }

function setupScene(b) {
  sc.enemies = []; sc.survivor = null; sc.coins = false; sc.arrows = []; sc.loomed = false; sc.say = null;
  sc.fire = { active: false, state: "idle", t: 0, targets: [], drawAmt: 0 };
  const W = els.scene.width; // hero stands at ~0.26W — pauses sit RIGHT in front of them
  if (b.scene === "charge") { sc.enemies = [{ x: W + 30, y: 0, dead: false, pause: W * 0.40 }]; sc.phase = "approach"; }
  else if (b.scene === "overrun") { sc.enemies = [0, 1, 2].map((i) => ({ x: W + 30 + i * 34, y: (i % 2) * 8, dead: false, pause: W * 0.42 + i * 30 })); sc.phase = "approach"; }
  else if (b.scene === "help") { sc.enemies = [{ x: W * 0.7, y: 0, dead: false, pause: W * 0.58 }]; sc.survivor = { x: W + 20, pause: W * 0.46 }; sc.phase = "approach"; }
  else { sc.phase = "idle"; sc.survivor = b.scene !== "merchant" ? { x: W * 0.62, pause: W * 0.62 } : null; }
}

function loop() { requestAnimationFrame(function f(ms) { const dt = Math.min(0.05, (ms - lastMs) / 1000); lastMs = ms; drawScene(ms / 1000, dt); requestAnimationFrame(f); }); }

function drawScene(now, dt) {
  const c = els.ctx, W = els.scene.width, H = els.scene.height, hy = H * 0.62, hx = W * 0.26;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#22324a"); g.addColorStop(0.55, "#2a4a2e"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i * 22 < W; i++) px(c, i * 22, H * 0.6, 22, H * 0.45, i % 2 ? "#2f6b3a" : "#367d42");
  for (let i = 0; i < 18; i++) { const x = (i * 71) % W, y = H * 0.6 + (i * 37) % (H * 0.38), sw = Math.sin(now * 2 + i) * 2; c.strokeStyle = "#235c30"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x + sw, y - 5); c.stroke(); }

  // advance enemies / survivor (slow, menacing approach)
  let leadAtPause = true;
  for (const e of sc.enemies) {
    if (e.dead) { e.x += 130 * dt; e.fade = (e.fade || 1) - dt * 1.5; continue; }
    if (sc.phase === "approach" && e.x > e.pause) { e.x -= 55 * dt; if (e.x <= e.pause) e.x = e.pause; }
    if (e.x > e.pause + 2) leadAtPause = false;
  }
  if (sc.survivor && sc.survivor.x > sc.survivor.pause) sc.survivor.x = Math.max(sc.survivor.pause, sc.survivor.x - 80 * dt);
  if (sc.phase === "approach" && leadAtPause && !passed) { sc.phase = "loom"; if (!sc.loomed && sc.enemies.length) { sc.loomed = true; setStatus(sc.enemies.length > 1 ? "They're right on you — finish the line and Loose!" : "It's right on you — fill the blank and Loose!", "err"); } }

  // FIRING — one arrow at a time: draw the bow slowly, loose, wait, repeat
  const F = sc.fire, DRAW = 0.6, REL = 0.12, GAP = 0.45, SPEED = 175;
  if (F.active) {
    if (F.state === "draw") { F.t += dt; F.drawAmt = Math.min(1, F.t / DRAW); if (F.t >= DRAW) { const tgt = F.targets.find((e) => !e.dead); if (tgt) sc.arrows.push({ x: hx + 30, y: hy - 2, target: tgt, hit: false }); F.state = "release"; F.t = 0; } }
    else if (F.state === "release") { F.t += dt; F.drawAmt = Math.max(0, 1 - F.t / REL); if (F.t >= REL) { F.state = "fly"; F.t = 0; } }
    else if (F.state === "fly") { if (!sc.arrows.some((a) => !a.hit)) { F.state = "gap"; F.t = 0; } }
    else if (F.state === "gap") { F.t += dt; if (F.t >= GAP) { if (F.targets.some((e) => !e.dead)) { F.state = "draw"; F.t = 0; } else { F.active = false; F.state = "idle"; } } }
  }
  for (const a of sc.arrows) { if (a.hit) continue; a.x += SPEED * dt; if (a.target && a.x >= a.target.x - 4) { a.hit = true; a.target.dead = true; a.target.fade = 1; } }
  sc.arrows = sc.arrows.filter((a) => !a.hit && a.x < W + 20);

  // survivor + scream / reply bubbles
  if (sc.survivor) { const cower = !passed && BEATS[beat].scene === "help"; P(c, sc.survivor.x, hy, "#7048e8", "#c89060", "#2b2018", false, cower); }
  if (BEATS[beat].scene === "help" && !passed) bubble(c, sc.survivor ? sc.survivor.x : W * 0.6, hy - 16, ["HELP!"], "#ff6b6b");
  if (BEATS[beat].scene === "help" && passed && sc.say) bubble(c, hx, hy - 16, sc.say.slice(0, 2), "#f5f7fa");

  // enemies (lunge harder while looming this close)
  for (const e of sc.enemies) { if (e.fade !== undefined && e.fade <= 0) continue; c.globalAlpha = e.fade !== undefined ? Math.max(0, e.fade) : 1; const lunge = sc.phase === "loom" && !e.dead ? (1.5 + Math.sin(now * 5) * 2.5) : 0; Z(c, e.x, hy + e.y, lunge); c.globalAlpha = 1; }

  // merchant stall / reward coins
  if (BEATS[beat].scene === "merchant") stall(c, W * 0.62, hy);
  if ((BEATS[beat].scene === "reward" || BEATS[beat].scene === "merchant") && (sc.coins || passed)) coins(c, W * 0.5, hy, now);

  // hero (bow drawn while firing)
  P(c, hx, hy, "#6b8e23", "#e0a070", "#3a2c18", true, false, F.active ? F.drawAmt : 0);

  // arrows in flight
  for (const a of sc.arrows) { if (a.hit) continue; c.strokeStyle = "#f1e3c0"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x - 13, a.y); c.stroke(); c.fillStyle = "#d6dee8"; c.fillRect(a.x, a.y - 2, 5, 3); }

  hud(c);
}
function bubble(c, x, y, lines, color) {
  c.font = "13px 'IBM Plex Mono', monospace";
  const w = Math.max(56, ...lines.map((l) => c.measureText(l).width)) + 18, h = lines.length * 17 + 12, bx = x - w / 2, by = y - h - 14;
  c.fillStyle = "rgba(245,247,250,0.97)"; roundRect(c, bx, by, w, h, 7); c.fill();
  c.beginPath(); c.moveTo(x - 5, by + h); c.lineTo(x + 5, by + h); c.lineTo(x, by + h + 8); c.closePath(); c.fill();
  c.fillStyle = color === "#ff6b6b" ? "#c92a2a" : "#0b0e14"; c.textAlign = "left";
  lines.forEach((l, i) => c.fillText(l, bx + 9, by + 18 + i * 17));
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function coins(c, x, y, now) { for (let i = 0; i < 4; i++) { const yy = y - 6 - i * 7 + Math.sin(now * 6 + i) * 2; c.fillStyle = "#ffd43b"; c.beginPath(); c.arc(x + (i % 2 ? 4 : -4), yy, 4, 0, Math.PI * 2); c.fill(); px(c, x + (i % 2 ? 3 : -5), yy - 1, 2, 2, "#e6a700"); } }
function stall(c, x, y) { px(c, x - 16, y - 6, 32, 20, "#7a5a30"); px(c, x - 18, y - 14, 36, 8, "#c2410c"); px(c, x - 10, y - 2, 8, 6, "#9c6b3f"); px(c, x + 4, y - 2, 8, 6, "#9c6b3f"); person(c, x + 22, y, "#b08968", "#d9a066", "#3a2c18", false, false); }
function hud(c) {
  c.fillStyle = "rgba(8,12,18,0.7)"; c.fillRect(10, 10, 150, 30); c.strokeStyle = "#2a3a4a"; c.strokeRect(10, 10, 150, 30);
  c.font = "12px 'IBM Plex Mono', monospace"; c.textAlign = "left"; c.fillStyle = "#d9c7a3";
  c.fillText(`Beat ${beat + 1}/${BEATS.length}`, 20, 30);
}
boot();
