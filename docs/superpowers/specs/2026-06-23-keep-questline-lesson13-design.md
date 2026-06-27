# Lesson 1.3 — "Proving Yourself in the Keep" — Design Spec

_Date: 2026-06-23 · Project: Tower Logic (Critter Forge), `C:\Users\Ryan\critter-forge`, in `lesson1.js` / `lesson1.html`_

## Overview

Lesson 1.3 is the **keep questline**: a 4-beat quest given by the knight-captain that **gates the merchant stalls and the king's-chamber staircase** until completed. Each beat teaches one new Python concept, **explained thoroughly in-game** as it appears. It also advances the storyline (the army needs a scout) and unlocks the armory.

**Concepts taught (in order):** the `if` statement · a counter pattern · the `+=` shorthand (shown == its long form) · `==` vs `<=` · **reading code to find requirements** · interactive `input()` · `if/else` · `==` on strings · `float` · `//` (floor division) · `%` (modulo).

**Teaching principle:** before/while each new concept is used, the in-game lesson panel gives a clear, plain-language explanation with a concrete analogy. `+=` is explicitly taught as the same as `x = x + 1`, and reused later so it sticks.

## Fiction / player flow

The knight-captain won't let you trade until you've proven useful:
1. **Pack a supply cart** in the storage room (read the captain's checklist, grab exact amounts).
2. **Raft across** to the army camp.
3. **Speak the watchword** to be trusted; receive the army's report.
4. **Carry the report back** to the knight; he pays you a reward (a float) → **unlocks the armory**.
5. **Buy scout armor** at the armory (compute pieces + change with `//` and `%`).
Completing the chain opens the keep fully and sets up the next quest ("scout ahead", toward the locked chamber / Lesson 2).

---

## Beat 1 — The Manifest (storage room) — the `if` statement

**Scene:** a new mini-scene `storage` (shelves/crates, a supply cart, piles of armor/food/water). Entered when the player walks to the knight and accepts the mission (`you.walk("storage")` or auto-walk after the knight's dialogue).

**Mechanic:** The player is shown a read-only program and **writes only the three quantity assignments**. They must **read the four `if` checks** to learn the exact amounts to grab.

Read-only scaffold (shown as read context); the player writes the three `armor/food/water` lines:
```python
# --- you write these three lines ---
armor = ?
food  = ?
water = ?

# --- the captain's checklist (read it!) ---
weight = armor*10 + food*4 + water*3
checklist = 0
if weight <= 30:            # the cart's weight limit
    checklist = checklist + 1
if armor == 1:
    checklist = checklist + 1
if food == 2:
    checklist = checklist + 1
if water == 1:
    checklist = checklist + 1
if checklist == 4:          # all four passed → you may pass
    board_raft()
```
**Answer:** `armor=1, food=2, water=1` → weight 21 ≤ 30 → checklist 4.

**Validation:** run `<player's 3 lines>` + the read-only check; require `checklist == 4`. Too little/too many → an `==`/`<=` check fails → checklist < 4 → guard blocks: _"The cart's not right — read the captain's checklist again."_

**Lesson panel(s):**
- _The `if` statement runs the indented line only when its condition is true. `if armor == 1:` asks "is armor exactly 1?" — yes → run the next line; no → skip it._
- _A counter: `checklist = checklist + 1` takes checklist's value, adds one, stores it back. Python's shorthand for exactly this is **`checklist += 1`** — same thing, less typing._

**On pass:** board a raft → **float-across transition** (reuse clearing water art) to the army camp (Beat 2).

**Implementation:** the read-only check is shown in the prompt/lesson area; the player types the 3 assignment lines in the input. Harness appends the check (with `board_raft` defined as a no-op) and reads back `checklist`.

---

## Beat 2 — The Watchword (army camp) — interactive `input()` + `if/else`

**Pre (in the keep, knight's mission dialogue):** the knight gives the watchword (e.g. `ironwatch`) and it's **logged to the Command Journal** (`Watchword: ironwatch`) so a careful player can check it.

**Scene:** a new mini-scene `camp` (tents, a sentry NPC, the captain). Arrived by raft.

**Mechanic:** the sentry demands the watchword. The player writes code that **asks them to type it** (`input()`), then branches:
```python
secret_string = input()             # a prompt appears — YOU type the watchword
if secret_string == WATCHWORD:      # WATCHWORD = the word the captain gave you (hidden value)
    print("Pass, friend.")
else:
    print("Halt! We don't know your face.")
```
`WATCHWORD` is **seeded by the harness** (hidden value `"ironwatch"`) so the answer can't be read from the code — the player must *know/type* it.

**Interactive `input()` (build piece):** wire Pyodide's `input()` to a real prompt. On Run, when the code calls `input()`, show a small in-game prompt for the player to type into and feed that string to `input()` (e.g. `pyodide.setStdin` returning a pre-collected value, or `window.prompt` as a first cut).

**Validation:** "the army trusts you" iff `secret_string == "ironwatch"` (player typed it correctly) AND the code uses `input()` and an `if/else`. Wrong word → the `else` branch turns you back; retry (re-check the journal).

**On pass:** the camp captain hands you the **storyline report** (shown as dialogue): _"The city's being reclaimed — but something older stirs in the dark. We need a scout."_ Then return to the knight.

**Lesson panel:** _`input()` is the program asking YOU a question and waiting for your answer. `if/else` makes a two-way decision: the `if` line runs when true, the `else` line runs when it's false. `==` compares two values for being equal — it works on words (strings) too._

---

## Beat 3 — Report back & reward (keep) — `float` + `+=` reuse

**Flow:** return to the knight (`you.walk("knight")`), he reads the report (storyline beat), then pays you a reward — a decimal amount.
```python
reward = 1.75      # a float: a number WITH a decimal point (gold isn't always whole)
gold += reward     # add it to your purse — the += shorthand from the checklist
```
**Validation:** `gold == <carried gold> + 1.75` (tolerance), `reward == 1.75`, src uses `+=` (or `+`). Seed `gold` = the player's current `char.gold`.

**On pass:** `char.gold` updated; **the armory (armorsmith stall) unlocks.**

**Lesson panel:** _A `float` is a number with a decimal part (1.75, 0.50), unlike whole numbers (ints) like 3 — money needs floats. And `gold += reward` is the same `+=` shortcut you met with the checklist: it adds `reward` onto `gold`._

---

## Beat 4 — The Armory (`%` modulo, with `//`)

**Flow:** walk to the now-unlocked armorsmith and buy scout armor. Pieces have a fixed price; compute how many you can afford and the change.
```python
piece_cost = 0.50
pieces = gold // piece_cost      # how many WHOLE pieces you can afford → 3
gold   = gold % piece_cost       # the change left over after buying → 0.25
```
(For this lesson `gold` is **reseeded to a clean, binary-exact value** — e.g. `gold = 1.75`, `piece_cost = 0.50` — so `//` and `%` give tidy results and avoid float-imprecision; the leftover becomes the player's new gold.)

**Validation:** `pieces == floor(gold/0.5)`, `gold == oldGold % 0.5` (tolerance), src uses `//` and `%`.

**On pass:** scout armor acquired; keep fully open; the **king's chamber** can unlock (`lesson1Done = true`) and the next quest ("scout ahead") is set up.

**Lesson panel:** _`//` (floor division) divides and drops the remainder — "how many whole pieces fit." `%` (modulo) gives ONLY the remainder — "what's left over." Like paying with coins: `//` is how many you spend, `%` is your change._

---

## New scenes / art (reuse the existing pixel language)

- **`storage`** (Beat 1): interior — shelves, crates, a supply cart, labelled piles (armour/food/water).
- **Raft transition** (Beat 1→2): a raft drifting across water (reuse the clearing's water/ripples).
- **`camp`** (Beat 2): army tents, a sentry NPC, the captain.
- Beats 3–4 reuse the existing keep + the armorsmith stall.

## Integration with `lesson1.js`

- **Gating:** in the keep, walking to the knight starts the questline. Until it's complete, the four stalls reply _"the captain hasn't cleared you to trade"_ (locked); the armory opens after Beat 3; the chamber opens (`lesson1Done = true`) after Beat 4.
- **Scenes:** add `storage` and `camp` to `SCENES`, with `drawStorage`/`drawCamp` and `fadeTo`/raft transitions, mirroring the existing scene pattern.
- **Knight dialogue:** updated to give the mission + watchword (logged via `logCmd`/journal).
- **Harness:** add interactive `input()`; per-beat `seed` for `WATCHWORD` and `gold`; keep returning `{vars, walk, fires, stdout}` (already present).
- **Quest state:** a `questStep` variable drives which beat is active and what's unlocked.

## Validation / fairness

All four puzzles are **fixed-answer, read-the-code** challenges (no held-out seeds needed). The "anti-cheese" is comprehension: you must read the checklist/check to pass, or know the watchword. Wrong answers give a specific, gentle nudge and let you retry.

## Build order

1. **Beat 1** — storage room + the `if`-checklist (richest, self-contained).
2. **Raft transition + Beat 2** — camp + **interactive `input()`** + `if/else` (includes the input() harness work).
3. **Beat 3** — report-back + float reward (+ armory unlock).
4. **Beat 4** — armory + `%`/`//`.
5. **Questline gating** — stalls locked until done; armory unlock; `lesson1Done` → chamber opens.

## Out of scope (later)

- The actual stall *shop* functionality beyond Beat 4's armory purchase (craftsman/forhire/blacksmith full shops).
- The "scout ahead" next-area / Lesson 2 content (only set up here).
- Prettifying the interactive `input()` prompt beyond a functional first cut.
