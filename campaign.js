// campaign.js — the 5-arena campaign concept board. Each arena: a battlefield,
// the hero you play (animated, firing), a marching enemy, and an unlock strip.
import { drawPixelEnemy } from "./enemy-art.js";

const TAU = Math.PI * 2;
const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
const circle = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
function flash(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rad = i % 2 ? r * 0.45 : r; i ? c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad) : c.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } c.closePath(); c.fill(); }
function house(c, w, h, col, edge) { px(c, 0, 0, w * 0.09, h, col); px(c, w * 0.09 - 3, 0, 3, h, edge); }

// ---------------- battlefields ----------------
function grass(c, w, h, now) {
  for (let i = 0; i * 24 < w; i++) px(c, i * 24, 0, 24, h, i % 2 ? "#2f9e44" : "#37b24d");
  for (let i = 0; i < 16; i++) { const x = (i * 89) % w, y = (i * 47) % h, sw = Math.sin(now * 3 + i) * 2; c.strokeStyle = "#2b8a3e"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 6); c.lineTo(x + sw, y - 4); c.stroke(); }
  for (const tx of [w * 0.55, w * 0.85]) { c.fillStyle = "#1e5631"; c.beginPath(); c.arc(tx, h * 0.3, 16, 0, TAU); c.fill(); px(c, tx - 2, h * 0.3, 4, h * 0.4, "#3a2c18"); }
  house(c, w, h, "#6b4f2a", "#3a2c18");
}
function city(c, w, h, now) {
  for (let y = 0; y < h; y += 22) for (let x = 0; x < w; x += 28) px(c, x, y, 28, 22, (x / 28 + y / 22) % 2 ? "#495057" : "#3d444c");
  c.strokeStyle = "rgba(0,0,0,.3)"; c.lineWidth = 1; for (let x = 0; x < w; x += 28) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  house(c, w, h, "#343a40", "#212529");
  for (const ty of [h * 0.25, h * 0.8]) { const fl = 0.6 + Math.sin(now * 12 + ty) * 0.4; px(c, w * 0.09 + 4, ty, 4, 14, "#6b4f2a"); circle(c, w * 0.09 + 6, ty - 2, 5 * fl + 3, "#ffa94d"); circle(c, w * 0.09 + 6, ty - 3, 3 * fl + 1, "#ffe066"); }
}
function camp(c, w, h, now) {
  for (let i = 0; i * 26 < w; i++) px(c, i * 26, 0, 26, h, i % 2 ? "#5a4424" : "#6b5232");
  for (const tx of [w * 0.5, w * 0.74]) { c.fillStyle = "#c2410c"; c.beginPath(); c.moveTo(tx - 20, h * 0.72); c.lineTo(tx, h * 0.38); c.lineTo(tx + 20, h * 0.72); c.closePath(); c.fill(); px(c, tx - 2, h * 0.5, 4, h * 0.22, "#3a1f0a"); }
  const fl = 0.6 + 0.4 * Math.sin(now * 12); circle(c, w * 0.34, h * 0.8, 8 * fl, "#ff6b3d"); circle(c, w * 0.34, h * 0.8, 4.5 * fl, "#ffd43b");
  px(c, w * 0.88, h * 0.6, 18, 16, "#7a5a30"); px(c, w * 0.88, h * 0.6, 18, 4, "#9c6b3f");
  house(c, w, h, "#4a3a22", "#241a0e");
}
function frost(c, w, h, now) {
  for (let y = 0; y < h; y += 22) for (let x = 0; x < w; x += 26) px(c, x, y, 26, 22, (x / 26 + y / 22) % 2 ? "#dbe4f0" : "#c5d3e8");
  c.strokeStyle = "rgba(120,160,210,.5)"; c.lineWidth = 1; for (let i = 0; i < 5; i++) { const x = (i * 137) % w; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 14, h * 0.4); c.lineTo(x - 6, h); c.stroke(); }
  for (let i = 0; i < 24; i++) { const x = (i * 67 + now * 12) % w, y = (i * 41 + now * 26) % h; c.globalAlpha = .85; circle(c, x, y, 1.5, "#fff"); } c.globalAlpha = 1;
  // a wooden palisade wall fragment
  for (let i = 0; i < 4; i++) px(c, w * 0.6 + i * 12, h * 0.35, 9, h * 0.4, i % 2 ? "#6b4f2a" : "#5a4424");
  house(c, w, h, "#8aa0bf", "#5b7290");
}
function lab(c, w, h, now) {
  px(c, 0, 0, w, h, "#0c131d");
  for (let y = 0; y < h; y += 22) for (let x = 0; x < w; x += 28) px(c, x + 1, y + 1, 26, 20, (x / 28 + y / 22) % 2 ? "#10202c" : "#0e1824");
  c.strokeStyle = "rgba(59,201,219,.25)"; c.lineWidth = 1; for (let x = 0; x < w; x += 28) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (const sx of [w * 0.5, w * 0.72]) { c.shadowColor = "#3bc9db"; c.shadowBlur = 10; px(c, sx, h * 0.18, 30, 18, "#0b3a44"); c.fillStyle = "#3bc9db"; c.fillRect(sx + 3, h * 0.18 + 4 + (Math.sin(now * 4 + sx) + 1) * 3, 24, 2); c.shadowBlur = 0; }
  px(c, 0, h * 0.9, w, 4, "#22323f"); px(c, 0, h * 0.08, w, 3, "#22323f");
  house(c, w, h, "#13202e", "#3bc9db");
}

