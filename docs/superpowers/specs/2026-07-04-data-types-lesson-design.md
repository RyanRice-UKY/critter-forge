# The Shapes of Values — Data Types Lesson (Workshop Rework)

Rework the craftsman's decipher phase (1.5) into the campaign's
comprehensive lesson on data types and type casting. A six-beat teaching
arc runs before the three decipher rounds; the rounds then require the
conversion habit. The craftsman explains everything through his own
trade: values have SHAPES, and CASTING pours a value into a new mold;
whatever does not fit the mold is lost.

## Context

- File: `lesson1.js` (arc + rounds), `curriculum.js` (new concepts),
  `journal-data.js` (journal entries).
- The player enters knowing: print, variables, arithmetic (used ints and
  floats without naming them), strings (printed them), input() (the
  watchword gate), if/else, comparisons, for loops. Types have been USED
  but never NAMED. This lesson formalizes them.
- Everything else in 1.5 is untouched: implantStep flow, workshop art,
  HUNT reveal, epilogue, DEV 1.5, board rendering contract.
- The story device: when the craftsman first wired the implant he got
  garbage (cranked 12, machine echoed 1212) because the wire hands over
  MARKS (text), not numbers. He never solved it. The player does.

## The teaching arc (six beats, replacing nothing; inserted after the
## workshop shell dialogue and before round 1)

Every beat is an `ask()` with concept tags, task text, and a validator.
All placeholders must pass their own validators (DEV Tab-skip rule).
The craftsman speaks before and after each beat; his voice does the
heavy explaining, in trade metaphors, at length. No em dashes.

**T1 — The stutter (read-only demonstration).**
Prefilled read-only code, player just runs it:
```python
raw = "12"
print(raw * 2)
```
Output: `1212`. The board logs the garbage pair (IN 12 -> OUT 1212 with
a ?? marker is acceptable flavor via a workshopPairs push). Craftsman:
same crank, same key, garbage answer, and it near drove him mad all
night. Then the reveal: look at the quotes. `"12"` is not a number. It
is text wearing a number's face. Python calls text `str`, short for
string: a string of marks. Multiply marks and Python REPEATS them, it
does not do arithmetic, because WHAT a value can do is decided by its
SHAPE. Introduce the word TYPE = the shape of a value.

**T2 — Ask a value its shape.**
Player writes (seeded `raw = "12"`):
```python
print(type(raw))
print(type(12))
```
Expected stdout contains `str` and `int`. Craftsman: type() is his
caliper, you hold any value up to it and it tells you the shape. Two
shapes so far: `str` (marks) and `int` (a whole number, integer, the
shape arithmetic works on).

**T3 — The first cast.**
Player writes (seeded `raw = "12"`):
```python
signal = int(raw)
print(signal * 2)
```
Expected: `signal` comes back as a NUMBER (the harness preserves types;
validator checks the JS typeof), stdout `24`. The machine answers clean
for the first time all night. Craftsman defines CASTING here, at the
victory moment: in his trade you cast metal, you pour it into a mold
and it takes the mold's shape. `int(raw)` is Python casting: pour the
marks into the int mold and out comes a true number. The parentheses
are the crucible.

**T4 — Float, and the cut (two-part beat).**
Part one: he cranks a half-strength probe, seeded `raw = "7.5"`. The
task text INVITES the naive attempt: try `int(raw)` first if you like.
Anyone who does sees the ValueError rendered in character by
`translate()` (see Infrastructure) as a coaching message, then fixes
it; the ask is editable throughout and its validator accepts only the
float() solution (the placeholder, so Tab-skip is safe). Player writes:
```python
strength = float(raw)
print(strength * 2)
```
Expected `15.0`. Craftsman: `float` is the third shape, a number that
carries a point. Notice the answer says 15.0 not 15: floats keep the
point even when nothing rides after it.
Part two, THE CUT: player writes:
```python
whole = int(strength)
print(whole)
print(int(7.9))
```
Expected `7` then `7`. This is the misconception-killer and it gets the
craftsman's best speech: pouring a float into the int mold does not
round to the nearest. The mold CUTS. Everything after the point drips
off the edge of the crucible and is gone. 7.5 becomes 7. 7.9, nearly 8,
still becomes 7. If you ever need rounding you ask for rounding; the
int mold never gives it to you for free. Validator: `whole === 7` and
stdout contains two lines of `7`.

