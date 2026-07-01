// survive.js — Survive the Stack: title screen + world map (chapter select).
// Canvas scene + HTML button overlay. Save/XP from core/save.js.
"use strict";
const cv = document.getElementById("stage"), c = cv.getContext("2d");
let W = 0, H = 0, view = (location.hash || "").slice(1) === "map" ? "map" : "title";
const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };

function fit() { const dpr = window.devicePixelRatio || 1; W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); }
fit(); addEventListener("resize", fit);

// ---------- pixel title font (5x7) ----------
const GLYPHS = {
  S: ["#####", "#....", "#....", "#####", "....#", "....#", "#####"],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", "#####"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  V: ["#...#", "#...#", "#...#", "#...#", ".#.#.", ".#.#.", "..#.."],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};
function pixelText(text, cx, y, s, col, shadow) {
  const wch = 6 * s, total = text.length * wch - s;
  let x = cx - total / 2;
  for (const ch of text) {
    const g = GLYPHS[ch] || GLYPHS[" "];
    for (let r = 0; r < 7; r++) for (let i = 0; i < 5; i++) if (g[r][i] === "#") {
      if (shadow) px(x + i * s + s * 0.55, y + r * s + s * 0.55, s, s, shadow);
      px(x + i * s, y + r * s, s, s, col);
    }
    x += wch;
  }
}

// ---------- shared scenery ----------
function sky(now) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0d1626"); g.addColorStop(0.55, "#16243c"); g.addColorStop(0.78, "#21303c"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const sx = (i * 89) % W, sy = (i * 53) % (H * 0.6); c.globalAlpha = 0.2 + 0.45 * Math.abs(Math.sin(now * 0.5 + i)); px(sx, sy, 2, 2, "#cfe0f5"); } c.globalAlpha = 1;
}
function ground(gy) { for (let i = 0; i * 26 < W; i++) px(i * 26, gy, 26, H - gy, i % 2 ? "#22512c" : "#275c32"); }
function treeline(gy) { c.fillStyle = "#0e1a14"; for (let i = 0; i < Math.ceil(W / 60) + 1; i++) { const x = i * 60 + ((i * 37) % 22), h = 60 + ((i * 53) % 46); c.beginPath(); c.moveTo(x - 34, gy); c.lineTo(x, gy - h); c.lineTo(x + 34, gy); c.closePath(); c.fill(); } }

// ---------- title view ----------
function campfire(x, gy, now) {
  px(x - 20, gy - 4, 40, 6, "#3a2c18"); px(x - 14, gy - 8, 28, 5, "#4a3a22"); // logs
  const fl = 0.75 + 0.25 * Math.sin(now * 11) + 0.1 * Math.sin(now * 23);
  c.shadowColor = "#ff9f43"; c.shadowBlur = 42 * fl;
  c.fillStyle = "#ff6b3d"; c.beginPath(); c.moveTo(x - 11, gy - 8); c.quadraticCurveTo(x - 13, gy - 26 * fl, x, gy - 40 * fl); c.quadraticCurveTo(x + 13, gy - 26 * fl, x + 11, gy - 8); c.closePath(); c.fill();
  c.fillStyle = "#ffd43b"; c.beginPath(); c.moveTo(x - 6, gy - 8); c.quadraticCurveTo(x - 7, gy - 18 * fl, x, gy - 26 * fl); c.quadraticCurveTo(x + 7, gy - 18 * fl, x + 6, gy - 8); c.closePath(); c.fill();
  c.shadowBlur = 0;
  for (let i = 0; i < 5; i++) { const t = (now * 0.7 + i * 0.37) % 1; c.globalAlpha = 1 - t; px(x + Math.sin(now * 2 + i * 9) * 10, gy - 24 - t * 60, 2, 2, "#ffb056"); } c.globalAlpha = 1;
  const glow = c.createRadialGradient(x, gy - 12, 8, x, gy - 12, 150); glow.addColorStop(0, `rgba(255,159,67,${0.16 * fl})`); glow.addColorStop(1, "rgba(255,159,67,0)"); c.fillStyle = glow; c.fillRect(x - 150, gy - 162, 300, 300);
}
function sitter(x, gy, flip, cloth) {
  c.save(); c.translate(x, gy); c.scale(flip, 1);
  px(-6, -18, 12, 12, cloth); px(-5, -27, 10, 10, "#c89060"); px(-6, -29, 12, 4, "#241018");
  px(-6, -7, 14, 4, cloth); px(6, -7, 4, 7, "#241018"); c.restore();
}
function drawTitle(now) {
  const gy = H * 0.8;
  sky(now); treeline(gy); ground(gy);
  const fx = W * 0.22; // campfire scene sits left of the centered menu buttons
  campfire(fx, gy, now);
  sitter(fx - 52, gy, 1, "#3f6b2a"); sitter(fx + 52, gy, -1, "#6741a8");
  const ts = Math.max(4, Math.min(9, W / 110));
  pixelText("SURVIVE", W / 2, H * 0.16, ts, "#ffd43b", "#4a3a18");
  pixelText("THE STACK", W / 2, H * 0.16 + ts * 9, ts * 0.72, "#dbe6f2", "#1b2533");
  c.font = "15px 'IBM Plex Mono',monospace"; c.textAlign = "center"; c.fillStyle = "#8a94a3";
  c.fillText("write the code. hold the line.", W / 2, H * 0.16 + ts * 9 + ts * 0.72 * 7 + 34);
  if (Save.hasSave()) {
    const s = Save.load();
    c.fillStyle = "#62d27a"; c.font = "13px 'IBM Plex Mono',monospace";
    c.fillText(`Survivor Lv ${Save.level(s.xp)} · ${s.xp} XP`, W / 2, H - 26);
  }
}