// ---------------- heroes ----------------
function archer(c, x, y, s, now, fire) {
  const skin = "#e0a070";
  px(c, x - 3, y + 6, 3, 7, "#5c4326"); px(c, x + 1, y + 6, 3, 7, "#5c4326");
  px(c, x - 4, y - 3, 8, 10, "#6b8e23"); px(c, x - 3, y - 9, 6, 6, skin); px(c, x - 3, y - 10, 6, 2, "#3a2c18");
  c.strokeStyle = "#9c6b3f"; c.lineWidth = 2; c.beginPath(); c.arc(x + 9, y - 1, 8, -1.1, 1.1); c.stroke();
  c.strokeStyle = "#d9c7a3"; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 9, y - 9); c.lineTo(x + (fire > 0.5 ? 9 : 3), y - 1); c.lineTo(x + 9, y + 7); c.stroke();
  px(c, x + 2, y - 2, 6, 3, skin);
}
function cannonHero(c, x, y, s, now, fire) {
  const rec = fire * 5;
  px(c, x - 12, y + 6, 24, 8, "#3a2c18"); px(c, x - 12, y + 6, 24, 3, "#5a4424");
  px(c, x - 7, y - 2, 14, 9, "#495057"); px(c, x - 3 - rec, y - 6, 16, 7, "#868e96"); px(c, x - 3 - rec, y - 6, 16, 2, "#adb5bd");
  if (fire > 0.45) flash(c, x + 14 - rec, y - 2, 7 * fire, "#ffd43b");
}
function soldier(c, x, y, s, now, fire) {
  const skin = "#d9a066";
  px(c, x - 3, y + 6, 3, 7, "#2f3b2a"); px(c, x + 1, y + 6, 3, 7, "#2f3b2a");
  px(c, x - 4, y - 3, 8, 10, "#3d5a3d"); px(c, x - 3, y - 9, 6, 6, skin); px(c, x - 4, y - 10, 8, 2, "#495057");
  px(c, x + 3, y - 1, 13, 2, "#343a40"); px(c, x + 2, y - 2, 5, 3, skin);
  if (fire > 0.4) flash(c, x + 17, y, 6 * fire, "#ffd43b");
}
function watchtower(c, x, y, s, now, fire) {
  px(c, x - 9, y - 2, 18, 18, "#6b5638"); for (let i = 0; i < 3; i++) px(c, x - 9, y - 2 + i * 6, 18, 1, "#3a2c18");
  px(c, x - 11, y - 12, 22, 10, "#5a4424"); px(c, x - 11, y - 12, 22, 3, "#7a5a30");
  c.fillStyle = "#7a1f1f"; c.beginPath(); c.moveTo(x - 13, y - 12); c.lineTo(x, y - 24); c.lineTo(x + 13, y - 12); c.closePath(); c.fill();
  px(c, x - 2, y - 18, 4, 5, "#e0a070");
  if (fire > 0.4) px(c, x + 8, y - 15, 12, 2, "#d9c7a3");
}
function laserT(c, x, y, s, now, fire) {
  px(c, x - 9, y + 5, 18, 9, "#1a2433"); px(c, x - 7, y - 7, 14, 13, "#2b3a4a"); circle(c, x, y, 5, "#0e1622");
  px(c, x + 4, y - 2, 11, 4, "#495057");
  const glow = 0.5 + 0.5 * Math.sin(now * 8);
  c.shadowColor = "#22d3ee"; c.shadowBlur = 12; circle(c, x, y, 3 + glow * 1.6, fire > 0.3 ? "#fff" : "#22d3ee"); c.shadowBlur = 0;
}

