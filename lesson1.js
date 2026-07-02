// lesson1.js — Lesson 1, an open-world-ish 2D Python game across the Wildwood.
// API the player learns: you.walk("place"), bow.fire(), print(), variables, + - ,
// and the for loop. The engine auto-walks during scripted beats and SHOWS the
// commands in the journal; once a lesson ends the player walks freely by typing.

import "./journal.js"; // defines window.Journal
import { Editor } from "./editor.js";
import { CONCEPTS, skeletonize, buildLessonHTML } from "./curriculum.js";
import { TRIALS } from "./trials/trials-data.js";
import { showWalkthrough, walkthroughsEnabled, walkthroughSeen } from "./walkthrough.js";

const HARNESS = `
import json, sys, io
_PRE = ("_walk=None\\n_fires=0\\n"
        "class _You:\\n    def walk(self,p):\\n        global _walk\\n        _walk=p\\n"
        "class _Bow:\\n    def fire(self):\\n        global _fires\\n        _fires+=1\\n"
        "you=_You()\\nbow=_Bow()\\n")
def run_user(src, pre, inputval=""):
    ns={"_INPUTVAL": inputval}; err=None; buf=io.StringIO(); old=sys.stdout; sys.stdout=buf
    try:
        exec("def input(p=''):\\n    return _INPUTVAL\\n"+_PRE+pre+"\\n"+src, ns)
    except Exception as e:
        err=type(e).__name__+": "+str(e)
    finally:
        sys.stdout=old
    out={}
    for k,v in ns.items():
        if k.startswith("_") or k in ("you","bow") or callable(v): continue
        if isinstance(v,(bool,int,float,str)): out[k]=v
    return json.dumps({"vars":out,"walk":ns.get("_walk"),"fires":ns.get("_fires"),"stdout":buf.getvalue(),"err":err})
`;

const SCENES = {
  wildwood: { stranger: 0.31, tree: 0.56, smith: 0.76 },
  clearing: { center: 0.42, tree: 0.72, bridge: 0.9 },
  castle: { castle: 0.74 },
  keep: { road: 0.03, craftsman: 0.2, proving: 0.3, forhire: 0.4, chamber: 0.5, blacksmith: 0.6, armorsmith: 0.8, knight: 0.92 },
  fallencamp: { gate: 0.1, bodies: 0.32, fire: 0.5, tent: 0.63, rubble: 0.76, tower: 0.9 },
  storage: { cart: 0.5 },
  camp: { gate: 0.5 },
};
let scene = "wildwood";
let pyodide = null, runUser = null, pyReady = false, lastSrc = "";
const els = {}, tweens = [];
let lastMs = performance.now();
const char = { x: 0, rise: 0, walk: 0, walking: false, target: 0, onArrive: null, facing: 1, bubble: null, bubbleT: 0, hasBow: false, items: { sticks: 0, string: 0 }, gold: 0, hearts: 5, maxHearts: 5, kit: {} };
let zoms = [], ARROWS = [], zombiesApproach = false;
let FX = [], shootT = 0; // impact debris particles + how long the hero holds the draw pose
// ---- the armory booth (shop scene) ----
const KIT_PIECES = ["boots", "helmet", "gauntlets", "leggings", "chestplate"];
let tamFreed = false; // the survivor beneath the storehouse rubble
let armoryRects = null; // clickable rack items, set by drawArmory
let armoryPicked = { boots: false, helmet: false, gauntlets: false, leggings: false, chestplate: false };
let manifestRect = null; // clickable wall note in the storage room (set by drawStorage)
const MANIFEST_CODE =
  "plate_weight = 10\ncrate_weight = 4\nbarrel_weight = 3\n\ncorrect_items = 0\nif armor * plate_weight == 10:\n    correct_items = correct_items + 1\nif food * crate_weight == 8:\n    correct_items = correct_items + 1\nif water * barrel_weight == 3:\n    correct_items = correct_items + 1\n\n# she sails only when correct_items == 3";
const MANIFEST_NOTE = "NORTH WATCH: LOADING PROTOCOL\n\n" + MANIFEST_CODE;
// guided line-by-line explainers (skipped in intermediate mode, shown once each)
const WT_MANIFEST = {
  id: "manifest-if", title: "Reading the manifest, line by line", code: MANIFEST_CODE,
  steps: [
    { lines: [1, 3], text: "Start at the top. These three lines are variables: labelled boxes that each hold a number. A plate weighs 10, a crate 4, a barrel 3. Whenever a line below uses one of these names, Python swaps in the number it holds." },
    { lines: [5], text: "One more variable. correct_items starts at 0. This is the score keeper: the manifest will use it to count how much of your load is right." },
    { lines: [6], text: "Your first if statement. Read it like a sentence: IF armor times plate_weight equals 10, then do the indented thing below. Everything between if and the colon is the condition, a yes or no question. The == asks 'are these two equal?'. It is a question, not an assignment." },
    { lines: [7], text: "This line is indented under the if, so it belongs to it. It runs ONLY when the condition above is true, and it grows the counter by one. When the condition is false, Python skips this line as if it were never written." },
    { lines: [8, 11], text: "Two more if statements with the exact same shape: a question, a colon, an indented line that runs only on yes. One checks food, one checks water. Ask yourself: what value of food makes food times 4 equal 8?" },
    { lines: [13], text: "The bottom line starts with #, which makes it a comment: a note for humans that Python ignores. It tells you the rule. All three checks must come back true, so correct_items must reach 3. Set armor, food and water to make that happen." },
  ],
};
const WT_FORLOOP = {
  id: "for-loop", title: "Reading a for loop, piece by piece", code: "for i in range(4):\n    bow.fire()",
  steps: [
    { lines: [1], text: "for is the repeat keyword. It tells Python: run the block underneath me again and again, instead of making you write the same line over and over." },
    { lines: [1], text: "range(4) deals out four numbers: 0, 1, 2, 3. The counter i takes each one in turn, so the loop makes exactly four passes. range(10) would make ten." },
    { lines: [1], text: "The colon at the end opens the block. Whatever is indented underneath it belongs to the loop." },
    { lines: [2], text: "The body. This indented line runs once per pass: four passes, four arrows loosed. One short loop instead of writing bow.fire() four times in a row." },
  ],
};
let invinc = 0, dmgFlash = 0, dying = false;
let townsfolk = [];
let lesson1Done = false;
// parts of the keep that stay locked until later in the game (future chapters)
let chamberUnlocked = false, provingUnlocked = false;
let questStep = 0, armoryOpen = false, raftP = 0; // 1.3 questline progress
let raftCargo = { armor: 0, food: 0, water: 0 };  // what's loaded on the raft
let campSupplies = { armor: 0, food: 0, water: 0 };  // what's been unloaded at the army camp
let inventory = [];  // items the player carries; click one to read it
const ORDERS_NOTE = {
  name: "Sealed Orders", icon: "📜",
  note: "KNIGHT-CAPTAIN'S ORDERS\n\nBearer carries the north-watch supplies.\nGrant them passage to the army camp.\n\nThe guard answers to no stranger.\nSpeak this watchword at the shore:\n\n        ironwatch\n\nGuard these orders well.",
};
let dialogue = null, awaitAdvance = null, currentInput = null;
let lastSaid = null; // the last spoken line stays on screen while the IDE waits for your code
let survivor = null, survivorFollow = false, survivorHide = false;

async function boot() {
  for (const id of ["stage", "loading", "prompt", "lesson", "code", "run", "status", "prog", "log", "inventory", "invItems", "noteModal", "noteText", "noteClose", "hint", "ide", "ideDot", "pystat", "logTab"]) els[id] = document.getElementById(id);
  wireIde();
  els.ctx = els.stage.getContext("2d");
  els.noteClose.onclick = () => (els.noteModal.hidden = true);
  document.getElementById("wallNoteClose").onclick = () => (document.getElementById("wallNote").hidden = true);
  els.noteModal.onclick = (e) => { if (e.target === els.noteModal) els.noteModal.hidden = true; };
  fit(); window.addEventListener("resize", fit);
  els.stage.onclick = async (e) => {
    // the armory rack: clicking a piece toggles it onto the order slip AND
    // declares its constant at the top of the code editor
    if (scene === "armory" && armoryRects) {
      const r2 = els.stage.getBoundingClientRect(), mx2 = e.clientX - r2.left, my2 = e.clientY - r2.top;
      for (const kind of KIT_PIECES) {
        const rc = armoryRects[kind];
        if (rc && mx2 >= rc.x && mx2 <= rc.x + rc.w && my2 >= rc.y && my2 <= rc.y + rc.h) {
          if (!char.kit[kind]) { armoryPicked[kind] = !armoryPicked[kind]; updateArmoryEditor(); }
          return;
        }
      }
    }
    // the storage room's wall note: first read gets a guided line-by-line
    // walkthrough of the if statements, then the note pins beside the IDE
    if (scene === "storage" && manifestRect) {
      const r = els.stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      if (mx >= manifestRect.x && mx <= manifestRect.x + manifestRect.w && my >= manifestRect.y && my <= manifestRect.y + manifestRect.h) {
        if (walkthroughsEnabled() && !walkthroughSeen(WT_MANIFEST.id)) await showWalkthrough(WT_MANIFEST);
        document.getElementById("wallNoteText").textContent = MANIFEST_NOTE;
        document.getElementById("wallNote").hidden = false;
        return;
      }
    }
    advance();
  };
  document.getElementById("wallNoteExplain").onclick = () => showWalkthrough(WT_MANIFEST); // ❓ replays the explainer any time
  els.run.onclick = submit;
  els.hint.onclick = () => { if (currentInput) Editor.toggleHint(currentInput.opts.placeholder || ""); };
  Editor.init({ onSubmit: submit, onChange: (lines) => els.ide.classList.toggle("wide", lines > 8) }); // grow wide before tall at the bottom dock
  wireDevBar();
  if (window.Journal) window.Journal.init({ pyodide: null });
  loop(); play();
  pyodide = await loadPyodide();
  await pyodide.runPythonAsync(HARNESS);
  runUser = pyodide.globals.get("run_user");
  pyReady = true; els.loading.style.display = "none";
  if (els.pystat) { els.pystat.textContent = "● python ready"; els.pystat.classList.add("ok"); }
  if (window.Journal) window.Journal.setPyodide(pyodide);
}
function fit() { const r = els.stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; els.stage.width = r.width * dpr; els.stage.height = r.height * dpr; els.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); els.W = r.width; els.H = r.height; if (!char.x) char.x = els.W * 0.14; }

// ---------- primitives ----------
function anim(dur, fn) { return new Promise((res) => tweens.push({ t: 0, dur, fn, res })); }
const wait = (s) => anim(s, () => {});
const locFrac = (n) => (SCENES[scene] && SCENES[scene][n] != null ? SCENES[scene][n] : 0.5);
function walkToX(tx) { return new Promise((res) => { char.facing = tx >= char.x ? 1 : -1; char.target = tx; char.walking = true; char.onArrive = res; }); }
function walkTo(frac) { return walkToX(els.W * frac); }
const STAND_BESIDE = { stranger: 1, smith: 1, castle: 1, craftsman: 1, forhire: 1, blacksmith: 1, armorsmith: 1, knight: 1, chamber: 1, gate: 1 }; // stop next to these, not on top
function goTo(name) { let tx = els.W * locFrac(name); const dir = Math.sign(tx - char.x) || 1; if (STAND_BESIDE[name]) tx -= dir * 46; return walkToX(tx); }
async function autoWalk(name) { logCmd(`you.walk("${name}")`, false); await goTo(name); }
function say(who, text) { return new Promise((res) => { char.bubble = null; char.bubbleT = 0; dialogue = { who, text }; lastSaid = { who, text }; awaitAdvance = res; }); } // one speaker at a time: a new line clears the player's bubble
function speech(t) { const line = String(t || "").trim().split("\n").filter(Boolean).slice(0, 1).join(" "); char.bubble = line; char.bubbleT = 3.4; return wait(Math.min(2.6, 1.1 + line.length * 0.045)); } // hold long enough to read before anyone replies
function advance() { if (awaitAdvance) { const r = awaitAdvance; awaitAdvance = null; dialogue = null; r(); } }

// ===== DEV ONLY (remove this + the #devbar block in lesson1.html before shipping) =====
// Skip the current step by auto-running its placeholder (a valid answer for every step),
// or advance dialogue. Section buttons reload to a scene via the URL hash.
function skipStep() { if (currentInput) { Editor.setValue(currentInput.opts.prefill || currentInput.opts.placeholder || ""); submit(); } else if (awaitAdvance) advance(); }
function wireDevBar() {
  const ds = document.getElementById("devSkip"); if (!ds) return;
  ds.onclick = skipStep;
  document.querySelectorAll("#devbar [data-scene]").forEach((b) => (b.onclick = () => { location.hash = b.dataset.scene; location.reload(); }));
  document.getElementById("devClose").onclick = () => document.getElementById("devbar").remove();
  document.addEventListener("keydown", (e) => { if (e.key === "Tab") { e.preventDefault(); skipStep(); } }); // Tab = skip
}
// ===== end DEV ONLY =====
// ---------- floating IDE panel: open/close, dock position, log drawer ----------
let ideCloseT = null;
function ideOpen() { clearTimeout(ideCloseT); els.ide.classList.add("open"); Editor.refresh(); }
function ideClose() { clearTimeout(ideCloseT); ideCloseT = setTimeout(() => els.ide.classList.remove("open"), 300); } // small delay so back-to-back asks don't flicker
function setDock(where) {
  els.ide.classList.remove("dock-bottom", "dock-left", "dock-right"); els.ide.classList.add("dock-" + where);
  for (const [id, w] of [["dockL", "left"], ["dockB", "bottom"], ["dockR", "right"]]) document.getElementById(id).classList.toggle("on", w === where);
  try { localStorage.setItem("sts-dock", where); } catch (e) {}
  Editor.refresh();
}
function wireIde() {
  document.getElementById("dockL").onclick = () => setDock("left");
  document.getElementById("dockB").onclick = () => setDock("bottom");
  document.getElementById("dockR").onclick = () => setDock("right");
  let d = "bottom"; try { d = localStorage.getItem("sts-dock") || "bottom"; } catch (e) {}
  if (d !== "bottom") setDock(d);
  els.logTab.onclick = () => document.body.classList.toggle("log-open");
  // clicking a highlighted concept term opens its Command Journal entry
  els.lesson.addEventListener("click", (e) => { const j = e.target && e.target.dataset ? e.target.dataset.j : null; if (j && window.Journal) window.Journal.openTo(j); });
}

const nonEmptyOut = (r) => (r.stdout.trim() ? null : "Put some words between the quotes.");
const firstLine = (s) => s.trim().split("\n")[0];
const prog = (s) => (els.prog.textContent = ""); // progress suffix hidden; lesson number shown in the top-left label instead

function ask(opts, onCode) {
  return new Promise((res) => {
    currentInput = { opts, onCode, res };
    ideOpen();
    els.prompt.textContent = opts.prompt;
    // adaptive lesson pane: first encounter teaches the concept, later ones just remind
    const usesOf = (id) => (Sv ? Sv.conceptUses(id) : 0);
    const lessonHTML = opts.concept ? buildLessonHTML(opts.concept, usesOf, opts.task || opts.lesson) : (opts.lesson ? buildLessonHTML([], usesOf, opts.lesson) : "");
    if (lessonHTML) { els.lesson.innerHTML = lessonHTML; els.lesson.style.display = "block"; } else els.lesson.style.display = "none";
    Editor.setSingleLine((opts.rows || 1) < 2); Editor.setValue(opts.prefill || ""); Editor.clearHint(); Editor.setEnabled(true); Editor.setReadOnly(!!opts.readonly);
    // adaptive ghost text: full answer the first time a concept appears, a blanked
    // skeleton while it is still fresh, nothing once the player knows it
    if (opts.placeholder && !opts.readonly && !opts.prefill && opts.concept) {
      const lvl = Math.min(...[].concat(opts.concept).map(usesOf));
      if (lvl === 0) Editor.setHint(opts.placeholder);
      else if (lvl <= 2) Editor.setHint(skeletonize(opts.placeholder));
    }
    els.hint.hidden = !(opts.placeholder && !opts.readonly && !opts.prefill);
    els.run.disabled = !pyReady; setStatus(pyReady ? "" : "loading Python…", "muted"); Editor.focus();
    if (!pyReady) { const iv = setInterval(() => { if (pyReady) { els.run.disabled = false; setStatus("", "muted"); clearInterval(iv); } }, 120); }
  });
}
async function submit() {
  if (!currentInput || !pyReady) return;
  const { opts, onCode, res } = currentInput;
  const src = Editor.getValue(); lastSrc = src;
  if (!src.trim()) { setStatus("Type something first.", "err"); return; }
  if (opts.requireOp && !src.includes(opts.requireOp)) { setStatus(`Use the “${opts.requireOp}” operator.`, "err"); return; }
  const runSrc = src + (opts.append ? "\n" + opts.append : "");      // append a read-only check to run (not shown/logged)
  let inputval = "";
  if (opts.inputPrompt) inputval = window.prompt(opts.inputPrompt, opts.inputDefault || "") || "";  // interactive input(); may arrive pre-filled to accept
  let r;
  try { r = JSON.parse(runUser(runSrc, opts.seed || "", inputval)); }
  catch (e) { setStatus(String(e.message || e), "err"); return; }
  if (r.err) { setStatus(translate(r.err), "err"); return; }
  const msg = opts.validate ? opts.validate(r) : null;
  if (msg) { setStatus(msg, "err"); return; }
  logCmd(src, true);
  Editor.setEnabled(false); els.run.disabled = true; Editor.setValue(""); els.lesson.style.display = "none";
  els.prompt.textContent = "Watch…"; setStatus("✓", "ok");
  if (Sv && opts.concept) for (const id of [].concat(opts.concept)) Sv.bumpConcept(id); // familiarity grows; scaffolding fades
  awardXP(opts.xp || 10);
  currentInput = null; lastSaid = null; // the pinned NPC line clears once your command runs
  ideClose();
  if (onCode) await onCode(r);
  res(r);
}
// the Proving Grounds board: 8 trials, done-state from the save, Begin links
function openTrialBoard() {
  const board = document.getElementById("trialBoard"), rows = document.getElementById("tboardRows");
  const done = TRIALS.filter((t) => Sv && Sv.isTrialDone(t.id));
  document.getElementById("tboardSub").textContent = `${done.length} / ${TRIALS.length} trials · ${done.reduce((a, t) => a + t.xp, 0)} XP earned`;
  rows.innerHTML = TRIALS.map((t) => {
    const d = Sv && Sv.isTrialDone(t.id);
    return `<div class="trow ${d ? "done" : ""}"><span class="st">${d ? "✓" : "○"}</span>` +
      `<span class="nm">${t.n}. ${t.title}<small>${(CONCEPTS[t.concept] && CONCEPTS[t.concept].link) || t.concept}</small></span>` +
      `<span class="xp">+${t.xp} XP</span><a href="trial.html?t=${t.id}">${d ? "Replay" : "Begin"}</a></div>`;
  }).join("");
  board.hidden = false;
  document.getElementById("tboardClose").onclick = () => (board.hidden = true);
  board.onclick = (e) => { if (e.target === board) board.hidden = true; };
}
function giveItem(item) { inventory.push(item); renderInventory(); els.inventory.hidden = false; }
function renderInventory() {
  els.invItems.innerHTML = inventory.map((it, i) => `<button class="inv-slot" data-i="${i}"><span class="ic">${it.icon}</span><span>${it.name}</span></button>`).join("");
  els.invItems.querySelectorAll(".inv-slot").forEach((b) => (b.onclick = () => { els.noteText.textContent = inventory[+b.dataset.i].note; els.noteModal.hidden = false; }));
}
function logCmd(line, mine) { for (const ln of String(line).split("\n")) { if (!ln.trim()) continue; const d = document.createElement("div"); d.className = mine ? "mine" : "auto"; d.textContent = ln; els.log.appendChild(d); if (window.Journal) window.Journal.noticeLine(ln); } els.log.scrollTop = els.log.scrollHeight; }
function setLocations(names) { if (!els.locations) return; els.locations.innerHTML = names.map((n) => `<div>you.walk("${n}")</div>`).join(""); }
function setStatus(m, k) { els.status.textContent = m; els.status.className = `status ${k}`; if (els.ideDot) els.ideDot.classList.toggle("err", k === "err"); }

// ---------- XP / save (core/save.js, plain script loaded before this module) ----------
const Sv = window.Save || null;
function xpPill() { if (!Sv) return; const s = Sv.load(), lv = document.getElementById("xplv"), f = document.getElementById("xpfill"); if (lv) lv.textContent = "Lv " + Sv.level(s.xp); if (f) f.style.width = (Sv.levelProgress(s.xp) * 100).toFixed(0) + "%"; }
function awardXP(n) {
  if (!Sv) return; const r = Sv.addXP(n); xpPill();
  const wrap = document.body;
  const t = document.createElement("div"); t.className = "xp-toast"; t.textContent = `+${n} XP`; wrap.appendChild(t); setTimeout(() => t.remove(), 1450);
  if (r.leveled) { const l = document.createElement("div"); l.className = "xp-toast lvl"; l.style.top = "27%"; l.textContent = `LEVEL UP! Survivor Lv ${r.level}`; wrap.appendChild(l); setTimeout(() => l.remove(), 1600); }
}
xpPill();
function translate(err) {
  const m = err.match(/name '(\w+)' is not defined/);
  if (m) return `Python doesn't know “${m[1]}”. Strings need quotes (e.g. you.walk("tree")) and variables must be set first.`;
  if (err.includes("SyntaxError")) return "SyntaxError: check quotes, colons and indentation.";
  if (err.includes("IndentationError")) return "IndentationError: the line under a for loop must be indented 4 spaces.";
  return err;
}

// free roam: keep accepting you.walk() until the player heads to the exit
async function freeRoam(locs, exitName, hint) {
  setLocations(locs.concat(exitName));
  while (true) {
    const r = await ask({ prompt: hint, placeholder: `you.walk("${exitName}")`, concept: "walk", validate: (rr) => { if (!rr.walk) return 'Type a you.walk("...") command.'; if (rr.walk !== exitName && !locs.includes(rr.walk)) return `Can't go there. Try: ${locs.concat(exitName).map((l) => `"${l}"`).join(", ")}`; return null; } }, null);
    if (r.walk === exitName) { logCmd(`you.walk("${exitName}")`, true); return; }
    logCmd(`you.walk("${r.walk}")`, true); await goTo(r.walk);
  }
}

// ---------- combat ----------
const mkZom = (f) => ({ x: els.W * f, alive: true, dying: 0, doomed: false, wphase: Math.random() * 6 });
// fire an arrow that actually flies to the nearest un-doomed zombie and kills it on impact
function fireAtNearest() { let best = null, bd = Infinity; for (const z of zoms) { if (!z.alive || z.doomed) continue; const d = Math.abs(z.x - char.x); if (d < bd) { bd = d; best = z; } } if (best) { best.doomed = true; const sx = char.x + char.facing * 18; ARROWS.push({ x: sx, sx, target: best }); shootT = 0.38; } }
function waitForImpact() { return new Promise((res) => { const chk = () => { if (ARROWS.length === 0) res(); else setTimeout(chk, 40); }; setTimeout(chk, 80); }); }
async function clearingCombat() {
  let first = true;
  while (zoms.some((z) => z.alive && !z.doomed)) {
    const left = zoms.filter((z) => z.alive).length;
    await ask({ prompt: `Loose an arrow  (${left} infected)`, placeholder: "bow.fire()", concept: "fire", validate: (r) => (r.fires >= 1 ? null : "Call bow.fire() to shoot.") }, null);
    fireAtNearest();
    if (first) { zombiesApproach = true; first = false; }   // they start advancing after your first shot
    await waitForImpact(); await wait(0.3);
  }
  zombiesApproach = false;
}
async function volley(n) { let i = 0; for (const z of zoms) { if (i >= n) break; i++; if (z.alive) { z.doomed = true; const sx = char.x + char.facing * 18; ARROWS.push({ x: sx, sx, target: z }); shootT = 0.3; await wait(0.24); } } await waitForImpact(); }
async function rescueSurvivor() {
  survivor.state = "falling";
  await anim(0.55, (p) => (survivor.y = -46 * (1 - p) - Math.sin(p * Math.PI) * 8)); // jump down with an arc
  survivor.y = 0; survivor.state = "walking"; survivor.target = char.x + 30; survivor.hideAfter = false;
  await new Promise((res) => (survivor.onArrive = res));
}

