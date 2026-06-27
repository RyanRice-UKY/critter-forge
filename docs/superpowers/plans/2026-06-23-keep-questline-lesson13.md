# Lesson 1.3 Keep Questline — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or subagent-driven-development to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the knight's 4-beat questline inside the keep that gates the stalls/chamber and teaches `if`, counters/`+=`, interactive `input()`, `if/else`, `float`, `//`, and `%`.

**Architecture:** Extend the existing single-file game (`lesson1.js` + `lesson1.html`). Add two mini-scenes (`storage`, `camp`), a raft transition, an interactive `input()` in the Pyodide harness, a `questStep` state var, and per-beat `ask()` lessons (read-only scaffold shown in the prompt/lesson area; player writes the editable lines; validators check exact answers). Spec: `docs/superpowers/specs/2026-06-23-keep-questline-lesson13-design.md`.

**Tech Stack:** Vanilla ES-module JS, HTML canvas, Pyodide (CPython-in-WASM). No build step.

## Global Constraints

- No git, no test framework in this project. "Tests" = `node --input-type=module --check < lesson1.js` for syntax + small Node logic-tests (`docs/superpowers/plans/_keeptest.mjs`, ES module) that import/duplicate each beat's pure validator and assert canonical answer passes + a wrong answer fails. Scenes/animation verified by **live DEV-jump playtest** (headless can't drive rAF — known limitation).
- `input()` returns the player-typed value via an interactive prompt (Beat 2 only); all other beats use the existing dict-returning harness.
- Every new concept gets a thorough `lesson:` panel string (plain language + analogy). `+=` taught as identical to `x = x + 1`.
- Match existing patterns in `lesson1.js`: scenes in `SCENES`, `drawX(c,W,gy,now)`, `fadeTo`, `ask({prompt,placeholder,rows,seed,lesson,requireOp,validate}, onCode)`, `goTo`, `STAND_BESIDE`, `logCmd`, the `P()` 1.55× sprite wrapper.

---

### Task 1: Quest state + knight starts the quest + stalls locked until done

**Files:** Modify `lesson1.js` (globals, `playKeep`, the keep free-roam vendor/knight handlers).

**Interfaces:**
- Produces: `let questStep = 0` (0=not started … 5=done); `let armoryOpen = false`. `playKeep` routes the knight's first talk into the quest (`startQuest()`), and stall greetings check `questStep` (locked message until `questStep >= 5`).

- [ ] **Step 1:** Add globals near `lesson1Done`: `let questStep = 0, armoryOpen = false;`
- [ ] **Step 2:** In `playKeep`, change the vendor branch so that when `questStep < 5` and the player walks to any stall, they get a locked line: `await say(KEEP_VENDOR[r.walk][0], "The captain hasn't cleared you to trade yet. See the knight.")`. The `armorsmith` is allowed once `armoryOpen` (Beat 4). Keep `knight`/`chamber` working.
- [ ] **Step 3:** When the player walks to `knight` and `questStep === 0`, call `await startQuest(name)` (defined in later tasks) instead of the generic quest dialogue; once `questStep >= 5` the knight gives a "well done, scout ahead" line.
- [ ] **Step 4:** `node --input-type=module --check < lesson1.js` → OK.
- [ ] **Step 5:** Live: DEV→1.3, walk to a stall → see the locked line; walk to knight → quest begins (stub ok for now).

---

### Task 2: Beat 1 — storage scene, the manifest `if`-checklist, raft transition

**Files:** Modify `lesson1.js` (`SCENES.storage`, `drawStorage`, draw branch, `startQuest`/`playBeat1`, a `raftTransition`), `docs/superpowers/plans/_keeptest.mjs` (validator test).

**Interfaces:**
- Consumes: `questStep`, `ask`, `fadeTo`, `say`, `logCmd`.
- Produces: `beat1Validate(vars)` → returns error string or null (checklist must be 4); `playBeat1(name)`; sets `questStep = 1` then walks via raft to `camp` scene.

