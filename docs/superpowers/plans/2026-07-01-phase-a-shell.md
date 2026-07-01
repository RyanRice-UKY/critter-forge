# Phase A — Game Shell: title screen, world map, save/XP, HUD

Spec: `docs/superpowers/specs/2026-07-01-survive-the-stack-redesign-design.md`
Goal: wrap the existing Lesson 1 in a real game shell without changing its content.

## Task 1 — `core/save.js` (plain script, exposes `window.Save`)

Single localStorage key `sts-save-v1`:

```js
{ v: 1, name: null, xp: 0, gold: 0,
  chapters: { 1: { unlocked: true, scene: null, done: false }, 2..6: { unlocked: false } },
  badges: [], concepts: [], updated: <epoch ms> }
```

API: `Save.load()` (cached), `Save.write(patch)` (shallow merge + persist),
`Save.addXP(n)` → returns `{xp, level, leveled}`; `Save.level(xp)` from thresholds
`[0,50,120,220,360,540,760,1020,1320,1660]` then +400/level; `Save.reset()`;
`Save.checkpoint(ch, scene)`; `Save.completeChapter(ch)` unlocks ch+1.
No framework; safe when localStorage is unavailable (falls back to memory).

Verify: node-style logic test `docs/superpowers/plans/_savetest.mjs` with a
localStorage stub (Save is dependency-free).

## Task 2 — `survive.html` + `survive.js` (title + world map)

- Same fonts/palette as lesson1. Full-screen canvas.
- **Title view**: starfield night sky, pixel campfire/torch flicker, big blocky
  "SURVIVE THE STACK" (canvas-drawn pixel letters or styled font), buttons:
  Continue (hidden when no save), New Game (confirm + Save.reset), Chapters.
- **Map view**: horizontal journey Wildwood → Keep → Ruined City → Camp →
  Stronghold → Lab as 6 pixel nodes on a winding path; locked nodes greyed with a
  padlock; current node pulses; XP bar + "Survivor Lv N" top; click unlocked node 1/2
  → `lesson1.html` (`#keep` for ch2 entry); locked click → shake + "locked" toast.
- Buttons are HTML overlays (accessibility), scene is canvas.

Verify: headless screenshot (title is mostly static; flicker just renders one frame).

## Task 3 — wire lesson1 to the shell

- `lesson1.html`: add `<script src="core/save.js">`, a "⌂ Map" button in the top bar
  linking `survive.html#map`, an XP pill in the top bar (`#xpwrap`: "Lv N" + bar).
- `lesson1.js`:
  - `submit()` success path: `Save.addXP(opts.xp || 10)` + floating "+10 XP" toast
    over the stage; level-up toast when `leveled`.
  - `fadeTo(name)`: `Save.checkpoint(1, name)`.
  - `finish()` / keep-questline completion (`lesson1Done = true` site):
    `Save.completeChapter(1)` (unlocks Keep node on map).
  - Persist `char.gold` into save on change (write-through in the gold mutation spots).
  - Restore: on load with no hash, if checkpoint scene exists, DEV-style jump is NOT
    auto-applied (story integrity) but the map shows progress; hash jumps still work.
- XP pill updates via a `Save.onChange` hook.

Verify: headless screenshot of lesson1 (XP pill visible), localStorage round-trip via
a second headless load, live browser pass for toasts/animation.

## Task 4 — commit + user playtest

Commit per task. Ask Ryan to play from `survive.html`.

## Out of scope (Phase B+)

Trial engine, Codex panel, quest log rework, juice pass beyond XP toasts, chapters 3+.
