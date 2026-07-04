# Maker's Hall Workshop Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the workshop scene's visuals with the approved "Maker's Hall" design (workshop-styles.js variant B) and draw the hero at booth scale beside the craftsman.

**Architecture:** One visual-only change in `lesson1.js`: rebuild `drawWorkshop` (tent interior, craft half, pendulum clock, switchboard half, same PROBE LOG/vice/spark state hooks), add a posed armored hero inside it, add `"workshop"` to the world-hero skip list, and move the craftsman's speaker anchor to his new position. No dialogue, validator, or state changes.

**Tech Stack:** Vanilla JS canvas. Verification via the Playwright driver in `C:\Users\Ryan\AppData\Local\Temp\sts-drive` (playwright-core, `{ channel: 'chrome', headless: true }`, server at http://localhost:8931 — if down: `python -m http.server 8931 --directory C:\Users\Ryan\critter-forge` in background).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-04-makers-hall-workshop-design.md`. Reference render: `workshop-styles.js` variant B (card `DESIGN B` on /workshop-styles.html).
- Visual-only: `playWorkshop`, `runDecipherRounds`, `probePair`, `workshopPairs`, `workshopLegend`, `workshopSpark` interfaces unchanged. The board must keep rendering `workshopPairs.slice(-9)` with the same colors (contains "HUNT" → `#ff6b6b`, contains "->" → `#9fd9ff`, else `#ffd43b`) and the legend `1 = WAIT   2 = MOVE   4 = HUNT` when `workshopLegend` is true. `workshopSpark` must still render as a spark traveling a wire to the implant (the switchboard cable replaces the old crank-rig wire as its path).
- Absolute scales: craftsman stays `sc = 5` (current value); posed hero `sc = 4.4` (the armory's posed-hero value). This matches the approved mockup's ratio without inflating the scene.
- No em dashes in player-facing strings (none change; the PROBE LOG strings come from existing state).
- Working branch: `master`. Line numbers are as of commit `cf63623`; locate edits by quoted anchor text.
- `node --check C:\Users\Ryan\critter-forge\lesson1.js` after every edit.

---

### Task 1: Port the Maker's Hall into `drawWorkshop`

**Files:**
- Modify: `C:\Users\Ryan\critter-forge\lesson1.js` — the whole `drawWorkshop` function (anchor `// ---- the craftsman's workshop (1.5): bench, vice, crank rig, probe board ----` through the function's closing `}`), the hero skip list in `draw()` (~line 1780), and `speakerAnchor`'s workshop case.

**Interfaces:**
- Consumes: `px`, `els`, `workshopPairs`, `workshopLegend`, `workshopSpark`, `char` (unused after this change except position), `rr` NOT used here.
- Produces: same function name/signature `drawWorkshop(c, W, gy, now)`; nothing else changes for callers.

- [ ] **Step 1: Replace `drawWorkshop` entirely**

Delete the current function (from the anchor comment `// ---- the craftsman's workshop (1.5): bench, vice, crank rig, probe board ----` through its closing `}`) and put this in its place:

```js
// ---- the craftsman's workshop (1.5): the Maker's Hall — thirty years of craft meets the new obsession ----
function drawWorkshop(c, W, gy, now) {
  const H = els.H, floorY = H * 0.8;
  // keep-interior gloom behind a pitched work tent
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#171a24"); g.addColorStop(1, "#1f2330"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 30) px(c, x, floorY, 30, H - floorY, (x / 30 | 0) % 2 ? "#2a2d36" : "#262931");
  c.fillStyle = "#33452e"; c.beginPath(); c.moveTo(0, H); c.lineTo(0, H * 0.34); c.lineTo(W * 0.16, H * 0.06); c.lineTo(W * 0.2, H); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(W, H); c.lineTo(W, H * 0.34); c.lineTo(W * 0.84, H * 0.06); c.lineTo(W * 0.8, H); c.closePath(); c.fill();
  c.fillStyle = "#3d5437"; c.beginPath(); c.moveTo(W * 0.16, H * 0.06); c.lineTo(W * 0.84, H * 0.06); c.lineTo(W * 0.8, H); c.lineTo(W * 0.2, H); c.closePath(); c.fill();
  c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 5; i++) { c.strokeStyle = "rgba(20,26,18,0.5)"; c.lineWidth = 2; c.beginPath(); c.moveTo(W * (0.24 + i * 0.13), H * 0.06); c.lineTo(W * (0.23 + i * 0.135), floorY); c.stroke(); }
  // helpers
  const wire2 = (x1, y1, x2, y2, sag, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + sag, x2, y2); c.stroke(); };
  const lampRow2 = (x, y, n, seed) => { for (let i = 0; i < n; i++) { const on = Math.sin(now * (1.3 + ((i * 7 + seed) % 5) * 0.5) + i * 1.7 + seed) > 0; const col = i % 3 === 0 ? "#ff6b6b" : i % 3 === 1 ? "#ffb14d" : "#62d27a"; if (on) { c.shadowColor = col; c.shadowBlur = 7; } px(c, x + i * 14, y, 7, 7, on ? col : "#2a2f38"); c.shadowBlur = 0; } };
  // ---- the old craft (left) ----
  { const pbx = W * 0.16, pby = H * 0.16, pbw = W * 0.17, pbh = H * 0.28; // woodworking pegboard
    px(c, pbx, pby, pbw, pbh, "#3a2c18"); px(c, pbx, pby, pbw, 6, "#5a4424");
    const sxx = pbx + 20, syy = pby + 26; // hand saw
    px(c, sxx, syy, 12, 34, "#7a5a30"); c.fillStyle = "#8a939e"; c.beginPath(); c.moveTo(sxx + 5, syy + 34); c.lineTo(sxx + 16, syy + 96); c.lineTo(sxx - 6, syy + 90); c.closePath(); c.fill();
    for (let k = 0; k < 6; k++) px(c, sxx - 5 + k * 1.6, syy + 90 - k * 9, 3, 3, "#6a727c");
    const hxx = pbx + 70, hyy = pby + 28; px(c, hxx, hyy, 6, 52, "#7a5a30"); px(c, hxx - 9, hyy - 3, 24, 12, "#6a727c"); // hammer
    for (let i = 0; i < 3; i++) { const cxx = pbx + 116 + i * 20; px(c, cxx, pby + 28, 6, 32, "#7a5a30"); px(c, cxx, pby + 60, 6, 12, "#9aa3ad"); } // chisels
    const pxx = pbx + 70, pyy = pby + 104; px(c, pxx, pyy, 52, 18, "#7a5a30"); px(c, pxx + 12, pyy - 9, 12, 9, "#3a2c18"); px(c, pxx + 6, pyy + 6, 40, 5, "#6a727c"); } // plane
  { const shx = W * 0.185, shy = floorY; // sawhorse, leaning plank, shavings
    px(c, shx - 40, shy - 40, 80, 9, "#7a5a30");
    c.strokeStyle = "#5a4424"; c.lineWidth = 7; c.beginPath(); c.moveTo(shx - 28, shy - 34); c.lineTo(shx - 40, shy); c.moveTo(shx + 28, shy - 34); c.lineTo(shx + 40, shy); c.stroke();
    c.save(); c.translate(shx + 46, shy); c.rotate(-0.5); px(c, 0, -9, 130, 10, "#7a5a30"); px(c, 0, -9, 130, 3, "#8a6a3c"); c.restore();
    for (let i = 0; i < 6; i++) px(c, shx - 30 + i * 12, shy - 4 + (i % 2) * 3, 8, 4, "#c9b89a"); }
  { const wx2 = W * 0.46, wy2 = floorY - 3; // finished wagon wheel by the bench
    c.strokeStyle = "#7a5a30"; c.lineWidth = 8; c.beginPath(); c.arc(wx2, wy2 - 40, 37, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 4; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(wx2 + Math.cos(k * Math.PI / 4) * 34, wy2 - 40 + Math.sin(k * Math.PI / 4) * 34); c.lineTo(wx2 - Math.cos(k * Math.PI / 4) * 34, wy2 - 40 - Math.sin(k * Math.PI / 4) * 34); c.stroke(); }
    c.fillStyle = "#6a727c"; c.beginPath(); c.arc(wx2, wy2 - 40, 6, 0, Math.PI * 2); c.fill(); }
  { const kx = W * 0.44, ky = H * 0.12; // the pendulum clock he built (bridge piece)
    px(c, kx - 18, ky, 36, 88, "#5a4424"); px(c, kx - 18, ky, 36, 4, "#7a5a30"); px(c, kx - 13, ky + 66, 26, 18, "#241c11");
    c.fillStyle = "#e8dcc0"; c.beginPath(); c.arc(kx, ky + 24, 13, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#3a2c18"; c.lineWidth = 2; c.stroke();
    const pang = Math.sin(now * 2.4) * 0.5;
    c.save(); c.translate(kx, ky + 44); c.rotate(pang); c.strokeStyle = "#c9a24a"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 32); c.stroke(); c.fillStyle = "#c9a24a"; c.beginPath(); c.arc(0, 35, 6, 0, Math.PI * 2); c.fill(); c.restore();
    c.strokeStyle = "#3a3f46"; c.lineWidth = 2; c.beginPath(); c.moveTo(kx, ky + 24); c.lineTo(kx + Math.cos(now * 0.5) * 9, ky + 24 + Math.sin(now * 0.5) * 9); c.stroke(); }
  // ---- the new obsession (right): the switchboard wall ----
  const sx = W * 0.5, sy = H * 0.12, sw = W * 0.33, sh = H * 0.46;
  px(c, sx - 10, sy - 10, sw + 20, sh + 20, "#3a2c18"); px(c, sx, sy, sw, sh, "#242830"); px(c, sx, sy, sw, 6, "#33383f");
  for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) px(c, sx + 18 + k * (sw - 36) / 6 - 3, sy + 22 + r * 30, 7, 7, "#0c0e12");
  { const plug = (k1, r1, k2, r2, col) => { const xA = sx + 18 + k1 * (sw - 36) / 6, yA = sy + 25 + r1 * 30, xB = sx + 18 + k2 * (sw - 36) / 6, yB = sy + 25 + r2 * 30; wire2(xA, yA, xB, yB, 30, col, 3); px(c, xA - 4, yA - 4, 8, 8, col); px(c, xB - 4, yB - 4, 8, 8, col); };
    plug(0, 0, 3, 2, "#c94f4f"); plug(1, 1, 5, 0, "#caa24a"); plug(3, 3, 6, 1, "#4f8fc9"); plug(0, 3, 5, 3, "#5aa06a"); }
  lampRow2(sx + 14, sy + sh - 46, 10, 0); lampRow2(sx + 14, sy + sh - 28, 10, 5);
  for (let i = 0; i < 2; i++) { const kx = sx + sw - 62 + i * 26; px(c, kx, sy + sh - 52, 5, 26, "#b87333"); c.save(); c.translate(kx + 2.5, sy + sh - 52); c.rotate(-0.6 + (Math.sin(now * 0.7 + i) > 0.6 ? 0.6 : 0)); px(c, -2.5, -18, 5, 18, "#9aa3ad"); c.restore(); }
  // ---- the probe board (same state hooks as before) ----
  { const bw2 = Math.min(330, W * 0.21), bx0 = W * 0.2, by0 = H * 0.5, bh2 = floorY - by0 - 52;
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
  // ---- the bench: vice + implant, fed by the switchboard ----
  const bY = floorY - 64, bX = W * 0.5, bW = W * 0.3;
  px(c, bX, bY, bW, 10, "#a9844a"); px(c, bX, bY + 10, bW, 28, "#6b4f2a");
  for (let i = 0; i < bW; i += 52) px(c, bX + i, bY + 10, 3, 28, "#4a3a22");
  for (let i = 0; i < 4; i++) px(c, bX + 30 + i * 16, bY - 3, 8, 4, "#c9b89a"); // shavings on the electric bench: both lives, one surface
  const vx = bX + bW * 0.55, vy = bY - 2;
  px(c, vx - 22, vy - 10, 44, 10, "#6a727c"); px(c, vx - 16, vy - 18, 32, 8, "#8a939e"); // brass vice
  px(c, vx - 9, vy - 28, 18, 11, "#9aa3ad"); px(c, vx - 9, vy - 28, 18, 4, "#c9d4e4"); // the implant
  { const pulse = 0.5 + 0.5 * Math.sin(now * 3);
    c.shadowColor = "#4dabf7"; c.shadowBlur = 12 * pulse; px(c, vx - 3, vy - 25, 6, 4, "#4dabf7"); c.shadowBlur = 0; }
  // main cable: switchboard -> implant; workshopSpark travels it (probePair's hook)
  const cx1 = sx + sw, cy1 = sy + sh * 0.55, cx2 = vx + 4, cy2 = vy - 22;
  wire2(cx1, cy1, cx2, cy2, 46, "#3a3f46", 4); wire2(cx1, cy1 + 8, cx2 - 8, cy2 + 6, 54, "#4a3a22", 3);
  if (workshopSpark > 0) {
    const p = 1 - workshopSpark, mx = (cx1 + cx2) / 2, my = Math.max(cy1, cy2) + 46;
    const q = (a, b, cc, tt) => (1 - tt) * (1 - tt) * a + 2 * (1 - tt) * tt * b + tt * tt * cc;
    c.shadowColor = "#ffd43b"; c.shadowBlur = 12; px(c, q(cx1, mx, cx2, p) - 3, q(cy1, my, cy2, p) - 3, 6, 6, "#ffe066"); c.shadowBlur = 0;
  }
  // floor cable runs
  for (let i = 0; i < 3; i++) wire2(W * 0.56 + i * 8, floorY + 6, W * 0.72 - i * 12, floorY + 6, 8 + i * 4, i % 2 ? "#3a3f46" : "#4a3a22", 3);
  // ---- the craftsman (sc 5, unchanged sprite) ----
  { const sc = 5, bob = Math.sin(now * 1.5) * 0.5; c.save(); c.translate(W * 0.88, floorY - bob); c.scale(sc, sc);
    px(c, -4, -8, 3, 8, "#2a2014"); px(c, 2, -8, 3, 8, "#241c10");
    px(c, -7, -26, 14, 18, "#2f5a35"); px(c, -7, -26, 3, 18, "rgba(255,255,255,.14)");
    px(c, -5, -21, 10, 13, "#5a4426"); px(c, -5, -21, 10, 2, "#6e5430");
    px(c, -10, -24, 3, 12, "#2f5a35"); px(c, 7, -24, 3, 14, "#2f5a35");
    px(c, -12, -13, 5, 4, "#d8a878"); px(c, 7, -11, 5, 4, "#d8a878");
    px(c, -14, -14, 6, 2, "#3a2c18"); c.shadowColor = "#ffb14d"; c.shadowBlur = 6 + Math.sin(now * 7) * 3; px(c, -16, -14, 3, 2, "#ffb14d"); c.shadowBlur = 0; // hot-tip probe in hand
    px(c, -5, -37, 11, 11, "#d8a878"); px(c, -6, -39, 13, 4, "#8a8f96");
    px(c, -4, -33, 4, 3, "#c9d4e4"); px(c, 1, -33, 4, 3, "#c9d4e4"); px(c, 0, -32, 1, 1, "#3a3f46");
    px(c, -3, -32, 1, 1, "#1c1208"); px(c, 2, -32, 1, 1, "#1c1208");
    px(c, -3, -28.5, 7, 1.5, "#8a6242");
    c.restore(); }
  // ---- the posed hero, booth scale (armory's 4.4), full 1.5 kit, facing the craftsman ----
  { const sc = 4.4, b = Math.sin(now * 1.8) * 0.6; c.save(); c.translate(W * 0.09, floorY); c.scale(sc, sc);
    px(c, -4, -12, 4, 12, "#9aa3ad"); px(c, 1, -12, 4, 12, "#7a828c");
    px(c, -4, -3, 4, 3, "#9aa3ad"); px(c, 1, -3, 4, 3, "#9aa3ad");
    px(c, -6, -30 - b, 12, 20, "#8a939e"); px(c, -6, -30 - b, 3, 20, "#a5aeb8");
    px(c, -1, -30 - b, 2, 14, "#6a727c"); px(c, -6, -30 - b, 12, 2, "#c9a24a");
    px(c, -6, -16 - b, 12, 3, "#3a2c18"); px(c, -1, -16 - b, 2, 3, "#c9a24a");
    px(c, -5, -41 - b, 11, 11, "#e0a070");
    px(c, -6, -44 - b, 12, 5, "#7a828c"); px(c, -6, -44 - b, 12, 2, "#9aa3ad"); px(c, -6, -35 - b, 12, 2, "#6a727c");
    px(c, 3, -37 - b, 2, 2, "#1c1208"); // eye toward the craftsman
    px(c, 5, -28 - b, 3, 12, "#8a939e"); px(c, 5, -17 - b, 4, 3, "#9aa3ad");
    c.restore(); }
}
```

- [ ] **Step 2: Skip the world-scale hero in the workshop**

The hero-draw guard in `draw()` (anchor `if (scene !== "raft" && scene !== "armory" && !(invinc > 0 && Math.floor(now * 12) % 2)) {`) becomes:

```js
  if (scene !== "raft" && scene !== "armory" && scene !== "workshop" && !(invinc > 0 && Math.floor(now * 12) % 2)) {
```

Also update the comment above it from `// (skip in raft/armory — those scenes draw their own posed hero)` to `// (skip in raft/armory/workshop — those scenes draw their own posed hero)`.

- [ ] **Step 3: Move the craftsman's speaker anchor**

In `speakerAnchor`, the workshop case (anchor `if (w === "craftsman" && scene === "workshop")`) becomes:

```js
  if (w === "craftsman" && scene === "workshop") return { x: W * 0.88, y: els.H * 0.8 - 5 * 39 - 14 }; // above his head at the bench
```

- [ ] **Step 4: Syntax check**

Run: `node --check C:\Users\Ryan\critter-forge\lesson1.js`
Expected: exit 0.

- [ ] **Step 5: Behavioral drive — shell view, mid-rounds view, full regression**

Write `C:\Users\Ryan\AppData\Local\Temp\sts-drive\q4-makers-hall.mjs`:

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
const promptTxt = () => page.evaluate(() => document.querySelector('#prompt')?.textContent || '');
const untilPrompt = async (s, n = 16) => { for (let i = 0; i < n; i++) { if ((await promptTxt()).includes(s)) return true; await page.keyboard.press('Tab'); await page.waitForTimeout(700); } return (await promptTxt()).includes(s); };
// knight hand-in, then the workshop
await page.keyboard.press('Tab'); await page.waitForTimeout(1400);
if (!(await untilPrompt('Explore the keep'))) throw new Error('hand-in never finished');
await setCode('you.walk("craftsman")'); await page.click('#run'); await page.waitForTimeout(3000);
await page.screenshot({ path: `${shots}/q4-1-hall.png` }); // the Maker's Hall, shell dialogue up
if (!(await untilPrompt('Decipher rule 1', 20))) throw new Error('never reached round 1');
await page.screenshot({ path: `${shots}/q4-2-round1.png` }); // board populated, IDE open
await setCode('out = signal * 2 + 1'); await page.click('#run'); await page.waitForTimeout(900);
if (!(await untilPrompt('Decipher rule 2', 20))) throw new Error('never reached round 2');
await page.waitForTimeout(400);
await page.screenshot({ path: `${shots}/q4-3-round2.png` }); // more pairs on the board
console.log('PAGEERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
```

Run it. Expected `PAGEERRORS: none`. READ all three screenshots and confirm: tent walls; pegboard with saw/hammer/chisels/plane; sawhorse + shavings; wagon wheel; ticking clock; switchboard with patch cables + blinking lamps; PROBE LOG board readable with pairs; vice + blue implant on the bench; craftsman at the bench right; ARMORED HERO at matching size on the left (roughly craftsman's shoulder height, NOT knee height); no "render error:" in the prompt bar.

Then re-run the full decipher regression: `node C:\Users\Ryan\AppData\Local\Temp\sts-drive\q3-decipher.mjs`
Expected: same outputs as before (both failure messages, EPILOGUE true, PAGEERRORS none) — proves the state hooks all still work through the new art.

- [ ] **Step 6: Commit**

```powershell
git -C C:\Users\Ryan\critter-forge add lesson1.js
git -C C:\Users\Ryan\critter-forge commit -m "feat(1.5): the Maker's Hall — workshop rebuilt (craft half + switchboard half, pendulum clock), hero drawn at booth scale beside the craftsman"
```

(Append trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.)

---

## Self-review notes

- Spec coverage: tent interior ✓, pegboard/sawhorse/wheel/clock ✓, switchboard + cables + lamps + knife switches ✓, PROBE LOG same hooks/colors/legend ✓, vice + pulsing implant ✓, workshopSpark now travels the switchboard cable ✓, shavings on the bench ✓, craftsman sc 5 at 0.88 ✓, posed hero 4.4 at 0.09 facing right ✓, world-hero skip ✓, speaker anchor moved ✓, visual-only ✓.
- Placeholder scan: none.
- Type consistency: single task; `drawWorkshop(c, W, gy, now)` signature preserved (gy unused, matching the dispatch convention).
