// lesson1.js — Lesson 1, an open-world-ish 2D Python game across the Wildwood.
// API the player learns: you.walk("place"), bow.fire(), print(), variables, + - ,
// and the for loop. The engine auto-walks during scripted beats and SHOWS the
// commands in the journal; once a lesson ends the player walks freely by typing.

import "./journal.js"; // defines window.Journal
import { Editor } from "./editor.js";

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
        if k.startswith("_") or k in ("you","bow") or isinstance(v,bool): continue
        if isinstance(v,(int,float,str)): out[k]=v
    return json.dumps({"vars":out,"walk":ns.get("_walk"),"fires":ns.get("_fires"),"stdout":buf.getvalue(),"err":err})
`;

const SCENES = {
  wildwood: { stranger: 0.31, tree: 0.56, smith: 0.76 },
  clearing: { center: 0.42, tree: 0.72, bridge: 0.9 },
  castle: { castle: 0.74 },
  keep: { craftsman: 0.2, forhire: 0.4, chamber: 0.5, blacksmith: 0.6, armorsmith: 0.8, knight: 0.92 },
  storage: { cart: 0.5 },
  camp: { gate: 0.5 },
};
let scene = "wildwood";
let pyodide = null, runUser = null, pyReady = false, lastSrc = "";
const els = {}, tweens = [];
let lastMs = performance.now();
const char = { x: 0, rise: 0, walk: 0, walking: false, target: 0, onArrive: null, facing: 1, bubble: null, bubbleT: 0, hasBow: false, items: { sticks: 0, string: 0 }, gold: 0, hearts: 5 };
let zoms = [], ARROWS = [], zombiesApproach = false;
let invinc = 0, dmgFlash = 0, dying = false;
let townsfolk = [];
let lesson1Done = false; // the king's chamber stays sealed until Lesson 1 is complete
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
  els.noteModal.onclick = (e) => { if (e.target === els.noteModal) els.noteModal.hidden = true; };
  fit(); window.addEventListener("resize", fit);
  els.stage.onclick = advance;
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
function say(who, text) { return new Promise((res) => { dialogue = { who, text }; lastSaid = { who, text }; awaitAdvance = res; }); }
function speech(t) { char.bubble = String(t || "").trim().split("\n").filter(Boolean).slice(0, 1).join(" "); char.bubbleT = 3.4; return wait(0.4); }
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
}

const nonEmptyOut = (r) => (r.stdout.trim() ? null : "Put some words between the quotes.");
const firstLine = (s) => s.trim().split("\n")[0];
const prog = (s) => (els.prog.textContent = ""); // progress suffix hidden; lesson number shown in the top-left label instead

function ask(opts, onCode) {
  return new Promise((res) => {
    currentInput = { opts, onCode, res };
    ideOpen();
    els.prompt.textContent = opts.prompt;
    if (opts.lesson) { els.lesson.textContent = opts.lesson; els.lesson.style.display = "block"; } else els.lesson.style.display = "none";
    Editor.setSingleLine((opts.rows || 1) < 2); Editor.setValue(opts.prefill || ""); Editor.clearHint(); Editor.setEnabled(true); Editor.setReadOnly(!!opts.readonly);
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
  if (opts.inputPrompt) inputval = window.prompt(opts.inputPrompt) || "";  // interactive input(): the player types
  let r;
  try { r = JSON.parse(runUser(runSrc, opts.seed || "", inputval)); }
  catch (e) { setStatus(String(e.message || e), "err"); return; }
  if (r.err) { setStatus(translate(r.err), "err"); return; }
  const msg = opts.validate ? opts.validate(r) : null;
  if (msg) { setStatus(msg, "err"); return; }
  logCmd(src, true);
  Editor.setEnabled(false); els.run.disabled = true; Editor.setValue(""); els.lesson.style.display = "none";
  els.prompt.textContent = "Watch…"; setStatus("✓", "ok");
  awardXP(opts.xp || 10);
  currentInput = null; lastSaid = null; // the pinned NPC line clears once your command runs
  ideClose();
  if (onCode) await onCode(r);
  res(r);
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
    const r = await ask({ prompt: hint, placeholder: `you.walk("${exitName}")`, validate: (rr) => { if (!rr.walk) return 'Type a you.walk("...") command.'; if (rr.walk !== exitName && !locs.includes(rr.walk)) return `Can't go there. Try: ${locs.concat(exitName).map((l) => `"${l}"`).join(", ")}`; return null; } }, null);
    if (r.walk === exitName) { logCmd(`you.walk("${exitName}")`, true); return; }
    logCmd(`you.walk("${r.walk}")`, true); await goTo(r.walk);
  }
}

