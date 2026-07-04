// workshop-styles.js — four craftsman-workshop treatments, all with matched
// hero/craftsman scale and heavy electronics clutter. Winner ports into lesson1.js.
const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

// palette (game)
const WOOD = "#5a4424", WOOD_HI = "#7a5a30", WOOD_DK = "#3a2c18", SHELF = "#6b4f2a";
const STEEL = "#9aa3ad", STEEL_MID = "#8a939e", STEEL_DK = "#6a727c", GILT = "#c9a24a";
const SKIN = "#d8a878", COPPER = "#b87333", BLUE = "#4dabf7", AMBER = "#ffb14d";

// ---- shared cast, drawn at matched scale ----
function craftsman(c, x, y, sc, t) { // feet at (x, y)
  const bob = Math.sin(t * 1.5) * 0.5;
  c.save(); c.translate(x, y - bob); c.scale(sc, sc);
  px(c, -4, -8, 3, 8, "#2a2014"); px(c, 2, -8, 3, 8, "#241c10"); // legs
  px(c, -7, -26, 14, 18, "#2f5a35"); px(c, -7, -26, 3, 18, "rgba(255,255,255,.14)");
  px(c, -5, -21, 10, 13, "#5a4426"); px(c, -5, -21, 10, 2, "#6e5430"); // apron
  px(c, -10, -24, 3, 12, "#2f5a35"); px(c, 7, -24, 3, 14, "#2f5a35");
  px(c, -12, -13, 5, 4, SKIN); px(c, 7, -11, 5, 4, SKIN);
  // soldering-iron hand: a thin probe with a hot tip
  px(c, -14, -14, 6, 2, WOOD_DK); c.shadowColor = AMBER; c.shadowBlur = 6 + Math.sin(t * 7) * 3; px(c, -16, -14, 3, 2, AMBER); c.shadowBlur = 0;
  px(c, -5, -37, 11, 11, SKIN); px(c, -6, -39, 13, 4, "#8a8f96"); // grey hair
  px(c, -4, -33, 4, 3, "#c9d4e4"); px(c, 1, -33, 4, 3, "#c9d4e4"); px(c, 0, -32, 1, 1, "#3a3f46"); // spectacles
  px(c, -3, -32, 1, 1, "#1c1208"); px(c, 2, -32, 1, 1, "#1c1208");
  px(c, -3, -28.5, 7, 1.5, "#8a6242");
  c.restore();
}
function heroArmored(c, x, y, sc, t) { // full 1.5 kit, facing left toward the craftsman
  const b = Math.sin(t * 1.8) * 0.6;
  c.save(); c.translate(x, y); c.scale(sc, sc);
  px(c, -4, -12, 4, 12, STEEL); px(c, 1, -12, 4, 12, "#7a828c"); // greaves
  px(c, -4, -3, 4, 3, STEEL); px(c, 1, -3, 4, 3, STEEL); // boots
  px(c, -6, -30 - b, 12, 20, STEEL_MID); px(c, -6, -30 - b, 3, 20, "#a5aeb8"); // plate
  px(c, -1, -30 - b, 2, 14, STEEL_DK); px(c, -6, -30 - b, 12, 2, GILT);
  px(c, -6, -16 - b, 12, 3, WOOD_DK); px(c, -1, -16 - b, 2, 3, GILT);
  px(c, -5, -41 - b, 11, 11, "#e0a070"); // head
  px(c, -6, -44 - b, 12, 5, "#7a828c"); px(c, -6, -44 - b, 12, 2, STEEL); px(c, -6, -35 - b, 12, 2, STEEL_DK); // helm
  px(c, 3, -37 - b, 2, 2, "#1c1208"); // eye toward the craftsman (he stands to the right)
  px(c, -9, -28 - b, 3, 12, STEEL_MID); px(c, -9, -17 - b, 4, 3, STEEL); // near arm gauntlet
  c.restore();
}
function bench(c, x, y, w, t) { // workbench top at y; vice + implant at center
  px(c, x, y, w, 8, WOOD_HI); px(c, x, y + 8, w, 22, SHELF);
  for (let i = 0; i < w; i += 42) px(c, x + i, y + 8, 3, 22, "#4a3a22");
  const vx = x + w / 2;
  px(c, vx - 16, y - 8, 32, 8, STEEL_DK); px(c, vx - 12, y - 14, 24, 6, STEEL_MID); // vice
  px(c, vx - 6, y - 21, 12, 8, STEEL); px(c, vx - 6, y - 21, 12, 3, "#c9d4e4"); // the implant
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  c.shadowColor = BLUE; c.shadowBlur = 10 * pulse; px(c, vx - 2, y - 19, 4, 3, BLUE); c.shadowBlur = 0;
  return vx;
}
function probeSlate(c, x, y, w, h) {
  px(c, x - 6, y - 6, w + 12, h + 12, "#54422a"); px(c, x - 6, y - 6, w + 12, 3, "#6b5636");
  px(c, x, y, w, h, "#10141c");
  c.font = "bold 10px 'IBM Plex Mono',monospace"; c.textAlign = "left"; c.fillStyle = "#8a97a8";
  c.fillText("PROBE LOG", x + 8, y + 15);
  c.font = "11px 'IBM Plex Mono',monospace"; c.fillStyle = "#9fd9ff";
  ["IN 2 -> OUT 5", "IN 4 -> OUT 9", "IN 7 -> OUT 15"].forEach((ln, i) => c.fillText(ln, x + 8, y + 32 + i * 15));
}
function wire(c, x1, y1, x2, y2, sag, col = "#caa24a", lw = 2) {
  c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x1, y1);
  c.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + sag, x2, y2); c.stroke();
}
function sparkOnWire(c, x1, y1, x2, y2, sag, t, period, phase = 0) {
  const u = ((t + phase) % period) / period;
  if (u > 0.35) return; const p = u / 0.35;
  const mx = (x1 + x2) / 2, my = Math.max(y1, y2) + sag;
  const q = (a, b, cc, tt) => (1 - tt) * (1 - tt) * a + 2 * (1 - tt) * tt * b + tt * tt * cc;
  const sx = q(x1, mx, x2, p), sy = q(y1, my, y2, p);
  c.shadowColor = "#ffe066"; c.shadowBlur = 10; px(c, sx - 2, sy - 2, 4, 4, "#ffe066"); c.shadowBlur = 0;
}
function hangBulb(c, x, yTop, len, t, phase = 0) {
  const sw = Math.sin(t * 1.1 + phase) * 4;
  wire(c, x, yTop, x + sw, yTop + len, 0, "#3a3f46", 1.5);
  const bx = x + sw, by = yTop + len;
  px(c, bx - 3, by, 6, 4, STEEL_DK);
  const gl = 0.75 + 0.25 * Math.sin(t * 2 + phase);
  c.shadowColor = AMBER; c.shadowBlur = 16 * gl;
  c.fillStyle = "rgba(255,209,110,0.95)"; c.beginPath(); c.arc(bx, by + 9, 6, 0, Math.PI * 2); c.fill();
  c.shadowBlur = 0; px(c, bx - 1, by + 6, 2, 5, "#ffefc4");
}
function lampRow(c, x, y, n, t, seed = 0) {
  for (let i = 0; i < n; i++) {
    const on = Math.sin(t * (1.3 + ((i * 7 + seed) % 5) * 0.5) + i * 1.7 + seed) > 0;
    const col = i % 3 === 0 ? "#ff6b6b" : i % 3 === 1 ? AMBER : "#62d27a";
    if (on) { c.shadowColor = col; c.shadowBlur = 6; } px(c, x + i * 10, y, 5, 5, on ? col : "#2a2f38"); c.shadowBlur = 0;
  }
}
function jarShelf(c, x, y, w) { // a shelf crowded with jars, coils, parts
  px(c, x, y, w, 5, SHELF); px(c, x, y, w, 2, WOOD_HI);
  let cx = x + 8;
  const items = ["jar", "coil", "gear", "jar", "tube", "coil", "gear", "jar", "tube"];
  for (const it of items) {
    if (cx > x + w - 20) break;
    if (it === "jar") { px(c, cx, y - 20, 12, 20, "rgba(160,220,255,0.22)"); px(c, cx, y - 20, 12, 3, STEEL_MID); px(c, cx + 3, y - 12, 6, 8, "#2f5a35"); cx += 20; }
    else if (it === "coil") { c.strokeStyle = COPPER; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(cx + 7, y - 8, 3 + k * 2.6, 0, Math.PI * 2); c.stroke(); } cx += 22; }
    else if (it === "gear") { c.fillStyle = STEEL_DK; c.beginPath(); c.arc(cx + 6, y - 7, 6, 0, Math.PI * 2); c.fill(); for (let k = 0; k < 6; k++) px(c, cx + 6 + Math.cos(k * 1.05) * 7 - 1, y - 7 + Math.sin(k * 1.05) * 7 - 1, 3, 3, STEEL_DK); px(c, cx + 4, y - 9, 4, 4, "#242830"); cx += 20; }
    else { px(c, cx, y - 16, 5, 16, "rgba(255,190,120,0.3)"); px(c, cx + 1, y - 13, 3, 3, AMBER); cx += 13; } // filament tube
  }
}
function greenBoard(c, x, y, w, h) { // salvaged circuit board
  px(c, x, y, w, h, "#1d4a2c"); px(c, x, y, w, 2, "#2f6e42");
  c.strokeStyle = GILT; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x + 3, y + h - 3); c.lineTo(x + w * 0.4, y + h - 3); c.lineTo(x + w * 0.4, y + 4); c.moveTo(x + w * 0.6, y + 3); c.lineTo(x + w * 0.6, y + h * 0.6); c.lineTo(x + w - 3, y + h * 0.6); c.stroke();
  px(c, x + w * 0.15, y + h * 0.3, 6, 4, "#111"); px(c, x + w * 0.7, y + h * 0.25, 5, 5, "#111");
}
function floorCables(c, x1, x2, y, t, n = 3) {
  for (let i = 0; i < n; i++) {
    wire(c, x1 + i * 6, y - 2, x2 - i * 9, y - 2, 6 + i * 3, i % 2 ? "#3a3f46" : "#4a3a22", 2.5);
  }
}