// quick scene change
async function fadeTo(name) { await anim(0.4, (p) => (fadeAmt = p)); scene = name; ARROWS = []; if (Sv) { Sv.checkpoint(1, name); Sv.write({ gold: char.gold }); } await anim(0.4, (p) => (fadeAmt = 1 - p)); }
let fadeAmt = 0;

// item / craft FX
let pickupFx = 0, craftFx = 0, bowFx = 0;
function pickup() { pickupFx = 1; char.items = { sticks: 10, string: 3 }; return anim(0.9, (p) => (pickupFx = 1 - p)); }
function craft() { craftFx = 1; char.items = { sticks: 0, string: 0 }; return anim(1.0, (p) => (craftFx = 1 - p)); }
async function bestow() { bowFx = 1; await anim(1.3, (p) => (bowFx = 1 - p)); char.hasBow = true; }
function finish(name) { dialogue = { who: "", text: `Lesson 1 complete. ${name} is armed, blooded, and through the gate. Lesson 1.3 begins inside the keep.` }; awaitAdvance = () => {}; prog(name + " · 1.3 ▸"); }

// ---------- the script (split per scene so DEV can jump between them) ----------
async function play() {
  const start = (location.hash || "").slice(1);
  let name = "survivor";
  const skip = start === "clearing" || start === "castle" || start === "keep" || start === "storage" || start === "camp" || start === "1.3c" || start === "1.4";
  if (!skip) name = await playWildwood();
  else { char.hasBow = true; char.items = { sticks: 0, string: 0 }; scene = start === "1.3c" ? "armory" : start === "1.4" ? "fallencamp" : start; } // hash names match scene names; set sync so the scene shows before the first fade
  if (start === "1.4") { // DEV: the Iron Guard's forward camp, armored up, orders in hand
    questStep = 5; lesson1Done = true; char.gold = 1.3; char.maxHearts = 6; char.hearts = 6;
    for (const k of KIT_PIECES) char.kit[k] = true;
    await playFallenCamp(name); return;
  }
  if (start === "1.3c") { // DEV: straight into the armory booth, paid up and cleared to shop
    questStep = 3; armoryOpen = true; char.gold = 3.8; char.x = els.W * 0.8; char.facing = 1; setupTownsfolk();
    setLocations(["craftsman", "forhire", "blacksmith", "armorsmith", "knight", "chamber", "proving"]);
    await playBeat4(name); await playKeep(name); return;
  }
  if (start === "storage") { scene = "storage"; questStep = 1; char.gold = 2.05; char.x = els.W * 0.06; await playBeat1(name); await playKeep(name); return; } // DEV jump into Beat 1
  if (start === "camp") { scene = "camp"; questStep = 1; char.gold = 2.05; raftCargo = { armor: 1, food: 2, water: 1 }; giveItem(ORDERS_NOTE); await playBeat2(name); await playKeep(name); return; } // DEV jump into Beat 2 (raft already loaded, orders in pack)
  if (start === "keep") { char.gold = 2.05; await playKeep(name); return; }
  if (start !== "castle") name = await playClearing(name);
  else char.gold = 2.55;
  await playCastle(name); // ends by entering the keep (Lesson 1.3)
}

async function playWildwood() {
  scene = "wildwood"; char.x = els.W * 0.14; char.rise = 0; setLocations([]);
  await wait(0.7);
  await say("", "Cold ground. Aching head. You don't remember lying down here.");
  await anim(1.4, (p) => (char.rise = p)); logCmd("you.wake_up()", false);
  await say("", "A figure watches you from the treeline.");
  await autoWalk("stranger");
  await say("Stranger", "Easy now, you're awake. I thought you were one of them.");
  await ask({ prompt: "Speak to the stranger", placeholder: 'print("Where am I?")', concept: "print", task: "Ask the stranger where you are.", validate: nonEmptyOut }, (r) => speech(r.stdout));
  await say("Stranger", "There's been an outbreak. The world ended while you slept. What's your name?");
  let name = "survivor";
  await ask({ prompt: "Tell them your name", placeholder: 'print("...")', concept: "print", task: "Say your name aloud, any name you like. Whatever you print is how the world will know you.", validate: nonEmptyOut }, (r) => { name = firstLine(r.stdout); prog(name); return speech(name); });
  await say("Stranger", `Hello ${name}. You'll need gear. The smith is at the hut.`);
  await autoWalk("smith");
  await say("Smith", "Hold it. You're not one of the infected, are you?");
  await ask({ prompt: "Answer the smith", placeholder: 'print("No")', concept: "print", task: "The smith needs to hear a clear no.", validate: (r) => (r.stdout.toLowerCase().includes("no") ? null : 'Tell them: print("No").') }, (r) => speech(r.stdout));
  await say("Smith", "Good. Gather 10 sticks and 3 string from that tree and I'll craft you a bow.");
  await autoWalk("tree");
  await say("", "Sticks and string lie scattered at the tree's foot. Before you can count things, you need somewhere to keep the count.");
  await ask({
    prompt: "Make two empty pouches: sticks and string", placeholder: "sticks = 0\nstring = 0", rows: 2,
    concept: "variable", task: "Declare two variables named sticks and string, and set each one to 0.",
    validate: (r) => (r.vars.sticks === 0 && r.vars.string === 0 ? null : "Set both to zero:  sticks = 0  and  string = 0."),
  }, null);
  await say("", "That was it. You just declared your first variables: two labelled boxes named sticks and string, each holding 0.");
  await ask({
    prompt: "Gather the sticks and string", placeholder: "sticks = sticks + 10\nstring = string + 3", rows: 2,
    seed: "sticks=0\nstring=0", requireOp: "+",
    concept: "add", task: "Pick up ten sticks and three string. Two ways work: the long way  sticks = sticks + 10  or the shortcut  sticks += 10. Both add into the box.",
    validate: (r) => (r.vars.sticks === 10 && r.vars.string === 3 ? null : "You need  sticks = 10  and  string = 3."),
  }, () => pickup());
  await autoWalk("smith");
  await say("Smith", "Good haul. Speak, and hand them over.");
  await ask({ prompt: "Speak to the smith", placeholder: 'print("Here you go.")', concept: "print", task: "Say something to the smith before you hand the materials over.", validate: nonEmptyOut }, (r) => speech(r.stdout));
  await ask({ prompt: "Hand the materials over", placeholder: "sticks = sticks - 10\nstring = string - 3", rows: 2, seed: "sticks=10\nstring=3", requireOp: "-", concept: ["variable", "subtract"], task: "Hand over all the sticks and string so each count drops to zero.", validate: (r) => (r.vars.sticks === 0 && r.vars.string === 0 ? null : "Subtract so  sticks = 0  and  string = 0.") }, () => craft());
  await bestow();
  await say("Smith", `A bow, and a quiver to match. Now you've a fighting chance, ${name}.`);
  await say("", 'Lesson 1.1 done. You can wander: walk by typing, e.g. you.walk("tree"). When ready, head out: you.walk("lesson1.2").');
  await freeRoam(["stranger", "tree", "smith"], "lesson1.2", 'Wander the Wildwood, or head out: you.walk("lesson1.2")');
  return name;
}

async function playClearing(name) {
  await fadeTo("clearing"); char.x = els.W * 0.1; char.facing = 1; char.hearts = 5; dying = false; invinc = 0; dmgFlash = 0; prog(name + " · 1.2");
  survivor = { x: els.W * 0.72, y: -46, state: "tree", wphase: 0, onArrive: null, hideAfter: false };
  survivorFollow = false; zombiesApproach = false;
  zoms = [mkZom(0.66), mkZom(0.72), mkZom(0.78)];
  await say("Survivor", "HELP! They've got me cornered up here. Please!");
  await say("", "A survivor clings to a high branch; three infected lurk beneath the tree. Get to the marked spot.");
  await ask({ prompt: 'Get to the marked spot', placeholder: 'you.walk("center")', concept: "walk", task: "The marked spot here is called center. Walk there to face the danger.", validate: (r) => (r.walk === "center" ? null : 'Use you.walk("center").') }, null);
  await autoWalk("center");
  await say("", "They rouse and turn on you. Loose an arrow with bow.fire() and keep firing!");
  await clearingCombat();
  await say("", "The last one drops. The survivor swings down from the branch and hurries over.");
  await rescueSurvivor();
  await say("Survivor", "You saved my life. It's not much, but I owe you. Take these.");
  char.gold = 2.55; logCmd("gold = 2.55", false);
  await say("Survivor", "Two coins and fifty-five, that's 2.55 gold. Will you escort me to safety?");
  const ans = await ask({ prompt: 'Answer the survivor', placeholder: 'print("yes")', concept: "print", task: "Answer with a single word, yes or no. Your choice changes what happens next.", validate: (r) => { const s = r.stdout.toLowerCase(); return s.includes("yes") || s.includes("no") ? null : 'Print "yes" or "no".'; } }, (r) => speech(r.stdout));
  if (ans.stdout.toLowerCase().includes("yes")) { survivorFollow = true; await say("Survivor", "Bless you. This way: there's a bridge east. I'll keep close."); }
  else { await say("Survivor", "…I understand. I'll hide. Be careful out there."); survivor.hideAfter = true; survivor.target = els.W * 0.72; survivor.state = "walking"; await new Promise((res) => (survivor.onArrive = res)); await say("", "Night falls fast. You'll need shelter and supplies. A bridge lies to the east."); }
  await freeRoam(["center"], "bridge", 'Cross east when ready: you.walk("bridge")');
  return name;
}

async function playCastle(name) {
  await fadeTo("castle"); char.x = els.W * 0.1; char.facing = 1; zombiesApproach = false; char.hearts = 5; dying = false; invinc = 0; dmgFlash = 0; prog(name + " · 1.2");
  survivor = survivorFollow ? { x: els.W * 0.1 - 30, y: 0, state: "beside", wphase: 0 } : null; // the rescued survivor escorts with you
  zoms = [mkZom(0.44), mkZom(0.51), mkZom(0.58), mkZom(0.65)];
  await say("", "Over the bridge, a great keep rises, and FOUR infected lock onto you at once.");
  await say("", "No time to fire them one by one. Repeat your shot with a loop.");
  if (walkthroughsEnabled() && !walkthroughSeen(WT_FORLOOP.id)) await showWalkthrough(WT_FORLOOP); // in-depth for-loop explainer, once
  await ask({
    prompt: "Fire four arrows at once", placeholder: "for i in range(4):\n    bow.fire()", rows: 2,
    concept: "for-loop", task: "Four enemies, and repeating one line four times is tedious. Write a loop that fires exactly four arrows.",
    validate: (r) => { if (!/for\b/.test(lastSrc) || !/range/.test(lastSrc)) return "Use a for loop with range(...)."; return r.fires === 4 ? null : `That fired ${r.fires} arrow(s). You need exactly 4. Use range(4).`; },
  }, () => volley(4));
  await say("", "Four arrows, four bodies. The gatekeeper watches from the wall.");
  await ask({ prompt: 'Approach the keep', placeholder: 'you.walk("castle")', concept: "walk", task: "Walk up to the keep gate. The destination is called castle.", validate: (r) => (r.walk === "castle" ? null : 'Use you.walk("castle").') }, null);
  await autoWalk("castle");
  const heads = survivorFollow ? 2 : 1;
  const owe = +(0.25 * heads).toFixed(2), left = +(2.55 - owe).toFixed(2);
  await say("Gatekeeper", `Toll's a quarter a head${heads > 1 ? ", and I count two of you" : ""}. How much coin do you carry?`);
  await ask({
    prompt: "Tell the gatekeeper your coin", placeholder: "print(gold)", seed: "gold=2.55",
    concept: "print-var", task: "Print your gold so the gatekeeper sees the amount.",
    validate: (r) => { if (!/gold/.test(lastSrc)) return "Use the gold variable inside print()."; return r.stdout.includes("2.55") ? null : "Print your gold. It should show 2.55."; },
  }, (r) => speech(r.stdout));
  await say("Gatekeeper", `A quarter a head: ${heads} head${heads > 1 ? "s" : ""}, ${owe.toFixed(2)} coin. Name the price, then pay it.`);
  await ask({
    prompt: "Name the toll, then pay it",
    placeholder: heads > 1 ? "CONST_QUARTER = 0.25\ngold = gold - CONST_QUARTER * 2" : "CONST_QUARTER = 0.25\ngold = gold - CONST_QUARTER",
    rows: 2, seed: "gold=2.55", requireOp: "-",
    concept: ["constant", "subtract"], task: "Name the quarter coin toll as a constant, then subtract it from your gold to pay. If the gate counts two of you, multiply the toll before you subtract.",
    validate: (r) => { if (!/CONST_QUARTER/.test(lastSrc)) return "Define CONST_QUARTER = 0.25 and use it."; if (Number(r.vars.CONST_QUARTER) !== 0.25) return "CONST_QUARTER should be 0.25."; return Math.abs(Number(r.vars.gold) - left) < 0.001 ? null : `Pay ${owe.toFixed(2)} so that gold = ${left.toFixed(2)}.`; },
  }, () => { char.gold = left; logCmd(`gold = ${left.toFixed(2)}`, true); });
  await say("Gatekeeper", "Paid in full. Welcome to the keep. Mind the curfew.");
  await playKeep(name);
}

// ---------- update + render ----------
function loop() { requestAnimationFrame(function f() { const now = performance.now(); const dt = Math.min(0.05, (now - lastMs) / 1000); lastMs = now; try { update(dt); draw(now / 1000); } catch (e) { els.prompt.textContent = "render error: " + (e.message || e); } requestAnimationFrame(f); }); }
function update(dt) {
  for (const tw of tweens) { tw.t += dt; tw.fn(Math.min(1, tw.t / tw.dur)); if (tw.t >= tw.dur) { tw.res(); tw.done = true; } }
  for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].done) tweens.splice(i, 1);
  if (char.walking) { const dx = char.target - char.x, step = 160 * dt; if (Math.abs(dx) <= step) { char.x = char.target; char.walking = false; char.walk = 0; const r = char.onArrive; char.onArrive = null; if (r) r(); } else { char.x += Math.sign(dx) * step; char.walk += dt * 9; char.facing = Math.sign(dx); } }
  if (char.bubbleT > 0) { char.bubbleT -= dt; if (char.bubbleT <= 0) char.bubble = null; }
  // arrows fly to their target and kill on impact
  for (const a of ARROWS) {
    const dir = Math.sign(a.target.x - a.x) || 1; a.x += dir * 320 * dt;
    if (Math.abs(a.x - a.target.x) < 10) {
      a.hit = true; a.target.alive = false; a.target.dying = 1; a.target.fall = dir; // fall away from the shot
      for (let i = 0; i < 9; i++) FX.push({ x: a.target.x, y: els.H * 0.74 - 16 - Math.random() * 14, vx: dir * (20 + Math.random() * 70) * (Math.random() < 0.3 ? -0.4 : 1), vy: -40 - Math.random() * 80, t: 0.55 + Math.random() * 0.3, col: Math.random() < 0.5 ? "#8a9a6a" : "#5c6b44" });
    }
  }
  ARROWS = ARROWS.filter((a) => !a.hit);
  shootT = Math.max(0, shootT - dt);
  for (const p of FX) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 380 * dt; }
  FX = FX.filter((p) => p.t > 0);
  for (const z of zoms) {
    if (!z.alive && z.dying > 0) z.dying = Math.max(0, z.dying - dt * 1.1);
    if (z.alive && zombiesApproach) { z.x += Math.sign(char.x - z.x) * 24 * dt; z.wphase += dt * 7; } // slow shamble toward you
  }
  // survivor jump-down + walk-over (or walk back to hide)
  if (survivor && (survivor.state === "walking")) {
    const dx = survivor.target - survivor.x, st = 120 * dt; survivor.wphase += dt * 9;
    if (Math.abs(dx) <= st) { survivor.x = survivor.target; survivor.state = survivor.hideAfter ? "hiding" : "beside"; const r = survivor.onArrive; survivor.onArrive = null; if (r) r(); }
    else survivor.x += Math.sign(dx) * st;
  }
  if (survivor && survivor.state === "beside" && survivorFollow) { const tx = char.x - 34 * char.facing; if (Math.abs(survivor.x - tx) > 4) { survivor.x += Math.sign(tx - survivor.x) * 110 * dt; survivor.wphase += dt * 9; } } // trail BEHIND the hero, never in the firing line
  // a zombie that reaches you deals 1 heart of damage, then is knocked back
  if (invinc > 0) invinc -= dt;
  if (dmgFlash > 0) dmgFlash -= dt * 2;
  if (zombiesApproach && invinc <= 0 && !dying) {
    for (const z of zoms) {
      if (z.alive && Math.abs(z.x - char.x) < 16) { char.hearts -= 1; invinc = 1.1; dmgFlash = 1; z.x += Math.sign(z.x - char.x || 1) * 42; if (char.hearts <= 0) die(); break; }
    }
  }
  // keep: townsfolk wander and pause to chat
  if (scene === "keep") for (const w of townsfolk) {
    if (w.paused > 0) { w.paused -= dt; if (w.bubbleT > 0) { w.bubbleT -= dt; if (w.bubbleT <= 0) w.bubble = null; } }
    else {
      w.x += w.dir * w.speed * dt / els.W; w.wphase += dt * 8;
      if (w.x < 0.1) { w.x = 0.1; w.dir = 1; } if (w.x > 0.9) { w.x = 0.9; w.dir = -1; }
      w.nextPause -= dt;
      if (w.nextPause <= 0) { w.paused = 2 + Math.random() * 3; w.nextPause = 4 + Math.random() * 4; if (Math.random() < 0.6) { w.bubble = CHAT[Math.floor(Math.random() * CHAT.length)]; w.bubbleT = w.paused; } }
    }
  }
}
function die() { if (dying) return; dying = true; zombiesApproach = false; location.hash = scene; setTimeout(() => location.reload(), 1300); }