// ---------- map view ----------
const CHAPTERS = [
  { n: 1, name: "The Wildwood", icon: "tree", href: "lesson1.html" },
  { n: 2, name: "The Keep", icon: "castle", href: "lesson1.html#keep" },
  { n: 3, name: "The Ruined City", icon: "ruin", href: null },
  { n: 4, name: "The Survivors' Camp", icon: "tent", href: null },
  { n: 5, name: "The Stronghold", icon: "fort", href: null },
  { n: 6, name: "The Lab", icon: "lab", href: null },
];
function nodePos(i) { const x = W * (0.12 + (i / 5) * 0.76), y = H * (0.56 + (i % 2 ? -0.1 : 0.08)); return { x, y }; }
function icon(kind, x, y, dim) {
  const k = dim ? "#39424f" : null;
  if (kind === "tree") { px(x - 3, y - 4, 6, 12, k || "#5a3f22"); c.fillStyle = k || "#256a33"; for (let r = 0; r < 3; r++) { c.beginPath(); c.arc(x, y - 10 - r * 8, 12 - r * 3, 0, Math.PI * 2); c.fill(); } }
  else if (kind === "castle") { px(x - 14, y - 16, 28, 24, k || "#565d66"); for (let i = -14; i < 14; i += 8) px(x + i, y - 22, 5, 6, k || "#565d66"); px(x - 4, y - 6, 8, 14, k || "#2a2017"); }
  else if (kind === "ruin") { px(x - 14, y - 8, 10, 16, k || "#4e555e"); px(x - 2, y - 18, 9, 26, k || "#565d66"); px(x + 8, y - 4, 7, 12, k || "#454c55"); px(x - 2, y - 18, 9, 3, k || "#6e757e"); }
  else if (kind === "tent") { c.fillStyle = k || "#8a6d3b"; c.beginPath(); c.moveTo(x - 16, y + 8); c.lineTo(x, y - 14); c.lineTo(x + 16, y + 8); c.closePath(); c.fill(); c.fillStyle = k || "#3a2c18"; c.beginPath(); c.moveTo(x - 5, y + 8); c.lineTo(x, y - 2); c.lineTo(x + 5, y + 8); c.closePath(); c.fill(); }
  else if (kind === "fort") { px(x - 16, y - 10, 32, 18, k || "#6e757e"); for (let i = -16; i < 16; i += 8) px(x + i, y - 15, 5, 5, k || "#6e757e"); px(x - 3, y - 2, 6, 10, k || "#2a2017"); }
  else if (kind === "lab") { px(x - 3, y - 18, 6, 10, k || "#9aa3ad"); c.fillStyle = k || "#62d27a"; c.beginPath(); c.moveTo(x - 3, y - 8); c.lineTo(x - 10, y + 8); c.lineTo(x + 10, y + 8); c.lineTo(x + 3, y - 8); c.closePath(); c.fill(); }
}
function padlock(x, y) { px(x - 6, y - 4, 12, 10, "#8a94a3"); c.strokeStyle = "#8a94a3"; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y - 5, 4.5, Math.PI, 0); c.stroke(); px(x - 1, y - 1, 3, 4, "#232c3a"); }
function drawMap(now) {
  const s = Save.load();
  sky(now); treeline(H * 0.94); ground(H * 0.94);
  c.font = "700 26px 'Chakra Petch',sans-serif"; c.textAlign = "center"; c.fillStyle = "#ffd43b"; c.fillText("THE ROAD TO THE LAB", W / 2, 52);
  // XP bar
  const bw = Math.min(360, W * 0.5), bx = W / 2 - bw / 2, by = 74;
  c.fillStyle = "#111825"; c.fillRect(bx, by, bw, 12); c.strokeStyle = "#232c3a"; c.strokeRect(bx, by, bw, 12);
  px(bx + 1, by + 1, (bw - 2) * Save.levelProgress(s.xp), 10, "#62d27a");
  c.font = "13px 'IBM Plex Mono',monospace"; c.fillStyle = "#8a94a3"; c.fillText(`Survivor Lv ${Save.level(s.xp)} · ${s.xp} XP`, W / 2, by + 32);
  // winding path
  c.strokeStyle = "#4a3a22"; c.lineWidth = 6; c.setLineDash([2, 9]); c.beginPath();
  for (let i = 0; i < 6; i++) { const p = nodePos(i); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); } c.stroke(); c.setLineDash([]);
  // nodes
  for (let i = 0; i < 6; i++) {
    const ch = CHAPTERS[i], st = s.chapters[ch.n] || {}, p = nodePos(i);
    const locked = !st.unlocked, current = st.unlocked && !st.done;
    c.fillStyle = locked ? "#131a26" : "#182338"; c.strokeStyle = locked ? "#232c3a" : st.done ? "#b08d2a" : "#62d27a"; c.lineWidth = 2.5;
    c.beginPath(); c.arc(p.x, p.y, 34, 0, Math.PI * 2); c.fill(); c.stroke();
    if (current) { c.globalAlpha = 0.45 + 0.35 * Math.sin(now * 3); c.beginPath(); c.arc(p.x, p.y, 42, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
    icon(ch.icon, p.x, p.y + 4, locked);
    if (locked) padlock(p.x + 22, p.y - 22);
    if (st.done) { c.fillStyle = "#ffd43b"; c.font = "700 17px 'Chakra Petch',sans-serif"; c.fillText("✓", p.x + 24, p.y - 18); }
    c.font = "700 14px 'Chakra Petch',sans-serif"; c.fillStyle = locked ? "#576170" : "#dbe6f2"; c.fillText(ch.name, p.x, p.y + 58);
    c.font = "11px 'IBM Plex Mono',monospace"; c.fillStyle = locked ? "#39424f" : "#8a94a3"; c.fillText(`Chapter ${ch.n}`, p.x, p.y + 74);
  }
  c.textAlign = "left";
}

// ---------- toast + interaction ----------
const toastEl = document.getElementById("toast");
let toastT = null;
function toast(msg) { toastEl.textContent = msg; toastEl.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.style.opacity = 0), 1700); }

