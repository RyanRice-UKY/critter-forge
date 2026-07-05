# Stutter Rework + input() Rounds + Board Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the stutter opening (run it, recreate it, type-check the clue set), feed the decipher rounds through a visible `raw = input()`, and fix the probe board's placement and legend overlap.

**Architecture:** All in `lesson1.js`: two beats reworked in `playTypesArc`, a one-line `ask()` extension (`inputValue`), round data + `runDecipherRounds` changes, and `drawWorkshop` layout edits. Drives updated to the new flow.

**Tech Stack:** Vanilla JS + Pyodide; Playwright driver at `C:\Users\Ryan\AppData\Local\Temp\sts-drive` (`{ channel: 'chrome', headless: true }`; server http://localhost:8931, start `python -m http.server 8931 --directory C:\Users\Ryan\critter-forge` in background if down).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-05-stutter-rework-input-rounds-design.md`. Copy below is final and verbatim; no em dashes in player-facing strings.
- Tab-skip: every prefill-or-placeholder passes its own validator (skipStep prefers placeholder).
- Untouched: T3 (first cast) onward in the arc, round rules/pairs/expects/reruns/messages except where this plan names the change, implantStep/HUNT/epilogue.
- Anchors govern, not line numbers (as of commit `718af3d`). `node --check C:\Users\Ryan\critter-forge\lesson1.js` after every edit.
- Drive conventions: `#pystat` "python ready" wait; Tab advances/auto-runs; CodeMirror via `.CodeMirror` setValue + `#run`; `#status` for validator messages; canvas dialogue via the fillText hook; READ screenshots.
- Do NOT push to GitHub during tasks; commits stay local until the controller pushes after the final review.

---

### Task 1: The stutter beats (T1b recreate + T2 type-check-the-rest)

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` (`playTypesArc` only)

**Interfaces:**
- Consumes: existing `ask`, `say`, `lastSrc`.
- Produces: prompts `"Recreate the stutter with your own marks"` and `"Check the shape of every variable"` (Task 3's drive references them).

- [ ] **Step 1: Replace the post-T1 section**

In `playTypesArc`, the current text from the say line

```js
  await say("Craftsman", "One-two-one-two. Do you see it now? \"12\" in quotes is not a number. It is a str, a STRING of text marks. Multiply marks and Python politely repeats them. What a value CAN DO is decided by its shape.");
```

through the end of the caliper ask's follow-up say

```js
  await say("Craftsman", "class str, class int. Marks, and a whole number. Integer, int for short: the shape arithmetic works on. Now the trick I never knew. The one where you teach ME.");
```

(inclusive — this removes the old "Ask two values their shape" ask) is REPLACED with:

```js
  await say("Craftsman", "One-two-one-two. Do you see it now? \"12\" in quotes is not a number. It is a str, a STRING of text marks. Multiply marks and Python politely repeats them.");
  await say("Craftsman", "Do not take my word for it. PROVE it. Do what I did with your own marks: pick any two-digit number, wrap it in quotes, multiply it by two.");
  await ask({
    prompt: "Recreate the stutter with your own marks",
    placeholder: 'marks = "34"\nprint(marks * 2)', rows: 2,
    concept: "types",
    task: "Write the craftsman's experiment yourself, slightly differently: declare your own variable holding a TWO-DIGIT number in quotes (any number, any name), then print it multiplied by 2. Predict the answer before you run.",
    validate: (r) => {
      const m2 = lastSrc.match(/["'](\d\d)["']/);
      if (!m2) return 'Put a two-digit number in quotes, like "34". The quotes are the whole experiment.';
      const twice = m2[1] + m2[1];
      return r.stdout.trim() === twice ? null : `Multiply your marks by 2 and print the result. With "${m2[1]}" the machine should echo ${twice}.`;
    },
  }, null);
  await say("Craftsman", "There it is, in your own hand. Any marks, same stutter. What a value CAN DO is decided by its shape, and that shape has a name: its TYPE.");
  await say("Craftsman", "Here is your experiment back. I stripped the print and wired three more values beside it, and my one line shows you the caliper: type() names any value's shape. Check the rest.");
  await ask({
    prompt: "Check the shape of every variable",
    prefill: 'marks = "34"\necho = marks * 2\ncount = 34\nvolts = 7.5\narmed = True\nprint(type(marks))\n',
    placeholder: 'marks = "34"\necho = marks * 2\ncount = 34\nvolts = 7.5\narmed = True\nprint(type(marks))\nprint(type(echo))\nprint(type(count))\nprint(type(volts))\nprint(type(armed))', rows: 10,
    concept: "types",
    task: "The first six lines are given: your experiment, three new values, and one caliper line already checking marks. Add caliper lines for the REST: echo, count, volts, armed. The shapes on the board are the clue to how this machine thinks.",
    validate: (r) => {
      if (!/type\s*\(\s*echo\s*\)/.test(lastSrc)) return "Check echo too: print(type(echo)).";
      if (!/type\s*\(\s*count\s*\)/.test(lastSrc)) return "Check count too: print(type(count)).";
      if (!/type\s*\(\s*volts\s*\)/.test(lastSrc)) return "Check volts too: print(type(volts)).";
      if (!/type\s*\(\s*armed\s*\)/.test(lastSrc)) return "Check armed too: print(type(armed)).";
      if (!r.stdout.includes("'int'") || !r.stdout.includes("'float'") || !r.stdout.includes("'bool'")) return "Run all five checks and read the shapes off the board.";
      return null;
    },
  }, null);
  await say("Craftsman", "READ them, scout. marks is str, and echo is str too: marks times two is just LONGER MARKS. But count is int, volts is float, armed is bool. Four shapes.");
  await say("Craftsman", "There is the clue. The machine repeats TEXT and calculates NUMBERS. Everything it does flows from which shape it holds. Now the trick I never knew. The one where you teach ME.");
```

- [ ] **Step 2: Syntax + trace + drive**

`node --check` → exit 0. Hand-trace both placeholders: T1b `"34"` → stdout `3434` = `"34"+"34"` ✓; T2 placeholder prints all five types, source has all four required checks, stdout carries 'int'/'float'/'bool' ✓.

Update `C:\Users\Ryan\AppData\Local\Temp\sts-drive\q5-types-arc.mjs`: in its `beats` array, replace `'Ask two values their shape'` with the two new prompts in order: `"Recreate the stutter with your own marks"`, `'Check the shape of every variable'`. Run it. Expected: `ARC COMPLETE, ROUNDS REACHED`, `PAGEERRORS: none`. Read the walkthrough + round-1 screenshots as before.

- [ ] **Step 3: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "feat(types): stutter proved by the player's own hand, then type-check the clue set (replaces the caliper beat)"
```
(Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.)

---

### Task 2: input()-fed rounds + ask inputValue

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` (`submit()`, `DECIPHER`, `runDecipherRounds`)

**Interfaces:**
- Consumes: Task 1's arc (drive traverses it); existing `runUser`, `workshopPairs`, `workshopSpark`.
- Produces: `ask` option `inputValue` (string; harness input with no popup).

- [ ] **Step 1: `ask()` extension**

In `submit()`, the input line (anchor `if (opts.inputPrompt) { const p = window.prompt(`) gains an else-if so it reads:

```js
  if (opts.inputPrompt) { const p = window.prompt(opts.inputPrompt, opts.inputDefault || ""); inputval = p === null ? (opts.inputDefault || "") : p; }  // interactive input(); cancel falls back to the suggested default
  else if (opts.inputValue != null) inputval = String(opts.inputValue);  // machine-fed input(): no popup, the scene supplies the value
```

- [ ] **Step 2: Round data**

In `DECIPHER`, per entry: placeholders gain `raw = input()` as the FIRST line (before the cast line) and rows grow by 1 (R1 3, R2 6, R3 6). Task prefixes change:
- R1: replace `Already wired to your bench:\n\n    raw = "7"\n\nCast before you calculate. ` with `The wire feeds your code through input(): line 1 is already written. The crank is sending 7. Cast before you calculate. `
- R2: replace `Already wired to your bench:\n\n    raw = "12"\n\nCast first. ` with `The wire feeds your code through input(): line 1 is already written. The crank is sending 12. Cast first. `
- R3: replace `Already wired to your bench:\n\n    raw = "20"\n\nCast first. ` with `The wire feeds your code through input(): line 1 is already written. The crank is sending 20. Cast first. `

- [ ] **Step 3: `runDecipherRounds` mechanics**

Inside the loop, after the probes `for` and before the `ask`, insert (pairs-first pending):

```js
    workshopPairs.push("IN " + R.seed + " -> OUT ?"); workshopSpark = 1;
```

The ask options: `seed: 'raw = "' + R.seed + '"'` becomes two options:

```js
      prefill: "raw = input()\n",
      inputValue: String(R.seed),
```

The rerun call (anchor `runUser(lastSrc, 'raw = "' + h + '"', "")`) becomes:

```js
          try { rr2 = JSON.parse(runUser(lastSrc, "", String(h))); } catch (e) { return "Something broke re-running your steps. Try again."; }
```

Directly after the ask resolves (before the per-round closing say), insert:

```js
    workshopPairs[workshopPairs.length - 1] = "IN " + R.seed + " -> OUT " + R.expect(R.seed);
```

- [ ] **Step 4: Syntax + trace + full drive**

`node --check` → exit 0. Trace R1 placeholder: `raw = input()` with inputValue "7" → raw "7" → signal 7 → out 15 = expect(7) ✓; reruns feed "2"/"5" via inputval ✓ (same for R2/R3).

Update `C:\Users\Ryan\AppData\Local\Temp\sts-drive\q6-types-full.mjs`: (a) replace the old beat-walk prompts with the Task 1 flow (reuse q5's updated beats list up to the walkthrough), (b) the R1 no-cast check stays `setCode('out = 15')` (expect the same cast message; note the editor content REPLACES the prefill so no input() line remains, which still fails correctly), (c) everything else unchanged. Run it. Expected: same green outputs (T4/T5/R1 failure messages, HUNT true, DEPLOYED true, PAGEERRORS none).

- [ ] **Step 5: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "feat(types): rounds feed through a visible raw = input() (machine-fed inputValue, reruns via input), pairs-first pending pair per round"
```
(Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.)

---

### Task 3: Board layout swap + legend strip

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` (`drawWorkshop` only)

**Interfaces:**
- Consumes: `workshopPairs`, `workshopLegend` (render-only change).

- [ ] **Step 1: Swap positions**

In `drawWorkshop`: the woodworking pegboard block (anchor `const pbx = W * 0.16, pby = H * 0.16`) changes its geometry line to:

```js
  { const pbx = W * 0.19, pby = H * 0.52, pbw = W * 0.15, pbh = H * 0.22; // woodworking pegboard (decor; the IDE may overlap it)
```

The probe board block (anchor `const bw2 = Math.min(330, W * 0.21), bx0 = W * 0.2, by0 = H * 0.5`) changes its geometry line to:

```js
  { const bw2 = Math.min(340, W * 0.2), bx0 = W * 0.16, by0 = H * 0.14, bh2 = H * 0.34;
```

- [ ] **Step 2: Legend strip (no overlap ever)**

Inside the probe board block, replace the log-render + legend lines (anchor `workshopPairs.slice(-9).forEach`) with:

```js
    const reserve = workshopLegend ? 26 : 0;
    const maxLines = Math.max(3, Math.floor((bh2 - 34 - reserve - 8) / 19));
    workshopPairs.slice(-maxLines).forEach((ln, i) => {
      c.fillStyle = ln.includes("HUNT") ? "#ff6b6b" : ln.includes("->") ? "#9fd9ff" : "#ffd43b";
      c.fillText(ln, bx0 + 10, by0 + 42 + i * 19);
    });
    if (workshopLegend) {
      px(c, bx0, by0 + bh2 - reserve - 2, bw2, 2, "#2a3140");
      c.fillStyle = "#ffd43b"; c.font = "bold 12px 'IBM Plex Mono',monospace"; c.fillText("1 = WAIT   2 = MOVE   4 = HUNT", bx0 + 10, by0 + bh2 - 9);
    }
```

- [ ] **Step 3: Syntax + visual verification**

`node --check` → exit 0. Write `C:\Users\Ryan\AppData\Local\Temp\sts-drive\q7-board-layout.mjs` (model on q6): drive to round 1 (IDE open) and screenshot → READ it: the PROBE LOG sits top-left ABOVE the IDE, fully readable, with the pegboard tools lower-left (possibly under the IDE, fine); continue to the HUNT reveal and screenshot → READ it: legend sits in its own strip below the log lines with the divider, zero overlap, red ORDER lines visible. Print PAGEERRORS.

- [ ] **Step 4: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "feat(workshop): probe board to the top-left (never under the IDE), pegboard to decor row, legend gets its own strip"
```
(Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.)

---

## Self-review notes

- Spec coverage: T1 unchanged + T1b recreate (any name/digits, derived expected output) + T2 prefixed clue set w/ one shown caliper line (Task 1); inputValue option + prefill raw = input() + inputval reruns + task prefixes + per-round pairs-first (Task 2); board swap + reserved legend strip w/ computed line cap (Task 3); Tab-skip traces done per task; T3-onward and round rules untouched; no pushes until the controller's final push.
- Placeholder scan: none.
- Type consistency: prompts referenced by drives match Task 1's strings; `inputValue` defined (T2 step 1) before use (T2 step 3); `reserve`/`maxLines` local to the board block.