// ---- the keep interior (Lesson 1.3) ----
const CHAT = ["Stay sharp.", "Heard the east wall held.", "Trade's slow today.", "You new here?", "Mind the curfew.", "Any word from the south?", "Gold's tight this week.", "...", "Keep your blade close."];
const KEEP_LABEL = { craftsman: "CRAFTSMAN", forhire: "FOR HIRE", blacksmith: "BLACKSMITH", armorsmith: "ARMORSMITH" };
const KEEP_VENDOR = { craftsman: ["Craftsman", "Need something built? Come back when I'm open for trade."], forhire: ["For Hire", "Looking for hired steel? Soon, friend."], blacksmith: ["Blacksmith", "I'll forge you a finer bow once my shop's running."], armorsmith: ["Armorsmith", "Armour to keep the bites out. Wares coming soon."] };
const LOCKED_STALL = {
  craftsman: ["Craftsman", "Bench is shuttered until the guild grants my licence. Later in your training, scout."],
  forhire: ["For Hire", "No contracts posted for the likes of you yet. Come back when your name carries further."],
  blacksmith: ["Blacksmith", "Forge is cold for now. The armorsmith next door can kit you out."],
};
// a small padlock badge drawn over anything still locked
function lockBadge(c, x, y) {
  c.fillStyle = "rgba(7,11,17,0.6)"; rr(c, x - 14, y - 14, 28, 30, 6); c.fill();
  c.fillStyle = "#caa000"; rr(c, x - 8, y - 2, 16, 13, 2); c.fill();
  c.strokeStyle = "#caa000"; c.lineWidth = 3; c.beginPath(); c.arc(x, y - 2, 5, Math.PI, 0); c.stroke();
  px(c, x - 1, y + 2, 2, 5, "#3a2c10");
}
const circ = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
function setupTownsfolk() {
  townsfolk = [];
  const COLORS = ["#7048e8", "#1971c2", "#2f9e44", "#a04826", "#5b626b", "#9c36b5", "#c2410c"];
  for (let i = 0; i < 1; i++) townsfolk.push({ x: 0.15 + Math.random() * 0.7, dir: Math.random() < 0.5 ? -1 : 1, speed: 26 + Math.random() * 16, cloth: COLORS[i % COLORS.length], skin: Math.random() < 0.5 ? "#d8a878" : "#c89060", hair: ["#3a2c18", "#1c1c1c", "#6e4a22"][Math.floor(Math.random() * 3)], wphase: Math.random() * 6, paused: 0, bubble: null, bubbleT: 0, nextPause: 2 + Math.random() * 4 });
}
function townBody(c, x, y, w) {
  const sw = w.paused > 0 ? 0 : Math.sin(w.wphase) * 4;
  const t = performance.now() / 1000, bob = w.paused > 0 ? Math.sin(t * 1.7 + w.wphase) * 0.7 : Math.abs(Math.cos(w.wphase)) * 1.1;
  const ty = y - bob, f = w.dir || -1;
  // legs + boots (step swing while walking)
  px(c, x - 4, y - 4 + sw, 4, 12, "#2a2018"); px(c, x + 1, y - 4 - sw, 4, 12, "#2a2018");
  px(c, x - 4, y + 5 + sw, 4, 3, "#100b08"); px(c, x + 1, y + 5 - sw, 4, 3, "#100b08");
  // tunic with moonlit edge + belt
  px(c, x - 6, ty - 24, 12, 20, w.cloth); px(c, x - 6, ty - 24, 3, 20, "rgba(255,255,255,0.14)");
  px(c, x - 6, ty - 9, 12, 3, "#3a2c18");
  // swinging arms with hands
  const asw = w.paused > 0 ? 0 : Math.sin(w.wphase) * 3;
  px(c, x - 8, ty - 22 + asw, 3, 11, w.cloth); px(c, x + 5, ty - 22 - asw, 3, 11, w.cloth);
  px(c, x - 8, ty - 12 + asw, 3, 2, w.skin); px(c, x + 5, ty - 12 - asw, 3, 2, w.skin);
  // head: fringe + eye toward walking direction
  px(c, x - 5, ty - 35, 11, 11, w.skin); px(c, x - 6, ty - 37, 12, 4, w.hair);
  px(c, x - 6 + (f > 0 ? 0 : 8), ty - 35, 4, 3, w.hair);
  px(c, x + f * 2 - 1, ty - 31, 2, 2, "#1c1208");
}
function stallBody(c, x, y, type, now) {
  const cloth = { craftsman: "#8a6d3b", forhire: "#3d5a3d", blacksmith: "#3a3a42", armorsmith: "#5b626b" }[type];
  const awn = { craftsman: "#2f9e44", forhire: "#1971c2", blacksmith: "#e03131", armorsmith: "#9c36b5" }[type];
  const idle = Math.sin(now * 1.6 + x * 3) * 0.8; // vendor sways gently
  // back panel + corner posts holding the awning up
  px(c, x - 21, y - 38, 42, 28, "#241c11"); px(c, x - 21, y - 38, 42, 2, "#3a2c18");
  px(c, x - 23, y - 40, 4, 40, "#5a4424"); px(c, x + 19, y - 40, 4, 40, "#5a4424");
  px(c, x - 23, y - 40, 2, 40, "#7a5a30"); px(c, x + 19, y - 40, 2, 40, "#7a5a30");
  // striped awning with a scalloped hem
  for (let s = -24; s < 24; s += 6) px(c, x + s, y - 46, 6, 8, ((s / 6) | 0) % 2 ? awn : "#f1f3f5");
  for (let s = -24; s < 24; s += 6) { c.fillStyle = ((s / 6) | 0) % 2 ? awn : "#f1f3f5"; c.beginPath(); c.arc(x + s + 3, y - 38, 3, 0, Math.PI); c.fill(); }
  px(c, x - 25, y - 47, 50, 2, "#8a6d3b"); // awning ridge
  // hanging sign under the hem
  px(c, x - 6, y - 34, 12, 9, "#6b4f2a"); px(c, x - 6, y - 34, 12, 2, "#8a6d3b"); px(c, x - 1, y - 36, 2, 3, "#3a2c18");
  px(c, x - 4, y - 31, 8, 4, awn);
  // the vendor behind the counter (bobbing)
  px(c, x - 4, y - 22 + idle, 8, 14, cloth); px(c, x - 3, y - 29 + idle, 7, 7, "#d8a878"); px(c, x - 4, y - 31 + idle, 8, 3, "#3a2c18");
  // counter: top + front planks + shadow
  px(c, x - 18, y - 8, 36, 3, "#8a6d3b"); px(c, x - 18, y - 5, 36, 6, "#6b4f2a");
  for (let s = -18; s < 18; s += 9) px(c, x + s, y - 5, 1, 6, "#4a3a22");
  px(c, x - 18, y + 1, 36, 2, "rgba(0,0,0,0.35)");
  // wares per trade
  if (type === "blacksmith") {
    px(c, x - 14, y - 12, 8, 4, "#2b2b30"); px(c, x - 12, y - 14, 4, 2, "#3a3a42"); // anvil on the counter
    const fl = 0.6 + 0.4 * Math.sin(now * 12); c.shadowColor = "#ff6b3d"; c.shadowBlur = 12 * fl; circ(c, x + 12, y - 12, 4 * fl, "#ff6b3d"); circ(c, x + 12, y - 13, 2.5 * fl, "#ffe066"); c.shadowBlur = 0; // forge glow
  } else if (type === "armorsmith") {
    px(c, x + 12, y - 26, 3, 18, "#4a4a4a"); px(c, x + 8, y - 24, 9, 8, "#9aa3ad"); px(c, x + 9, y - 32, 7, 6, "#9aa3ad"); // armour stand
    px(c, x - 15, y - 13, 8, 5, "#9aa3ad"); px(c, x - 13, y - 15, 4, 2, "#7a828c"); // helmet on the counter
  } else if (type === "forhire") {
    px(c, x - 15, y - 12, 9, 4, "#e8dcc0"); px(c, x - 15, y - 12, 9, 1, "#c9b89a"); // rolled scroll
    px(c, x + 8, y - 12, 7, 4, "#caa24a"); circ(c, x + 11, y - 13, 2, "#ffd43b"); // coin pouch
  } else {
    px(c, x - 15, y - 13, 3, 5, "#9c6b3f"); px(c, x - 16, y - 15, 5, 2, "#7a828c"); // hammer
    px(c, x + 7, y - 12, 9, 4, "#8a6d3b"); px(c, x + 7, y - 13, 9, 1, "#a9844a"); // planks
  }
}
// the quest-giver: a knight in plate, standing watch
function knight(c, x, y, now) {
  y += Math.sin(now * 1.4) * 1; // subtle idle
  px(c, x - 14, y - 24, 7, 17, "#3a5a8a"); px(c, x - 14, y - 24, 7, 3, "#5a7aaa"); px(c, x - 11, y - 18, 3, 6, "#a8832a"); // shield
  px(c, x - 4, y - 4, 4, 12, "#5a626b"); px(c, x + 1, y - 4, 4, 12, "#5a626b"); // legs
  px(c, x - 8, y - 27, 16, 24, "#7a828c"); px(c, x - 8, y - 27, 16, 4, "#9aa3ad"); px(c, x - 5, y - 23, 10, 15, "#6a727c"); // breastplate
  px(c, x - 8, y - 9, 16, 3, "#3a2c18"); // belt
  px(c, x + 9, y - 32, 3, 28, "#b8c2cc"); px(c, x + 7, y - 6, 7, 3, "#a8832a"); px(c, x + 10, y - 34, 1, 4, "#dde4ea"); // sword
  px(c, x - 7, y - 41, 14, 14, "#8a929c"); px(c, x - 7, y - 33, 14, 3, "#23262b"); px(c, x - 7, y - 43, 14, 3, "#9aa3ad"); // helmet + visor
  px(c, x - 1, y - 49, 3, 8, "#c0392b"); px(c, x - 3, y - 51, 6, 4, "#e0503e"); // plume
}
function drawKeep(c, W, gy, now) {
  const H = els.H;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#171a24"); g.addColorStop(1, "#1f2330"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  px(c, 0, H * 0.14, W, 5, "#a8832a"); px(c, 0, H * 0.14 + 5, W, 2, "#ffd43b"); // gold trim
  for (let i = 0; i < 6; i++) { const cx = W * (0.08 + i * 0.17); px(c, cx - 11, 0, 22, gy + 30, "#2c303b"); px(c, cx - 14, 0, 28, 9, "#3a3f4b"); px(c, cx - 14, gy + 22, 28, 10, "#3a3f4b"); }
  for (const fx of [0.165, 0.335, 0.675, 0.845]) { // royal banners hanging between the columns
    const bx2 = W * fx, bw = 26, bt = H * 0.14 + 9;
    px(c, bx2 - bw / 2 - 2, bt, bw + 4, 3, "#a8832a");
    c.fillStyle = "#6e1d1d"; c.beginPath(); c.moveTo(bx2 - bw / 2, bt + 3); c.lineTo(bx2 + bw / 2, bt + 3); c.lineTo(bx2 + bw / 2, bt + 52); c.lineTo(bx2, bt + 64); c.lineTo(bx2 - bw / 2, bt + 52); c.closePath(); c.fill();
    px(c, bx2 - bw / 2, bt + 3, 3, 50, "#8a2a2a"); c.fillStyle = "#d9b23a"; c.beginPath(); c.arc(bx2, bt + 28, 6, 0, Math.PI * 2); c.fill(); px(c, bx2 - 1, bt + 24, 2, 9, "#6e1d1d");
  }
  for (let x = 0; x < W; x += 30) px(c, x, gy, 30, H - gy, (x / 30 | 0) % 2 ? "#2a2d36" : "#262931");
  px(c, W * 0.43, gy - 2, W * 0.14, H - gy + 2, "#6e1d1d"); px(c, W * 0.43, gy - 2, W * 0.14, 3, "#a8832a"); // carpet leading to the stairs
  // central staircase rising to the king's chamber (sealed until Lesson 1 is done)
  { const sx = W * 0.5, steps = 6, sh = 9;
    for (let i = 0; i < steps; i++) { const ww = 96 - i * 11, yy = gy - i * sh; px(c, sx - ww / 2, yy - sh, ww, sh, i % 2 ? "#3a3f47" : "#434953"); px(c, sx - ww / 2, yy - sh, ww, 2, "#525a64"); px(c, sx - 15, yy - sh, 30, sh, "#7a1d1d"); px(c, sx - 15, yy - sh, 30, 2, "#a8832a"); }
    const topY = gy - steps * sh;
    px(c, sx - 24, topY - 50, 48, 50, "#15100a"); c.fillStyle = "#15100a"; c.beginPath(); c.arc(sx, topY - 50, 24, Math.PI, 0); c.fill();
    c.strokeStyle = "#a8832a"; c.lineWidth = 3; c.beginPath(); c.moveTo(sx - 24, topY); c.lineTo(sx - 24, topY - 50); c.arc(sx, topY - 50, 24, Math.PI, 0); c.lineTo(sx + 24, topY); c.stroke();
    if (!chamberUnlocked) {
      c.fillStyle = "#caa000"; rr(c, sx - 8, topY - 26, 16, 13, 2); c.fill(); c.strokeStyle = "#caa000"; c.lineWidth = 3; c.beginPath(); c.arc(sx, topY - 26, 5, Math.PI, 0); c.stroke(); px(c, sx - 1, topY - 20, 2, 5, "#3a2c10");
      c.fillStyle = "#ff9a9a"; c.font = "10px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText("SEALED", sx, gy + 16);
    } else { c.fillStyle = "#ffe066"; c.font = "10px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText("KING'S CHAMBER", sx, gy + 16); }
    c.font = "11px 'IBM Plex Mono',monospace"; const cmd = 'you.walk("chamber")', cw = c.measureText(cmd).width, cy = topY - 64;
    c.fillStyle = "rgba(8,12,18,0.8)"; rr(c, sx - cw / 2 - 7, cy - 12, cw + 14, 18, 5); c.fill(); c.strokeStyle = "#3a3018"; c.stroke(); c.fillStyle = "#9fd9ff"; c.textAlign = "center"; c.fillText(cmd, sx, cy + 1);
  }
  // the drillmaster of the proving grounds (red-plumed trooper, front floor)
  { const dx = W * SCENES.keep.proving;
    P(c, dx, gy, (cc) => { soldier(cc, 0, 0, 1); px(cc, -2, -40, 4, 6, "#c2352e"); px(cc, -1, -44, 2, 5, "#c2352e"); }); // plume
    c.font = "11px 'IBM Plex Mono',monospace"; c.textAlign = "center";
    const cmd = 'you.walk("proving")', cw2 = c.measureText(cmd).width, cy2 = gy - 49 * CH - 8;
    c.fillStyle = "rgba(8,12,18,0.8)"; rr(c, dx - cw2 / 2 - 7, cy2 - 12, cw2 + 14, 18, 5); c.fill(); c.strokeStyle = "#2a3a4a"; c.stroke(); c.fillStyle = "#9fd9ff"; c.fillText(cmd, dx, cy2 + 1);
    c.fillStyle = "#cdd8e6"; c.font = "10px 'IBM Plex Mono',monospace"; c.fillText("PROVING GROUNDS", dx, gy + 18);
    if (provingUnlocked) { c.fillStyle = "#7ec9ff"; c.font = "bold 20px 'Chakra Petch',sans-serif"; c.fillText("⚔", dx, cy2 - 20 + Math.sin(now * 3 + 1) * 3); }
    else lockBadge(c, dx + 26, gy - 30 * CH);
  }
  // the road out, marked at the west door once your orders point there
  if (questStep >= 5) {
    const rx3 = W * SCENES.keep.road;
    c.font = "11px 'IBM Plex Mono',monospace"; c.textAlign = "center";
    const cmd3 = 'you.walk("road")', cw3 = c.measureText(cmd3).width;
    c.fillStyle = "rgba(8,12,18,0.8)"; rr(c, rx3 + 30 - cw3 / 2 - 7, gy - 90, cw3 + 14, 18, 5); c.fill(); c.strokeStyle = "#2a3a4a"; c.stroke(); c.fillStyle = "#9fd9ff"; c.fillText(cmd3, rx3 + 30, gy - 77);
    c.fillStyle = "#ffd43b"; c.font = "bold 20px 'Chakra Petch',sans-serif"; c.fillText("!", rx3 + 30, gy - 98 + Math.sin(now * 3) * 3);
    c.fillStyle = "#cdd8e6"; c.font = "10px 'IBM Plex Mono',monospace"; c.fillText("THE ROAD", rx3 + 30, gy + 18);
  }
  for (const [name, frac] of Object.entries(SCENES.keep)) {
    if (name === "knight" || name === "chamber" || name === "proving" || name === "road") continue; // drawn separately
    const x = W * frac;
    P(c, x, gy, (cc) => stallBody(cc, 0, 0, name, now));
    // command hint above the stall — teaches how to walk there
    c.font = "11px 'IBM Plex Mono',monospace"; c.textAlign = "center";
    const cmd = `you.walk("${name}")`, cw = c.measureText(cmd).width, cy = gy - 40 * CH - 18;
    c.fillStyle = "rgba(8,12,18,0.78)"; rr(c, x - cw / 2 - 7, cy - 12, cw + 14, 18, 5); c.fill();
    c.strokeStyle = "#2a3a4a"; c.stroke(); c.fillStyle = "#9fd9ff"; c.fillText(cmd, x, cy + 1);
    // name label below; locked stalls wear a padlock until later chapters
    c.fillStyle = "#cdd8e6"; c.font = "10px 'IBM Plex Mono',monospace"; c.fillText(KEEP_LABEL[name], x, gy + 18);
    if (name !== "armorsmith") lockBadge(c, x, gy - 24 * CH);
  }
  for (const bx of [W * 0.1, W * 0.82]) { px(c, bx - 4, gy - 26, 8, 20, "#a8832a"); const fl = 0.6 + 0.4 * Math.sin(now * 12 + bx); c.shadowColor = "#ffb14d"; c.shadowBlur = 18 * fl; circ(c, bx, gy - 28, 7 * fl, "#ffb14d"); circ(c, bx, gy - 29, 4 * fl, "#ffe066"); c.shadowBlur = 0; }
  // townsfolk — bubbles raised above the (scaled) heads so they don't clip
  for (const w of townsfolk) { P(c, w.x * W, gy, (cc) => townBody(cc, 0, 0, w)); if (w.bubble && !dialogue && !(currentInput && lastSaid)) bubble(c, w.x * W, gy - 37 * CH - 4, w.bubble); } // chatter yields to story dialogue
  // the knight-captain (quest giver), far right, with a quest marker + walk hint
  { const kx = W * SCENES.keep.knight; P(c, kx, gy, (cc) => knight(cc, 0, 0, now));
    c.font = "11px 'IBM Plex Mono',monospace"; c.textAlign = "center"; const cmd = 'you.walk("knight")', cw = c.measureText(cmd).width, cy = gy - 49 * CH - 8;
    c.fillStyle = "rgba(8,12,18,0.8)"; rr(c, kx - cw / 2 - 7, cy - 12, cw + 14, 18, 5); c.fill(); c.strokeStyle = "#5a4a18"; c.stroke(); c.fillStyle = "#ffd98a"; c.fillText(cmd, kx, cy + 1);
    // quest marker only when the knight actually has something for you
    if (questStep === 0 || questStep === 2 || questStep === 4) { c.fillStyle = "#ffd43b"; c.font = "bold 22px 'Chakra Petch',sans-serif"; c.fillText("!", kx, cy - 18 + Math.sin(now * 3) * 3); }
    // and it moves to the armorsmith while the shopping task is his
    if (armoryOpen && questStep === 3) { const ax2 = W * SCENES.keep.armorsmith; c.fillStyle = "#ffd43b"; c.font = "bold 22px 'Chakra Petch',sans-serif"; c.fillText("!", ax2, gy - 44 * CH + Math.sin(now * 3) * 3); } }
  if (survivor) P(c, survivor.x, gy, (cc) => npc(cc, 0, 0, "#37b24d", "#c89060", "#241018")); // the escorted survivor saying goodbye
}
// ---- the Iron Guard's forward camp, destroyed (Lesson 1.4 investigation) ----
function fallenGuard(c, x, y, f = 1) { // a guard where he fell
  c.save(); c.translate(x, y); c.scale(f * 1.55, 1.55); // same scale as the living
  px(c, -10, -5, 20, 5, "#4a5568"); px(c, -10, -5, 20, 2, "#525f73"); // torso, lying
  px(c, -8, -8, 8, 4, "#4a5568"); // shoulder
  px(c, -17, -4, 7, 3, "#c89a72"); // arm flung out
  px(c, 10, -4, 8, 3, "#2f3a2a"); px(c, 16, -3, 4, 3, "#100b08"); // legs + boot
  px(c, -15, -8, 6, 5, "#c89a72"); // head, turned away
  px(c, -23, -7, 7, 5, "#7a828c"); px(c, -23, -7, 7, 2, "#9aa3ad"); // helm, rolled off
  c.restore();
}
function drawFallenCamp(c, W, gy, now) {
  const H = els.H;
  // pre-dawn: cold grey light rising behind the treeline
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#181f2c"); g.addColorStop(0.55, "#26303e"); g.addColorStop(0.78, "#37414a"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 24; i++) { c.globalAlpha = 0.15 + (i * 37 % 10) / 40; px(c, (i * 89) % W, (i * 53) % (H * 0.3), 2, 2, "#cfe0f5"); } c.globalAlpha = 1;
  c.fillStyle = "#131c16"; // dark treeline
  for (let i = 0; i < Math.ceil(W / 60) + 1; i++) { const x = i * 60 + ((i * 37) % 22), h = 42 + ((i * 53) % 34); c.beginPath(); c.moveTo(x - 34, gy); c.lineTo(x, gy - h); c.lineTo(x + 34, gy); c.closePath(); c.fill(); }
  // dead grass
  for (let i = 0; i * 26 < W; i++) px(c, i * 26, gy, 26, H - gy, i % 2 ? "#2c3a2c" : "#28342a");
  px(c, 0, gy, W, 3, "#3a4a3a");
  // palisade smashed INWARD at the gate; intact stretches either side
  for (let p = 0; p < W; p += 13) {
    const fx = p / W;
    if (fx > 0.06 && fx < 0.17) continue; // the breach
    const h = 30 + ((p * 7) % 7); px(c, p, gy - h, 11, h + 2, ((p / 13 | 0) % 2) ? "#3f3220" : "#463928");
    c.fillStyle = ((p / 13 | 0) % 2) ? "#3f3220" : "#463928"; c.beginPath(); c.moveTo(p, gy - h); c.lineTo(p + 5.5, gy - h - 7); c.lineTo(p + 11, gy - h); c.closePath(); c.fill();
  }
  // splintered stakes thrown inward at the breach
  for (const [sx2, rot] of [[W * 0.1, 0.9], [W * 0.13, -1.2], [W * 0.16, 0.5]]) { c.save(); c.translate(sx2, gy - 4); c.rotate(rot); px(c, -4, -20, 8, 24, "#3f3220"); c.fillStyle = "#3f3220"; c.beginPath(); c.moveTo(-4, -20); c.lineTo(0, -28); c.lineTo(4, -20); c.fill(); c.restore(); }
  // the storehouse, brought down: broken stone walls, crossed roof beams, a rubble heap
  { const sx3 = W * 0.76;
    px(c, sx3 - 58, gy - 34, 10, 34, "#4e555e"); px(c, sx3 - 58, gy - 34, 10, 3, "#5d656f"); // standing corner
    px(c, sx3 - 58, gy - 12, 24, 12, "#4a5058"); px(c, sx3 + 34, gy - 20, 22, 20, "#4e555e"); px(c, sx3 + 34, gy - 20, 22, 3, "#5d656f"); // wall stumps
    c.save(); c.translate(sx3 - 20, gy - 2); c.rotate(0.5); px(c, -3, -52, 6, 52, "#33271a"); c.restore(); // fallen beams
    c.save(); c.translate(sx3 + 14, gy - 4); c.rotate(-0.7); px(c, -3, -46, 6, 46, "#3a2c1c"); c.restore();
    for (let i = 0; i < 9; i++) { const rx4 = sx3 - 34 + (i * 41) % 64, ry4 = gy - 6 - (i * 17) % 16; px(c, rx4, ry4, 10 + (i % 3) * 4, 8, i % 2 ? "#454c55" : "#4e555e"); } // rubble heap
    drawSack(c, sx3 - 44, gy + 6, "#8a6d3b"); px(c, sx3 - 50, gy + 2, 16, 3, "#c9b89a"); // spilled grain
    if (!tamFreed && Math.sin(now * 2.2) > 0.75) px(c, sx3 + 2, gy - 20, 3, 3, "#e8dcc0"); // a knuckle rapping from beneath
    if (tamFreed) { // Tam, out of the rubble: a clerk, no armor, satchel hugged tight
      const tx4 = sx3 - 14; c.save(); c.translate(tx4, gy); c.scale(CH, CH);
      px(c, -4, -4, 4, 10, "#4a3a26"); px(c, 1, -4, 4, 10, "#4a3a26"); px(c, -4, 4, 4, 3, "#241a10"); px(c, 1, 4, 4, 3, "#241a10");
      px(c, -6, -22, 12, 18, "#8a6d3b"); px(c, -6, -22, 3, 18, "rgba(255,255,255,0.12)");
      px(c, -8, -14, 7, 9, "#5a4426"); px(c, -8, -14, 7, 2, "#6e5430"); // the satchel, held to his chest
      px(c, -5, -32, 11, 11, "#d8a878"); px(c, -6, -34, 12, 4, "#6e4a22"); px(c, -2, -28, 2, 2, "#1c1208");
      c.restore(); }
  }
  // collapsed watchtower: snapped legs, platform down in the grass
  { const wx2 = W * 0.9;
    px(c, wx2 - 20, gy - 40, 6, 40, "#33271a"); px(c, wx2 + 16, gy - 26, 6, 26, "#33271a"); // snapped stumps
    c.save(); c.translate(wx2, gy - 6); c.rotate(0.22);
    px(c, -30, -8, 60, 10, "#54422a"); for (let r = -28; r < 30; r += 11) px(c, r, -18, 3, 10, "#4a3a22");
    c.restore();
    c.save(); c.translate(wx2 - 34, gy - 30); c.rotate(-0.5); px(c, 0, 0, 5, 34, "#3f3220"); c.restore(); }
  // burned tents: charred frames, canvas scraps
  for (const [tx, s] of [[W * 0.26, 1], [W * 0.58, 0.9]]) {
    c.strokeStyle = "#1c1812"; c.lineWidth = 4;
    c.beginPath(); c.moveTo(tx - 24 * s, gy); c.lineTo(tx, gy - 38 * s); c.moveTo(tx + 24 * s, gy); c.lineTo(tx + 4 * s, gy - 32 * s); c.stroke();
    c.fillStyle = "#241f18"; c.beginPath(); c.moveTo(tx - 20 * s, gy); c.lineTo(tx - 4 * s, gy - 22 * s); c.lineTo(tx + 8 * s, gy); c.closePath(); c.fill();
    for (let i = 0; i < 3; i++) px(c, tx - 16 + i * 12, gy - 2, 8, 3, "#1c1812"); // ash
  }
  // the command tent, shredded but standing (clue point)
  { const tx = W * 0.63;
    c.fillStyle = "#5a4a34"; c.beginPath(); c.moveTo(tx - 34, gy); c.lineTo(tx, gy - 52); c.lineTo(tx + 34, gy); c.closePath(); c.fill();
    c.fillStyle = "#4a3d2a"; c.beginPath(); c.moveTo(tx - 34, gy); c.lineTo(tx, gy - 52); c.lineTo(tx - 8, gy); c.closePath(); c.fill();
    c.fillStyle = "#191308"; c.beginPath(); c.moveTo(tx - 10, gy); c.lineTo(tx, gy - 24); c.lineTo(tx + 10, gy); c.closePath(); c.fill();
    c.strokeStyle = "#191308"; c.lineWidth = 2; // slash marks
    c.beginPath(); c.moveTo(tx + 8, gy - 40); c.lineTo(tx + 20, gy - 14); c.moveTo(tx + 14, gy - 38); c.lineTo(tx + 26, gy - 16); c.stroke(); }
  // overturned cart, spilled goods
  { const cx2 = W * 0.44;
    c.save(); c.translate(cx2, gy - 8); c.rotate(-0.35); px(c, -30, -14, 60, 20, "#4a3a26"); px(c, -30, -16, 60, 4, "#5d4a30"); c.restore();
    c.strokeStyle = "#3a2c1c"; c.lineWidth = 4; c.beginPath(); c.arc(cx2 + 26, gy - 20, 12, 0, Math.PI * 2); c.stroke();
    drawCrate(c, cx2 - 48, gy - 12, 20, 14); drawBarrel(c, cx2 - 62, gy, 15, 18); }
  // the Iron Guard's standard, down in the mud, torn
  { const bx2 = W * 0.5; c.save(); c.translate(bx2, gy - 2); c.rotate(1.25); px(c, -2, -46, 4, 46, "#3a2c18"); c.restore();
    c.fillStyle = "#6e1d1d"; c.beginPath(); c.moveTo(bx2 + 28, gy - 16); c.lineTo(bx2 + 52, gy - 10); c.lineTo(bx2 + 46, gy - 2); c.lineTo(bx2 + 34, gy - 6); c.closePath(); c.fill(); }
  // the dead fire, one thin wisp of smoke still rising (clue point)
  { const fx2 = W * 0.5;
    for (let i = 0; i < 5; i++) px(c, fx2 - 12 + i * 5, gy + 4, 4, 3, "#3a4048");
    c.fillStyle = "#26201a"; c.beginPath(); c.arc(fx2, gy + 2, 6, 0, Math.PI * 2); c.fill();
    const t = (now * 0.25) % 1; c.globalAlpha = 0.25 * (1 - t); circ(c, fx2 + Math.sin(now * 1.2) * 5, gy - 8 - t * 40, 4 + t * 6, "#aab6c4"); c.globalAlpha = 1; }
  // body after body: the Iron Guard where they fell
  fallenGuard(c, W * 0.2, gy + 6, 1); fallenGuard(c, W * 0.3, gy + 12, -1); fallenGuard(c, W * 0.36, gy + 4, 1);
  fallenGuard(c, W * 0.55, gy + 8, -1); fallenGuard(c, W * 0.61, gy + 14, 1); fallenGuard(c, W * 0.74, gy + 6, 1); fallenGuard(c, W * 0.9, gy + 12, -1);
  // dropped weapons
  for (const [wx3, rot] of [[W * 0.24, 1.3], [W * 0.57, -1.1], [W * 0.78, 0.8]]) { c.save(); c.translate(wx3, gy + 8); c.rotate(rot); px(c, -1, -26, 2, 26, "#8a6d3b"); c.fillStyle = "#9aa3ad"; c.beginPath(); c.moveTo(-3, -26); c.lineTo(0, -32); c.lineTo(3, -26); c.fill(); c.restore(); }
  px(c, W * 0.33, gy + 16, 16, 5, "#3a5a8a"); px(c, W * 0.33, gy + 16, 16, 2, "#5a7aaa"); // a shield, face down
  // crows on the palisade, one flapping
  for (const [cx3, fl] of [[W * 0.23, 0], [W * 0.7, 1]]) {
    px(c, cx3 - 3, gy - 40, 7, 5, "#15151a"); px(c, cx3 + 3, gy - 42, 3, 3, "#15151a");
    if (fl && Math.sin(now * 6) > 0.4) { px(c, cx3 - 8, gy - 44, 5, 2, "#15151a"); px(c, cx3 + 5, gy - 44, 5, 2, "#15151a"); }
  }
  // investigation markers over the clue points
  c.font = "11px 'IBM Plex Mono',monospace"; c.textAlign = "center";
  for (const [name2, frac2] of Object.entries(SCENES.fallencamp)) {
    const x2 = W * frac2, cmd2 = `you.walk("${name2}")`, cw2 = c.measureText(cmd2).width;
    c.fillStyle = "rgba(8,12,18,0.72)"; rr(c, x2 - cw2 / 2 - 7, gy - 92, cw2 + 14, 18, 5); c.fill();
    c.strokeStyle = "#2a3a4a"; c.stroke(); c.fillStyle = "#9fd9ff"; c.fillText(cmd2, x2, gy - 79);
  }
  // ground fog drifting through it all
  for (let i = 0; i < 3; i++) { const mx2 = ((now * (6 + i * 3) + i * 500) % (W + 300)) - 150; c.fillStyle = "rgba(190,200,215,0.05)"; c.beginPath(); c.ellipse(mx2, gy + 14 + i * 12, 130, 12, 0, 0, Math.PI * 2); c.fill(); }
}
// arrival + investigation. The clue EXERCISES are still to be designed; each
// point currently logs its finding so the mystery reads end to end.
const CAMP_CLUES = {
  gate: ["The palisade is smashed INWARD at the gate. Splinters lie on the inside of the wall.", "clue: the wall was breached from outside... or opened and then broken for show."],
  bodies: ["Seven of the Iron Guard, where they fell. Not one of them holds a drawn weapon.", "clue: they never fought back."],
  fire: ["The cookfire is cold, but one ember still breathes a thread of smoke.", "clue: this happened hours ago, not days."],
  tent: ["The command tent is shredded from the outside. The captain's strongbox lies open. Empty.", "clue: whatever came here TOOK something."],
  tower: ["The watchtower is down, legs snapped. The lookout's horn lies in the grass, unblown.", "clue: no alarm was ever sounded."],
};
async function playFallenCamp(name) {
  await fadeTo("fallencamp"); char.x = els.W * 0.02; char.facing = 1; zoms = []; ARROWS = []; prog(name + " · 1.4");
  await say("", "Half a day on the road. The fog thins, and the Iron Guard's forward camp rises out of the grey... wrong. No smoke. No voices. No watch on the wall.");
  await walkTo(0.08);
  await say("", "The palisade is breached. Beyond it: body after body in the dead grass. The whole camp, gone.");
  await walkTo(0.2);
  await say("", "Someone has to work out what happened here. That someone is the scout the knight sent. Investigate everything.");
  setLocations(Object.keys(SCENES.fallencamp));
  const seen = {};
  while (Object.keys(seen).length < Object.keys(CAMP_CLUES).length) {
    const r = await ask({ prompt: `Investigate the camp (${Object.keys(seen).length}/${Object.keys(CAMP_CLUES).length} clues found)`, placeholder: 'you.walk("bodies")', concept: "walk", validate: (rr) => (rr.walk && SCENES.fallencamp[rr.walk] ? null : `Walk to: ${Object.keys(SCENES.fallencamp).map((l) => `"${l}"`).join(", ")}`) }, null);
    logCmd(`you.walk("${r.walk}")`, true);
    await goTo(r.walk);
    if (r.walk === "rubble") { await say("", "The storehouse is a heap of stone and crossed beams. If anyone was inside when it came down... The dead first, scout. Then the stones."); continue; }
    const clue = CAMP_CLUES[r.walk];
    await say("", clue[0]);
    if (!seen[r.walk]) { seen[r.walk] = true; logCmd(`# ${clue[1]}`, false); }
  }
  await say("", "Five clues, and none of them sit right together. No alarm. No fight. Hours ago. Something taken.");
  await say("", "Then you hear it: from beneath the storehouse rubble, a knock. Then another. Something alive.");
  await ask({ prompt: "Get to the storehouse", placeholder: 'you.walk("rubble")', concept: "walk", validate: (rr) => (rr.walk === "rubble" ? null : 'The knocking came from the storehouse: you.walk("rubble").') }, null);
  await goTo("rubble"); logCmd('you.walk("rubble")', true);
  await playTam(name);
  while (true) { // linger at the scene; clues can be revisited
    const r = await ask({ prompt: "Look over the camp again", placeholder: 'you.walk("bodies")', concept: "walk", validate: (rr) => (rr.walk && SCENES.fallencamp[rr.walk] ? null : `Walk to: ${Object.keys(SCENES.fallencamp).map((l) => `"${l}"`).join(", ")}`) }, null);
    logCmd(`you.walk("${r.walk}")`, true); await goTo(r.walk);
    if (r.walk === "rubble") await say("Tam", "I'm not going back under there. Whatever you need, ask it here.");
    else await say("", CAMP_CLUES[r.walk][0]);
  }
}
// ---- Tam, the survivor beneath the rubble: three riddles, then the ledger ----
const TAM_RIDDLES = [
  { code: "a = 3\nb = a * a\nprint(b - a)", answer: "6", banned: ["a * a", "b - a", "a=3", "a = 3"],
    intro: "He scratches something through a gap in the stones. Code, written in the dirt:" },
  { code: 'x = 7\nif x % 2 == 0:\n    print("even")\nelse:\n    print(x + 3)', answer: "10", banned: ["% 2", "x + 3", "x = 7", "x=7"],
    intro: "A pause. Then a second scratching, slower, like he's thinking hard:" },
  { code: "p = 5\nq = 14 - p\nif q > p:\n    print(q - p)\nelse:\n    print(q + p)", answer: "4", banned: ["14 - p", "q - p", "q + p", "p = 5", "p=5"],
    intro: "One more. His voice is steadier now:" },
];
async function playTam(name) {
  char.grabbing = 1; await wait(0.5); char.grabbing = 0; await wait(0.2);
  char.grabbing = 1; await wait(0.5); char.grabbing = 0; // hauling stones aside
  await say("Tam", "DON'T. Don't come closer. Stay where you are.");
  await say("Tam", "It SAID the watchword back to us. Perfect. It moved like Weck moves. It wore us like a coat, right up until it turned.");
  await say("Tam", "So the watchword proves nothing. Words prove nothing. You want me out of this hole, you solve my riddles. It could repeat anything. It couldn't THINK anything.");
  for (let i = 0; i < TAM_RIDDLES.length; i++) {
    const R = TAM_RIDDLES[i];
    await say("Tam", i === 0 ? "Three riddles. Here's the first." : i === 1 ? "Again. Second riddle." : "Last one. Get it right and I'll come out.");
    await ask({
      prompt: `Tam's riddle ${i + 1} of 3: what does it print?`,
      placeholder: `print(${R.answer})`, rows: 1,
      task: `${R.intro}\n\n${R.code.split("\n").map((l) => "    " + l).join("\n")}\n\nRun it in your HEAD, then answer with a single print of the result. Give the code itself back and he bolts: repeating is what IT did.`,
      validate: (r) => {
        if (R.banned.some((f) => lastSrc.includes(f))) return "Tam recoils: \"That's REPEATING. That's what it did. Run it in your head, then tell me what comes OUT.\"";
        return r.stdout.trim() === R.answer ? null : "Tam, flat: \"No. Trace it line by line. What is each variable when it reaches the print?\"";
      },
    }, null);
    await say("Tam", i === 0 ? "...right. Okay. Right." : i === 1 ? "Right again. Almost. Almost." : "A person. You're a person.");
  }
  tamFreed = true;
  await say("", "Stones shift. A hand, then a boy: sixteen maybe, clerk's satchel clutched to his chest, grain dust in his hair.");
  await say("Tam", "Tam. Quartermaster's clerk. I was under the grain shelves when the roof came down, and I stayed there. All night. Listening.");
  await say("Tam", "It came at the black hour, through the gate, like it was expected. Nobody blew the horn. The captain drew steel and then he just... didn't. NONE of them could even begin. Like their bodies already knew it was over.");
  await say("Tam", "It didn't want us. It went through them, to the command tent, and took the captain's dispatch case. Maps. Muster rolls. It knew exactly where they were.");
  await say("Tam", "Help me count. Please. If I count it, it's real, and if it's real I can stop shaking. The ledger's in my head; the numbers are all I've got left.");
  await ask({
    prompt: "Tally the losses with Tam",
    placeholder: "missing = roster - fallen - survivors\nspears_lost = spears_issued - spears_found\narrows_fired = arrows_issued - arrows_found\nfought_back = arrows_fired > 0\ntaken_unawares = fought_back == False and horn_blown == False",
    rows: 5,
    seed: "roster=9\nfallen=7\nsurvivors=1\nspears_issued=24\nspears_found=21\narrows_issued=60\narrows_found=60\nhorn_blown=False",
    concept: "bool", requireOp: "and",
    task: "Tam's ledger is seeded: roster, fallen, survivors, spears_issued, spears_found, arrows_issued, arrows_found, horn_blown. Work out missing, spears_lost and arrows_fired with subtraction. Then the new tool: a comparison like  arrows_fired > 0  IS a value, True or False, and you can store it. Set fought_back from that comparison, and taken_unawares true only when fought_back is False AND horn_blown is False.",
    validate: (r) => {
      if (Number(r.vars.missing) !== 1) return "missing = roster - fallen - survivors. Count again; the ledger has to balance.";
      if (Number(r.vars.spears_lost) !== 3) return "spears_lost = spears_issued - spears_found.";
      if (Number(r.vars.arrows_fired) !== 0) return "arrows_fired = arrows_issued - arrows_found.";
      if (r.vars.fought_back !== false) return "fought_back should hold the comparison  arrows_fired > 0  (which comes out False).";
      if (r.vars.taken_unawares !== true) return "taken_unawares = fought_back == False and horn_blown == False.";
      return null;
    },
  }, null);
  await say("Tam", "Zero arrows. They never fought back. Taken unawares: True. That's the truth of it, in five lines.");
  await say("Tam", "And... missing is one. The ledger doesn't balance. Nine stood this camp. Seven in the grass, me under the stones. Someone's not here.");
  await say("Tam", "Weck. Weck had the wall. It's WECK that's missing. And it moved like him, I told you it moved like him...");
  await say("", "A camp that never fought back. A stolen dispatch case. A missing watchman it learned to walk like. The road to the city just got darker... (to be continued)");
  if (Sv) awardXP(30);
}
// ---- the armory booth scene ----
function armorIcon(c, kind, s) {
  const S = (x, y, w, h, col) => px(c, x * s, y * s, w * s, h * s, col);
  const steel = "#9aa3ad", dark = "#6a727c", trim = "#c9a24a";
  if (kind === "helmet") { S(3, 2, 6, 2, steel); S(2, 4, 8, 3, steel); S(3, 7, 2, 2, steel); S(7, 7, 2, 2, steel); S(5, 5, 2, 2, "#1a140d"); S(3, 2, 6, 1, trim); }
  else if (kind === "chestplate") { S(3, 2, 6, 1, trim); S(2, 3, 8, 5, steel); S(3, 8, 6, 2, dark); S(5, 3, 2, 7, dark); S(2, 3, 2, 2, dark); S(8, 3, 2, 2, dark); }
  else if (kind === "gauntlets") { S(2, 3, 3, 5, steel); S(7, 3, 3, 5, steel); S(2, 8, 3, 2, dark); S(7, 8, 3, 2, dark); S(2, 3, 3, 1, trim); S(7, 3, 3, 1, trim); }
  else if (kind === "leggings") { S(3, 2, 6, 2, steel); S(3, 4, 2, 6, steel); S(7, 4, 2, 6, steel); S(3, 9, 2, 1, dark); S(7, 9, 2, 1, dark); S(3, 2, 6, 1, trim); }
  else { S(3, 3, 2, 5, steel); S(7, 3, 2, 5, steel); S(2, 8, 4, 2, dark); S(6, 8, 4, 2, dark); S(2, 8, 4, 1, trim); S(6, 8, 4, 1, trim); } // boots
}
function drawArmory(c, W, gy, now) {
  const H = els.H;
  // the keep, dimmed behind the booth
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#171a24"); g.addColorStop(1, "#1f2330"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  px(c, 0, H * 0.1, W, 5, "#a8832a"); px(c, 0, H * 0.1 + 5, W, 2, "#ffd43b");
  for (let i = 0; i < 6; i++) { const cx = W * (0.08 + i * 0.17); px(c, cx - 11, 0, 22, H, "#2c303b"); }
  const floorY = H * 0.8;
  for (let x = 0; x < W; x += 30) px(c, x, floorY, 30, H - floorY, (x / 30 | 0) % 2 ? "#2a2d36" : "#262931");
  c.fillStyle = "rgba(4,6,10,.5)"; c.fillRect(0, 0, W, H);
  // booth geometry
  const bx = W / 2, bw = Math.min(860, W * 0.68), half = bw / 2, top = H * 0.09, counterY = floorY - 44;
  px(c, bx - half - 16, top + 40, 18, counterY - top - 8, "#5a4424"); px(c, bx + half - 2, top + 40, 18, counterY - top - 8, "#5a4424");
  px(c, bx - half - 16, top + 40, 6, counterY - top - 8, "#7a5a30"); px(c, bx + half - 2, top + 40, 6, counterY - top - 8, "#7a5a30");
  px(c, bx - half, top + 48, bw, counterY - top - 52, "#241c11");
  for (let y = top + 48; y < counterY - 6; y += 20) px(c, bx - half, y, bw, 2, "#1a140c");
  // deep scalloped awning
  for (let s = -half - 30; s < half + 30; s += 52) px(c, bx + s, top, 52, 46, ((s / 52) | 0) % 2 ? "#9c36b5" : "#f1f3f5");
  for (let s = -half - 30; s < half + 30; s += 52) { c.fillStyle = ((s / 52) | 0) % 2 ? "#9c36b5" : "#f1f3f5"; c.beginPath(); c.arc(bx + s + 26, top + 46, 26, 0, Math.PI); c.fill(); }
  px(c, bx - half - 36, top - 6, bw + 72, 8, "#8a6d3b"); px(c, bx - half - 36, top - 6, bw + 72, 3, "#a9844a");
  px(c, bx - 92, top + 66, 184, 40, "#6b4f2a"); px(c, bx - 92, top + 66, 184, 4, "#8a6d3b");
  c.fillStyle = "#e8dcc0"; c.font = "bold 19px 'Chakra Petch',sans-serif"; c.textAlign = "center"; c.fillText("ARMORSMITH", bx, top + 92);
  // the rack: five pieces, clickable; picked = gold frame + check; owned = SOLD
  armoryRects = {};
  for (let i = 0; i < 5; i++) {
    const kind = KIT_PIECES[i], ix = bx - half + bw * (0.1 + i * 0.2), iy = top + (counterY - top) * 0.36, s2 = Math.max(5, Math.min(7, W / 190));
    const rx0 = ix - 6 * s2 - 6, ry0 = iy - 6, rs = 12 * s2 + 12;
    px(c, rx0, ry0, rs, rs, "#1a140c");
    const owned = char.kit[kind];
    if (owned) c.globalAlpha = 0.35;
    c.save(); c.translate(ix - 6 * s2, iy); armorIcon(c, kind, s2); c.restore(); c.globalAlpha = 1;
    if (!owned && armoryPicked[kind]) { c.strokeStyle = "#ffd43b"; c.lineWidth = 3; c.strokeRect(rx0, ry0, rs, rs); c.fillStyle = "#62d27a"; c.font = "bold 22px 'Chakra Petch',sans-serif"; c.fillText("✓", ix + 6 * s2 - 6, iy + 12); }
    px(c, ix - 62, iy + 12 * s2 + 10, 124, 40, owned ? "#b9a97f" : "#e8dcc0"); px(c, ix - 62, iy + 12 * s2 + 10, 124, 3, "#c9b98a");
    c.fillStyle = owned ? "#8a7c52" : "#6b3f16"; c.font = "bold 11.5px 'IBM Plex Mono',monospace";
    c.fillText(owned ? "SOLD" : `CONST_${kind.toUpperCase()}`, ix, iy + 12 * s2 + 26); if (!owned) c.fillText("= 0.50", ix, iy + 12 * s2 + 42);
    armoryRects[kind] = { x: rx0, y: ry0, w: rs, h: rs + 44 };
  }
  // counter
  px(c, bx - half - 28, counterY, bw + 56, 14, "#8a6d3b"); px(c, bx - half - 28, counterY, bw + 56, 4, "#a9844a");
  px(c, bx - half - 28, counterY + 14, bw + 56, 34, "#6b4f2a");
  for (let x = bx - half - 28; x < bx + half + 28; x += 52) px(c, x, counterY + 14, 3, 34, "#4a3a22");
  // the smith, broad and aproned, arms on the counter, gentle idle bob
  { const sc = 5, bob = Math.sin(now * 1.5) * 0.5; c.save(); c.translate(bx + half * 0.42, counterY + 2 - bob); c.scale(sc, sc);
    px(c, -8, -26, 16, 18, "#5b626b"); px(c, -8, -26, 3, 18, "rgba(255,255,255,.14)");
    px(c, -5, -21, 10, 13, "#5a3a20"); px(c, -5, -21, 10, 2, "#6e4a28");
    px(c, -8, -27, 16, 3, "#454c55");
    px(c, -11, -24, 3, 14, "#5b626b"); px(c, 8, -24, 3, 14, "#5b626b");
    px(c, -13, -11, 6, 4, "#d8a878"); px(c, 8, -11, 6, 4, "#d8a878");
    px(c, -6, -38, 12, 12, "#d8a878");
    px(c, -8, -41, 16, 6, "#454c55"); px(c, -8, -31, 16, 3, "#454c55");
    px(c, -3, -34, 2, 2, "#1c1208"); px(c, 2, -34, 2, 2, "#1c1208");
    px(c, -4, -28.5, 8, 1.5, "#8a6242");
    c.restore(); }
  // the crafting annex, chained and locked (future blueprint system)
  { const ax = bx - half - 26, aw = Math.min(190, W * 0.17), ax0 = ax - aw;
    px(c, ax0, top + 70, aw, counterY - top - 74, "#1f1810");
    for (let y = top + 70; y < counterY - 6; y += 18) px(c, ax0, y, aw, 2, "#171208");
    px(c, ax0 - 8, top + 62, aw + 16, 10, "#54422a"); px(c, ax0 - 8, top + 62, aw + 16, 3, "#6b5636");
    px(c, ax0 - 6, counterY, aw + 12, 8, "#8a6d3b"); px(c, ax0 - 6, counterY + 8, aw + 12, 20, "#6b4f2a");
    px(c, ax0 + aw / 2 - 44, top + 80, 88, 24, "#6b4f2a"); px(c, ax0 + aw / 2 - 44, top + 80, 88, 2, "#8a6d3b");
    c.fillStyle = "#e8dcc0"; c.font = "bold 11px 'Chakra Petch',sans-serif"; c.textAlign = "center"; c.fillText("CRAFTING", ax0 + aw / 2, top + 96);
    const dx = ax0 + aw / 2, dy = top + 120, slotH = (counterY - dy - 40) / 5;
    c.setLineDash([3, 3]); c.strokeStyle = "#5a4a30"; c.lineWidth = 1.5;
    const slots = [[dx - 14, dy, 28, slotH - 6], [dx - 22, dy + slotH, 44, slotH + 8], [dx - 30, dy + slotH * 2 + 8, 60, slotH - 10], [dx - 18, dy + slotH * 3 + 4, 36, slotH + 6], [dx - 20, dy + slotH * 4 + 8, 40, slotH - 8]];
    for (const [sx, sy, sw2, sh2] of slots) c.strokeRect(sx, sy, sw2, sh2);
    c.setLineDash([]);
    c.fillStyle = "#5a4a30"; c.font = "9px 'IBM Plex Mono',monospace";
    ["helmet", "chest", "hands", "legs", "boots"].forEach((n, i) => c.fillText(n, dx, slots[i][1] + slots[i][3] / 2 + 3));
    c.strokeStyle = "#6a727c"; c.lineWidth = 4; c.setLineDash([8, 6]);
    c.beginPath(); c.moveTo(ax0 - 8, top + 74); c.lineTo(ax + 6, counterY + 18); c.moveTo(ax + 6, top + 74); c.lineTo(ax0 - 8, counterY + 18); c.stroke(); c.setLineDash([]);
    const lx = ax0 + aw / 2, ly = top + (counterY - top) * 0.55;
    c.fillStyle = "#caa000"; c.fillRect(lx - 13, ly - 4, 26, 22);
    c.strokeStyle = "#caa000"; c.lineWidth = 5; c.beginPath(); c.arc(lx, ly - 6, 9, Math.PI, 0); c.stroke();
    px(c, lx - 2, ly + 3, 4, 8, "#3a2c10");
    c.fillStyle = "#ff9a9a"; c.font = "bold 10px 'IBM Plex Mono',monospace"; c.fillText("LOCKED", lx, ly + 34);
    c.fillStyle = "#8a7c52"; c.font = "9px 'IBM Plex Mono',monospace"; c.fillText("earn the smith's trust", lx, ly + 48);
  }
  // the order slip pinned to the right post
  { const ox = bx + half + 34, ow = Math.min(230, W - ox - 20);
    if (ow > 150) {
      px(c, ox, top + 90, ow, 260, "#e8dcc0"); px(c, ox, top + 90, ow, 4, "#c9b98a");
      circ(c, ox + ow / 2, top + 96, 4, "#b34a3a");
      c.fillStyle = "#6b3f16"; c.font = "bold 13px 'Chakra Petch',sans-serif"; c.textAlign = "left"; c.fillText("ORDER SLIP", ox + 14, top + 116);
      let yy = top + 142;
      for (const kind of KIT_PIECES) {
        const owned = char.kit[kind], on = armoryPicked[kind] && !owned;
        c.font = "12.5px 'IBM Plex Mono',monospace"; c.fillStyle = owned ? "#b0a077" : on ? "#1f7a38" : "#8a7c52";
        c.fillText(`${owned ? "✔" : on ? "☑" : "☐"} ${kind}${owned ? " (worn)" : ""}`, ox + 14, yy); yy += 19;
        if (on) { c.font = "11px 'IBM Plex Mono',monospace"; c.fillStyle = "#7a3a9e"; c.fillText(`  CONST_${kind.toUpperCase()} = 0.50`, ox + 14, yy); yy += 19; }
      }
      c.font = "11.5px 'IBM Plex Mono',monospace"; c.fillStyle = "#6b3f16"; c.fillText("wear the full kit:", ox + 14, top + 316);
      c.fillStyle = "#b3261e"; c.font = "bold 13px 'IBM Plex Mono',monospace"; c.fillText("+1 ♥ heart", ox + 14, top + 334);
    } }
  // your hero at the counter (armored pieces show as you buy them)
  { const sc = 4.4; c.save(); c.translate(bx - half * 0.62, floorY + 30); c.scale(sc, sc);
    px(c, -4, -4, 4, 12, char.kit.leggings ? "#7a828c" : "#3f6b2a"); px(c, 1, -4, 4, 12, char.kit.leggings ? "#7a828c" : "#3f6b2a");
    px(c, -4, 5, 4, 3, char.kit.boots ? "#9aa3ad" : "#241a10"); px(c, 1, 5, 4, 3, char.kit.boots ? "#9aa3ad" : "#241a10");
    px(c, -6, -22, 12, 20, char.kit.chestplate ? "#8a939e" : "#6b8e23"); px(c, -6, -8, 12, 3, "#3a2c18");
    px(c, -5, -33, 11, 11, "#e0a070"); px(c, -6, -35, 12, 5, char.kit.helmet ? "#7a828c" : "#3a2c18");
    c.restore(); }
}
// ---- Lesson 1.3 questline scenes + beats ----
function drawCargo(c, rx, y, cargo = raftCargo) {
  let i = 0; const cols = { armor: "#7a828c", food: "#c2410c", water: "#1971c2" };
  for (const k of ["armor", "food", "water"]) for (let n = 0; n < cargo[k]; n++) { px(c, rx - 15 + (i % 3) * 10, y - 8 - Math.floor(i / 3) * 8, 8, 7, cols[k]); px(c, rx - 15 + (i % 3) * 10, y - 8 - Math.floor(i / 3) * 8, 8, 2, "rgba(255,255,255,0.25)"); i++; }
}
// where the hero's feet sit: flat ground everywhere except the storage room,
// where he climbs the steps onto the raised dock and back down onto the raft
function heroGroundY(gy) {
  if (scene !== "storage") return gy;
  const fx = char.x / els.W;
  if (fx >= 0.865) return gy + 2;                                  // standing on the raft
  if (fx >= 0.695) return gy - 12;                                 // up on the dock
  if (fx >= 0.655) return gy - 12 * ((fx - 0.655) / 0.04);         // climbing the steps
  return gy;
}
// a lashed-log raft (docked, beached, or crossing)
function raftBody(c, x, y) {
  for (let i = 0; i < 6; i++) { const lx = x - 36 + i * 12; px(c, lx, y, 11, 9, i % 2 ? "#6b4f2a" : "#5a4424"); px(c, lx, y, 11, 2, "#7f6132"); px(c, lx + 4, y + 9, 3, 2, "#553f22"); } // logs, lit tops, rounded ends
  px(c, x - 34, y - 2, 70, 3, "#4a3a22"); px(c, x - 34, y + 7, 70, 2, "#3a2c18"); // cross-beams
  c.strokeStyle = "#2f2415"; c.lineWidth = 1.5; // rope lashings
  for (const bx of [x - 28, x + 24]) { c.beginPath(); c.moveTo(bx - 3, y - 2); c.lineTo(bx + 3, y + 9); c.moveTo(bx + 3, y - 2); c.lineTo(bx - 3, y + 9); c.stroke(); }
}
// warehouse props (shared by the storage room, reusable elsewhere)
function drawCrate(c, x, y, w, h, col = "#7a5a30") {
  px(c, x, y, w, h, col); px(c, x, y, w, 3, "#8a6d3b"); px(c, x, y, 2, h, "#8a6d3b");
  px(c, x + 3, y + (h >> 1), w - 6, 2, "#5a4424"); px(c, x + (w >> 1) - 1, y + 3, 2, h - 6, "#5a4424"); // plank cross
  px(c, x + 2, y + 2, 2, 2, "#caa24a"); px(c, x + w - 4, y + 2, 2, 2, "#caa24a"); px(c, x + 2, y + h - 4, 2, 2, "#caa24a"); px(c, x + w - 4, y + h - 4, 2, 2, "#caa24a"); // corner nails
}
function drawSack(c, x, y, col = "#a9844a") {
  c.fillStyle = col; c.beginPath(); c.ellipse(x, y - 8, 10, 9, 0, 0, Math.PI * 2); c.fill();
  px(c, x - 10, y - 4, 20, 5, col); px(c, x - 3, y - 19, 6, 5, col); px(c, x - 3, y - 16, 6, 2, "#3a2c18"); // gathered tie
  c.fillStyle = "rgba(255,255,255,0.12)"; c.beginPath(); c.ellipse(x - 3, y - 10, 4, 5, 0, 0, Math.PI * 2); c.fill();
}
function drawBarrel(c, x, y, w = 20, h = 24, wood = "#6e4a28", hoop = "#3a3a42") {
  px(c, x - w / 2, y - h, w, h, wood); px(c, x - w / 2, y - h, 3, h, "#8a6244");
  px(c, x - w / 2 - 1, y - h + 4, w + 2, 3, hoop); px(c, x - w / 2 - 1, y - 7, w + 2, 3, hoop);
  px(c, x - w / 2 + 2, y - h, w - 4, 2, "#553a20");
}
function drawStorage(c, W, gy, now) {
  const H = els.H;
  // plank wall falling into ceiling shadow
  for (let y = 0; y < gy; y += 16) { c.fillStyle = (y / 16 | 0) % 2 ? "#4a3c29" : "#423525"; c.fillRect(0, y, W, 16); }
  const ceil = c.createLinearGradient(0, 0, 0, gy * 0.5); ceil.addColorStop(0, "rgba(0,0,0,0.38)"); ceil.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = ceil; c.fillRect(0, 0, W, gy * 0.5);
  // timber studs bracing the wall
  for (const fx of [0.055, 0.49, 0.73]) { px(c, W * fx - 5, 0, 10, gy, "#241c11"); px(c, W * fx - 5, 0, 3, gy, "#3f3220"); }
  // high shuttered window; moonlight spills through onto the dock
  const wx = W * 0.62, wy = gy * 0.1;
  px(c, wx - 17, wy - 1, 34, 27, "#0e1622"); px(c, wx - 17, wy - 1, 34, 3, "#3a2c18"); px(c, wx - 17, wy + 23, 34, 3, "#3a2c18"); px(c, wx - 2, wy - 1, 3, 27, "#3a2c18"); px(c, wx - 17, wy + 11, 34, 2, "#3a2c18");
  c.fillStyle = "rgba(180,205,235,0.06)"; c.beginPath(); c.moveTo(wx - 17, wy + 26); c.lineTo(wx + 17, wy + 26); c.lineTo(wx + 80, gy + 8); c.lineTo(wx - 40, gy + 8); c.closePath(); c.fill();
  // the captain's manifest, pinned at head height right where the player stands;
  // click it to read (intro to if statements). Opens a pinned panel, not a modal,
  // so it stays readable while coding.
  { const nx = W * 0.095 - 16, ny = gy - 104, nw = 32, nh = 42;
    manifestRect = { x: nx - 6, y: ny - 6, w: nw + 12, h: nh + 12 }; // generous hit area
    const pulse = 0.5 + 0.5 * Math.sin(now * 2.6);
    c.shadowColor = "#ffe066"; c.shadowBlur = 8 + 10 * pulse;
    px(c, nx, ny, nw, nh, "#e8dcc0"); c.shadowBlur = 0;
    px(c, nx, ny, nw, 3, "#c9b98a");
    circ(c, nx + nw / 2, ny + 3, 2.5, "#b34a3a"); // pin
    for (let i = 0; i < 6; i++) px(c, nx + 5, ny + 10 + i * 5, nw - 10 - (i % 2) * 6, 2, "#b9a97f");
    c.fillStyle = `rgba(255,224,102,${0.65 + 0.35 * pulse})`; c.font = "10px 'IBM Plex Mono',monospace"; c.textAlign = "center";
    c.fillText("▸ click to read", nx + nw / 2, ny + nh + 14);
  }
  // coiled rope + a saw hung between the studs
  c.strokeStyle = "#8a6d3b"; c.lineWidth = 3; c.beginPath(); c.arc(W * 0.12, gy * 0.3, 9, 0, Math.PI * 2); c.stroke(); c.strokeStyle = "#6e551f"; c.lineWidth = 1.5; c.beginPath(); c.arc(W * 0.12, gy * 0.3, 6, 0, Math.PI * 2); c.stroke();
  px(c, W * 0.44 - 2, gy * 0.24, 4, 6, "#5a3f22"); px(c, W * 0.44 - 14, gy * 0.3, 28, 4, "#9aa3ad"); for (let i = 0; i < 6; i++) px(c, W * 0.44 - 13 + i * 5, gy * 0.34, 3, 2, "#7a828c");
  // wall lanterns with warm pools of light
  for (const fx of [0.2, 0.35, 0.68]) {
    const lx = W * fx, ly = gy * 0.4, fl = 0.7 + 0.3 * Math.sin(now * 9 + fx * 20);
    px(c, lx - 1, ly - 16, 2, 6, "#3a2c18"); px(c, lx - 5, ly - 10, 10, 13, "#2a2014"); px(c, lx - 5, ly - 10, 10, 2, "#4a3a22");
    c.shadowColor = "#ffb14d"; c.shadowBlur = 18 * fl; px(c, lx - 3, ly - 7, 6, 8, "#ffb14d"); c.shadowBlur = 0;
    const pool = c.createRadialGradient(lx, gy - 20, 4, lx, gy - 20, 130); pool.addColorStop(0, `rgba(255,177,77,${0.16 * fl})`); pool.addColorStop(1, "rgba(255,177,77,0)"); c.fillStyle = pool; c.fillRect(lx - 130, gy - 150, 260, 260);
  }
  // two shelf tiers with mixed goods: crates, sacks, barrels
  for (const [ti, sy] of [[0, gy * 0.5], [1, gy * 0.76]]) {
    px(c, W * 0.02, sy, W * 0.64, 7, "#5a4424"); px(c, W * 0.02, sy, W * 0.64, 2, "#7a5a30");
    for (let x = W * 0.05; x < W * 0.6; x += W * 0.09) px(c, x, sy + 7, 4, 8, "#3a2c18"); // brackets
    let k = ti; // stagger the mix per tier
    for (let x = W * 0.06; x < W * 0.6; x += 46, k++) {
      if (k % 3 === 0) drawCrate(c, x, sy - 22, 26, 22);
      else if (k % 3 === 1) drawSack(c, x + 12, sy);
      else drawBarrel(c, x + 12, sy, 18, 22);
    }
  }
  // plank floor with seams, sill highlight, stray straw
  for (let x = 0; x < W * 0.78; x += 28) px(c, x, gy, 28, H - gy, (x / 28 | 0) % 2 ? "#3a3225" : "#342c20");
  for (let x = 28; x < W * 0.78; x += 28) px(c, x, gy, 1, H - gy, "#241e15");
  px(c, 0, gy, W * 0.78, 3, "#4a3a26");
  c.strokeStyle = "#6e5a2e"; c.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) { const sx2 = (i * 157 + 30) % (W * 0.7), sy2 = gy + 14 + (i * 43) % Math.max(8, H - gy - 20); c.beginPath(); c.moveTo(sx2, sy2); c.lineTo(sx2 + 6, sy2 - 3); c.moveTo(sx2 + 2, sy2); c.lineTo(sx2 + 7, sy2 + 2); c.stroke(); }
  // water with moon glints
  c.fillStyle = "#16344e"; c.fillRect(W * 0.78, gy, W * 0.22, H - gy);
  for (let i = 0; i < 6; i++) { c.strokeStyle = "rgba(120,180,225,0.3)"; c.lineWidth = 1; const yy = gy + 12 + i * 12; c.beginPath(); c.moveTo(W * 0.78, yy + Math.sin(now * 3 + i) * 2); c.lineTo(W, yy + Math.sin(now * 3 + i + 2) * 2); c.stroke(); }
  for (let i = 0; i < 3; i++) { c.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(now * 2.2 + i * 2.1)); px(c, W * (0.81 + i * 0.05), gy + 16 + (i * 23) % 34, 7, 2, "#bfe0ff"); } c.globalAlpha = 1;
  // a raised loading dock on pilings, with steps up from the warehouse floor
  const deckY = gy - 12, d0 = W * 0.695, d1 = W * 0.955;
  for (const pf of [0.73, 0.79, 0.85, 0.91]) { px(c, W * pf - 2, deckY + 8, 5, gy - deckY + (H - gy) * 0.5, "#33271a"); px(c, W * pf - 2, deckY + 8, 2, gy - deckY + (H - gy) * 0.5, "#45321f"); } // pilings
  // back railing so the dock reads as a structure
  for (let x = d0 + 8; x < d1; x += 42) px(c, x, deckY - 22, 4, 22, "#4a3a22");
  px(c, d0 + 6, deckY - 24, d1 - d0 - 12, 3, "#5f4a2c");
  // deck planks with a lit edge + seams
  for (let x = d0; x < d1; x += 14) px(c, x, deckY, 13, 10, ((x / 14) | 0) % 2 ? "#6b4f2a" : "#5f4526");
  px(c, d0, deckY, d1 - d0, 2, "#8a6d3b"); px(c, d0, deckY + 10, d1 - d0, 3, "#3a2c18");
  // two steps up from the floor
  px(c, W * 0.655, gy - 4, W * 0.04, 4, "#5f4526"); px(c, W * 0.655, gy - 4, W * 0.04, 1, "#7a5a30");
  px(c, W * 0.675, gy - 8, W * 0.02, 8, "#6b4f2a"); px(c, W * 0.675, gy - 8, W * 0.02, 1, "#8a6d3b");
  // cleat with a coiled line, and a lantern on a post at the dock's end
  px(c, W * 0.875, deckY - 4, 10, 4, "#3a3a42"); c.strokeStyle = "#8a7448"; c.lineWidth = 1.5; c.beginPath(); c.arc(W * 0.88, deckY - 6, 4, 0, Math.PI * 2); c.stroke();
  { const lx = W * 0.945, fl2 = 0.7 + 0.3 * Math.sin(now * 8);
    px(c, lx - 1, deckY - 26, 3, 26, "#4a3a22"); px(c, lx - 5, deckY - 34, 11, 10, "#2a2014"); px(c, lx - 5, deckY - 34, 11, 2, "#4a3a22");
    c.shadowColor = "#ffb14d"; c.shadowBlur = 14 * fl2; px(c, lx - 3, deckY - 32, 7, 6, "#ffb14d"); c.shadowBlur = 0; }
  // mooring rope from the cleat down to the raft below
  c.strokeStyle = "#8a7448"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(W * 0.88, deckY - 2); c.quadraticCurveTo(W * 0.895, gy + 4, W * 0.9 - 20, gy + 2); c.stroke();
  // the docked raft (with anything already loaded), floating below the dock
  const rx = W * 0.9;
  raftBody(c, rx, gy + 2);
  drawCargo(c, rx, gy + 2);
  // supply bays: raised pallets, hanging signs, and goods that look like what they are
  for (const [label, f, col] of [["armour", 0.16, "#7a828c"], ["food", 0.28, "#c2410c"], ["water", 0.40, "#1971c2"]]) {
    const x = W * f;
    px(c, x - 18, gy - 3, 36, 5, "#4a3a22"); px(c, x - 18, gy - 3, 36, 2, "#5f4a2c"); // pallet
    px(c, x - 1, gy - 44, 2, 12, "#3a2c18"); px(c, x - 15, gy - 50, 30, 10, "#5a4424"); px(c, x - 15, gy - 50, 30, 2, "#7a5a30"); // hanging sign
    c.fillStyle = "#f5ecd8"; c.font = "9px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText(label.toUpperCase(), x, gy - 42.5);
    px(c, x - 15, gy - 40, 30, 2, col); // colour key stripe under the sign
    if (label === "armour") { drawCrate(c, x - 14, gy - 19, 28, 16, "#5b626b"); px(c, x - 6, gy - 26, 12, 7, "#9aa3ad"); px(c, x - 4, gy - 30, 8, 5, "#9aa3ad"); } // steel chest + helm on top
    else if (label === "food") { drawSack(c, x - 7, gy - 3, "#b0541e"); drawSack(c, x + 7, gy - 3, "#c2410c"); }
    else { drawBarrel(c, x - 8, gy - 3, 16, 20, "#4f6a8a", "#1971c2"); drawBarrel(c, x + 8, gy - 3, 16, 24, "#4f6a8a", "#1971c2"); }
  }
}
// a uniformed trooper: steel cap, jerkin, spear; sw swings the legs, f faces
function soldier(c, x, y, f = -1, sw = 0) {
  px(c, x - 4, y - 4 + sw, 4, 11, "#2f3a2a"); px(c, x + 1, y - 4 - sw, 4, 11, "#2f3a2a");
  px(c, x - 4, y + 4 + sw, 4, 3, "#100b08"); px(c, x + 1, y + 4 - sw, 4, 3, "#100b08");
  px(c, x - 6, y - 22, 12, 18, "#4a5568"); px(c, x - 6, y - 22, 3, 18, "rgba(255,255,255,0.13)");
  px(c, x - 6, y - 8, 12, 3, "#3a2c18"); px(c, x - 1, y - 8, 2, 3, "#c9a24a");
  px(c, x - 8, y - 20, 3, 11, "#4a5568"); px(c, x - 8, y - 10, 3, 2, "#c89a72");
  px(c, x - 5, y - 32, 11, 11, "#c89a72");
  px(c, x - 6, y - 35, 13, 5, "#7a828c"); px(c, x - 6, y - 30, 13, 2, "#6a727c"); // steel cap
  px(c, x + f * 2, y - 28, 2, 2, "#1c1208");
  px(c, x + f * 8, y - 38, 2, 36, "#8a6d3b"); // spear
  c.fillStyle = "#9aa3ad"; c.beginPath(); c.moveTo(x + f * 8 - 2, y - 38); c.lineTo(x + f * 8 + 1, y - 45); c.lineTo(x + f * 8 + 4, y - 38); c.closePath(); c.fill();
  px(c, x + f * 5, y - 16, f * 4, 3, "#c89a72"); // hand on the shaft
}
function drawCamp(c, W, gy, now) {
  const H = els.H;
  // sharpened palisade wall guards the camp's east side
  for (let p = W * 0.9; p < W; p += 13) { const h = 34 + ((p * 7) % 8); px(c, p, gy - h, 11, h + 2, ((p / 13 | 0) % 2) ? "#4a3a22" : "#54422a"); c.fillStyle = ((p / 13 | 0) % 2) ? "#4a3a22" : "#54422a"; c.beginPath(); c.moveTo(p, gy - h); c.lineTo(p + 5.5, gy - h - 8); c.lineTo(p + 11, gy - h); c.closePath(); c.fill(); }
  px(c, W * 0.9, gy - 16, W * 0.1, 3, "#2f2415");
  // ridge tents: shaded canvas, entrance flap, guy ropes
  for (const [tx, s] of [[W * 0.28, 1], [W * 0.64, 1.1], [W * 0.82, 0.9]]) {
    c.fillStyle = "#77603c"; c.beginPath(); c.moveTo(tx - 28 * s, gy); c.lineTo(tx, gy - 44 * s); c.lineTo(tx + 28 * s, gy); c.closePath(); c.fill();
    c.fillStyle = "#8a7148"; c.beginPath(); c.moveTo(tx - 28 * s, gy); c.lineTo(tx, gy - 44 * s); c.lineTo(tx - 6 * s, gy); c.closePath(); c.fill(); // moonlit face
    px(c, tx - 1, gy - 46 * s, 2, 6, "#3a2c18"); // ridge pole tip
    c.fillStyle = "#191308"; c.beginPath(); c.moveTo(tx - 11 * s, gy); c.lineTo(tx, gy - 22 * s); c.lineTo(tx + 11 * s, gy); c.closePath(); c.fill(); // entrance
    c.strokeStyle = "#3a2c18"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(tx + 28 * s, gy - 2); c.lineTo(tx + 36 * s, gy + 4); c.moveTo(tx - 28 * s, gy - 2); c.lineTo(tx - 36 * s, gy + 4); c.stroke(); // guy ropes
  }
  // the company standard beside the gate
  px(c, W * 0.56 - 2, gy - 58, 3, 58, "#3a2c18");
  c.fillStyle = "#7a1f1f"; c.beginPath(); const fw = 5 * Math.sin(now * 2.6);
  c.moveTo(W * 0.56 + 1, gy - 58); c.quadraticCurveTo(W * 0.56 + 20 + fw, gy - 54, W * 0.56 + 26 + fw, gy - 48); c.lineTo(W * 0.56 + 1, gy - 44); c.closePath(); c.fill();
  // proper campfire: stones, logs, layered flame, sparks, glow
  { const fx2 = W * 0.44, fl = 0.72 + 0.28 * Math.sin(now * 11) + 0.08 * Math.sin(now * 23);
    for (let i = 0; i < 5; i++) px(c, fx2 - 14 + i * 6, gy + 6, 5, 4, "#4e555e");
    px(c, fx2 - 12, gy + 1, 24, 4, "#3a2c18"); px(c, fx2 - 8, gy - 2, 16, 4, "#4a3a22");
    c.shadowColor = "#ff9f43"; c.shadowBlur = 30 * fl;
    c.fillStyle = "#ff6b3d"; c.beginPath(); c.moveTo(fx2 - 8, gy - 1); c.quadraticCurveTo(fx2 - 10, gy - 16 * fl, fx2, gy - 26 * fl); c.quadraticCurveTo(fx2 + 10, gy - 16 * fl, fx2 + 8, gy - 1); c.closePath(); c.fill();
    c.fillStyle = "#ffd43b"; c.beginPath(); c.moveTo(fx2 - 4, gy - 1); c.quadraticCurveTo(fx2 - 5, gy - 10 * fl, fx2, gy - 16 * fl); c.quadraticCurveTo(fx2 + 5, gy - 10 * fl, fx2 + 4, gy - 1); c.closePath(); c.fill();
    c.shadowBlur = 0;
    for (let i = 0; i < 4; i++) { const t = (now * 0.8 + i * 0.31) % 1; c.globalAlpha = 1 - t; px(c, fx2 + Math.sin(now * 2.2 + i * 7) * 8, gy - 18 - t * 44, 2, 2, "#ffb056"); } c.globalAlpha = 1;
    const glow = c.createRadialGradient(fx2, gy - 6, 6, fx2, gy - 6, 120); glow.addColorStop(0, `rgba(255,159,67,${0.14 * fl})`); glow.addColorStop(1, "rgba(255,159,67,0)"); c.fillStyle = glow; c.fillRect(fx2 - 120, gy - 126, 240, 240);
  }
  // camp gate: two heavy posts + crossbeam over the sentry's post, torchlit
  { const gx2 = W * 0.5;
    px(c, gx2 - 34, gy - 62, 8, 62, "#4a3a22"); px(c, gx2 + 26, gy - 62, 8, 62, "#4a3a22");
    px(c, gx2 - 34, gy - 62, 3, 62, "#5f4a2c"); px(c, gx2 + 26, gy - 62, 3, 62, "#5f4a2c");
    px(c, gx2 - 40, gy - 70, 80, 10, "#54422a"); px(c, gx2 - 40, gy - 70, 80, 3, "#6b5636");
    c.fillStyle = "#e8dcc0"; c.font = "8px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText("NORTH WATCH", gx2, gy - 63);
    for (const s of [-1, 1]) { const tx2 = gx2 + s * 30 + (s > 0 ? 4 : 4); const fl2 = 0.65 + 0.35 * Math.sin(now * 10 + s * 3);
      c.shadowColor = "#ffb14d"; c.shadowBlur = 12 * fl2; circ(c, tx2, gy - 74, 4 * fl2, "#ff9f43"); circ(c, tx2, gy - 75, 2.5 * fl2, "#ffe066"); c.shadowBlur = 0; }
  }
  // watchtower rising behind the palisade, with a lookout on the platform
  { const wx2 = W * 0.94, py2 = gy - 78;
    px(c, wx2 - 18, py2 + 12, 5, gy - py2 - 12, "#3f3220"); px(c, wx2 + 13, py2 + 12, 5, gy - py2 - 12, "#3f3220");
    c.strokeStyle = "#3f3220"; c.lineWidth = 3; c.beginPath(); c.moveTo(wx2 - 16, gy - 8); c.lineTo(wx2 + 16, py2 + 16); c.moveTo(wx2 + 16, gy - 8); c.lineTo(wx2 - 16, py2 + 16); c.stroke();
    px(c, wx2 - 24, py2, 48, 8, "#54422a"); px(c, wx2 - 24, py2, 48, 2, "#6b5636"); // platform
    for (let rx2 = wx2 - 22; rx2 <= wx2 + 18; rx2 += 10) px(c, rx2, py2 - 12, 3, 12, "#4a3a22");
    px(c, wx2 - 24, py2 - 14, 48, 3, "#5f4a2c"); // railing
    P(c, wx2, py2, (cc) => soldier(cc, 0, 0, -1)); // the lookout
  }
  // troops: a marching patrol, two sparring recruits, one warming his hands
  { const pw = Math.sin(now * 0.45), pd = Math.sign(Math.cos(now * 0.45)) || 1, px2 = W * (0.36 + 0.05 * pw);
    P(c, px2, gy, (cc) => soldier(cc, 0, 0, pd, Math.sin(now * 7) * 3));
    P(c, px2 - 26 * pd, gy, (cc) => soldier(cc, 0, 0, pd, Math.sin(now * 7 + 2.4) * 3));
  }
  for (const [sx2, sf] of [[W * 0.2, 1], [W * 0.25, -1]]) { // sparring pair with waster swords
    P(c, sx2, gy, (cc) => { soldier(cc, 0, 0, sf); const sww = Math.sin(now * 5 + sf) * 0.5;
      cc.save(); cc.translate(sf * 6, -16); cc.rotate(sf * (0.7 + sww)); px(cc, 0, -14, 2, 14, "#8a6d3b"); cc.restore(); });
  }
  P(c, W * 0.475, gy, (cc) => { // trooper warming his hands at the fire
    px(cc, -6, -18, 12, 12, "#4a5568"); px(cc, -6, -7, 14, 4, "#4a5568"); px(cc, 6, -7, 4, 7, "#2f3a2a");
    px(cc, -5, -27, 10, 10, "#c89a72"); px(cc, -6, -30, 12, 5, "#7a828c");
    px(cc, -9, -14, 4, 3, "#c89a72");
  });
  // weapon rack + training dummy
  { const rx2 = W * 0.575;
    px(c, rx2 - 14, gy - 26, 28, 3, "#4a3a22"); px(c, rx2 - 14, gy - 4, 28, 4, "#4a3a22");
    for (let i = 0; i < 3; i++) { const sx3 = rx2 - 8 + i * 8; c.save(); c.translate(sx3, gy); c.rotate(0.12 - i * 0.12); px(c, -1, -34, 2, 34, "#8a6d3b"); c.fillStyle = "#9aa3ad"; c.beginPath(); c.moveTo(-3, -34); c.lineTo(0, -41); c.lineTo(3, -34); c.closePath(); c.fill(); c.restore(); }
  }
  { const dx2 = W * 0.855;
    px(c, dx2 - 2, gy - 34, 4, 34, "#5a4424"); px(c, dx2 - 10, gy - 28, 20, 4, "#5a4424");
    circ(c, dx2, gy - 34, 6, "#a9844a"); px(c, dx2 - 7, gy - 26, 14, 12, "#8a6d3b");
    px(c, dx2 - 4, gy - 32, 2, 2, "#3a2c18"); px(c, dx2 + 2, gy - 32, 2, 2, "#3a2c18");
  }
  // supply crates stacked by the captain's post
  drawCrate(c, W * 0.74, gy - 14, 22, 16); drawCrate(c, W * 0.755, gy - 28, 18, 14);
  drawBarrel(c, W * 0.785, gy, 16, 20);
  // shoreline: dark water, beached raft with anything not yet carried up
  c.fillStyle = "#16344e"; c.fillRect(0, gy + 14, W * 0.13, H - gy - 14);
  px(c, 0, gy + 14, W * 0.13, 3, "#0f2739");
  for (let i = 0; i < 2; i++) { c.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(now * 2.2 + i * 2.4)); px(c, W * (0.02 + i * 0.05), gy + 24 + i * 16, 7, 2, "#bfe0ff"); } c.globalAlpha = 1;
  raftBody(c, W * 0.02 + 36, gy + 4);
  drawCargo(c, W * 0.1, gy + 4, raftCargo);
  drawCargo(c, W * 0.66, gy + 4, campSupplies);   // supplies dropped at the captain's feet
  P(c, W * 0.5, gy, (cc) => npc(cc, 0, 0, "#495057", "#c89a72", "#23262b")); // sentry
  P(c, W * 0.7, gy, (cc) => npc(cc, 0, 0, "#7a1f1f", "#d8a878", "#2b2018")); // captain
}
function drawRaft(c, W, gy, now) {
  const H = els.H;
  // open water from the far bank down; the shell's treeline above reads as the far shore
  c.fillStyle = "#16344e"; c.fillRect(0, gy, W, H - gy);
  px(c, 0, gy, W, 3, "#0f2739"); // dark waterline against the far bank
  for (let i = 0; i < 8; i++) { c.strokeStyle = "rgba(120,180,225,0.28)"; c.lineWidth = 1; const yy = gy + 14 + i * 16; c.beginPath(); c.moveTo(0, yy + Math.sin(now * 3 + i) * 3); c.lineTo(W, yy + Math.sin(now * 3 + i + 2) * 3); c.stroke(); }
  // the moon lays a broken silver path on the water
  for (let i = 0; i < 7; i++) { const my2 = gy + 10 + i * 14; c.globalAlpha = (0.32 - i * 0.035) * (0.6 + 0.4 * Math.sin(now * 2.4 + i * 1.7)); px(c, W * 0.13 - 14 + Math.sin(now * 1.3 + i * 2) * 8, my2, 24 - i * 2, 3, "#bfd9f5"); } c.globalAlpha = 1;
  for (let i = 0; i < 4; i++) { c.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(now * 2 + i * 1.9)); px(c, ((i * 271 + 90) % W), gy + 22 + (i * 47) % Math.max(20, H - gy - 40), 8, 2, "#9fc4e8"); } c.globalAlpha = 1;
  const rx = W * (0.08 + 0.84 * raftP), ry = gy + Math.sin(now * 2) * 4;
  // wake ripples trailing the raft
  for (let i = 0; i < 4; i++) { const t = (now * 0.7 + i * 0.26) % 1; c.globalAlpha = 0.4 * (1 - t); c.strokeStyle = "#bfd9f5"; c.lineWidth = 1.5; c.beginPath(); c.arc(rx - 40 - t * 46, ry + 10, 4 + t * 9, -0.6, 0.6); c.stroke(); } c.globalAlpha = 1;
  // the raft: lashed logs with a push pole working the water
  raftBody(c, rx, ry);
  { const lean = 0.5 + Math.sin(now * 1.6) * 0.14; // the hero poles the raft along
    c.strokeStyle = "#8a6d3b"; c.lineWidth = 2.5; c.beginPath();
    c.moveTo(rx + 14 - Math.cos(lean) * 30, ry - 4 - Math.sin(lean) * 34); c.lineTo(rx + 14 + Math.cos(lean) * 14, ry + 12); c.stroke();
    c.globalAlpha = 0.5; c.strokeStyle = "#bfd9f5"; c.lineWidth = 1.5; c.beginPath(); c.arc(rx + 14 + Math.cos(lean) * 14, ry + 12, 5 + Math.sin(now * 4) * 2, -0.7, 0.7); c.stroke(); c.globalAlpha = 1; }
  drawCargo(c, rx + 18, ry);   // the supplies you loaded, riding along
  P(c, rx, ry, hero);
  // thin drifting mist over the water
  for (let i = 0; i < 3; i++) { const mx2 = ((now * (7 + i * 4) + i * 420) % (W + 260)) - 130; c.fillStyle = "rgba(190,210,232,0.05)"; c.beginPath(); c.ellipse(mx2, gy + 34 + i * 26, 90, 9, 0, 0, Math.PI * 2); c.fill(); }
}
async function raftTransition() { scene = "raft"; raftP = 0; await anim(2.6, (p) => (raftP = p)); }
// grab each supply pile, carry the whole armful to the pier, drop it all on the raft, then board
async function loadRaft(counts) {
  raftCargo = { armor: 0, food: 0, water: 0 };
  const piles = { armor: 0.16, food: 0.28, water: 0.40 };
  for (const k of ["armor", "food", "water"]) {
    if (!counts[k]) continue;
    await walkTo(piles[k]); char.grabbing = 1; await wait(0.45); char.grabbing = 0;  // grab this supply
  }
  await walkTo(0.7); char.facing = 1; char.grabbing = 1; await wait(0.6);            // at the pier edge — load it all on at once
  raftCargo = { armor: counts.armor || 0, food: counts.food || 0, water: counts.water || 0 };
  char.grabbing = 0; await wait(0.35);
  await walkTo(0.9);   // board the raft along the pier
  await wait(0.3);
}
// at the camp: gather the whole load off the raft, drop it all by the captain, then shake hands
async function dropOff() {
  campSupplies = { armor: 0, food: 0, water: 0 };
  await walkTo(0.1); char.facing = 1; char.grabbing = 1; await wait(0.55); char.grabbing = 0;  // lift the whole load off the raft
  await walkTo(0.6); char.facing = 1; char.grabbing = 1; await wait(0.55);                     // carry it over and set it all down
  campSupplies = { armor: raftCargo.armor, food: raftCargo.food, water: raftCargo.water };
  raftCargo = { armor: 0, food: 0, water: 0 };
  char.grabbing = 0; await wait(0.4);
  char.grabbing = 1; await wait(0.8); char.grabbing = 0;                                       // shake the captain's hand
}