// ---- scene chrome shared: dim keep interior ----
function baseRoom(c, W, H, tent) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#171a24"); g.addColorStop(1, "#1f2330");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const floorY = H * 0.8;
  for (let x = 0; x < W; x += 30) px(c, x, floorY, 30, H - floorY, (x / 30 | 0) % 2 ? "#2a2d36" : "#262931");
  if (tent) { // canvas tent walls sloping in
    c.fillStyle = "#33452e"; c.beginPath(); c.moveTo(0, H); c.lineTo(0, H * 0.34); c.lineTo(W * 0.16, H * 0.06); c.lineTo(W * 0.2, H); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(W, H); c.lineTo(W, H * 0.34); c.lineTo(W * 0.84, H * 0.06); c.lineTo(W * 0.8, H); c.closePath(); c.fill();
    c.fillStyle = "#3d5437"; c.beginPath(); c.moveTo(W * 0.16, H * 0.06); c.lineTo(W * 0.84, H * 0.06); c.lineTo(W * 0.8, H); c.lineTo(W * 0.2, H); c.closePath(); c.fill();
    c.fillStyle = "rgba(0,0,0,0.35)"; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) { c.strokeStyle = "rgba(20,26,18,0.5)"; c.lineWidth = 2; c.beginPath(); c.moveTo(W * (0.24 + i * 0.13), H * 0.06); c.lineTo(W * (0.23 + i * 0.135), H * 0.8); c.stroke(); }
  } else {
    c.fillStyle = "rgba(4,6,10,.5)"; c.fillRect(0, 0, W, H);
  }
  return floorY;
}

