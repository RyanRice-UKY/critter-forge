// prologue.js — the gentlest possible start. The player makes their survivor
// speak by writing print(...). Real CPython (Pyodide) runs it, we capture stdout
// and show it as a speech bubble, then advance the story. No loops, no logic —
// just output, strings, and "my code made something happen".

const HARNESS = `
import json, sys, io
def run_user(src):
    buf = io.StringIO(); old = sys.stdout; sys.stdout = buf; err = None
    try:
        exec(src, {})
    except Exception as e:
        err = type(e).__name__ + ": " + str(e)
    finally:
        sys.stdout = old
    return json.dumps({"out": buf.getvalue(), "err": err})
`;

const ok = () => ({ pass: true });
const fail = (msg) => ({ pass: false, msg });
const nonEmpty = (lines) => lines.some((l) => l.trim()) ? ok() : fail("Your survivor stayed silent — put some words between the quotes.");

const BEATS = [
  {
    narr: "Smoke. Screams somewhere in the dark. You come to face-down in the tall grass, ears ringing.",
    npc: "A voice hisses from the trees: “You there — can you still talk? Say something, anything!”",
    task: "Make your survivor speak. Type a print line with any words inside the quotes:\n\nprint(\"...\")",
    starter: 'print("...")',
    check: (lines) => lines.some((l) => l.trim() && l.trim() !== "...") ? ok() : fail("Replace the dots with real words between the quotes, then press Speak."),
    reply: () => "The stranger lowers a rusty blade. “Good. The fevered ones can’t speak anymore. You’re still you.”",
  },
  {
    narr: "They creep closer, eyes darting to the treeline.",
    npc: "“What do they call you, survivor?”",
    task: "Tell them your name. Put it between the quotes:\n\nprint(\"your name\")",
    starter: 'print("")',
    check: nonEmpty,
    reply: (lines) => `“${lines.find((l) => l.trim()).trim()}. I’ll remember it — in case I have to bury you.”`,
  },
  {
    narr: "Behind them, pale shapes shamble between the trees, drawn to the noise.",
    npc: "“We’re making a stand at the camp. The living need every hand. Are you with us?”",
    task: "Answer them. Print a line that says yes:\n\nprint(\"yes\")",
    starter: 'print("...")',
    check: (lines) => lines.join(" ").toLowerCase().includes("yes") ? ok() : fail("Print a line containing the word “yes” to join them."),
    reply: () => "“Then move. Keep your voice down… mostly.”",
  },
  {
    narr: "A groan swells from the dark. The stranger shoves a worn bow into your hands.",
    npc: "“Rally the others — THREE shouts, loud! One line each!”",
    task: "Use THREE separate print lines, one per shout. For example:\n\nprint(\"FOR\")\nprint(\"THE\")\nprint(\"LIVING\")",
    starter: 'print("")\nprint("")\nprint("")',
    check: (lines) => lines.filter((l) => l.trim()).length >= 3 ? ok() : fail("The camp barely heard you — print at least THREE non-empty lines (three print statements)."),
    reply: () => "Survivors rise from the grass, blades and bows ready. The Wildwood holds — for now.",
  },
];

let pyodide = null, runUser = null, editor = null;
let beat = 0, spoken = [], passed = false;
const els = {};

async function boot() {
  for (const id of ["prog", "narr", "npc", "task", "run", "reset", "next", "status", "scene"]) els[id] = document.getElementById(id);
  els.ctx = els.scene.getContext("2d");
  editor = CodeMirror(document.getElementById("editor"), { value: "", mode: "python", theme: "material-darker", lineNumbers: true, indentUnit: 4 });
  els.run.onclick = speak;
  els.reset.onclick = () => editor.setValue(BEATS[beat].starter);
  els.next.onclick = advance;
  loadBeat(0);          // show the story immediately, before Python finishes loading
  loop();
  setStatus("Loading Python… you can read the story while it loads.", "muted");
  pyodide = await loadPyodide();
  await pyodide.runPythonAsync(HARNESS);
  runUser = pyodide.globals.get("run_user");
  els.run.disabled = false;
  setStatus("When you're ready, press Speak.", "muted");
}

function loadBeat(i) {
  beat = i; passed = false; spoken = [];
  const b = BEATS[i];
  els.prog.textContent = `Prologue · beat ${i + 1} of ${BEATS.length} · learning: print()`;
  els.narr.textContent = b.narr;
  els.npc.textContent = b.npc;
  els.task.textContent = b.task;
  editor.setValue(b.starter);
  els.next.style.display = "none";
  setStatus("When you're ready, press Speak.", "muted");
}

function speak() {
  if (!pyodide) return;
  let res;
  try { res = JSON.parse(runUser(editor.getValue())); }
  catch (e) { setStatus(String(e.message || e), "err"); return; }
  if (res.err) { setStatus(translate(res.err), "err"); return; }
  const lines = res.out.split("\n").filter((l, idx, arr) => !(l === "" && idx === arr.length - 1));
  spoken = lines.length ? lines : [""];
  const b = BEATS[beat];
  const verdict = b.check(lines);
  if (verdict.pass) {
    passed = true;
    spoken = lines.concat(["", "— " + b.reply(lines)]);
    setStatus("✓ " + (beat < BEATS.length - 1 ? "They heard you. Press Continue." : "The camp is rallied!"), "ok");
    els.next.textContent = beat < BEATS.length - 1 ? "Continue ▸" : "Enter the Wildwood ▸";
    els.next.style.display = "inline-block";
  } else {
    setStatus(verdict.msg, "err");
  }
}