// the checker IS the note: the game appends exactly the code the wall manifest shows
const KEEP_MANIFEST_RUN = "plate_weight = 10\ncrate_weight = 4\nbarrel_weight = 3\ncorrect_items = 0\nif armor * plate_weight == 10:\n    correct_items = correct_items + 1\nif food * crate_weight == 8:\n    correct_items = correct_items + 1\nif water * barrel_weight == 3:\n    correct_items = correct_items + 1";
const KEEP_MANIFEST_LESSON =
  "Click the manifest on the wall. It is written in Python: the keep's quartermasters trust code more than words. Read each if line and work out what values of armor, food and water make all three conditions true. Then set those three variables. Your load only sails when correct_items reaches 3.";

async function startQuest(name) {
  await say("Knight-Captain", `So you want the keep's trust, ${name}? Earn it.`);
  await say("Knight-Captain", "Pack the supply cart in the storage room for the north watch. Read the captain's checklist, exact amounts, mind the weight.");
  await say("Knight-Captain", "And the army opens to no stranger. Take my sealed orders. The watchword's written inside. Read it from your pack when the guard asks.");
  giveItem(ORDERS_NOTE);
  await say("", "📜 The Sealed Orders are in your inventory (top-right). Click them any time to read the watchword.");
  questStep = 1;
  await playBeat1(name);
}
async function playBeat1(name) {
  await fadeTo("storage"); char.x = els.W * 0.06; char.facing = 1; prog(name + " · 1.3"); raftCargo = { armor: 0, food: 0, water: 0 };
  await say("", "The storage room. Piles of armour, food and water on the left; a raft waits at the dock on the right.");
  await say("", "The captain's manifest is pinned to the wall, glowing in the lantern light. Click the note to read what the north watch needs.");
  const r = await ask({
    prompt: "Pack the supply cart",
    placeholder: "armor = 1\nfood = 2\nwater = 1", rows: 3,
    concept: "if", task: KEEP_MANIFEST_LESSON, append: KEEP_MANIFEST_RUN,
    validate: (r) => (Number(r.vars.correct_items) === 3 ? null : "The checks came back short. Read each if line on the manifest: what value makes its condition true?"),
  }, null);
  await say("", "Three checks, all true. You just read your first if statements, and they are the last new tool of the introduction. From here the world stops teaching and starts testing: same tools, harder problems.");
  await say("Guard", "Right, grab what's on the list and load the raft.");
  await loadRaft({ armor: Number(r.vars.armor), food: Number(r.vars.food), water: Number(r.vars.water) });
  await say("Guard", "That's her loaded. Cast off and float her across to the camp.");
  await raftTransition();
  await playBeat2(name);
}
async function playBeat2(name) {
  scene = "camp"; char.x = els.W * 0.02; char.facing = 1;
  await walkTo(0.16);   // step off the raft onto the shore
  await say("Captain", "HALT! Don't take another step without the secret code! Speak it now, stranger.");
  await say("", "📜 Forgot it? Open your Sealed Orders in the inventory (top-right) and read the watchword.");
  await ask({
    prompt: "This code is already written for you. Press Run, then type the secret code when the box appears.",
    prefill: 'secret_string = input()\nif secret_string == WATCHWORD:\n    print("Pass, friend.")\nelse:\n    print("Halt!")',
    readonly: true, rows: 4,
    seed: 'WATCHWORD="ironwatch"', inputPrompt: "The captain waits. Speak the secret code:",
    concept: ["input", "if"], task: "Read the code, then run it. You do not write this one. What you type becomes secret_string, and the == test checks whether it equals the watchword. The watchword is in your sealed orders if you forgot it.",
    validate: (r) => (r.vars.secret_string === "ironwatch" ? null : "That's not the watchword. Check your sealed orders and Run again."),
  }, null);
  await say("Captain", "The watchword. Good. Pass, friend.");
  await say("Captain", "The north-watch supplies! Bring them up off the raft and set them down here, scout.");
  await dropOff();
  await say("Captain", "Every crate accounted for. The army won't go hungry. My thanks, and my hand on it.");
  await say("Captain", "One more thing, scout. A report for your knight-captain, and I need to know you have it word for word. Listen, then say it back.");
  await ask({
    prompt: "Run the code, then accept the captain's message when the box appears.",
    prefill: 'order = input()\nprint("Message for the knight:", order)',
    readonly: true, rows: 2,
    concept: "input",
    task: "The captain speaks and input() catches his words. His message is already on your lips: accept it, or say it your own way.",
    inputPrompt: "The captain, slow and clear. Carry this to your knight-captain, word for word:",
    inputDefault: "The city is being reclaimed, but something sinister stirs in the dark. We'll need someone to go scout ahead to see what we're up against.",
    validate: (r) => (String(r.vars.order || "").toLowerCase().includes("scout") ? null : 'The order must carry the word "scout", so there is no mistaking what the army needs.'),
  }, null);
  await say("Captain", "Word for word. He'll want that quickly. Off you go.");
  questStep = 2;
  await fadeTo("keep"); char.x = els.W * 0.06; char.facing = 1; setupTownsfolk();
  setLocations(["craftsman", "forhire", "blacksmith", "armorsmith", "knight", "chamber"]);
  await say("", 'Back in the keep, the captain\'s report in hand. Carry it to the knight: you.walk("knight").');
}
async function playBeat3(name) {
  await say("Knight-Captain", "You crossed the water and came back whole? Then report, scout. The captain's words, exactly as he gave them.");
  const ORDERS_LINE = `army_orders = "The city is being reclaimed, but something sinister stirs in the dark. We'll need someone to go scout ahead to see what we're up against."`;
  await ask({
    prompt: "Deliver the captain's report",
    prefill: ORDERS_LINE + "\n",
    placeholder: ORDERS_LINE + "\nprint(army_orders)", rows: 2,
    concept: "print-var",
    task: "The captain's exact words already sit in the string variable army_orders, declared on line 1. Add a print statement under it that speaks the variable aloud.",
    validate: (r) => (/print\s*\(\s*army_orders\s*\)/.test(lastSrc) && r.stdout.toLowerCase().includes("sinister") ? null : "Add print(army_orders) under the declaration, so his exact words come out."),
  }, (r) => speech(r.stdout));
  await say("Knight-Captain", "Something sinister in the dark... and the captain wants a scout to go see what we're up against. That scout is you.");
  await playBeat3Pay(name);
}
async function playBeat3Pay(name) {
  await say("Knight-Captain", "But no scout of mine walks the road to the city in cloth. You'll need armor for what's out there.");
  await say("Knight-Captain", "Here's a scout's pay. One gold and seventy-five: 1.75. A coin with a decimal point is a float; add it to your purse.");
  const before = char.gold;
  await ask({
    prompt: "Take your scout's pay",
    placeholder: "gold = gold + 1.75", rows: 1,
    seed: `gold=${before}`, requireOp: "+",
    concept: ["float", "add"], task: "Add your 1.75 pay to your gold.",
    validate: (r) => (Math.abs(Number(r.vars.gold) - (before + 1.75)) < 0.001 ? null : `Add 1.75 so that gold = ${(before + 1.75).toFixed(2)}.`),
  }, null);
  char.gold = before + 1.75; logCmd(`gold = ${char.gold.toFixed(2)}`, true);
  await say("Knight-Captain", "The armoury's unlocked. See the armorsmith and kit yourself out before the scouting run.");
  armoryOpen = true; questStep = 3;
}
// keep the CONST declarations at the top of the editor in sync with the rack:
// clicking a piece writes its line, unclicking removes it, the player's own
// code below is preserved untouched
function updateArmoryEditor() {
  if (!currentInput) return;
  const decls = KIT_PIECES.filter((k) => armoryPicked[k] && !char.kit[k]).map((k) => `CONST_${k.toUpperCase()} = 0.50`);
  const rest = Editor.getValue().split("\n").filter((l) => !/^CONST_\w+\s*=\s*0\.50\s*$/.test(l.trim()));
  while (rest.length && !rest[0].trim()) rest.shift();
  Editor.setValue(decls.concat(decls.length && rest.length ? [""] : [], rest).join("\n"));
}
// one round of shopping at the booth: pick pieces, tally with the constants, pay.
// allowExit lets return visitors leave empty-handed by running total = 0.
async function shopRound(allowExit) {
  const seed = `gold=${char.gold}\n` + KIT_PIECES.map((k) => `CONST_${k.toUpperCase()}=0.50`).join("\n");
  const r = await ask({
    prompt: "Click the gear you want on the rack, then tally your order and pay",
    placeholder: "total = CONST_HELMET + CONST_BOOTS\ngold = gold - total", rows: 2, seed,
    concept: ["constant", "add"],
    task: "Click a piece and its constant is declared at the top of your code. Below those declarations, add YOUR constants into total, then pay: gold = gold - total." + (allowExit ? " To leave empty handed, run  total = 0." : ""),
    validate: (rr) => {
      const picked = KIT_PIECES.filter((k) => armoryPicked[k] && !char.kit[k]);
      if (allowExit && Number(rr.vars.total) === 0 && picked.length === 0) return null;
      if (!picked.length) return "Click at least one piece on the rack first. Your slip is empty.";
      for (const p of picked) if (!lastSrc.includes("CONST_" + p.toUpperCase())) return `Your slip lists CONST_${p.toUpperCase()}. Use it in the tally.`;
      const want = 0.5 * picked.length;
      if (want > char.gold + 1e-9) return "You cannot afford that many pieces. Unclick some.";
      if (Math.abs(Number(rr.vars.total) - want) > 0.001) return `total should come to ${want.toFixed(2)}.`;
      if (Math.abs(Number(rr.vars.gold) - (char.gold - want)) > 0.001) return `Now pay: gold = gold - total (should leave ${(char.gold - want).toFixed(2)}).`;
      return null;
    },
  }, null);
  const bought = KIT_PIECES.filter((k) => armoryPicked[k] && !char.kit[k]);
  if (!bought.length) return false; // left empty handed
  for (const p of bought) { char.kit[p] = true; armoryPicked[p] = false; }
  char.gold = +(char.gold - 0.5 * bought.length).toFixed(2);
  if (Sv) Sv.write({ gold: char.gold });
  logCmd(`gold = ${char.gold.toFixed(2)}  # bought: ${bought.join(", ")}`, true);
  await say("Armorsmith", bought.length === 1 ? "One piece, fitted and yours." : `${bought.length} pieces, fitted and yours.`);
  if (KIT_PIECES.every((k) => char.kit[k]) && char.maxHearts === 5) {
    char.maxHearts = 6; char.hearts = Math.min(char.maxHearts, char.hearts + 1);
    await say("", "The full kit settles onto your shoulders. You stand sturdier: +1 heart.");
  }
  return true;
}
async function playBeat4(name) {
  await say("Armorsmith", "So the captain's paying for kit now? Step up to the booth, scout. Half a gold a piece, any of the five.");
  await fadeTo("armory");
  await say("", "The rack holds five pieces. Click what you want and it lands on your order slip. Buy all five and the full kit grants an extra heart.");
  await shopRound(false);
  char.hasArmor = true;
  await fadeTo("keep");
  questStep = 4;
  await say("", 'Kit bought and fitted. Report back to the knight-captain: you.walk("knight").');
}
// the wrap-up: report back to the knight in your new steel
async function playBeatWrap(name) {
  await say("Knight-Captain", "Look at you, scout. Steel where there was cloth this morning.");
  await say("Knight-Captain", "Your orders: report to the Iron Guard's forward camp, half a day up the road toward the city. Their captain will want eyes on whatever stirs out there.");
  questStep = 5; lesson1Done = true;
  if (Sv) { Sv.completeChapter(1); Sv.write({ gold: char.gold }); awardXP(40); } // chapter clear bonus; unlocks The Keep on the map
  await say("", 'Lesson 1.3 complete. When you are ready, take the road: you.walk("road").');
}
// return visits to the armorsmith reopen the booth for the remaining pieces
async function shopVisit() {
  if (KIT_PIECES.every((k) => char.kit[k])) { await say("Armorsmith", "Full kit and well worn. Nothing left on my rack for you, scout."); return; }
  await say("Armorsmith", "Back for the rest of the kit? Step up.");
  await fadeTo("armory");
  await shopRound(true);
  await fadeTo("keep");
}

