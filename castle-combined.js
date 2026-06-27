// castle-combined.js — the keep interior: Royal background (columns, gold trim,
// red carpet, braziers) + Bazaar awning stalls for the four vendors, with
// townsfolk wandering and pausing to talk.

const TAU = Math.PI * 2;
const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
const circle = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
const dpr = window.devicePixelRatio || 1;
let W, H;
function fit() { const b = cv.getBoundingClientRect(); cv.width = b.width * dpr; cv.height = b.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = b.width; H = b.height; }
fit(); window.addEventListener("resize", fit);

const CHAT = ["Stay sharp.", "Heard the east wall held.", "Trade's slow today.", "You new here?", "Mind the curfew.", "Any word from the south?", "Need armour mended.", "Gold's tight this week.", "...", "Keep your blade close."];
function makeWalker(x, cloth, talky) {
  return { x, y: 0, dir: Math.random() < 0.5 ? -1 : 1, speed: 26 + Math.random() * 16, cloth, skin: Math.random() < 0.5 ? "#d8a878" : "#c89060", hair: ["#3a2c18", "#1c1c1c", "#6e4a22"][Math.floor(Math.random() * 3)], wphase: Math.random() * 6, paused: 0, bubble: null, bubbleT: 0, nextPause: 2 + Math.random() * 4, talky };
}
const COLORS = ["#7048e8", "#1971c2", "#2f9e44", "#a04826", "#5b626b", "#9c36b5", "#c2410c"];
const walkers = [];
for (let i = 0; i < 7; i++) walkers.push(makeWalker(0.15 + Math.random() * 0.7, COLORS[i % COLORS.length], i % 2 === 0));

function walker(c, x, gy, w) {
  const sw = w.paused ? 0 : Math.sin(w.wphase) * 4, f = w.dir;
  px(c, x - 4, gy - 4 + sw, 4, 12, "#2a2018"); px(c, x + 1, gy - 4 - sw, 4, 12, "#2a2018");
  px(c, x - 6, gy - 24, 12, 20, w.cloth); px(c, x - 5, gy - 35, 11, 11, w.skin); px(c, x - 6, gy - 37, 12, 4, w.hair);
  px(c, x + f * 4, gy - 20, f * 6, 3, w.skin);
  if (w.bubble) bubble(c, x, gy - 44, w.bubble);
}
function bubble(c, x, y, text) {
  c.font = "12px 'IBM Plex Mono',monospace"; const wd = c.measureText(text).width + 14, h = 20, bx = x - wd / 2, by = y - h;
  c.fillStyle = "rgba(245,247,250,0.96)"; rr(c, bx, by, wd, h, 6); c.fill();
  c.beginPath(); c.moveTo(x - 4, by + h); c.lineTo(x + 4, by + h); c.lineTo(x, by + h + 6); c.closePath(); c.fill();
  c.fillStyle = "#0b0e14"; c.textAlign = "center"; c.fillText(text, x, by + 14);
}

// a vendor under a striped awning (Bazaar) — drawn at the back wall
const LABEL = { craft: "CRAFTSMAN", hire: "FOR HIRE", smith: "BLACKSMITH", armor: "ARMORSMITH" };
const AWN = { craft: "#2f9e44", hire: "#1971c2", smith: "#e03131", armor: "#9c36b5" };
function stall(c, x, fy, type, now) {
  const cloth = { craft: "#8a6d3b", hire: "#3d5a3d", smith: "#3a3a42", armor: "#5b626b" }[type];
  // awning
  for (let s = -32; s < 32; s += 10) px(c, x + s, fy - 60, 10, 13, ((s / 10) | 0) % 2 ? AWN[type] : "#f1f3f5");
  px(c, x - 34, fy - 47, 68, 4, "#5a4424");
  // vendor + counter
  px(c, x - 6, fy - 30, 12, 18, cloth); px(c, x - 5, fy - 40, 11, 11, "#d8a878"); px(c, x - 6, fy - 42, 12, 4, "#3a2c18");
  px(c, x - 28, fy - 12, 56, 14, "#6b4f2a"); px(c, x - 28, fy - 14, 56, 4, "#8a6d3b");
  if (type === "smith") { px(c, x - 4, fy - 6, 16, 7, "#2b2b30"); const fl = 0.6 + 0.4 * Math.sin(now * 12); c.shadowColor = "#ff6b3d"; c.shadowBlur = 13 * fl; circle(c, x - 22, fy - 4, 6 * fl, "#ff6b3d"); c.shadowBlur = 0; }
  else if (type === "armor") { px(c, x + 13, fy - 36, 4, 24, "#4a4a4a"); px(c, x + 8, fy - 34, 14, 12, "#9aa3ad"); px(c, x + 10, fy - 44, 10, 8, "#9aa3ad"); }
  else if (type === "hire") { px(c, x + 15, fy - 36, 3, 24, "#5a4424"); px(c, x + 9, fy - 40, 16, 11, "#caa24a"); c.fillStyle = "#3a2c10"; c.font = "7px 'IBM Plex Mono'"; c.textAlign = "center"; c.fillText("HIRE", x + 17, fy - 32); }
  else { px(c, x - 20, fy - 20, 6, 7, "#9c6b3f"); c.strokeStyle = "#adb5bd"; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 6, fy - 20); c.lineTo(x + 18, fy - 13); c.stroke(); }
  c.fillStyle = "#cdd8e6"; c.font = "10px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText(LABEL[type], x, fy + 16);
}

