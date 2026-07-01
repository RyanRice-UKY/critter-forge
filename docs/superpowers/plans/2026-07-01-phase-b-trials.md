# Phase B: Trial Engine + Proving Grounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LeetCode-style practice puzzles ("Trials") with visible examples + hidden held-out cases, a dedicated Trial screen, and a Proving Grounds NPC in the keep offering 8 trials.

**Architecture:** Trials are plain data objects (Node-safe module). A pure-JS case checker (`trials/grade.js`) is shared by the browser Trial screen (grading via Pyodide) and a Node verify harness (grading via the system `python`). The Trial screen is its own page (`trial.html?t=<id>`), styled like the game's challenge-modal mockup. The keep gets a Drillmaster NPC who opens a Trial board overlay.

**Tech Stack:** Vanilla JS + Pyodide + CodeMirror (no build step), Node for harnesses, system `python` for offline verification.

## Global Constraints

- No build step; pages must run from `python -m http.server`.
- Published copy: plain and human, **no em dashes**.
- Trials must NOT require concepts beyond Chapter 1–2 (no `def`, no lists): seeded
  variables in, expected variables/stdout out.
- Hidden cases must defeat hardcoding: every trial ships a `cheat` solution
  (hardcodes example 1's answer) that the verify harness asserts FAILS.
- Save schema stays `sts-save-v1` (additive keys only).

---

### Task 1: `trials/grade.js` — pure case checker (+ tests)

**Files:**
- Create: `trials/grade.js`
- Test: `docs/superpowers/plans/_gradetest.mjs`

**Interfaces:**
- Produces: `checkCase(expect, result) -> { pass: boolean, detail: string }`
  - `expect = { vars?: {name: number|string}, stdout?: string }`
  - `result = { vars: object, stdout: string, err: string }`
  - Numeric vars compare with 1e-6 tolerance; stdout compares trimmed.
- Produces: `seedToPython(seedObj) -> "a=1\nb='x'"` (numbers and strings only).

- [ ] **Step 1: Write failing tests** (`_gradetest.mjs`, eval-loads grade.js like `_savetest.mjs` does — grade.js is an ES module, so use `import`):

```js
import { checkCase, seedToPython } from "../../../trials/grade.js";
// pass: exact var
eq(checkCase({ vars: { total: 21 } }, { vars: { total: 21 }, stdout: "", err: "" }).pass, true, "var pass");
// float tolerance
eq(checkCase({ vars: { gold: 2.05 } }, { vars: { gold: 2.0500000001 }, stdout: "", err: "" }).pass, true, "float tol");
// missing var
eq(checkCase({ vars: { total: 21 } }, { vars: {}, stdout: "", err: "" }).pass, false, "missing var");
// wrong value reports expected vs got in detail
const r = checkCase({ vars: { total: 21 } }, { vars: { total: 7 }, stdout: "", err: "" });
eq(r.pass, false, "wrong var"); eq(r.detail.includes("21") && r.detail.includes("7"), true, "detail");
// stdout trimmed equality
eq(checkCase({ stdout: "pass" }, { vars: {}, stdout: "pass\n", err: "" }).pass, true, "stdout");
// error fails
eq(checkCase({ vars: { x: 1 } }, { vars: {}, stdout: "", err: "NameError: x" }).pass, false, "err fails");
// seedToPython
eq(seedToPython({ a: 3, w: "axe" }), 'a = 3\nw = "axe"', "seed");
```

- [ ] **Step 2: Run** `node docs/superpowers/plans/_gradetest.mjs` → FAIL (module missing)
- [ ] **Step 3: Implement `trials/grade.js`** (ES module, zero deps)
- [ ] **Step 4: Run tests** → all pass
- [ ] **Step 5: Commit** `feat(trials): pure case checker + seed serializer`

### Task 2: `trials/trials-data.js` — the 8 trials (+ Node verify vs system python)

**Files:**
- Create: `trials/trials-data.js`
- Create: `trials-verify.mjs` (repo root, like verify.mjs / tower-verify.mjs)

**Interfaces:**
- Produces: `TRIALS` array; each trial:
  `{ id, n, title, concept, xp, brief, starter, requireOps: [], examples: [case,case], hidden: [case,...], hints: [h1, h2], canonical, cheat }`
  where `case = { seed: {..}, expect: { vars?: {..}, stdout?: str } }`.
- Consumes: `checkCase`, `seedToPython` from Task 1.

The 8 trials (all seeded-variable style, chapter 1–2 concepts only):

| # | id | title | concept | task |
|---|----|-------|---------|------|
| 1 | stock-quiver | Stock the Quiver | add | `total = arrows + found` |
| 2 | call-it-out | Call It Out | print-var | `print(sighted)` (stdout equals the number) |
| 3 | hand-them-over | Hand Them Over | subtract | `left = stock - given` |
| 4 | toll-ledger | Toll Ledger | float | `pay = 0.25 * heads` and `gold_left = gold - pay` |
| 5 | ration-split | Ration Split | intdiv | `each = loaves // mouths`, `spare = loaves % mouths` |
| 6 | gate-check | Gate Check | if | `print("pass")` if `word == secret` else `print("halt")` |
| 7 | volley-count | Volley Count | for-loop | `total = 0`, for-range accumulate `per` per volley (requireOps: ["for", "range"]) |
| 8 | supply-manifest | Supply Manifest | if | `packed` counts how many of `armor >= need_a`, `food >= need_f`, `water >= need_w` hold |

Each: 2 visible examples, 3 hidden cases (different magnitudes so hardcoding fails),
2 hints (nudge → structure), `canonical` (passes all), `cheat` (assigns/prints example 1's
literal answers; must fail hidden cases). XP: 25 each, 40 for 7–8.

- [ ] **Step 1: Write `trials-verify.mjs`**: batches every (trial × case × {canonical,cheat}) into ONE `python -c` process (JSON over stdin/stdout: exec seed then src in a fresh ns, capture simple vars + stdout + err), then asserts with `checkCase`: canonical passes ALL cases; cheat FAILS at least one hidden case; `requireOps` present in canonical. Exit 1 on any failure, print a per-trial table.
- [ ] **Step 2: Run** `node trials-verify.mjs` → FAIL (no data file)
- [ ] **Step 3: Write `trials-data.js`** with all 8 trials, full copy (story-skinned briefs, no em dashes)
- [ ] **Step 4: Run** `node trials-verify.mjs` → `8/8 canonical pass, 8/8 cheats rejected`
- [ ] **Step 5: Commit** `feat(trials): 8 proving-grounds trials + offline verify harness`

### Task 3: Save support for trials

**Files:**
- Modify: `core/save.js` (fresh() gains `trials: {}`; add `completeTrial(id, xp)` → sets `trials[id] = true` + addXP; add `isTrialDone(id)`)
- Test: append to `docs/superpowers/plans/_savetest.mjs`

- [ ] **Step 1: Append failing tests** (completeTrial marks done + awards xp; isTrialDone false→true; reset clears)
- [ ] **Step 2: Run** → FAIL
- [ ] **Step 3: Implement**
- [ ] **Step 4: Run** → pass (now 27+ tests)
- [ ] **Step 5: Commit** `feat(save): trial completion tracking`

### Task 4: `trial.html` + `trial.js` — the Trial screen

**Files:**
- Create: `trial.html` (Pyodide + CodeMirror includes, same fonts/palette as lesson1)
- Create: `trial.js` (plain script; imports via module for trials-data + grade)

**Interfaces:**
- Consumes: `TRIALS`, `checkCase`, `seedToPython`, `window.Save`.
- URL: `trial.html?t=<id>`; "Back to the keep" → `lesson1.html#keep`.

Layout (challenge-modal aesthetic, full page):
- Left panel: trial number + title, concept chip (links journal? plain label), XP badge, brief, **Examples table** (each visible example: seed vars → expected vars/stdout, formatted as code).
- Right panel: mini-IDE (titlebar `trial_<n>.py`, CodeMirror seeded with `starter`, Run button, status bar).
- Below editor: **Results table**, one row per case: visible cases show `seed → expected vs got`; hidden cases show only `Hidden case N — pass/fail`.
- Grading: for each case build `seedToPython(seed)`, call Pyodide `run_trial(src, seed)` (lean harness: exec seed then src in fresh ns, capture int/float/str/bool vars + stdout + err), `checkCase` each; all pass → victory banner (+XP via `Save.completeTrial`, once), confetti-free, "Back to the keep".
- Hint ladder: fail counter per session; ≥2 fails → show `hints[0]`; ≥4 → `hints[1]` + offer skeleton (starter stays; skeleton = `skeletonize(canonical)` from curriculum.js).
- `requireOps`: checked before running; friendly message if missing.
- Already-done trials show a ✓ and can be replayed (no double XP).

- [ ] **Step 1: Build page skeleton + rendering from trials-data** (no grading yet); headless screenshot `trial.html?t=stock-quiver` shows brief + examples + editor
- [ ] **Step 2: Wire Pyodide harness + grading + results table**
- [ ] **Step 3: Wire XP award + done-state + hint ladder**
- [ ] **Step 4: Verify headless (static parts) + live (grading loop)**
- [ ] **Step 5: Commit** `feat(trials): trial screen with hidden-case grading + hint ladder`

### Task 5: Proving Grounds in the keep

**Files:**
- Modify: `lesson1.js` (SCENES.keep gains `proving: 0.3`; Drillmaster sprite = `soldier()` with a red plume variant drawn in drawKeep; walk-hint chip; playKeep branch)
- Modify: `lesson1.html` (Trial board overlay `#trialBoard`: list of 8 trials with ✓/○, XP, Begin buttons)

**Interfaces:**
- Consumes: `TRIALS` (import), `Save.isTrialDone`.
- Board rows link to `trial.html?t=<id>`.

Behavior:
- `you.walk("proving")` → if `!lesson1Done`: Drillmaster says "Prove yourself to the knight first, recruit." Else: short intro dialogue, then the board overlay opens (closable; keep free-roam continues after).
- Board shows total: "3 / 8 trials · 75 XP earned".

- [ ] **Step 1: Add Drillmaster to drawKeep + SCENES + setLocations lists**
- [ ] **Step 2: Add board overlay HTML/CSS + open/close wiring**
- [ ] **Step 3: playKeep branch + gate on lesson1Done**
- [ ] **Step 4: Headless screenshot `#keep` (Drillmaster visible); live test the flow**
- [ ] **Step 5: Commit** `feat(keep): proving grounds drillmaster + trial board`

### Task 6: Final verification

- [ ] `node docs/superpowers/plans/_gradetest.mjs` → pass
- [ ] `node docs/superpowers/plans/_savetest.mjs` → pass
- [ ] `node trials-verify.mjs` → 8/8 + cheats rejected
- [ ] Headless: trial screen + keep board screenshots
- [ ] Live handoff to Ryan: solve trial 1 end to end, check XP lands on the map screen
- [ ] Commit any fixes; update memory

## Self-Review Notes

- Spec coverage: Trial rung (6) ✓, hidden held-out cases ✓, hint ladder ✓, Proving
  Grounds NPC ✓, ~8 trials ✓, XP integration ✓. Gauntlet (rung 7) is deliberately
  Phase C+ (spec lists it under chapter bosses).
- No `def`/lists required by any trial (chapter 1–2 ceiling respected).
- Types consistent: `case.expect` shape identical between grade.js, trials-data,
  trial.js, and trials-verify.
