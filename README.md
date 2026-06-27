# Critter Forge — Act 1 prototype

A no-install, browser-based vertical slice of **Critter Forge**: write **real Python**
in the editor, press Run, and watch your critter live or die on a grid. This is the
"fun core" (Phase 0–1 of the build roadmap) — the part that proves the game is fun
*before* any ML stack gets built.

The unifying mental model is **sense → decide → act**. You only ever write the body of
`decide(sensors)`; the engine senses the world and applies your action each tick. That
same signature carries all the way to the trained neural net in Act 4.

## Run it

Pyodide (CPython-in-WebAssembly) loads its runtime over HTTP, so you must serve the
folder — opening `index.html` as a `file://` will fail.

```powershell
cd C:\Users\Ryan\critter-forge
python -m http.server 8000
# then open http://localhost:8000
```

(Any static server works, e.g. `npx serve`.) First load downloads the Pyodide runtime
(~10 MB), then it's cached.

## Two execution modes (and why the switch is the lesson)

Act 1 starts in **command mode** and switches to **reflex mode** — and the switch is
*forced by the world becoming dynamic*, not by a syllabus:

- **Command mode** (Topics 1–3): you give orders with predefined functions —
  `critter.step(direction, num_steps)` and `look()` (which senses the world and returns a
  `dict`). Your code runs once as a plan. Teaches function calls, arguments, variables,
  arithmetic, and branching tangibly.
- **Reflex mode** (Topics 4–7): at 4.1 the predator starts **moving every tick**, so a
  pre-planned script can't react. You switch to writing `decide(sensors)`, which the engine
  calls every single tick — the `sense → decide → act` loop that carries to the Act 4 policy.

## Act 1 — 7 topics × 5 levels (35 total)

Authoring rule: **a level is valid only if its canonical solution uses a construct the
previous level's did not.** Difficulty comes from the construct, not the map.

| # | Topic | Mode | Core construct (practiced 5×) | Growth stage |
|---|-------|------|-------------------------------|--------------|
| 1 | Commands | command | `step()`, `look()`, arguments | Hatchling |
| 2 | Variables & Math | command | assignment, `+ - // abs`, reuse | Nibbler |
| 3 | Branching | command | `if/elif/else`, nesting, `and/or` | Forager |
| 4 | Reflexes | reflex | `decide(sensors)`, booleans, priority | Skittish |
| 5 | Scanning | reflex | `for`, `range`, `continue`, accumulators | Scout |
| 6 | Memory | reflex | `while`, persistent state, `break`/`continue` | Tracker |
| 7 | Functions | reflex | helpers, parameters, return, synthesis | Hunter |

All 35 canonical solutions are verified to clear their own threshold across 60 random seeds:
run `node verify.mjs` (the regression test) after any tuning.

## Growth spine (8 stages)

Clearing a whole **topic** (5 levels) grows the critter one stage and unlocks a new sense;
that sense is the reason the next topic's construct exists. The critter also grows visibly
bigger with every berry. Progress persists via `localStorage`.

Egg → Hatchling → Nibbler → Forager → Skittish → Scout → Tracker → Hunter, then
Juvenile → Apex (Acts 2–4, locked).

## How it knows you understood (vs. got lucky)

Randomized levels are graded on **held-out seeds** the player never iterated on; beating the
watched map but failing fresh ones is flagged as luck. The whole-act verification doubles as
proof the levels are fair: canonical solutions pass, and naive shortcuts fail (a memoryless
scan can't clear the Memory topic; an ignore-the-predator brain can't clear the path-block).

## The sensor dict

`decide(sensors)` receives a `dict` (so `s["food_dx"]`). Keys: `pos`, `energy`, `food_dx`,
`food_dy`, `food_dist`, `scent` (per-direction float, BFS gradient, limited range in Topic 6),
`danger`/`safe` (per-direction bool), `predator_dx/dy/dist` (nearest, or `None`), `predators`
(sorted list of `{dx,dy,dist}`), `flee_dir`, and `memory` — a dict you read AND write that
**persists across ticks** within a run (the basis of Topic 6). Command mode's `look()` returns
the same dict. Return `"up"|"down"|"left"|"right"|"stay"`.

## Engine features

- **Multi-berry maps**: a level can hold several berries; win = eat them all.
- **Limited `scentRadius`**: scent only carries N tiles; beyond that you get no signal, which
  is what forces exploration + memory in Topic 6.
- **`energy`**: every step costs 1; runs out = starve (used by the Math topic).
- **`survive` levels**: some levels are won by lasting the whole budget, not by eating.

## Battle Arena (dev stage) — `battle.html`

A multi-agent battle simulator: N critters share one world, **forage to grow**, and the
**bigger critter eats the smaller** (same-tile, or by lunging onto an adjacent smaller one).
Win = last standing, or biggest at the time limit. This combines the forage and combat
dynamics so we can watch which is more fun.

- `arena.js` — the multi-agent world (simultaneous ticks, berries, combat resolution).
- `bots.js` — the opponent ladder: Wanderer, Greedy, Coward, Hunter, Champion (all `decide(s)`).
- `battle.js` / `battle.html` — watchable viewer: pick 4 brains, Fight, scoreboard + kill feed,
  plus an in-page "Run 200 sims" balance check.
- `arena-sim.mjs` — headless balance harness: `node arena-sim.mjs 400` prints a win-rate
  leaderboard, a 1v1 matrix, and combat activity (kills/match). This is the dev tool for
  tuning fairness before any real multiplayer exists.

Current balance: combat is live (~3.5 kills/match), no brain dominates (>75% = degenerate),
and patience beats aggression (reckless Hunter underperforms) — a strategy lesson players
discover by playing. A player's Python `decide()` plugs into the same arena sensor dict
(adds `s["size"]` and `s["rivals"]`); real networked PvP is the deferred final phase.

## Files

- `engine.js` — the persistent world: grid, dict sensors, actions, predators, BFS scent, win/loss.
- `levels.js` — the 7 topics × 5 levels (+ `TOPICS` metadata).
- `game.js` — Pyodide harness (dict API + persistent memory), editor, render loop, grading, growth.
- `verify.mjs` — regression test: every canonical solution across 60 seeds.
- `index.html`, `styles.css` — shell and styling.

## Not yet built (deliberately, per the MVP cut line)

Acts 2–4 (data structures, scikit-learn, the PyTorch/RL Forge) and the local "Forge Bridge".
The Act 2–4 arc is shown locked in the UI so the through-line is visible. Build them once
playtests confirm people *replay levels to make their critter better*.

## Notes

- External scripts (Pyodide, CodeMirror) load from CDNs without Subresource Integrity
  hashes — fine for a local prototype; add `integrity="sha384-…"` before any public deploy.
- Player Python runs in the Pyodide sandbox; only JSON sensor/action messages cross the
  boundary. (The browser-thread vs. Web Worker isolation hardening is a later phase.)
