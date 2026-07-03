# 1.4 Climax: The Mutant — Design

Replaces the ledger tally at the end of lesson 1.4 (the fallen camp) with a
short, high-tension encounter that teaches the player to WRITE their first
if statement. Also fixes Tam's one-eyed face.

## Context

- File: `lesson1.js`. Scene: `playFallenCamp` / `playTam`.
- By this point the player has written variables, arithmetic, `you.walk()`,
  `bow.fire()`, and a for loop, and has READ if/else in Tam's riddles.
  This is the first time they write an `if`.
- The ledger tally (`ask()` at ~line 853) and Tam's "help me count" plea are
  removed entirely, including the Weck reveal (missing = 1). The Weck mystery
  is not raised in this scene; it surfaces later in the campaign.
- XP award for the scene stays at 30.

## Scene flow

1. Tam's third riddle passes; `tamFreed = true`; he climbs out (now with two
   eyes). Keep his testimony lines about the attack (black hour, no horn,
   dispatch case) — cut the counting plea and the three ledger/Weck lines.
2. New beat: the ground shifts near the command tent. The mutant rises —
   a hulking, twitch-fast variant of the zombie sprite wearing a torn Iron
   Guard breastplate. Tam scrambles behind the rubble.
3. **Prompt 1 (familiar ground):** plain `bow.fire()`. The mutant
   snap-dodges — fast sidestep with a dust puff; the arrow whiffs past and
   buries itself in the palisade. Tam: it SEES the arrow at range; let it
   get close, then it can't dodge what it can't outrun.
4. **Prompt 2 (the new tool):** the game seeds `distance = 40` (the mutant's
   range at the moment of the prompt; the seed itself is static) and asks
   for a guarded shot:

   ```python
   if distance < 10:
       bow.fire()
   ```

5. **Two-act run.** On a passing Run, the engine plays the same source twice:
   - Act one, `distance = 40`: zero fires is the CORRECT result. Shown as the
     hero holding the draw while the mutant closes ("hold... hold...").
   - Act two, same source re-executed with `distance = 6`: the shot fires,
     the mutant is too close to dodge, and it drops.
6. Tam comes out from cover. Short closing dialogue; the "(to be continued)"
   hook and the linger loop stay.

## Validation

The validator on prompt 2 requires all of:

- an `if` and a comparison against `distance` in the source;
- `bow.fire()` indented under the if;
- behaviorally: 0 fires when run with `distance = 40`, and exactly 1 fire
  when re-run with `distance = 6`.

Failure modes are teaching beats:

- Unguarded `bow.fire()` (no if, or threshold too big like `distance < 50`):
  fires in act one — "you loosed early — it dodged, again."
- Threshold that never fires (e.g. `distance < 2` when the near seed is 6):
  act two fires 0 — the mutant reaches you; Tam yanks you back; try again.
- Any threshold that holds at 40 and fires at 6 passes. No magic number.

## Mechanics

- Reuse `zoms`, `ARROWS`, `fireAtNearest()`, `drawZoms`.
- New: `mutant` flag on a zombie — larger scale, jittery idle offset, torn
  Iron Guard breastplate over the base sprite.
- New: dodge behavior — when a doomed arrow nears a dodging mutant, it
  sidesteps (dust puff), the arrow un-dooms it and flies past off-scene.
- New: re-run helper — execute `lastSrc` against an injected seed
  (`distance=40`, then `distance=6`). The Python harness already accepts a
  seed prelude, so this is two harness calls with different seeds.

## Eye fix

`lesson1.js:727`: Tam currently has a single 2px eye near the center of his
face. Replace with two eyes positioned for his 11px-wide head, matching the
smith/knight style.

## Out of scope

- No damage / heart loss in this encounter (tension is scripted).
- No changes to the riddle phase, the camp sweep, or the DEV jump bar other
  than the scene content after `tamFreed`.
- The Weck reveal's new home is future work.