// ---------- combat ----------
const mkZom = (f) => ({ x: els.W * f, alive: true, dying: 0, doomed: false, wphase: Math.random() * 6 });
// fire an arrow that actually flies to the nearest un-doomed zombie and kills it on impact
function fireAtNearest() { let best = null, bd = Infinity; for (const z of zoms) { if (!z.alive || z.doomed) continue; const d = Math.abs(z.x - char.x); if (d < bd) { bd = d; best = z; } } if (best) { best.doomed = true; ARROWS.push({ x: char.x + char.facing * 18, target: best }); } }
function waitForImpact() { return new Promise((res) => { const chk = () => { if (ARROWS.length === 0) res(); else setTimeout(chk, 40); }; setTimeout(chk, 80); }); }
async function clearingCombat() {
  let first = true;
  while (zoms.some((z) => z.alive && !z.doomed)) {
    const left = zoms.filter((z) => z.alive).length;
    await ask({ prompt: `Loose an arrow. Type:  bow.fire()    (${left} infected)`, placeholder: "bow.fire()", validate: (r) => (r.fires >= 1 ? null : "Call bow.fire() to shoot.") }, null);
    fireAtNearest();
    if (first) { zombiesApproach = true; first = false; }   // they start advancing after your first shot
    await waitForImpact(); await wait(0.3);
  }
  zombiesApproach = false;
}
async function volley(n) { let i = 0; for (const z of zoms) { if (i >= n) break; i++; if (z.alive) { z.doomed = true; ARROWS.push({ x: char.x + char.facing * 18, target: z }); await wait(0.24); } } await waitForImpact(); }
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
  const skip = start === "clearing" || start === "castle" || start === "keep";
  if (!skip) name = await playWildwood();
  else { char.hasBow = true; char.items = { sticks: 0, string: 0 }; }
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
  await say("???", "A figure watches you from the treeline.");
  await autoWalk("stranger");
  await say("Stranger", "Easy now, you're awake. I thought you were one of them.");
  await ask({ prompt: "Speak to the stranger", placeholder: 'print("Where am I?")', lesson: "Your character talks by printing words to the screen. A print statement shows whatever you place inside its parentheses, and text goes inside quotation marks. Ask the stranger where you are.", validate: nonEmptyOut }, (r) => speech(r.stdout));
  await say("Stranger", "There's been an outbreak. The world ended while you slept. What's your name?");
  let name = "survivor";
  await ask({ prompt: "Tell them your name", placeholder: 'print("...")', lesson: "Use another print statement to say your name aloud. Put any name you like inside the quotation marks. Whatever you print is how the world will know you.", validate: nonEmptyOut }, (r) => { name = firstLine(r.stdout); prog(name); return speech(name); });
  await say("Stranger", `Hello ${name}. You'll need gear. The smith is at the hut.`);
  await autoWalk("smith");
  await say("Smith", "Hold it. You're not one of the infected, are you?");
  await ask({ prompt: "Answer the smith", placeholder: 'print("No")', lesson: "The smith needs to hear that you are not infected. Print a short reply that clearly says no, with your words inside quotation marks.", validate: (r) => (r.stdout.toLowerCase().includes("no") ? null : 'Tell them: print("No").') }, (r) => speech(r.stdout));
  await say("Smith", "Good. Gather 10 sticks and 3 string from that tree and I'll craft you a bow.");
  await autoWalk("tree");
  logCmd("sticks = 0", false); logCmd("string = 0", false);
  await say("", "Sticks and string lie at the tree's foot, and you start with 0 of each.");
  await ask({ prompt: "Gather the sticks and string", placeholder: "sticks = sticks + 10\nstring = string + 3", rows: 2, seed: "sticks=0\nstring=0", requireOp: "+", lesson: "A variable remembers a value for you. You already carry sticks and string, both starting at zero. To gather more you add to a variable: take its current value, add what you found, and store the result back in the same variable. Pick up ten sticks and three string this way.", validate: (r) => (r.vars.sticks === 10 && r.vars.string === 3 ? null : "You need  sticks = 10  and  string = 3.") }, () => pickup());
  await autoWalk("smith");
  await say("Smith", "Good haul. Speak, and hand them over.");
  await ask({ prompt: "Speak to the smith", placeholder: 'print("Here you go.")', lesson: "Say something to the smith before you hand the materials over. Any printed line of dialogue works, with your words inside quotation marks.", validate: nonEmptyOut }, (r) => speech(r.stdout));
  await ask({ prompt: "Hand the materials over", placeholder: "sticks = sticks - 10\nstring = string - 3", rows: 2, seed: "sticks=10\nstring=3", requireOp: "-", lesson: "Giving things away means taking them out of your variables. Subtraction is addition in reverse: take the current value, remove the amount, and store it back. Hand over all of the sticks and string so each count drops to zero.", validate: (r) => (r.vars.sticks === 0 && r.vars.string === 0 ? null : "Subtract so  sticks = 0  and  string = 0.") }, () => craft());
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
  await ask({ prompt: 'Get to the marked spot', placeholder: 'you.walk("center")', lesson: "Your character moves by calling the walk command and naming a place inside quotation marks. The marked spot here is called center. Walk there to face the danger.", validate: (r) => (r.walk === "center" ? null : 'Use you.walk("center").') }, null);
  await autoWalk("center");
  await say("", "They rouse and turn on you. Loose an arrow with bow.fire() and keep firing!");
  await clearingCombat();
  await say("", "The last one drops. The survivor swings down from the branch and hurries over.");
  await rescueSurvivor();
  await say("Survivor", "You saved my life. It's not much, but I owe you. Take these.");
  char.gold = 2.55; logCmd("gold = 2.55", false);
  await say("Survivor", "Two coins and fifty-five, that's 2.55 gold. Will you escort me to safety?");
  const ans = await ask({ prompt: 'Answer the survivor', placeholder: 'print("yes")', lesson: "The survivor asks whether you will escort them. Print your answer as a single word, yes or no, inside quotation marks. Your choice changes what happens next.", validate: (r) => { const s = r.stdout.toLowerCase(); return s.includes("yes") || s.includes("no") ? null : 'Print "yes" or "no".'; } }, (r) => speech(r.stdout));
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
  await ask({
    prompt: "Fire four arrows at once", placeholder: "for i in range(4):\n    bow.fire()", rows: 2,
    lesson: "Four enemies, and repeating one line four times is tedious. A for loop repeats a block of code for you. Write a loop that counts four times and calls the fire command on each pass, so a single short piece of code looses four arrows. Use a range of four so it runs exactly four times.",
    validate: (r) => { if (!/for\b/.test(lastSrc) || !/range/.test(lastSrc)) return "Use a for loop with range(...)."; return r.fires === 4 ? null : `That fired ${r.fires} arrow(s). You need exactly 4. Use range(4).`; },
  }, () => volley(4));
  await say("", "Four arrows, four bodies. The gatekeeper watches from the wall.");
  await ask({ prompt: 'Approach the keep', placeholder: 'you.walk("castle")', lesson: "Walk up to the keep gate. Call the walk command and name your destination, castle, inside quotation marks.", validate: (r) => (r.walk === "castle" ? null : 'Use you.walk("castle").') }, null);
  await autoWalk("castle");
  const heads = survivorFollow ? 2 : 1;
  const owe = +(0.25 * heads).toFixed(2), left = +(2.55 - owe).toFixed(2);
  await say("Gatekeeper", `Toll's a quarter a head${heads > 1 ? ", and I count two of you" : ""}. How much coin do you carry?`);
  await ask({
    prompt: "Tell the gatekeeper your coin", placeholder: "print(gold)", seed: "gold=2.55",
    lesson: "A print statement can show the value held in a variable, not just plain text. When you print a variable you leave the quotation marks off, so the screen shows the number it holds instead of its name. Print your gold so the gatekeeper sees the amount.",
    validate: (r) => { if (!/gold/.test(lastSrc)) return "Use the gold variable inside print()."; return r.stdout.includes("2.55") ? null : "Print your gold. It should show 2.55."; },
  }, (r) => speech(r.stdout));
  await say("Gatekeeper", `A quarter a head: ${heads} head${heads > 1 ? "s" : ""}, ${owe.toFixed(2)} coin. Name the price, then pay it.`);
  await ask({
    prompt: "Name the toll, then pay it",
    placeholder: heads > 1 ? "CONST_QUARTER = 0.25\ngold = gold - CONST_QUARTER * 2" : "CONST_QUARTER = 0.25\ngold = gold - CONST_QUARTER",
    rows: 2, seed: "gold=2.55", requireOp: "-",
    lesson: "A constant is a value you name once and reuse so your code reads clearly. Name the quarter coin toll as a constant, then subtract it from your gold to pay. If the gate counts two of you, multiply the toll before you subtract.",
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
  for (const a of ARROWS) { const dir = Math.sign(a.target.x - a.x) || 1; a.x += dir * 320 * dt; if (Math.abs(a.x - a.target.x) < 10) { a.hit = true; a.target.alive = false; a.target.dying = 1; } }
  ARROWS = ARROWS.filter((a) => !a.hit);
  for (const z of zoms) {
    if (!z.alive && z.dying > 0) z.dying = Math.max(0, z.dying - dt * 1.4);
    if (z.alive && zombiesApproach) { z.x += Math.sign(char.x - z.x) * 24 * dt; z.wphase += dt * 7; } // slow shamble toward you
  }
  // survivor jump-down + walk-over (or walk back to hide)
  if (survivor && (survivor.state === "walking")) {
    const dx = survivor.target - survivor.x, st = 120 * dt; survivor.wphase += dt * 9;
    if (Math.abs(dx) <= st) { survivor.x = survivor.target; survivor.state = survivor.hideAfter ? "hiding" : "beside"; const r = survivor.onArrive; survivor.onArrive = null; if (r) r(); }
    else survivor.x += Math.sign(dx) * st;
  }
  if (survivor && survivor.state === "beside" && survivorFollow) { const tx = char.x + 30; if (Math.abs(survivor.x - tx) > 4) { survivor.x += Math.sign(tx - survivor.x) * 110 * dt; survivor.wphase += dt * 9; } }
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
const circ = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
function setupTownsfolk() {
  townsfolk = [];
  const COLORS = ["#7048e8", "#1971c2", "#2f9e44", "#a04826", "#5b626b", "#9c36b5", "#c2410c"];
  for (let i = 0; i < 1; i++) townsfolk.push({ x: 0.15 + Math.random() * 0.7, dir: Math.random() < 0.5 ? -1 : 1, speed: 26 + Math.random() * 16, cloth: COLORS[i % COLORS.length], skin: Math.random() < 0.5 ? "#d8a878" : "#c89060", hair: ["#3a2c18", "#1c1c1c", "#6e4a22"][Math.floor(Math.random() * 3)], wphase: Math.random() * 6, paused: 0, bubble: null, bubbleT: 0, nextPause: 2 + Math.random() * 4 });
}
function townBody(c, x, y, w) {
  const sw = w.paused > 0 ? 0 : Math.sin(w.wphase) * 4;
  px(c, x - 4, y - 4 + sw, 4, 12, "#2a2018"); px(c, x + 1, y - 4 - sw, 4, 12, "#2a2018");
  px(c, x - 6, y - 24, 12, 20, w.cloth); px(c, x - 5, y - 35, 11, 11, w.skin); px(c, x - 6, y - 37, 12, 4, w.hair);
}
function stallBody(c, x, y, type, now) {
  const cloth = { craftsman: "#8a6d3b", forhire: "#3d5a3d", blacksmith: "#3a3a42", armorsmith: "#5b626b" }[type];
  const awn = { craftsman: "#2f9e44", forhire: "#1971c2", blacksmith: "#e03131", armorsmith: "#9c36b5" }[type];
  for (let s = -20; s < 20; s += 6) px(c, x + s, y - 40, 6, 9, ((s / 6) | 0) % 2 ? awn : "#f1f3f5");
  px(c, x - 22, y - 31, 44, 3, "#5a4424");
  px(c, x - 4, y - 22, 8, 14, cloth); px(c, x - 3, y - 29, 7, 7, "#d8a878"); px(c, x - 4, y - 31, 8, 3, "#3a2c18");
  px(c, x - 18, y - 8, 36, 9, "#6b4f2a"); px(c, x - 18, y - 10, 36, 3, "#8a6d3b");
  if (type === "blacksmith") { px(c, x - 2, y - 5, 11, 5, "#2b2b30"); const fl = 0.6 + 0.4 * Math.sin(now * 12); c.shadowColor = "#ff6b3d"; c.shadowBlur = 10 * fl; circ(c, x - 14, y - 2, 4 * fl, "#ff6b3d"); c.shadowBlur = 0; }
  else if (type === "armorsmith") { px(c, x + 9, y - 26, 3, 18, "#4a4a4a"); px(c, x + 5, y - 24, 9, 8, "#9aa3ad"); px(c, x + 6, y - 32, 7, 6, "#9aa3ad"); }
  else if (type === "forhire") { px(c, x + 10, y - 26, 2, 18, "#5a4424"); px(c, x + 5, y - 29, 12, 8, "#caa24a"); }
  else { px(c, x - 13, y - 14, 4, 5, "#9c6b3f"); }
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
  for (let x = 0; x < W; x += 30) px(c, x, gy, 30, H - gy, (x / 30 | 0) % 2 ? "#2a2d36" : "#262931");
  px(c, W * 0.43, gy - 2, W * 0.14, H - gy + 2, "#6e1d1d"); px(c, W * 0.43, gy - 2, W * 0.14, 3, "#a8832a"); // carpet leading to the stairs
  // central staircase rising to the king's chamber (sealed until Lesson 1 is done)
  { const sx = W * 0.5, steps = 6, sh = 9;
    for (let i = 0; i < steps; i++) { const ww = 96 - i * 11, yy = gy - i * sh; px(c, sx - ww / 2, yy - sh, ww, sh, i % 2 ? "#3a3f47" : "#434953"); px(c, sx - ww / 2, yy - sh, ww, 2, "#525a64"); px(c, sx - 15, yy - sh, 30, sh, "#7a1d1d"); px(c, sx - 15, yy - sh, 30, 2, "#a8832a"); }
    const topY = gy - steps * sh;
    px(c, sx - 24, topY - 50, 48, 50, "#15100a"); c.fillStyle = "#15100a"; c.beginPath(); c.arc(sx, topY - 50, 24, Math.PI, 0); c.fill();
    c.strokeStyle = "#a8832a"; c.lineWidth = 3; c.beginPath(); c.moveTo(sx - 24, topY); c.lineTo(sx - 24, topY - 50); c.arc(sx, topY - 50, 24, Math.PI, 0); c.lineTo(sx + 24, topY); c.stroke();
    if (!lesson1Done) {
      c.fillStyle = "#caa000"; rr(c, sx - 8, topY - 26, 16, 13, 2); c.fill(); c.strokeStyle = "#caa000"; c.lineWidth = 3; c.beginPath(); c.arc(sx, topY - 26, 5, Math.PI, 0); c.stroke(); px(c, sx - 1, topY - 20, 2, 5, "#3a2c10");
      c.fillStyle = "#ff9a9a"; c.font = "10px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText("SEALED", sx, gy + 16);
    } else { c.fillStyle = "#ffe066"; c.font = "10px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText("KING'S CHAMBER", sx, gy + 16); }
    c.font = "11px 'IBM Plex Mono',monospace"; const cmd = 'you.walk("chamber")', cw = c.measureText(cmd).width, cy = topY - 64;
    c.fillStyle = "rgba(8,12,18,0.8)"; rr(c, sx - cw / 2 - 7, cy - 12, cw + 14, 18, 5); c.fill(); c.strokeStyle = "#3a3018"; c.stroke(); c.fillStyle = "#9fd9ff"; c.textAlign = "center"; c.fillText(cmd, sx, cy + 1);
  }
  for (const [name, frac] of Object.entries(SCENES.keep)) {
    if (name === "knight" || name === "chamber") continue; // drawn separately
    const x = W * frac;
    P(c, x, gy, (cc) => stallBody(cc, 0, 0, name, now));
    // command hint above the stall — teaches how to walk there
    c.font = "11px 'IBM Plex Mono',monospace"; c.textAlign = "center";
    const cmd = `you.walk("${name}")`, cw = c.measureText(cmd).width, cy = gy - 40 * CH - 18;
    c.fillStyle = "rgba(8,12,18,0.78)"; rr(c, x - cw / 2 - 7, cy - 12, cw + 14, 18, 5); c.fill();
    c.strokeStyle = "#2a3a4a"; c.stroke(); c.fillStyle = "#9fd9ff"; c.fillText(cmd, x, cy + 1);
    // name label below
    c.fillStyle = "#cdd8e6"; c.font = "10px 'IBM Plex Mono',monospace"; c.fillText(KEEP_LABEL[name], x, gy + 18);
  }
  for (const bx of [W * 0.1, W * 0.82]) { px(c, bx - 4, gy - 26, 8, 20, "#a8832a"); const fl = 0.6 + 0.4 * Math.sin(now * 12 + bx); c.shadowColor = "#ffb14d"; c.shadowBlur = 18 * fl; circ(c, bx, gy - 28, 7 * fl, "#ffb14d"); circ(c, bx, gy - 29, 4 * fl, "#ffe066"); c.shadowBlur = 0; }
  // townsfolk — bubbles raised above the (scaled) heads so they don't clip
  for (const w of townsfolk) { P(c, w.x * W, gy, (cc) => townBody(cc, 0, 0, w)); if (w.bubble) bubble(c, w.x * W, gy - 37 * CH - 4, w.bubble); }
  // the knight-captain (quest giver), far right, with a quest marker + walk hint
  { const kx = W * SCENES.keep.knight; P(c, kx, gy, (cc) => knight(cc, 0, 0, now));
    c.font = "11px 'IBM Plex Mono',monospace"; c.textAlign = "center"; const cmd = 'you.walk("knight")', cw = c.measureText(cmd).width, cy = gy - 49 * CH - 8;
    c.fillStyle = "rgba(8,12,18,0.8)"; rr(c, kx - cw / 2 - 7, cy - 12, cw + 14, 18, 5); c.fill(); c.strokeStyle = "#5a4a18"; c.stroke(); c.fillStyle = "#ffd98a"; c.fillText(cmd, kx, cy + 1);
    c.fillStyle = "#ffd43b"; c.font = "bold 22px 'Chakra Petch',sans-serif"; c.fillText("!", kx, cy - 18 + Math.sin(now * 3) * 3); }
  if (survivor) P(c, survivor.x, gy, (cc) => npc(cc, 0, 0, "#37b24d", "#c89060", "#241018")); // the escorted survivor saying goodbye
}
// ---- Lesson 1.3 questline scenes + beats ----
function drawCargo(c, rx, y, cargo = raftCargo) {
  let i = 0; const cols = { armor: "#7a828c", food: "#c2410c", water: "#1971c2" };
  for (const k of ["armor", "food", "water"]) for (let n = 0; n < cargo[k]; n++) { px(c, rx - 15 + (i % 3) * 10, y - 8 - Math.floor(i / 3) * 8, 8, 7, cols[k]); px(c, rx - 15 + (i % 3) * 10, y - 8 - Math.floor(i / 3) * 8, 8, 2, "rgba(255,255,255,0.25)"); i++; }
}
function drawStorage(c, W, gy, now) {
  const H = els.H;
  for (let y = 0; y < gy; y += 16) { c.fillStyle = (y / 16 | 0) % 2 ? "#3a2f22" : "#332a1f"; c.fillRect(0, y, W, 16); }
  for (const sy of [gy * 0.4, gy * 0.7]) { px(c, 0, sy, W * 0.74, 6, "#5a4424"); for (let x = 24; x < W * 0.66; x += 72) { px(c, x, sy - 22, 26, 22, "#7a5a30"); px(c, x, sy - 22, 26, 4, "#8a6d3b"); } }
  // floor (left ~0.78) then water (right)
  for (let x = 0; x < W * 0.78; x += 28) px(c, x, gy, 28, H - gy, (x / 28 | 0) % 2 ? "#2e2820" : "#28231c");
  c.fillStyle = "#16344e"; c.fillRect(W * 0.78, gy, W * 0.22, H - gy);
  for (let i = 0; i < 6; i++) { c.strokeStyle = "rgba(120,180,225,0.3)"; c.lineWidth = 1; const yy = gy + 12 + i * 12; c.beginPath(); c.moveTo(W * 0.78, yy + Math.sin(now * 3 + i) * 2); c.lineTo(W, yy + Math.sin(now * 3 + i + 2) * 2); c.stroke(); }
  // a wooden pier runs out over the water so you never step on the water itself
  px(c, W * 0.78, gy + 14, 4, H - gy - 14, "#3a2c18"); px(c, W * 0.86, gy + 14, 4, H - gy - 14, "#3a2c18"); // pilings
  for (let x = W * 0.7; x < W * 0.92; x += 12) px(c, x, gy, 11, 9, ((x / 12) | 0) % 2 ? "#6b4f2a" : "#5a4424"); // planks
  px(c, W * 0.7, gy + 9, W * 0.22, 3, "#3a2c18");
  const rx = W * 0.9;
  for (let i = 0; i < 6; i++) px(c, rx - 34 + i * 12, gy + 2, 10, 9, i % 2 ? "#6b4f2a" : "#5a4424"); // docked raft
  px(c, rx - 34, gy + 11, 70, 3, "#3a2c18");
  drawCargo(c, rx, gy + 2);
  // supply piles (left)
  for (const [label, f, col] of [["armour", 0.16, "#7a828c"], ["food", 0.28, "#c2410c"], ["water", 0.40, "#1971c2"]]) { const x = W * f; px(c, x - 13, gy - 15, 26, 15, col); px(c, x - 13, gy - 15, 26, 4, "rgba(255,255,255,0.25)"); c.fillStyle = "#cdd8e6"; c.font = "10px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText(label, x, gy + 18); }
}
function drawCamp(c, W, gy, now) {
  const H = els.H;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1a2438"); g.addColorStop(0.55, "#22303c"); g.addColorStop(0.62, "#2b4a2f"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const sx = (i * 89) % W, sy = (i * 53) % (H * 0.4); c.globalAlpha = 0.3; px(c, sx, sy, 2, 2, "#cfe0f5"); } c.globalAlpha = 1;
  for (let x = 0; x < W; x += 26) px(c, x, gy, 26, H - gy, (x / 26 | 0) % 2 ? "#2c6b3a" : "#347a42");
  for (const tx of [W * 0.28, W * 0.64, W * 0.82]) { c.fillStyle = "#6b5638"; c.beginPath(); c.moveTo(tx - 26, gy); c.lineTo(tx, gy - 42); c.lineTo(tx + 26, gy); c.closePath(); c.fill(); px(c, tx - 14, gy - 18, 28, 18, "#15100a"); }
  const fl = 0.6 + 0.4 * Math.sin(now * 13); circ(c, W * 0.44, gy + 4, 8 * fl, "#ff6b3d"); circ(c, W * 0.44, gy + 4, 4.5 * fl, "#ffd43b");
  // the raft you arrived on, beached at the shore (left), holding anything not yet carried up
  c.fillStyle = "#16344e"; c.fillRect(0, gy + 14, W * 0.13, H - gy - 14);
  for (let i = 0; i < 6; i++) px(c, W * 0.02 + i * 12, gy + 4, 10, 9, i % 2 ? "#6b4f2a" : "#5a4424");
  drawCargo(c, W * 0.1, gy + 4, raftCargo);
  drawCargo(c, W * 0.66, gy + 4, campSupplies);   // supplies dropped at the captain's feet
  P(c, W * 0.5, gy, (cc) => npc(cc, 0, 0, "#495057", "#c89a72", "#23262b")); // sentry
  P(c, W * 0.7, gy, (cc) => npc(cc, 0, 0, "#7a1f1f", "#d8a878", "#2b2018")); // captain
}
function drawRaft(c, W, gy, now) {
  const H = els.H;
  c.fillStyle = "#16344e"; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 12; i++) { c.strokeStyle = "rgba(120,180,225,0.3)"; c.lineWidth = 1; const yy = H * 0.25 + i * 22; c.beginPath(); c.moveTo(0, yy + Math.sin(now * 3 + i) * 3); c.lineTo(W, yy + Math.sin(now * 3 + i + 2) * 3); c.stroke(); }
  const rx = W * (0.08 + 0.84 * raftP), ry = gy + Math.sin(now * 2) * 4;
  for (let i = 0; i < 6; i++) px(c, rx - 36 + i * 13, ry, 11, 9, i % 2 ? "#6b4f2a" : "#5a4424");
  px(c, rx - 36, ry + 9, 74, 3, "#3a2c18");
  drawCargo(c, rx + 18, ry);   // the supplies you loaded, riding along
  P(c, rx, ry, hero);
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

const KEEP_MANIFEST_RUN = "weight = armor*10 + food*4 + water*3\nchecklist = 0\nif weight <= 30:\n    checklist = checklist + 1\nif armor == 1:\n    checklist = checklist + 1\nif food == 2:\n    checklist = checklist + 1\nif water == 1:\n    checklist = checklist + 1";
const KEEP_MANIFEST_LESSON =
  "Read the captain's checklist on the wall, then record how many of each item you load: armour, food, and water. An if statement runs a line only when its condition is true, so the checklist can count itself and confirm the load is correct. Match the exact amounts and keep the total weight within the limit.";

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
  await say("", "The storage room. Piles of armour, food and water on the left; a raft waits at the dock on the right. The captain's checklist hangs on the wall. Read it.");
  const r = await ask({
    prompt: "Pack the supply cart",
    placeholder: "armor = 1\nfood = 2\nwater = 1", rows: 3,
    lesson: KEEP_MANIFEST_LESSON, append: KEEP_MANIFEST_RUN,
    validate: (r) => (Number(r.vars.checklist) === 4 ? null : "The cart's not right. Read the captain's checklist again (exact amounts, and weight ≤ 30)."),
  }, null);
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
    lesson: "Read the code, then run it. You do not write this one. The input() call is the program asking you a question: a box pops up and whatever you type becomes secret_string. An if and else make a two way choice, where the if line runs when the condition is true and the else line runs when it is false. The == test checks whether two values are equal, and it works on words too. So if what you type equals the watchword, you pass. The watchword is in your sealed orders if you forgot it.",
    validate: (r) => (r.vars.secret_string === "ironwatch" ? null : "That's not the watchword. Check your sealed orders and Run again."),
  }, null);
  await say("Captain", "The watchword. Good. Pass, friend.");
  await say("Captain", "The north-watch supplies! Bring them up off the raft and set them down here, scout.");
  await dropOff();
  await say("Captain", "Every crate accounted for. The army won't go hungry. My thanks, and my hand on it.");
  await say("Captain", "Carry this back to your knight: the city's being reclaimed… but something older stirs in the dark. We'll need a scout.");
  questStep = 2;
  await fadeTo("keep"); char.x = els.W * 0.06; char.facing = 1; setupTownsfolk();
  setLocations(["craftsman", "forhire", "blacksmith", "armorsmith", "knight", "chamber"]);
  await say("", 'Back in the keep, the captain\'s report in hand. Carry it to the knight: you.walk("knight").');
}
async function playBeat3(name) {
  await say("Knight-Captain", "You crossed the water and came back whole? Then the captain trusts you, and so do I.");
  await say("Knight-Captain", "Here's a scout's pay. One gold and seventy-five: 1.75. A coin with a decimal point is a float; add it to your purse.");
  const before = char.gold;
  await ask({
    prompt: "Take your scout's pay",
    placeholder: "gold = gold + 1.75", rows: 1,
    seed: `gold=${before}`, requireOp: "+",
    lesson: "A float is a number with a decimal point, the kind a coin worth less than a whole gold needs. You add a float to a variable exactly like a whole number: take the current value, add the reward, and store it back. Add your pay to your gold.",
    validate: (r) => (Math.abs(Number(r.vars.gold) - (before + 1.75)) < 0.001 ? null : `Add 1.75 so that gold = ${(before + 1.75).toFixed(2)}.`),
  }, null);
  char.gold = before + 1.75; logCmd(`gold = ${char.gold.toFixed(2)}`, true);
  await say("Knight-Captain", "The armoury's unlocked. See the armorsmith and kit yourself out before the scouting run.");
  armoryOpen = true; questStep = 3;
}
async function playBeat4(name) {
  await say("Armorsmith", "Scout armour: light plates, easy to run in. Half a gold each: 0.50 a piece.");
  await say("Armorsmith", "Spend that 1.75 stipend the captain paid you. Work out how many plates it buys and what change you get.");
  await ask({
    prompt: "Work out the plates and your change",
    placeholder: "pieces = reward // price\nchange = reward % price", rows: 2,
    seed: "reward=1.75\nprice=0.5", requireOp: "%",
    lesson: "Two operators split things into whole shares. Floor division, written with two slashes, finds how many whole times one number fits inside another, so it tells you how many plates your coin buys. Modulo, written with a percent sign, gives the leftover after that division, which is your change. Set one variable for the pieces and one for the change.",
    validate: (r) => { if (Number(r.vars.pieces) !== 3) return "pieces should be  reward // price  = 3."; if (Math.abs(Number(r.vars.change) - 0.25) > 0.001) return "change should be  reward % price  = 0.25."; return null; },
  }, null);
  char.gold = char.gold - 1.5; char.hasArmor = true; logCmd(`gold = ${char.gold.toFixed(2)}  # bought 3 plates`, true);
  await say("Armorsmith", "Three plates, and a quarter-gold back. You're kitted, scout.");
  await say("Knight-Captain", "The keep is yours now: the traders, the king's hall, all of it. Well earned.");
  questStep = 5; lesson1Done = true;
  if (Sv) { Sv.completeChapter(1); Sv.write({ gold: char.gold }); awardXP(40); } // chapter clear bonus; unlocks The Keep on the map
  await say("", "Lesson 1.3 complete. The stalls are open for trade and the king's chamber doors are unlocked.");
}

async function playKeep(name) {
  await fadeTo("keep"); char.x = els.W * 0.06; char.facing = 1; zoms = []; ARROWS = []; setupTownsfolk(); prog(name + " · 1.3"); setLocations(["craftsman", "forhire", "blacksmith", "armorsmith", "knight", "chamber"]);
  if (survivorFollow) { survivor = { x: char.x + 36, y: 0, state: "beside", wphase: 0 }; await say("Survivor", "You've brought me to safety. I won't forget it. Thank you, friend."); survivor = null; survivorFollow = false; }
  else survivor = null;
  await say("", "Inside the keep at last. Townsfolk mill about; four traders keep stalls along the back wall.");
  await say("", "A red carpet runs up the centre to a grand staircase, and the sealed doors of the king's chamber above it.");
  await say("", 'An armoured knight stands watch to the east, a quest-marker above him. Wander: walk to a stall, the knight, or the chamber, e.g. you.walk("knight").');
  while (true) {
    const r = await ask({ prompt: 'Explore the keep, e.g. you.walk("knight") or you.walk("chamber"):', placeholder: 'you.walk("knight")', validate: (rr) => { if (!rr.walk) return 'Type a you.walk("...") command.'; if (!SCENES.keep[rr.walk]) return "Walk to: craftsman, forhire, blacksmith, armorsmith, knight, or chamber."; return null; } }, null);
    logCmd(`you.walk("${r.walk}")`, true);
    await goTo(r.walk);
    if (r.walk === "chamber") {
      if (lesson1Done) await say("", "The great doors swing open onto the king's chamber…");
      else { await say("", "You climb the stairs. The king's chamber doors are bound shut with a heavy gold lock."); await say("Guard", "None pass to the king until you've proven yourself. Finish your business in the keep, survivor."); }
    } else if (r.walk === "knight") {
      if (questStep === 0) await startQuest(name);
      else if (questStep === 2) await playBeat3(name);
      else if (questStep === 3) await say("Knight-Captain", "The armoury's open. See the armorsmith for your scout kit before you report back.");
      else if (questStep >= 5) await say("Knight-Captain", "You've earned the keep's trust, scout. Rest. The north gate is tomorrow's worry.");
      else await say("Knight-Captain", "The cart won't pack itself. Off with you.");
    } else {
      if (r.walk === "armorsmith" && armoryOpen && questStep < 5) await playBeat4(name);
      else if (questStep >= 5 || (r.walk === "armorsmith" && armoryOpen)) { const v = KEEP_VENDOR[r.walk]; await say(v[0], v[1]); }
      else await say(KEEP_VENDOR[r.walk][0], "The captain hasn't cleared you to trade yet. See the knight.");
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
  const outdoors = scene === "wildwood" || scene === "clearing" || scene === "castle";
  if (outdoors) { // distant forest silhouette behind the playfield
    c.fillStyle = "#0e1a14";
    for (let i = 0; i < Math.ceil(W / 60) + 1; i++) { const x = i * 60 + ((i * 37) % 22), h = 46 + ((i * 53) % 38); c.beginPath(); c.moveTo(x - 34, gy); c.lineTo(x, gy - h); c.lineTo(x + 34, gy); c.closePath(); c.fill(); }
  }
  for (let i = 0; i * 26 < W; i++) px(c, i * 26, gy, 26, H - gy, i % 2 ? "#22512c" : "#275c32");
  for (let i = 0; i < 18; i++) { const x = (i * 71) % W, y = gy + 16 + (i * 37) % (H - gy - 22), sw = Math.sin(now * 2 + i) * 2; c.strokeStyle = "#1b4223"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x + sw, y - 5); c.stroke(); }

  if (scene === "wildwood") drawWildwood(c, W, gy, now);
  else if (scene === "clearing") drawClearing(c, W, gy, now);
  else if (scene === "keep") drawKeep(c, W, gy, now);
  else if (scene === "storage") drawStorage(c, W, gy, now);
  else if (scene === "camp") drawCamp(c, W, gy, now);
  else if (scene === "raft") drawRaft(c, W, gy, now);
  else drawCastle(c, W, gy, now);

  // arrows
  for (const a of ARROWS) { if (a.dead) continue; c.strokeStyle = "#f1e3c0"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(a.x, gy - 18); c.lineTo(a.x - 13, gy - 18); c.stroke(); c.fillStyle = "#d6dee8"; c.fillRect(a.x, gy - 20, 5, 3); }
  // hero — rises smoothly while waking; blinks briefly after taking a hit.
  // (skip in the raft scene — drawRaft draws the hero on the moving raft itself)
  if (scene !== "raft" && !(invinc > 0 && Math.floor(now * 12) % 2)) {
    const vs = scene === "wildwood" ? 0.32 + 0.68 * char.rise : 1;
    c.save(); c.translate(char.x, gy); c.scale(CH, CH * vs); hero(c, 0, 0); c.restore();
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

  // dialogue banner — a centered panel at the top of the screen, cutscene-style.
  // While the IDE is waiting for code, the last spoken line stays pinned (no click cue).
  const banner = dialogue || (currentInput ? lastSaid : null);
  if (banner) {
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
  for (let i = 0; i < 7; i++) { c.strokeStyle = "rgba(120,180,225,0.35)"; c.lineWidth = 1; const yy = gy + 10 + i * 11; c.beginPath(); c.moveTo(rx, yy + Math.sin(now * 3 + i) * 2); c.lineTo(W, yy + Math.sin(now * 3 + i + 2) * 2); c.stroke(); }
  px(c, rx - 14, gy - 2, W - rx + 16, 7, "#5a4424");
  for (let i = 0; rx - 14 + i * 13 < W; i++) px(c, rx - 14 + i * 13, gy - 7, 9, 13, i % 2 ? "#6b4f2a" : "#5a4424");
  px(c, rx - 14, gy - 9, W - rx + 16, 3, "#7a5a30");
  // marked centre
  const cx = W * 0.42; c.strokeStyle = "rgba(255,212,59," + (0.5 + 0.4 * Math.sin(now * 4)) + ")"; c.lineWidth = 2; c.beginPath(); c.arc(cx, gy + 8, 15, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(cx - 7, gy + 8); c.lineTo(cx + 7, gy + 8); c.moveTo(cx, gy + 1); c.lineTo(cx, gy + 15); c.stroke();
  // the survivor's tree
  drawTree(c, W * 0.72, gy, now, false, 1.5);
  // zombies (under the tree; shamble once roused)
  for (const z of zoms) { if (z.dying <= 0 && !z.alive) continue; c.globalAlpha = z.alive ? 1 : Math.max(0, z.dying); const sw = (z.alive && zombiesApproach) ? Math.sin(z.wphase) : 0; P(c, z.x, gy, (cc) => zombie(cc, 0, 0, sw)); c.globalAlpha = 1; }
  // survivor
  if (survivor) P(c, survivor.x, gy + survivor.y, (cc) => npc(cc, 0, 0, "#37b24d", "#c89060", "#241018"));
}
function drawCastle(c, W, gy, now) {
  // a much larger keep so the characters read as small before it
  const x = W * 0.78, base = gy - 168, half = 118;
  // main wall + stone blocks
  px(c, x - half, base, half * 2, gy - base, "#565d66");
  for (let yy = base; yy < gy; yy += 24) for (let xx = x - half; xx < x + half; xx += 32) px(c, xx + 1, yy + 1, 30, 22, ((Math.floor(xx / 32) + Math.floor(yy / 24)) % 2) ? "#4e555e" : "#535a63");
  // battlements
  for (let i = -half; i < half; i += 36) px(c, x + i, base - 20, 22, 20, "#565d66");
  // flanking towers
  for (const tx of [x - half - 30, x + half + 8]) {
    px(c, tx, base - 50, 30, gy - base + 50, "#4a515a"); for (let yy = base - 50; yy < gy; yy += 24) px(c, tx + 2, yy + 1, 26, 22, "#525962");
    c.fillStyle = "#7a1f1f"; c.beginPath(); c.moveTo(tx - 8, base - 50); c.lineTo(tx + 15, base - 78); c.lineTo(tx + 38, base - 50); c.closePath(); c.fill();
    px(c, tx + 11, base - 30, 8, 14, "#1a140d"); // arrow slit
  }
  // grand gate
  px(c, x - 34, gy - 96, 68, 96, "#2a2017"); c.fillStyle = "#6e757e"; c.beginPath(); c.arc(x, gy - 96, 34, Math.PI, 0); c.fill();
  px(c, x - 34, gy - 96, 68, 8, "#3a2c18"); for (let i = -28; i <= 28; i += 14) px(c, x + i, gy - 88, 2, 88, "#1a120b");
  px(c, x - 6, gy - 130, 12, 16, "#1a2a44"); // window above gate (glow)
  c.fillStyle = "#3b6ea5"; c.fillRect(x - 4, gy - 128, 8, 12);
  // gatekeeper peeking over the battlements
  const top = base - 20; const gxp = x - half + 50;
  px(c, gxp - 11, top - 20, 22, 20, "#565d66"); px(c, gxp - 7, top - 34, 14, 15, "#c89a72"); px(c, gxp - 8, top - 38, 16, 6, "#454c55");
  px(c, gxp - 5, top - 28, 3, 2, "#111"); px(c, gxp + 3, top - 28, 3, 2, "#111");
  if (survivor) P(c, survivor.x, gy, (cc) => npc(cc, 0, 0, "#37b24d", "#c89060", "#241018")); // the escorted survivor
  for (const z of zoms) { if (z.dying <= 0 && !z.alive) continue; c.globalAlpha = z.alive ? 1 : Math.max(0, z.dying); const sw = (z.alive && zombiesApproach) ? Math.sin(z.wphase) : 0; P(c, z.x, gy, (cc) => zombie(cc, 0, 0, sw)); c.globalAlpha = 1; }
}

// sprites (drawn at local origin; P() scales/positions)
function hero(c, x, y) {
  const f = char.facing, sw = char.walking ? Math.sin(char.walk) * 4 : 0;
  px(c, x - 4, y - 4 + sw, 4, 12, "#3f6b2a"); px(c, x + 1, y - 4 - sw, 4, 12, "#3f6b2a");
  px(c, x - 6, y - 22, 12, 20, "#6b8e23"); px(c, x - 5, y - 33, 11, 11, "#e0a070"); px(c, x - 6, y - 35, 12, 4, "#3a2c18");
  if (char.hasBow) { c.strokeStyle = "#9c6b3f"; c.lineWidth = 2.5; c.beginPath(); c.arc(x + f * 11, y - 16, 11, -1.1 * f, 1.1 * f); c.stroke(); c.strokeStyle = "#e9dcc0"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x + f * 11, y - 26); c.lineTo(x + f * 11, y - 6); c.stroke(); }
  else px(c, x + f * 4, y - 18, f * 8, 3, "#e0a070");
  if (char.grabbing) px(c, x + char.facing * 6, y - 14, char.facing * 5, 8, "#e0a070"); // reaching down to grab
  if (char.bubble) bubble(c, x, y - 40, char.bubble);
}
function npc(c, x, y, cloth, skin, hair) { px(c, x - 4, y - 4, 4, 10, "#241018"); px(c, x + 1, y - 4, 4, 10, "#241018"); px(c, x - 6, y - 22, 12, 18, cloth); px(c, x - 5, y - 32, 11, 11, skin); px(c, x - 6, y - 34, 12, 4, hair); }
function smith(c, x, y) { px(c, x - 5, y - 4, 4, 10, "#222"); px(c, x + 2, y - 4, 4, 10, "#222"); px(c, x - 7, y - 22, 14, 18, "#5b626b"); px(c, x - 6, y - 32, 12, 11, "#c89a72"); px(c, x - 8, y - 35, 16, 5, "#454c55"); px(c, x - 8, y - 28, 16, 3, "#454c55"); }
function zombie(c, x, y, sw = 0) {
  px(c, x - 6, y - 5, 13, 16, "#10200c"); px(c, x - 5, y - 16, 11, 11, "#10200c");
  px(c, x - 5, y - 4, 11, 14, "#8a9a6a"); px(c, x - 4, y - 15, 9, 10, "#aab98a");
  px(c, x - 2, y - 12, 2, 2, "#ff3b3b"); px(c, x + 1, y - 12, 2, 2, "#ff3b3b");
  px(c, x - 4, y + 8 - Math.max(0, sw) * 2, 3, 9, "#2a2014"); px(c, x + 2, y + 8 - Math.max(0, -sw) * 2, 3, 9, "#2a2014"); px(c, x + 5, y - 6, 6, 2, "#aab98a");
}
function drawTree(c, x, gy, now, items, scl = 1) {
  px(c, x - 6 * scl, gy - 46 * scl, 12 * scl, 50 * scl, "#5a3f22");
  for (let r = 0; r < 5; r++) { const yy = gy - (60 + r * 11) * scl, rad = (44 - r * 6) * scl + Math.sin(now + r) * 2; c.fillStyle = r % 2 ? "#1f5a2c" : "#256a33"; c.beginPath(); c.arc(x, yy, rad * 0.5, 0, Math.PI * 2); c.fill(); }
  if (items) { c.strokeStyle = "#9c6b3f"; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x + 18 + i * 6, gy + 2); c.lineTo(x + 26 + i * 6, gy - 8); c.stroke(); } c.strokeStyle = "#e9dcc0"; c.lineWidth = 2; c.beginPath(); c.arc(x + 32, gy + 4, 5, 0, Math.PI * 2); c.stroke(); if (pickupFx > 0) sparkle(c, x + 24, gy - 4, pickupFx, "#fff"); }
}
function drawHut(c, x, gy) {
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
  px(c, x - 34, gy - 50, 68, 50, "#7a5a30"); for (let i = 0; i < 5; i++) px(c, x - 34, gy - 50 + i * 11, 68, 1, "#5a4424");
  c.fillStyle = "#8a2f1f"; c.beginPath(); c.moveTo(x - 42, gy - 50); c.lineTo(x, gy - 78); c.lineTo(x + 42, gy - 50); c.closePath(); c.fill();
  px(c, x - 10, gy - 30, 20, 30, "#3a2c18");
}
function bubble(c, x, y, text) {
  c.font = "13px 'IBM Plex Mono',monospace"; const w = Math.min(150, c.measureText(text).width) + 14, h = 22, bx = x - w / 2, by = y - h;
  c.fillStyle = "rgba(245,247,250,0.97)"; rr(c, bx, by, w, h, 6); c.fill(); c.beginPath(); c.moveTo(x - 4, by + h); c.lineTo(x + 4, by + h); c.lineTo(x, by + h + 6); c.closePath(); c.fill();
  c.fillStyle = "#0b0e14"; c.textAlign = "center"; c.fillText(text.length > 18 ? text.slice(0, 18) + "…" : text, x, by + 15);
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function sparkle(c, x, y, amt, col) { c.globalAlpha = amt; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = (1 - amt) * 26 + 4; px(c, x + Math.cos(a) * r, y + Math.sin(a) * r, 3, 3, col); } c.globalAlpha = 1; }
function wrapText(c, text, x, y, maxW, lh) { const words = String(text).split(" "); let line = "", yy = y; for (const w of words) { const t = line ? line + " " + w : w; if (c.measureText(t).width > maxW && line) { c.fillText(line, x, yy); line = w; yy += lh; } else line = t; } c.fillText(line, x, yy); }
function countLines(c, text, maxW) { const words = String(text).split(" "); let line = "", n = 1; for (const w of words) { const t = line ? line + " " + w : w; if (c.measureText(t).width > maxW && line) { line = w; n++; } else line = t; } return n; }
function drawHearts(c, W) {
  const n = 5, sp = 26, x0 = W / 2 - (n * sp) / 2 + sp / 2, y = 24;
  c.fillStyle = "rgba(7,11,17,0.55)"; rr(c, x0 - 18, 10, n * sp + 8, 28, 8); c.fill();
  for (let i = 0; i < n; i++) heart(c, x0 + i * sp, y, i < char.hearts);
}
function heart(c, cx, cy, filled) {
  c.fillStyle = filled ? "#ff4d5e" : "#3a2128"; c.beginPath();
  c.moveTo(cx, cy + 6); c.bezierCurveTo(cx - 11, cy - 4, cx - 6, cy - 11, cx, cy - 4); c.bezierCurveTo(cx + 6, cy - 11, cx + 11, cy - 4, cx, cy + 6); c.fill();
  if (filled) { c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath(); c.arc(cx - 3, cy - 3, 1.7, 0, Math.PI * 2); c.fill(); }
}

boot();
