# Command Journal Book Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the Lesson 1 right rail into a plain Command Log plus a new clickable parchment "Command Journal" book whose entries unlock the first time each command is used and open an in-depth, runnable explanation.

**Architecture:** A pure, node-testable data+logic module (`journal-data.js`) holds the command catalog, the line→unlock matcher, and a persistence store. A browser-only controller (`journal.js`) renders the two-page parchment overlay, handles open/close, the unlock toast, and an isolated Pyodide "Try it" sandbox. `lesson1.html` gains the floating book icon, overlay markup, and CSS; `lesson1.js` gains three small hooks and drops the old "places you can walk" list.

**Tech Stack:** Vanilla ES modules (browser), Pyodide v0.26.4, Node 24 (ESM syntax detection) for `*-verify.mjs` tests. No build step, no package.json.

## Global Constraints

- No build step; files are loaded directly by the browser. `lesson1.js` is `<script type="module">`; new modules use `export`/`import`.
- Tests are standalone Node scripts named `*-verify.mjs`, run with `node journal-verify.mjs`, importing the `.js` modules under test. Match the existing `tower-verify.mjs` style.
- The project is **not** a git repository. There are no commit steps; each task closes by running its verifier (logic tasks) or by manual in-browser verification (UI tasks, because rAF animation/Pyodide do not advance under Chrome headless — documented project limitation).
- One catalog entry **per concept**, never per usage.
- The Try-it sandbox must run in an isolated Pyodide namespace and must never read or mutate lesson state or validation.
- Persistence key: `localStorage["cf_journal_unlocked"]` (JSON array of entry ids).
- Section order is fixed: **Output, Movement, Math & variables, Control flow.**
- Parchment skin palette (reuse the in-game note paper): page `#efe4c6`, right page `#f3ead0`, ink `#2a2113`, section label `#6b5524`, code box `#e3d6b0`/border `#c9b98a`, run button bg `#2a2113` text `#efe4c6`.

---

### Task 1: Command catalog + line→unlock matcher

**Files:**
- Create: `journal-data.js`
- Test: `journal-verify.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export const JOURNAL_SECTIONS` — ordered array of `{ name, entries }`, where each entry is `{ id, label, section, match (RegExp), summary, syntax, parts ([token, desc][]), usage (string[]), tryCode (string) }`.
  - `export function allEntries()` → flat `entry[]` in section order.
  - `export function findUnlocks(line)` → `string[]` of entry ids whose `match` tests true against `line` (deduped, in `allEntries` order).

- [ ] **Step 1: Write the failing test**

Create `journal-verify.mjs`:

```js
// journal-verify.mjs — catalog integrity + matcher disambiguation for the
// Command Journal. Run: node journal-verify.mjs
import { JOURNAL_SECTIONS, allEntries, findUnlocks } from "./journal-data.js";

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log("FAIL:", msg); fails++; } };
const eqSet = (got, want, msg) =>
  ok(got.length === want.length && want.every((w) => got.includes(w)),
     `${msg} — got [${got}] want [${want}]`);

// --- catalog integrity ---
const order = JOURNAL_SECTIONS.map((s) => s.name);
eqSet(order, ["Output", "Movement", "Math & variables", "Control flow"], "section names present");
ok(JSON.stringify(order) === JSON.stringify(["Output","Movement","Math & variables","Control flow"]),
   "section order is fixed");

const entries = allEntries();
const ids = entries.map((e) => e.id);
ok(new Set(ids).size === ids.length, "entry ids are unique");
for (const e of entries) {
  ok(e.id && e.label && e.section, `entry ${e.id} has id/label/section`);
  ok(e.match instanceof RegExp, `entry ${e.id} has RegExp match`);
  ok(typeof e.summary === "string" && e.summary.length > 0, `entry ${e.id} has summary`);
  ok(typeof e.syntax === "string" && e.syntax.length > 0, `entry ${e.id} has syntax`);
  ok(Array.isArray(e.parts) && e.parts.length > 0, `entry ${e.id} has parts`);
  ok(Array.isArray(e.usage) && e.usage.length > 0, `entry ${e.id} has usage`);
  ok(typeof e.tryCode === "string" && e.tryCode.length > 0, `entry ${e.id} has tryCode`);
}

// --- matcher disambiguation (the bug-prone part) ---
eqSet(findUnlocks('print("Hello")'), ["print"], "print string");
eqSet(findUnlocks("print(gold)"), ["print"], "print var (no =)");
eqSet(findUnlocks('you.walk("tree")'), ["you.walk"], "walk");
eqSet(findUnlocks("bow.fire()"), ["bow.fire"], "fire");
eqSet(findUnlocks("you.wake_up()"), ["you.wake_up"], "wake_up");
eqSet(findUnlocks("gold = 2.55"), ["variables"], "assignment only");
eqSet(findUnlocks("sticks = sticks + 10"), ["variables", "plus"], "add");
eqSet(findUnlocks("string = string - 3"), ["variables", "minus"], "sub");
eqSet(findUnlocks("reward = arrows * coins"), ["variables", "times"], "mul");
eqSet(findUnlocks("chips = change / 2"), ["variables", "divide"], "div (single slash)");
eqSet(findUnlocks("pieces = reward // price"), ["variables", "floordiv"], "floor div (no plain divide)");
eqSet(findUnlocks("change = reward % price"), ["variables", "modulo"], "modulo");
eqSet(findUnlocks("gold += 1.75"), ["plusassign"], "plus-assign only (not + or =)");
eqSet(findUnlocks("for i in range(4):"), ["for"], "for loop");
eqSet(findUnlocks('if secret == "x":'), ["ifelse", "equals"], "if + equals");
eqSet(findUnlocks("secret_string == watchword"), ["equals"], "equals only");
eqSet(findUnlocks("secret = input()"), ["variables", "input"], "input + assignment");

console.log(fails === 0 ? "\nALL JOURNAL CHECKS OK" : `\n${fails} FAILURES`);
process.exit(fails ? 1 : 0);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node journal-verify.mjs`
Expected: FAIL — `Cannot find module ./journal-data.js` (or similar load error).

