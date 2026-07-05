# Workshop Rewrite (EXPLANATION + TASK) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the workshop phase's copy with Ryan's EXPLANATION + TASK script: simplified panels, trimmed craftsman dialogue, staged stutter-first Beat 4, fail-first Beats 5/7 via reworded error translations, his hints, his walkthrough lines, his concept panes.

**Architecture:** Content swap in `lesson1.js` (`playTypesArc` fully replaced, `DECIPHER` tasks/prompts/hints replaced, `playWorkshop` open trimmed, `translate()` two messages reworded), `curriculum.js` (five pane texts), and drive updates. Round mechanics, board behavior, reveal, and validators' branch logic are unchanged except Beat 4's new staged branch.

**Tech Stack:** Vanilla JS + Pyodide; Playwright driver at `C:\Users\Ryan\AppData\Local\Temp\sts-drive` (`{ channel: 'chrome', headless: true }`; server http://localhost:8931, start `python -m http.server 8931 --directory C:\Users\Ryan\critter-forge` in background if down).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-05-workshop-rewrite-design.md` (Ryan's script governs; all copy below is his, verbatim where quoted). No em dashes in player-facing strings.
- Tab-skip: every prefill-or-placeholder passes its own validator (skipStep prefers placeholder).
- Unchanged: given/answer code per beat, round rules/pairs/inputValue feeds/reruns, pairs-first pending pairs, stdout-on-board, the HUNT reveal says, implantStep flow.
- Commits LOCAL until the controller pushes after final review. Anchors govern (baseline `a63a7af`). `node --check` after every lesson1.js edit.
- Drive conventions as established (`#pystat` wait, Tab auto-run, CodeMirror setValue + `#run`, `#status`, fillText hook, dialogs accept '14', Tab-until-`.wt-next`).

---

### Task 1: Concept panes + error translations + walkthrough lines

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\curriculum.js` (types, convert, float, input, bool entries)
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` (`translate()` two messages; `WT_TYPES.steps`)

**Interfaces:** Produces the reworded ValueError/TypeError messages Task 2's drives assert.

- [ ] **Step 1: curriculum.js pane texts**

Replace the `teach` and `remind` values of these entries (ids and other fields untouched):

- `types.teach`: `"Every value has a type. str is text: \"12\". int is a whole number: 12. float keeps a decimal point: 7.5. bool is True or False. The type decides what a value can do. Numbers calculate. Text repeats. type() names the type."`
- `types.remind`: `"Check it with type()."`
- `convert.teach`: `"Casting converts a value to another type. int(raw) makes a whole number from text. float(raw) keeps the point. str(out) makes text from a number. Two laws: int() cuts, it never rounds. input() always hands you text, so cast before you calculate."`
- `convert.remind`: `"Cast first: int(raw) before math."`
- `float.teach`: `"A float is a number with a decimal point, like 7.5. Math on floats works exactly like whole numbers, and the answer keeps its point."`
- `float.remind`: unchanged (`"It is a float. The math works the same."`)
- `input.teach`: `"input() pauses the program and asks YOU a question. Whatever you type comes back as text, always, even digits."`
- `bool.teach`: `"A comparison like signal > 0 comes out True or False. That is a bool. You can store it in a variable like any number. Chain questions with and: the whole thing is True only when both sides are."`

- [ ] **Step 2: translate() rewording**

In `lesson1.js`:
- The line returning `"The int mold only takes whole-number marks. These marks carry a point in them; cast with float() instead."` becomes: `return "int() only takes whole numbers. This one has a point. Use float().";`
- The line returning `"You mixed bare numbers with marks. Cast the number into marks first: str(out)."` becomes: `return "You mixed a bare number with text. Cast it: str(out).";`

- [ ] **Step 3: WT_TYPES steps**

Replace the six step texts (code block and lines arrays unchanged):
1. `"Quotes make a str. \"12\" is text, not twelve."`
2. `"int(marks) casts text into a whole number. Now math works."`
3. `"A bare number with a point is a float. It keeps the point forever."`
4. `"int() cuts, it never rounds. int(7.9) is 7."`
5. `"str() runs backward: number into text. Cast before you glue."`
6. `"A question comes out True or False: a bool. Every decision is built from it."`

- [ ] **Step 4: Verify + commit**

`node --check C:\Users\Ryan\critter-forge\lesson1.js` → exit 0. `node --input-type=module -e "import('./curriculum.js').then(m => console.log(m.CONCEPTS.types.remind, '|', m.CONCEPTS.convert.remind))"` (from the repo dir) → prints the two new reminds. Grep both files for `—` in the edited strings → none.

```powershell
git -C C:\Users\Ryan\critter-forge add curriculum.js lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "feat(rewrite): Ryan's concept panes, plain error casts, one-line slate steps"
```
(Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.)

---

### Task 2: The arc + rounds copy swap

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` (`playWorkshop` open, `playTypesArc` full replacement, `DECIPHER` array)
- Modify: `C:\Users\Ryan\critter-forge\docs\dialogue-workshop.md` (replace body with the shipped script; header notes it reflects the live game)

**Interfaces:** Consumes Task 1's translations (drives assert them). New ask prompts (drives): `Run the failed probe`, `Recreate the stutter yourself`, `Check every type`, `Cast text into a number`, `A number with a point in it`, `Pour a float into int`, `Label the board`, `Your own probe, your own question`, `Steal rule 1|2|3`.

- [ ] **Step 1: Trim the scene open**

In `playWorkshop`'s else branch, the three lines (two says + narrator say) become exactly:

```js
    await say("Craftsman", "So you are the scout. Hand it here. Careful. CAREFUL.");
    await say("Craftsman", "It still ANSWERS. I crank a signal in, it answers out. Every machine keeps rules between the in and the out. We are going to steal them.");
```

(The narrator vice line is removed.)

- [ ] **Step 2: Replace `playTypesArc` entirely**

Delete the current function body (from `async function playTypesArc() {` through its closing `}`) and replace with:

```js
async function playTypesArc() {
  await say("Craftsman", "Before we steal its rules, you should know why I FAILED all night. I cranked twelve in. It answered one-two-one-two. Garbage.");
  workshopPairs.push("IN 12 -> OUT 1212 ??");
  await ask({
    prompt: "Run the failed probe",
    prefill: 'raw = "12"\nprint(raw * 2)', readonly: true, rows: 2,
    concept: "types",
    task: '"12" in quotes is not a number. It is text. Python calls text a str. When you multiply text by 2, Python does not do math. It repeats the text. That is why 12 came out as 1212.\n\nTASK:\nPress Run. Watch "12" * 2 print 1212.',
    validate: (r) => (r.stdout.trim() === "1212" ? null : "Just press Run; the code is already written."),
  }, null);
  await say("Craftsman", "One-two-one-two. The wire was handing me TEXT the whole time. See for yourself.");
  await say("Craftsman", "This time YOU feed the wire. Type any two-digit number when it asks.");
  await ask({
    prompt: "Recreate the stutter yourself",
    prefill: "marks = input()\n",
    placeholder: "marks = input()\nprint(marks * 2)\nprint(type(marks))", rows: 3,
    inputPrompt: "The crank is yours. Type any two-digit number:", inputDefault: "34",
    concept: ["types", "input"],
    task: "input() asks you a question and hands back whatever you type. Here is the trap: input() ALWAYS hands back text, even when you type digits. A keyboard makes text, not numbers.\n\nTASK:\nLine 1 is already written: marks = input()\n1. Add: print(marks * 2)\n2. Add: print(type(marks))\n3. Run it. Type any two digit number in the box.\nYour number will stutter (34 becomes 3434) and type() will say str.\nDo NOT cast anything yet.",
    validate: (r) => {
      if (/\bint\s*\(/.test(lastSrc)) return "No casting yet. We want to see the stutter first.";
      if (typeof r.vars.marks !== "string" || !/^\d\d$/.test(r.vars.marks)) return "Type a two digit number in the box (line 1 does the asking).";
      const twice = r.vars.marks + r.vars.marks;
      if (!r.stdout.includes(twice)) return `Add print(marks * 2). Type ${r.vars.marks} and the machine prints ${twice}.`;
      return r.stdout.includes("'str'") ? null : "Now add print(type(marks)) to see the type.";
    },
  }, null);
  await say("Craftsman", "Your digits, doubled into longer text. A keyboard makes text, not numbers.");
  await say("Craftsman", "Here is your experiment back, with three more values wired beside it. The marks check is written. Check the rest.");
  await ask({
    prompt: "Check every type",
    prefill: 'marks = "34"\necho = marks * 2\ncount = 34\nvolts = 7.5\narmed = True\nprint(type(marks))\n',
    placeholder: 'marks = "34"\necho = marks * 2\ncount = 34\nvolts = 7.5\narmed = True\nprint(type(marks))\nprint(type(echo))\nprint(type(count))\nprint(type(volts))\nprint(type(armed))', rows: 10,
    concept: "types",
    task: "Every value in Python has a type. There are four here:\nstr: text (\"34\")\nint: a whole number (34)\nfloat: a number with a decimal point (7.5)\nbool: True or False\ntype() tells you which type a value is. The type decides what a value can do. Numbers calculate. Text repeats.\n\nTASK:\nThe check for marks is already written. Add four more lines:\n1. print(type(echo))\n2. print(type(count))\n3. print(type(volts))\n4. print(type(armed))\nRun it and read all five types off the board.",
    validate: (r) => {
      if (!/type\s*\(\s*echo\s*\)/.test(lastSrc)) return "Same pattern every time: print(type(echo)).";
      if (!/type\s*\(\s*count\s*\)/.test(lastSrc)) return "Same pattern every time: print(type(count)).";
      if (!/type\s*\(\s*volts\s*\)/.test(lastSrc)) return "Same pattern every time: print(type(volts)).";
      if (!/type\s*\(\s*armed\s*\)/.test(lastSrc)) return "Same pattern every time: print(type(armed)).";
      if (!r.stdout.includes("'int'") || !r.stdout.includes("'float'") || !r.stdout.includes("'bool'")) return "Run all five checks and read the types.";
      return null;
    },
  }, null);
  await say("Craftsman", "Text repeats. Numbers calculate. There is the whole clue. Now the trick I never knew: the one where you teach ME.");
  await say("Craftsman", "I crank twelve in. The board waits on the OUT, because the missing half of this circuit is YOU.");
  workshopPairs.push("IN 12 -> OUT ?"); workshopSpark = 1;
  await ask({
    prompt: "Cast text into a number",
    prefill: 'raw = "12"\n',
    placeholder: 'raw = "12"\nsignal = int(raw)\nprint(signal * 2)', rows: 3,
    concept: "convert",
    task: "Casting converts a value from one type to another. int(raw) takes the text \"12\" and turns it into the number 12. Once it is a real number, math works.\n\nTASK:\nLine 1 is already written: raw = \"12\"\n1. First add print(raw * 2) and run it. Watch the stutter: 1212.\n2. Now add: signal = int(raw)\n3. Change your print to: print(signal * 2)\n4. Run it. You should get 24.",
    validate: (r) => {
      if (!/\bint\s*\(/.test(lastSrc)) {
        if (r.stdout.includes("1212")) return "There is the stutter, on the board. Now cast it: signal = int(raw) and print signal * 2 instead.";
        return "See the stutter first: print(raw * 2). Then cast it: signal = int(raw).";
      }
      if (typeof r.vars.signal !== "number") return "signal is still text. Cast it: signal = int(raw).";
      if (r.vars.signal !== 12) return "Cast raw itself. Do not type your own number.";
      return /(^|\n)24\s*$/.test(r.stdout.trim()) ? null : "Change your print to: print(signal * 2). You should get 24.";
    },
  }, null);
  { const pi = workshopPairs.lastIndexOf("IN 12 -> OUT ?"); if (pi >= 0) workshopPairs[pi] = "IN 12 -> OUT 24"; }
  await say("Craftsman", "TWENTY-FOUR. All night I fought this thing, and you fix it with one cast.");
  await say("Craftsman", "Now a half-strength probe.");
  workshopPairs.push("IN 7.5 -> OUT ?"); workshopSpark = 1;
  await ask({
    prompt: "A number with a point in it",
    prefill: 'raw = "7.5"\n',
    placeholder: 'raw = "7.5"\nstrength = float(raw)\nprint(strength * 2)', rows: 3,
    concept: ["convert", "float"],
    task: "\"7.5\" is text with a decimal point in it. int() only accepts whole numbers. Feed it \"7.5\" and it errors. float() is the right tool. A float is a number that keeps its decimal point. 7.5 doubled is 15.0, point and all.\n\nTASK:\nLine 1 is already written: raw = \"7.5\"\n1. First try: strength = int(raw). Run it. Watch it fail.\n2. Change it to: strength = float(raw)\n3. Add: print(strength * 2)\n4. Run it. You should get 15.0.",
    validate: (r) => {
      if (!/float\s*\(/.test(lastSrc)) return "These marks carry a point. Cast with float(raw).";
      if (typeof r.vars.strength !== "number") return "strength should come out a number: strength = float(raw).";
      return r.stdout.includes("15.0") ? null : "Print strength * 2. The answer keeps its point.";
    },
  }, null);
  { const pi = workshopPairs.lastIndexOf("IN 7.5 -> OUT ?"); if (pi >= 0) workshopPairs[pi] = "IN 7.5 -> OUT 15.0"; }
  await say("Craftsman", "Fifteen POINT ZERO. The float keeps its point. So what happens when you pour it into the int mold?");
  await ask({
    prompt: "Pour a float into int",
    prefill: 'strength = 7.5\n',
    placeholder: 'strength = 7.5\nwhole = int(strength)\nprint(whole)\nprint(int(7.9))', rows: 4,
    concept: "convert",
    task: "int() does NOT round. It cuts. Everything after the decimal point is thrown away. int(7.5) is 7. int(7.9) is also 7, even though 7.9 is almost 8. If you want rounding, you must ask for rounding. int() never gives it.\n\nTASK:\nLine 1 is already written: strength = 7.5\n1. Add: whole = int(strength)\n2. Add: print(whole)\n3. Add: print(int(7.9))\nGuess both answers before you press Run.",
    validate: (r) => {
      if (!/\bint\s*\(/.test(lastSrc)) return "Use the int mold: whole = int(strength).";
      if (r.vars.whole !== 7) return "whole = int(strength).";
      const lines = r.stdout.trim().split(/\n/);
      return lines.length >= 2 && lines[0].trim() === "7" && lines[1].trim() === "7" ? null : "Print whole, then print int(7.9). Two lines, two answers.";
    },
  }, null);
  await say("Craftsman", "Seven, and seven AGAIN from a value nearly touching eight. The mold cuts. It never rounds.");
  await ask({
    prompt: "Label the board",
    prefill: 'out = 15\n',
    placeholder: 'out = 15\nlabel = "OUT " + str(out)\nprint(label)', rows: 3,
    concept: "convert",
    task: "You cannot glue text and a number together with +. \"OUT \" + 15 errors because one side is text and the other is a number. str() runs the other direction: it turns the number 15 into the text \"15\". Once both sides are text, + joins them.\n\nTASK:\nLine 1 is already written: out = 15\n1. First try: print(\"OUT \" + out). Run it. Watch it fail.\n2. Add: label = \"OUT \" + str(out)\n3. Add: print(label)\n4. Run it. It should read: OUT 15",
    validate: (r) => {
      if (!/str\s*\(/.test(lastSrc)) return "Turn the number into text first: str(out).";
      if (typeof r.vars.label !== "string") return 'Store it: label = "OUT " + str(out).';
      return r.stdout.includes("OUT 15") ? null : "Print the label. It should read: OUT 15";
    },
  }, null);
  await say("Craftsman", "Three molds now: int(), float(), str().");
  await say("Craftsman", "One type left. YOU crank.");
  await ask({
    prompt: "Your own probe, your own question",
    placeholder: 'raw = input("signal to send:")\nsignal = int(raw)\nstrong = signal >= 10\nprint(strong)', rows: 4,
    inputPrompt: "Your hand is on the crank. Send a whole number down the wire:", inputDefault: "14",
    concept: ["convert", "input", "bool"],
    task: "A comparison like signal >= 10 is a question. Python answers with True or False. That answer is a bool, the fourth and smallest type. You can store it in a variable like any other value. Every decision a machine makes is built from this type.\n\nTASK:\n1. Take the crank: raw = input(\"signal to send:\")\n2. input() gave you text. Cast it: signal = int(raw)\n3. Store the question: strong = signal >= 10\n4. print(strong)\nRun it and type a whole number. You will see True or False.",
    validate: (r) => {
      if (!/input\s*\(/.test(lastSrc)) return "Start with input().";
      if (!/\bint\s*\(/.test(lastSrc) || typeof r.vars.signal !== "number") return "Cast before you compare: signal = int(raw).";
      if (typeof r.vars.strong !== "boolean") return "Store the question itself: strong = signal >= 10.";
      if (r.vars.strong !== (r.vars.signal >= 10)) return "strong must hold exactly the question signal >= 10.";
      return null;
    },
  }, null);
  await say("Craftsman", "True or False and nothing else: bool. The machine's whole soul is questions poured into that smallest mold.");
  if (walkthroughsEnabled() && !walkthroughSeen(WT_TYPES.id)) await showWalkthrough(WT_TYPES);
  await say("Craftsman", "Four types. Three molds. One law about the cut. NOW we steal its rules.");
}
```

- [ ] **Step 3: DECIPHER copy**

Per entry, replace `prompt`, `task`, and the validator's message strings (structure and all mechanics untouched):

- R1 `prompt: "Steal rule 1"`, `task: "The board shows pairs the machine already answered:\nIN 2 -> OUT 5. IN 4 -> OUT 9. IN 7 -> OUT 15.\nYour steps must turn IN into OUT for EVERY pair, not just one.\n\nTASK:\nLine 1 is already written: raw = input()   (the machine feeds 7)\n1. Cast first: signal = int(raw)\n2. Study the pairs. Find the one rule that fits all three.\n3. Set out from signal so every pair matches."`
- R2 `prompt: "Steal rule 2"`, `task: "if runs its lines only when a question is True. else runs when the question is False. One if plus one else covers every possible signal.\n\nTASK:\nLine 1 is already written: raw = input()   (the machine feeds 12)\n1. Cast first: signal = int(raw)\n2. Read the pairs: IN 4 -> 0. IN 9 -> 0. IN 12 -> 2. IN 15 -> 5.\n   Below ten the machine answers 0. Ten and above, it answers signal minus 10.\n3. Write it: an if for the weak signals, an else for the rest."`
- R3 `prompt: "Steal rule 3"`, `task: "One machine can hold two behaviors at once. The if decides which one runs. That is the whole trick.\n\nTASK:\nLine 1 is already written: raw = input()   (the machine feeds 20)\n1. Cast first: signal = int(raw)\n2. Read the pairs: IN 3 -> 4. IN 8 -> 9. IN 12 -> 24. IN 20 -> 40.\n   Weak signals gain one. Strong signals double.\n3. Write both behaviors with one if and one else."`

In `runDecipherRounds`' validator, the four message strings become:
- cast: `"The wire gave you text. Cast first: signal = int(raw)."`
- if: `"Ask the question first: an if line about signal, ending with a colon."` (unchanged)
- else: `"The if answers the yes. You still need an else for every no."`
- disagree: `` `The board disagrees. IN ${R.seed} must come OUT ${R.expect(R.seed)}. Your steps made ${r.vars.out === undefined ? "nothing" : r.vars.out}.` ``
- fresh probe: `` `Fresh probe: IN ${h}. Your steps say ${rr2.vars.out === undefined ? "nothing" : rr2.vars.out}. The machine says ${R.expect(h)}. Your rule must answer EVERY signal.` ``

- [ ] **Step 4: Refresh the transcript doc**

Overwrite `docs/dialogue-workshop.md`'s body so it reflects the shipped script (Ryan's EXPLANATION + TASK blocks, the trimmed say lines from the spec, the new hints); keep a one-line header noting it mirrors the live game as of this commit.

- [ ] **Step 5: Verify**

`node --check` → exit 0. Hand-trace every placeholder against its (re-messaged) validator — logic unchanged except Beat 4's staged branch; trace Beat 4's three paths: uncast+stutter, uncast+no-output, cast placeholder (stdout "24" matches `/(^|\n)24\s*$/`).

Update drives in `C:\Users\Ryan\AppData\Local\Temp\sts-drive`:
- `q5-types-arc.mjs` beats array → the eight new prompts (in order): `Run the failed probe`, `Recreate the stutter yourself`, `Check every type`, `Cast text into a number`, `A number with a point in it`, `Pour a float into int`, `Label the board`, `Your own probe, your own question`; rounds gate string → `Steal rule 1`.
- `q6-types-full.mjs`: same prompt strings; expected message substrings → T4 naive: `Use float()`, T5 glue: `Cast it: str(out)`, R1 no-cast: `Cast first: signal = int(raw)`, hardcode: `Your rule must answer EVERY signal`; round gates → `Steal rule 1/2/3`. Add one Beat 4 staged assertion: at the `Cast text into a number` prompt, `setCode('raw = "12"\nprint(raw * 2)')`, run, and log the status (expect `There is the stutter`).
Run both drives. Expected: q5 `ARC COMPLETE, ROUNDS REACHED` + none; q6 all green including the new staged message, `PLAYER OUTPUT ON BOARD: true`, HUNT, DEPLOYED, PAGEERRORS none. READ the HUNT screenshot.

- [ ] **Step 6: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js docs/dialogue-workshop.md
git -C C:\Users\Ryan\critter-forge commit -m "feat(rewrite): Ryan's EXPLANATION + TASK script for the whole workshop (staged stutter-first cast beat, trimmed craftsman, plain hints)"
```
(Trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.)

---

## Self-review notes

- Script coverage vs Ryan's doc: scene open (his 2 lines), Beats 1-8 EXPLANATION+TASK verbatim into `task:` strings, his hints mapped to the existing validator branches (Beat 4 gains the staged branch; no other logic change), slate lines (Task 1), rounds 1-3 EXPLANATION+TASK + his hint wordings, concept panes (Task 1), translations (Task 1). Reveal untouched per his omission.
- Tab-skip traces: all placeholders unchanged from the shipped ones except none; each passes (Beat 4's placeholder stdout "24" matches the end-anchored check).
- Em-dash scan: clean (his script and all quoted strings).
- Type consistency: prompts referenced in Step 5's drive lists match Step 2/3's strings exactly.
