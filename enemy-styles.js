// enemy-styles.js — a live bestiary: six procedurally-drawn, fully-animated
// enemy art styles for Tower Logic, each with a turret firing, hit flashes and
// death bursts. Pick one and it gets wired into tower.html.

// ---------- tiny canvas helpers ----------
const TAU = Math.PI * 2;
const hx = (c) => { c = c.replace("#", ""); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; };
const lighten = (c, a) => { const [r, g, b] = hx(c); return `rgb(${Math.min(255, r + a)},${Math.min(255, g + a)},${Math.min(255, b + a)})`; };
const darken = (c, a) => { const [r, g, b] = hx(c); return `rgb(${Math.max(0, r - a)},${Math.max(0, g - a)},${Math.max(0, b - a)})`; };
const hexA = (c, al) => { const [r, g, b] = hx(c); return `rgba(${r},${g},${b},${al})`; };
const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function poly(ctx, sides, r, rot = 0) { ctx.beginPath(); for (let i = 0; i < sides; i++) { const a = rot + i / sides * TAU; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); }

// ---------- the six render styles ----------
function slime(ctx, e, now) {
  const r = e.size, t = now * 5 + e.phase;
  const sy = 1 + 0.12 * Math.sin(t * 1.4), sx = 1 / sy;
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(0, r * 0.92, r * 0.8, r * 0.2, 0, 0, TAU); ctx.fill();
  ctx.scale(sx, sy);
  ctx.beginPath();
  for (let a = 0; a <= TAU + 0.01; a += Math.PI / 18) {
    const wob = r * (1 + 0.07 * Math.sin(a * 4 + t * 2));
    const x = Math.cos(a) * wob, y = Math.sin(a) * wob * 0.92 - r * 0.05;
    a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.45, r * 0.1, 0, 0, r * 1.3);
  g.addColorStop(0, lighten(e.color, 45)); g.addColorStop(1, e.color);
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.beginPath(); ctx.ellipse(-r * 0.33, -r * 0.42, r * 0.24, r * 0.14, -0.5, 0, TAU); ctx.fill();
  const ey = -r * 0.02;
  for (const ex of [-r * 0.34, r * 0.12]) {
    ctx.fillStyle = "#fff"; circle(ctx, ex, ey, r * 0.19);
    ctx.fillStyle = "#0b0e14"; circle(ctx, ex - r * 0.07, ey, r * 0.09);
  }
  ctx.restore();
}

const PXA = ["..1111..", ".111111.", "11211211", "11111111", "11111111", ".111111.", "11.11.11", "1.1..1.1"];
const PXB = ["..1111..", ".111111.", "11211211", "11111111", "11111111", ".111111.", ".111111.", "1..11..1"];
function pixel(ctx, e, now) {
  const frame = (Math.floor(now * 6 + e.phase) % 2) ? PXB : PXA;
  const s = e.size * 2 / 8, ox = e.x - e.size, oy = e.y - e.size;
  const flash = e.hit > 0.3;
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const ch = frame[row][col]; if (ch === ".") continue;
    let color = ch === "2" ? "#fff" : flash ? "#fff" : row < 2 ? lighten(e.color, 20) : row > 5 ? darken(e.color, 28) : e.color;
    ctx.fillStyle = color; ctx.fillRect(ox + col * s, oy + row * s, s + 0.5, s + 0.5);
  }
  if (!flash) { ctx.fillStyle = "#0b0e14"; ctx.fillRect(ox + 2 * s + s * 0.25, oy + 2 * s + s * 0.2, s * 0.5, s * 0.55); ctx.fillRect(ox + 5 * s + s * 0.25, oy + 2 * s + s * 0.2, s * 0.5, s * 0.55); }
}

function neon(ctx, e, now) {
  const sides = e.type === "sprinter" ? 3 : e.type === "brute" ? 8 : 6;
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(now * 0.9 + e.phase);
  ctx.shadowColor = e.color; ctx.shadowBlur = 16 + e.hit * 34;
  ctx.strokeStyle = e.color; ctx.lineWidth = 2.5; ctx.fillStyle = hexA(e.color, 0.12);
  poly(ctx, sides, e.size); ctx.fill(); ctx.stroke();
  poly(ctx, sides, e.size * 0.6, 0.4); ctx.stroke();
  const pr = e.size * (0.28 + 0.12 * Math.sin(now * 6 + e.phase));
  ctx.shadowBlur = 14; ctx.fillStyle = lighten(e.color, 60); circle(ctx, 0, 0, pr);
  ctx.restore();
}

