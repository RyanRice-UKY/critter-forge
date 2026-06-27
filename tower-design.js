// tower-design.js — design board: 6 turret designs (animated firing) + 6 map
// themes, all in the pixel style. Pick one of each to wire into the game.
import { drawPixelEnemy } from "./enemy-art.js";

const TAU = Math.PI * 2;
const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
const circle = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
const hx = (s) => { s = s.replace("#", ""); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; };
const dk = (c, a) => { const [r, g, b] = hx(c); return `rgb(${Math.max(0, r - a)},${Math.max(0, g - a)},${Math.max(0, b - a)})`; };
const lt = (c, a) => { const [r, g, b] = hx(c); return `rgb(${Math.min(255, r + a)},${Math.min(255, g + a)},${Math.min(255, b + a)})`; };
function flash(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rad = i % 2 ? r * 0.45 : r; const px2 = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; i ? c.lineTo(px2, py) : c.moveTo(px2, py); } c.closePath(); c.fill(); }

// ---------------- TURRETS ----------------
function base(c, x, y, s) { px(c, x - s * 0.8, y + s * 0.3, s * 1.6, s * 0.55, "#3a2c18"); px(c, x - s * 0.8, y + s * 0.3, s * 1.6, s * 0.16, "#5a4424"); }
function cannon(c, x, y, s, now, fire) {
  const rec = fire * s * 0.22; base(c, x, y, s);
  px(c, x - s * 0.45, y - s * 0.1, s * 0.9, s * 0.5, "#495057");
  px(c, x - s * 0.2 - rec, y - s * 0.26, s * 1.0, s * 0.34, "#868e96");
  px(c, x - s * 0.2 - rec, y - s * 0.26, s * 1.0, s * 0.1, "# adb5bd".replace(" ", ""));
  px(c, x + s * 0.78 - rec, y - s * 0.3, s * 0.12, s * 0.42, "#343a40");
  if (fire > 0.45) flash(c, x + s * 0.9 - rec, y - s * 0.09, s * 0.34 * fire, "#ffd43b");
}
function ballista(c, x, y, s, now, fire) {
  base(c, x, y, s);
  c.strokeStyle = "#9c6b3f"; c.lineWidth = s * 0.16; c.lineCap = "round";
  c.beginPath(); c.moveTo(x - s * 0.5, y - s * 0.45); c.lineTo(x + s * 0.5, y + s * 0.35); c.moveTo(x + s * 0.5, y - s * 0.45); c.lineTo(x - s * 0.5, y + s * 0.35); c.stroke();
  c.strokeStyle = "#d9c7a3"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - s * 0.5, y - s * 0.45); c.lineTo(x + s * (fire > 0.5 ? 0.2 : -0.1), y - s * 0.05); c.lineTo(x - s * 0.5, y + s * 0.35); c.stroke();
  px(c, x - s * 0.1, y - s * 0.12, s * (fire > 0.5 ? 1.1 : 0.7), s * 0.14, "#b08968"); // bolt
  circle(c, x, y - s * 0.05, s * 0.18, "#5a4424");
}
function tesla(c, x, y, s, now, fire) {
  base(c, x, y, s);
  px(c, x - s * 0.18, y - s * 0.3, s * 0.36, s * 0.7, "#495057");
  for (let i = 0; i < 3; i++) circle(c, x, y - s * 0.3 - i * s * 0.18, s * (0.28 - i * 0.06), "#adb5bd");
  const orbY = y - s * 0.85; circle(c, x, orbY, s * 0.26, "#1c4f63"); circle(c, x, orbY, s * 0.16, "#4dd2ff");
  c.strokeStyle = "#9be7ff"; c.lineWidth = 2; c.shadowColor = "#4dd2ff"; c.shadowBlur = 10;
  for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x, orbY); let lx = x, ly = orbY; for (let j = 0; j < 4; j++) { lx += (Math.sin(now * 30 + k * 9 + j) * s * 0.3); ly -= s * 0.18; c.lineTo(lx, ly); } c.stroke(); }
  c.shadowBlur = 0;
}
function arcane(c, x, y, s, now, fire) {
  base(c, x, y, s);
  px(c, x - s * 0.4, y, s * 0.8, s * 0.34, "#3a2c4a"); px(c, x - s * 0.28, y - s * 0.1, s * 0.56, s * 0.14, "#6741a8");
  const gy = y - s * 0.45 + Math.sin(now * 3) * s * 0.08;
  c.save(); c.translate(x, gy); c.rotate(now * 1.2); c.shadowColor = "#b197fc"; c.shadowBlur = 16 + fire * 20;
  c.fillStyle = fire > 0.5 ? "#fff" : "#b197fc"; c.beginPath(); c.moveTo(0, -s * 0.4); c.lineTo(s * 0.28, 0); c.lineTo(0, s * 0.4); c.lineTo(-s * 0.28, 0); c.closePath(); c.fill();
  c.fillStyle = "#e9defc"; c.beginPath(); c.moveTo(0, -s * 0.2); c.lineTo(s * 0.14, 0); c.lineTo(0, s * 0.2); c.lineTo(-s * 0.14, 0); c.closePath(); c.fill();
  c.restore(); c.shadowBlur = 0;
}
function gatling(c, x, y, s, now, fire) {
  base(c, x, y, s);
  px(c, x - s * 0.5, y - s * 0.22, s * 0.7, s * 0.6, "#343a40"); px(c, x - s * 0.5, y - s * 0.22, s * 0.7, s * 0.14, "#495057");
  const spin = now * 18;
  for (let i = 0; i < 3; i++) { const a = spin + i / 3 * TAU; const oy = Math.sin(a) * s * 0.12; px(c, x + s * 0.1, y - s * 0.06 + oy, s * 0.8, s * 0.1, i === 0 ? "#adb5bd" : "#868e96"); }
  if (fire > 0.3) flash(c, x + s * 0.95, y - s * 0.02, s * 0.22, "#ff922b");
}
function mortar(c, x, y, s, now, fire) {
  base(c, x, y, s);
  px(c, x - s * 0.4, y - s * 0.05, s * 0.8, s * 0.45, "#2f3b2a");
  c.save(); c.translate(x - s * 0.1, y); c.rotate(-0.7);
  px(c, 0, -s * 0.22 - fire * s * 0.1, s * 0.9, s * 0.44, "#51cf66"); px(c, 0, -s * 0.22, s * 0.9, s * 0.12, "#94d82d");
  px(c, s * 0.8, -s * 0.28, s * 0.14, s * 0.56, "#2b3a24");
  if (fire > 0.5) flash(c, s * 0.95, -s * 0.0, s * 0.3, "#d8f5a2");
  c.restore();
}