// ---------------- unlock icons ----------------
const bowI = (c, x, y) => { c.strokeStyle = "#9c6b3f"; c.lineWidth = 2; c.beginPath(); c.arc(x - 2, y, 9, -1, 1); c.stroke(); c.strokeStyle = "#d9c7a3"; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 2, y - 8); c.lineTo(x - 2, y + 8); c.stroke(); px(c, x - 3, y - 1, 14, 2, "#c2a24a"); };
const slingI = (c, x, y) => { c.strokeStyle = "#7a5a30"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 8, y - 8); c.lineTo(x, y + 4); c.lineTo(x + 8, y - 8); c.stroke(); circle(c, x, y + 6, 3, "#868e96"); };
const spearI = (c, x, y) => { c.strokeStyle = "#7a5a30"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 9, y + 8); c.lineTo(x + 7, y - 8); c.stroke(); c.fillStyle = "#adb5bd"; c.beginPath(); c.moveTo(x + 7, y - 9); c.lineTo(x + 10, y - 4); c.lineTo(x + 4, y - 4); c.closePath(); c.fill(); };
const cannonI = (c, x, y) => { px(c, x - 8, y - 4, 14, 7, "#868e96"); px(c, x - 8, y - 4, 14, 2, "#adb5bd"); circle(c, x - 7, y + 5, 4, "#343a40"); };
const ballistaI = (c, x, y) => { c.strokeStyle = "#9c6b3f"; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 8, y - 7); c.lineTo(x + 8, y + 7); c.moveTo(x + 8, y - 7); c.lineTo(x - 8, y + 7); c.stroke(); px(c, x - 2, y - 1, 14, 2, "#b08968"); };
const mortarI = (c, x, y) => { c.save(); c.translate(x, y); c.rotate(-0.7); px(c, -7, -4, 14, 8, "#51cf66"); px(c, -7, -4, 14, 2, "#94d82d"); c.restore(); };
const personI = (c, x, y, col) => { circle(c, x, y - 6, 3.5, "#d9a066"); px(c, x - 3, y - 3, 6, 9, col); px(c, x - 3, y + 6, 2, 5, "#333"); px(c, x + 1, y + 6, 2, 5, "#333"); };
const soldierI = (c, x, y) => { personI(c, x, y, "#3d5a3d"); px(c, x + 2, y - 1, 9, 2, "#343a40"); };
const medicI = (c, x, y) => { personI(c, x, y, "#e9ecef"); c.fillStyle = "#e03131"; px(c, x - 1, y - 4, 2, 6, "#e03131"); px(c, x - 3, y - 2, 6, 2, "#e03131"); };
const engineerI = (c, x, y) => { personI(c, x, y, "#e8a33d"); c.strokeStyle = "#adb5bd"; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 3, y); c.lineTo(x + 9, y - 5); c.stroke(); };
const wallI = (c, x, y) => { for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) px(c, x - 9 + k * 6 + (r % 2 ? 3 : 0), y - 7 + r * 5, 5, 4, "#868e96"); };
const towerI = (c, x, y) => { px(c, x - 5, y - 4, 10, 12, "#6b5638"); c.fillStyle = "#7a1f1f"; c.beginPath(); c.moveTo(x - 7, y - 4); c.lineTo(x, y - 12); c.lineTo(x + 7, y - 4); c.closePath(); c.fill(); };
const trapI = (c, x, y) => { c.fillStyle = "#adb5bd"; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * 5 - 2, y + 6); c.lineTo(x + i * 5, y - 6); c.lineTo(x + i * 5 + 2, y + 6); c.closePath(); c.fill(); } };
const laserI = (c, x, y) => { px(c, x - 7, y - 3, 9, 6, "#2b3a4a"); c.shadowColor = "#22d3ee"; c.shadowBlur = 8; px(c, x + 2, y - 1, 10, 2, "#22d3ee"); c.shadowBlur = 0; };
const teslaI = (c, x, y) => { px(c, x - 2, y - 2, 4, 10, "#495057"); circle(c, x, y - 4, 4, "#4dd2ff"); c.strokeStyle = "#9be7ff"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x + 5, y - 9); c.lineTo(x + 1, y - 11); c.stroke(); };
const shieldI = (c, x, y) => { c.shadowColor = "#74c0fc"; c.shadowBlur = 8; c.strokeStyle = "#74c0fc"; c.lineWidth = 2; c.beginPath(); c.arc(x, y + 2, 9, Math.PI, 0); c.stroke(); c.shadowBlur = 0; };
const droneI = (c, x, y) => { px(c, x - 4, y - 2, 8, 4, "#495057"); circle(c, x - 7, y - 4, 3, "#22d3ee"); circle(c, x + 7, y - 4, 3, "#22d3ee"); };