let last = performance.now();
function frame(ms) {
  const dt = Math.min(0.05, (ms - last) / 1000); last = ms; const now = ms / 1000;
  const backY = H * 0.52, frontY = H * 0.92;

  // ---- royal background ----
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#171a24"); g.addColorStop(1, "#1f2330"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  px(ctx, 0, H * 0.16, W, 5, "#a8832a"); px(ctx, 0, H * 0.16 + 5, W, 2, "#ffd43b"); // gold trim
  for (let i = 0; i < 6; i++) { const cx = W * (0.08 + i * 0.17); px(ctx, cx - 11, 0, 22, backY + 30, "#2c303b"); px(ctx, cx - 14, 0, 28, 9, "#3a3f4b"); px(ctx, cx - 14, backY + 22, 28, 10, "#3a3f4b"); px(ctx, cx - 7, 12, 6, backY, "#23262f"); }
  // floors
  for (let x = 0; x < W; x += 30) px(ctx, x, backY, 30, frontY - backY, (x / 30 | 0) % 2 ? "#2a2d36" : "#262931");
  for (let x = 0; x < W; x += 32) px(ctx, x, frontY, 32, H - frontY, (x / 32 | 0) % 2 ? "#2d3038" : "#272a31");
  // red carpet — a centred runner that doesn't cover the stalls
  px(ctx, W * 0.43, backY, W * 0.14, H - backY, "#6e1d1d"); px(ctx, W * 0.43, backY, W * 0.14, 3, "#a8832a"); px(ctx, W * 0.43, backY, 3, H - backY, "#5a1515"); px(ctx, W * 0.57 - 3, backY, 3, H - backY, "#5a1515");
  // stalls on top, so labels read
  ["craft", "hire", "smith", "armor"].forEach((t, i) => stall(ctx, W * (0.2 + 0.2 * i), backY, t, now));
  // braziers flanking
  for (const bx of [W * 0.1, W * 0.9]) { px(ctx, bx - 4, backY - 26, 8, 20, "#a8832a"); const fl = 0.6 + 0.4 * Math.sin(now * 12 + bx); ctx.shadowColor = "#ffb14d"; ctx.shadowBlur = 18 * fl; circle(ctx, bx, backY - 28, 7 * fl, "#ffb14d"); circle(ctx, bx, backY - 29, 4 * fl, "#ffe066"); ctx.shadowBlur = 0; }

  // ---- wandering, talking townsfolk (front) ----
  for (const w of walkers) {
    if (w.paused > 0) { w.paused -= dt; if (w.bubbleT > 0) { w.bubbleT -= dt; if (w.bubbleT <= 0) w.bubble = null; } if (w.paused <= 0) w.nextPause = 3 + Math.random() * 5; }
    else {
      w.x += w.dir * w.speed * dt / W; w.wphase += dt * 8;
      if (w.x < 0.08) { w.x = 0.08; w.dir = 1; } if (w.x > 0.92) { w.x = 0.92; w.dir = -1; }
      w.nextPause -= dt;
      if (w.nextPause <= 0) { w.paused = 2 + Math.random() * 3; if (w.talky || Math.random() < 0.6) { w.bubble = CHAT[Math.floor(Math.random() * CHAT.length)]; w.bubbleT = w.paused; } }
    }
    walker(ctx, w.x * W, frontY, w);
  }
  // the player, just entered (left)
  walker(ctx, W * 0.05, frontY, { x: 0.05, dir: 1, cloth: "#6b8e23", skin: "#e0a070", hair: "#3a2c18", paused: 1, bubble: null, wphase: 0 });

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
