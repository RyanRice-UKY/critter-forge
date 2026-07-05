# Stutter Rework, input() Rounds, Board Layout — Design

Ryan's playtest revisions to the data-types lesson (approved 2026-07-05,
design restated and confirmed in chat).

## 1. Opening beats rebuilt

**T1 (unchanged):** run the craftsman's failed probe (`raw = "12"` /
`print(raw * 2)`, read-only) and see 1212. Keep the existing follow-up
line ("One-two-one-two. Do you see it now?...").

**T1b (new) — recreate it yourself, slightly differently:** the player
writes the same experiment with their OWN variable name and OWN
two-digit marks (e.g. `marks = "34"` / `print(marks * 2)` → 3434).
Validator: the source contains a quoted two-digit number, and stdout is
exactly that number repeated (derived from their source, any name, any
digits). Placeholder `marks = "34"` + print (Tab-skip safe).

**T2 (replaces the old caliper beat) — type-check the rest:** the
craftsman hands back working code shaped like what they just wrote,
print stripped, plus extra values of different shapes, with ONE caliper
line shown:

```python
marks = "34"
echo = marks * 2
count = 34
volts = 7.5
armed = True
print(type(marks))
```

(prefilled; the player adds `print(type(...))` for echo, count, volts,
armed). Validator: all four checks present in source; stdout includes
'int', 'float', 'bool'. The closing say reads the clue: marks and echo
are str (marks times two is just longer marks), count/volts/armed are
int/float/bool; the machine repeats text and calculates numbers. The
old caliper ask and its says are removed; their content folds into
these beats. T3 (first cast) onward unchanged.

## 2. Rounds feed through a visible input()

- New `ask()` option `inputValue`: when set (and no `inputPrompt`), the
  harness input is that string with no popup. One `else if` in
  `submit()`.
- Each decipher round: `prefill: "raw = input()\n"`, placeholder starts
  with that line (rows +1: R1 3, R2 6, R3 6), `seed:` replaced by
  `inputValue: String(R.seed)`, and hidden re-runs call
  `runUser(lastSrc, "", String(h))` (input-fed, not seed-fed).
- Task text prefix per round: "The wire feeds your code through
  input(): line 1 is already written. The crank is sending N. Cast
  before you calculate." (N = 7/12/20; R2/R3 say "Cast first.").
- Pairs-first per round: push `IN N -> OUT ?` (with spark) after the
  example probes and before the ask; rewrite it in place to
  `IN N -> OUT expect(N)` when the round passes.
- The crank-your-own-probe beat (T6) keeps its interactive
  `inputPrompt` (the player types); rounds now mirror its shape.

## 3. Workshop board layout

- **Swap:** the PROBE LOG moves to the tool pegboard's spot (top-left,
  ~x 0.16 W, y 0.14 H, taller: ~0.34 H) so the docked IDE can never
  cover it; the decorative pegboard moves down to the old board spot
  (~x 0.19 W, y 0.52 H, smaller) where IDE overlap is harmless.
- **Legend overlap fix:** the legend (`1 = WAIT   2 = MOVE   4 = HUNT`)
  gets a reserved strip at the board's foot (divider line above it);
  the log's visible line count is computed from the board height minus
  header and reserved strip, so log lines and legend can never collide
  at the HUNT reveal.

## Constraints

- Tab-skip: every prefill-or-placeholder passes its own validator.
- No em dashes in player-facing strings.
- Untouched: T3 cast beat onward (float/cut/str/T6), implantStep flow,
  HUNT sequence, epilogue, round rules/pairs/expects/reruns and their
  existing failure messages (only the input mechanism, prefix text, and
  pairs-first pushes change around them).
- Drives updated to the new prompts/flow; final screenshots must show
  the board top-left uncovered with the IDE open, and the HUNT reveal
  with legend cleanly below the log lines.
- CI must be green on push (this feature is the pipeline's first real
  exercise).
