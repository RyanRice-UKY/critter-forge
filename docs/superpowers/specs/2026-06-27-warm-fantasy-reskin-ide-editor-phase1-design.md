# Warm-Fantasy Re-skin + Real IDE Editor (Phase 1) — Design Spec

**Date:** 2026-06-27
**Game:** Critter Forge — main game shell (`lesson1.html` / `lesson1.js`)
**Status:** Approved (brainstorming), pending implementation plan
**Part of:** a two-phase effort. Phase 1 (this spec) = visual re-skin + real IDE editor with lessons' current code. Phase 2 (separate spec, later) = real-Python-program scaffolds (`import`s / `def main()`), locked-vs-editable regions, and editing freedom that graduates with progression.

## Goal

Replace the dull dark "dev-console" chrome around the game with a cohesive **warm-fantasy** look (carved wood + parchment), and turn the plain `textarea` code box into a **real IDE editor** (line numbers, Python syntax highlighting, a file tab) — so the player feels like they're writing real code. Phase 1 is **look-and-feel only**: what the player types today, they still type; no lesson logic or validation changes.

## Visual direction (validated via visual companion)

Direction **A — warm fantasy**: the chrome joins the game world. Carved-wood panel frames, parchment surfaces for prose, a wood-framed code editor with a file tab. Palette:

- Wood frame border: `#6b4f25`; header gradient `#3a2a16 → #2a1d10`; header text `#f0d8a0`.
- Parchment surface: `#efe4c6`; parchment ink `#2a2113`; parchment muted `#8a7c52` (matches the in-game sealed-notes and the Command Journal book, which is already parchment).
- Code/editor pane (dark, for code readability): bg `#0d1017`; gutter bg `#0a0d13`; gutter numbers `#46506a`; code text `#dcd8c8`; caret `#f0d8a0`.
- Python syntax colors: keyword `#c98a3a`, def/function name `#e0b15a`, string `#8fbf6f`, comment `#5a6273`, number `#cf8a6a`.
- Accent (replaces the old green/amber): gold `#e7c878` / bronze `#7a5a1e`. Primary button (Run): bg `#7a5a1e`, text `#f7eccf`. Error red stays readable (`#c2552e` on dark / `#9c2b2b` on parchment).

**Per-surface treatment (deliberate):** decorative/prose surfaces (top bar, panel headers, dialogue-adjacent chrome) use wood + parchment; **code surfaces** (the editor, the Command Log list) use the dark pane so code stays high-contrast and readable. Every panel sits in a wood frame.

## Editor approach: CodeMirror 5

Chosen over a hand-rolled highlight overlay (brittle, re-invents an editor) and Ace (heavier, clunkier read-only ranges). CodeMirror 5:

- Loads from CDN (no build step — consistent with Pyodide and Google Fonts already loaded this way).
- Python mode → line numbers + real syntax highlighting.
- `readOnly` option + `markText({readOnly})` ranges — directly enables Phase 2's locked-vs-editable scaffold, so Phase 1 doesn't paint us into a corner.

CDN assets (cdnjs, version 5.65.16):
- `codemirror.min.css`, `codemirror.min.js`
- `mode/python/python.min.js`
- `addon/display/placeholder.min.js` (preserves the per-step placeholder hint)

## Components / files

### New: `editor.js`
A thin adapter that owns the CodeMirror instance and exposes exactly the operations `lesson1.js` performs on the code box today, so the swap is mechanical and CodeMirror stays isolated. Built from the existing `#code` textarea via `CodeMirror.fromTextArea` (the textarea remains the backing store). Public API (`window.Editor`):