const TURRETS = [
  { id: "cannon", name: "Cannon", arch: "BASIC", ac: "#adb5bd", draw: cannon, desc: "Stubby iron barrel on sandbags, satisfying recoil + muzzle flash. The starter — a one-line range check." },
  { id: "ballista", name: "Ballista", arch: "SNIPER", ac: "#d9a679", draw: ballista, desc: "Wooden crossbow frame that draws and looses a heavy bolt. Single-target punch — needs a targeting loop." },
  { id: "tesla", name: "Tesla Coil", arch: "CHAIN", ac: "#4dd2ff", draw: tesla, desc: "Crackling coil with an electric orb that forks lightning. Hits clustered foes — loops + counting." },
  { id: "arcane", name: "Arcane Prism", arch: "MAGIC", ac: "#b197fc", draw: arcane, desc: "Floating spinning gem on a rune pedestal, glowing bolts. Pierces armor — priority logic." },
  { id: "gatling", name: "Gatling", arch: "RAPID", ac: "#ff922b", draw: gatling, desc: "Spinning multi-barrel that shreds. High fire-rate but energy-hungry — economy discipline." },
  { id: "mortar", name: "Mortar", arch: "AOE", ac: "#69db7c", draw: mortar, desc: "Angled tube that lobs an arcing shell to blast a cluster. Trigger at ≥N enemies — accumulators." },
];

// ---------------- MAPS ----------------
function laneLines(c, w, h, col) { c.strokeStyle = col; c.lineWidth = 1; for (let r = 1; r < 3; r++) { c.beginPath(); c.moveTo(0, r * h / 3); c.lineTo(w, r * h / 3); c.stroke(); } }
function house(c, w, h, col, edge) { px(c, 0, 0, w * 0.11, h, col); px(c, w * 0.11 - 3, 0, 3, h, edge); }

