# 1.4 Mutant Encounter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ledger tally at the end of lesson 1.4 with the Twitcher mutant encounter (the player's first WRITTEN if statement), and fix Tam's one-eyed face.

**Architecture:** Everything lives in `lesson1.js`, following the file's existing sections: a new mutant sprite next to `zombie()`, dodge machinery in `update()`/`drawZoms()`, and a new `playMutant()` scene beat called from `playTam()`. The if-statement is validated behaviorally by running the player's source twice with different seeds (`distance = 40`, then `distance = 6`) via the already-global `runUser`.

**Tech Stack:** Vanilla JS canvas game + Pyodide Python harness. No test framework — verification is behavioral, via a headless-Chrome Playwright driver against a local static server.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-03-mutant-encounter-1-4-design.md`.
- Chosen build: TWITCHER (specimen A) from `mutant-styles.js` — port its body, high-frequency jitter, blur-step dodge with afterimages, dash-burst advance.
- The Weck reveal and ledger tally are removed entirely; Tam's testimony lines (black hour / no horn / dispatch case) stay.
- No heart damage in this encounter; tension is scripted.
- XP award for the scene stays 30 (the two `ask()`s auto-award 10 each on top; that matches other scenes).
- DEV Tab-skip auto-runs `opts.placeholder` — every new `ask()`'s placeholder MUST pass its own validator.
- Published copy rule: no em dashes in player-facing strings (Ryan's style rule). Use commas or periods.
- Working branch: `warm-fantasy-reskin`. Commit after each task.
- Line numbers below are as of commit `cc78499`; re-locate by the quoted anchor text if they've drifted.

## Verification harness (used by every task)

A static server must be serving the repo:

```powershell
# only if not already running (check: Invoke-WebRequest http://localhost:8931/survive.html -Method Head)
python -m http.server 8931 --directory C:\Users\Ryan\critter-forge
```

Playwright driver lives in `C:\Users\Ryan\AppData\Local\Temp\sts-drive` (already has `playwright-core` installed; launch with `channel: 'chrome'`). Drive scripts below are written to that folder and run with `node`. Screenshots land in `C:/Users/Ryan/AppData/Local/Temp/sts-drive/shots`. **Look at every screenshot; a blank or garbled frame is a failure.** Also run `node --check lesson1.js` after every edit to `lesson1.js`.

---

### Task 1: Tam eye fix

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js:727` (inside the `if (tamFreed)` block of `drawFallenCamp`)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing other tasks rely on.

- [ ] **Step 1: Make the edit**

Anchor (current line 727):

```js
      px(c, -5, -32, 11, 11, "#d8a878"); px(c, -6, -34, 12, 4, "#6e4a22"); px(c, -2, -28, 2, 2, "#1c1208");
```

Replace the single centered eye with two (head spans x −5..+6, so eyes at −3 and +2 match the smith/knight spacing):

```js
      px(c, -5, -32, 11, 11, "#d8a878"); px(c, -6, -34, 12, 4, "#6e4a22"); px(c, -3, -28, 2, 2, "#1c1208"); px(c, 2, -28, 2, 2, "#1c1208");
```

- [ ] **Step 2: Syntax check**

Run: `node --check C:\Users\Ryan\critter-forge\lesson1.js`
Expected: no output, exit 0.

- [ ] **Step 3: Visual check**

Write `C:\Users\Ryan\AppData\Local\Temp\sts-drive\t1-eye.mjs`:

```js
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const shots = 'C:/Users/Ryan/AppData/Local/Temp/sts-drive/shots';
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://localhost:8931/lesson1.html#1.4', { waitUntil: 'networkidle' });
// wait for Pyodide, then Tab-skip through the camp sweep, the walk ask, and Tam's 3 riddles
await page.waitForFunction(() => document.querySelector('#run') && !document.querySelector('#run').disabled, { timeout: 120000 });
for (let i = 0; i < 60; i++) {
  await page.keyboard.press('Tab');           // skipStep: advances dialogue or auto-runs the ask
  await page.waitForTimeout(700);
  const freed = await page.evaluate(() => document.body.innerText.includes("I'm not going back under there"));
  if (freed) break;
}
await page.screenshot({ path: `${shots}/t1-tam.png` });
console.log('PAGEERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
```

