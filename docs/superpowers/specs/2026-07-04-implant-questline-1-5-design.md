# 1.5 The Signal — Implant Questline Design

Post-mutant questline: inspect the mutant's body, find a spinal implant
(someone is modifying and steering the zombies), bring it to the knight,
then decipher it at the craftsman's new workshop scene by solving
input-to-output puzzles. Teaches the player's first written else, in
three escalating rounds validated against hidden inputs.

## Context

- File: `lesson1.js` (plus one CONCEPTS touch in `curriculum.js` only if
  needed; the existing `if` concept already teaches else).
- Follows the 1.4 mutant encounter. Player ladder entering 1.5: print,
  variables, arithmetic, for loop, first written if with a comparison.
- Existing machinery reused: inventory (`giveItem`), escort-follow
  (survivor logic from 1.2), armory-booth scene pattern (`drawArmory`,
  scene switch, re-entry from the keep loop), quest markers, the
  `runUser(lastSrc, seed, "")` re-run validation from the mutant fight,
  DEV jump bar.
- The fallen camp's linger loop ("...to be continued" beside Tam) is
  REPLACED by the inspection beat and keep exit.

## Story flow

1. **Inspection (fallencamp, right after the mutant falls).** After
   Tam's "...it could not dodge that" lines, the hero walks to the
   corpse. Narration: under the pauldron scrap something glints, a
   coin-sized plate of metal and glass, still warm, a hair-thin filament
   running into the spine, pulsing faint blue. Two beats, in Ryan's
   words: someone MADE this thing what it is; and if it can receive,
   someone can steer it. `giveItem` a new inventory item: icon gear or
   bolt, name "Spinal Implant", note describing the plate (readable in
   the inventory like the Sealed Orders).
2. **Tam reacts.** The implant is proof; he stops shaking. His close:
   he's coming with you.
3. **Exit to the keep.** The camp gains `you.walk("keep")` (location
   chip + ask). On walk, Tam follows behind the hero (escort-follow
   reuse); fade to the keep. Tam stands near the keep entrance
   (SCENES.keep road side, ~0.06) from then on, with an idle line if
   walked to (optional, one say).
4. **The knight (implant hand-in).** Quest `!` on the knight. Dialogue:
   he turns the implant over once, goes quiet, says this could be
   something big, and sends you to the craftsman. The craftsman stall's
   padlock is removed and gets the `!`.
5. **The workshop (new scene, three rounds — see below).**
6. **Epilogue at the knight.** The decoded truth: the mutants are
   RECEIVING ORDERS from somewhere up the road (Ruined City thread).
   Ends "(to be continued)". Scene XP bonus 30 (asks award their usual
   10 each on top).

## The workshop scene

New scene `"workshop"`, built like the armory booth (`drawArmory`
pattern): keep interior dimmed behind, green scalloped awning (the
craftsman's stall color), CRAFTSMAN sign, counter.

- **The craftsman:** wiry, spectacles, leather apron, behind the bench;
  gentle idle bob like the smith.
- **The bench:** the implant held in a brass vice at center; wires run
  to a hand-cranked voltaic rig (copper coil, glass jars) — period-tech
  electricity.
- **The readout board:** a slate panel that logs probe pairs as glowing
  lines, `IN 3 -> OUT 7`. When the craftsman probes an input, a spark
  runs the wire from the rig to the implant and the board writes the
  new pair. Round 3 adds a scratched legend: `1 = WAIT  2 = MOVE
  4 = HUNT`, and decoded words appear beside the final outputs.

The scene is entered from the keep loop via `you.walk("craftsman")`
once the knight has sent you, and re-enterable until solved (like the
armory booth's shopVisit).

## The three rounds

Each round is an `ask()` with `seed: "signal = <n>"`, the craftsman
framing it as: I give it X, it answers Y — write me the steps in
between. The board shows the observed pairs; the task text repeats
them.

- **Round 1 — warm-up, arithmetic.** Pairs: 2->5, 4->9, 7->15. Rule:
  `out = signal * 2 + 1`. Seeded `signal = 7`; player sets `out`.
  Concept tag: none new (variable/add familiarity), concept "variable".
- **Round 2 — first written else.** The device ignores weak signals.
  Pairs: 4->0, 9->0, 12->2, 15->5. Rule: `if signal < 10:` `out = 0`
  `else:` `out = signal - 10`. Seeded `signal = 12`. Concept tag "if"
  (its teach text already covers else); task text frames else as
  "every question has a no".
- **Round 3 — combined + payoff.** Pairs: 3->4, 8->9, 12->24, 20->40
  (weak signals get +1 = WAIT-range; strong get doubled). Rule:
  `if signal < 10:` `out = signal + 1` `else:` `out = signal * 2`.
  Seeded `signal = 20`. After passing, the craftsman probes the
  captured command buffer and the board decodes the stream against the
  legend; the final sequence reads HUNT. HUNT. HUNT.

**Validation (every round):** the seeded run must set `out` to the
expected value; then the validator re-runs `lastSrc` via
`runUser(lastSrc, "signal = <other>", "")` against 2-3 other inputs
(mix of visible-pair inputs and one unseen input) and each must match.
Hardcoding (`out = 15`) passes the seed but fails the re-run; the
craftsman calls it out in character ("the machine answers EVERY signal,
not just this one"). Round 2/3 validators additionally require an
`if`/`else` in the source (structure regex like the mutant's).
Placeholders must pass their own validators (DEV Tab-skip rule).

## State + wiring

- New module state: `implantStep` (0 = not started, 1 = implant in hand,
  2 = knight has sent you to the craftsman, 3 = deciphered). Kept
  separate from `questStep` so 1.3 logic is untouched.
- Quest markers: knight `!` when implantStep === 1 (hand-in) and 3
  (epilogue); craftsman `!` when implantStep === 2.
- Craftsman leaves LOCKED_STALL behavior once implantStep >= 2.
- Tam in the keep: drawn near the entrance once arrived (flag
  `tamAtKeep`); walkable for one flavor line (optional).
- DEV jump `1.5`: full kit, 6 hearts, implantStep = 1, starts in the
  keep with the implant in inventory (skips the camp).
- Save checkpoint via existing `fadeTo` scene checkpoints.

## Out of scope

- No new trial-board entries; the hidden-input validation lives inline.
- No change to riddles, the mutant fight, or 1.3 shop logic.
- The Weck reveal relocation and the broader 1.4 story-blandness pass
  remain separate work (tracked in memory).
- Chapter-2 content (the Ruined City itself) is only pointed at, not
  built.

## Copy rule

No em dashes in player-facing strings (Ryan's style rule).