function bug(ctx, e, now) {
  const r = e.size, t = now * 9 + e.phase;
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.strokeStyle = darken(e.color, 25); ctx.lineWidth = 2.2; ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const lx = -r * 0.35 + i * r * 0.42, sw = Math.sin(t + i * 1.5) * r * 0.35;
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + sw, side * r * 0.95); ctx.stroke(); }
  }
  const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, lighten(e.color, 25)); g.addColorStop(1, darken(e.color, 25));
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(r * 0.1, 0, r * 0.95, r * 0.66, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = darken(e.color, 45); ctx.lineWidth = 1.5;
  for (const sx of [-0.2, 0.3, 0.7]) { ctx.beginPath(); ctx.ellipse(r * 0.1, 0, r * (0.95 - 0.0), r * 0.66, 0, 1.7 + sx, 1.7 + sx + 0.001); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r * (0.1 + sx), -r * 0.55); ctx.lineTo(r * (0.1 + sx), r * 0.55); ctx.stroke(); }
  ctx.fillStyle = darken(e.color, 15); circle(ctx, -r * 0.85, 0, r * 0.45);
  ctx.strokeStyle = darken(e.color, 30); ctx.lineWidth = 1.6;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-r * 1.0, s * r * 0.2); ctx.quadraticCurveTo(-r * 1.5, s * r * 0.5, -r * 1.4 + Math.sin(t) * 3, s * r * 0.7); ctx.stroke(); }
  ctx.fillStyle = "#fff"; circle(ctx, -r * 0.95, -r * 0.13, r * 0.1); circle(ctx, -r * 0.95, r * 0.13, r * 0.1);
  ctx.fillStyle = "#0b0e14"; circle(ctx, -r * 1.0, -r * 0.13, r * 0.05); circle(ctx, -r * 1.0, r * 0.13, r * 0.05);
  ctx.restore();
}

function mech(ctx, e, now) {
  const r = e.size, t = now * 6 + e.phase;
  ctx.save(); ctx.translate(e.x, e.y);
  const stomp = Math.sin(t);
  ctx.fillStyle = darken(e.color, 50);
  ctx.fillRect(-r * 0.62, r * 0.35 + Math.max(0, stomp) * 4, r * 0.4, r * 0.7);
  ctx.fillRect(r * 0.22, r * 0.35 + Math.max(0, -stomp) * 4, r * 0.4, r * 0.7);
  if (e.type === "brute") { ctx.fillStyle = darken(e.color, 20); rr(ctx, -r * 1.05, -r * 0.5, r * 0.3, r * 0.5, 3); ctx.fill(); rr(ctx, r * 0.75, -r * 0.5, r * 0.3, r * 0.5, 3); ctx.fill(); }
  const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, lighten(e.color, 30)); g.addColorStop(1, darken(e.color, 20));
  ctx.fillStyle = g; rr(ctx, -r * 0.8, -r * 0.72, r * 1.6, r * 1.25, 5); ctx.fill();
  ctx.fillStyle = darken(e.color, 35); rr(ctx, -r * 0.8, -r * 0.72, r * 1.6, r * 0.32, 5); ctx.fill();
  ctx.fillStyle = "#0b0e14"; rr(ctx, -r * 0.6, -r * 0.28, r * 1.2, r * 0.38, 3); ctx.fill();
  const scan = Math.sin(now * 3 + e.phase);
  ctx.fillStyle = "#ff5b5b"; ctx.shadowColor = "#ff5b5b"; ctx.shadowBlur = 12; circle(ctx, scan * r * 0.42, -r * 0.08, r * 0.13); ctx.shadowBlur = 0;
  ctx.fillStyle = darken(e.color, 45); for (const bx of [-0.6, 0.55]) for (const by of [0.35, 0.75]) circle(ctx, bx * r, by * r * 0.7, r * 0.06);
  ctx.strokeStyle = darken(e.color, 30); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r * 0.72); ctx.lineTo(0, -r * 1.1); ctx.stroke();
  ctx.fillStyle = "#ff5b5b"; circle(ctx, 0, -r * 1.15, r * 0.08);
  ctx.restore();
}