NOTE: after Task 3 lands, the "I'm not going back under there" linger line only appears after the mutant fight, so this same loop still works, it just takes more Tab presses (the loop allows 60).

Run: `node C:\Users\Ryan\AppData\Local\Temp\sts-drive\t1-eye.mjs`
Expected: `PAGEERRORS: none`. Open `t1-tam.png`: Tam stands by the rubble with TWO dark eyes on his face (zoom if needed).

- [ ] **Step 4: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "fix(1.4): Tam gets both his eyes (was a single centered pixel pair, read as a cyclops)"
```

---

### Task 2: Mutant engine — Twitcher sprite, dodge + dash machinery

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` — four spots: state (line ~51), combat helpers (~297), `update()` arrows/zoms (~463-478), sprites (~1793) and `drawZoms` (~1697), `drawFallenCamp` (~722 and ~784).

**Interfaces:**
- Consumes: existing `zoms`, `ARROWS`, `FX`, `char`, `els`, `CH`, `px`, `rr`, `drawZoms`.
- Produces (Task 3 relies on these exact names):
  - `mkMutant(frac)` → zombie-compatible object `{ x, alive, dying, doomed, fall, wphase, mutant: true, dodges: true, dodgeT: 0, dashing: false, gdir: -1, rise: 1, spawnDist: 0 }`
  - `let tamHiding = false;` module state (Tam ducks behind the tower half while true)
  - dodge behavior in `update()`: an arrow whose `target.dodges` gets within 46px makes the target blur-step away and retargets the arrow to an off-scene phantom (no kill)
  - `drawMutant(c, z, gy)` called from `drawZoms` for `z.mutant`
  - a `distance = N` pill drawn over a living mutant in the fallen camp (reads 40 at spawn via `z.spawnDist`)

- [ ] **Step 1: Add state + factory**

At line ~51, after `let tamFreed = false; // the survivor beneath the storehouse rubble` add:

```js
let tamHiding = false; // Tam ducks behind the tower half while the mutant is up
```

At line ~297, directly under the `mkZom` definition (`const mkZom = (f) => ({ ... });`), add:

```js
// the 1.4 mutant: dodges ranged arrows until .dodges is cleared; z.rise fades it up out of the dead
const mkMutant = (f) => ({ x: els.W * f, alive: true, dying: 0, doomed: false, wphase: Math.random() * 6, mutant: true, dodges: true, dodgeT: 0, dashing: false, gdir: -1, rise: 1, spawnDist: 0 });
```

- [ ] **Step 2: Dodge machinery in `update()`**

Current arrow block (lines ~463-471):

```js
  // arrows fly to their target and kill on impact
  for (const a of ARROWS) {
    const dir = Math.sign(a.target.x - a.x) || 1; a.x += dir * 320 * dt;
    if (Math.abs(a.x - a.target.x) < 10) {
      a.hit = true; a.target.alive = false; a.target.dying = 1; a.target.fall = dir; // fall away from the shot
      for (let i = 0; i < 9; i++) FX.push({ x: a.target.x, y: els.H * 0.74 - 16 - Math.random() * 14, vx: dir * (20 + Math.random() * 70) * (Math.random() < 0.3 ? -0.4 : 1), vy: -40 - Math.random() * 80, t: 0.55 + Math.random() * 0.3, col: Math.random() < 0.5 ? "#8a9a6a" : "#5c6b44" });
    }
  }
```

Replace with:

```js
  // arrows fly to their target and kill on impact
  for (const a of ARROWS) {
    const dir = Math.sign(a.target.x - a.x) || 1; a.x += dir * 320 * dt;
    // a dodging mutant blur-steps out of the arrow's path; the shot flies on and dies off-scene
    if (a.target.dodges && Math.abs(a.x - a.target.x) < 46) {
      const z = a.target; z.dodgeT = 0.45; z.doomed = false; z.gdir = -dir; z.x += dir * 30;
      for (let i = 0; i < 6; i++) FX.push({ x: z.x - dir * 22, y: els.H * 0.74 - 4 - Math.random() * 8, vx: -dir * (30 + Math.random() * 50), vy: -20 - Math.random() * 40, t: 0.4 + Math.random() * 0.2, col: "#aab6c4" });
      a.target = { x: a.x + dir * els.W * 0.5, phantom: true };
    }
    if (Math.abs(a.x - a.target.x) < 10) {
      a.hit = true;
      if (!a.target.phantom) {
        a.target.alive = false; a.target.dying = 1; a.target.fall = dir; // fall away from the shot
        for (let i = 0; i < 9; i++) FX.push({ x: a.target.x, y: els.H * 0.74 - 16 - Math.random() * 14, vx: dir * (20 + Math.random() * 70) * (Math.random() < 0.3 ? -0.4 : 1), vy: -40 - Math.random() * 80, t: 0.55 + Math.random() * 0.3, col: Math.random() < 0.5 ? "#8a9a6a" : "#5c6b44" });
      }
    }
  }
```

(`z.doomed = false` matters: `fireAtNearest` sets `doomed` on launch; clearing it lets the next `fireAtNearest` target the mutant again.)

In the zombie tick just below (lines ~475-478), add dodge-timer decay:

```js
  for (const z of zoms) {
    if (!z.alive && z.dying > 0) z.dying = Math.max(0, z.dying - dt * 1.1);
    if (z.dodgeT > 0) z.dodgeT = Math.max(0, z.dodgeT - dt);
    if (z.alive && zombiesApproach) { z.x += Math.sign(char.x - z.x) * 24 * dt; z.wphase += dt * 7; } // slow shamble toward you
  }
```

- [ ] **Step 3: Sprite + draw branch**