const VARIANTS = [
  {
    id: "A", name: "TINKER'S NEST", ac: "#ffb14d", acglow: "rgba(255,177,77,.35)",
    desc: "His tent, strung ceiling to floor with live wire and hanging bulbs. Pegboard of tools, shelves of jars and coils, and everything he owns feeding the bench.",
    types: ["hanging filament bulbs", "pegboard + part shelves", "wires cross the ceiling"],
    draw(c, W, H, t) {
      const floorY = baseRoom(c, W, H, true);
      // ceiling wires with sparks
      wire(c, W * 0.2, H * 0.12, W * 0.8, H * 0.1, 26); wire(c, W * 0.22, H * 0.2, W * 0.78, H * 0.16, 34, "#3a3f46");
      sparkOnWire(c, W * 0.2, H * 0.12, W * 0.8, H * 0.1, 26, t, 5.5);
      sparkOnWire(c, W * 0.22, H * 0.2, W * 0.78, H * 0.16, 34, t, 7, 3);
      hangBulb(c, W * 0.32, H * 0.13, 42, t, 0); hangBulb(c, W * 0.62, H * 0.11, 60, t, 2.2); hangBulb(c, W * 0.48, H * 0.16, 30, t, 4.1);
      // pegboard of tools (left)
      px(c, W * 0.21, H * 0.3, W * 0.13, H * 0.26, WOOD_DK); px(c, W * 0.21, H * 0.3, W * 0.13, 4, WOOD);
      for (let i = 0; i < 8; i++) { const tx = W * 0.225 + (i % 4) * W * 0.03, ty = H * 0.34 + Math.floor(i / 4) * H * 0.11; px(c, tx, ty, 3, 16, i % 2 ? STEEL_DK : COPPER); px(c, tx - 2, ty, 7, 3, STEEL_MID); }
      // shelves (right)
      jarShelf(c, W * 0.62, H * 0.34, W * 0.16); jarShelf(c, W * 0.62, H * 0.47, W * 0.16);
      probeSlate(c, W * 0.4, H * 0.26, W * 0.17, H * 0.2);
      // bench + cast
      const by = floorY - 58;
      bench(c, W * 0.33, by, W * 0.34, t);
      floorCables(c, W * 0.24, W * 0.42, floorY + 8, t);
      craftsman(c, W * 0.74, floorY, 4.6, t);
      heroArmored(c, W * 0.16, floorY, 4.2, t);
      lampRow(c, W * 0.35, by + 14, 6, t, 1);
    },
  },
  {
    id: "B", name: "THE MAKER'S HALL", ac: "#4dabf7", acglow: "rgba(77,171,247,.35)",
    desc: "Thirty years of honest craft on the left: woodworking wall, sawhorse, a wagon wheel, a pendulum clock he built. And colliding with it on the right, the new obsession: a patch-cable switchboard blinking like a nervous system.",
    types: ["switchboard wall", "woodworking half", "pendulum clock bridges both"],
    draw(c, W, H, t) {
      const floorY = baseRoom(c, W, H, true);
      // ---- the old craft (left half) ----
      // woodworking pegboard: saw, hammer, chisels, plane
      const pbx = W * 0.17, pby = H * 0.14, pbw = W * 0.19, pbh = H * 0.3;
      px(c, pbx, pby, pbw, pbh, WOOD_DK); px(c, pbx, pby, pbw, 4, WOOD);
      { const sxx = pbx + 12, syy = pby + 16; // hand saw
        px(c, sxx, syy, 8, 22, WOOD_HI); c.fillStyle = STEEL_MID; c.beginPath(); c.moveTo(sxx + 3, syy + 22); c.lineTo(sxx + 10, syy + 62); c.lineTo(sxx - 4, syy + 58); c.closePath(); c.fill();
        for (let k = 0; k < 5; k++) px(c, sxx - 3 + k, syy + 58 - k * 7, 2, 2, STEEL_DK); }
      { const hxx = pbx + 44, hyy = pby + 18; px(c, hxx, hyy, 4, 34, WOOD_HI); px(c, hxx - 6, hyy - 2, 16, 8, STEEL_DK); } // hammer
      for (let i = 0; i < 3; i++) { const cxx = pbx + 74 + i * 13; px(c, cxx, pby + 18, 4, 20, WOOD_HI); px(c, cxx, pby + 38, 4, 8, STEEL); } // chisels
      { const pxx = pbx + 44, pyy = pby + 66; px(c, pxx, pyy, 34, 12, WOOD_HI); px(c, pxx + 8, pyy - 6, 8, 6, WOOD_DK); px(c, pxx + 4, pyy + 4, 26, 3, STEEL_DK); } // plane
      // sawhorse + planks + shavings
      { const shx = W * 0.18, shy = floorY; px(c, shx - 26, shy - 26, 52, 6, WOOD_HI);
        c.strokeStyle = WOOD; c.lineWidth = 5; c.beginPath(); c.moveTo(shx - 18, shy - 22); c.lineTo(shx - 26, shy); c.moveTo(shx + 18, shy - 22); c.lineTo(shx + 26, shy); c.stroke();
        c.save(); c.translate(shx + 30, shy); c.rotate(-0.5); px(c, 0, -6, 84, 7, WOOD_HI); px(c, 0, -6, 84, 2, "#8a6a3c"); c.restore();
        for (let i = 0; i < 6; i++) px(c, shx - 20 + i * 8, shy - 3 + (i % 2) * 2, 5, 3, "#c9b89a"); } // shavings
      // wagon wheel leaning on the bench end
      { const wx2 = W * 0.46, wy2 = floorY - 2;
        c.strokeStyle = WOOD_HI; c.lineWidth = 5; c.beginPath(); c.arc(wx2, wy2 - 26, 24, 0, Math.PI * 2); c.stroke();
        c.lineWidth = 3; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(wx2, wy2 - 26); c.lineTo(wx2 + Math.cos(k * Math.PI / 4) * 22, wy2 - 26 + Math.sin(k * Math.PI / 4) * 22); c.lineTo(wx2 - Math.cos(k * Math.PI / 4) * 22, wy2 - 26 - Math.sin(k * Math.PI / 4) * 22); c.stroke(); }
        c.fillStyle = STEEL_DK; c.beginPath(); c.arc(wx2, wy2 - 26, 4, 0, Math.PI * 2); c.fill(); }
      // the pendulum clock he built (bridges both halves)
      { const kx = W * 0.455, ky = H * 0.1;
        px(c, kx - 12, ky, 24, 58, WOOD); px(c, kx - 12, ky, 24, 3, WOOD_HI); px(c, kx - 9, ky + 44, 18, 12, "#241c11");
        c.fillStyle = "#e8dcc0"; c.beginPath(); c.arc(kx, ky + 16, 9, 0, Math.PI * 2); c.fill();
        c.strokeStyle = WOOD_DK; c.lineWidth = 1.5; c.stroke();
        const pang = Math.sin(t * 2.4) * 0.5;
        c.save(); c.translate(kx, ky + 30); c.rotate(pang); c.strokeStyle = GILT; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 22); c.stroke(); c.fillStyle = GILT; c.beginPath(); c.arc(0, 24, 4, 0, Math.PI * 2); c.fill(); c.restore();
        c.strokeStyle = "#3a3f46"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(kx, ky + 16); c.lineTo(kx + Math.cos(t * 0.5) * 6, ky + 16 + Math.sin(t * 0.5) * 6); c.stroke(); }
      // ---- the new obsession (right half): switchboard wall ----
      const sx = W * 0.5, sy = H * 0.1, sw = W * 0.34, sh = H * 0.5;
      px(c, sx - 8, sy - 8, sw + 16, sh + 16, WOOD_DK); px(c, sx, sy, sw, sh, "#242830"); px(c, sx, sy, sw, 4, "#33383f");
      for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) px(c, sx + 12 + k * (sw - 24) / 6 - 2, sy + 14 + r * 20, 5, 5, "#0c0e12");
      const plug = (k1, r1, k2, r2, col) => {
        const xA = sx + 12 + k1 * (sw - 24) / 6, yA = sy + 16 + r1 * 20, xB = sx + 12 + k2 * (sw - 24) / 6, yB = sy + 16 + r2 * 20;
        wire(c, xA, yA, xB, yB, 20, col, 2.5); px(c, xA - 3, yA - 3, 6, 6, col); px(c, xB - 3, yB - 3, 6, 6, col);
      };
      plug(0, 0, 3, 2, "#c94f4f"); plug(1, 1, 5, 0, "#caa24a"); plug(3, 3, 6, 1, "#4f8fc9"); plug(0, 3, 5, 3, "#5aa06a");
      lampRow(c, sx + 10, sy + sh - 36, 9, t, 0); lampRow(c, sx + 10, sy + sh - 22, 9, t, 5);
      for (let i = 0; i < 2; i++) { const kx = sx + sw - 44 + i * 18; px(c, kx, sy + sh - 40, 4, 20, COPPER); c.save(); c.translate(kx + 2, sy + sh - 40); c.rotate(-0.6 + (Math.sin(t * 0.7 + i) > 0.6 ? 0.6 : 0)); px(c, -2, -14, 4, 14, STEEL); c.restore(); }
      // cables wall -> bench + spark
      wire(c, sx + sw, sy + sh * 0.5, W * 0.8, H * 0.55, 34, "#3a3f46", 3);
      sparkOnWire(c, sx + sw, sy + sh * 0.5, W * 0.8, H * 0.55, 34, t, 4.4);
      floorCables(c, sx + sw * 0.3, W * 0.6, floorY + 8, t, 3);
      probeSlate(c, W * 0.24, H * 0.52, W * 0.16, H * 0.19);
      const by = floorY - 58;
      bench(c, W * 0.5, by, W * 0.3, t);
      // wood shavings ON the electric bench: both lives, one surface
      for (let i = 0; i < 4; i++) px(c, W * 0.53 + i * 12, by - 2, 6, 3, "#c9b89a");
      craftsman(c, W * 0.88, floorY, 4.6, t);
      heroArmored(c, W * 0.07, floorY, 4.2, t);
    },
  },
  {
    id: "C", name: "SALVAGE HEAP", ac: "#62d27a", acglow: "rgba(98,210,122,.35)",
    desc: "A scavenger's den. Crates of pulled parts, green boards pinned like trophies, wire spools, a magnifier arm over the bench, and a specimen wall of implants he has already opened.",
    types: ["salvaged circuit boards", "specimen wall of implants", "crates + wire spools"],
    draw(c, W, H, t) {
      const floorY = baseRoom(c, W, H, true);
      // specimen board: opened implants pinned in rows
      px(c, W * 0.2, H * 0.14, W * 0.2, H * 0.3, "#54422a"); px(c, W * 0.21, H * 0.155, W * 0.18, H * 0.27, "#2b2317");
      for (let i = 0; i < 6; i++) {
        const ix = W * 0.235 + (i % 3) * W * 0.055, iy = H * 0.19 + Math.floor(i / 3) * H * 0.12;
        px(c, ix, iy, 16, 10, i % 2 ? STEEL_MID : STEEL_DK); px(c, ix, iy, 16, 3, "#c9d4e4");
        if (i === 4) { c.shadowColor = BLUE; c.shadowBlur = 8; px(c, ix + 6, iy + 4, 4, 3, BLUE); c.shadowBlur = 0; } // one still alive
        px(c, ix + 7, iy - 3, 2, 3, "#c94f4f"); // pin
      }
      c.fillStyle = "#8a97a8"; c.font = "9px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillText("OPENED", W * 0.3, H * 0.47);
      // salvage crates + boards + spools
      px(c, W * 0.62, floorY - 40, 70, 40, WOOD); px(c, W * 0.62, floorY - 40, 70, 4, WOOD_HI);
      greenBoard(c, W * 0.63, floorY - 62, 42, 20); greenBoard(c, W * 0.685, floorY - 56, 34, 14);
      px(c, W * 0.72, floorY - 78, 50, 38, WOOD); px(c, W * 0.72, floorY - 78, 50, 4, WOOD_HI);
      c.strokeStyle = COPPER; c.lineWidth = 3; c.beginPath(); c.arc(W * 0.68 + 90, floorY - 14, 13, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(W * 0.68 + 90, floorY - 14, 6, 0, Math.PI * 2); c.stroke(); // wire spool
      // magnifier arm over the bench
      const bY = floorY - 58;
      const vx = bench(c, W * 0.34, bY, W * 0.3, t);
      c.strokeStyle = STEEL_DK; c.lineWidth = 4; c.beginPath(); c.moveTo(vx + 70, bY); c.lineTo(vx + 46, bY - 44); c.lineTo(vx + 10, bY - 34); c.stroke();
      c.strokeStyle = "#c9d4e4"; c.lineWidth = 2.5; c.beginPath(); c.arc(vx + 2, bY - 27, 11, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "rgba(160,220,255,0.14)"; c.beginPath(); c.arc(vx + 2, bY - 27, 10, 0, Math.PI * 2); c.fill();
      probeSlate(c, W * 0.45, H * 0.12, W * 0.17, H * 0.2);
      floorCables(c, W * 0.28, W * 0.5, floorY + 8, t, 3);
      lampRow(c, W * 0.63, floorY - 48, 7, t, 2);
      craftsman(c, W * 0.76, floorY, 4.6, t);
      heroArmored(c, W * 0.14, floorY, 4.2, t);
    },
  },
  {
    id: "D", name: "THE DYNAMO", ac: "#ff6b6b", acglow: "rgba(255,107,107,.35)",
    desc: "One machine rules the tent: a hand-cranked dynamo with a spinning flywheel and belt drive, gauges twitching, feeding fat cables to the bench. When it spins, the whole room hums.",
    types: ["spinning flywheel + belt", "twitching gauges", "arc gap sparks"],
    draw(c, W, H, t) {
      const floorY = baseRoom(c, W, H, true);
      // the dynamo (left): housing, flywheel, belt to a small pulley at the bench
      const dx = W * 0.28, dy = floorY - 30;
      px(c, dx - 55, dy - 60, 110, 60, "#3a2c18"); px(c, dx - 55, dy - 60, 110, 5, "#54422a");
      const ang = t * 3.2;
      c.save(); c.translate(dx, dy - 78);
      c.strokeStyle = STEEL; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 26, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = STEEL_DK; c.lineWidth = 3;
      for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ang + k * Math.PI / 2) * 24, Math.sin(ang + k * Math.PI / 2) * 24); c.stroke(); }
      c.restore();
      // crank handle
      c.save(); c.translate(dx, dy - 78); c.rotate(ang); px(c, 24, -3, 16, 6, COPPER); c.restore();
      // belt to bench pulley
      const bY = floorY - 58, pX = W * 0.52;
      c.strokeStyle = "#241c10"; c.lineWidth = 4;
      c.beginPath(); c.moveTo(dx + Math.cos(ang) * 0 + 26, dy - 78 - 8); c.lineTo(pX, bY - 26); c.moveTo(dx + 26, dy - 78 + 8); c.lineTo(pX, bY - 14); c.stroke();
      c.save(); c.translate(pX, bY - 20); c.strokeStyle = STEEL_DK; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(ang * 3) * 7, Math.sin(ang * 3) * 7); c.stroke(); c.restore();
      // arc gap on the dynamo: two prongs, crackle
      px(c, dx - 14, dy - 118, 4, 14, COPPER); px(c, dx + 10, dy - 118, 4, 14, COPPER);
      if (Math.sin(t * 9) > 0.55) { c.shadowColor = "#9fd9ff"; c.shadowBlur = 14; c.strokeStyle = "#dff1ff"; c.lineWidth = 2; c.beginPath(); c.moveTo(dx - 10, dy - 112); c.lineTo(dx - 2, dy - 108); c.lineTo(dx + 4, dy - 114); c.lineTo(dx + 10, dy - 110); c.stroke(); c.shadowBlur = 0; }
      // gauges
      for (let i = 0; i < 3; i++) {
        const gx = dx - 34 + i * 34, gy2 = dy - 40;
        c.fillStyle = "#e8dcc0"; c.beginPath(); c.arc(gx, gy2, 11, 0, Math.PI * 2); c.fill();
        c.strokeStyle = WOOD_DK; c.lineWidth = 2; c.stroke();
        const nd = -2.2 + Math.abs(Math.sin(t * (1.4 + i * 0.5))) * 1.9;
        c.strokeStyle = "#c94f4f"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(gx, gy2); c.lineTo(gx + Math.cos(nd) * 8, gy2 + Math.sin(nd) * 8); c.stroke();
      }
      // fat cables dynamo -> bench, spark
      wire(c, dx + 50, dy - 20, W * 0.56, bY + 4, 30, "#3a3f46", 4);
      wire(c, dx + 50, dy - 12, W * 0.58, bY + 8, 36, "#4a3a22", 3);
      sparkOnWire(c, dx + 50, dy - 20, W * 0.56, bY + 4, 30, t, 3.6);
      bench(c, W * 0.46, bY, W * 0.32, t);
      probeSlate(c, W * 0.66, H * 0.05, W * 0.17, H * 0.2);
      jarShelf(c, W * 0.62, H * 0.5, W * 0.13);
      lampRow(c, W * 0.48, bY + 14, 8, t, 3);
      craftsman(c, W * 0.88, floorY, 4.6, t);
      heroArmored(c, W * 0.11, floorY, 4.2, t);
    },
  },
];