async function playKeep(name) {
  await fadeTo("keep"); char.x = els.W * 0.06; char.facing = 1; zoms = []; ARROWS = []; setupTownsfolk(); prog(name + " · 1.3"); setLocations(["craftsman", "forhire", "blacksmith", "armorsmith", "knight", "chamber", "proving"]);
  if (survivorFollow) { survivor = { x: char.x + 36, y: 0, state: "beside", wphase: 0 }; await say("Survivor", "You've brought me to safety. I won't forget it. Thank you, friend."); survivor = null; survivorFollow = false; }
  else survivor = null;
  await say("", "Inside the keep at last. Townsfolk mill about; four traders keep stalls along the back wall.");
  await say("", "A red carpet runs up the centre to a grand staircase, and the sealed doors of the king's chamber above it.");
  await say("", 'An armoured knight stands watch to the east, a quest-marker above him. Wander: walk to a stall, the knight, or the chamber, e.g. you.walk("knight").');
  while (true) {
    const r = await ask({ prompt: 'Explore the keep, e.g. you.walk("knight") or you.walk("proving"):', placeholder: 'you.walk("knight")', concept: "walk", validate: (rr) => { if (!rr.walk) return 'Type a you.walk("...") command.'; if (!SCENES.keep[rr.walk]) return "Walk to: craftsman, forhire, blacksmith, armorsmith, knight, chamber, or proving."; return null; } }, null);
    logCmd(`you.walk("${r.walk}")`, true);
    await goTo(r.walk);
    if (r.walk === "road") {
      if (questStep >= 5) { await playFallenCamp(name); continue; }
      await say("", "The road waits, but your business in the keep is not done.");
    } else if (r.walk === "proving") {
      if (!provingUnlocked) await say("Drillmaster", "The proving grounds open to seasoned scouts, not fresh ones. Your training here comes later.");
      else {
        const done = TRIALS.filter((tt) => Sv && Sv.isTrialDone(tt.id)).length;
        await say("Drillmaster", done === 0 ? "So the captain vouches for you. Eight trials, real puzzles, no hand-holding. Show me what you can build." : done >= TRIALS.length ? "Every trial bested. There's nothing left I can teach you, scout." : `${done} of ${TRIALS.length} trials down. Back for more? Good.`);
        openTrialBoard();
      }
    } else if (r.walk === "chamber") {
      if (chamberUnlocked) await say("", "The great doors swing open onto the king's chamber…");
      else { await say("", "You climb the stairs. The king's chamber doors are bound shut with a heavy gold lock."); await say("Guard", "None pass to the king. These doors open later in your story, survivor."); }
    } else if (r.walk === "knight") {
      if (questStep === 0) await startQuest(name);
      else if (questStep === 2) await playBeat3(name);
      else if (questStep === 3) await say("Knight-Captain", "The armoury's open. See the armorsmith for your scout kit before you report back.");
      else if (questStep === 4) await playBeatWrap(name);
      else if (questStep >= 5) await say("Knight-Captain", "You've earned the keep's trust, scout. Rest. The north gate is tomorrow's worry.");
      else await say("Knight-Captain", "The cart won't pack itself. Off with you.");
    } else {
      if (r.walk === "armorsmith" && armoryOpen && questStep < 5) await playBeat4(name);
      else if (r.walk === "armorsmith" && questStep >= 5) await shopVisit();
      else if (r.walk === "armorsmith") await say(KEEP_VENDOR.armorsmith[0], "The captain hasn't cleared you to trade yet. See the knight.");
      else await say(LOCKED_STALL[r.walk][0], LOCKED_STALL[r.walk][1]); // craftsman/forhire/blacksmith stay locked until later chapters
    }
  }
}

