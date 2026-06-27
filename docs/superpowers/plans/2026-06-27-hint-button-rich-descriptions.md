# Hint Button + Rich Descriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide each step's answer by default behind a 💡 Hint button (greyed ghost text), and show a rich, answer-free description instead.

**Architecture:** Task 1 adds the mechanism: `editor.js` gains hint show/clear methods, `lesson1.html` gains a Hint button + greyed placeholder CSS, and `lesson1.js`'s `ask()` stops auto-showing the answer and wires the button. Task 2 is content: reword each concept step's `prompt` to be answer-free and author a rich `lesson` description for it, with no em dashes.

**Tech Stack:** Vanilla ES modules, CodeMirror 5 (already integrated), Node 24 (`node --check` syntax gate only; CodeMirror/Pyodide are not headless-testable).

## Global Constraints

- **Player-facing copy uses plain prose with NO em dashes ("—") and no "--".** Use commas, periods, or "and".
- **No lesson logic / validation / game-state change.** `run_user`, `validate`, `seed`, `requireOp`, `append`, growth, combat, journal, canvas all unchanged. Only presentation + the `prompt`/`lesson` copy.
- The example solution lives only in each step's existing `placeholder`; it is shown solely via the Hint button as greyed ghost text that vanishes on typing.
- The Hint button is hidden on read-only / prefilled beats (the watchword beat), where the code is shown on purpose.
- Scope of the answer-free + rich-description treatment: the **16 concept steps** listed in Task 2. The free-roam navigation prompts (`freeRoam`), the combat fire prompt (`clearingCombat`), and the keep explore prompt (`playKeep`) are mechanical "type the command" interactions and are left as-is.
- DEV `skipStep` keeps using `prefill || placeholder`, so Tab-skip still works.
- Branch: `warm-fantasy-reskin`.
- Verification is browser-based on a fresh port; `node --check` for JS syntax.

---

### Task 1: Hint mechanism (button + greyed ghost text)

**Files:**
- Modify: `editor.js` (add hint methods)
- Modify: `lesson1.html` (Hint button in editor footer; greyed placeholder + button CSS)
- Modify: `lesson1.js` (`ask()` stops auto-showing the answer; cache + wire the Hint button)