function wisp(ctx, e, now) {
  const r = e.size, t = now * 3 + e.phase;
  ctx.save(); ctx.translate(e.x, e.y + Math.sin(t) * r * 0.18);
  for (let k = 2; k >= 1; k--) { ctx.globalAlpha = 0.12 * k; ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(k * 5, 0, r * 0.9, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 0.9; ctx.shadowColor = e.color; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0);
  const tails = 5;
  for (let i = 0; i <= tails; i++) { const x = r - 2 * r * (i / tails); const y = r * 0.55 + Math.sin(t * 2 + i) * r * 0.2 * (i % 2 ? 1 : -1); ctx.lineTo(x, y); }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, lighten(e.color, 40)); g.addColorStop(1, hexA(e.color, 0.25));
  ctx.fillStyle = g; ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  ctx.fillStyle = "#0b0e14"; circle(ctx, -r * 0.34, -r * 0.12, r * 0.17); circle(ctx, r * 0.16, -r * 0.12, r * 0.17);
  ctx.fillStyle = lighten(e.color, 50); circle(ctx, -r * 0.34, -r * 0.12, r * 0.07); circle(ctx, r * 0.16, -r * 0.12, r * 0.07);
  ctx.restore();
}

const STYLES = [
  { id: "slime", name: "Goo Slimes", lift: "MED", accent: "#69db7c", draw: slime,
    palette: { walker: "#51cf66", brute: "#2f9e44", sprinter: "#94d82d" },
    desc: "Wobbling jelly blobs that squash, breathe and stare with googly eyes. Cute-menacing and reads instantly at any size." },
  { id: "pixel", name: "Pixel Marchers", lift: "LOW", accent: "#ffa94d", draw: pixel,
    palette: { walker: "#f08c00", brute: "#e8590c", sprinter: "#ffd43b" },
    desc: "Chunky 8-bit sprites with a 2-frame walk cycle and shaded rows. Pure nostalgic arcade-defense energy." },
  { id: "neon", name: "Neon Vectors", lift: "LOW", accent: "#3bc9db", draw: neon,
    palette: { walker: "#22d3ee", brute: "#e64980", sprinter: "#fcc419" },
    desc: "Glowing wireframe polygons with spinning cores and bloom. Clean synthwave / TRON look, very cheap to draw." },
  { id: "bug", name: "Chitin Bugs", lift: "HIGH", accent: "#ff8787", draw: bug,
    palette: { walker: "#e03131", brute: "#a51111", sprinter: "#ff6b6b" },
    desc: "Segmented insects with animated walking legs and twitching antennae. Organic, alive, and a little gross." },
  { id: "mech", name: "War Mechs", lift: "MED", accent: "#5c7cfa", draw: mech,
    palette: { walker: "#748ffc", brute: "#4263eb", sprinter: "#91a7ff" },
    desc: "Armored chassis with stomping legs and a scanning red visor. Fits the turret-defense theme best." },
  { id: "wisp", name: "Void Wisps", lift: "MED", accent: "#9775fa", draw: wisp,
    palette: { walker: "#b197fc", brute: "#7048e8", sprinter: "#e599f7" },
    desc: "Floaty translucent ghosts with undulating tails, afterimages and hollow glowing eyes. Ethereal and eerie." },
];

const TYPES = {
  walker: { hp: 3, sizeMul: 1.0, speed: 24 },
  brute: { hp: 6, sizeMul: 1.55, speed: 16 },
  sprinter: { hp: 2, sizeMul: 0.68, speed: 44 },
};