const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
const CH = 1.55;
function P(c, x, gy, fn) { c.save(); c.translate(x, gy); c.scale(CH, CH); fn(c, 0, 0); c.restore(); }
function draw(now) {
  const c = els.ctx, W = els.W, H = els.H, gy = H * 0.74;
  // night palette matched to the title screen (survive.js): deeper sky, silhouette treeline, darker grass
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0d1626"); g.addColorStop(0.5, "#16243c"); g.addColorStop(0.74, "#21303c"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const sx = (i * 89) % W, sy = (i * 53) % (H * 0.55); c.globalAlpha = 0.2 + 0.45 * Math.abs(Math.sin(now * 0.5 + i)); px(c, sx, sy, 2, 2, "#cfe0f5"); } c.globalAlpha = 1;
  const outdoors = scene === "wildwood" || scene === "clearing" || scene === "castle" || scene === "camp" || scene === "raft"; // raft: the treeline reads as the far bank
  if (outdoors) {
    // moon with glow + craters (the scene's light source, upper left)
    const mx = W * 0.13, my = H * 0.15;
    c.shadowColor = "rgba(215,232,255,0.75)"; c.shadowBlur = 34; circ(c, mx, my, 21, "#dfe9f5"); c.shadowBlur = 0;
    circ(c, mx - 6, my - 4, 4, "#c3d2e4"); circ(c, mx + 7, my + 3, 3, "#c9d7e8"); circ(c, mx + 1, my + 9, 2, "#c3d2e4");
    // slow drifting cloud wisps
    for (let i = 0; i < 3; i++) {
      const cw = 150 + i * 60, cx = ((now * (5 + i * 3) + i * 500) % (W + cw * 2)) - cw, cy = H * (0.1 + i * 0.08);
      c.fillStyle = `rgba(180,198,222,${0.05 + i * 0.02})`;
      c.beginPath(); c.ellipse(cx, cy, cw / 2, 11 + i * 3, 0, 0, Math.PI * 2); c.ellipse(cx + cw * 0.22, cy - 7, cw / 3, 9, 0, 0, Math.PI * 2); c.fill();
    }
    // distant forest silhouette behind the playfield
    c.fillStyle = "#0e1a14";
    for (let i = 0; i < Math.ceil(W / 60) + 1; i++) { const x = i * 60 + ((i * 37) % 22), h = 46 + ((i * 53) % 38); c.beginPath(); c.moveTo(x - 34, gy); c.lineTo(x, gy - h); c.lineTo(x + 34, gy); c.closePath(); c.fill(); }
  }
  for (let i = 0; i * 26 < W; i++) px(c, i * 26, gy, 26, H - gy, i % 2 ? "#22512c" : "#275c32");
  px(c, 0, gy, W, 3, "#2f6a3a"); // moonlit rim where the treeline meets the grass
  for (let i = 0; i < 24; i++) { const dx = (i * 211) % W, dy = gy + 8 + ((i * 97) % Math.max(8, H - gy - 16)); px(c, dx, dy, 18 + ((i * 31) % 22), 3, "rgba(9,26,13,0.16)"); } // soft worn patches
  for (let i = 0; i < 12; i++) px(c, (i * 173 + 40) % W, gy + 12 + ((i * 61) % Math.max(6, H - gy - 20)), 3, 2, "#215030"); // pebbles
  for (let i = 0; i < 18; i++) { const x = (i * 71) % W, y = gy + 16 + (i * 37) % (H - gy - 22), sw = Math.sin(now * 2 + i) * 2; c.strokeStyle = "#1b4223"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x + sw, y - 5); c.stroke(); }
  if (outdoors) { // fireflies drifting over the grass
    for (let i = 0; i < 9; i++) {
      const t = now * 0.25 + i * 1.7, fx = (((i * 137 + Math.sin(t) * 46) % W) + W) % W, fy = gy - 6 - ((i * 53) % 52) - Math.sin(t * 2.3) * 9;
      c.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(t * 3 + i)); px(c, fx, fy, 2, 2, "#d9f77f");
    }
    c.globalAlpha = 1;
  }

  if (scene === "wildwood") drawWildwood(c, W, gy, now);
  else if (scene === "clearing") drawClearing(c, W, gy, now);
  else if (scene === "keep") drawKeep(c, W, gy, now);
  else if (scene === "storage") drawStorage(c, W, gy, now);
  else if (scene === "camp") drawCamp(c, W, gy, now);
  else if (scene === "raft") drawRaft(c, W, gy, now);
  else if (scene === "armory") drawArmory(c, W, gy, now);
  else if (scene === "fallencamp") drawFallenCamp(c, W, gy, now);
  else drawCastle(c, W, gy, now);

  // arrows
  for (const a of ARROWS) {
    if (a.dead) continue;
    const dist = Math.max(1, Math.abs(a.target.x - a.sx)), prog = Math.min(1, Math.abs(a.x - a.sx) / dist), dir = Math.sign(a.target.x - a.sx) || 1;
    const arc = Math.min(16, dist * 0.08), ay = gy - 18 - Math.sin(prog * Math.PI) * arc;
    const ang = -dir * Math.cos(prog * Math.PI) * Math.atan2(arc * Math.PI, dist); // points along the flight path
    c.save(); c.translate(a.x, ay); c.rotate(ang); if (dir < 0) c.scale(-1, 1);
    c.strokeStyle = "#c9a878"; c.lineWidth = 2; c.beginPath(); c.moveTo(-14, 0); c.lineTo(2, 0); c.stroke(); // shaft
    c.fillStyle = "#d6dee8"; c.beginPath(); c.moveTo(7, 0); c.lineTo(1, -2.5); c.lineTo(1, 2.5); c.closePath(); c.fill(); // steel head
    c.fillStyle = "#c23a3a"; c.beginPath(); c.moveTo(-14, 0); c.lineTo(-18, -3); c.lineTo(-12, 0); c.lineTo(-18, 3); c.closePath(); c.fill(); // fletching
    c.restore();
  }
  // hero — rises smoothly while waking; blinks briefly after taking a hit.
  // (skip in raft/armory — those scenes draw their own posed hero)
  if (scene !== "raft" && scene !== "armory" && !(invinc > 0 && Math.floor(now * 12) % 2)) {
    const vs = scene === "wildwood" ? 0.32 + 0.68 * char.rise : 1;
    c.save(); c.translate(char.x, heroGroundY(gy)); c.scale(CH, CH * vs); hero(c, 0, 0); c.restore();
  }
  // bestow glow
  if (bowFx > 0) sparkle(c, char.x, gy - 34, bowFx, "#9be7ff");

  // warm ambient light around the hero + a soft edge vignette (title-screen atmosphere)
  if (scene !== "raft") {
    const lg = c.createRadialGradient(char.x, gy - 20, 12, char.x, gy - 20, 170);
    lg.addColorStop(0, "rgba(255,178,102,0.10)"); lg.addColorStop(1, "rgba(255,178,102,0)");
    c.fillStyle = lg; c.fillRect(char.x - 170, gy - 190, 340, 340);
  }
  const vg = c.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.42, W / 2, H * 0.46, Math.max(W, H) * 0.78);
  vg.addColorStop(0, "rgba(5,8,14,0)"); vg.addColorStop(1, "rgba(5,8,14,0.42)");
  c.fillStyle = vg; c.fillRect(0, 0, W, H);

  // gold HUD (below the top-left title chip)
  if (char.gold > 0) {
    c.fillStyle = "rgba(7,11,17,0.82)"; rr(c, 16, 56, 120, 32, 8); c.fill(); c.strokeStyle = "#3a3a18"; c.stroke();
    c.fillStyle = "#e6a700"; c.beginPath(); c.arc(35, 72, 9, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffd43b"; c.beginPath(); c.arc(35, 72, 6.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#caa000"; c.font = "bold 9px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText("$", 35, 75);
    c.fillStyle = "#ffe066"; c.font = "15px 'IBM Plex Mono',monospace"; c.textAlign = "left"; c.fillText("× " + char.gold.toFixed(2), 50, 77);
  }

  // hearts (combat scenes) + damage flash + death overlay
  if (scene === "clearing" || scene === "castle") drawHearts(c, W);
  if (dmgFlash > 0) { c.fillStyle = `rgba(200,30,30,${dmgFlash * 0.32})`; c.fillRect(0, 0, W, H); }
  if (dying) { c.fillStyle = "rgba(6,0,0,0.72)"; c.fillRect(0, 0, W, H); c.fillStyle = "#ff6b6b"; c.font = "700 22px 'Chakra Petch',sans-serif"; c.textAlign = "center"; c.fillText("Overwhelmed. Restarting the scene…", W / 2, H / 2); }

  // dialogue — NPC lines appear in a speech bubble over the speaker's head;
  // narrator/guide lines (no speaker) use a centered panel at the top of the screen.
  // While the IDE is waiting for code, the last spoken line stays pinned (no click cue).
  const banner = dialogue || (currentInput ? lastSaid : null);
  if (banner) {
    const anch = speakerAnchor(banner.who, W, gy);
    if (anch) drawSpeechBubble(c, W, anch, banner, !!dialogue);
    else {
      c.font = "15px 'IBM Plex Mono',monospace";
      const maxW = Math.min(W * 0.62, 700), pad = 18, lh = 19;
      const whoW = banner.who ? c.measureText(banner.who + ":  ").width + 6 : 0;
      const lines = countLines(c, banner.text, maxW);
      const boxW = Math.min(maxW + whoW, W - 40) + pad * 2, boxH = 24 + lines * lh + 18;
      const bx = W / 2 - boxW / 2, by = 54;
      c.fillStyle = "rgba(7,11,17,0.92)"; rr(c, bx, by, boxW, boxH, 12); c.fill();
      c.strokeStyle = "#2a3548"; c.lineWidth = 1; c.stroke();
      let tx = bx + pad; c.textAlign = "left";
      if (banner.who) { c.font = "700 15px 'Chakra Petch',sans-serif"; c.fillStyle = "#62d27a"; c.fillText(banner.who + ":", tx, by + 28); tx += whoW; }
      c.font = "15px 'IBM Plex Mono',monospace"; c.fillStyle = "#dbe6f2"; wrapText(c, banner.text, tx, by + 28, maxW, lh);
      if (dialogue) { c.fillStyle = "#ffd43b"; c.textAlign = "right"; c.font = "12px 'IBM Plex Mono',monospace"; c.fillText("▸ click", bx + boxW - 12, by + boxH - 10); }
    }
  }
  if (fadeAmt > 0) { c.fillStyle = `rgba(5,7,11,${fadeAmt})`; c.fillRect(0, 0, W, H); }
}

