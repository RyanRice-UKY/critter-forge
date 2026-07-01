// trial.js — the Trial screen: LeetCode-style grading against visible examples
// plus hidden held-out cases. Grading runs in Pyodide; case checking is the same
// pure logic the offline harness uses (trials/grade.js).
import { TRIALS, trialById } from "./trials/trials-data.js";
import { checkCase, seedToPython } from "./trials/grade.js";
import { skeletonize, CONCEPTS } from "./curriculum.js";

const $ = (id) => document.getElementById(id);
const Sv = window.Save || null;

const t = trialById(new URLSearchParams(location.search).get("t")) || TRIALS[0];
const OP_NAMES = { "+": "the + operator", "-": "the - operator", "*": "the * operator", "//": "floor division //", "%": "the % operator", print: "a print statement", if: "an if statement", "==": "the == test", ">=": "the >= test", for: "a for loop", range: "range(...)" };

// ---------- render the problem ----------
document.title = `Trial ${t.n}: ${t.title}`;
$("tTitle").textContent = `Trial ${t.n} of ${TRIALS.length}`;
$("tName").textContent = t.title;
$("tXp").textContent = `+${t.xp} XP`;
$("tConcept").textContent = (CONCEPTS[t.concept] && CONCEPTS[t.concept].link) || t.concept;
$("tBrief").textContent = t.brief;
$("fileName").textContent = `trial_${t.n}.py`;
if (Sv && Sv.isTrialDone(t.id)) $("tDone").hidden = false;
const fmtExpect = (e) => [
  ...Object.entries((e.vars || {})).map(([k, v]) => `${k} = ${typeof v === "string" ? JSON.stringify(v) : v}`),
  ...(e.stdout != null ? [`prints: ${e.stdout}`] : []),
].join("\n");
$("tExamples").innerHTML = t.examples.map((c) =>
  `<tr><td><code>${esc(seedToPython(c.seed))}</code></td><td><code>${esc(fmtExpect(c.expect))}</code></td></tr>`).join("");
function esc(s) { return String(s).replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch])); }

// ---------- editor ----------
const cm = CodeMirror.fromTextArea($("code"), { mode: "python", lineNumbers: true, indentUnit: 4, tabSize: 4, smartIndent: true, viewportMargin: Infinity });
cm.setValue(t.starter || "");
cm.setSize("100%", "auto");

// ---------- pyodide harness ----------
const HARNESS = `
import json, io, sys
def run_trial(src, seed):
    ns = {}
    err = ""
    buf = io.StringIO(); old = sys.stdout; sys.stdout = buf
    try:
        exec(seed, ns)
        exec(src, ns)
    except Exception as e:
        err = type(e).__name__ + ": " + str(e)
    finally:
        sys.stdout = old
    vars = {k: v for k, v in ns.items() if not k.startswith("_") and isinstance(v, (int, float, str, bool))}
    return json.dumps({"vars": vars, "stdout": buf.getvalue(), "err": err})
`;
let runTrial = null;
(async () => {
  const py = await loadPyodide();
  await py.runPythonAsync(HARNESS);
  runTrial = py.globals.get("run_trial");
  $("pystat").textContent = "● python ready"; $("pystat").classList.add("ok"); $("run").disabled = false;
})();

// ---------- grading ----------
let fails = 0, celebrated = Sv ? Sv.isTrialDone(t.id) : false;
$("run").onclick = grade;
cm.setOption("extraKeys", { "Shift-Enter": (c2) => c2.execCommand("newlineAndIndent"), "Ctrl-Enter": grade });

function grade() {
  if (!runTrial) return;
  const src = cm.getValue();
  $("status").textContent = ""; $("victory").style.display = "none";
  const missing = (t.requireOps || []).filter((op) => !src.includes(op));
  if (missing.length) { setBad(`The drillmaster wants to see ${missing.map((m) => OP_NAMES[m] || m).join(" and ")} in your solution.`); return; }
  const cases = [...t.examples.map((c, i) => ({ ...c, label: `Example ${i + 1}`, hidden: false })), ...t.hidden.map((c, i) => ({ ...c, label: `Hidden case ${i + 1}`, hidden: true }))];
  const rows = []; let allPass = true;
  for (const c of cases) {
    let res;
    try { res = JSON.parse(runTrial(src, seedToPython(c.seed))); }
    catch (e) { res = { vars: {}, stdout: "", err: String(e.message || e) }; }
    const chk = checkCase(c.expect, res);
    if (!chk.pass) allPass = false;
    rows.push({ label: c.label, hidden: c.hidden, pass: chk.pass, detail: c.hidden ? (chk.pass ? "" : "does not hold up against unseen numbers") : chk.detail });
  }
  $("results").innerHTML = rows.map((r) =>
    `<div class="case ${r.pass ? "ok" : "bad"}"><span class="st">${r.pass ? "✓" : "✗"}</span><span class="lbl">${r.label}</span><span class="det">${esc(r.detail)}</span></div>`).join("");
  $("dot").classList.toggle("err", !allPass);
  if (allPass) {
    const first = Sv ? Sv.completeTrial(t.id, t.xp) : false;
    $("tDone").hidden = false;
    $("victory").innerHTML = `Trial passed${first ? ` · +${t.xp} XP` : ""}. The drillmaster nods. <a href="lesson1.html#keep">Return to the keep ▸</a>`;
    $("victory").style.display = "block";
    celebrated = true;
  } else {
    fails++;
    if (fails >= 2) {
      const hb = $("hintbox"); hb.style.display = "block";
      hb.textContent = "💡 " + t.hints[0];
      if (fails >= 4) {
        hb.textContent = "💡 " + t.hints[1];
        if (!hb.querySelector("button")) { const b = document.createElement("button"); b.textContent = "⤵ start me off"; b.onclick = () => cm.setValue(skeletonize(t.canonical)); hb.appendChild(document.createElement("br")); hb.appendChild(b); }
      }
    }
  }
}
function setBad(msg) { $("status").textContent = msg; $("status").style.color = "#ffb3b3"; $("dot").classList.add("err"); }