const ARENAS = [
  { num: "ARENA 01", name: "The Wildwood", ac: "#51cf66", concept: "for loops — fire a volley of N arrows", seed: 0,
    story: "You wake with nothing but a bow. Grass, trees, and the infected closing in. Loose arrow after arrow to hold the line.",
    map: grass, hero: archer, fire: "arrows", unlocks: [{ n: "Bow", d: bowI }, { n: "Sling", d: slingI }, { n: "Spear-Thrower", d: spearI }] },
  { num: "ARENA 02", name: "The Ruined City", ac: "#adb5bd", concept: "gunpowder — conditions & targeting", seed: 40,
    story: "You reach the city walls and break open the old armories. Gunpowder changes everything — but it must be aimed.",
    map: city, hero: cannonHero, fire: "ball", unlocks: [{ n: "Cannon", d: cannonI }, { n: "Ballista", d: ballistaI }, { n: "Mortar", d: mortarI }] },
  { num: "ARENA 03", name: "The Survivors", ac: "#ffa94d", concept: "OOP — build people from classes", seed: 80,
    story: "Other survivors. You can recruit them and define what each one does — every ally a class with its own behaviour.",
    map: camp, hero: soldier, fire: "bullet", unlocks: [{ n: "Soldier", d: soldierI }, { n: "Medic", d: medicI }, { n: "Engineer", d: engineerI }] },
  { num: "ARENA 04", name: "The Stronghold", ac: "#74c0fc", concept: "structures — composition & data", seed: 120,
    story: "Winter sets in. The survivors dig in and build — walls, towers and traps that fight for you.",
    map: frost, hero: watchtower, fire: "bolt", unlocks: [{ n: "Wall", d: wallI }, { n: "Watchtower", d: towerI }, { n: "Trap", d: trapI }] },
  { num: "ARENA 05", name: "The Lab", ac: "#3bc9db", concept: "the source — advanced tech & ML", seed: 160,
    story: "The facility where it all began. Forbidden, futuristic tech hums in the dark — your last, best weapons.",
    map: lab, hero: laserT, fire: "beam", unlocks: [{ n: "Laser", d: laserI }, { n: "Tesla", d: teslaI }, { n: "Shield", d: shieldI }, { n: "Drone", d: droneI }] },
];

// ---------------- cards ----------------
const dpr = window.devicePixelRatio || 1;
const cards = [];
const host = document.getElementById("arenas");

