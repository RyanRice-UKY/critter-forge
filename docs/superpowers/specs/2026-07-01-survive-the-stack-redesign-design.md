# Survive the Stack — Full Redesign Design

Date: 2026-07-01
Status: approved (user approved the brief in-session; "begin")

## Vision

One game, one promise: the player starts by watching code save their life, and ends by
writing it themselves. Every mechanic, screen, and story beat serves a single
scaffolding ladder that slowly transfers authorship of the Python from the game to the
player. Working title in UI: **Survive the Stack**.

## 1. The Scaffolding Ladder (pedagogy engine)

Every exercise carries a rung tag. Each NEW concept enters one rung below the player's
current comfort level.

| Rung | Name            | Player writes                              | Exists today?            |
|------|-----------------|--------------------------------------------|--------------------------|
| 1    | Watch           | nothing (engine types + runs the code)     | yes (cinematic beats)    |
| 2    | One Blank       | one glowing input inside a template        | yes (arena1 style)       |
| 3    | Finish the Line | one full line inside surrounding code      | partial (lesson1 asks)   |
| 4    | Guided Write    | 2–4 lines under a comment skeleton         | no                       |
| 5    | Free Write      | whole solution; goal + examples, no skeleton | no                     |
| 6    | Trial           | LeetCode-style: signature, visible examples, hidden held-out cases | no |
| 7    | Gauntlet        | multi-part Trial under story pressure; gates the chapter | no        |

Failure ladder: 2 failed runs → hint; 4 → partial skeleton (drop one rung).
Solving without hints earns bonus XP.

## 2. Curriculum Map (6 chapters, ~60 exercises)

Story arc: the outbreak came from the Lab. To end it, learn to think like the machine
that caused it.

1. **The Wildwood** (exists; retrofit): print, variables, arithmetic, strings, input(). Rungs 1–3.
2. **The Keep** (exists; extend): booleans, comparisons, if/elif/else, while. Rungs 2–4.
   First Trials unlock at a new "Proving Grounds" NPC.
3. **The Ruined City**: for, range, lists, indexing, slicing, len. Rungs 3–5.
   Scavenging runs; coded turret defenses of a convoy.
4. **The Survivors' Camp**: functions, return values, dicts, intro classes
   (build survivors as objects). Rungs 4–6.
5. **The Stronghold**: nested loops, list-of-dicts, sorting, algorithms.
   Mostly rung-6 Trials, easy→medium difficulty, story-skinned.
6. **The Lab**: predict-the-wave ML finale. The player's accumulated functions become
   the features of the final model.

Chapter = story beats (rungs 1–4) + a **Trial board** (rungs 5–6, optional, rewarded)
+ a Gauntlet boss.

## 3. UI Overhaul (game-like feel)

- **Title screen**: pixel logo, torchlit, Continue / New Game / Chapter Select.
- **World map**: the journey as a pixel map; chapters lock/unlock; XP + badges per chapter.
- **HUD rework**: XP bar + player level ("Survivor Lv 4"), gold, hearts, inventory, and a
  **Codex** — every learned concept appears as an unlocked rune with a one-line
  refresher and a "practice this" link to a matching Trial.
- **Quest log** replaces the plain command log: objective, completed beats, journal.
- **Trial screen**: split view — problem text left, editor right, Run shows a
  per-test-case pass/fail table (expected vs got) plus hidden-case count.
- **Juice pass**: transitions, particles, screen shake, XP pop-ups, badge toasts,
  day/night tint per chapter.
- **Save system**: one localStorage save object (chapter, rung history per concept, XP,
  badges, inventory) with export/import.

## 4. Architecture

No build step (hard rule). Refactor into modules:

- `core/` — renderer, sprites, scene runner, save.
- `curriculum/` — chapter beats + trials as plain data objects.
- `trials/` — Pyodide grading harness: visible cases, hidden cases, seed variation,
  hint ladder.
- `ui/` — HUD, map, codex, trial screen.
- Node harnesses (`trials-verify.mjs`) auto-grade every canonical solution across
  seeds, same philosophy as `verify.mjs`.

## 5. Delivery Phases

- **Phase A**: title screen + world map + save/XP system + HUD shell, wrapping the
  existing Lesson 1 content unchanged.
- **Phase B**: Trial engine + Trial screen + Chapter 2 Proving Grounds (~8 trials).
- **Phase C**: Chapter 3 (Ruined City) fully on the new system.
- **Phase D+**: Chapters 4–6.

## Constraints

- Vanilla JS + Pyodide, no build step; pages run from `python -m http.server`.
- Published copy: plain and human, no em dashes.
- Animated pages cannot be verified via headless screenshots (rAF does not advance
  under --virtual-time-budget); verify live in a browser.