// ---- build cards + run ----
const grid = document.getElementById("grid");
const cards = VARIANTS.map((v, i) => {
  const el = document.createElement("div");
  el.className = "card"; el.style.setProperty("--ac", v.ac); el.style.setProperty("--acglow", v.acglow);
  el.innerHTML = `<span class="id">DESIGN ${v.id}</span><canvas></canvas>
    <div class="meta"><h2><b>${v.id}</b> · ${v.name}</h2><p>${v.desc}</p>
    <div class="types">${v.types.map((s) => `<span>${s}</span>`).join("")}</div></div>`;
  grid.appendChild(el);
  return { v, canvas: el.querySelector("canvas"), off: i * 1.4 };
});
function size() {
  for (const card of cards) {
    const dpr = window.devicePixelRatio || 1, w = card.canvas.clientWidth, h = card.canvas.clientHeight;
    card.canvas.width = w * dpr; card.canvas.height = h * dpr;
    card.ctx = card.canvas.getContext("2d");
    card.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    card.cw = w; card.ch = h;
  }
}
size(); addEventListener("resize", size);
(function loop(now) {
  for (const card of cards) { card.ctx.clearRect(0, 0, card.cw, card.ch); card.v.draw(card.ctx, card.cw, card.ch, now / 1000 + card.off); }
  requestAnimationFrame(loop);
})(0);