- [ ] **Step 3: Write `journal-data.js`**

Create `journal-data.js`. The matchers are written to disambiguate look-alikes:
`=` excludes `==`/`+=`/`//`-adjacent; `+`/`-`/`*` exclude their `op=` forms; `/` excludes `//`; `//` matches only the double slash.

```js
// journal-data.js — Command Journal catalog + pure unlock matcher.
// No DOM, no Pyodide — safe to import from Node tests.

export const JOURNAL_SECTIONS = [
  {
    name: "Output",
    entries: [
      {
        id: "print", label: "print()", section: "Output",
        match: /print\s*\(/,
        summary: "Shows a message on screen — your character speaks it aloud.",
        syntax: "print(value)",
        parts: [
          ["print", "the command"],
          ["( )", "hold what to show"],
          ["value", 'text in "quotes", or a variable'],
        ],
        usage: ['print("Hello")', "print(gold)", 'print("HP:", hp)'],
        tryCode: 'print("test")',
      },
    ],
  },
  {
    name: "Movement",
    entries: [
      {
        id: "you.wake_up", label: "you.wake_up()", section: "Movement",
        match: /you\.wake_up\s*\(/,
        summary: "Your character stirs awake at the start of the story.",
        syntax: "you.wake_up()",
        parts: [["you", "your character"], [".wake_up()", "the action to perform"]],
        usage: ["you.wake_up()"],
        tryCode: "you.wake_up()",
      },
      {
        id: "you.walk", label: "you.walk()", section: "Movement",
        match: /you\.walk\s*\(/,
        summary: "Walk your character to a named place in the world.",
        syntax: 'you.walk("place")',
        parts: [
          ["you", "your character"],
          [".walk( )", "the action; what's inside is where to go"],
          ['"place"', "the destination name, in quotes"],
        ],
        usage: ['you.walk("tree")', 'you.walk("bridge")', 'you.walk("keep")'],
        tryCode: 'you.walk("tree")',
      },
      {
        id: "bow.fire", label: "bow.fire()", section: "Movement",
        match: /bow\.fire\s*\(/,
        summary: "Loose an arrow at the nearest enemy.",
        syntax: "bow.fire()",
        parts: [["bow", "your equipped bow"], [".fire()", "the action to perform"]],
        usage: ["bow.fire()", "for i in range(4):\n    bow.fire()"],
        tryCode: "bow.fire()",
      },
    ],
  },
  {
    name: "Math & variables",
    entries: [
      {
        id: "variables", label: "variables  ( = )", section: "Math & variables",
        match: /(^|[^=!<>+\-*/%])=(?!=)/,
        summary: "A variable is a labelled box that remembers a value for later.",
        syntax: "name = value",
        parts: [
          ["name", "the label you choose"],
          ["=", "put the value into the box"],
          ["value", "a number, text, or another variable"],
        ],
        usage: ["sticks = 10", "gold = 2.55", "name = hero"],
        tryCode: "sticks = 10\nprint(sticks)",
      },
      {
        id: "plus", label: "+  add", section: "Math & variables",
        match: /[\w)\]"']\s*\+(?!=)/,
        summary: "Adds two numbers together (or joins two pieces of text).",
        syntax: "a + b",
        parts: [["a", "first value"], ["+", "add them"], ["b", "second value"]],
        usage: ["sticks = sticks + 10", "total = 3 + 4"],
        tryCode: "print(3 + 4)",
      },
      {
        id: "minus", label: "−  subtract", section: "Math & variables",
        match: /[\w)\]"']\s*-(?![=>])/,
        summary: "Subtracts the second number from the first.",
        syntax: "a - b",
        parts: [["a", "start value"], ["-", "take away"], ["b", "amount to remove"]],
        usage: ["string = string - 3", "left = 10 - 6"],
        tryCode: "print(10 - 6)",
      },
      {
        id: "times", label: "*  multiply", section: "Math & variables",
        match: /[\w)\]"']\s*\*(?!=)/,
        summary: "Multiplies two numbers.",
        syntax: "a * b",
        parts: [["a", "first value"], ["*", "multiply"], ["b", "second value"]],
        usage: ["reward = arrows * coins", "area = w * h"],
        tryCode: "print(6 * 7)",
      },
      {
        id: "divide", label: "/  divide", section: "Math & variables",
        match: /(?<!\/)\/(?!\/)/,
        summary: "Divides the first number by the second (gives a decimal).",
        syntax: "a / b",
        parts: [["a", "the total"], ["/", "split it"], ["b", "into this many parts"]],
        usage: ["chips = change / 2", "half = 10 / 4"],
        tryCode: "print(10 / 4)",
      },
      {
        id: "floordiv", label: "//  floor divide", section: "Math & variables",
        match: /\/\//,
        summary: "Divides and throws away the remainder — a whole-number result.",
        syntax: "a // b",
        parts: [["a", "the total"], ["//", "split into whole groups"], ["b", "group size"]],
        usage: ["pieces = reward // price"],
        tryCode: "print(7 // 2)",
      },
      {
        id: "modulo", label: "%  remainder", section: "Math & variables",
        match: /%(?!=)/,
        summary: "Gives what's left over after dividing.",
        syntax: "a % b",
        parts: [["a", "the total"], ["%", "the leftover after grouping"], ["b", "group size"]],
        usage: ["change = reward % price"],
        tryCode: "print(7 % 2)",
      },
      {
        id: "plusassign", label: "+=  add to", section: "Math & variables",
        match: /\+=/,
        summary: "Shorthand: add a value straight into an existing variable.",
        syntax: "name += value",
        parts: [["name", "the variable to grow"], ["+=", "add this much to it"], ["value", "how much"]],
        usage: ["gold += 1.75", "score += 1"],
        tryCode: "gold = 2\ngold += 1.75\nprint(gold)",
      },
    ],
  },
  {
    name: "Control flow",
    entries: [
      {
        id: "ifelse", label: "if / else", section: "Control flow",
        match: /\b(if|elif|else)\b/,
        summary: "Make a choice: run one block when a condition is true, another when false.",
        syntax: "if condition:\n    ...\nelse:\n    ...",
        parts: [
          ["if", "test a condition"],
          ["condition:", "the question being asked"],
          ["else:", "what to do when it's false"],
        ],
        usage: ['if gold > 5:\n    print("rich")', 'if word == "ironwatch":\n    pass\nelse:\n    print("no")'],
        tryCode: 'gold = 6\nif gold > 5:\n    print("rich")\nelse:\n    print("poor")',
      },
      {
        id: "equals", label: "==  is equal to", section: "Control flow",
        match: /==/,
        summary: "Checks whether two values are equal. Works on numbers and words.",
        syntax: "a == b",
        parts: [["a", "first value"], ["==", "are they the same?"], ["b", "second value"]],
        usage: ['word == "ironwatch"', "hp == 0"],
        tryCode: 'print("a" == "a")',
      },
      {
        id: "for", label: "for loop", section: "Control flow",
        match: /\bfor\b/,
        summary: "Repeat the same action a set number of times.",
        syntax: "for i in range(n):\n    ...",
        parts: [
          ["for i", "a counter that steps each pass"],
          ["range(n)", "how many times to repeat"],
          [":", "the indented block below repeats"],
        ],
        usage: ["for i in range(4):\n    bow.fire()"],
        tryCode: 'for i in range(3):\n    print("shot", i)',
      },
      {
        id: "input", label: "input()", section: "Control flow",
        match: /input\s*\(/,
        summary: "The program asks YOU a question — what you type becomes a value.",
        syntax: "name = input()",
        parts: [["input()", "pops up a box and waits for you"], ["name =", "stores what you typed"]],
        usage: ["secret = input()"],
        tryCode: 'print("(input is interactive — try it in the lesson)")',
      },
    ],
  },
];

export function allEntries() {
  return JOURNAL_SECTIONS.flatMap((s) => s.entries);
}

export function findUnlocks(line) {
  const out = [];
  for (const e of allEntries()) if (e.match.test(line)) out.push(e.id);
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node journal-verify.mjs`
Expected: `ALL JOURNAL CHECKS OK` and exit 0. If a matcher case fails, fix the offending regex in `journal-data.js` (do not loosen the test) and re-run.

