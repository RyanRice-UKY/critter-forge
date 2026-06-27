# Command Journal Book — Design Spec

**Date:** 2026-06-26
**Game:** Critter Forge — Lesson 1 (`lesson1.html` / `lesson1.js`)
**Status:** Approved (brainstorming), pending implementation plan

## Goal

Split today's combined right-rail panel into two distinct things:

1. **Command Log** — the existing running transcript of commands (unchanged behavior).
2. **Command Journal** — a new, clickable parchment "book" that acts as a personal
   reference. It gains an entry the **first time** each command is used. Clicking an
   entry opens an in-depth explanation of that command (summary, syntax, the parts,
   ways to use it) plus a safe **Try it** scratchpad.

Only the right-side panel / journal changes. The game canvas, scripted lessons,
validation, growth, combat, and inventory are untouched.

## UX decisions (validated via visual companion)

- **Layout: floating tome (option B).** A small book icon floats on the game canvas
  (next to the inventory bag). The whole right rail becomes the **Command Log**.
  Clicking the book opens a centered **two-page spread** overlay over the canvas.
- **Skin: parchment (option A).** Cream pages matching the in-game "sealed orders"
  notes (`#efe4c6`), reads like a spellbook.
- **Two-page spread:**
  - **Left page** — unlocked commands grouped into sections
    (Output / Movement / Math & variables / Control flow). Not-yet-used commands
    appear **🔒 locked**: greyed, no deep-dive, no click target.
  - **Right page** — deep-dive for the selected command, in this fixed order:
    1. **Summary** — one plain-English line ("Shows a message on screen…").
    2. **Syntax** — the canonical form, e.g. `print(value)`.
    3. **The parts** — bullet breakdown of each token (the name, the parens, the value).
    4. **Ways to use it** — 2–4 short real examples (one concept, varied usage).
    5. **Try it yourself** — an editable snippet + **▸ Run** button.
- **One entry per concept, not per usage.** `print("hi")` and `print(num)` share the
  single `print()` entry.

## Components & files

- **`journal-data.js`** (new) — the content catalog. Pure data, no DOM. Exports an
  ordered list of sections, each with entries. Designed to be extended for future
  lessons.
- **`journal.js`** (new) — the book UI controller. Renders the spread, handles
  open/close, tracks unlocks, persists them, runs the Try-it sandbox, and fires the
  unlock toast. Public API:
  - `Journal.init(pyodide)` — wire up DOM + load persisted unlocks.
  - `Journal.open()` / `Journal.close()` — show/hide the overlay.
  - `Journal.noticeLine(line)` — given a log line, unlock any matching entries.
  - `Journal.has(name)` — query unlock state.
- **`lesson1.html`** (edit) — add the floating book icon button on the stage, the
  parchment overlay markup, the unlock-toast element, and CSS. Remove the
  "Places you can walk" (`#locations`) block; relabel the rail heading to
  "Command Log".
- **`lesson1.js`** (edit) — minimal hooks only:
  - In `logCmd(line, mine)`, after appending, call `Journal.noticeLine(line)`.
  - Wire the book icon click to `Journal.open()`.
  - Call `Journal.init(pyodide)` once Pyodide is ready.
  - Drop the now-unused `setLocations` calls (or leave the function as a no-op).

## Data model

Each catalog entry:

```js
{
  id: "print",                 // stable key, used for persistence
  label: "print()",            // shown in the left-page list
  section: "Output",           // grouping
  match: /print\s*\(/,         // regex tested against each log line to unlock
  summary: "Shows a message on screen — your character speaks it aloud.",
  syntax: "print(value)",
  parts: [
    ["print", "the command"],
    ["( )", "hold what to show"],
    ["value", "text in \"quotes\", or a variable"],
  ],
  usage: ['print("Hello")', "print(gold)", 'print("HP:", hp)'],
  tryCode: 'print("test")',
}
```

Sections render in a fixed order: **Output, Movement, Math & variables, Control flow.**

### Lesson 1 catalog (initial entries)

- **Output:** `print()`
- **Movement:** `you.walk()`, `bow.fire()`, `you.wake_up()`
- **Math & variables:** `variables` (assignment `=`), `+`, `−`, `+=`, `//`, `%`,
  `*`, `/`
- **Control flow:** `if / else`, `for` loop, `==`, `input()`

Matchers must be specific enough to avoid false positives (e.g. `+=` must not also
trigger the `+` entry; `==` must not trigger assignment `=`). Where a simple substring
is ambiguous, use an anchored regex.

## Unlock mechanic

- `logCmd` already receives every command line — both **player-typed** (`mine=true`)
  and **engine auto-commands** (`mine=false`). **Either source unlocks** the matching
  entry (the book mirrors everything the player has seen scroll past).
- `Journal.noticeLine(line)` tests each still-locked entry's `match` against the line;
  on first match it marks the entry unlocked, persists, re-renders the left page if the
  book is open, and fires the toast.
- **Persistence:** unlocked ids stored in `localStorage` under a dedicated key
  (e.g. `cf_journal_unlocked`), alongside the existing growth/gold persistence, so the
  journal fills up across sessions.
- **Unlock toast:** a brief "📖 New entry: print()" toast flashes near the book icon
  for ~2s when a new entry unlocks. Multiple unlocks in one run queue or stack briefly.

## Try-it sandbox

- Clicking **▸ Run** executes the (editable) snippet in an **isolated Pyodide
  namespace** — a fresh dict, never the lesson namespace. It cannot read or mutate
  lesson state or affect validation.
- A small preamble defines harmless stubs so non-`print` commands still "work"
  educationally:
  - `you.walk(p)` → prints `You walk to the {p}.`
  - `you.wake_up()` → prints `You wake up.`
  - `bow.fire()` → prints `You loose an arrow.`
  - Seeded sample variables (e.g. `gold = 2.55`, `hp = 5`) so example snippets that
    reference variables run without `NameError`.
- stdout is captured and shown directly beneath the Run button. Errors are caught and
  shown in red (a teaching moment, not a crash).

## What is explicitly out of scope

- No changes to the game canvas, scripted beats, validation, growth, combat, inventory.
- No journal content for Lessons 2+ yet (catalog is structured to add them later).
- Running Try-it code into the live game (sandbox only, by design).

## Success criteria

- The right rail shows only the Command Log; the floating book icon opens a parchment
  two-page spread.
- Commands start locked and unlock (with a toast) the first time they appear in the
  log, from either source; unlocks persist across reloads.
- Clicking an unlocked entry shows its deep-dive; **▸ Run** executes the snippet in
  isolation and shows output, with zero effect on the lesson.
- `lesson1.js` changes are limited to the small hooks listed above.