function drawWildwood(c, W, gy, now) {
  drawTree(c, W * 0.56, gy, now, char.items.sticks === 0 && !char.hasBow);
  drawHut(c, W * 0.76, gy, now);
  P(c, W * 0.31, gy, (cc) => npc(cc, 0, 0, "#6741a8", "#c89060", "#241018"));
  P(c, W * 0.76 + 24, gy, (cc) => smith(cc, 0, 0));
  if (craftFx > 0) sparkle(c, W * 0.76, gy - 26, craftFx, "#ffd43b");
}
function drawClearing(c, W, gy, now) {
  // river + bridge to the east
  const rx = W * 0.84;
  c.fillStyle = "#16344e"; c.fillRect(rx, gy, W - rx, els.H - gy);
  px(c, rx - 4, gy, 6, els.H - gy, "#123044"); // shaded near bank
  for (let i = 0; i < 7; i++) { c.strokeStyle = "rgba(120,180,225,0.35)"; c.lineWidth = 1; const yy = gy + 10 + i * 11; c.beginPath(); c.moveTo(rx, yy + Math.sin(now * 3 + i) * 2); c.lineTo(W, yy + Math.sin(now * 3 + i + 2) * 2); c.stroke(); }
  for (let i = 0; i < 5; i++) { const gx = rx + 14 + ((i * 67) % Math.max(10, W - rx - 24)), gyy = gy + 14 + (i * 29) % 40; c.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(now * 2.4 + i * 2)); px(c, gx, gyy, 7, 2, "#bfe0ff"); } c.globalAlpha = 1; // moon glints
  // reeds on the bank
  for (let i = 0; i < 4; i++) { const bx2 = rx - 8 - i * 7, sway = Math.sin(now * 1.8 + i) * 2; c.strokeStyle = "#2c5a34"; c.lineWidth = 2; c.beginPath(); c.moveTo(bx2, gy + 2); c.lineTo(bx2 + sway, gy - 16 - (i % 2) * 5); c.stroke(); px(c, bx2 + sway - 1, gy - 21 - (i % 2) * 5, 3, 7, "#6b4f2a"); }
  // bridge: deck, planks, rail posts + rope
  px(c, rx - 14, gy - 2, W - rx + 16, 7, "#5a4424");
  for (let i = 0; rx - 14 + i * 13 < W; i++) px(c, rx - 14 + i * 13, gy - 7, 9, 13, i % 2 ? "#6b4f2a" : "#5a4424");
  px(c, rx - 14, gy - 9, W - rx + 16, 3, "#7a5a30");
  for (let i = 0; rx - 10 + i * 34 < W; i++) px(c, rx - 10 + i * 34, gy - 26, 4, 18, "#4a3a22"); // rail posts
  c.strokeStyle = "#8a7448"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(rx - 10, gy - 24); for (let x2 = rx + 8; x2 < W + 20; x2 += 34) c.quadraticCurveTo(x2 - 17, gy - 20, x2, gy - 24); c.stroke(); // sagging rope
  // an old stump near the fight
  px(c, W * 0.3 - 8, gy - 9, 16, 11, "#4a331c"); px(c, W * 0.3 - 8, gy - 11, 16, 3, "#63482a"); px(c, W * 0.3 - 5, gy - 10, 4, 2, "#3a2814");
  // marked centre
  const cx = W * 0.42; c.strokeStyle = "rgba(255,212,59," + (0.5 + 0.4 * Math.sin(now * 4)) + ")"; c.lineWidth = 2; c.beginPath(); c.arc(cx, gy + 8, 15, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(cx - 7, gy + 8); c.lineTo(cx + 7, gy + 8); c.moveTo(cx, gy + 1); c.lineTo(cx, gy + 15); c.stroke();
  // the survivor's tree
  drawTree(c, W * 0.72, gy, now, false, 1.5);
  // zombies (under the tree; shamble once roused)
  drawZoms(c, gy);
  // survivor
  if (survivor) P(c, survivor.x, gy + survivor.y, (cc) => npc(cc, 0, 0, "#37b24d", "#c89060", "#241018"));
}
function drawCastle(c, W, gy, now) {
  // the great keep: skyline towers behind a stone curtain wall, twin gatehouse turrets,
  // a portcullis gate over a lowered drawbridge, all torchlit
  const x = W * 0.78, base = gy - 168, half = 118;
  // distant inner towers rising behind the wall (dark skyline for depth)
  for (const [dx, w2, h2] of [[-70, 44, 92], [58, 38, 74], [-6, 56, 118]]) {
    const tx = x + dx; c.fillStyle = "#343b45"; c.fillRect(tx - w2 / 2, base - h2, w2, h2);
    for (let i = -w2 / 2; i < w2 / 2; i += 12) px(c, tx + i, base - h2 - 8, 8, 8, "#343b45");
    c.fillStyle = "#7a1f1f"; c.beginPath(); c.moveTo(tx - w2 / 2 - 4, base - h2 - 8); c.lineTo(tx, base - h2 - 8 - w2 * 0.55); c.lineTo(tx + w2 / 2 + 4, base - h2 - 8); c.closePath(); c.fill();
    px(c, tx - 3, base - h2 + 12, 6, 9, "#1a2a44"); c.fillStyle = "#3b6ea5"; c.fillRect(tx - 2, base - h2 + 13, 4, 7); // lit window
  }
  // central banner pole on the tallest tower
  px(c, x - 7, base - 118 - 8 - 56 * 0.55 - 26, 2, 26, "#3a2c18");
  { c.fillStyle = "#8a1f2e"; c.beginPath(); const fw = 5 * Math.sin(now * 2.2); const fy = base - 118 - 8 - 56 * 0.55 - 26;
    c.moveTo(x - 5, fy); c.quadraticCurveTo(x + 14 + fw, fy + 4, x + 20 + fw, fy + 9); c.lineTo(x - 5, fy + 13); c.closePath(); c.fill(); }
  // curtain wall with varied stone + cracks
  px(c, x - half, base, half * 2, gy - base, "#565d66");
  for (let yy = base; yy < gy; yy += 24) for (let xx = x - half; xx < x + half; xx += 32) {
    const v = (Math.floor(xx / 32) * 7 + Math.floor(yy / 24) * 13) % 4;
    px(c, xx + 1, yy + 1, 30, 22, v === 0 ? "#4e555e" : v === 1 ? "#535a63" : v === 2 ? "#4a5058" : "#575e67");
  }
  c.strokeStyle = "#3a4048"; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x - 70, base + 30); c.lineTo(x - 62, base + 52); c.lineTo(x - 68, base + 66); c.moveTo(x + 52, base + 80); c.lineTo(x + 60, base + 102); c.stroke(); // cracks
  px(c, x - half, base + 2, half * 2, 4, "rgba(0,0,0,0.28)"); // shadow under the parapet
  // battlements with moonlit caps
  for (let i = -half; i < half; i += 36) { px(c, x + i, base - 20, 22, 20, "#565d66"); px(c, x + i, base - 20, 22, 3, "#6e757e"); }
  // ivy spilling down the wall
  for (const [ix, ih] of [[x - half + 18, 64], [x + half - 34, 88]]) {
    c.fillStyle = "#2c5a34";
    for (let yy = 0; yy < ih; yy += 9) px(c, ix + Math.sin(yy * 0.4) * 5, base + 8 + yy, 7 + (yy % 3) * 2, 7, yy % 2 ? "#2c5a34" : "#256a33");
  }
  // twin gatehouse turrets flanking the gate (stand proud of the wall)
  for (const s of [-1, 1]) {
    const tx = x + s * 52 - 14;
    px(c, tx, base - 34, 28, gy - base + 34, "#4a515a");
    for (let yy = base - 34; yy < gy; yy += 22) px(c, tx + 2, yy + 1, 24, 20, ((yy / 22) | 0) % 2 ? "#505761" : "#4c535c");
    for (let i = 0; i < 3; i++) px(c, tx + 2 + i * 10, base - 46, 7, 12, "#4a515a");
    px(c, tx + 2, base - 46, 26, 2, "#6e757e");
    px(c, tx + 10, base + 10, 8, 14, "#1a140d"); px(c, tx + 11, base + 12, 2, 10, "#ffb14d"); // glowing arrow slit
  }
  // flanking towers with waving banners (outer works)
  for (const tx of [x - half - 30, x + half + 8]) {
    px(c, tx, base - 50, 30, gy - base + 50, "#4a515a"); for (let yy = base - 50; yy < gy; yy += 24) px(c, tx + 2, yy + 1, 26, 22, "#525962");
    c.fillStyle = "#7a1f1f"; c.beginPath(); c.moveTo(tx - 8, base - 50); c.lineTo(tx + 15, base - 78); c.lineTo(tx + 38, base - 50); c.closePath(); c.fill();
    px(c, tx + 11, base - 30, 8, 14, "#1a140d"); px(c, tx + 12, base - 28, 2, 10, "#ffb14d");
    px(c, tx + 14, base - 100, 2, 24, "#3a2c18");
    c.fillStyle = "#8a1f2e"; c.beginPath(); const fw = 6 * Math.sin(now * 2.4 + tx);
    c.moveTo(tx + 16, base - 100); c.quadraticCurveTo(tx + 30 + fw, base - 96, tx + 34 + fw, base - 90); c.lineTo(tx + 16, base - 86); c.closePath(); c.fill();
  }
  // moss at the wall's foot
  for (let i = 0; i < 6; i++) px(c, x - half + 8 + i * 36, gy - 5, 12 + (i % 3) * 5, 4, "#2c5a34");
  // the gate: tall arch, warm glow behind a portcullis grid, royal banner above
  px(c, x - 34, gy - 96, 68, 96, "#1c1610");
  c.fillStyle = "#6e757e"; c.beginPath(); c.arc(x, gy - 96, 34, Math.PI, 0); c.fill();
  c.fillStyle = "#565d66"; c.beginPath(); c.arc(x, gy - 96, 29, Math.PI, 0); c.fill();
  { const gl = c.createLinearGradient(0, gy - 96, 0, gy); gl.addColorStop(0, "rgba(255,177,77,0.05)"); gl.addColorStop(1, "rgba(255,177,77,0.16)"); c.fillStyle = gl; c.fillRect(x - 30, gy - 96, 60, 96); } // torchlight inside
  for (let i = -28; i <= 28; i += 14) px(c, x + i, gy - 110, 3, 110, "#241a0e");   // portcullis verticals
  for (let yy = gy - 88; yy < gy; yy += 22) px(c, x - 30, yy, 60, 3, "#241a0e");   // portcullis crossbars
  px(c, x - 34, gy - 96, 68, 6, "#3a2c18");
  // royal banner hanging over the arch
  px(c, x - 10, gy - 148, 20, 3, "#a8832a");
  c.fillStyle = "#6e1d1d"; c.beginPath(); c.moveTo(x - 9, gy - 145); c.lineTo(x + 9, gy - 145); c.lineTo(x + 9, gy - 118); c.lineTo(x, gy - 110); c.lineTo(x - 9, gy - 118); c.closePath(); c.fill();
  circ(c, x, gy - 130, 4, "#d9b23a");
  // lowered drawbridge the road runs over, chains up to the gatehouse
  px(c, x - 90, gy - 2, 90, 6, "#5a4424"); for (let i = 0; i < 6; i++) px(c, x - 90 + i * 15, gy - 2, 2, 6, "#3a2c18");
  px(c, x - 90, gy - 4, 90, 2, "#7a5a30");
  c.strokeStyle = "#6a727c"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(x - 86, gy - 3); c.lineTo(x - 40, gy - 92); c.moveTo(x - 12, gy - 3); c.lineTo(x - 8, gy - 92); c.stroke();
  for (const [cx2, cy2] of [[x - 86, gy - 3], [x - 40, gy - 92], [x - 12, gy - 3], [x - 8, gy - 92]]) px(c, cx2 - 2, cy2 - 2, 4, 4, "#7a828c"); // chain pins
  for (const s of [-1, 1]) { // torches flanking the gate
    const tx2 = x + s * 48; px(c, tx2 - 2, gy - 66, 4, 16, "#3a2c18");
    const fl = 0.65 + 0.35 * Math.sin(now * 11 + s * 2); c.shadowColor = "#ffb14d"; c.shadowBlur = 16 * fl;
    circ(c, tx2, gy - 70, 5 * fl, "#ff9f43"); circ(c, tx2, gy - 71, 3 * fl, "#ffe066"); c.shadowBlur = 0;
  }
  // gatekeeper peeking over the battlements
  const top = base - 20; const gxp = x - half + 50;
  px(c, gxp - 11, top - 20, 22, 20, "#565d66"); px(c, gxp - 7, top - 34, 14, 15, "#c89a72"); px(c, gxp - 8, top - 38, 16, 6, "#454c55");
  px(c, gxp - 5, top - 28, 3, 2, "#111"); px(c, gxp + 3, top - 28, 3, 2, "#111");
  if (survivor) P(c, survivor.x, gy, (cc) => npc(cc, 0, 0, "#37b24d", "#c89060", "#241018")); // the escorted survivor
  drawZoms(c, gy);
}
// zombies walk, then topple sideways when killed (fall direction = the arrow's) and fade at the end
function drawZoms(c, gy) {
  for (const z of zoms) {
    if (z.dying <= 0 && !z.alive) continue;
    const sw = (z.alive && zombiesApproach) ? Math.sin(z.wphase) : 0;
    const p = z.alive ? 0 : 1 - z.dying; // 0 upright → 1 flat
    c.save(); c.translate(z.x, gy);
    if (p > 0) { c.globalAlpha = z.dying < 0.35 ? z.dying / 0.35 : 1; c.rotate((z.fall || 1) * Math.min(1, p * 1.5) * 1.45); c.translate(0, -Math.sin(Math.min(1, p * 1.5) * Math.PI) * 3); }
    c.scale(CH, CH); zombie(c, 0, 0, sw); c.restore(); c.globalAlpha = 1;
  }
  for (const p of FX) { c.globalAlpha = Math.min(1, p.t * 2.5); px(c, p.x, p.y, 3, 3, p.col); } c.globalAlpha = 1; // impact debris
}