---

### Task 2: Unlock store with persistence

**Files:**
- Modify: `journal-data.js` (append the store factory)
- Test: `journal-verify.mjs` (append store tests)

**Interfaces:**
- Consumes: `allEntries` (Task 1).
- Produces:
  - `export function createJournalStore(storage, key = "cf_journal_unlocked")` → object:
    - `has(id)` → boolean
    - `unlock(id)` → boolean (`true` only the first time an id transitions locked→unlocked)
    - `unlocked()` → `string[]` (insertion order, deduped)
    - `load()` → reads `storage.getItem(key)` JSON array into the set
    - `save()` → writes the current set as JSON to `storage.setItem(key, …)`
  - `storage` is any object with `getItem(key)`/`setItem(key, val)` (browser `localStorage` or a fake in tests).

- [ ] **Step 1: Write the failing test (append to `journal-verify.mjs`)**

Add the import to the existing top-of-file import line so it reads:

```js
import { JOURNAL_SECTIONS, allEntries, findUnlocks, createJournalStore } from "./journal-data.js";
```

Then append, just before the final `console.log(fails === 0 …)` line:

```js
// --- unlock store ---
function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), _m: m };
}
const st = fakeStorage();
const store = createJournalStore(st);
ok(store.has("print") === false, "starts locked");
ok(store.unlock("print") === true, "first unlock returns true");
ok(store.unlock("print") === false, "second unlock returns false");
ok(store.has("print") === true, "now unlocked");
store.unlock("for");
store.save();
const store2 = createJournalStore(st);
store2.load();
eqSet(store2.unlocked(), ["print", "for"], "persists + reloads");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node journal-verify.mjs`
Expected: FAIL — `createJournalStore is not a function`.