class Lane {
  constructor(canvas, style) {
    this.cv = canvas; this.ctx = canvas.getContext("2d"); this.style = style;
    this.enemies = []; this.projectiles = []; this.particles = [];
    this.spawnT = 0; this.fireT = 0.4;
    this.resize();
    // seed enemies already spread across the lane so it's populated immediately
    this.spawn(this.w * 0.78); this.spawn(this.w * 0.52); this.spawn(this.w * 0.3);
  }
  resize() {
    const dpr = window.devicePixelRatio || 1, b = this.cv.getBoundingClientRect();
    this.w = b.width || 360; this.h = b.height || 190;
    this.cv.width = this.w * dpr; this.cv.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.baseY = this.h * 0.56; this.turret = { x: 34, y: this.baseY };
  }
  spawn(x) {
    const ty = ["walker", "brute", "sprinter"][Math.floor(Math.random() * 3)], td = TYPES[ty];
    this.enemies.push({ type: ty, x: x ?? this.w + 30, y: this.baseY + (Math.random() * 16 - 8), size: 15 * td.sizeMul, color: this.style.palette[ty], hp: td.hp, maxhp: td.hp, speed: td.speed * (0.85 + Math.random() * 0.3), phase: Math.random() * 9, hit: 0 });
  }
  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 30 + Math.random() * 110; this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0.4 + Math.random() * 0.35, maxlife: 0.75, color, size: 2 + Math.random() * 2.5 }); }
  }
  update(dt) {
    this.spawnT -= dt;
    if (this.enemies.length < 3 && this.spawnT <= 0) { this.spawn(); this.spawnT = 0.8 + Math.random() * 0.9; }
    for (const e of this.enemies) { e.x -= e.speed * dt; e.hit = Math.max(0, e.hit - dt * 3); }
    this.fireT -= dt;
    if (this.fireT <= 0 && this.enemies.length) {
      const tgt = this.enemies.reduce((a, b) => (b.x < a.x ? b : a));
      this.projectiles.push({ x: this.turret.x + 12, y: this.turret.y, tx: tgt, color: this.style.accent });
      this.fireT = 0.45;
    }
    for (const p of this.projectiles) {
      p.x += 240 * dt;
      if (p.tx && this.enemies.includes(p.tx) && p.x >= p.tx.x) { p.tx.hit = 1; p.tx.hp -= 1; this.burst(p.tx.x, p.tx.y, p.tx.color, 5); p.done = true; if (p.tx.hp <= 0) { this.burst(p.tx.x, p.tx.y, p.tx.color, 14); p.tx.gone = true; } }
      else if (p.x > this.w + 20 || (p.tx && p.tx.gone)) p.done = true;
    }
    this.projectiles = this.projectiles.filter((p) => !p.done);
    for (const e of this.enemies) if (e.x < this.turret.x - 6) { this.burst(e.x, e.y, e.color, 8); e.gone = true; }
    this.enemies = this.enemies.filter((e) => !e.gone && e.hp > 0);
    for (const pa of this.particles) { pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vy += 140 * dt; pa.life -= dt; }
    this.particles = this.particles.filter((p) => p.life > 0);
  }
  render(now) {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    c.fillStyle = "rgba(77,171,247,0.06)"; c.fillRect(0, 0, this.turret.x - 4, this.h);
    c.strokeStyle = "rgba(120,160,210,0.13)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, this.h * 0.82); c.lineTo(this.w, this.h * 0.82); c.stroke();
    // turret
    c.fillStyle = "#2a3647"; rr(c, this.turret.x - 13, this.turret.y - 13, 26, 26, 5); c.fill();
    c.fillStyle = this.style.accent; rr(c, this.turret.x + 2, this.turret.y - 4, 17, 8, 2); c.fill();
    for (const p of this.projectiles) { c.fillStyle = p.color; c.shadowColor = p.color; c.shadowBlur = 8; circle(c, p.x, p.y, 3); }
    c.shadowBlur = 0;
    for (const e of this.enemies) {
      this.style.draw(c, e, now);
      if (e.hit > 0) { c.save(); c.globalAlpha = e.hit * 0.5; c.fillStyle = "#fff"; circle(c, e.x, e.y, e.size * 1.05); c.restore(); }
    }
    for (const pa of this.particles) { c.globalAlpha = Math.max(0, pa.life / pa.maxlife); c.fillStyle = pa.color; c.fillRect(pa.x, pa.y, pa.size, pa.size); }
    c.globalAlpha = 1;
  }
}

const grid = document.getElementById("grid");
const lanes = [];
STYLES.forEach((st, i) => {
  const card = document.createElement("div");
  card.className = "card";
  card.style.setProperty("--ac", st.accent);
  card.style.setProperty("--acglow", hexA(st.accent, 0.45));
  card.innerHTML = `
    <div class="id">SPECIMEN ${String(i + 1).padStart(2, "0")}</div>
    <div class="lift">${st.lift}</div>
    <canvas></canvas>
    <div class="meta">
      <h2><b>${st.name}</b></h2>
      <p>${st.desc}</p>
      <div class="types"><span>walker</span><span>brute</span><span>sprinter</span></div>
      <button class="pick">▸ Use style ${i + 1}</button>
    </div>`;
  grid.appendChild(card);
  const lane = new Lane(card.querySelector("canvas"), st);
  lanes.push(lane);
  card.querySelector(".pick").onclick = () => {
    window.__picked = st.id;
    alert(`Style ${i + 1} — “${st.name}”.\n\nTell me: “use style ${i + 1}” (or the name) and I'll wire it into tower.html, with matching turret + projectile FX.`);
  };
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const t = now / 1000;
  for (const ln of lanes) { ln.update(dt); ln.render(t); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener("resize", () => lanes.forEach((l) => l.resize()));
