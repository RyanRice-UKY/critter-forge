// trials-verify.mjs — offline verification of every trial (run: node trials-verify.mjs)
// For each trial: the canonical solution must pass EVERY case, and the cheat
// solution (hardcoded example-1 answers) must FAIL at least one hidden case.
// Grading runs on the system `python` in ONE batch process (JSON over stdio).
import { spawnSync } from "node:child_process";
import { TRIALS } from "./trials/trials-data.js";
import { checkCase, seedToPython } from "./trials/grade.js";

const RUNNER = `
import sys, json, io
jobs = json.load(sys.stdin)
out = []
for job in jobs:
    ns = {}
    err = ""
    buf = io.StringIO(); old = sys.stdout; sys.stdout = buf
    try:
        exec(job["seed"], ns)
        exec(job["src"], ns)
    except Exception as e:
        err = type(e).__name__ + ": " + str(e)
    finally:
        sys.stdout = old
    vars = {k: v for k, v in ns.items() if not k.startswith("_") and isinstance(v, (int, float, str, bool))}
    out.append({"vars": vars, "stdout": buf.getvalue(), "err": err})
print(json.dumps(out))
`;

// build the full job list: every (trial × case) for canonical and cheat
const jobs = [], index = [];
for (const t of TRIALS) {
  const cases = [...t.examples.map((c) => ({ ...c, hidden: false })), ...t.hidden.map((c) => ({ ...c, hidden: true }))];
  for (const src of ["canonical", "cheat"]) for (let i = 0; i < cases.length; i++) {
    jobs.push({ seed: seedToPython(cases[i].seed), src: t[src] });
    index.push({ id: t.id, src, case: cases[i], i });
  }
}

const py = spawnSync("python", ["-c", RUNNER], { input: JSON.stringify(jobs), encoding: "utf8", timeout: 60000 });
if (py.status !== 0) { console.error("python runner failed:", py.stderr); process.exit(1); }
const results = JSON.parse(py.stdout);

let bad = 0;
for (const t of TRIALS) {
  const mine = index.map((m, i) => ({ ...m, r: results[i] })).filter((m) => m.id === t.id);
  const canon = mine.filter((m) => m.src === "canonical");
  const cheat = mine.filter((m) => m.src === "cheat");
  const canonFails = canon.filter((m) => !checkCase(m.case.expect, m.r).pass);
  const cheatCaught = cheat.some((m) => m.case.hidden && !checkCase(m.case.expect, m.r).pass);
  const opsOk = (t.requireOps || []).every((op) => t.canonical.includes(op));
  const ok = canonFails.length === 0 && cheatCaught && opsOk;
  if (!ok) bad++;
  console.log(`${ok ? "✓" : "✗"} ${t.id.padEnd(16)} canonical ${canon.length - canonFails.length}/${canon.length}` +
    `  cheat ${cheatCaught ? "rejected" : "NOT CAUGHT"}${opsOk ? "" : "  requireOps MISSING"}`);
  for (const m of canonFails) console.log(`    case ${m.i} (${m.case.hidden ? "hidden" : "visible"}): ${checkCase(m.case.expect, m.r).detail}`);
}
console.log(bad ? `\n${bad} trial(s) failing` : `\nall ${TRIALS.length} trials verified`);
process.exit(bad ? 1 : 0);