- [ ] **Step 3: Append the store factory to `journal-data.js`**

```js
export function createJournalStore(storage, key = "cf_journal_unlocked") {
  const set = new Set();
  return {
    has: (id) => set.has(id),
    unlock(id) {
      if (set.has(id)) return false;
      set.add(id);
      this.save();
      return true;
    },
    unlocked: () => [...set],
    load() {
      try {
        const raw = storage.getItem(key);
        if (raw) for (const id of JSON.parse(raw)) set.add(id);
      } catch (_) { /* corrupt/empty store → start fresh */ }
    },
    save() {
      try { storage.setItem(key, JSON.stringify([...set])); } catch (_) { /* storage unavailable */ }
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node journal-verify.mjs`
Expected: `ALL JOURNAL CHECKS OK`, exit 0.

---

### Task 3: Book overlay UI — markup, CSS, icon, render, open/close, toast

**Files:**
- Modify: `lesson1.html` (add icon button, overlay, toast, CSS; relabel rail; remove `#locations`)
- Create: `journal.js`

**Interfaces:**
- Consumes: `JOURNAL_SECTIONS`, `allEntries`, `findUnlocks`, `createJournalStore` (Tasks 1–2).
- Produces (on `window.Journal`):
  - `Journal.init({ pyodide })` — caches DOM, loads the store, renders, wires open/close. `pyodide` may be `null` at first and set later via `Journal.setPyodide(py)` (used by Task 4).
  - `Journal.open()` / `Journal.close()`
  - `Journal.noticeLine(line)` — unlock matches, toast + re-render on any new unlock.
  - `Journal.has(id)`
  - `Journal.setPyodide(py)` — placeholder in this task; the sandbox lands in Task 4.