const titleMenu = document.getElementById("titleMenu"), backBtn = document.getElementById("backBtn");
function setView(v) { view = v; location.hash = v === "map" ? "map" : ""; titleMenu.classList.toggle("hidden", v !== "title"); backBtn.classList.toggle("hidden", v !== "map"); document.getElementById("btnContinue").classList.toggle("hidden", !Save.hasSave()); }
document.getElementById("btnContinue").onclick = () => setView("map");
document.getElementById("btnChapters").onclick = () => setView("map");
document.getElementById("btnNew").onclick = () => { if (!Save.hasSave() || confirm("Start over? Your survivor, XP and progress will be erased.")) { Save.reset(); location.href = "lesson1.html"; } };
backBtn.onclick = () => setView("title");
cv.addEventListener("click", (e) => {
  if (view !== "map") return;
  const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  for (let i = 0; i < 6; i++) {
    const p = nodePos(i);
    if ((mx - p.x) ** 2 + (my - p.y) ** 2 > 40 ** 2) continue;
    const ch = CHAPTERS[i], st = Save.load().chapters[ch.n] || {};
    if (!st.unlocked) toast("Locked. Finish the previous chapter first.");
    else if (!ch.href) toast(`${ch.name} is still being built. Soon.`);
    else location.href = ch.href;
    return;
  }
});
addEventListener("hashchange", () => setView((location.hash || "").slice(1) === "map" ? "map" : "title"));
setView(view);

(function loop() { requestAnimationFrame(function f(ms) { const now = ms / 1000; view === "map" ? drawMap(now) : drawTitle(now); requestAnimationFrame(f); }); })();
