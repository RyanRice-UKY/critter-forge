// enemy-art.js — the chosen render style (Pixel Marchers) as a shared module,
// used by the Tower Logic game and the boss preview. All sprites are procedural
// pixel grids so they recolor per type and scale crisply.

export const PIXEL_PALETTE = {
  walker: "#f08c00",
  brute: "#e8590c",
  sprinter: "#ffd43b",
  cyclops: "#c92a2a", // boss
};

// 8×8 walk frames for the rank-and-file (digit codes: 1=body, 2=eye, .=empty)
const PXA = ["..1111..", ".111111.", "11211211", "11111111", "11111111", ".111111.", "11.11.11", "1.1..1.1"];
const PXB = ["..1111..", ".111111.", "11211211", "11111111", "11111111", ".111111.", ".111111.", "1..11..1"];

const hx = (c) => { c = c.replace("#", ""); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; };
const lighten = (c, a) => { const [r, g, b] = hx(c); return `rgb(${Math.min(255, r + a)},${Math.min(255, g + a)},${Math.min(255, b + a)})`; };
const darken = (c, a) => { const [r, g, b] = hx(c); return `rgb(${Math.max(0, r - a)},${Math.max(0, g - a)},${Math.max(0, b - a)})`; };

// Draw a rank-and-file pixel enemy centred at (x,y); sprite spans 2*size.
export function drawPixelEnemy(ctx, x, y, size, type, now, hit = 0, phase = 0) {
  if (type === "cyclops") return drawCyclops(ctx, x, y, size, now, hit, phase);
  const color = PIXEL_PALETTE[type] || "#f08c00";
  const frame = (Math.floor(now * 6 + phase) % 2) ? PXB : PXA;
  const s = size * 2 / 8, ox = x - size, oy = y - size, flash = hit > 0.35;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const ch = frame[r][c]; if (ch === ".") continue;
    const col = ch === "2" ? "#fff" : flash ? "#fff" : r < 2 ? lighten(color, 22) : r > 5 ? darken(color, 30) : color;
    ctx.fillStyle = col; ctx.fillRect(ox + c * s, oy + r * s, s + 0.6, s + 0.6);
  }
  if (!flash) { ctx.fillStyle = "#0b0e14"; ctx.fillRect(ox + 2 * s + s * 0.25, oy + 2 * s + s * 0.2, s * 0.5, s * 0.55); ctx.fillRect(ox + 5 * s + s * 0.25, oy + 2 * s + s * 0.2, s * 0.5, s * 0.55); }
}

// 14×14 one-eyed armored ogre — the first "harder beast" boss.
const CYCLOPS = [
  "...H......H...",
  "..HA......AH..",
  "..AAAAAAAAAA..",
  ".AAAAAAAAAAAA.",
  ".ABBBBBBBBBBA.",
  ".ABBBEEEEBBBA.",
  ".ABBEEPPEEBBA.",
  ".ABBBEEEEBBBA.",
  ".ABBBBBBBBBBA.",
  ".AABMMMMMMBAA.",
  "..ABMTTTTMBA..",
  "..AAbbbbbbAA..",
  "...AA....AA...",
  "..AA......AA..",
];
const CPAL = { H: "#ced4da", A: "#495057", a: "#868e96", B: "#c92a2a", b: "#a51111", E: "#ffffff", P: "#0b0e14", M: "#3b0a0a", T: "#ffffff" };

function drawCyclops(ctx, x, y, size, now, hit, phase) {
  const n = CYCLOPS.length, cell = size * 2 / n;
  const sway = Math.sin(now * 2 + phase) * cell * 0.4; // heavy idle sway
  const ox = x - size + sway, oy = y - size;
  const flash = hit > 0.35;
  // single glowing eye behind the sprite
  ctx.save();
  for (let r = 0; r < n; r++) for (let c = 0; c < CYCLOPS[r].length; c++) {
    const ch = CYCLOPS[r][c]; if (ch === ".") continue;
    let col = flash ? "#fff" : CPAL[ch] || "#888";
    if (ch === "P" && !flash) { ctx.shadowColor = "#ff3b3b"; ctx.shadowBlur = 8; }
    ctx.fillStyle = col;
    ctx.fillRect(ox + c * cell, oy + r * cell, cell + 0.6, cell + 0.6);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}