At line ~1793, directly above `function zombie(c, x, y, sw = 0) {`, add the ported Twitcher body (from `mutant-styles.js` `twitcherBody`, baseline shifted so feet sit at `y` like the game's sprites):

```js
// the 1.4 mutant: the TWITCHER, wiry and wrong-jointed (mutant-styles.html specimen A)
function mutantBody(c, x, y, sw, reach) {
  const s = sw * 4, lean = reach * 4;
  // stilt legs, knees backward
  px(c, x - 5, y - 20 + Math.max(0, s) * 1.5, 3, 12, "#2a2014");
  px(c, x - 7, y - 9 + Math.max(0, s) * 1.5, 3, 9, "#241c10");
  px(c, x + 2, y - 20 + Math.max(0, -s) * 1.5, 3, 12, "#2a2014");
  px(c, x + 4, y - 9 + Math.max(0, -s) * 1.5, 3, 9, "#241c10");
  // narrow torso, canted hard forward
  px(c, x - 7 - lean, y - 38, 13, 20, "#10200c");
  px(c, x - 6 - lean, y - 37, 11, 18, "#7a8a5c"); px(c, x - 6 - lean, y - 37, 3, 18, "rgba(255,255,255,0.10)");
  px(c, x - 4 - lean, y - 30, 3, 8, "#5c1f1f"); // opened ribs
  px(c, x - 8 - lean, y - 39, 9, 5, "#8a939e"); px(c, x - 8 - lean, y - 39, 9, 2, "#a5aeb8"); // pauldron scrap
  px(c, x - 1 - lean, y - 34, 2, 12, "#3a2c18"); // strap across the chest
  // head cocked hard sideways
  px(c, x - 9 - lean, y - 46, 10, 9, "#9aab7a"); px(c, x - 9 - lean, y - 46, 10, 3, "#6b7a4c");
  c.shadowColor = "#ff3b3b"; c.shadowBlur = 6;
  px(c, x - 8 - lean, y - 43, 2, 2, "#ff3b3b"); px(c, x - 4 - lean, y - 43, 2, 2, "#ff3b3b");
  c.shadowBlur = 0;
  px(c, x - 8 - lean, y - 39, 6, 2, "#241206");
  // arms too long, fingers to the ground
  px(c, x - 13 - lean - reach * 6, y - 33, 4, 3, "#9aab7a");
  px(c, x - 15 - lean - reach * 6, y - 32, 3, 16, "#7a8a5c");
  px(c, x + 6 - lean, y - 33, 3, 24, "#7a8a5c"); px(c, x + 6 - lean, y - 10, 4, 3, "#9aab7a");
}
```

In `drawZoms` (line ~1697), route mutants to their own drawer. Current loop head:

```js
function drawZoms(c, gy) {
  for (const z of zoms) {
    if (z.dying <= 0 && !z.alive) continue;
```

becomes:

```js
function drawZoms(c, gy) {
  for (const z of zoms) {
    if (z.dying <= 0 && !z.alive) continue;
    if (z.mutant) { drawMutant(c, z, gy); continue; }
```

And directly below `drawZoms` (after its closing `}`), add:

```js
// the mutant: pent-up jitter at rest, afterimages while it dashes or dodges, same topple as the others
function drawMutant(c, z, gy) {
  const tt = performance.now() / 1000;
  const p = z.alive ? 0 : 1 - z.dying;
  const jx = z.alive ? (Math.sin(tt * 29) + Math.sin(tt * 41 + 2)) * 0.9 : 0;
  const jy = z.alive ? Math.abs(Math.sin(tt * 33)) * 0.5 : 0;
  const sw = z.dashing ? Math.sin(tt * 22) : 0;
  const reach = z.dashing ? 1 : 0.2;
  const rise = z.rise === undefined ? 1 : z.rise;
  const one = (ox, oa) => {
    c.save();
    c.globalAlpha = oa * rise * (p > 0 && z.dying < 0.35 ? z.dying / 0.35 : 1);
    c.translate(z.x + jx + ox, gy + jy + (1 - rise) * 26);
    if (p > 0) { c.rotate((z.fall || 1) * Math.min(1, p * 1.5) * 1.45); c.translate(0, -Math.sin(Math.min(1, p * 1.5) * Math.PI) * 3); }
    c.scale(CH * 1.1, CH * 1.1);
    mutantBody(c, 0, 17, sw, reach);
    c.restore();
  };
  if (z.alive && (z.dodgeT > 0.05 || z.dashing)) { one(z.gdir * 16, 0.16); one(z.gdir * 8, 0.28); } // afterimages
  one(0, 1); c.globalAlpha = 1;
}
```

- [ ] **Step 4: Fallen camp hooks — draw zombies, Tam hiding, distance pill**

In `drawFallenCamp`, the Tam block at line ~722 currently starts:

```js
    if (tamFreed) { // Tam, out of the rubble: a clerk, no armor, satchel hugged tight
```

Change the condition and add a peeking variant right after that block's closing `}` (it closes with `c.restore(); }` at line ~728):

```js
    if (tamFreed && !tamHiding) { // Tam, out of the rubble: a clerk, no armor, satchel hugged tight
```

and after the block:

```js
    if (tamFreed && tamHiding) { // just his head, peeking around the standing tower half
      const hx2 = sx3 - tw / 2 - 8;
      px(c, hx2, gy - 38, 10, 9, "#d8a878"); px(c, hx2 - 1, gy - 40, 11, 4, "#6e4a22");
      px(c, hx2 + 2, gy - 35, 2, 2, "#1c1208"); px(c, hx2 + 6, gy - 35, 2, 2, "#1c1208");
    }
```

(`sx3` and `tw` are in scope; they define the standing tower half.)

At the end of `drawFallenCamp` (line ~784, just before the ground-fog loop that starts `// ground fog drifting through it all`), add:

```js
  // the mutant (and its corpse), plus a live distance readout while it stands
  drawZoms(c, gy);
  const mz = zoms.find((z2) => z2.mutant && z2.alive && z2.spawnDist);
  if (mz) {
    const d = Math.max(0, Math.round(40 * Math.abs(mz.x - char.x) / mz.spawnDist));
    const txt = `distance = ${d}`;
    c.font = "11px 'IBM Plex Mono',monospace"; c.textAlign = "center";
    const tw2 = c.measureText(txt).width;
    c.fillStyle = "rgba(8,12,18,0.72)"; rr(c, mz.x - tw2 / 2 - 7, gy - 118, tw2 + 14, 18, 5); c.fill();
    c.strokeStyle = "#2a3a4a"; c.stroke(); c.fillStyle = "#9fd9ff"; c.fillText(txt, mz.x, gy - 105);
  }
```

- [ ] **Step 5: Syntax + regression check**

Run: `node --check C:\Users\Ryan\critter-forge\lesson1.js`
Expected: exit 0.

Regular zombies must be untouched. Write `C:\Users\Ryan\AppData\Local\Temp\sts-drive\t2-regression.mjs`:

```js
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const shots = 'C:/Users/Ryan/AppData/Local/Temp/sts-drive/shots';
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
// #clearing jumps into the scene with the 3-zombie bow fight
await page.goto('http://localhost:8931/lesson1.html#clearing', { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('#run') && !document.querySelector('#run').disabled, { timeout: 120000 });
for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(600); }
await page.screenshot({ path: `${shots}/t2-clearing.png` });
console.log('PAGEERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
```

Run: `node C:\Users\Ryan\AppData\Local\Temp\sts-drive\t2-regression.mjs`
Expected: `PAGEERRORS: none`; screenshot shows the clearing fight mid-flow (zombies walking/falling normally, arrows flying). The mutant path is exercised in Task 3.

- [ ] **Step 6: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "feat(1.4): mutant engine, Twitcher sprite w/ jitter + afterimages, arrow blur-dodge machinery, Tam hiding pose, distance pill"
```

---

### Task 3: The encounter — replace the ledger tally with the two-act if lesson

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js:852-874` (end of `playTam`)

**Interfaces:**
- Consumes: `mkMutant`, `tamHiding`, `drawMutant` machinery (Task 2); `ask`, `say`, `anim`, `wait`, `fireAtNearest`, `waitForImpact`, `logCmd`, `runUser`, `translate`, `lastSrc`, `shootT`, `awardXP`, `Sv`, `zoms`, `char`, `els`.
- Produces: `playMutant()` (called only from `playTam`).

- [ ] **Step 1: Remove the ledger, keep the testimony**

Current lines 852-874 (from Tam's counting plea through the XP award — the anchor starts right after the dispatch-case testimony line):

```js
  await say("Tam", "Help me count. Please. If I count it, it's real, and if it's real I can stop shaking. The ledger's in my head; the numbers are all I've got left.");
  await ask({
    prompt: "Tally the losses with Tam",
    ...
  }, null);
  await say("Tam", "Zero arrows. They never fought back. Taken unawares: True. That's the truth of it, in five lines.");
  await say("Tam", "And... missing is one. The ledger doesn't balance. Nine stood this camp. Seven in the grass, me under the stones. Someone's not here.");
  await say("Tam", "Weck. Weck had the wall. It's WECK that's missing. And it moved like him, I told you it moved like him...");
  await say("", "A camp that never fought back. A stolen dispatch case. A missing watchman it learned to walk like. The road to the city just got darker... (to be continued)");
  if (Sv) awardXP(30);
}
```

Replace ALL of it (through the function's closing `}`) with:

```js
  await playMutant();
  if (Sv) awardXP(30);
}
// ---- the mutant: the thing the camp fed. First WRITTEN if statement. ----
async function playMutant() {
  await say("", "Then the ground moves. By the command tent, canvas and ash slide off something that was lying among the dead. It stands up WRONG: too tall, too thin, joints bending in places joints don't bend.");
  char.facing = -1; // it rises between you and the gate
  const m = mkMutant(0.52); m.rise = 0; m.spawnDist = Math.abs(m.x - char.x); zoms = [m]; ARROWS = [];
  tamHiding = true;
  await anim(0.8, (p) => (m.rise = p));
  await say("Tam", "That is NOT one of the shuffling ones. Look at it, it never stops moving. Shoot it. SHOOT IT.");
  await ask({ prompt: "Loose an arrow", placeholder: "bow.fire()", concept: "fire",
    validate: (r) => (r.fires >= 1 ? null : "Call bow.fire() to shoot.") }, null);
  fireAtNearest(); await waitForImpact(); await wait(0.4);
  await say("", "It is not where the arrow lands. A blur, a stutter in the air, and it is two steps aside. The shaft buries itself in the dirt behind it.");
  await say("Tam", "It SEES the arrow. At that range it has all night to step aside.");
  await say("Tam", "Let it get CLOSE. Close up, it cannot dodge what it cannot outrun. Under ten paces, THEN loose. Not before. Please not before.");
  await ask({
    prompt: "Guard the shot with an if statement",
    placeholder: "if distance < 10:\n    bow.fire()", rows: 2,
    seed: "distance = 40",
    concept: "if",
    task: "The variable distance is set for you: it holds how far away the thing is, 40 paces right now. Write a guard: IF distance is under 10, fire. Your code runs while it is still far out, so when distance is 40 the indented line must NOT run. Holding the arrow IS the correct result.",
    validate: (r) => {
      if (!/\bif\b[^\n]*\bdistance\b[^\n]*:/.test(lastSrc)) return "Write an if statement that asks a question about distance, ending with a colon.";
      if (!/\n\s+bow\.fire\(\)/.test(lastSrc)) return "Put bow.fire() on its own line, indented 4 spaces under the if.";
      if (r.fires > 0) return "It is 40 paces out and your code FIRED. The blur again, the arrow in the dirt. The shot must only happen when distance is small. Make the condition stricter.";
      let rerun;
      try { rerun = JSON.parse(runUser(lastSrc, "distance = 6", "")); } catch (e) { return "Something broke re-running your code. Try again."; }
      if (rerun.err) return translate(rerun.err);
      if (rerun.fires !== 1) return "Now imagine it at 6 paces, breath on your face, and your code STILL does not fire. The condition has to come true when it is close. Try distance < 10.";
      return null;
    },
  }, null);
  // act one: distance = 40. The same code runs, and correctly does nothing.
  await say("", "You nock and draw. distance = 40. Your code runs... and holds. The condition is False, so Python skips the fire line as if it were never written.");
  const side = Math.sign(m.x - char.x) || -1;
  shootT = 2.8; // the hero holds the draw while it closes
  for (const d of [27, 16, 8]) { // it comes on in bursts: move, freeze, move
    m.dashing = true; m.gdir = -side;
    const from = m.x, to = char.x + side * m.spawnDist * d / 40;
    await anim(0.26, (p) => (m.x = from + (to - from) * p));
    m.dashing = false;
    await wait(d > 8 ? 0.55 : 0.1);
  }
  await say("", "Eight paces. Your same two lines run again, and this time the condition is TRUE.");
  m.dodges = false; fireAtNearest(); await waitForImpact(); await wait(0.5);
  tamHiding = false;
  await say("Tam", "...it could not dodge that. You WAITED. The arrow only existed when it could not matter less to you and more to it.");
  await say("Tam", "That is what took the camp. Things like that. And it was headed the same way you are.");
  await say("", "One arrow, held until the if said now. Whatever is out on that road, you do not meet it by firing early... (to be continued)");
}
```

- [ ] **Step 2: Syntax check**

Run: `node --check C:\Users\Ryan\critter-forge\lesson1.js`
Expected: exit 0.

- [ ] **Step 3: Behavioral drive — happy path + both failure paths**

Write `C:\Users\Ryan\AppData\Local\Temp\sts-drive\t3-mutant.mjs`:

```js
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const shots = 'C:/Users/Ryan/AppData/Local/Temp/sts-drive/shots';
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://localhost:8931/lesson1.html#1.4', { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('#run') && !document.querySelector('#run').disabled, { timeout: 120000 });
const promptIs = (s) => page.evaluate((s) => document.querySelector('#prompt').textContent.includes(s), s);
// Tab through sweep, walk ask, riddles, testimony, mutant rise, until the fire prompt
for (let i = 0; i < 40; i++) {
  if (await promptIs('Loose an arrow')) break;
  await page.keyboard.press('Tab'); await page.waitForTimeout(650);
}
if (!(await promptIs('Loose an arrow'))) throw new Error('never reached the fire prompt');
await page.screenshot({ path: `${shots}/t3-1-risen.png` }); // mutant up, distance = 40 pill, Tam hiding
await page.keyboard.press('Tab'); // auto bow.fire()
await page.waitForTimeout(600);
await page.screenshot({ path: `${shots}/t3-2-dodge.png` }); // mid-dodge / arrow flying past
// advance dialogue to the if prompt
for (let i = 0; i < 8; i++) {
  if (await promptIs('Guard the shot')) break;
  await page.keyboard.press('Tab'); await page.waitForTimeout(500);
}
if (!(await promptIs('Guard the shot'))) throw new Error('never reached the if prompt');
const type2 = async (l1, l2) => { // two-line entry: Shift+Enter for the newline, then Run
  await page.click('.cm-content, #editor, textarea', { timeout: 3000 }).catch(() => {});
  await page.keyboard.type(l1); await page.keyboard.down('Shift'); await page.keyboard.press('Enter'); await page.keyboard.up('Shift');
  await page.keyboard.type(l2); await page.click('#run');
  await page.waitForTimeout(700);
  return page.evaluate(() => document.querySelector('#status').textContent);
};
// failure 1: unguarded fire
let s1 = await type2('bow.fire()', '');
console.log('FAIL-NO-IF:', s1);
// clear editor between attempts: select-all + delete
const clear = async () => { await page.keyboard.press('Control+a'); await page.keyboard.press('Delete'); };
await clear();
// failure 2: threshold too big
let s2 = await type2('if distance < 50:', '    bow.fire()');
console.log('FAIL-BIG-THRESHOLD:', s2);
await clear();
// failure 3: threshold never true
let s3 = await type2('if distance < 2:', '    bow.fire()');
console.log('FAIL-NEVER-FIRES:', s3);
await clear();
// happy path
let s4 = await type2('if distance < 10:', '    bow.fire()');
console.log('PASS:', s4);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${shots}/t3-3-hold.png` });  // hero holding the draw, mutant dashing in
await page.waitForTimeout(3500);
await page.screenshot({ path: `${shots}/t3-4-hit.png` });   // close shot landed / mutant down
for (let i = 0; i < 8; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(500); }
await page.screenshot({ path: `${shots}/t3-5-after.png` }); // Tam back out, closing lines / linger loop
console.log('PAGEERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
```

Run: `node C:\Users\Ryan\AppData\Local\Temp\sts-drive\t3-mutant.mjs`
Expected output:
- `FAIL-NO-IF:` message containing "Write an if statement"
- `FAIL-BIG-THRESHOLD:` message containing "40 paces out and your code FIRED"
- `FAIL-NEVER-FIRES:` message containing "STILL does not fire"
- `PASS: ✓`
- `PAGEERRORS: none`

Inspect all five screenshots: (1) mutant risen with jitter + `distance = 40` pill + Tam's head peeking; (2) dodge afterimages/dust with the arrow past it; (3) hero holding the draw, mutant mid-burst closer; (4) mutant toppled; (5) Tam standing beside the wreck again.

NOTE: selectors `#prompt`, `#run`, `#status` and the editor click target may differ; check `lesson1.html` for the real ids before running, and fix the script, not the game, if they do.

- [ ] **Step 4: Full-scene sanity pass**

Re-run Task 1's drive (`node C:\Users\Ryan\AppData\Local\Temp\sts-drive\t1-eye.mjs`) — it now Tab-skips through the ENTIRE new scene including both mutant prompts (placeholders are valid answers).
Expected: `PAGEERRORS: none` and the final screenshot shows the post-fight linger with two-eyed Tam.

- [ ] **Step 5: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "feat(1.4): the mutant encounter — ledger tally replaced by the Twitcher; first written if statement, two-act run (holds at 40, fires at 6)"
```

---

## Self-review notes

- Spec coverage: eye fix (T1), Twitcher port + dodge + dash + afterimages (T2), ledger removal incl. counting plea + 3 Weck lines (T3), two-act validate incl. all three failure teaching beats (T3), Tam hides + returns (T2/T3), distance pill (T2), XP 30 kept (T3), linger loop untouched, no heart damage (no `zombiesApproach` during the encounter).
- Placeholder rule: both new asks' placeholders pass their own validators (Tab-skip safe).
- Type consistency: `mkMutant`/`tamHiding`/`drawMutant` names match across T2 definitions and T3 usage; `m.dodges`, `m.dashing`, `m.gdir`, `m.rise`, `m.spawnDist` all defined in the factory.
- Copy rule: no em dashes in any player-facing string above.