- `init({ onSubmit })` — create the CM instance from `#code`, apply the warm theme/options, wire `extraKeys` so **Enter** calls `onSubmit()` when in single-line mode (and inserts a newline in multi-line mode); **Shift-Enter** always inserts a newline.
- `getValue()` / `setValue(str)`
- `focus()`
- `setEnabled(bool)` — false = non-editable + visually dimmed (used between steps).
- `setReadOnly(bool)` — true = non-editable but Run still usable (the watchword beat's prefilled read-only code).
- `setSingleLine(bool)` — true = Enter submits (one-line beats); false = Enter newlines (multi-line beats).
- `setPlaceholder(str)`

The adapter computes CM `readOnly` as `(!enabled || readonly)`; `setSingleLine` toggles the Enter binding.

### Modify: `lesson1.html`
- Add the CodeMirror CDN `<link>` and `<script>`s (core + python mode + placeholder addon) and a `<script type="module" src="./editor.js">` (or import from `lesson1.js`).
- Replace the input-bar markup so `#code` sits inside a **wood-framed editor container** with a **file tab** (`📜 lesson_1.py`) and the Run button; the CM editor mounts onto `#code`.
- Add the full warm-fantasy CSS: new palette variables and restyled rules for the stage frame, top bar, Command Log rail, input bar, prompt/lesson/status text, buttons, and a `.CodeMirror` theme block (pane bg, gutter, caret, and the `cm-keyword/cm-def/cm-string/cm-comment/cm-number` token colors above).

### Modify: `lesson1.js`
Swap the code-box touchpoints (no logic/validation change). Exact sites:
- **Line 65** (textarea keydown Enter handler) → remove; replaced by `Editor.init({ onSubmit: submit })` called once Pyodide/DOM are ready in `boot()`.
- **Line 93** (`skipStep`): `els.code.value = …` → `Editor.setValue(currentInput.opts.prefill || currentInput.opts.placeholder || "")`.
- **Line 111** (`ask` setup): replace the `els.code.rows/value/placeholder/disabled/readOnly` assignments with `Editor.setSingleLine((opts.rows||1) < 2); Editor.setValue(opts.prefill||""); Editor.setPlaceholder(opts.placeholder||""); Editor.setEnabled(true); Editor.setReadOnly(!!opts.readonly);`
- **Line 112**: `els.code.focus()` → `Editor.focus()`.
- **Line 119** (`submit`): `const src = els.code.value` → `const src = Editor.getValue()`.
- **Line 132** (step teardown): `els.code.disabled = true; els.code.value = ""` → `Editor.setEnabled(false); Editor.setValue("")`.
- `els.code` stays cached (it's CodeMirror's backing textarea) but is no longer read/written directly outside the adapter.

`ask()`'s options (`rows`, `prefill`, `placeholder`, `readonly`, `seed`, `requireOp`, `validate`, `append`, `lesson`) keep their current meaning. Validation, seeds, `run_user`, growth, combat, the Command Journal, and canvas rendering are untouched.

## What is explicitly out of scope (Phase 2 or later)
- Real-Python scaffolds (`import`s / `def main()`), locked-vs-editable regions, graduating freedom.
- Re-skinning `tower.html`, `arena1.html`, `prologue.html`, etc. The Phase 1 theme should be written as a coherent CSS block that can later be lifted into a shared stylesheet for those pages.
- The canvas game art and the Command Journal's "Try it" sandbox textarea (stays plain; the book is already parchment-framed).

## Success criteria
- Every panel in `lesson1.html` reads as warm-fantasy (wood/parchment), cohesive with the Command Journal book; no leftover dark-console panels.
- The code box is a CodeMirror editor with a file tab, line-number gutter, and Python syntax highlighting, themed to the palette.
- All existing lesson interactions still work: typing + Run submits and validates; Enter submits on single-line beats and inserts newlines on multi-line beats; the watchword beat shows read-only prefilled code with Run still working; `skipStep` (DEV) still auto-fills and submits; the editor disables/clears between steps.
- `lesson1.js` changes are limited to the adapter swap; no validation/game-logic changes.
- Canvas rendering and other pages are unchanged.

## Verification
Browser-based (CodeMirror + Pyodide don't advance under headless), with this checklist: (1) panels render warm-fantasy; (2) editor shows line numbers + Python highlighting; (3) a `print(...)` beat submits and validates; (4) a multi-line beat (e.g. the `+`/`-` gather/craft steps, rows ≥ 2) lets Enter insert newlines and validates; (5) the watchword beat shows read-only prefilled code and Run still passes; (6) DEV Tab-skip still works. `node --check editor.js` and `node --check lesson1.js` as syntax gates.
