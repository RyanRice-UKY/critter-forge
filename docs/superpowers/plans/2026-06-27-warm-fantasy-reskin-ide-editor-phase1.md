# Warm-Fantasy Re-skin + Real IDE Editor (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the `lesson1.html` chrome into a warm-fantasy (wood + parchment) look and replace the plain `textarea` code box with a real CodeMirror IDE editor (file tab, line numbers, Python syntax highlighting) — look-and-feel only, no lesson-logic change.

**Architecture:** A new `editor.js` adapter owns a single CodeMirror 5 instance built from the existing `#code` textarea and exposes the exact small interface `lesson1.js` uses today, so the swap is mechanical and CodeMirror stays isolated. CodeMirror loads from CDN (no build step). The warm theme is applied as a CSS override block appended to the existing `<style>`, plus a CodeMirror theme, so the original rules stay intact and the change is easy to review.

**Tech Stack:** Vanilla ES modules, CodeMirror 5.65.16 (CDN), Pyodide (already present), Node 24 (`node --check` syntax gate only — CodeMirror/Pyodide/canvas can't run headlessly).

## Global Constraints

- No build step. CodeMirror loads from cdnjs as classic `<script>`/`<link>` in `<head>` (executes before the deferred `lesson1.js` module, so the `CodeMirror` global is ready).
- CDN base: `https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/` — files: `codemirror.min.css`, `codemirror.min.js`, `mode/python/python.min.js`, `addon/display/placeholder.min.js`.
- **No lesson logic / validation / game-state changes.** Only the code-box plumbing and CSS change. `run_user`, `ask()` semantics, seeds, growth, combat, the Command Journal, and canvas rendering are untouched.
- Warm palette (verbatim): wood border `#6b4f25`; header gradient `#3a2a16 → #2a1d10`; header text `#f0d8a0`; parchment `#efe4c6` / ink `#2a2113` / muted `#8a7c52`; code pane `#0d1017`; gutter `#0a0d13`; gutter numbers `#46506a`; code text `#dcd8c8`; caret `#f0d8a0`; gold accent `#e7c878`; bronze `#7a5a1e`; Run text `#f7eccf`. Syntax: keyword `#c98a3a`, def/function `#e0b15a`, string `#8fbf6f`, comment `#5a6273`, number `#cf8a6a`.
- **Code surfaces stay dark** (editor + Command Log) for readability; prose/decoration uses wood/parchment.
- Branch: `warm-fantasy-reskin` (already created off master, which includes the merged Command Journal feature).
- Browser verification only for behavior/visuals; `node --check` for JS syntax. There is no automated test suite for this UI.
- **SRI deliberately omitted:** the CodeMirror CDN tags do not carry `integrity=`/`crossorigin=` hashes, matching the existing Pyodide and Google Fonts CDN tags in this same file. This is a local-dev educational game with no production deployment; adding unverified hashes risks silently breaking the editor. Revisit if/when the game is publicly hosted.

---

### Task 1: CodeMirror editor adapter + integration (functional)

Delivers a working CodeMirror editor wired into the lesson flow, with CodeMirror's default styling (the warm theme comes in Task 2). After this task every existing lesson interaction still works, but now in a real editor.

**Files:**
- Create: `editor.js`
- Modify: `lesson1.html` (add CDN includes in `<head>`; restructure the input-bar `.row` into an editor container with a file tab + footer; add minimal structural CSS)
- Modify: `lesson1.js` (import `Editor`; swap the `els.code` touchpoints at lines 65, 93, 111–112, 119, 132)

**Interfaces:**
- Consumes: the global `CodeMirror` (from CDN), the `#code` textarea, and `submit` (defined in `lesson1.js`).
- Produces: `export const Editor` from `editor.js` with:
  - `init({ onSubmit })` — build the CM instance from `#code`, wire Enter→submit in single-line mode.
  - `getValue() → string`, `setValue(str)`, `focus()`
  - `setSingleLine(bool)` — Enter submits when true; inserts a newline when false.
  - `setEnabled(bool)` — false ⇒ non-editable + dimmed (between steps).
  - `setReadOnly(bool)` — true ⇒ non-editable but Run still usable (watchword beat).
  - `setPlaceholder(str)`

- [ ] **Step 1: Create `editor.js`**

```js
// editor.js — CodeMirror adapter for the lesson code box. Wraps one
// CodeMirror instance built from the #code textarea and exposes the small
// interface lesson1.js needs, so CodeMirror stays isolated here.

let cm = null;
let singleLine = false;
let onSubmit = () => {};
let _enabled = true, _readonly = false;

function applyReadonly() {
  // disabled (between steps) wins over the watchword read-only state
  const ro = !_enabled ? "nocursor" : (_readonly ? true : false);
  cm.setOption("readOnly", ro);
  cm.getWrapperElement().classList.toggle("cm-disabled", !_enabled);
}

export const Editor = {
  init(opts = {}) {
    onSubmit = opts.onSubmit || (() => {});
    const ta = document.getElementById("code");
    cm = CodeMirror.fromTextArea(ta, {
      mode: "python",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      smartIndent: true,
      lineWrapping: false,
      viewportMargin: Infinity, // grow to fit content
      extraKeys: {
        Enter: () => { if (singleLine) { onSubmit(); return; } return CodeMirror.Pass; },
        "Shift-Enter": (editor) => editor.replaceSelection("\n"),
      },
    });
    cm.setSize("100%", "auto");
  },
  getValue() { return cm ? cm.getValue() : ""; },
  setValue(str) { if (cm) cm.setValue(str || ""); },
  focus() { if (cm) cm.focus(); },
  setSingleLine(b) { singleLine = !!b; },
  setPlaceholder(str) { if (cm) cm.setOption("placeholder", str || ""); },
  setEnabled(b) { if (cm) { _enabled = !!b; applyReadonly(); } },
  setReadOnly(b) { if (cm) { _readonly = !!b; applyReadonly(); } },
};
```

- [ ] **Step 2: Verify `editor.js` syntax**

Run: `node --check editor.js`
Expected: no output, exit 0. (It references the `CodeMirror` global, which Node doesn't have, but `--check` only parses — it does not execute — so this passes.)

- [ ] **Step 3: Add CodeMirror CDN includes to `lesson1.html` `<head>`**

Immediately after the Pyodide script (line 9, `<script src="https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js"></script>`), add:

```html
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/python/python.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/display/placeholder.min.js"></script>
```

- [ ] **Step 4: Restructure the input-bar markup in `lesson1.html`**

Replace this block (currently lines 132–135):

```html
        <div class="row">
          <textarea id="code" rows="2" spellcheck="false" autocomplete="off" placeholder="" disabled></textarea>
          <button id="run" disabled>▸ Run</button>
        </div>
```

with:

```html
        <div class="editor">
          <div class="filetab">📜 lesson_1.py</div>
          <textarea id="code" spellcheck="false" autocomplete="off" disabled></textarea>
          <div class="editor-foot"><span class="run-hint">Enter to run · Shift+Enter for a new line</span><button id="run" disabled>▸ Run</button></div>
        </div>
```

(The `rows`/`placeholder` attributes are dropped — CodeMirror controls height, and the placeholder is set via the adapter. `id="code"` and `id="run"` are unchanged so `lesson1.js` still finds them.)

- [ ] **Step 5: Add minimal structural CSS for the editor container**

In `lesson1.html`, inside `<style>`, immediately before the closing `</style>` (line 96), add:

```css
/* IDE editor container (structural; warm theme applied in re-skin) */
.editor { border:1px solid var(--line); border-radius:10px; overflow:hidden; background:#0a0e15; }
.filetab { font-size:12px; padding:6px 12px; color:#cfe3ff; background:#0e1117; border-bottom:1px solid var(--line); }
.editor .CodeMirror { height:auto; min-height:64px; font-family:"IBM Plex Mono",monospace; font-size:15px; background:#0a0e15; color:#e9f0f8; }
.editor-foot { display:flex; align-items:center; justify-content:space-between; padding:7px 10px; border-top:1px solid var(--line); }
.run-hint { font-size:11px; color:var(--muted); }
.cm-disabled { opacity:.5; }
```

- [ ] **Step 6: Wire the adapter into `lesson1.js` — import + init**

At the top of `lesson1.js`, the existing line 6 is `import "./journal.js"; // defines window.Journal`. Add directly below it:

```js
import { Editor } from "./editor.js";
```

Then replace the textarea keydown line (currently line 65):

```js
  els.code.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && els.code.rows < 2) { e.preventDefault(); submit(); } });
```

with:

```js
  Editor.init({ onSubmit: submit });
```

- [ ] **Step 7: Swap the remaining `els.code` touchpoints in `lesson1.js`**

`skipStep` (currently line 93) — change:

```js
function skipStep() { if (currentInput) { els.code.value = currentInput.opts.prefill || currentInput.opts.placeholder || ""; submit(); } else if (awaitAdvance) advance(); }
```

to:

```js
function skipStep() { if (currentInput) { Editor.setValue(currentInput.opts.prefill || currentInput.opts.placeholder || ""); submit(); } else if (awaitAdvance) advance(); }
```

`ask()` setup (currently line 111) — change:

```js
    els.code.rows = opts.rows || 1; els.code.value = opts.prefill || ""; els.code.placeholder = opts.placeholder || ""; els.code.disabled = false; els.code.readOnly = !!opts.readonly;
```

to:

```js
    Editor.setSingleLine((opts.rows || 1) < 2); Editor.setValue(opts.prefill || ""); Editor.setPlaceholder(opts.placeholder || ""); Editor.setEnabled(true); Editor.setReadOnly(!!opts.readonly);
```

The focus line (currently line 112) ends with `els.code.focus();` — change that call to `Editor.focus();` (leave the rest of line 112, `els.run.disabled = !pyReady; setStatus(...)`, unchanged).

`submit()` (currently line 119) — change `const src = els.code.value; lastSrc = src;` to:

```js
  const src = Editor.getValue(); lastSrc = src;
```

Step teardown (currently line 132) — change the start of the line:

```js
  els.code.disabled = true; els.run.disabled = true; els.code.value = ""; els.lesson.style.display = "none";
```

to:

```js
  Editor.setEnabled(false); els.run.disabled = true; Editor.setValue(""); els.lesson.style.display = "none";
```

(Leave `els.run.disabled` and `els.lesson` handling exactly as-is — Run-button enable/disable stays in `lesson1.js`.)

- [ ] **Step 8: Verify `lesson1.js` syntax**

Run: `node --check lesson1.js`
Expected: no output, exit 0.

- [ ] **Step 9: Verify other JS still parses (no accidental breakage)**

Run: `node --check journal.js && node journal-verify.mjs`
Expected: `ALL JOURNAL CHECKS OK` (this task didn't touch the journal, but confirm).

- [ ] **Step 10: Browser verification (real browser — headless can't run CodeMirror/Pyodide)**

Serve and open on a fresh port to avoid cache: `python -m http.server 8012` then open `http://localhost:8012/lesson1.html` in a real browser. Verify:
1. The code box is now a CodeMirror editor: a `📜 lesson_1.py` file tab, a line-number gutter, and Python syntax highlighting as you type.
2. A `print(...)` beat: type `print("Where am I?")`, press **Enter** → it submits and the lesson advances (Enter-submits on single-line beats).
3. A multi-line beat (DEV-jump to it or play to the gather step): on a `rows ≥ 2` step, **Enter** inserts a newline (does not submit); the **▸ Run** button submits; the answer validates.
4. The watchword beat (DEV `1.3` → camp): the editor shows read-only prefilled code (you cannot edit it) and **▸ Run** still works.
5. Between steps the editor is dimmed/non-editable; when a step starts it's editable and focused.
6. DEV **skip** button still auto-fills and submits each step.

- [ ] **Step 11: Commit**

```bash
git add editor.js lesson1.html lesson1.js
git commit -m "feat(editor): real CodeMirror IDE code box + adapter"
```

---

### Task 2: Warm-fantasy re-skin (CSS)

Pure CSS. Re-skins every `lesson1.html` panel and the CodeMirror editor into the warm-fantasy palette. Implemented as one override block appended to the end of `<style>` (equal-specificity, later-wins) so the original rules stay untouched and the diff is easy to review/revert.

**Files:**
- Modify: `lesson1.html` (append the warm-theme CSS block before `</style>`)

**Interfaces:**
- Consumes: the markup/classes from Task 1 (`.editor`, `.filetab`, `.editor-foot`, `.run-hint`) and CodeMirror's default token classes (`cm-s-default .cm-keyword`, etc.).
- Produces: nothing consumed by later tasks (Phase 1 ends here).

- [ ] **Step 1: Append the warm-fantasy theme block**

In `lesson1.html`, immediately before the closing `</style>` (the same spot used in Task 1, now after the editor structural CSS), add:

```css
/* ===================== WARM FANTASY THEME (Phase 1 re-skin) ===================== */
:root {
  --bg:#15100a; --panel:#241a10; --line:#6b4f25; --ink:#e8dcc4;
  --muted:#a08a5e; --green:#e7c878; --red:#c2552e; --amber:#e7c878;
}
body { background:#15100a; }
.top .k { color:#a08a5e; }
.top h1 b { color:#e7c878; }
.stagewrap { border:2px solid #6b4f25; border-radius:12px; }
/* Command Log rail: wood frame, dark log pane for code readability */
.journal { background:#1b130b; border:2px solid #6b4f25; }
.journal h3 { color:#e7c878; }
#log .auto { color:#9a8a6a; }
#log .mine { color:#d9c07a; }
/* Input bar + prose */
.inputbar { background:#241a10; border:2px solid #6b4f25; }
.prompt { color:#f0e2c2; }
.lesson { color:#cbb892; border-left-color:#e7c878; }
.status.ok { color:#9ec07a; } .status.muted { color:#a08a5e; } .status.err { color:#e0814f; }
/* Editor: wood frame + parchment file tab over a dark code pane */
.editor { border:2px solid #6b4f25; background:#0d1017; }
.filetab { background:linear-gradient(#3a2a16,#2a1d10); color:#f0d8a0; border-bottom:2px solid #6b4f25; }
.editor-foot { background:#1b130b; border-top:1px solid #3a2a16; }
.run-hint { color:#8a7c52; }
button#run { background:#7a5a1e; color:#f7eccf; }
button#run:hover { filter:brightness(1.08); }
/* CodeMirror warm theme (default theme class is cm-s-default) */
.editor .CodeMirror { background:#0d1017; color:#dcd8c8; }
.editor .CodeMirror-gutters { background:#0a0d13; border-right:1px solid #1b2230; }
.editor .CodeMirror-linenumber { color:#46506a; }
.editor .CodeMirror-cursor { border-left:2px solid #f0d8a0; }
.editor .CodeMirror-selected { background:#2a3a1e; }
.cm-s-default .cm-keyword { color:#c98a3a; }
.cm-s-default .cm-def { color:#e0b15a; }
.cm-s-default .cm-builtin { color:#d9a441; }
.cm-s-default .cm-string, .cm-s-default .cm-string-2 { color:#8fbf6f; }
.cm-s-default .cm-comment { color:#5a6273; }
.cm-s-default .cm-number { color:#cf8a6a; }
.cm-s-default .cm-operator { color:#c9b89a; }
.cm-s-default .cm-variable, .cm-s-default .cm-variable-2, .cm-s-default .cm-property { color:#dcd8c8; }
```

(The Command Journal book, its icon, and toast are already parchment/wood and intentionally not overridden. The DEV bar is left as-is. The `--green`/`--amber` vars are redefined to gold so any remaining references read warm; the journal pip's hardcoded green is left as a deliberate "new" indicator.)

- [ ] **Step 2: Browser verification (real browser)**

Serve on a fresh port (`python -m http.server 8013`) and open `http://localhost:8013/lesson1.html`. Verify:
1. The whole shell reads warm-fantasy: wood-framed stage, top bar, Command Log rail, and input bar; gold accents; nothing left looking like the old dark-blue console.
2. The editor has a parchment/wood file tab over a dark code pane; Python syntax highlighting uses the warm colors (keywords amber-brown, strings green, comments grey, numbers orange); the caret is gold.
3. The Command Log is readable (warm text on the dark rail).
4. The Command Journal book still opens and looks consistent (parchment) with the new chrome.
5. Code is still fully readable and the editor still works (type + Run + validate a `print` beat).

- [ ] **Step 3: Commit**

```bash
git add lesson1.html
git commit -m "feat(ui): warm-fantasy re-skin of lesson1 panels + CodeMirror theme"
```

---

## Notes for the implementer

- **Headless caveat:** Do not verify Tasks 1–2 with headless Chrome — CodeMirror, Pyodide, and rAF do not run there. Use a real browser via a fresh port (cache bit us before: the browser caches JS modules per origin, so use a new port or hard-reload after JS changes).
- **DEV bar** (`#clearing`, `#castle`, `#keep` jumps + Tab/skip) still works for reaching multi-line and watchword beats quickly.
- Keep all changes within the two files per task; do not touch `run_user`, lesson definitions, or canvas rendering.