function verdant(c, w, h, now) {
  for (let i = 0; i * 26 < w; i++) px(c, i * 26, 0, 26, h, i % 2 ? "#2f9e44" : "#37b24d");
  laneLines(c, w, h, "rgba(0,0,0,.12)");
  for (let i = 0; i < 14; i++) { const x = (i * 97) % w, y = (i * 53) % h; const sway = Math.sin(now * 3 + i) * 2; c.strokeStyle = "#2b8a3e"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x + sway, y - 4); c.moveTo(x + 3, y + 6); c.lineTo(x + 3 + sway, y - 2); c.stroke(); }
  circle(c, w * 0.5, h * 0.3, 3, "#ffe066"); circle(c, w * 0.74, h * 0.7, 3, "#ff8787");
  house(c, w, h, "#6b4f2a", "#3a2c18");
}
function keep(c, w, h, now) {
  for (let y = 0; y < h; y += 24) for (let x = 0; x < w; x += 30) px(c, x, y, 30, 24, (x / 30 + y / 24) % 2 ? "#495057" : "#3d444c");
  c.strokeStyle = "rgba(0,0,0,.3)"; c.lineWidth = 1; for (let x = 0; x < w; x += 30) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  house(c, w, h, "#343a40", "#212529");
  for (const ty of [h * 0.2, h * 0.8]) { const fl = 0.6 + Math.sin(now * 12 + ty) * 0.4; px(c, w * 0.11 + 4, ty, 4, 14, "#6b4f2a"); circle(c, w * 0.11 + 6, ty - 2, 5 * fl + 3, "#ffa94d"); circle(c, w * 0.11 + 6, ty - 3, 3 * fl + 1, "#ffe066"); }
}
function lava(c, w, h, now) {
  px(c, 0, 0, w, h, "#1a1110"); for (let y = 0; y < h; y += 20) for (let x = 0; x < w; x += 24) if ((x + y) % 48) px(c, x + 1, y + 1, 22, 18, "#241a18");
  c.strokeStyle = "#ff6b3d"; c.lineWidth = 2; c.shadowColor = "#ff6b3d"; c.shadowBlur = 8;
  for (let i = 0; i < 5; i++) { c.beginPath(); let y = (i + 0.5) * h / 5; c.moveTo(0, y); for (let x = 0; x <= w; x += 24) c.lineTo(x, y + Math.sin(x * 0.2 + i) * 6); c.stroke(); }
  c.shadowBlur = 0;
  for (let i = 0; i < 22; i++) { const x = (i * 71) % w, y = h - ((now * 40 + i * 60) % h); c.globalAlpha = y / h; circle(c, x, y, 1.6, "#ffd43b"); } c.globalAlpha = 1;
  house(c, w, h, "#2b2422", "#0b0807");
}
function frost(c, w, h, now) {
  for (let y = 0; y < h; y += 22) for (let x = 0; x < w; x += 26) px(c, x, y, 26, 22, (x / 26 + y / 22) % 2 ? "#dbe4f0" : "#c5d3e8");
  c.strokeStyle = "rgba(120,160,210,.5)"; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.beginPath(); let x = (i * 113) % w; c.moveTo(x, 0); c.lineTo(x + 14, h * 0.4); c.lineTo(x - 6, h); c.stroke(); }
  laneLines(c, w, h, "rgba(80,120,170,.3)");
  for (let i = 0; i < 26; i++) { const x = (i * 67 + now * 12) % w, y = (i * 41 + now * 26) % h; c.globalAlpha = .8; circle(c, x, y, 1.5, "#fff"); } c.globalAlpha = 1;
  house(c, w, h, "#8aa0bf", "#5b7290");
}
function marsh(c, w, h, now) {
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#241b33"); g.addColorStop(1, "#1a2a22"); c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 18) for (let x = 0; x < w; x += 22) if ((x * 7 + y * 13) % 5 === 0) px(c, x, y, 6, 4, "#2f6f4f");
  c.strokeStyle = "#101a14"; c.lineWidth = 5; c.beginPath(); c.moveTo(w * 0.8, h); c.lineTo(w * 0.82, h * 0.3); c.lineTo(w * 0.74, h * 0.1); c.moveTo(w * 0.82, h * 0.45); c.lineTo(w * 0.92, h * 0.3); c.stroke(); // dead tree
  for (let i = 0; i < 3; i++) { c.globalAlpha = 0.10 + 0.05 * Math.sin(now + i); c.fillStyle = "#9775fa"; const fy = (i * h / 3 + now * 8) % h; c.fillRect(0, fy, w, 26); } c.globalAlpha = 1;
  for (let i = 0; i < 6; i++) { const x = (i * 151 + now * 16) % w, y = h * 0.5 + Math.sin(now * 2 + i) * h * 0.25; c.shadowColor = "#b197fc"; c.shadowBlur = 12; circle(c, x, y, 2.4, "#d0bfff"); } c.shadowBlur = 0;
  house(c, w, h, "#2a2140", "#120c20");
}
function neon(c, w, h, now) {
  px(c, 0, 0, w, h, "#060912");
  c.strokeStyle = "rgba(59,201,219,.5)"; c.lineWidth = 1; c.shadowColor = "#3bc9db"; c.shadowBlur = 6;
  const hz = h * 0.18;
  for (let i = -10; i < 20; i++) { const x = w / 2 + i * 26; c.beginPath(); c.moveTo(w / 2 + (x - w / 2) * 0.2, hz); c.lineTo(x, h); c.stroke(); }
  for (let i = 0; i < 12; i++) { const yy = hz + (i * i) * 1.6 + (now * 30 % 30); if (yy > h) continue; c.beginPath(); c.moveTo(0, yy); c.lineTo(w, yy); c.stroke(); }
  c.shadowBlur = 0;
  house(c, w, h, "#0a1530", "#3bc9db");
}

