# The Shapes of Values (Data Types Lesson) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the craftsman's decipher phase into the campaign's comprehensive data-types and casting lesson: six teaching beats, a slate walkthrough, and rounds that require the cast.

**Architecture:** Three layers. (1) Infrastructure: two new `CONCEPTS` in `curriculum.js`, a new journal section in `journal-data.js`, two friendly error translations in `lesson1.js`. (2) The teaching arc: `WT_TYPES` + `playTypesArc()` in `lesson1.js`, called from `playWorkshop` before the rounds. (3) The rounds rework: `DECIPHER` seeds become raw strings and validators require the cast.

**Tech Stack:** Vanilla JS + Pyodide. Verification: Playwright driver at `C:\Users\Ryan\AppData\Local\Temp\sts-drive` (playwright-core, `{ channel: 'chrome', headless: true }`, server http://localhost:8931 — if down: `python -m http.server 8931 --directory C:\Users\Ryan\critter-forge` in background), plus direct node imports for the data files.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-04-data-types-lesson-design.md`. All copy below is final; land it verbatim. No em dashes in player-facing strings.
- DEV Tab-skip auto-runs `opts.prefill || opts.placeholder`; every ask below passes its own validator that way. T6's input dialog auto-accepts its default in live play; drives handle it via Playwright's dialog event.
- Untouched: implantStep flow, `playImplantHandIn`, `playSignalEpilogue`, HUNT reveal sequence, workshop art, the board rendering contract, existing round rules/pairs/messages (the cast requirement is additive).
- The harness returns typed vars: validators distinguish numbers from strings via JS `typeof` (e.g. `typeof r.vars.signal === "number"`).
- Python stdout facts the validators rely on: `print(type("12"))` → `<class 'str'>`; `print(type(12))` → `<class 'int'>`; `print(7.5 * 2)` → `15.0`; `print(int(7.9))` → `7`.
- Working branch: `master`. Anchors govern, not line numbers (as of commit `5a7a11a`).
- `node --check C:\Users\Ryan\critter-forge\lesson1.js` after every lesson1.js edit.
- Drive conventions: wait on `#pystat` "python ready"; Tab advances dialogue and auto-runs asks; CodeMirror 5 via `document.querySelector('.CodeMirror').CodeMirror.setValue(...)` + click `#run`; `#status` carries validator messages; dialogue is canvas-drawn (use the fillText capture hook from `q3-decipher.mjs` when asserting say() lines); READ every screenshot.

---

### Task 1: Infrastructure — concepts, journal, error translations

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\curriculum.js` (CONCEPTS tail, after the `intdiv` entry)
- Modify: `C:\Users\Ryan\critter-forge\journal-data.js` (append a section to `JOURNAL_SECTIONS`)
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` (`translate()`)

**Interfaces:**
- Produces (Tasks 2-3 rely on): concept ids `"types"` and `"convert"` usable in `ask({ concept })`; journal ids `types` / `convert` (the CONCEPTS `journal:` fields point at them); `translate()` handling ValueError-from-int and str+int TypeErrors.

- [ ] **Step 1: CONCEPTS entries**

In `curriculum.js`, after the `intdiv` entry's closing `},` (anchor `remind: "Use // for whole shares and % for the remainder.",` then `},`), add:

```js
  types: {
    journal: "types", link: "data types",
    teach: "Every value in Python has a SHAPE, called its type. \"12\" in quotes is a str: a string of text marks. 12 bare is an int: a whole number arithmetic works on. 7.5 is a float: a number that carries a point. True is a bool: one of exactly two values. The shape decides what a value can DO: multiply an int and you get arithmetic, multiply a str and the marks just repeat. Hold any value up to type() and it names the shape.",
    remind: "Check the shape with type().",
  },
  convert: {
    journal: "convert", link: "casting",
    teach: "Casting pours a value into a new mold: int(raw) makes a whole number from marks, float(raw) keeps the point, str(out) makes marks from a number. Two laws. The int mold CUTS, it never rounds: int(7.9) is 7. And input() always hands you marks, even when your fingers typed digits, so cast before you calculate.",
    remind: "Cast first: int(raw) before arithmetic.",
  },
```

- [ ] **Step 2: Journal section**

In `journal-data.js`, append this section object as the LAST element of the `JOURNAL_SECTIONS` array (before the array's closing `];`):

```js
  {
    name: "Values",
    entries: [
      {
        id: "types", label: "type()", section: "Values",
        match: /type\s*\(/,
        summary: "Every value has a shape (its type): str, int, float, or bool. type() names it.",
        syntax: "type(value)",
        parts: [["type", "the caliper"], ["( )", "hold any value up to it"], ["value", "what to measure"]],
        usage: ['print(type("12"))', "print(type(12))", "print(type(7.5))"],
        tryCode: 'print(type("12"))',
      },
      {
        id: "convert", label: "int() / float() / str()", section: "Values",
        match: /\b(?:int|float|str)\s*\(/,
        summary: "Casting pours a value into a new mold. The int mold cuts, it never rounds. input() always gives marks, so cast before math.",
        syntax: "int(marks)",
        parts: [["int / float / str", "the mold to pour into"], ["( )", "the crucible"], ["marks", "the value being recast"]],
        usage: ['signal = int("12")', 'volts = float("7.5")', 'label = "OUT " + str(15)'],
        tryCode: 'print(int("12") * 2)',
      },
    ],
  },
```

- [ ] **Step 3: translate() additions**

In `lesson1.js`, `translate()` currently reads (anchor):

```js
function translate(err) {
  const m = err.match(/name '(\w+)' is not defined/);
  if (m) return `Python doesn't know “${m[1]}”. Strings need quotes (e.g. you.walk("tree")) and variables must be set first.`;
  if (err.includes("SyntaxError")) return "SyntaxError: check quotes, colons and indentation.";
```

Add two cases directly after the `if (m)` line (before the SyntaxError line):

```js
  if (err.includes("invalid literal for int()")) return "The int mold only takes whole-number marks. These marks carry a point in them; cast with float() instead.";
  if (err.includes("can only concatenate str") || err.includes("unsupported operand type(s) for +")) return "You mixed bare numbers with marks. Cast the number into marks first: str(out).";
```

- [ ] **Step 4: Verify**

Run: `node --check C:\Users\Ryan\critter-forge\lesson1.js` → exit 0.

Run (from `C:\Users\Ryan\critter-forge`):
```powershell
node --input-type=module -e "import('./curriculum.js').then(m => { if (!m.CONCEPTS.types || !m.CONCEPTS.convert) throw new Error('missing concepts'); console.log('concepts ok'); })"
node --input-type=module -e "import('./journal-data.js').then(m => { const s = m.JOURNAL_SECTIONS.find(x => x.name === 'Values'); if (!s || s.entries.length !== 2) throw new Error('missing Values section'); if (!s.entries[1].match.test('signal = int(raw)')) throw new Error('convert match regex fails'); console.log('journal ok'); })"
```
Expected: `concepts ok` and `journal ok`. (If `curriculum.js` has imports that fail under bare node, verify it instead by loading http://localhost:8931/lesson1.html#1.5 and checking for zero pageerrors in a 10-line Playwright script — the module graph loads it.)

- [ ] **Step 5: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add curriculum.js journal-data.js lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "feat(types): concepts (types, convert), Values journal section, in-character casts of ValueError/TypeError"
```
(Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.)

---

### Task 2: The teaching arc — six beats + the slate walkthrough

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` — add `WT_TYPES` + `playTypesArc()` above `playWorkshop`, and one wiring line inside `playWorkshop`.

**Interfaces:**
- Consumes: Task 1's concept ids + translations; existing `ask`, `say`, `workshopPairs`, `walkthroughsEnabled`, `walkthroughSeen`, `showWalkthrough`, `lastSrc`.
- Produces: `playTypesArc()` (called only from `playWorkshop`); board flavor pushes `IN 12 -> OUT 1212 ??` and `IN 12 -> OUT 24`.

- [ ] **Step 1: Add `WT_TYPES` and `playTypesArc`**

Directly above `async function playWorkshop(name) {` add:

```js
// ---- the Shapes of Values: six beats of data types + casting, before the rounds ----
const WT_TYPES = {
  id: "shapes-of-values", title: "The four shapes, on one slate",
  code: 'marks = "12"\nsignal = int(marks)\nvolts = 7.5\ncut = int(volts)\nlabel = "OUT " + str(cut)\nstrong = signal >= 10',
  steps: [
    { lines: [1], text: "Quotes make a str, a string of text marks. \"12\" is not twelve. It is two marks standing side by side, a one and a two: text wearing a number's face." },
    { lines: [2], text: "Casting. int(marks) pours the marks into the int mold and a true whole number comes out. The parentheses are the crucible: marks go in, a number arithmetic works on comes out." },
    { lines: [3], text: "A bare number carrying a point is a float. It keeps the point forever: half strength is 7.5, and doubling it gives 15.0, point and all." },
    { lines: [4], text: "Pour a float into the int mold and the mold CUTS. cut is 7. int(7.9) is also 7, though it sits a hair from 8. Everything after the point drips off the crucible's edge and is gone. The int mold never rounds." },
    { lines: [5], text: "str() is the mold that runs backward: numbers into marks. You cannot glue marks straight onto a bare number. Cast it first, then + joins marks to marks." },
    { lines: [6], text: "A question is a value too. signal >= 10 comes out True or False and nothing else: a bool, the smallest mold there is. Every decision the machine makes is built from this shape." },
  ],
};
async function playTypesArc() {
  await say("Craftsman", "Before we steal its rules, you should know why I FAILED all night. Look at the board. I cranked twelve into it. It answered one-two-one-two. Garbage.");
  workshopPairs.push("IN 12 -> OUT 1212 ??");
  await say("Craftsman", "And it was not the machine mocking me. It was the wire. A wire cannot hand you a NUMBER, scout. It hands you MARKS. Text. And all night, I was doing arithmetic on text.");
  await ask({
    prompt: "Run the craftsman's failed probe",
    prefill: 'raw = "12"\nprint(raw * 2)', readonly: true, rows: 2,
    concept: "types",
    task: "This is exactly what the craftsman ran all night. Read it before you run it: the quotes around \"12\" matter. Run it and watch what the machine answers.",
    validate: (r) => (r.stdout.trim() === "1212" ? null : "Just press Run; the code is already written."),
  }, null);
  await say("Craftsman", "One-two-one-two. Do you see it now? \"12\" in quotes is not a number. It is a str, a STRING of text marks. Multiply marks and Python politely repeats them. What a value CAN DO is decided by its shape.");
  await say("Craftsman", "That shape has a name: its TYPE. And you never need to guess a value's type. You ask.");
  await ask({
    prompt: "Ask two values their shape",
    placeholder: "print(type(raw))\nprint(type(12))", rows: 2,
    seed: 'raw = "12"',
    concept: "types",
    task: "type() is the craftsman's caliper: hold any value up to it and it names the shape. Print the type of raw, then the type of a bare 12, and compare what comes out.",
    validate: (r) => {
      if (!/type\s*\(/.test(lastSrc)) return "Use the caliper: type(raw) inside a print().";
      if (!r.stdout.includes("'str'")) return "One line must show raw's shape: print(type(raw)).";
      if (!r.stdout.includes("'int'")) return "One line must show a bare number's shape: print(type(12)).";
      return null;
    },
  }, null);
  await say("Craftsman", "class str, class int. Marks, and a whole number. Integer, int for short: the shape arithmetic works on. Now the trick I never knew. The one where you teach ME.");
  await ask({
    prompt: "Cast the marks into a number",
    placeholder: "signal = int(raw)\nprint(signal * 2)", rows: 2,
    seed: 'raw = "12"',
    concept: "convert",
    task: "In this trade we CAST: pour metal into a mold and it takes the mold's shape. int(raw) is Python casting. The parentheses are the crucible: marks go in, a true int comes out. Cast raw into a variable named signal, then print signal * 2.",
    validate: (r) => {
      if (!/int\s*\(/.test(lastSrc)) return "Pour it through the mold: signal = int(raw).";
      if (typeof r.vars.signal !== "number") return "signal is still marks. Cast it: signal = int(raw).";
      if (r.vars.signal !== 12) return "Cast raw itself; do not type your own number.";
      return r.stdout.trim() === "24" ? null : "Now print signal * 2 and let the machine answer with real arithmetic.";
    },
  }, null);
  workshopPairs.push("IN 12 -> OUT 24");
  await say("Craftsman", "TWENTY-FOUR. All night I fought this thing, and you fix it with one cast. The board just logged its first honest pair. We are not done: the wire has more shapes in it.");
  await ask({
    prompt: "A probe with a point in it",
    placeholder: "strength = float(raw)\nprint(strength * 2)", rows: 2,
    seed: 'raw = "7.5"',
    concept: ["convert", "float"],
    task: "He cranks a half-strength probe and the wire hands you \"7.5\". Try int(raw) first if you like; the int mold refuses marks that carry a point. The right mold is float(raw): a float is a number that keeps its point. Cast, then print strength * 2.",
    validate: (r) => {
      if (!/float\s*\(/.test(lastSrc)) return "These marks carry a point. The int mold refuses them; cast with float(raw).";
      if (typeof r.vars.strength !== "number") return "strength should come out a number: strength = float(raw).";
      return r.stdout.includes("15.0") ? null : "Print strength * 2. Watch closely: the answer will carry a point.";
    },
  }, null);
  await say("Craftsman", "Fifteen POINT ZERO. A float never drops its point, even with nothing riding behind it. Now the law every smith learns the hard way. What happens when you pour a float into the int mold?");
  await ask({
    prompt: "Pour a float into the int mold",
    placeholder: "whole = int(strength)\nprint(whole)\nprint(int(7.9))", rows: 3,
    seed: "strength = 7.5",
    concept: "convert",
    task: "Cast strength (it holds 7.5) into the int mold as whole, and print it. Then also print int(7.9), a value sitting a hair from 8. Predict both answers before you run.",
    validate: (r) => {
      if (!/int\s*\(/.test(lastSrc)) return "Use the int mold: whole = int(strength).";
      if (r.vars.whole !== 7) return "whole = int(strength). Let the mold do the cutting.";
      const lines = r.stdout.trim().split(/\n/);
      return lines.length >= 2 && lines[0].trim() === "7" && lines[1].trim() === "7" ? null : "Print whole, then print int(7.9). Two lines, two answers.";
    },
  }, null);
  await say("Craftsman", "Seven. And seven AGAIN, from a value nearly touching eight. The int mold does not round, scout. It CUTS. Everything after the point drips off the edge of the crucible and is gone. If you ever want rounding, you must ask for rounding. The mold gives nothing for free.");
  await ask({
    prompt: "Label the board",
    placeholder: 'out = 15\nlabel = "OUT " + str(out)\nprint(label)', rows: 3,
    concept: "convert",
    task: "The board wants a label that reads OUT 15. Try print(\"OUT \" + out) first if you like: Python refuses to glue marks to a bare number. str(out) is the mold that runs backward, numbers into marks. Build label from \"OUT \" plus str(out), then print it.",
    validate: (r) => {
      if (!/str\s*\(/.test(lastSrc)) return "Cast the number into marks first: str(out).";
      if (typeof r.vars.label !== "string") return 'Store the joined marks: label = "OUT " + str(out).';
      return r.stdout.includes("OUT 15") ? null : "Print the label. It should read: OUT 15";
    },
  }, null);
  await say("Craftsman", "Three molds now. int() for whole numbers, float() for numbers with a point, str() for marks. Any value, any shape, so long as the marks fit the mold. One shape left, and for that one YOU crank.");
  await ask({
    prompt: "Crank your own probe",
    placeholder: 'raw = input("signal to send:")\nsignal = int(raw)\nstrong = signal >= 10\nprint(strong)', rows: 4,
    inputPrompt: "Your hand is on the crank. Send a whole number down the wire:", inputDefault: "14",
    concept: ["convert", "input", "bool"],
    task: "Your turn at the crank. input() asks YOU for the signal, and here is the trap: input() ALWAYS hands back marks, even when your fingers typed digits, because a keyboard makes marks, not numbers. Cast to int, then store the question signal >= 10 in a variable named strong, and print it.",
    validate: (r) => {
      if (!/input\s*\(/.test(lastSrc)) return "Take the crank: raw = input(...).";
      if (!/int\s*\(/.test(lastSrc) || typeof r.vars.signal !== "number") return "input() handed you marks. Cast before you compare: signal = int(raw).";
      if (typeof r.vars.strong !== "boolean") return "Store the question itself: strong = signal >= 10. It comes out True or False.";
      if (r.vars.strong !== (r.vars.signal >= 10)) return "strong must hold exactly the question signal >= 10.";
      return null;
    },
  }, null);
  await say("Craftsman", "And there is the fourth shape: bool. Two values fit that mold, True and False, and nothing else ever will. The machine's whole soul, wait or move or hunt, is questions poured into that smallest mold.");
  if (walkthroughsEnabled() && !walkthroughSeen(WT_TYPES.id)) await showWalkthrough(WT_TYPES);
  await say("Craftsman", "Four shapes. Three molds. One law about the cut. NOW we are fit to steal its rules.");
}
```

- [ ] **Step 2: Wire it into `playWorkshop`**

Inside `playWorkshop`'s else branch, the line (anchor):

```js
    await say("Craftsman", "It still ANSWERS. Look. I crank a signal in, it answers out. Every machine keeps rules between the in and the out. You and I are going to steal them.");
    await runDecipherRounds();
```

becomes:

```js
    await say("Craftsman", "It still ANSWERS. Look. I crank a signal in, it answers out. Every machine keeps rules between the in and the out. You and I are going to steal them.");
    await playTypesArc();
    await runDecipherRounds();
```

- [ ] **Step 3: Syntax + drive**

`node --check C:\Users\Ryan\critter-forge\lesson1.js` → exit 0.

Write `C:\Users\Ryan\AppData\Local\Temp\sts-drive\q5-types-arc.mjs`:

```js
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const shots = 'C:/Users/Ryan/AppData/Local/Temp/sts-drive/shots';
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('dialog', d => d.accept('14')); // T6's input() prompt
await page.goto('http://localhost:8931/lesson1.html#1.5', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => { const ps = document.querySelector('#pystat'); return ps && ps.textContent.includes('python ready'); }, null, { timeout: 120000 });
await page.waitForTimeout(1000);
const promptTxt = () => page.evaluate(() => document.querySelector('#prompt')?.textContent || '');
const untilPrompt = async (s, n = 18) => { for (let i = 0; i < n; i++) { if ((await promptTxt()).includes(s)) return true; await page.keyboard.press('Tab'); await page.waitForTimeout(750); } return (await promptTxt()).includes(s); };
await page.keyboard.press('Tab'); await page.waitForTimeout(1400); // to the knight
if (!(await untilPrompt('Explore the keep'))) throw new Error('hand-in never finished');
await page.evaluate(() => { document.querySelector('.CodeMirror').CodeMirror.setValue('you.walk("craftsman")'); });
await page.click('#run'); await page.waitForTimeout(3000);
// through the arc, prompt by prompt (Tab auto-runs prefill/placeholder)
const beats = ["Run the craftsman's failed probe", 'Ask two values their shape', 'Cast the marks into a number', 'A probe with a point in it', 'Pour a float into the int mold', 'Label the board', 'Crank your own probe'];
for (const b of beats) {
  if (!(await untilPrompt(b, 20))) throw new Error('never reached beat: ' + b);
  if (b === 'Cast the marks into a number') await page.screenshot({ path: `${shots}/q5-1-castbeat.png` });
  await page.keyboard.press('Tab'); await page.waitForTimeout(900);
}
// the slate walkthrough should now appear; step it with the next button
await page.waitForSelector('.wt-next', { timeout: 20000 });
await page.screenshot({ path: `${shots}/q5-2-walkthrough.png` });
for (let i = 0; i < 8; i++) {
  const open = await page.evaluate(() => !!document.querySelector('.wt-next'));
  if (!open) break;
  await page.click('.wt-next'); await page.waitForTimeout(400);
}
// arc done -> the rounds begin
if (!(await untilPrompt('Decipher rule 1', 20))) throw new Error('rounds never started');
await page.screenshot({ path: `${shots}/q5-3-round1.png` });
console.log('ARC COMPLETE, ROUNDS REACHED');
console.log('PAGEERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
```

Run it. Expected: `ARC COMPLETE, ROUNDS REACHED`, `PAGEERRORS: none`. READ the screenshots: (1) the cast beat with the lesson pane teaching casting and the board showing the garbage pair; (2) the slate walkthrough overlay with the six-line code block and arrow; (3) round 1 prompt with `IN 12 -> OUT 24` visible in the PROBE LOG. NOTE: Task 3 has not run yet, so round 1 still uses the old numeric seed; that is expected here.

- [ ] **Step 4: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "feat(types): the Shapes of Values — six-beat casting arc in the workshop (stutter, type(), first cast, float + the cut, str(), input+bool) + slate walkthrough"
```
(Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.)

---

### Task 3: Rounds require the cast + full end-to-end verification

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` — the `DECIPHER` array and `runDecipherRounds`' ask/validator.

**Interfaces:**
- Consumes: Task 2's arc (runs before the rounds), Task 1's translations, existing `runUser`, `lastSrc`, `translate`.
- Produces: nothing new; `implantStep = 3` flow unchanged.

- [ ] **Step 1: Rework the round data**

In the `DECIPHER` array, make exactly these changes to each of the three entries (rules, pairs, expects, reruns, intros, and failure messages stay as they are):

1. Add a line to the START of each `task` string: `R1`: `"The wire hands you marks: raw holds \"7\". Cast before you calculate. "` + existing text; `R2`: `"The wire hands you marks: raw holds \"12\". Cast first. "` + existing; `R3`: `"The wire hands you marks: raw holds \"20\". Cast first. "` + existing. (Prepend within the same string; keep the rest verbatim.)
2. Placeholders gain the cast as their first line and `rows` grows by 1:
   - R1: `placeholder: "signal = int(raw)\nout = signal * 2 + 1", rows: 2` and `concept: "convert"` (was "variable").
   - R2: `placeholder: "signal = int(raw)\nif signal < 10:\n    out = 0\nelse:\n    out = signal - 10", rows: 5` (concept stays "if").
   - R3: `placeholder: "signal = int(raw)\nif signal < 10:\n    out = signal + 1\nelse:\n    out = signal * 2", rows: 5` (concept stays "if").

- [ ] **Step 2: Seed as marks + cast check in the validator**

In `runDecipherRounds`, the ask's seed (anchor `seed: "signal = " + R.seed`) becomes:

```js
      seed: 'raw = "' + R.seed + '"',
```

The validator gains a FIRST check, inserted before the existing `needsElse` checks:

```js
        if (!/int\s*\(/.test(lastSrc) || typeof r.vars.signal !== "number") return "The wire gave you marks, not a number. Cast before you calculate: signal = int(raw).";
```

And both rerun seeds change from numbers to marks (anchor `runUser(lastSrc, "signal = " + h, "")`):

```js
          try { rr2 = JSON.parse(runUser(lastSrc, 'raw = "' + h + '"', "")); } catch (e) { return "Something broke re-running your steps. Try again."; }
```

- [ ] **Step 3: Syntax + full end-to-end drive**

`node --check C:\Users\Ryan\critter-forge\lesson1.js` → exit 0.

Write `C:\Users\Ryan\AppData\Local\Temp\sts-drive\q6-types-full.mjs`:

```js
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const shots = 'C:/Users/Ryan/AppData/Local/Temp/sts-drive/shots';
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = []; const said = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('dialog', d => d.accept('14'));
await page.goto('http://localhost:8931/lesson1.html#1.5', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => { const ps = document.querySelector('#pystat'); return ps && ps.textContent.includes('python ready'); }, null, { timeout: 120000 });
await page.evaluate(() => { const orig = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function(t, ...a) { window.__texts = window.__texts || []; window.__texts.push(String(t)); if (window.__texts.length > 4000) window.__texts.shift(); return orig.call(this, t, ...a); }; });
const sawText = (s) => page.evaluate((s) => (window.__texts || []).some(t => t.includes(s)), s);
await page.waitForTimeout(1000);
const setCode = async (code) => page.evaluate((code) => { document.querySelector('.CodeMirror').CodeMirror.setValue(code); }, code);
const status = () => page.evaluate(() => document.querySelector('#status')?.textContent || '');
const promptTxt = () => page.evaluate(() => document.querySelector('#prompt')?.textContent || '');
const untilPrompt = async (s, n = 22) => { for (let i = 0; i < n; i++) { if ((await promptTxt()).includes(s)) return true; await page.keyboard.press('Tab'); await page.waitForTimeout(750); } return (await promptTxt()).includes(s); };
await page.keyboard.press('Tab'); await page.waitForTimeout(1400);
if (!(await untilPrompt('Explore the keep'))) throw new Error('hand-in never finished');
await setCode('you.walk("craftsman")'); await page.click('#run'); await page.waitForTimeout(3000);
// failure-path spot checks inside the arc
if (!(await untilPrompt("Run the craftsman's failed probe", 20))) throw new Error('arc never started');
await page.keyboard.press('Tab'); await page.waitForTimeout(900); // T1
if (!(await untilPrompt('Ask two values', 10))) throw new Error('T2 unreachable');
await page.keyboard.press('Tab'); await page.waitForTimeout(900); // T2
if (!(await untilPrompt('Cast the marks', 10))) throw new Error('T3 unreachable');
await page.keyboard.press('Tab'); await page.waitForTimeout(900); // T3
if (!(await untilPrompt('A probe with a point', 10))) throw new Error('T4 unreachable');
await setCode('strength = int(raw)\nprint(strength * 2)'); await page.click('#run'); await page.waitForTimeout(900);
console.log('T4 NAIVE INT (expect float-mold message):', await status());
await page.keyboard.press('Tab'); await page.waitForTimeout(900); // correct T4a via placeholder
if (!(await untilPrompt('Pour a float', 10))) throw new Error('T4b unreachable');
await page.keyboard.press('Tab'); await page.waitForTimeout(900);
if (!(await untilPrompt('Label the board', 10))) throw new Error('T5 unreachable');
await setCode('out = 15\nprint("OUT " + out)'); await page.click('#run'); await page.waitForTimeout(900);
console.log('T5 NAIVE GLUE (expect str-cast message):', await status());
await page.keyboard.press('Tab'); await page.waitForTimeout(900);
if (!(await untilPrompt('Crank your own probe', 10))) throw new Error('T6 unreachable');
await page.keyboard.press('Tab'); await page.waitForTimeout(1200);
await page.waitForSelector('.wt-next', { timeout: 20000 });
for (let i = 0; i < 8; i++) { const open = await page.evaluate(() => !!document.querySelector('.wt-next')); if (!open) break; await page.click('.wt-next'); await page.waitForTimeout(400); }
// the rounds, now demanding the cast
if (!(await untilPrompt('Decipher rule 1', 20))) throw new Error('rounds never started');
await setCode('out = 15'); await page.click('#run'); await page.waitForTimeout(900);
console.log('R1 NO-CAST (expect cast message):', await status());
await page.keyboard.press('Tab'); await page.waitForTimeout(1000); // placeholder solves R1
if (!(await untilPrompt('Decipher rule 2', 12))) throw new Error('R2 unreachable');
await page.keyboard.press('Tab'); await page.waitForTimeout(1000);
if (!(await untilPrompt('Decipher rule 3', 12))) throw new Error('R3 unreachable');
await page.keyboard.press('Tab'); await page.waitForTimeout(1000);
for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(800); }
await page.screenshot({ path: `${shots}/q6-1-hunt.png` });
console.log('HUNT ON BOARD:', await sawText('HUNT'));
if (!(await untilPrompt('Explore the keep', 14))) throw new Error('never left the workshop');
await page.keyboard.press('Tab'); await page.waitForTimeout(1400); // to the knight (epilogue)
let deployed = false;
for (let i = 0; i < 12; i++) { if (await sawText('DEPLOYED')) { deployed = true; break; } await page.keyboard.press('Tab'); await page.waitForTimeout(700); }
console.log('EPILOGUE DEPLOYED:', deployed);
console.log('PAGEERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
```

Run it. Expected output:
- `T4 NAIVE INT:` message containing "cast with float() instead" (the translated ValueError)
- `T5 NAIVE GLUE:` message containing "Cast the number into marks first"
- `R1 NO-CAST:` message containing "Cast before you calculate"
- `HUNT ON BOARD: true`, `EPILOGUE DEPLOYED: true`, `PAGEERRORS: none`
READ `q6-1-hunt.png`: legend + red ORDER 4 HUNT lines still render.

- [ ] **Step 4: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "feat(types): decipher rounds deliver marks — every round now demands the cast (signal = int(raw)) with in-character coaching"
```
(Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.)

---

## Self-review notes

- Spec coverage: T1 stutter + garbage board pair (Task 2), T2 type() caliper (T2), T3 first cast + casting definition + clean pair (T2), T4 float + ValueError invite + THE CUT with int(7.9) (T2), T5 str() + TypeError invite (T2), T6 input()+bool live probe (T2), slate walkthrough (T2), rounds-as-marks + cast checks (Task 3), CONCEPTS/journal/translate (Task 1), Tab-skip safety (every placeholder traced against its validator), XP defaults untouched, implantStep/HUNT/epilogue untouched.
- Placeholder-vs-validator traces: T1 prefill prints 1212 ✓; T2 prints both classes ✓; T3 signal=12 number, stdout 24 ✓; T4a float, 15.0 ✓; T4b whole=7, two 7-lines ✓; T5 str used, label string, OUT 15 ✓; T6 input+int+bool+relation ✓ (accepts default 14 → True); R1-R3 placeholders cast then solve, pass seed + reruns ✓.
- Type consistency: `playTypesArc`, `WT_TYPES` defined in Task 2, wired in Task 2; Task 3 touches only DECIPHER/runDecipherRounds; concept ids `types`/`convert` created in Task 1, consumed in Task 2/3.
- Em-dash scan of all copy above: clean.
