# 1.5 The Signal (Implant Questline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the mutant falls, the player finds a spinal implant, brings it (and Tam) back to the keep, hands it to the knight, and deciphers it at the craftsman's new workshop scene in three input-to-output rounds that teach the first written else.

**Architecture:** All in `lesson1.js`, following its existing sections: new state flags, an inspection epilogue replacing the fallen-camp linger loop, Tam follow/placement machinery, keep-loop wiring (knight hand-in + epilogue, craftsman unlock), a new `"workshop"` scene built on the armory-booth pattern, and three `ask()` rounds validated with the established `runUser(lastSrc, seed, "")` hidden-input re-run. One small edit to `lesson1.html` (DEV bar button).

**Tech Stack:** Vanilla JS canvas + Pyodide harness. No test framework — verification is behavioral via the Playwright driver in `C:\Users\Ryan\AppData\Local\Temp\sts-drive` (playwright-core installed; launch `{ channel: 'chrome', headless: true }`; static server expected at http://localhost:8931 — if down, start `python -m http.server 8931 --directory C:\Users\Ryan\critter-forge` in the background).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-04-implant-questline-1-5-design.md`.
- No em dashes in player-facing strings (Ryan's style rule). All copy in this plan is verbatim and complies; do not "improve" it.
- DEV Tab-skip auto-runs `opts.placeholder` — every new `ask()`'s placeholder MUST pass its own validator.
- Round rules and pairs, exactly: R1 `out = signal * 2 + 1` with pairs 2->5, 4->9, 7->15, seed 7, reruns 2 and 5. R2 `if signal < 10: out = 0 else: out = signal - 10` with pairs 4->0, 9->0, 12->2, 15->5, seed 12, reruns 7, 15, 20. R3 `if signal < 10: out = signal + 1 else: out = signal * 2` with pairs 3->4, 8->9, 12->24, 20->40, seed 20, reruns 6, 12, 15.
- Legend: `1 = WAIT   2 = MOVE   4 = HUNT`; the buffer decode is three probes of IN 3 -> OUT 4 labeled HUNT.
- Scene XP bonus 30 at the knight epilogue (asks award their default 10 each on top).
- `implantStep` stays separate from `questStep`; 1.3 shop logic untouched; the mutant fight and riddles untouched.
- Working branch: `master` (this repo works directly on master now; commit per task).
- Line numbers below are as of commit `d17eb70`; re-locate by quoted anchor text if drifted.
- Verify each `lesson1.js` edit with `node --check C:\Users\Ryan\critter-forge\lesson1.js` (exit 0) before running drives.
- Drive-script conventions (established): wait for Pyodide via `#pystat` textContent including "python ready" (NOT `#run`); `Tab` advances dialogue AND auto-runs the current ask's placeholder; set multi-line editor content via CodeMirror 5 in `page.evaluate` (see the working example `C:\Users\Ryan\AppData\Local\Temp\sts-drive\t3-mutant.mjs`) then click `#run`; read validator messages from `#status`; ALWAYS Read screenshots and confirm content — blank canvas or "render error:" in `#prompt` is a failure.

---

### Task 1: Camp epilogue — inspection, implant item, Tam follows, arrival at the keep

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` — state (~line 52), Tam sprite block in `drawFallenCamp` (~735-745), `update()` (~500), `playFallenCamp` linger loop (844-848), `playMutant` last line (935), `playKeep` signature (1487), DEV 1.4 block (342-346), `drawKeep` end (~679), `speakerAnchor` (~1978), `giveItem` item const (near ORDERS_NOTE).

**Interfaces:**
- Consumes: existing `giveItem(item)`, `walkTo/walkToX`, `fadeTo`, `setupTownsfolk`, `prog`, `setLocations`, `ask`, `say`, `logCmd`, `zoms`, `char`, `CH`, `px`, `tamFreed`, `tamHiding`.
- Produces (later tasks rely on): `let implantStep = 0` (0 none, 1 implant in hand, 2 sent to craftsman, 3 deciphered, 4 epilogue done); `tamAtKeep` flag + Tam drawn at `W * 0.035` in the keep; `tamBody(c, sw = 0)` sprite helper; `IMPLANT_NOTE` item; `playKeep(name, quiet = false)` where quiet skips the fade/arrival/intro block.

- [ ] **Step 1: State + item**

After the line `let knockHeard = false; // the rubble only knocks once the story says you hear it` add:

```js
let implantStep = 0; // 1.5: 0 none, 1 implant in hand, 2 sent to craftsman, 3 deciphered, 4 reported
let tamFollows = false, tamAtKeep = false, tamWalk = { x: 0, wphase: 0 }; // Tam walking out of the camp / standing by the keep gate
```

Find the `ORDERS_NOTE` const (search `ORDERS_NOTE =`) and add directly below it:

```js
const IMPLANT_NOTE = { icon: "⚙", name: "Spinal Implant", note: "A coin-sized plate of metal and glass, pulled from the mutant's spine. Still warm. A hair-thin filament trails from one edge, and a faint blue light pulses under the glass, steady as a heartbeat. Someone MADE this. Machines mean makers, and makers can be found." };
```

- [ ] **Step 2: Extract `tamBody` and wire the three Tam draw sites**

In `drawFallenCamp`, replace the whole standing-Tam block (anchor starts `if (tamFreed && !tamHiding) { // Tam, out of the rubble` and ends at its `c.restore(); }`) with:

```js
    if (tamFreed && !tamHiding && !tamFollows) { // Tam, out of the rubble: a clerk, no armor, satchel hugged tight
      c.save(); c.translate(sx3 - 66, gy); c.scale(CH, CH); tamBody(c); c.restore();
    }
    if (tamFollows) { // Tam trailing the hero out of the camp
      c.save(); c.translate(tamWalk.x, gy); c.scale(CH, CH); tamBody(c, Math.sin(tamWalk.wphase)); c.restore();
    }
```

Then add the helper directly above `function drawFallenCamp(c, W, gy, now) {`:

```js
function tamBody(c, sw = 0) { // Tam the clerk, satchel hugged tight; sw = walk swing
  px(c, -4, -4 + Math.max(0, sw) * 2, 4, 10 - Math.max(0, sw) * 2, "#4a3a26"); px(c, 1, -4 + Math.max(0, -sw) * 2, 4, 10 - Math.max(0, -sw) * 2, "#4a3a26");
  px(c, -4, 4, 4, 3, "#241a10"); px(c, 1, 4, 4, 3, "#241a10");
  px(c, -6, -22, 12, 18, "#8a6d3b"); px(c, -6, -22, 3, 18, "rgba(255,255,255,0.12)");
  px(c, -8, -14, 7, 9, "#5a4426"); px(c, -8, -14, 7, 2, "#6e5430");
  px(c, -5, -32, 11, 11, "#d8a878"); px(c, -6, -34, 12, 4, "#6e4a22");
  px(c, -3, -28, 2, 2, "#1c1208"); px(c, 2, -28, 2, 2, "#1c1208");
}
```

(This is the existing block's pixels verbatim, with leg-swing offsets added; both eyes kept.)

- [ ] **Step 3: Tam follow physics in `update()`**

Directly after the survivor trail-behind line (anchor `// trail BEHIND the hero, never in the firing line`) add:

```js
  if (tamFollows && scene === "fallencamp") { const tx = char.x - 40 * char.facing; if (Math.abs(tamWalk.x - tx) > 6) { tamWalk.x += Math.sign(tx - tamWalk.x) * 105 * dt; tamWalk.wphase += dt * 9; } } // Tam keeps up on the way out
```

- [ ] **Step 4: Replace the linger loop with the inspection + exit**

In `playFallenCamp`, replace the entire `while (true) { // linger by the wreck with Tam ... }` block (lines 844-848) with:

```js
  // ---- 1.5 opens: the body has one more thing to say ----
  await say("Tam", "Is it dead? It is dead. Tell me it is dead.");
  if (zoms[0]) await walkToX(zoms[0].x + 30);
  await say("", "You crouch over the thing. Under the pauldron scrap, something GLINTS. Not bone. Not steel from any forge you know.");
  await say("", "A coin-sized plate of metal and glass, still warm, a hair-thin filament running up into the spine. Under the glass, a faint blue light. Pulsing. Steady as a heartbeat.");
  await say("", "Someone MADE this thing what it is. And a plate that receives can be spoken to. Someone could be steering them.");
  giveItem(IMPLANT_NOTE); implantStep = 1;
  logCmd("# taken: the spinal implant", false);
  await say("Tam", "That is not plague. Plague does not solder. I am done shaking, scout. That thing in your pack is PROOF.");
  setLocations(["keep"]);
  await say("Tam", "Take it to your knight. And take me with you. I am not staying with the crows.");
  await ask({ prompt: "Back to the keep", placeholder: 'you.walk("keep")', concept: "walk", validate: (rr) => (rr.walk === "keep" ? null : 'The keep needs to see this: you.walk("keep").') }, null);
  logCmd('you.walk("keep")', true);
  tamFollows = true; tamWalk = { x: char.x - 60, wphase: 0 };
  await walkTo(0.03); await wait(0.4);
  tamFollows = false; tamAtKeep = true;
  await fadeTo("keep"); char.x = els.W * 0.06; char.facing = 1; zoms = []; ARROWS = []; setupTownsfolk(); prog(name + " · 1.5");
  setLocations(["craftsman", "forhire", "blacksmith", "armorsmith", "knight", "chamber", "proving"]);
  await say("Tam", "Stone walls. I forgot what safe feels like. I will be by the gate, catching my breath.");
  await say("", 'The implant sits heavy in your pack. The knight needs to see it. you.walk("knight").');
}
```

Also in `playMutant`, replace the final line

```js
  await say("", "One arrow, held until the if said now. Whatever is out on that road, you do not meet it by firing early... (to be continued)");
```

with:

```js
  await say("", "One arrow, held until the if said now. And in the quiet after, the body is not done telling you things.");
```

- [ ] **Step 5: `playKeep` quiet mode + DEV 1.4 continuation**

Change the `playKeep` signature and wrap its pre-loop block:

```js
async function playKeep(name, quiet = false) {
  if (!quiet) {
    await fadeTo("keep"); char.x = els.W * 0.06; char.facing = 1; zoms = []; ARROWS = []; setupTownsfolk(); prog(name + " · 1.3"); setLocations(["craftsman", "forhire", "blacksmith", "armorsmith", "knight", "chamber", "proving"]);
    if (survivorFollow) { survivor = { x: char.x + 36, y: 0, state: "beside", wphase: 0 }; await say("Survivor", "You've brought me to safety. I won't forget it. Thank you, friend."); survivor = null; survivorFollow = false; }
    else survivor = null;
    await say("", "Inside the keep at last. Townsfolk mill about; four traders keep stalls along the back wall.");
    await say("", "A red carpet runs up the centre to a grand staircase, and the sealed doors of the king's chamber above it.");
    await say("", 'An armoured knight stands watch to the east, a quest-marker above him. Wander: walk to a stall, the knight, or the chamber, e.g. you.walk("knight").');
  }
  while (true) {
```

(The `while (true)` body is unchanged.) Then in the DEV 1.4 block change

```js
    await playFallenCamp(name); return;
```

to

```js
    await playFallenCamp(name); await playKeep(name, true); return;
```

- [ ] **Step 6: Tam in the keep + speaker anchors**

In `drawKeep`, directly before the final line `if (survivor) P(c, survivor.x, gy, ...)` add:

```js
  if (tamAtKeep) { const tx5 = W * 0.035; c.save(); c.translate(tx5, gy); c.scale(CH, CH); tamBody(c); c.restore();
    c.fillStyle = "#cdd8e6"; c.font = "10px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText("TAM", tx5, gy + 18); }
```

In `speakerAnchor`, after the `if (w === "armorsmith" && scene === "armory")` line add:

```js
  if (w === "tam" && scene === "keep" && tamAtKeep) return { x: W * 0.035, y: gy - 30 * CH };
  if (w === "tam" && scene === "fallencamp" && tamFollows) return { x: tamWalk.x, y: gy - 30 * CH };
```

- [ ] **Step 7: Syntax check + behavioral drive**

Run: `node --check C:\Users\Ryan\critter-forge\lesson1.js` → exit 0.

Write `C:\Users\Ryan\AppData\Local\Temp\sts-drive\q1-camp-exit.mjs`:

```js
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const shots = 'C:/Users/Ryan/AppData/Local/Temp/sts-drive/shots';
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://localhost:8931/lesson1.html#1.4', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => { const ps = document.querySelector('#pystat'); return ps && ps.textContent.includes('python ready'); }, null, { timeout: 120000 });
await page.waitForTimeout(1000);
// Tab through the ENTIRE camp: sweep, riddles, mutant fight, inspection, exit walk
let arrived = false;
for (let i = 0; i < 70; i++) {
  await page.keyboard.press('Tab'); await page.waitForTimeout(650);
  const p = await page.evaluate(() => (document.querySelector('#prompt')?.textContent || ''));
  if (p.includes('Explore the keep')) { arrived = true; break; }
}
console.log('ARRIVED AT KEEP:', arrived);
const inv = await page.evaluate(() => document.querySelector('#invItems')?.innerText || '');
console.log('INVENTORY HAS IMPLANT:', inv.includes('Spinal Implant'));
await page.screenshot({ path: `${shots}/q1-keep-arrival.png` });
console.log('PAGEERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
```

Run: `node C:\Users\Ryan\AppData\Local\Temp\sts-drive\q1-camp-exit.mjs`
Expected: `ARRIVED AT KEEP: true`, `INVENTORY HAS IMPLANT: true`, `PAGEERRORS: none`. Read the screenshot: the keep interior with Tam (satchel clerk sprite + TAM label) standing by the west gate.

- [ ] **Step 8: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "feat(1.5): the body's answer — implant inspection replaces the camp linger; Tam follows you home and waits by the keep gate"
```

(Append trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.)

---

### Task 2: Keep wiring — knight hand-in + epilogue beats, craftsman unlock, workshop scene shell, DEV 1.5

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` — keep loop knight/stall branches (~1511-1523), quest markers + padlock in `drawKeep` (~666, 676-678), DEV blocks in `play()` (339-346), new scene state + `drawWorkshop` + `playWorkshop` + knight beat functions, `draw()` scene dispatch (~1568-1572), `update()` spark decay, `speakerAnchor`.
- Modify: `C:\Users\Ryan\critter-forge\lesson1.html` — DEV bar buttons.

**Interfaces:**
- Consumes (Task 1): `implantStep`, `tamAtKeep`, `IMPLANT_NOTE`, `playKeep(name, quiet)`.
- Produces (Task 3 relies on): scene `"workshop"`; `let workshopPairs = [], workshopLegend = false, workshopSpark = 0;` (the board renders `workshopPairs.slice(-9)` as lines, coloring lines containing `"HUNT"` red `#ff6b6b`, lines containing `"->"` blue `#9fd9ff`, others gold `#ffd43b`; when `workshopLegend` is true the legend `1 = WAIT   2 = MOVE   4 = HUNT` shows at the board's foot); `playWorkshop(name)` whose pre-decipher branch ends with the exact line `await say("Craftsman", "Give me time to rig the probes. Come back and we will pry it open together.");` which Task 3 replaces; `playSignalEpilogue(name)` reachable from the knight when `implantStep === 3`.

- [ ] **Step 1: Workshop state + scene dispatch + spark decay**

After the `let implantStep = 0; ...` lines from Task 1, add:

```js
let workshopPairs = [], workshopLegend = false, workshopSpark = 0; // the craftsman's probe board
```

In `draw()`, the scene dispatch chain (anchor `else if (scene === "fallencamp") drawFallenCamp(c, W, gy, now);`) gains, directly after that line:

```js
  else if (scene === "workshop") drawWorkshop(c, W, gy, now);
```

In `update()`, after the `shootT = Math.max(0, shootT - dt);` line add:

```js
  if (workshopSpark > 0) workshopSpark = Math.max(0, workshopSpark - dt * 1.4);
```

- [ ] **Step 2: `drawWorkshop` — the craftsman's bench**

Add directly below the end of `drawArmory` (after its closing `}`):

```js
// ---- the craftsman's workshop (1.5): bench, vice, crank rig, probe board ----
function drawWorkshop(c, W, gy, now) {
  const H = els.H;
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#171a24"); g.addColorStop(1, "#1f2330"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  px(c, 0, H * 0.1, W, 5, "#a8832a"); px(c, 0, H * 0.1 + 5, W, 2, "#ffd43b");
  for (let i = 0; i < 6; i++) { const cx = W * (0.08 + i * 0.17); px(c, cx - 11, 0, 22, H, "#2c303b"); }
  const floorY = H * 0.8;
  for (let x = 0; x < W; x += 30) px(c, x, floorY, 30, H - floorY, (x / 30 | 0) % 2 ? "#2a2d36" : "#262931");
  c.fillStyle = "rgba(4,6,10,.5)"; c.fillRect(0, 0, W, H);
  const bx = W / 2, bw = Math.min(860, W * 0.68), half = bw / 2, top = H * 0.09, counterY = floorY - 44;
  px(c, bx - half - 16, top + 40, 18, counterY - top - 8, "#5a4424"); px(c, bx + half - 2, top + 40, 18, counterY - top - 8, "#5a4424");
  px(c, bx - half - 16, top + 40, 6, counterY - top - 8, "#7a5a30"); px(c, bx + half - 2, top + 40, 6, counterY - top - 8, "#7a5a30");
  px(c, bx - half, top + 48, bw, counterY - top - 52, "#241c11");
  for (let y = top + 48; y < counterY - 6; y += 20) px(c, bx - half, y, bw, 2, "#1a140c");
  // green scalloped awning (the craftsman's stall color)
  for (let s = -half - 30; s < half + 30; s += 52) px(c, bx + s, top, 52, 46, ((s / 52) | 0) % 2 ? "#2f9e44" : "#f1f3f5");
  for (let s = -half - 30; s < half + 30; s += 52) { c.fillStyle = ((s / 52) | 0) % 2 ? "#2f9e44" : "#f1f3f5"; c.beginPath(); c.arc(bx + s + 26, top + 46, 26, 0, Math.PI); c.fill(); }
  px(c, bx - half - 36, top - 6, bw + 72, 8, "#8a6d3b"); px(c, bx - half - 36, top - 6, bw + 72, 3, "#a9844a");
  px(c, bx - 88, top + 66, 176, 40, "#6b4f2a"); px(c, bx - 88, top + 66, 176, 4, "#8a6d3b");
  c.fillStyle = "#e8dcc0"; c.font = "bold 19px 'Chakra Petch',sans-serif"; c.textAlign = "center"; c.fillText("CRAFTSMAN", bx, top + 92);
  // the probe board: slate panel, IN/OUT lines, legend once revealed
  { const bw2 = Math.min(300, bw * 0.36), bx0 = bx - half + 24, by0 = top + 116, bh2 = counterY - by0 - 26;
    px(c, bx0 - 8, by0 - 8, bw2 + 16, bh2 + 16, "#54422a"); px(c, bx0 - 8, by0 - 8, bw2 + 16, 3, "#6b5636");
    px(c, bx0, by0, bw2, bh2, "#10141c");
    c.font = "bold 12px 'IBM Plex Mono',monospace"; c.textAlign = "left"; c.fillStyle = "#8a97a8";
    c.fillText("PROBE LOG", bx0 + 10, by0 + 20);
    c.font = "13px 'IBM Plex Mono',monospace";
    workshopPairs.slice(-9).forEach((ln, i) => {
      c.fillStyle = ln.includes("HUNT") ? "#ff6b6b" : ln.includes("->") ? "#9fd9ff" : "#ffd43b";
      c.fillText(ln, bx0 + 10, by0 + 42 + i * 19);
    });
    if (workshopLegend) { c.fillStyle = "#ffd43b"; c.font = "bold 12px 'IBM Plex Mono',monospace"; c.fillText("1 = WAIT   2 = MOVE   4 = HUNT", bx0 + 10, by0 + bh2 - 12); } }
  // the bench: brass vice holding the implant, wired to a crank rig of copper and glass
  { const wx = bx + half * 0.08, wy = counterY - 8;
    px(c, wx - 26, wy - 20, 52, 8, "#8a6d3b"); px(c, wx - 20, wy - 27, 40, 9, "#6a727c"); px(c, wx - 20, wy - 27, 40, 2, "#8a939e");
    px(c, wx - 7, wy - 35, 14, 9, "#9aa3ad"); px(c, wx - 7, wy - 35, 14, 3, "#c9d4e4");
    const pulse = 0.5 + 0.5 * Math.sin(now * 3);
    c.shadowColor = "#4dabf7"; c.shadowBlur = 10 * pulse; px(c, wx - 2, wy - 32, 4, 3, "#4dabf7"); c.shadowBlur = 0;
    const rx = wx + 120;
    px(c, rx - 16, wy - 46, 32, 46, "#3a2c18"); px(c, rx - 16, wy - 46, 32, 3, "#54422a");
    c.strokeStyle = "#b87333"; c.lineWidth = 3;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(rx, wy - 26, 7 + i * 3, 0.4, Math.PI * 2 - 0.4); c.stroke(); }
    px(c, rx + 24, wy - 28, 12, 28, "rgba(160,220,255,0.25)"); px(c, rx + 24, wy - 28, 12, 3, "#9aa3ad");
    c.strokeStyle = "#caa24a"; c.lineWidth = 2; c.beginPath(); c.moveTo(rx - 16, wy - 24); c.lineTo(wx + 8, wy - 31); c.stroke();
    if (workshopSpark > 0) { const sp = 1 - workshopSpark; const sx2 = rx - 16 + (wx + 8 - (rx - 16)) * sp; c.shadowColor = "#ffd43b"; c.shadowBlur = 12; px(c, sx2 - 2, wy - 33, 5, 5, "#ffe066"); c.shadowBlur = 0; } }
  // counter
  px(c, bx - half - 28, counterY, bw + 56, 14, "#8a6d3b"); px(c, bx - half - 28, counterY, bw + 56, 4, "#a9844a");
  px(c, bx - half - 28, counterY + 14, bw + 56, 34, "#6b4f2a");
  for (let x = bx - half - 28; x < bx + half + 28; x += 52) px(c, x, counterY + 14, 3, 34, "#4a3a22");
  // the craftsman: wiry, grey-haired, spectacles, leather apron, gentle bob
  { const sc = 5, bob = Math.sin(now * 1.5) * 0.5; c.save(); c.translate(bx + half * 0.42, counterY + 2 - bob); c.scale(sc, sc);
    px(c, -7, -26, 14, 18, "#2f5a35"); px(c, -7, -26, 3, 18, "rgba(255,255,255,.14)");
    px(c, -5, -21, 10, 13, "#5a4426"); px(c, -5, -21, 10, 2, "#6e5430");
    px(c, -10, -24, 3, 14, "#2f5a35"); px(c, 7, -24, 3, 14, "#2f5a35");
    px(c, -12, -11, 5, 4, "#d8a878"); px(c, 7, -11, 5, 4, "#d8a878");
    px(c, -5, -37, 11, 11, "#d8a878"); px(c, -6, -39, 13, 4, "#8a8f96");
    px(c, -4, -33, 4, 3, "#c9d4e4"); px(c, 1, -33, 4, 3, "#c9d4e4");
    px(c, -3, -32, 1, 1, "#1c1208"); px(c, 2, -32, 1, 1, "#1c1208");
    px(c, -3, -28.5, 7, 1.5, "#8a6242");
    c.restore(); }
}
```

- [ ] **Step 3: Knight beats + workshop shell**

Add above `async function playKeep(name, quiet = false) {`:

```js
// ---- 1.5: the implant reaches the keep ----
async function playImplantHandIn(name) {
  await say("Knight-Captain", "Back already, scout. And with a face that says the camp is worse than I feared. Report.");
  await say("", "You lay it out: a camp taken without one arrow loosed, a boy alive under the storehouse, a thing that stepped around your shots. Then you set the implant in his gauntlet.");
  await say("Knight-Captain", "Metal and glass, grown into a dead man's spine. Twenty years I have watched this plague ruin bodies. I have never once seen it WIRED.");
  await say("Tam", "It moved like it was told to move, sir. Like the whole night was somebody's plan.");
  await say("Knight-Captain", "This could be something big. Bigger than the camp. Bigger than this keep. And I need better eyes than mine on it.");
  await say("Knight-Captain", "The craftsman. He reads broken machines the way clerks read ledgers. His stall is open to you, scout. Go.");
  implantStep = 2;
  await say("", 'The padlock comes off the craftsman\'s stall. you.walk("craftsman").');
}
async function playSignalEpilogue(name) {
  await say("Knight-Captain", "The craftsman sent his boy running ahead. Orders, he said. Numbers with MEANINGS in them. Tell me he is wrong.");
  await say("", "You tell him the rest: weak signals ignored, strong signals obeyed, and the last stream pulled off the dead thing's spine reading HUNT, HUNT, HUNT.");
  await say("Knight-Captain", "Then the dead are not wandering. They are DEPLOYED. Somebody up that road is speaking to them in numbers, and the camp was not a tragedy. It was a maneuver.");
  await say("Knight-Captain", "Rest tonight, scout. You have earned it twice over. Tomorrow, we find out who is on the other end of that signal... (to be continued)");
  implantStep = 4;
  if (Sv) awardXP(30);
}
async function playWorkshop(name) {
  await fadeTo("workshop"); char.x = els.W * 0.24; char.facing = 1; prog(name + " · 1.5");
  if (implantStep >= 3) {
    await say("Craftsman", "The rules are with the knight and the little horror is locked in my strongbox, where it can pulse at nobody. Go on, scout. He is waiting.");
  } else {
    await say("Craftsman", "So you are the scout. The captain's runner said you carry something that should not exist. Hand it here. Careful. CAREFUL.");
    await say("", "He sets the implant in a brass vice like it might bite, wires it to a crank rig of copper and glass, and drags a slate board where you both can see it.");
    await say("Craftsman", "It still ANSWERS. Look. I crank a signal IN, it answers OUT. Every machine keeps rules between the in and the out. You and I are going to steal them.");
    await say("Craftsman", "Give me time to rig the probes. Come back and we will pry it open together.");
  }
  await fadeTo("keep"); char.x = els.W * SCENES.keep.craftsman; char.facing = 1; setupTownsfolk();
}
```

Then wire the keep loop. The knight branch (anchor `} else if (r.walk === "knight") {`) becomes:

```js
    } else if (r.walk === "knight") {
      if (implantStep === 1) await playImplantHandIn(name);
      else if (implantStep === 3) await playSignalEpilogue(name);
      else if (implantStep === 4) await say("Knight-Captain", "Sleep, scout. Tomorrow we hunt the voice behind the signal.");
      else if (questStep === 0) await startQuest(name);
      else if (questStep === 2) await playBeat3(name);
      else if (questStep === 3) await say("Knight-Captain", "The armoury's open. See the armorsmith for your scout kit before you report back.");
      else if (questStep === 4) await playBeatWrap(name);
      else if (questStep >= 5) await say("Knight-Captain", "You've earned the keep's trust, scout. Rest. The north gate is tomorrow's worry.");
      else await say("Knight-Captain", "The cart won't pack itself. Off with you.");
    } else {
```

And the stall branch (anchor `if (r.walk === "armorsmith" && armoryOpen && questStep < 5)`) becomes:

```js
      if (r.walk === "craftsman" && implantStep >= 2) await playWorkshop(name);
      else if (r.walk === "armorsmith" && armoryOpen && questStep < 5) await playBeat4(name);
      else if (r.walk === "armorsmith" && questStep >= 5) await shopVisit();
      else if (r.walk === "armorsmith") await say(KEEP_VENDOR.armorsmith[0], "The captain hasn't cleared you to trade yet. See the knight.");
      else await say(LOCKED_STALL[r.walk][0], LOCKED_STALL[r.walk][1]); // forhire/blacksmith stay locked until later chapters
```

- [ ] **Step 4: Markers + padlock**

In `drawKeep`: the padlock line (anchor `if (name !== "armorsmith") lockBadge(c, x, gy - 24 * CH);`) becomes:

```js
    if (name !== "armorsmith" && !(name === "craftsman" && implantStep >= 2)) lockBadge(c, x, gy - 24 * CH);
```

The knight marker line (anchor `if (questStep === 0 || questStep === 2 || questStep === 4)`) becomes:

```js
    if (questStep === 0 || questStep === 2 || questStep === 4 || implantStep === 1 || implantStep === 3) { c.fillStyle = "#ffd43b"; c.font = "bold 22px 'Chakra Petch',sans-serif"; c.fillText("!", kx, cy - 18 + Math.sin(now * 3) * 3); }
```

Directly after the armorsmith moving-marker line (anchor `if (armoryOpen && questStep === 3)`) add:

```js
    if (implantStep === 2) { const cx4 = W * SCENES.keep.craftsman; c.fillStyle = "#ffd43b"; c.font = "bold 22px 'Chakra Petch',sans-serif"; c.fillText("!", cx4, gy - 44 * CH + Math.sin(now * 3) * 3); }
```

- [ ] **Step 5: Craftsman speaker anchor in the workshop**

In `speakerAnchor`, after the armory armorsmith special case, add:

```js
  if (w === "craftsman" && scene === "workshop") { const half = Math.min(860, W * 0.68) / 2; return { x: W / 2 + half * 0.42, y: els.H * 0.8 - 44 - 200 }; }
```

- [ ] **Step 6: DEV 1.5**

In `play()`: extend the `skip` condition with `|| start === "1.5"` and the scene mapping with `start === "1.5" ? "keep" :` (insert before the `start === "1.4"` ternary arm). Then after the DEV 1.4 block add:

```js
  if (start === "1.5") { // DEV: back at the keep, implant in the pack, Tam by the gate
    questStep = 5; lesson1Done = true; char.gold = 1.3; char.maxHearts = 6; char.hearts = 6;
    for (const k of KIT_PIECES) char.kit[k] = true;
    implantStep = 1; tamAtKeep = true; giveItem(IMPLANT_NOTE);
    char.x = els.W * 0.06; char.facing = 1; setupTownsfolk(); prog(name + " · 1.5");
    setLocations(["craftsman", "forhire", "blacksmith", "armorsmith", "knight", "chamber", "proving"]);
    await playKeep(name, true); return;
  }
```

In `lesson1.html`, find the DEV bar buttons (search `data-scene="1.4"`) and add after that button:

```html
      <button data-scene="1.5">1.5</button>
```

- [ ] **Step 7: Syntax check + behavioral drive**

`node --check C:\Users\Ryan\critter-forge\lesson1.js` → exit 0.

Write `C:\Users\Ryan\AppData\Local\Temp\sts-drive\q2-keep-wiring.mjs`:

```js
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const shots = 'C:/Users/Ryan/AppData/Local/Temp/sts-drive/shots';
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://localhost:8931/lesson1.html#1.5', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => { const ps = document.querySelector('#pystat'); return ps && ps.textContent.includes('python ready'); }, null, { timeout: 120000 });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${shots}/q2-1-dev15.png` }); // keep, Tam at gate, knight !
const setCode = async (code) => page.evaluate((code) => { document.querySelector('.CodeMirror').CodeMirror.setValue(code); }, code);
const status = () => page.evaluate(() => document.querySelector('#status')?.textContent || '');
const promptTxt = () => page.evaluate(() => document.querySelector('#prompt')?.textContent || '');
// walk to the knight (explore ask placeholder IS you.walk("knight"), so Tab works)
await page.keyboard.press('Tab'); await page.waitForTimeout(1200);
// Tab through the hand-in dialogue until the explore prompt returns
for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(600); if ((await promptTxt()).includes('Explore the keep')) break; }
await page.screenshot({ path: `${shots}/q2-2-handin-done.png` }); // craftsman ! + padlock gone
// walk to the craftsman
await setCode('you.walk("craftsman")'); await page.click('#run'); await page.waitForTimeout(1500);
await page.waitForTimeout(1200); // fade into the workshop
await page.screenshot({ path: `${shots}/q2-3-workshop.png` }); // bench, vice, rig, board, craftsman
for (let i = 0; i < 10; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(600); if ((await promptTxt()).includes('Explore the keep')) break; }
console.log('BACK IN KEEP:', (await promptTxt()).includes('Explore the keep'));
await page.screenshot({ path: `${shots}/q2-4-back.png` });
console.log('PAGEERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
```

Run it. Expected: `BACK IN KEEP: true`, `PAGEERRORS: none`. Read all four screenshots: (1) Tam by the gate + `!` over the knight; (2) padlock gone from CRAFTSMAN + `!` over his stall; (3) the workshop: green awning, CRAFTSMAN sign, slate PROBE LOG board, vice with blue-pulsing implant, coil rig, spectacled craftsman; (4) back in the keep.

- [ ] **Step 8: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js lesson1.html
git -C C:\Users\Ryan\critter-forge commit -m "feat(1.5): knight hand-in + craftsman unlocked + workshop scene shell (bench, vice, crank rig, probe board) + DEV 1.5"
```

(Append trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.)

---

### Task 3: The three decipher rounds + the HUNT reveal + epilogue

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` — replace one line inside `playWorkshop`, add `DECIPHER`, `probePair`, `runDecipherRounds` above it.

**Interfaces:**
- Consumes (Task 2): `workshopPairs`, `workshopLegend`, `workshopSpark`, `playWorkshop`'s exact line `await say("Craftsman", "Give me time to rig the probes. Come back and we will pry it open together.");`; (Task 1) `implantStep`. Also `ask`, `say`, `wait`, `lastSrc`, `runUser`, `translate`.
- Produces: `implantStep = 3` on completion, unlocking `playSignalEpilogue` at the knight (already wired in Task 2).

- [ ] **Step 1: Round data + helpers**

Add directly above `async function playWorkshop(name) {`:

```js
// ---- the decipher rounds: watch pairs on the board, write the steps between ----
async function probePair(inn, out, word) {
  workshopPairs.push(`IN ${inn}`); workshopSpark = 1; await wait(0.55);
  workshopPairs[workshopPairs.length - 1] = `IN ${inn} -> OUT ${out}${word ? "   " + word : ""}`; await wait(0.35);
}
const DECIPHER = [
  { intro: "First rule. The shallow one. Watch the board.",
    probes: [2, 4, 7], seed: 7, expect: (s) => s * 2 + 1, reruns: [2, 5], needsElse: false,
    prompt: "Decipher rule 1: set out from signal", rows: 1, concept: "variable",
    placeholder: "out = signal * 2 + 1",
    task: "The board shows what the machine did: IN 2 -> OUT 5, IN 4 -> OUT 9, IN 7 -> OUT 15. The variable signal is seeded with 7. Write the steps between IN and OUT: set out from signal so your steps match EVERY pair, not just this one." },
  { intro: "Second rule. Stranger. Watch what it does to WEAK signals.",
    probes: [4, 9, 12, 15], seed: 12, expect: (s) => (s < 10 ? 0 : s - 10), reruns: [7, 15, 20], needsElse: true,
    prompt: "Decipher rule 2: the machine ignores weak signals", rows: 4, concept: "if",
    placeholder: "if signal < 10:\n    out = 0\nelse:\n    out = signal - 10",
    task: "IN 4 -> OUT 0. IN 9 -> OUT 0. IN 12 -> OUT 2. IN 15 -> OUT 5. Below ten it answers nothing: out is 0. Ten and above, it answers signal minus 10. You know if. Now meet else: the if answers the YES, and the else catches every NO. signal is seeded with 12." },
  { intro: "Last rule. The deep one. This is where it keeps its orders.",
    probes: [3, 8, 12, 20], seed: 20, expect: (s) => (s < 10 ? s + 1 : s * 2), reruns: [6, 12, 15], needsElse: true,
    prompt: "Decipher rule 3: two behaviours, one machine", rows: 4, concept: "if",
    placeholder: "if signal < 10:\n    out = signal + 1\nelse:\n    out = signal * 2",
    task: "IN 3 -> OUT 4. IN 8 -> OUT 9. IN 12 -> OUT 24. IN 20 -> OUT 40. Weak signals gain one. Strong signals are doubled. One if, one else, and the machine has no secrets left. signal is seeded with 20." },
];
async function runDecipherRounds() {
  for (let i = 0; i < DECIPHER.length; i++) {
    const R = DECIPHER[i];
    await say("Craftsman", R.intro);
    for (const p of R.probes) await probePair(p, R.expect(p));
    await ask({
      prompt: R.prompt, placeholder: R.placeholder, rows: R.rows, seed: "signal = " + R.seed, concept: R.concept, task: R.task,
      validate: (r) => {
        if (R.needsElse && !/\bif\b[^\n]*\bsignal\b[^\n]*:/.test(lastSrc)) return "Ask the question first: an if line about signal, ending with a colon.";
        if (R.needsElse && !/\belse\s*:/.test(lastSrc)) return "The if answers the yes. You still need an else: for every no.";
        if (Number(r.vars.out) !== R.expect(R.seed)) return `The board disagrees. IN ${R.seed} must come OUT ${R.expect(R.seed)}; your steps made ${r.vars.out === undefined ? "nothing" : r.vars.out}. Set out from signal.`;
        for (const h of R.reruns) {
          let rr2; try { rr2 = JSON.parse(runUser(lastSrc, "signal = " + h, "")); } catch (e) { return "Something broke re-running your steps. Try again."; }
          if (rr2.err) return translate(rr2.err);
          if (Number(rr2.vars.out) !== R.expect(h)) return `The craftsman cranks a fresh probe: IN ${h}. Your steps say ${rr2.vars.out === undefined ? "nothing" : rr2.vars.out}. The machine says ${R.expect(h)}. It answers EVERY signal, not just one.`;
        }
        return null;
      },
    }, null);
    await say("Craftsman", i === 0 ? "That is it. That is exactly it. Two rules left." : i === 1 ? "An if with an else. You just taught a machine's whole heart to hold a coin. One left." : "All three rules, stolen clean. Now for the part that has kept my hands shaking.");
  }
  workshopLegend = true;
  await say("Craftsman", "The plate keeps a BUFFER: the last orders it was ever fed. I pulled three of them. The legend is on the board. Hold on to something.");
  await probePair(3, 4, "HUNT"); await probePair(3, 4, "HUNT"); await probePair(3, 4, "HUNT");
  await say("Craftsman", "Weak signals wait. Strong signals move. And the last thing anyone ever said to this creature was HUNT. HUNT. HUNT.");
  await say("Craftsman", "This is not plague, scout. This is COMMAND. Somebody out there is speaking to the dead in numbers, and the dead are LISTENING.");
  implantStep = 3;
  await say("", 'The knight must hear this now. you.walk("knight").');
}
```

- [ ] **Step 2: Wire the rounds into `playWorkshop`**

Replace the exact line

```js
    await say("Craftsman", "Give me time to rig the probes. Come back and we will pry it open together.");
```

with:

```js
    await runDecipherRounds();
```

- [ ] **Step 3: Syntax check + full behavioral drive (failure paths + happy path + epilogue)**

`node --check C:\Users\Ryan\critter-forge\lesson1.js` → exit 0.

Write `C:\Users\Ryan\AppData\Local\Temp\sts-drive\q3-decipher.mjs`:

```js
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';
const shots = 'C:/Users/Ryan/AppData/Local/Temp/sts-drive/shots';
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto('http://localhost:8931/lesson1.html#1.5', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForFunction(() => { const ps = document.querySelector('#pystat'); return ps && ps.textContent.includes('python ready'); }, null, { timeout: 120000 });
await page.waitForTimeout(1000);
const setCode = async (code) => page.evaluate((code) => { document.querySelector('.CodeMirror').CodeMirror.setValue(code); }, code);
const status = () => page.evaluate(() => document.querySelector('#status')?.textContent || '');
const promptTxt = () => page.evaluate(() => document.querySelector('#prompt')?.textContent || '');
const untilPrompt = async (s, n = 14) => { for (let i = 0; i < n; i++) { if ((await promptTxt()).includes(s)) return true; await page.keyboard.press('Tab'); await page.waitForTimeout(650); } return (await promptTxt()).includes(s); };
// knight hand-in, then to the craftsman
await page.keyboard.press('Tab'); await page.waitForTimeout(1200); // walk to knight (placeholder)
if (!(await untilPrompt('Explore the keep'))) throw new Error('hand-in never finished');
await setCode('you.walk("craftsman")'); await page.click('#run'); await page.waitForTimeout(2500);
if (!(await untilPrompt('Decipher rule 1'))) throw new Error('never reached round 1');
// failure: hardcoded answer passes the seed but fails the hidden re-run
await setCode('out = 15'); await page.click('#run'); await page.waitForTimeout(800);
console.log('R1 HARDCODE:', await status());
await setCode('out = signal * 2 + 1'); await page.click('#run'); await page.waitForTimeout(800);
if (!(await untilPrompt('Decipher rule 2'))) throw new Error('never reached round 2');
// failure: no else
await setCode('out = 0'); await page.click('#run'); await page.waitForTimeout(800);
console.log('R2 NO-IF:', await status());
await setCode('if signal < 10:\n    out = 0\nelse:\n    out = signal - 10'); await page.click('#run'); await page.waitForTimeout(800);
if (!(await untilPrompt('Decipher rule 3'))) throw new Error('never reached round 3');
await setCode('if signal < 10:\n    out = signal + 1\nelse:\n    out = signal * 2'); await page.click('#run'); await page.waitForTimeout(800);
// the reveal: Tab through craftsman lines while probes write HUNT to the board
for (let i = 0; i < 10; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(800); }
await page.screenshot({ path: `${shots}/q3-1-hunt.png` }); // board: legend + HUNT lines in red
if (!(await untilPrompt('Explore the keep'))) throw new Error('never left the workshop');
// epilogue at the knight
await page.keyboard.press('Tab'); await page.waitForTimeout(1200);
let sawEpilogue = false;
for (let i = 0; i < 12; i++) {
  const t = await page.evaluate(() => document.body.innerText);
  if (t.includes('DEPLOYED')) sawEpilogue = true;
  if ((await promptTxt()).includes('Explore the keep')) break;
  await page.keyboard.press('Tab'); await page.waitForTimeout(650);
}
console.log('EPILOGUE (DEPLOYED line):', sawEpilogue);
await page.screenshot({ path: `${shots}/q3-2-epilogue.png` });
console.log('PAGEERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
```

Run it. Expected:
- `R1 HARDCODE:` message containing "It answers EVERY signal, not just one"
- `R2 NO-IF:` message containing "an if line about signal"
- `EPILOGUE (DEPLOYED line): true`
- `PAGEERRORS: none`
- Read `q3-1-hunt.png`: the probe board shows the legend and three red `IN 3 -> OUT 4   HUNT` lines. Read `q3-2-epilogue.png`.

NOTE for the implementer: the reveal's Tab presses double as dialogue advances; if the board screenshot lands before all three HUNT probes render, add one more short wait and retake — fix the script, never the game.

- [ ] **Step 4: Full-quest regression pass**

Re-run Task 1's drive: `node C:\Users\Ryan\AppData\Local\Temp\sts-drive\q1-camp-exit.mjs`
Expected: still `ARRIVED AT KEEP: true`, `PAGEERRORS: none` (the whole 1.4 camp still Tab-skips end to end into 1.5).

- [ ] **Step 5: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "feat(1.5): the decipher — three probe rounds (first written else) w/ hidden-input re-runs, the HUNT buffer reveal, and the knight's epilogue"
```

(Append trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.)

---

## Self-review notes

- Spec coverage: inspection + item + Tam reaction (T1), keep exit + follow + gate placement (T1), knight hand-in + something-big + craftsman unlock (T2), workshop scene like the armory (T2), three rounds w/ exact pairs/rules/seeds/hidden re-runs + else teaching (T3), HUNT legend reveal (T3), receiving-orders epilogue + (to be continued) + XP 30 (T2 beat, T3 trigger), implantStep separate from questStep (T1), DEV 1.5 (T2), placeholders Tab-skip-safe (all asks').
- Round math checked: R1 2->5/4->9/7->15 under s*2+1 ✓; R2 4->0/9->0/12->2/15->5 under (s<10?0:s-10) ✓ and reruns 7->0/15->5/20->10 ✓; R3 3->4/8->9/12->24/20->40 under (s<10?s+1:s*2) ✓ and reruns 6->7/12->24/15->30 ✓; buffer IN 3 -> OUT 4 = HUNT per legend ✓.
- Type consistency: `implantStep`, `tamAtKeep`, `tamBody`, `workshopPairs/Legend/Spark`, `playWorkshop`, `playImplantHandIn`, `playSignalEpilogue`, `runDecipherRounds`, `probePair` used identically across tasks. T3's replacement anchor line is produced verbatim by T2.
- Em-dash scan of all player-facing strings above: clean.