- [ ] **Step 1 (test first):** In `_keeptest.mjs` add:
```js
// Beat 1: player sets armor/food/water; harness appends the check; we replicate the math
function beat1(armor, food, water) {
  const weight = armor*10 + food*4 + water*3;
  let checklist = 0;
  if (weight <= 30) checklist++;
  if (armor === 1) checklist++;
  if (food === 2) checklist++;
  if (water === 1) checklist++;
  return checklist === 4;
}
console.assert(beat1(1,2,1) === true,  "canonical packs the cart");
console.assert(beat1(0,2,1) === false, "too little blocked");
console.assert(beat1(2,2,1) === false, "too much blocked");
```
- [ ] **Step 2:** `node docs/superpowers/plans/_keeptest.mjs` → no assertion failures (Beat 1 block).
- [ ] **Step 3:** Add `SCENES.storage = { cart: 0.5 }`. Write `drawStorage(c,W,gy,now)`: stone room, shelves/crates, a supply cart at center, three labelled piles (armour/food/water). Add `else if (scene==="storage") drawStorage(...)` to the draw branch.
- [ ] **Step 4:** Write `playBeat1(name)`: `await fadeTo("storage")`; knight/captain set-up `say()`; then the manifest `ask()` — `prompt` shows the read-only check (from spec) in the `lesson` field, `placeholder: "armor = 1\nfood = 2\nwater = 1"`, `rows: 3`, the harness appends the check code and returns `checklist`; `validate` = the Beat 1 rule (checklist===4 ⇒ null). On pass: `questStep = 1`, play `raftTransition()` → `fadeTo("camp")` → `playBeat2(name)`.

  Harness note: `run_user` already runs `pre + "\n" + src`. Pass the manifest check as `pre`? No — the check must run AFTER the player's assignments. Add an optional `post` param to `run_user` (append after src) OR append the check to `src` in JS before calling. Simplest: in `playBeat1`, build the full source = player's editor value + "\n" + CHECK_CODE, run, read `vars.checklist`. Use a dedicated `ask` variant or pass the check via a new `opts.append` field handled in `submit()`.