// sprites (drawn at local origin; P() scales/positions)
function hero(c, x, y) {
  const f = char.facing, t = performance.now() / 1000;
  const sw = char.walking ? Math.sin(char.walk) * 4 : 0;
  const bob = char.walking ? Math.abs(Math.cos(char.walk)) * 1.3 : Math.sin(t * 1.8) * 0.7; // step bounce / breathing
  const ty = y - bob; // torso and up ride the bob; feet stay planted
  const K = char.kit || {};
  // legs (steel greaves once leggings are bought) with boots (steel once bought)
  const legC = K.leggings ? "#7a828c" : "#3f6b2a", legL = K.leggings ? "#9aa3ad" : "#3f6b2a";
  px(c, x - 4, y - 4 + sw, 4, 12, legL); px(c, x + 1, y - 4 - sw, 4, 12, legC);
  const bootC = K.boots ? "#9aa3ad" : "#241a10";
  px(c, x - 4, y + 5 + sw, 4, 3, bootC); px(c, x + 1, y + 5 - sw, 4, 3, bootC);
  // quiver on the back (only once armed)
  if (char.hasBow) { c.save(); c.translate(x - f * 7, ty - 20); c.rotate(f * 0.35); px(c, -2, -6, 5, 13, "#5a3f22"); px(c, -2, -6, 5, 2, "#7a5a30"); px(c, -1, -10, 1, 5, "#e9dcc0"); px(c, 1, -11, 1, 6, "#e9dcc0"); c.restore(); }
  // torso: tunic, or a steel chestplate once bought; belt with buckle
  if (K.chestplate) {
    px(c, x - 6, ty - 22, 12, 20, "#8a939e"); px(c, x - 6, ty - 22, 3, 20, "#a5aeb8"); // plate + moonlit edge
    px(c, x - 1, ty - 22, 2, 14, "#6a727c"); px(c, x - 6, ty - 22, 12, 2, "#c9a24a"); // centre ridge + gilt collar
  } else {
    px(c, x - 6, ty - 22, 12, 20, "#6b8e23"); px(c, x - 6, ty - 22, 3, 20, "#7fa32e");
    px(c, x - 4, ty - 23, 8, 2, "#4a5f18");
  }
  px(c, x - 6, ty - 8, 12, 3, "#3a2c18"); px(c, x - 1, ty - 8, 2, 3, "#c9a24a");
  // head: skin; hair, or an open steel helm once bought; eye toward facing
  px(c, x - 5, ty - 33, 11, 11, "#e0a070");
  if (K.helmet) { px(c, x - 6, ty - 36, 12, 5, "#7a828c"); px(c, x - 6, ty - 36, 12, 2, "#9aa3ad"); px(c, x - 6, ty - 27, 12, 2, "#6a727c"); }
  else { px(c, x - 6, ty - 35, 12, 4, "#3a2c18"); px(c, x - 6 + (f > 0 ? 0 : 8), ty - 33, 4, 3, "#3a2c18"); }
  px(c, x + f * 2, ty - 29, 2, 2, "#1c1208");
  // arms + bow (steel gauntlets once bought)
  const handC = K.gauntlets ? "#9aa3ad" : "#e0a070";
  const drawing = shootT > 0;
  if (char.hasBow) {
    const bx = x + f * 11;
    c.strokeStyle = "#9c6b3f"; c.lineWidth = 2.5; c.beginPath(); c.arc(bx, ty - 16, 11, -1.1 * f, 1.1 * f); c.stroke();
    if (drawing) {
      const pull = x + f * 3; // string drawn back to the cheek, arrow nocked
      c.strokeStyle = "#e9dcc0"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(bx, ty - 26); c.lineTo(pull, ty - 18); c.lineTo(bx, ty - 6); c.stroke();
      c.strokeStyle = "#c9a878"; c.lineWidth = 2; c.beginPath(); c.moveTo(pull, ty - 18); c.lineTo(bx + f * 8, ty - 18); c.stroke();
      px(c, x + f * 1, ty - 20, f * 6, 3, handC); // draw hand at the cheek
    } else {
      c.strokeStyle = "#e9dcc0"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(bx, ty - 26); c.lineTo(bx, ty - 6); c.stroke();
    }
    px(c, x + f * 4, ty - 18, f * 7, 3, handC); // bow arm
  } else {
    const armSw = char.walking ? Math.sin(char.walk) * 3 : 0;
    px(c, x + f * 4, ty - 18 + armSw, f * 8, 3, handC);
  }
  if (char.grabbing) px(c, x + char.facing * 6, ty - 14, char.facing * 5, 8, handC); // reaching down to grab
  if (char.bubble) bubble(c, x, ty - 40, char.bubble);
}
function npc(c, x, y, cloth, skin, hair, f = -1) {
  const t = performance.now() / 1000, bob = Math.sin(t * 1.7 + (cloth.charCodeAt(2) || 0)) * 0.7; // breathe, out of phase per outfit
  const ty = y - bob;
  // legs + boots
  px(c, x - 4, y - 4, 4, 10, "#241018"); px(c, x + 1, y - 4, 4, 10, "#241018");
  px(c, x - 4, y + 3, 4, 3, "#100b08"); px(c, x + 1, y + 3, 4, 3, "#100b08");
  // tunic with moonlit edge + belt
  px(c, x - 6, ty - 22, 12, 18, cloth); px(c, x - 6, ty - 22, 3, 18, "rgba(255,255,255,0.14)");
  px(c, x - 6, ty - 8, 12, 3, "#3a2c18"); px(c, x - 1, ty - 8, 2, 3, "#c9a24a");
  // thin arms with hands
  px(c, x - 8, ty - 20, 3, 11, cloth); px(c, x + 5, ty - 20, 3, 11, cloth);
  px(c, x - 8, ty - 10, 3, 2, skin); px(c, x + 5, ty - 10, 3, 2, skin);
  // head: fringe over the brow + an eye toward whoever they face
  px(c, x - 5, ty - 32, 11, 11, skin); px(c, x - 6, ty - 34, 12, 4, hair);
  px(c, x - 6 + (f > 0 ? 0 : 8), ty - 32, 4, 3, hair);
  px(c, x + f * 2 - 1, ty - 28, 2, 2, "#1c1208");
}
function smith(c, x, y) {
  const t = performance.now() / 1000, ty = y - Math.sin(t * 1.5) * 0.6;
  // legs + heavy boots
  px(c, x - 5, y - 4, 4, 10, "#222"); px(c, x + 2, y - 4, 4, 10, "#222");
  px(c, x - 5, y + 3, 5, 3, "#100b08"); px(c, x + 2, y + 3, 5, 3, "#100b08");
  // mail shirt with a leather smith's apron
  px(c, x - 7, ty - 22, 14, 18, "#5b626b"); px(c, x - 7, ty - 22, 3, 18, "rgba(255,255,255,0.13)");
  px(c, x - 4, ty - 18, 8, 14, "#5a3a20"); px(c, x - 4, ty - 18, 8, 2, "#6e4a28");
  // arms; one hand resting on a belt hammer
  px(c, x - 9, ty - 20, 3, 11, "#5b626b"); px(c, x + 6, ty - 20, 3, 11, "#5b626b");
  px(c, x + 6, ty - 10, 3, 2, "#c89a72");
  px(c, x - 11, ty - 9, 3, 6, "#9c6b3f"); px(c, x - 12, ty - 11, 5, 3, "#7a828c"); // hammer at the hip
  // head under an open helm
  px(c, x - 6, ty - 32, 12, 11, "#c89a72");
  px(c, x - 8, ty - 35, 16, 5, "#454c55"); px(c, x - 8, ty - 28, 16, 3, "#454c55");
  px(c, x - 3, ty - 27, 2, 2, "#1c1208");
}
function zombie(c, x, y, sw = 0) {
  const f = -1; // always shambling toward the player
  // legs: rotten trousers with a stagger, torn at the knee
  px(c, x - 4, y + 8 - Math.max(0, sw) * 2, 3, 9, "#2a2014");
  px(c, x + 2, y + 8 - Math.max(0, -sw) * 2, 3, 9, "#241c10");
  px(c, x - 4, y + 13 - Math.max(0, sw) * 2, 1, 2, "#8a9a6a");
  // dark undercoat so it reads on grass
  px(c, x - 7 + f * 2, y - 6, 15, 17, "#10200c"); px(c, x - 5 + f * 4, y - 16, 12, 11, "#10200c");
  // hunched torso: shoulder hump, tattered shirt scrap, old wound
  px(c, x - 5 + f * 2, y - 4, 11, 13, "#7a8a5c"); px(c, x - 5 + f * 2, y - 4, 3, 13, "rgba(255,255,255,0.10)");
  px(c, x - 3 + f * 2, y - 6, 9, 4, "#7a8a5c");
  px(c, x + 1 + f * 2, y - 2, 5, 6, "#4a4438");
  px(c, x - 2 + f * 2, y + 3, 3, 3, "#5c1f1f");
  // head drooped forward: matted scalp, glowing eyes, slack jaw with one tooth
  px(c, x - 4 + f * 4, y - 15, 10, 10, "#9aab7a"); px(c, x - 4 + f * 4, y - 15, 10, 3, "#6b7a4c");
  c.shadowColor = "#ff3b3b"; c.shadowBlur = 5;
  px(c, x - 3 + f * 4, y - 11, 2, 2, "#ff3b3b"); px(c, x + 1 + f * 4, y - 11, 2, 2, "#ff3b3b");
  c.shadowBlur = 0;
  px(c, x - 3 + f * 4, y - 7, 5, 2, "#241206"); px(c, x - 2 + f * 4, y - 7, 1, 1, "#e8dcc0");
  // arms: one reaching hungrily ahead, one dangling
  px(c, x + f * 2 - 12, y - 4, 8, 3, "#8a9a6a"); px(c, x + f * 2 - 13, y - 3, 2, 4, "#9aab7a");
  px(c, x - f * 3, y - 2, 3, 8, "#7a8a5c");
}
function drawTree(c, x, gy, now, items, scl = 1) {
  // trunk: shaded bark with a moonlit edge and a root flare
  px(c, x - 7 * scl, gy - 46 * scl, 14 * scl, 50 * scl, "#4a331c");
  px(c, x - 7 * scl, gy - 46 * scl, 4 * scl, 50 * scl, "#63482a"); // moon side
  px(c, x + 1 * scl, gy - 40 * scl, 2 * scl, 30 * scl, "#3a2814"); // bark groove
  px(c, x - 11 * scl, gy - 5 * scl, 22 * scl, 7 * scl, "#4a331c");
  // canopy: dark base blobs with moonlit clusters on the upper left
  for (let r = 0; r < 5; r++) {
    const yy = gy - (60 + r * 11) * scl, rad = ((44 - r * 6) * scl) / 2 + Math.sin(now + r) * 2;
    c.fillStyle = r % 2 ? "#173f20" : "#1d4d27"; c.beginPath(); c.arc(x, yy, rad, 0, Math.PI * 2); c.fill();
    c.fillStyle = r % 2 ? "#256a33" : "#2c7a3c"; c.beginPath(); c.arc(x - rad * 0.32, yy - rad * 0.28, rad * 0.55, 0, Math.PI * 2); c.fill();
  }
  if (items) { c.strokeStyle = "#9c6b3f"; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + 18 + i * 6, gy + 2); c.lineTo(x + 26 + i * 6, gy - 8); c.stroke(); } c.strokeStyle = "#e9dcc0"; c.lineWidth = 2; c.beginPath(); c.arc(x + 32, gy + 4, 5, 0, Math.PI * 2); c.stroke(); if (pickupFx > 0) sparkle(c, x + 24, gy - 4, pickupFx, "#fff"); }
}
function drawHut(c, x, gy, now) {
  // survivor barricade — rough sharpened logs lashed together, ringing the hut on both flanks (drawn behind so door + smith stay in front)
  const bx0 = x - 92, bx1 = x + 92, hts = [30, 22, 34, 20, 28, 24, 32, 21, 29, 23, 31, 26, 33];
  px(c, bx0, gy - 13, bx1 - bx0, 4, "#4a3a22"); // lashing rail
  let k = 0;
  for (let p = bx0; p < bx1; p += 13) {
    const h = hts[k % hts.length], col = (k % 2) ? "#6b4f2a" : "#5a4424";
    px(c, p, gy - h, 9, h + 2, col); px(c, p, gy - h, 9, 2, "#8a6d3b"); // log + lit top edge
    c.fillStyle = col; c.beginPath(); c.moveTo(p, gy - h); c.lineTo(p + 4.5, gy - h - 9); c.lineTo(p + 9, gy - h); c.closePath(); c.fill(); // sharpened point
    k++;
  }
  c.strokeStyle = "#3a2c18"; c.lineWidth = 2; // lashed cross-sticks on the flanks
  c.beginPath(); c.moveTo(bx0 + 4, gy - 2); c.lineTo(bx0 + 40, gy - 26); c.moveTo(bx1 - 40, gy - 24); c.lineTo(bx1 - 4, gy - 2); c.stroke();
  // cabin: log walls over a stone base, gable roof with ridge, chimney + smoke
  px(c, x - 36, gy - 8, 72, 8, "#4e555e"); px(c, x - 30, gy - 8, 10, 4, "#5d656f"); px(c, x + 8, gy - 6, 12, 4, "#5d656f"); // stone footing
  px(c, x - 34, gy - 50, 68, 42, "#7a5a30"); for (let i = 0; i < 4; i++) px(c, x - 34, gy - 50 + i * 11, 68, 2, "#5a4424"); // log courses
  px(c, x - 34, gy - 50, 3, 42, "#8a6d3b"); // moonlit corner
  c.fillStyle = "#7a2a1c"; c.beginPath(); c.moveTo(x - 42, gy - 50); c.lineTo(x, gy - 78); c.lineTo(x + 42, gy - 50); c.closePath(); c.fill();
  c.strokeStyle = "#5c1f14"; c.lineWidth = 2; for (let i = 1; i <= 3; i++) { c.beginPath(); c.moveTo(x - 42 + i * 9, gy - 50 - 0.5); c.lineTo(x - 1, gy - 78 + i * 2); c.stroke(); } // roof shakes
  px(c, x - 4, gy - 82, 8, 5, "#8a3a28"); // ridge cap
  // chimney + drifting smoke
  px(c, x + 17, gy - 76, 10, 22, "#565d66"); px(c, x + 15, gy - 78, 14, 4, "#6e757e");
  for (let i = 0; i < 3; i++) { const t = (now * 0.32 + i * 0.34) % 1; c.globalAlpha = 0.28 * (1 - t); circ(c, x + 22 + Math.sin(now * 1.4 + i * 2.2) * 6 + t * 10, gy - 84 - t * 34, 4 + t * 7, "#aab6c4"); }
  c.globalAlpha = 1;
  // door with frame + handle, and a warm window
  px(c, x - 12, gy - 32, 24, 32, "#2a1d10"); px(c, x - 10, gy - 30, 20, 30, "#3a2c18"); px(c, x + 5, gy - 17, 3, 3, "#c9a24a");
  px(c, x - 28, gy - 38, 14, 12, "#241a0e"); // window frame
  const wf = 0.75 + 0.25 * Math.sin(now * 5.2); c.shadowColor = "#ffb14d"; c.shadowBlur = 14 * wf;
  px(c, x - 26, gy - 36, 10, 8, "#ffb14d"); c.shadowBlur = 0; px(c, x - 22, gy - 36, 2, 8, "#241a0e"); px(c, x - 26, gy - 33, 10, 2, "#241a0e");
}
function bubble(c, x, y, text) {
  c.font = "13px 'IBM Plex Mono',monospace"; const w = Math.min(150, c.measureText(text).width) + 14, h = 22, bx = x - w / 2, by = y - h;
  c.fillStyle = "rgba(245,247,250,0.97)"; rr(c, bx, by, w, h, 6); c.fill(); c.beginPath(); c.moveTo(x - 4, by + h); c.lineTo(x + 4, by + h); c.lineTo(x, by + h + 6); c.closePath(); c.fill();
  c.fillStyle = "#0b0e14"; c.textAlign = "center"; c.fillText(text.length > 18 ? text.slice(0, 18) + "…" : text, x, by + 15);
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function sparkle(c, x, y, amt, col) { c.globalAlpha = amt; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = (1 - amt) * 26 + 4; px(c, x + Math.cos(a) * r, y + Math.sin(a) * r, 3, 3, col); } c.globalAlpha = 1; }
// where does a speaker's head sit on screen? null → not on stage (narrator banner instead)
const SPEAKER_KEY = { "???": "stranger", stranger: "stranger", smith: "smith", "knight-captain": "knight", guard: "chamber", armorsmith: "armorsmith", blacksmith: "blacksmith", craftsman: "craftsman", captain: "gate", tam: "rubble" };
function speakerAnchor(who, W, gy) {
  if (!who) return null;
  const w = who.toLowerCase();
  if (w === "survivor") return survivor ? { x: survivor.x, y: gy + (survivor.y || 0) - 36 * CH } : null;
  if (w === "gatekeeper" && scene === "castle") return { x: W * 0.78 - 118 + 50, y: gy - 168 - 20 - 44 }; // peeking over the battlements
  if (w === "armorsmith" && scene === "armory") { const half = Math.min(860, W * 0.68) / 2; return { x: W / 2 + half * 0.42, y: els.H * 0.8 - 44 - 200 }; } // behind his counter
  const key = SPEAKER_KEY[w];
  if (!key || !SCENES[scene] || SCENES[scene][key] == null) return null;
  return { x: W * SCENES[scene][key], y: gy - 36 * CH };
}
// a readable speech bubble anchored above a character's head (bigger than the tiny status bubbles)
function drawSpeechBubble(c, W, anch, banner, clickable) {
  c.font = "14px 'IBM Plex Mono',monospace";
  const maxW = 320, pad = 12, lh = 18;
  const lines = countLines(c, banner.text, maxW);
  const textW = lines === 1 ? c.measureText(banner.text).width : maxW;
  const nameH = 17, boxW = Math.max(textW, c.measureText(banner.who).width) + pad * 2;
  const boxH = nameH + lines * lh + pad + 8;
  const bx = Math.max(10, Math.min(W - boxW - 10, anch.x - boxW / 2));
  const by = anch.y - boxH - 14;
  c.fillStyle = "rgba(245,247,250,0.97)"; rr(c, bx, by, boxW, boxH, 10); c.fill();
  c.strokeStyle = "#0b0e14"; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = "rgba(245,247,250,0.97)"; c.beginPath(); // tail down to the speaker
  const tx0 = Math.max(bx + 12, Math.min(bx + boxW - 24, anch.x - 6));
  c.moveTo(tx0, by + boxH); c.lineTo(tx0 + 12, by + boxH); c.lineTo(anch.x, anch.y - 2); c.closePath(); c.fill();
  c.textAlign = "left";
  c.font = "700 12px 'Chakra Petch',sans-serif"; c.fillStyle = "#1f7a38"; c.fillText(banner.who, bx + pad, by + 16);
  c.font = "14px 'IBM Plex Mono',monospace"; c.fillStyle = "#0b0e14"; wrapText(c, banner.text, bx + pad, by + nameH + 15, maxW, lh);
  if (clickable) { c.fillStyle = "#8a6d00"; c.textAlign = "right"; c.font = "11px 'IBM Plex Mono',monospace"; c.fillText("▸", bx + boxW - 8, by + boxH - 7); }
}
function wrapText(c, text, x, y, maxW, lh) { const words = String(text).split(" "); let line = "", yy = y; for (const w of words) { const t = line ? line + " " + w : w; if (c.measureText(t).width > maxW && line) { c.fillText(line, x, yy); line = w; yy += lh; } else line = t; } c.fillText(line, x, yy); }
function countLines(c, text, maxW) { const words = String(text).split(" "); let line = "", n = 1; for (const w of words) { const t = line ? line + " " + w : w; if (c.measureText(t).width > maxW && line) { line = w; n++; } else line = t; } return n; }
function drawHearts(c, W) {
  const n = char.maxHearts || 5, sp = 26, x0 = W / 2 - (n * sp) / 2 + sp / 2, y = 24;
  c.fillStyle = "rgba(7,11,17,0.55)"; rr(c, x0 - 18, 10, n * sp + 8, 28, 8); c.fill();
  for (let i = 0; i < n; i++) heart(c, x0 + i * sp, y, i < char.hearts);
}
function heart(c, cx, cy, filled) {
  c.fillStyle = filled ? "#ff4d5e" : "#3a2128"; c.beginPath();
  c.moveTo(cx, cy + 6); c.bezierCurveTo(cx - 11, cy - 4, cx - 6, cy - 11, cx, cy - 4); c.bezierCurveTo(cx + 6, cy - 11, cx + 11, cy - 4, cx, cy + 6); c.fill();
  if (filled) { c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath(); c.arc(cx - 3, cy - 3, 1.7, 0, Math.PI * 2); c.fill(); }
}

boot();