function advance() {
  if (beat < BEATS.length - 1) loadBeat(beat + 1);
  else finish();
}

function finish() {
  els.prog.textContent = "Prologue complete";
  els.narr.textContent = "You spoke, and the living answered. You can already make Python say anything — that's print(). Next, the bow: you'll loose arrows, as many as you tell it to.";
  els.npc.textContent = "“Welcome to the fight, survivor.”";
  els.task.textContent = "✓ You've learned: print(), strings, and writing more than one line of code.";
  editor.setValue('print("I am ready.")');
  els.next.style.display = "none";
  setStatus("Prologue complete — Arena 1 (The Wildwood) is next.", "ok");
}

function translate(err) {
  const m = err.match(/name '(\w+)' is not defined/);
  if (m) return `Python saw the word ${m[1]} with no quotes and looked for a variable. Strings need quotes: print("${m[1]}").`;
  if (err.includes("SyntaxError")) return "SyntaxError — check you have print( ... ) with matching quotes and parentheses.";
  if (err.includes("EOL") || err.includes("unterminated")) return "Looks like a quote is missing its partner. Each string needs an opening and closing quote.";
  return err;
}

function setStatus(msg, kind) { els.status.textContent = msg; els.status.className = `status ${kind}`; }

// ---------- scene ----------
const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, Math.ceil(w), Math.ceil(h)); };
function person(c, x, y, cloth, skin, hair, bow) {
  px(c, x - 4, y + 8, 4, 9, "#3a2c18"); px(c, x + 1, y + 8, 4, 9, "#3a2c18");
  px(c, x - 5, y - 4, 11, 13, cloth);
  px(c, x - 4, y - 13, 9, 9, skin); px(c, x - 5, y - 14, 11, 3, hair);
  if (bow) { c.strokeStyle = "#9c6b3f"; c.lineWidth = 2; c.beginPath(); c.arc(x + 11, y - 1, 10, -1.1, 1.1); c.stroke(); c.strokeStyle = "#d9c7a3"; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 11, y - 11); c.lineTo(x + 11, y + 9); c.stroke(); }
}
function bubble(c, x, y, lines) {
  if (!lines.length) return;
  c.font = "13px 'IBM Plex Mono', monospace";
  const wrapped = []; for (const l of lines) wrapped.push(l.length > 30 ? l.slice(0, 30) + "…" : l);
  const wMax = Math.max(60, ...wrapped.map((l) => c.measureText(l || " ").width)) + 20;
  const hB = wrapped.length * 18 + 14;
  const bx = x - wMax / 2, by = y - hB - 16;
  c.fillStyle = "rgba(245,247,250,0.96)"; roundRect(c, bx, by, wMax, hB, 8); c.fill();
  c.beginPath(); c.moveTo(x - 6, by + hB); c.lineTo(x + 6, by + hB); c.lineTo(x, by + hB + 9); c.closePath(); c.fill();
  c.fillStyle = "#0b0e14"; c.textAlign = "left";
  wrapped.forEach((l, i) => c.fillText(l, bx + 10, by + 20 + i * 18));
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

function loop() { requestAnimationFrame(function f(t) { drawScene(t / 1000); requestAnimationFrame(f); }); }
function drawScene(now) {
  const c = els.ctx, W = els.scene.width, H = els.scene.height;
  // night sky + ground
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a1424"); g.addColorStop(0.6, "#0c1a16"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const sx = (i * 97) % W, sy = (i * 53) % (H * 0.5); c.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(now + i)); px(c, sx, sy, 2, 2, "#dfe7f5"); } c.globalAlpha = 1;
  for (let i = 0; i * 22 < W; i++) px(c, i * 22, H * 0.62, 22, H * 0.4, i % 2 ? "#16301f" : "#1a3a24");
  for (let i = 0; i < 22; i++) { const x = (i * 71) % W, y = H * 0.62 + (i * 37) % (H * 0.35), sw = Math.sin(now * 2 + i) * 2; c.strokeStyle = "#0f2417"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x + sw, y - 5); c.stroke(); }
  // campfire
  const fl = 0.6 + 0.4 * Math.sin(now * 14); px(c, W * 0.62, H * 0.8, 16, 5, "#3a2c18");
  c.fillStyle = "#ff6b3d"; c.beginPath(); c.arc(W * 0.62 + 8, H * 0.8, 9 * fl, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#ffd43b"; c.beginPath(); c.arc(W * 0.62 + 8, H * 0.8, 5 * fl, 0, Math.PI * 2); c.fill();
  // distant infected silhouettes drifting in
  for (let i = 0; i < 3; i++) { const x = W - 30 - ((now * 6 + i * 40) % 90); px(c, x, H * 0.55 + i * 6, 8, 14, "#1c2a1c"); px(c, x + 1, H * 0.55 - 4 + i * 6, 6, 6, "#243024"); }
  // NPC (right) + hero (left)
  person(c, W * 0.6, H * 0.6, "#3d5a3d", "#c89060", "#2b2018", false);
  person(c, W * 0.32, H * 0.62, "#6b8e23", "#e0a070", "#3a2c18", beat >= 3 || passed && beat === 3);
  // hero speech bubble (the player's print output)
  bubble(c, W * 0.32, H * 0.62 - 14, spoken.filter((l, i) => i < 4));
}

boot();