- [ ] **Step 5:** Implement `opts.append` in `submit()`: `const src = els.code.value + (opts.append ? "\n" + opts.append : "");` (define `board_raft` as a no-op in the appended/pre code so it doesn't error).
- [ ] **Step 6:** `raftTransition()`: brief anim of a raft drifting across water (reuse clearing water draw); ~1.2s.
- [ ] **Step 7:** `node --input-type=module --check < lesson1.js` → OK; rerun `_keeptest.mjs` → OK.
- [ ] **Step 8:** Live: DEV→1.3 → knight → storage room renders → type the 3 lines → wrong amounts blocked with the nudge → correct → raft → camp.

---

### Task 3: Interactive input() harness + Beat 2 — camp, watchword, `if/else`

**Files:** Modify `lesson1.js` (HARNESS, `submit()`, `SCENES.camp`, `drawCamp`, draw branch, `playBeat2`), `_keeptest.mjs`.

**Interfaces:**
- Consumes: `questStep`, `ask`, `fadeTo`, `say`, the knight's watchword (set in Task 5 dialogue; for now seed `WATCHWORD="ironwatch"`).
- Produces: interactive `input()`; `playBeat2(name)`; sets `questStep = 2` and returns the player to the keep.

- [ ] **Step 1 (test first):** In `_keeptest.mjs` add a watchword check replica:
```js
function beat2(typed, watchword) { return typed === watchword; }
console.assert(beat2("ironwatch","ironwatch") === true,  "right word trusted");
console.assert(beat2("oops","ironwatch") === false,      "wrong word blocked");
```
- [ ] **Step 2:** `node _keeptest.mjs` → OK.
- [ ] **Step 3:** Interactive `input()`: in the JS `submit()` path for Beat 2, before running, scan the source for `input(`; if present, `window.prompt("The sentry waits — speak the watchword:")` and feed the result to Pyodide via `pyodide.setStdin({ stdin: () => collected })` (or define a Python `input` in the harness that returns a JS-provided value). Store typed value; the player's `secret_string = input()` receives it. Seed `WATCHWORD = "ironwatch"` in the harness `pre`.
- [ ] **Step 4:** `SCENES.camp = { gate: 0.5 }`; `drawCamp(c,W,gy,now)`: tents, a sentry NPC, the captain, a campfire. Add draw branch.
- [ ] **Step 5:** `playBeat2(name)`: sentry `say()`; `ask()` with `placeholder: 'secret_string = input()\nif secret_string == WATCHWORD:\n    print("Pass, friend.")\nelse:\n    print("Halt!")'`, `rows: 4`, `seed: 'WATCHWORD="ironwatch"'`, `lesson` explaining input()/if-else/==; `validate` = trusted iff `vars.secret_string === "ironwatch"` AND src has `input` and `else`. Wrong → re-prompt. On pass: captain gives the storyline report `say()`; `questStep = 2`; `await fadeTo("keep")`; `playBeat3(name)`.
- [ ] **Step 6:** `node --check` OK; `_keeptest.mjs` OK.
- [ ] **Step 7:** Live: reach camp → `input()` prompt appears → wrong word → else branch + retry → right word → report → back to keep.

---

### Task 4: Beat 3 — report back, `float` reward, armory unlock

**Files:** Modify `lesson1.js` (`playBeat3`), `_keeptest.mjs`.

**Interfaces:** Consumes `questStep`, `char.gold`, `ask`. Produces `playBeat3(name)`; sets `armoryOpen = true`, `questStep = 3`, updates `char.gold += 1.75`.

- [ ] **Step 1 (test):** `_keeptest.mjs`: `function beat3(gold){ const reward=1.75; return Math.abs((gold+reward)-(gold+1.75))<1e-9; }` plus assert reward is float-handled; assert `2.05+1.75===3.8` within tol.
- [ ] **Step 2:** `node _keeptest.mjs` OK.
- [ ] **Step 3:** `playBeat3(name)`: knight reads the report (`say` storyline); `ask()` `placeholder: "reward = 1.75\ngold += reward"`, `rows: 2`, `seed: \`gold=${char.gold}\``, `requireOp: "+"`, `lesson` explaining float + `+=` reuse; `validate`: `Math.abs(vars.gold - (charGoldAtStart + 1.75)) < 0.001` and `vars.reward === 1.75`. onCode: `char.gold = +(char.gold + 1.75).toFixed(2)`, `armoryOpen = true`, `questStep = 3`, `await say("Knight","The armory's open to you now.")`, `playBeat4(name)`.
- [ ] **Step 4:** `node --check` OK; `_keeptest.mjs` OK.
- [ ] **Step 5:** Live: report-back beat → float reward added (gold HUD updates) → armory unlock line.

---

### Task 5: Beat 4 — armory purchase with `//` and `%`; finish questline

**Files:** Modify `lesson1.js` (`playBeat4`, knight completion line, set `lesson1Done`), `_keeptest.mjs`.

**Interfaces:** Consumes `armoryOpen`, `ask`, `goTo("armorsmith")`. Produces `playBeat4(name)`; sets `questStep = 5`, `lesson1Done = true` (chamber opens).

- [ ] **Step 1 (test):** `_keeptest.mjs`: `function beat4(){ const g=1.75,p=0.5; return [g//? : Math.floor(g/p), g%p]; }` → assert `Math.floor(1.75/0.5)===3` and `Math.abs(1.75%0.5-0.25)<1e-9`.
- [ ] **Step 2:** `node _keeptest.mjs` OK.
- [ ] **Step 3:** `playBeat4(name)`: require walk to `armorsmith` (`ask` validating `r.walk==="armorsmith"`), then the purchase `ask()` `placeholder: "piece_cost = 0.50\npieces = gold // piece_cost\ngold = gold % piece_cost"`, `rows: 3`, `seed: "gold=1.75"`, `lesson` explaining `//` and `%` (coins analogy); `validate`: `vars.pieces === 3` and `Math.abs(vars.gold - 0.25) < 0.001` and src has `//` and `%`. onCode: `char.gold = 0.25`, `questStep = 5`, `lesson1Done = true`.
- [ ] **Step 4:** Knight completion: walking to knight at `questStep>=5` → "You've proven yourself — the keep is yours. Now… we need a scout." (sets up next quest). Chamber now shows "KING'S CHAMBER" (already keyed on `lesson1Done`).
- [ ] **Step 5:** `node --check` OK; `_keeptest.mjs` OK.
- [ ] **Step 6:** Live: armory purchase → gold becomes 0.25, pieces 3 → questline done → stalls unlock, chamber shows unlocked.

---

## Self-Review

- **Spec coverage:** Beat 1 (Task 2), Beat 2 + interactive input (Task 3), Beat 3 (Task 4), Beat 4 (Task 5), gating/unlock (Tasks 1+5), new scenes storage/camp + raft (Tasks 2-3). All spec sections mapped.
- **Placeholders:** validators and seeds are concrete; `drawStorage`/`drawCamp` art described (built in the pixel language already established) — acceptable for this project's visual-by-playtest verification.
- **Type consistency:** `questStep`/`armoryOpen`/`lesson1Done` used consistently; `ask` opts (`append`, `seed`, `requireOp`, `lesson`, `rows`) match existing + the one new `append`.

## Notes
- `_keeptest.mjs` is a scratch logic-test (delete or keep alongside `verify.mjs`).
- Build order = task order (Beat 1 first). Each task ends syntax-clean + logic-tested + live-checkable.
