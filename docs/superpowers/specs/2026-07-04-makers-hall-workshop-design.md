# The Maker's Hall — Workshop Scene Redesign

Replace the 1.5 workshop scene's visuals with design B ("The Maker's Hall")
from `workshop-styles.html`, and fix the hero/craftsman scale mismatch.
Approved by Ryan from the mockup board (2026-07-04).

## Problems being fixed

1. **Scale:** the workshop drew the default world-scale hero (CH = 1.55)
   next to the armory-pattern craftsman at 5x. The armory solves this by
   skipping the world hero and drawing a posed hero at booth scale;
   the workshop must do the same.
2. **Character:** the room read as electronics-only. Ryan wants a lifelong
   CRAFTSMAN whose newest obsession is the electric wall, not a man who
   only does electronics.

## The design (port from `workshop-styles.js`, variant B)

Scene `"workshop"` in `lesson1.js`, `drawWorkshop` rebuilt as a tent
interior (canvas walls + seam lines, like the mockup's `baseRoom(tent)`)
containing, left to right:

- **Old craft half:** woodworking pegboard (hand saw, hammer, three
  chisels, a plane), sawhorse with a leaning plank and wood shavings,
  a finished wagon wheel leaning near the bench.
- **The bridge piece:** his handmade pendulum clock, gilt pendulum
  swinging (sin), hand crawling.
- **New obsession half:** patch-cable switchboard wall (socket grid,
  four colored patch cables with plugged ends, two blinking indicator
  lamp rows, two copper knife switches, one of which flips on a timer),
  cables running from the wall to the bench, a spark traveling the main
  cable on a period, floor cable runs.
- **Kept functional pieces (same state hooks as today):** the PROBE LOG
  slate rendering `workshopPairs.slice(-9)` with the same color rules
  (HUNT red, "->" blue, else gold) + the legend when `workshopLegend`;
  the bench with brass vice + blue-pulsing implant; `workshopSpark`
  still renders as a spark running a wire to the implant (the crank-rig
  spark hook the rounds' `probePair` fires). Wood shavings sit on the
  electric bench (both lives, one surface).
- **Cast at matched scale:** craftsman ~4.6x at the bench (keep his
  existing sprite: green tunic, grey hair, spectacles, apron, hot-tip
  soldering hand); posed armored hero ~4.2x standing left, facing him
  (kit pieces drawn like the armory's posed hero). Add `"workshop"` to
  the world-hero skip list in `draw()` (`scene !== "raft" && scene !==
  "armory"` gains `&& scene !== "workshop"`).

Composition per the approved mockup: hero far left (~0.07 W), pegboard
~0.17-0.36 W upper, sawhorse ~0.18 W floor, PROBE LOG slate mid-left
(~0.24 W, below the pegboard), clock ~0.455 W, wheel ~0.46 W floor,
switchboard 0.5-0.84 W upper, bench 0.5-0.8 W, craftsman ~0.88 W.

## Constraints

- Visual-only change: no dialogue, validator, state-machine, or round
  logic edits. `playWorkshop`, `runDecipherRounds`, `probePair`,
  `workshopPairs/Legend/Spark` interfaces unchanged.
- The speaker anchor for the craftsman in the workshop must still sit
  over his head (adjust the x/y in `speakerAnchor`'s workshop case if
  his position moves).
- Scale relative to the mockup: mockup coordinates are for a ~600x340
  card; the game canvas is full-bleed (~1280x800, gy = 0.74 H, floor
  band below). Port proportionally (fractions of W, floor at the
  armory's `floorY = H * 0.8` convention this scene already uses).
- No em dashes in any player-facing string (none change).
- Verification: behavioral drive to the workshop (DEV 1.5 → knight →
  craftsman), screenshots of the shell dialogue AND mid-rounds (board
  populated, spark firing), plus the full q3 decipher drive still
  passing end to end.

## Out of scope

- The other three mockup variants; the mockup board files stay as-is
  (reference material, committed).
- Any change to the keep stall exterior or other scenes.