**Interfaces:**
- Consumes: the CodeMirror instance and `currentInput` (in `lesson1.js`).
- Produces (on `editor.js`'s exported `Editor`): `setHint(str)`, `clearHint()`, `toggleHint(str)`.

- [ ] **Step 1: Add hint methods to `editor.js`**

In `editor.js`, add a module-scope flag near the other `let` declarations (after `let _enabled = true, _readonly = false;`):

```js
let _hintShown = false;
```

Then add these three methods to the exported `Editor` object (e.g. right after the existing `setPlaceholder` method):

```js
  setHint(str) { if (cm) { cm.setOption("placeholder", str || ""); _hintShown = true; } },
  clearHint() { if (cm) { cm.setOption("placeholder", ""); _hintShown = false; } },
  toggleHint(str) { if (_hintShown) this.clearHint(); else this.setHint(str); },
```

- [ ] **Step 2: Verify `editor.js` syntax**

Run: `node --check editor.js`
Expected: no output, exit 0.

- [ ] **Step 3: Add the Hint button to the editor footer in `lesson1.html`**

Find the editor footer (it currently reads):

```html
          <div class="editor-foot"><span class="run-hint">Enter to run · Shift+Enter for a new line</span><button id="run" disabled>▸ Run</button></div>
```

Replace it with (adds the Hint button on the left):

```html
          <div class="editor-foot"><button id="hint" class="hintbtn" type="button">💡 Hint</button><span class="run-hint">Enter to run · Shift+Enter for a new line</span><button id="run" disabled>▸ Run</button></div>
```

- [ ] **Step 4: Add Hint button + greyed placeholder CSS in `lesson1.html`**

In `<style>`, immediately before the closing `</style>`, add:

```css
/* Hint button + greyed ghost text */
.hintbtn { background:#2a2113; color:#e7c878; border:1px solid #6b4f25; border-radius:6px; padding:5px 11px; cursor:pointer; font-family:"Chakra Petch",sans-serif; letter-spacing:1px; font-size:12px; }
.hintbtn:hover { filter:brightness(1.12); }
.hintbtn[hidden] { display:none; }
.editor .CodeMirror-placeholder { color:#6a6552; font-style:italic; }
```

- [ ] **Step 5: Cache and wire the Hint button in `lesson1.js`**

In `boot()`, the element-cache loop (currently line 58) lists the ids. Add `"hint"` to that array so it reads:

```js
  for (const id of ["stage", "loading", "prompt", "lesson", "code", "run", "status", "prog", "log", "inventory", "invItems", "noteModal", "noteText", "noteClose", "hint"]) els[id] = document.getElementById(id);
```

Then, in `boot()` next to the other wiring (e.g. right after `els.run.onclick = submit;`), add:

```js
  els.hint.onclick = () => { if (currentInput) Editor.toggleHint(currentInput.opts.placeholder || ""); };
```

- [ ] **Step 6: Stop `ask()` auto-showing the answer; show/hide the Hint button**

In `ask()`, the setup line (currently line 112) reads:

```js
    Editor.setSingleLine((opts.rows || 1) < 2); Editor.setValue(opts.prefill || ""); Editor.setPlaceholder(opts.placeholder || ""); Editor.setEnabled(true); Editor.setReadOnly(!!opts.readonly);
```

Replace it with (clears any prior hint instead of revealing the answer, and toggles the Hint button visibility):

```js
    Editor.setSingleLine((opts.rows || 1) < 2); Editor.setValue(opts.prefill || ""); Editor.clearHint(); Editor.setEnabled(true); Editor.setReadOnly(!!opts.readonly);
    els.hint.hidden = !(opts.placeholder && !opts.readonly && !opts.prefill);
```

- [ ] **Step 7: Verify `lesson1.js` syntax + journal intact**

Run: `node --check lesson1.js && node --check editor.js && node journal-verify.mjs`
Expected: no syntax errors; `ALL JOURNAL CHECKS OK`.

- [ ] **Step 8: Browser verification (real browser, fresh port)**

Serve `python -m http.server 8020` and open `http://localhost:8020/lesson1.html`. Verify:
1. On the first step (speak to the stranger), the editor is **empty** (no example answer shown), and a **💡 Hint** button sits in the footer.
2. Clicking **💡 Hint** drops greyed, italic ghost text (the example) into the editor; it **vanishes the moment you type**; clicking Hint again hides it.
3. Typing the answer and Run still submits and validates exactly as before.
4. On a multi-line step (DEV jump or play to the gather step), Hint shows the multi-line greyed example.
5. On the watchword beat (DEV `1.3` → camp), the **Hint button is hidden** and the prefilled read-only code still shows; Run still works.
6. DEV **skip (Tab)** still auto-fills and submits.

- [ ] **Step 9: Commit**

```bash
git add editor.js lesson1.html lesson1.js
git commit -m "feat(hint): hint button reveals greyed ghost-text example"
```

---

### Task 2: Rich, answer-free descriptions

Reword each concept step's `prompt` into a short answer-free title and give it a rich `lesson` description. The `placeholder` (the example) is unchanged in every case. No em dashes. This task edits only string literals in `lesson1.js` (plus the `KEEP_MANIFEST_LESSON` constant).

**Files:**
- Modify: `lesson1.js` (the 16 concept steps' `prompt`/`lesson` strings, and the `KEEP_MANIFEST_LESSON` constant)

**Interfaces:**
- Consumes: the Hint mechanism from Task 1 (descriptions show by default; answers behind Hint).
- Produces: nothing consumed by later tasks.

For each step below, find the `ask({ ... })` call at the cited location and set its `prompt:` and `lesson:` to the new strings. Where a step currently has no `lesson:` key, add one. Leave `placeholder`, `rows`, `seed`, `requireOp`, `validate`, `append`, and the `onCode` callback exactly as they are.

- [ ] **Step 1: Wildwood — speak to the stranger (current line 221)**

`prompt:` → `"Speak to the stranger"`
add/replace `lesson:` → `"Your character talks by printing words to the screen. A print statement shows whatever you place inside its parentheses, and text goes inside quotation marks. Ask the stranger where you are."`

- [ ] **Step 2: Wildwood — tell them your name (current line 224)**

`prompt:` → `"Tell them your name"`
add `lesson:` → `"Use another print statement to say your name aloud. Put any name you like inside the quotation marks. Whatever you print is how the world will know you."`

- [ ] **Step 3: Wildwood — answer the smith (current line 228)**

`prompt:` → `"Answer the smith"`
add `lesson:` → `"The smith needs to hear that you are not infected. Print a short reply that clearly says no, with your words inside quotation marks."`

- [ ] **Step 4: Wildwood — gather sticks and string (current line 233)**

`prompt:` → `"Gather the sticks and string"`
replace `lesson:` → `"A variable remembers a value for you. You already carry sticks and string, both starting at zero. To gather more you add to a variable: take its current value, add what you found, and store the result back in the same variable. Pick up ten sticks and three string this way."`

- [ ] **Step 5: Wildwood — speak to the smith (current line 236)**

`prompt:` → `"Speak to the smith"`
add `lesson:` → `"Say something to the smith before you hand the materials over. Any printed line of dialogue works, with your words inside quotation marks."`

- [ ] **Step 6: Wildwood — hand the materials over (current line 237)**

`prompt:` → `"Hand the materials over"`
add `lesson:` → `"Giving things away means taking them out of your variables. Subtraction is addition in reverse: take the current value, remove the amount, and store it back. Hand over all of the sticks and string so each count drops to zero."`

- [ ] **Step 7: Clearing — get to the marked spot (current line 252)**

`prompt:` → `"Get to the marked spot"`
add `lesson:` → `"Your character moves by calling the walk command and naming a place inside quotation marks. The marked spot here is called center. Walk there to face the danger."`

- [ ] **Step 8: Clearing — answer the survivor (current line 261)**

`prompt:` → `"Answer the survivor"`
add `lesson:` → `"The survivor asks whether you will escort them. Print your answer as a single word, yes or no, inside quotation marks. Your choice changes what happens next."`

- [ ] **Step 9: Castle — fire four arrows with a loop (current line 275)**

`prompt:` → `"Fire four arrows at once"`
replace `lesson:` → `"Four enemies, and repeating one line four times is tedious. A for loop repeats a block of code for you. Write a loop that counts four times and calls the fire command on each pass, so a single short piece of code looses four arrows. Use a range of four so it runs exactly four times."`

- [ ] **Step 10: Castle — approach the keep (current line 280)**

`prompt:` → `"Approach the keep"`
add `lesson:` → `"Walk up to the keep gate. Call the walk command and name your destination, castle, inside quotation marks."`

- [ ] **Step 11: Castle — tell the gatekeeper your coin (current line 286)**

`prompt:` → `"Tell the gatekeeper your coin"`
replace `lesson:` → `"A print statement can show the value held in a variable, not just plain text. When you print a variable you leave the quotation marks off, so the screen shows the number it holds instead of its name. Print your gold so the gatekeeper sees the amount."`

- [ ] **Step 12: Castle — name the toll and pay it (current line 291)**

`prompt:` → `"Name the toll, then pay it"`
replace `lesson:` → `"A constant is a value you name once and reuse so your code reads clearly. Name the quarter coin toll as a constant, then subtract it from your gold to pay. If the gate counts two of you, multiply the toll before you subtract."`

- [ ] **Step 13: Keep Beat 1 — pack the supply cart (current line 516)**

`prompt:` → `"Pack the supply cart"`
Leave `lesson: KEEP_MANIFEST_LESSON` as-is in the call (Step 17 updates the constant itself).

- [ ] **Step 14: Keep Beat 2 — the watchword (current line 533, read-only beat)**

`prompt:` → `"This code is already written for you. Press Run, then type the secret code when the box appears."`
replace `lesson:` → `"Read the code, then run it. You do not write this one. The input() call is the program asking you a question: a box pops up and whatever you type becomes secret_string. An if and else make a two way choice, where the if line runs when the condition is true and the else line runs when it is false. The == test checks whether two values are equal, and it works on words too. So if what you type equals the watchword, you pass. The watchword is in your sealed orders if you forgot it."`

(This beat keeps `prefill`, `readonly: true`, `seed`, `inputPrompt`, and `validate` unchanged; the Hint button is hidden here by Task 1.)

- [ ] **Step 15: Keep Beat 3 — take your scout's pay (current line 555)**

`prompt:` → `"Take your scout's pay"`
replace `lesson:` → `"A float is a number with a decimal point, the kind a coin worth less than a whole gold needs. You add a float to a variable exactly like a whole number: take the current value, add the reward, and store it back. Add your pay to your gold."`

- [ ] **Step 16: Keep Beat 4 — plates and change (current line 569)**

`prompt:` → `"Work out the plates and your change"`
replace `lesson:` → `"Two operators split things into whole shares. Floor division, written with two slashes, finds how many whole times one number fits inside another, so it tells you how many plates your coin buys. Modulo, written with a percent sign, gives the leftover after that division, which is your change. Set one variable for the pieces and one for the change."`

- [ ] **Step 17: Update the `KEEP_MANIFEST_LESSON` constant**

Find the declaration `const KEEP_MANIFEST_LESSON = "..."` (a string constant defined near the top of `lesson1.js`'s keep section) and replace its string value with:

```
"Read the captain's checklist on the wall, then record how many of each item you load: armour, food, and water. An if statement runs a line only when its condition is true, so the checklist can count itself and confirm the load is correct. Match the exact amounts and keep the total weight within the limit."
```

(If `KEEP_MANIFEST_LESSON` already contains the literal answer numbers or any em dash, this replacement removes them. Do not change `KEEP_MANIFEST_RUN`.)

- [ ] **Step 18: Scan for stray em dashes in the edited copy**

Run: `node -e "const s=require('fs').readFileSync('lesson1.js','utf8'); const lines=s.split(/\r?\n/); let bad=[]; lines.forEach((l,i)=>{ if(/(prompt|lesson):/.test(l) && /—|--/.test(l)) bad.push((i+1)+': '+l.trim()); }); console.log(bad.length? 'EM DASH FOUND:\n'+bad.join('\n') : 'no em dashes in prompt/lesson lines'); process.exit(bad.length?1:0);"`
Expected: `no em dashes in prompt/lesson lines`. If any line is flagged, reword it to remove the `—` or `--` and re-run.

- [ ] **Step 19: Verify syntax + journal intact**

Run: `node --check lesson1.js && node journal-verify.mjs`
Expected: no syntax errors; `ALL JOURNAL CHECKS OK`.

- [ ] **Step 20: Browser verification (real browser, fresh port)**

Serve `python -m http.server 8021` and open `http://localhost:8021/lesson1.html`. Play (DEV-jump as needed) and verify on several beats (the print, the gather, the for loop, the toll, Beat 3 float, Beat 4 `// %`):
1. Each step shows its **rich description** in the panel above the editor, with **no literal answer** in the prompt or description.
2. Pressing **💡 Hint** reveals the example as greyed ghost text; the answer still validates when typed.
3. No em dashes appear anywhere in the on-screen copy.
4. The watchword beat reads cleanly (no em dashes) and still works with the Hint button hidden.
5. Lessons still validate and the game plays through unchanged.

- [ ] **Step 21: Commit**

```bash
git add lesson1.js
git commit -m "content(lessons): rich answer-free descriptions; answers moved to hint"
```

---

## Notes for the implementer

- **Headless caveat:** verify in a real browser on a fresh port (cache bites on reused ports); do not rely on headless screenshots for CodeMirror/Pyodide.
- Only `prompt`/`lesson` string literals (and `KEEP_MANIFEST_LESSON`) change in Task 2. Do not touch `validate`, `placeholder`, `seed`, `requireOp`, `append`, `rows`, or the `onCode` callbacks.
- The free-roam, combat-fire, and keep-explore prompts are intentionally left as-is (mechanical navigation, no single puzzle answer).
