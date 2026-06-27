# Hint Button + Rich Descriptions + Greyed Ghost Text — Design Spec

**Date:** 2026-06-27
**Game:** Critter Forge — main game (`lesson1.html` / `lesson1.js` / `editor.js`)
**Status:** Approved (brainstorming), pending implementation plan
**Branch:** continues on `warm-fantasy-reskin` (builds directly on the Phase 1 IDE editor).

## Goal

Stop handing the player the answer. Today each step reveals the solution three ways: in the `prompt` text, as ghost-text placeholder in the editor, and sometimes in a `lesson` blurb. Instead:

- **By default**, each step shows a **rich, answer-free description** of what to do and the concept behind it.
- The example solution is hidden until the player presses a **💡 Hint** button, which reveals it as **greyed ghost text** in the editor that vanishes the moment they start typing.

This makes the player think first and reach for help deliberately, while keeping a real safety net.

## Behaviour

- **Description (always visible):** a multi-sentence, plain-English explanation rendered in the description panel above the editor (reusing the existing `.lesson` panel styling, now shown on every step). It explains the task and the concept but never contains the literal answer.
- **Prompt:** stays as a short, answer-free title/call-to-action line.
- **Hint button (💡 Hint):** sits in the editor footer next to Run. Clicking it sets the editor's placeholder to the step's example (greyed ghost text); clicking again hides it. The ghost text disappears automatically when the player types (CodeMirror's native placeholder behaviour).
- **Read-only / prefilled beats** (e.g. the watchword `input()` beat, which shows locked code on purpose): the Hint button is hidden, since the code is already on screen.

## Field model (internal — reuse existing `ask()` options)

- `prompt` → short, answer-free title.
- `lesson` → the **rich description**, now authored for **every** step and always shown.
- `placeholder` → becomes the **Hint** content: no longer shown automatically; revealed (greyed) only when Hint is pressed.

No new option keys are required; only the behaviour around them changes. This keeps the `ask()` plumbing nearly identical and the change low-risk.

## Components / files

- **`editor.js`** — add `setHint(str)` (set the greyed placeholder to the example) and `clearHint()` (clear it); a `toggleHint(str)` convenience. Stop auto-showing the answer: `ask()` no longer calls `setPlaceholder` with the solution.
- **`lesson1.html`** — add a `💡 Hint` button to the editor footer; add greyed `.CodeMirror-placeholder` styling (muted tan/grey consistent with the warm theme, clearly dimmer than typed code).
- **`lesson1.js`** — `ask()`: always show the `lesson` description; do not auto-fill the example; reset the Hint to hidden at the start of each step; wire the Hint button to reveal the current step's `placeholder`; hide the Hint button when the step is read-only/prefilled. DEV `skipStep` still uses `prefill || placeholder` so Tab-skip keeps working.

## Content work (the bulk of this feature)

- Author a **rich description** (`lesson`) for **every** Lesson-1 step (~18 steps across Wildwood, Clearing, Castle, and Keep), explaining the task and concept without the literal answer.
- **Reword prompts** that currently contain the answer (e.g. "Loose an arrow — type: `bow.fire()`") into answer-free titles (e.g. "Loose an arrow").
- Keep the example solution only in `placeholder` (the Hint content).
- The plan will contain the actual description text for each step verbatim (no placeholders), drafted here and open to the player's refinement.

## Constraints

- **Player-facing copy uses plain prose with no em dashes or "--"** (per the owner's writing preference).
- **No lesson logic / validation / game-state change.** `run_user`, validation, seeds, growth, combat, journal, and canvas are untouched. Only presentation + content.
- The Hint reveals ghost text only; it never auto-submits or fills editable text.

## Success criteria

- Every step shows a rich, answer-free description by default; no step displays the solution until Hint is pressed.
- The 💡 Hint button reveals the example as greyed ghost text that vanishes on typing; toggling hides it; it is hidden on read-only/prefilled beats.
- All existing lessons still validate and play exactly as before; DEV Tab-skip still works.
- No em dashes in any player-facing copy.

## Verification

Browser-based (CodeMirror/Pyodide are not headless-testable): on a fresh port, confirm each beat shows its description with no answer, the Hint button reveals greyed ghost text that clears on typing, the watchword beat hides Hint and still works, lessons still validate, and DEV Tab-skip still completes steps. `node --check` on the JS as a syntax gate.