const MAPS = [
  { id: "verdant", name: "Verdant Fields", ac: "#51cf66", draw: verdant, desc: "Mowed-lawn stripes with swaying grass and flowers. Bright, friendly, classic lane-defense." },
  { id: "keep", name: "Stone Keep", ac: "#adb5bd", draw: keep, desc: "Flagstone courtyard with flickering wall torches. Solid medieval-castle defense vibe." },
  { id: "lava", name: "Lava Wastes", ac: "#ff6b3d", draw: lava, desc: "Cracked black rock with glowing magma seams and rising embers. Hot, dangerous, dramatic." },
  { id: "frost", name: "Frostreach", ac: "#74c0fc", draw: frost, desc: "Ice tiles with fractures and drifting snow. Cool, crisp, calm-before-the-storm." },
  { id: "marsh", name: "Cursed Marsh", ac: "#9775fa", draw: marsh, desc: "Murky swamp with drifting fog, a dead tree and floating wisps. Home of the Lost Lands lords." },
  { id: "neon", name: "Neon Grid", ac: "#3bc9db", draw: neon, desc: "Receding glowing grid into a synth horizon. Techy, abstract, very cheap to make pop." },
];

// ---------------- cards ----------------
function makeCard(host, idx, label, accent, desc, kind, draw) {
  const card = document.createElement("div"); card.className = "card";
  card.style.setProperty("--ac", accent); card.style.setProperty("--acg", accent + "70");
  card.innerHTML = `<div class="id">${kind} ${String(idx).padStart(2, "0")}</div><div class="tag">${label.tag}</div><canvas></canvas><div class="meta"><h3><b>${label.name}</b></h3><p>${desc}</p></div>`;
  host.appendChild(card);
  return card.querySelector("canvas");
}

const dpr = window.devicePixelRatio || 1;
const cards = [];
function setup(cv, render) { const fit = () => { const b = cv.getBoundingClientRect(); cv.width = b.width * dpr; cv.height = b.height * dpr; cv.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0); cv._w = b.width; cv._h = b.height; }; fit(); cards.push({ cv, render, fit }); }

const tHost = document.getElementById("turrets");
TURRETS.forEach((tu, i) => {
  const cv = makeCard(tHost, i + 1, { name: tu.name, tag: tu.arch }, tu.ac, tu.desc, "TURRET", tu.draw);
  let fireT = 0, clock = 0.3 + i * 0.12, enemyHit = 0;
  setup(cv, (now, dt) => {
    const c = cv.getContext("2d"), w = cv._w, h = cv._h, by = h * 0.6;
    c.clearRect(0, 0, w, h); px(c, 0, h * 0.78, w, h * 0.22, "#0c1118"); c.strokeStyle = "rgba(120,160,210,.12)"; c.beginPath(); c.moveTo(0, h * 0.78); c.lineTo(w, h * 0.78); c.stroke();
    clock -= dt; if (clock <= 0) { fireT = 1; clock = 1.1; setTimeout(() => { enemyHit = 1; }, 160); }
    fireT = Math.max(0, fireT - dt * 3.5); enemyHit = Math.max(0, enemyHit - dt * 3);
    drawPixelEnemy(c, w * 0.8, by, 26, "walker", now, enemyHit, i);
    if (fireT > 0.1) { px(c, w * 0.32 + (1 - fireT) * (w * 0.45), by - 3, 5, 5, tu.ac); }
    tu.draw(c, w * 0.22, by, 30, now, fireT);
  });
});

const mHost = document.getElementById("maps");
MAPS.forEach((mp, i) => {
  const cv = makeCard(mHost, i + 1, { name: mp.name, tag: "MAP" }, mp.ac, mp.desc, "FIELD", mp.draw);
  setup(cv, (now) => {
    const c = cv.getContext("2d"), w = cv._w, h = cv._h;
    mp.draw(c, w, h, now);
    cannon(c, w * 0.2, h * 0.5, 22, now, (Math.sin(now * 2 + i) > 0.9) ? 1 : 0);
    const ex = w - ((now * 40 + i * 90) % (w * 0.8));
    drawPixelEnemy(c, ex, h * 0.5, 22, "walker", now, 0, i);
  });
});

let last = performance.now();
function frame(t) { const dt = Math.min(0.05, (t - last) / 1000); last = t; const s = t / 1000; for (const c of cards) c.render(s, dt); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
window.addEventListener("resize", () => cards.forEach((c) => c.fit()));