ARENAS.forEach((a) => {
  const card = document.createElement("div"); card.className = "arena";
  card.innerHTML = `<div class="card" style="--ac:${a.ac}">
    <div class="head"><span class="num">${a.num}</span><h2>${a.name}</h2><span class="concept">${a.concept}</span></div>
    <div class="story">${a.story}</div><canvas></canvas></div>`;
  host.appendChild(card);
  const cv = card.querySelector("canvas");
  const fit = () => { const b = cv.getBoundingClientRect(); cv.width = b.width * dpr; cv.height = b.height * dpr; cv.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0); cv._w = b.width; cv._h = b.height; };
  fit();
  const st = { fireT: 0, clock: 0.4, proj: [], enemyHit: 0 };
  cards.push({ cv, fit, render: (now, dt) => render(cv, a, st, now, dt) });
});

function render(cv, a, st, now, dt) {
  const c = cv.getContext("2d"), w = cv._w, H = cv._h, sh = H * 0.66;
  c.clearRect(0, 0, w, H);
  a.map(c, w, sh, now);
  // marching enemy
  const ex = w - ((now * 42 + a.seed) % (w * 0.72));
  const ey = sh * 0.56;
  drawPixelEnemy(c, ex, ey, 22, "walker", now, st.enemyHit, a.seed);
  st.enemyHit = Math.max(0, st.enemyHit - dt * 3);
  // hero firing
  const hx = w * 0.16, hy = sh * 0.6;
  st.clock -= dt;
  if (st.clock <= 0) { st.fireT = 1; st.clock = 1.3; fireWeapon(a, st, hx, hy, ex, ey); }
  st.fireT = Math.max(0, st.fireT - dt * 3.5);
  if (a.fire === "beam" && st.fireT > 0.2) { c.strokeStyle = "#9be7ff"; c.lineWidth = 2 + st.fireT * 2; c.shadowColor = "#22d3ee"; c.shadowBlur = 10; c.beginPath(); c.moveTo(hx + 12, hy); c.lineTo(ex, ey); c.stroke(); c.shadowBlur = 0; st.enemyHit = 1; }
  for (const p of st.proj) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.arrow) { c.strokeStyle = p.col; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - 8, p.y); c.stroke(); } else { circle(c, p.x, p.y, p.r || 3, p.col); } if (p.x >= ex - 6) { st.enemyHit = 1; p.dead = true; } if (p.x > w) p.dead = true; }
  st.proj = st.proj.filter((p) => !p.dead);
  a.hero(c, hx, hy, 30, now, st.fireT);

  // unlock strip
  px(c, 0, sh, w, H - sh, "#0a0e15"); c.strokeStyle = a.ac; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(0, sh); c.lineTo(w, sh); c.stroke(); c.globalAlpha = 1;
  c.fillStyle = a.ac; c.font = "11px 'IBM Plex Mono', monospace"; c.textAlign = "left"; c.fillText("UNLOCKS", 16, sh + 22);
  const n = a.unlocks.length, gap = (w - 120) / n, sy = sh + (H - sh) * 0.55;
  a.unlocks.forEach((u, i) => { const x = 120 + gap * i + gap * 0.3; u.d(c, x, sy); c.fillStyle = "#9aa7b8"; c.font = "11px 'IBM Plex Mono', monospace"; c.textAlign = "center"; c.fillText(u.n, x, sy + 22); });
}

function fireWeapon(a, st, hx, hy, ex, ey) {
  if (a.fire === "arrows") { for (let i = -1; i <= 1; i++) st.proj.push({ x: hx + 10, y: hy, vx: 280, vy: i * 26, col: "#d9c7a3", arrow: true }); }
  else if (a.fire === "ball") st.proj.push({ x: hx + 14, y: hy - 4, vx: 250, vy: 0, col: "#343a40", r: 4 });
  else if (a.fire === "bullet") st.proj.push({ x: hx + 16, y: hy, vx: 460, vy: 0, col: "#ffd43b", r: 2 });
  else if (a.fire === "bolt") st.proj.push({ x: hx + 10, y: hy - 14, vx: 300, vy: 6, col: "#d9c7a3", arrow: true });
}

let last = performance.now();
function frame(t) { const dt = Math.min(0.05, (t - last) / 1000); last = t; const s = t / 1000; for (const c of cards) c.render(s, dt); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
window.addEventListener("resize", () => cards.forEach((c) => c.fit()));