**T5 — Casting back to marks.**
The board needs a label. The task text shows the naive line
`print("OUT " + out)` and dares the player to run it; doing so hits the
TypeError, translated in character: you nailed marks to a bare number;
cast the number into marks first. (Editable ask; the validator accepts
only the cast version, which is also the placeholder.) The player
writes:
```python
out = 15
label = "OUT " + str(out)
print(label)
```
Expected stdout `OUT 15`, and `label` comes back as a string. Craftsman:
`str()` is the mold that runs the other way, numbers into marks. Three
molds now: `int()`, `float()`, `str()`. Any value, any shape, if the
marks fit the mold.

**T6 — Bool, and the live probe (the input() beat).**
The fourth shape arrives with the player's own hand on the crank:
```python
raw = input("signal to send:")
signal = int(raw)
strong = signal >= 10
print(strong)
```
Uses the existing `inputPrompt`/`inputDefault` machinery (default "14",
accept-or-edit, like the watchword). The validator computes the
expected True/False from whatever number the player actually typed
(`r.vars.signal >= 10` must equal `r.vars.strong`), requires `int(` in
the source, and requires `signal` to be numeric. Craftsman: input()
ALWAYS hands you marks, even when the fingers typed digits, because a
keyboard makes marks, not numbers. And `strong` is the fourth shape,
`bool`, the smallest mold there is: two values fit in it, True and
False. The machine's whole soul (wait or move or hunt) is built from
questions poured into that little mold.

**The slate walkthrough (after T6).**
Using the existing walkthrough system (WT_ pattern, once per player),
the craftsman chalks the complete model on the slate and walks it line
by line with the arrow:
```python
marks = "12"          # str: text, a string of marks
signal = int(marks)   # cast: pour marks into the int mold
volts = 7.5           # float: a number that carries a point
cut = int(volts)      # the mold CUTS: cut is 7, never 8
label = "OUT " + str(cut)  # str(): the mold that runs backward
strong = signal >= 10 # bool: True or False, nothing else
```
Six steps, one per line, each restating the beat it came from.

## The rounds, reworked

All three decipher rounds keep their rules, pairs, visible/hidden
inputs, and messages, with one change: every seed becomes raw marks.
- Seeds: R1 `raw = "7"`, R2 `raw = "12"`, R3 `raw = "20"`.
- Hidden re-runs seed `raw = "<n>"` strings likewise.
- Every round's expected first line: `signal = int(raw)`.
- Validators additionally require `int(` in the source and numeric
  `r.vars.signal`, with an in-character message when missing ("the wire
  gave you marks; cast before you calculate").
- Placeholders updated to include the cast line (Tab-skip safe), rows
  bumped by 1.
- Round task texts updated to present pairs as before but note the wire
  delivers marks.

## Infrastructure

- `curriculum.js` CONCEPTS gains two entries:
  - `types`: teach = the shape idea, type() as the caliper, the four
    shapes named (str, int, float, bool); remind = "Check the shape
    with type()."
  - `convert`: teach = casting as pouring into molds, int()/float()/
    str(), the cut (int never rounds), input() always gives marks;
    remind = "Cast first: int(raw) before arithmetic."
  Existing `float`, `bool`, `input` entries are tagged where relevant
  (concept arrays are supported).
- `journal-data.js` gains matching journal entries (`types`, `convert`)
  so the clickable terms in the lesson pane land somewhere.
- `translate()` in lesson1.js gains two cases:
  - ValueError invalid literal for int(): "The int mold only takes
    whole-number marks. These marks have a point in them; cast with
    float() instead."
  - TypeError can only concatenate str / unsupported operand str+int:
    "You mixed bare numbers with marks. Cast the number into marks
    first: str(out)."
- The workshopPairs board may log the T1 garbage pair and T3's first
  clean pair as flavor; the RULE dividers and round pushes stay as
  they are.

## Constraints

- Tab-skip: every placeholder passes its own validator; T6's input
  default auto-accepts.
- No em dashes in player-facing strings.
- No changes to: implantStep values or order, playImplantHandIn,
  playSignalEpilogue, HUNT reveal, workshop art, board contract,
  drive-verified failure messages of the existing rounds (the new
  cast-check message is additive).
- XP: each ask awards its default 10; the scene bonus 30 unchanged.
- The teaching arc runs once (first workshop visit before rounds);
  revisits mid-arc resume from the rounds if the arc completed, per the
  existing linear await flow (a reload restarts the workshop visit like
  every other scene, which is the game's existing behavior).

## Out of scope

- Negative numbers and int()'s toward-zero behavior on negatives;
  round(); f-strings; string indexing. Later chapters.
- Trials for types/casting (Proving Grounds additions come separately).