- [ ] **Step 1: Add CSS to `lesson1.html`**

Inside `<style>`, after the DEV bar rules (`.devbtn:hover {…}`), add:

```css
/* Command Journal book */
#journalIcon { position:absolute; top:54px; right:10px; width:40px; height:46px; z-index:30;
  background:linear-gradient(135deg,#5a4420,#3a2c14); border:1px solid #7a5e2a;
  border-radius:4px 7px 7px 4px; box-shadow:inset 4px 0 0 #2a1f0e, 0 4px 12px #0009;
  cursor:pointer; color:#ffe066; font-size:20px; display:flex; align-items:center; justify-content:center; }
#journalIcon:hover { filter:brightness(1.15); }
#journalIcon .pip { position:absolute; top:-5px; right:-5px; width:12px; height:12px; border-radius:50%;
  background:#62d27a; border:2px solid #0a1018; display:none; }
#journalIcon.has-new .pip { display:block; }
.jbook-back { position:absolute; inset:0; background:#04070ccc; z-index:45;
  display:flex; align-items:center; justify-content:center; }
.jbook-back[hidden] { display:none; }
.jbook { display:flex; width:min(94%,760px); height:min(90%,440px); border-radius:8px; overflow:hidden;
  box-shadow:0 16px 50px #000c; font-size:13px; line-height:1.5; }
.jbook-l { width:38%; padding:16px 14px; background:#efe4c6; color:#2a2113; overflow-y:auto; }
.jbook-r { width:62%; padding:16px 18px; background:#f3ead0; color:#2a2113; border-left:2px solid #c9b98a; overflow-y:auto; }
.jbook .head { font-family:"Chakra Petch",sans-serif; font-size:14px; letter-spacing:1px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; }
.jbook .sec { color:#6b5524; font-weight:700; letter-spacing:.5px; text-transform:uppercase; font-size:10px; margin:12px 0 4px; }
.jbook .cmd { padding:3px 6px; border-radius:4px; cursor:pointer; }
.jbook .cmd:hover { background:#e3d6b0; }
.jbook .cmd.on { background:#d8c896; }
.jbook .cmd.lock { color:#a89a6e; cursor:default; }
.jbook .cmd.lock:hover { background:transparent; }
.jbook .ttl { font-family:"Chakra Petch",sans-serif; font-size:18px; font-weight:700; }
.jbook .lbl { font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#6b5524; margin:11px 0 3px; }
.jbook .code { background:#e3d6b0; border:1px solid #c9b98a; border-radius:5px; padding:7px 9px;
  color:#3a2e12; font-family:"IBM Plex Mono",monospace; white-space:pre-wrap; }
.jbook textarea.try { width:100%; background:#e3d6b0; border:1px solid #c9b98a; border-radius:5px;
  padding:7px 9px; color:#3a2e12; font-family:"IBM Plex Mono",monospace; font-size:13px; resize:vertical; }
.jbook .runbtn { background:#2a2113; color:#efe4c6; border:0; border-radius:5px; padding:6px 14px;
  margin-top:7px; cursor:pointer; font-family:"Chakra Petch",sans-serif; letter-spacing:1px; }
.jbook .out { margin-top:7px; white-space:pre-wrap; font-family:"IBM Plex Mono",monospace; font-size:12.5px; min-height:8px; }
.jbook .out.err { color:#9c2b2b; }
.jbook .x { background:#2a2113; color:#efe4c6; border:0; border-radius:5px; width:24px; height:24px; cursor:pointer; }
.jbook .empty { color:#8a7c52; font-style:italic; }
#journalToast { position:absolute; top:108px; right:10px; z-index:50; background:#2a2113; color:#ffe066;
  border:1px solid #7a5e2a; border-radius:8px; padding:7px 11px; font-size:12px; box-shadow:0 6px 18px #0009;
  opacity:0; transform:translateY(-6px); transition:opacity .25s, transform .25s; pointer-events:none; }
#journalToast.show { opacity:1; transform:none; }
```

- [ ] **Step 2: Add markup to `lesson1.html`**

Inside `<div class="stagewrap">`, after the `#noteModal` block and before the closing `</div>` of `stagewrap`, add:

```html
<button id="journalIcon" title="Command Journal">📖<span class="pip"></span></button>
<div id="journalToast"></div>
<div id="journalBook" class="jbook-back" hidden>
  <div class="jbook">
    <div class="jbook-l">
      <div class="head"><span>📖 Command Journal</span></div>
      <div id="jbookList"></div>
    </div>
    <div class="jbook-r" id="jbookDetail"></div>
  </div>
</div>
```

- [ ] **Step 3: Relabel the rail and remove the locations list in `lesson1.html`**

Replace the `.journal` panel body. Change:

```html
<div class="journal">
  <h3>⟡ Command Journal</h3>
  <div class="sub">Places you can walk</div>
  <div id="locations"></div>
  <div class="sub">Commands run</div>
  <div id="log"></div>
</div>
```

to:

```html
<div class="journal">
  <h3>⟡ Command Log</h3>
  <div id="log"></div>
</div>
```

- [ ] **Step 4: Create `journal.js` (render + open/close + toast; sandbox stubbed)**

```js
// journal.js — Command Journal book UI (browser only).
import { JOURNAL_SECTIONS, allEntries, findUnlocks, createJournalStore } from "./journal-data.js";

const el = {};
let store, pyodide = null, selectedId = null, toastTimer = null;

function cacheDom() {
  for (const id of ["journalIcon", "journalBook", "jbookList", "jbookDetail", "journalToast"])
    el[id] = document.getElementById(id);
}

function renderList() {
  let html = "";
  let anyNew = false;
  for (const sec of JOURNAL_SECTIONS) {
    html += `<div class="sec">${sec.name}</div>`;
    for (const e of sec.entries) {
      const unlocked = store.has(e.id);
      if (!unlocked) { html += `<div class="cmd lock">🔒 ${e.label}</div>`; continue; }
      const on = e.id === selectedId ? " on" : "";
      html += `<div class="cmd${on}" data-id="${e.id}">${e.label}</div>`;
    }
  }
  el.jbookList.innerHTML = html;
  el.jbookList.querySelectorAll(".cmd[data-id]").forEach((node) =>
    node.addEventListener("click", () => { selectedId = node.dataset.id; renderList(); renderDetail(); }));
}

function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

function renderDetail() {
  const e = allEntries().find((x) => x.id === selectedId);
  if (!e) { el.jbookDetail.innerHTML = `<p class="empty">Use a command in the game, then click it here to learn how it works.</p>`; return; }
  const parts = e.parts.map(([t, d]) => `• <b>${esc(t)}</b> — ${esc(d)}`).join("<br>");
  const usage = e.usage.map(esc).join("\n");
  el.jbookDetail.innerHTML =
    `<div class="ttl">${esc(e.label)}</div>` +
    `<div>${esc(e.summary)}</div>` +
    `<div class="lbl">Syntax</div><div class="code">${esc(e.syntax)}</div>` +
    `<div class="lbl">The parts</div><div>${parts}</div>` +
    `<div class="lbl">Ways to use it</div><div class="code">${usage}</div>` +
    `<div class="lbl">Try it yourself</div>` +
    `<textarea class="try" rows="3" spellcheck="false">${esc(e.tryCode)}</textarea>` +
    `<button class="runbtn" id="jTryRun">▸ Run</button>` +
    `<div class="out" id="jTryOut"></div>`;
  // Sandbox wiring is added in Task 4.
  if (window.Journal && window.Journal._wireTryRun) window.Journal._wireTryRun();
}

function toast(label) {
  el.journalToast.textContent = `📖 New entry: ${label}`;
  el.journalToast.classList.add("show");
  el.journalIcon.classList.add("has-new");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.journalToast.classList.remove("show"), 2000);
}

window.Journal = {
  init({ pyodide: py } = {}) {
    cacheDom();
    pyodide = py || null;
    store = createJournalStore(window.localStorage);
    store.load();
    selectedId = store.unlocked()[0] || null;
    renderList(); renderDetail();
    el.journalIcon.addEventListener("click", () => this.open());
    el.journalBook.addEventListener("click", (ev) => { if (ev.target === el.journalBook) this.close(); });
  },
  setPyodide(py) { pyodide = py; },
  _getPyodide() { return pyodide; },
  has: (id) => store.has(id),
  open() { el.journalIcon.classList.remove("has-new"); el.journalBook.hidden = false; renderList(); renderDetail(); },
  close() { el.journalBook.hidden = true; },
  noticeLine(line) {
    if (!store) return; // init() may not have run yet (play() logs before Pyodide loads)
    for (const id of findUnlocks(line)) {
      if (store.unlock(id)) {
        const e = allEntries().find((x) => x.id === id);
        toast(e.label);
        if (!selectedId) selectedId = id;
        if (!el.journalBook.hidden) renderList();
      }
    }
  },
};
```

- [ ] **Step 5: Manual browser verification**

Start the server if not running: `python -m http.server 8000` (from the project dir), then open `http://localhost:8000/lesson1.html#keep` in a real browser (not headless — rAF/Pyodide need a live browser).

Verify:
1. A parchment **book icon** sits on the top-right of the canvas; the right rail now reads **⟡ Command Log** with no "Places you can walk" list.
2. Use the DEV **skip (Tab)** through a couple of steps so commands hit the log; a **toast** ("📖 New entry: …") flashes and the icon shows a green pip.
3. Click the book icon → the **parchment two-page spread** opens; used commands are listed (others show 🔒); clicking one shows its deep-dive on the right.
4. Reload the page → previously unlocked entries are still unlocked (persistence).
5. Clicking the dark backdrop closes the book.

(Run `node journal-verify.mjs` again to confirm Tasks 1–2 still pass — UI edits shouldn't touch the data module, but confirm.)

---

### Task 4: Try-it sandbox (isolated Pyodide)

**Files:**
- Modify: `journal.js` (implement `_wireTryRun` + sandbox run)

**Interfaces:**
- Consumes: `Journal._getPyodide()` (Task 3), Pyodide `runPythonAsync`.
- Produces: `Journal._wireTryRun()` — binds the `#jTryRun` button to run the `#jTryRun` textarea's code in an isolated namespace and print output into `#jTryOut`.

- [ ] **Step 1: Implement the sandbox in `journal.js`**

Add this method to the `window.Journal = { … }` object (e.g. after `noticeLine`):

```js
  async runSandbox(src) {
    const py = pyodide;
    if (!py) return { out: "", err: "Python is still loading — try again in a moment." };
    // Truly isolated: a fresh globals dict (`ns`) so nothing leaks to/from the lesson.
    // Harmless stubs make movement commands "work" educationally; sample vars keep
    // example snippets from NameError. A Python try/finally ALWAYS restores stdout,
    // so the lesson's own stdout capture can never be left broken.
    const preamble =
      "import sys, io\n" +
      "_buf = io.StringIO(); _old = sys.stdout; sys.stdout = _buf\n" +
      "class _You:\n" +
      "    def walk(self, place='somewhere'): print(f'You walk to the {place}.')\n" +
      "    def wake_up(self): print('You wake up.')\n" +
      "class _Bow:\n" +
      "    def fire(self, *a, **k): print('You loose an arrow.')\n" +
      "you = _You(); bow = _Bow()\n" +
      "gold = 2.55; hp = 5; sticks = 10; string = 3; arrows = 12; coins = 3\n";
    // JSON.stringify yields a valid Python string literal (\n, \", \\, \uXXXX all match).
    const code =
      preamble +
      "_SRC = " + JSON.stringify(src) + "\n" +
      "try:\n    exec(_SRC, globals())\nfinally:\n    sys.stdout = _old\n" +
      "__cf_out = _buf.getvalue()\n";
    let ns;
    try {
      ns = py.toPy({});
      await py.runPythonAsync(code, { globals: ns });
      const out = ns.get("__cf_out");
      return { out: out || "(no output)", err: "" };
    } catch (e) {
      return { out: "", err: String(e.message || e).split("\n").slice(-3).join("\n") };
    } finally {
      if (ns) ns.destroy();
    }
  },
  _wireTryRun() {
    const btn = document.getElementById("jTryRun");
    const ta = document.querySelector("#journalBook textarea.try");
    const out = document.getElementById("jTryOut");
    if (!btn || !ta || !out) return;
    btn.addEventListener("click", async () => {
      out.className = "out"; out.textContent = "running…";
      const r = await this.runSandbox(ta.value);
      if (r.err) { out.className = "out err"; out.textContent = r.err; }
      else { out.className = "out"; out.textContent = r.out; }
    });
  },
```

- [ ] **Step 2: Manual browser verification**

Reload `http://localhost:8000/lesson1.html#keep` in a real browser. Open the book, pick an unlocked entry, and on its **Try it** box:
1. `print("test")` → click **▸ Run** → shows `test`.
2. Edit to `print(gold)` → Run → shows `2.55`.
3. `you.walk("tree")` → Run → shows `You walk to the tree.` (no animation, no lesson change).
4. Type a deliberate error (`print(`) → Run → shows a red error message, and the page keeps working.
5. After running sandbox code, return to the live lesson input and confirm the **lesson still validates normally** (sandbox did not leak state).

---

### Task 5: Wire the journal into the lesson lifecycle

**Files:**
- Modify: `lesson1.js`

**Interfaces:**
- Consumes: `window.Journal` (Tasks 3–4).
- Produces: journal initialized after Pyodide loads; every logged line offered to `Journal.noticeLine`; obsolete `setLocations` calls removed.

- [ ] **Step 1: Import journal.js for its side effect (top of `lesson1.js`)**

`lesson1.js` currently has no imports; its opening comment ends at line 4 and line 6 begins `const HARNESS = …`. Insert this import on its own line just before line 6 (after the blank line 5):

```js
import "./journal.js"; // defines window.Journal
```

- [ ] **Step 2: Hook `logCmd` to unlock entries**

In `lesson1.js`, the existing `logCmd` is (line ~139):

```js
function logCmd(line, mine) { for (const ln of String(line).split("\n")) { if (!ln.trim()) continue; const d = document.createElement("div"); d.className = mine ? "mine" : "auto"; d.textContent = ln; els.log.appendChild(d); } els.log.scrollTop = els.log.scrollHeight; }
```

Change it to notice each non-empty line:

```js
function logCmd(line, mine) { for (const ln of String(line).split("\n")) { if (!ln.trim()) continue; const d = document.createElement("div"); d.className = mine ? "mine" : "auto"; d.textContent = ln; els.log.appendChild(d); if (window.Journal) window.Journal.noticeLine(ln); } els.log.scrollTop = els.log.scrollHeight; }
```

- [ ] **Step 3: Initialize the journal early, attach Pyodide when ready**

`boot()` runs `loop(); play();` (line 65) *before* `pyodide = await loadPyodide()` (line 66), and `play()` logs auto-commands immediately. So initialize the journal **before** `play()` (so early unlocks render), then hand it the Pyodide instance once it loads.

3a. In `boot()`, the line `  wireDevBar();` (line 64) is immediately before `  loop(); play();` (line 65). Insert the init call between them:

```js
  wireDevBar();
  if (window.Journal) window.Journal.init({ pyodide: null });
  loop(); play();
```

3b. After Pyodide is ready — the existing line 69 is `  pyReady = true; els.loading.style.display = "none";` — append the Pyodide handoff on the next line:

```js
  pyReady = true; els.loading.style.display = "none";
  if (window.Journal) window.Journal.setPyodide(pyodide);
```

(`noticeLine` already no-ops until `init` runs, and the Try-it sandbox shows "Python is still loading…" until `setPyodide` runs — so the early-init ordering is safe.)

- [ ] **Step 4: Neutralize the removed locations list**

Search `lesson1.js` for `setLocations` and `els.locations`. Since the `#locations` element no longer exists:
- Change `setLocations` (line ~140) to a no-op guard:

```js
function setLocations(names) { if (!els.locations) return; els.locations.innerHTML = names.map((n) => `<div>you.walk("${n}")</div>`).join(""); }
```

- Remove `"locations"` from the `els` cache loop (line ~56) so it doesn't cache a now-missing node (harmless if left, but remove for tidiness).

- [ ] **Step 5: Manual browser verification (full integration)**

Reload `http://localhost:8000/lesson1.html` from the **start** (no hash) in a real browser:
1. Through the opening (wake → stranger → print → variables), entries unlock with toasts as each command first appears in the log — including **auto** commands the engine runs (e.g. `you.wake_up()`), confirming the "either source" rule.
2. The book reflects everything used; deep-dives and Try-it all work (Tasks 3–4).
3. Play a real lesson step that validates (e.g. a `print(...)` beat) and confirm it still passes — the journal hooks don't disturb lesson flow.
4. `node journal-verify.mjs` → `ALL JOURNAL CHECKS OK`.

---

## Notes for the implementer

- **Headless caveat:** Do not try to verify Tasks 3–5 with Chrome headless screenshots — rAF tweens and Pyodide do not advance there (documented project limitation). Use a real browser via `Start-Process http://localhost:8000/lesson1.html`.
- **DEV bar** still works for jumping scenes (`#clearing`, `#castle`, `#keep`) and Tab-skipping steps to generate log lines quickly.
- The data module (`journal-data.js`) is the only node-tested unit; keep all DOM/Pyodide out of it so `journal-verify.mjs` stays runnable.
