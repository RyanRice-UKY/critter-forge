// mutant-styles.js — 1.4 mutant candidates, all built for SPEED: each loops the
// full encounter (coiled idle → ranged arrow → snap dodge → burst advance → close hit → down).
// Same pixel style + palette as lesson1.js; the winner gets ported in.
const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

// ---- palette (lifted from lesson1.js) ----
const SKIN = "#7a8a5c", SKIN_HI = "#9aab7a", SCALP = "#6b7a4c", UNDER = "#10200c";
const TROUSER = "#2a2014", TROUSER2 = "#241c10", WOUND = "#5c1f1f", EYE = "#ff3b3b";
const STEEL = "#8a939e", STEEL_HI = "#a5aeb8", STEEL_DK = "#6a727c", GILT = "#c9a24a", STRAP = "#3a2c18";

function glowEyes(c, x1, x2, y, s) {
  c.shadowColor = EYE; c.shadowBlur = 6;
  px(c, x1, y, s, s, EYE); px(c, x2, y, s, s, EYE);
  c.shadowBlur = 0;
}
function leg(c, x, y, ang, len, col) { c.save(); c.translate(x, y); c.rotate(ang); px(c, -1.5, 0, 3, len, col); c.restore(); }

// the regular zombie from lesson1.js (scale reference)
function zombie(c, x, y, sw = 0) {
  const f = -1;
  px(c, x - 4, y + 8 - Math.max(0, sw) * 2, 3, 9, TROUSER);
  px(c, x + 2, y + 8 - Math.max(0, -sw) * 2, 3, 9, TROUSER2);
  px(c, x - 4, y + 13 - Math.max(0, sw) * 2, 1, 2, "#8a9a6a");
  px(c, x - 7 + f * 2, y - 6, 15, 17, UNDER); px(c, x - 5 + f * 4, y - 16, 12, 11, UNDER);
  px(c, x - 5 + f * 2, y - 4, 11, 13, SKIN); px(c, x - 5 + f * 2, y - 4, 3, 13, "rgba(255,255,255,0.10)");
  px(c, x - 3 + f * 2, y - 6, 9, 4, SKIN);
  px(c, x + 1 + f * 2, y - 2, 5, 6, "#4a4438");
  px(c, x - 2 + f * 2, y + 3, 3, 3, WOUND);
  px(c, x - 4 + f * 4, y - 15, 10, 10, SKIN_HI); px(c, x - 4 + f * 4, y - 15, 10, 3, SCALP);
  glowEyes(c, x - 3 + f * 4, x + 1 + f * 4, y - 11, 2);
  px(c, x - 3 + f * 4, y - 7, 5, 2, "#241206"); px(c, x - 2 + f * 4, y - 7, 1, 1, "#e8dcc0");
  px(c, x + f * 2 - 12, y - 4, 8, 3, "#8a9a6a"); px(c, x + f * 2 - 13, y - 3, 2, 4, SKIN_HI);
  px(c, x - f * 3, y - 2, 3, 8, SKIN);
}

// ---- mutant bodies. Local origin, FEET at y=0, facing left. ----
// pose: { sw (-1..1 gait), reach (0..1 lunge), coil (0..1 crouched, pent-up), air (0..1 mid-leap) }

// A · TWITCHER — wrong-jointed and wiry; a plate scrap on one shoulder
function twitcherBody(c, p) {
  const sw = p.sw * 4, lean = p.reach * 4 + p.coil * 2, drop = p.coil * 4;
  px(c, -5, -20 + drop + Math.max(0, sw) * 1.5, 3, 12 - drop, TROUSER);
  px(c, -7, -9 + Math.max(0, sw) * 1.5, 3, 9, TROUSER2);
  px(c, 2, -20 + drop + Math.max(0, -sw) * 1.5, 3, 12 - drop, TROUSER);
  px(c, 4, -9 + Math.max(0, -sw) * 1.5, 3, 9, TROUSER2);
  // narrow torso, canted hard forward
  px(c, -7 - lean, -38 + drop, 13, 20, UNDER);
  px(c, -6 - lean, -37 + drop, 11, 18, SKIN); px(c, -6 - lean, -37 + drop, 3, 18, "rgba(255,255,255,0.10)");
  px(c, -4 - lean, -30 + drop, 3, 8, WOUND); // opened ribs
  px(c, -8 - lean, -39 + drop, 9, 5, STEEL); px(c, -8 - lean, -39 + drop, 9, 2, STEEL_HI); // pauldron scrap
  px(c, -1 - lean, -34 + drop, 2, 12, STRAP);
  // head cocked hard sideways
  px(c, -9 - lean, -46 + drop, 10, 9, SKIN_HI); px(c, -9 - lean, -46 + drop, 10, 3, SCALP);
  glowEyes(c, -8 - lean, -4 - lean, -43 + drop, 2);
  px(c, -8 - lean, -39 + drop, 6, 2, "#241206");
  // arms too long, fingers to the ground
  px(c, -13 - lean - p.reach * 6, -33 + drop, 4, 3, SKIN_HI);
  px(c, -15 - lean - p.reach * 6, -32 + drop, 3, 16, SKIN);
  px(c, 6 - lean, -33 + drop, 3, 24 - drop, SKIN); px(c, 6 - lean, -10, 4, 3, SKIN_HI);
}
// B · SPRINTER — a runner's body gone wrong: deep lean, stride like a hurdler
function sprinterBody(c, p) {
  const hipY = -17 + p.coil * 5, a = p.sw * 0.7 + p.air * 0.4;
  leg(c, -1, hipY, 0.35 + a, 18 - p.coil * 4, TROUSER);
  leg(c, 2, hipY, 0.05 - a, 18 - p.coil * 4, TROUSER2);
  c.save(); c.translate(0, hipY); c.rotate(-0.4 - p.coil * 0.35 - p.reach * 0.15);
  // torso, hard lean
  px(c, -6, -17, 11, 18, UNDER);
  px(c, -5, -16, 9, 16, SKIN); px(c, -5, -16, 3, 16, "rgba(255,255,255,0.10)");
  px(c, -3, -8, 3, 4, WOUND);
  px(c, -7, -18, 9, 5, STEEL); px(c, -7, -18, 9, 2, STEEL_HI); // pauldron scrap
  px(c, 1, -12, 2, 8, STRAP); // torn harness strap
  // head thrust ahead of the chest
  px(c, -13, -25, 10, 9, SKIN_HI); px(c, -13, -25, 10, 3, SCALP);
  glowEyes(c, -12, -7, -21, 2);
  px(c, -12, -17, 7, 2, "#241206");
  // arms swept back like a sprinter's
  px(c, 3, -14, 10 + p.reach * 4, 3, SKIN); px(c, 12 + p.reach * 4, -13, 3, 4, SKIN_HI);
  px(c, 2, -6, 8, 3, SKIN_HI);
  c.restore();
  if (p.coil > 0.5) px(c, -10, -3, 4, 3, SKIN_HI); // knuckles down in the blocks
}
// C · PIT STALKER — spine bent flat, knuckle-walker; plate slung under the belly
function stalkerBody(c, p) {
  const sw = p.sw * 3, lean = p.reach * 4, drop = p.coil * 3;
  px(c, 4, -12 + drop + Math.max(0, sw), 4, 12 - drop, TROUSER); px(c, 9, -10 + drop + Math.max(0, -sw), 4, 10 - drop, TROUSER2);
  // long horizontal spine
  px(c, -18 - lean, -22 + drop, 34, 12, UNDER);
  px(c, -16 - lean, -20 + drop, 30, 9, SKIN); px(c, -16 - lean, -20 + drop, 30, 3, SCALP);
  px(c, -2 - lean, -14 + drop, 4, 3, WOUND);
  px(c, -6 - lean, -11 + drop, 14, 5, STEEL_DK); px(c, -6 - lean, -11 + drop, 14, 2, STEEL); // belly plate
  px(c, 2 - lean, -12 + drop, 2, 6, STRAP);
  // fore-arms: long, knuckles planted
  px(c, -20 - lean - p.reach * 4, -18 + drop + Math.max(0, sw), 4, 18 - drop - Math.max(0, sw), SKIN);
  px(c, -13 - lean - p.reach * 2, -17 + drop + Math.max(0, -sw), 4, 17 - drop - Math.max(0, -sw), SKIN_HI);
  px(c, -21 - lean - p.reach * 4, -2, 6, 2, SKIN_HI);
  // head thrust forward, jaw wide
  px(c, -26 - lean, -25 + drop, 11, 10, SKIN_HI); px(c, -26 - lean, -25 + drop, 11, 3, SCALP);
  glowEyes(c, -25 - lean, -20 - lean, -21 + drop, 2);
  px(c, -25 - lean, -17 + drop, 8, 3, "#241206"); px(c, -23 - lean, -16 + drop, 1, 2, "#e8dcc0");
}
// D · LEAPER — all haunch, tucked forearms, moves in bounding arcs
function leaperBody(c, p) {
  const ext = p.air; // legs extend mid-leap
  // haunches: big coiled thighs, or kicked back in the air
  if (ext > 0.3) { leg(c, 5, -14, 1.9, 14, TROUSER); leg(c, 7, -13, 1.6, 12, TROUSER2); }
  else { px(c, -1, -16, 12, 12, SKIN); px(c, -1, -16, 12, 3, SCALP); px(c, 6, -6, 4, 6, TROUSER); }
  // body: a low ball of muscle
  px(c, -14, -21, 19, 13, UNDER);
  px(c, -13, -20, 17, 11, SKIN); px(c, -13, -20, 3, 11, "rgba(255,255,255,0.10)");
  px(c, -6, -13, 4, 4, WOUND);
  px(c, -12, -10, 11, 4, STEEL_DK); px(c, -12, -10, 11, 2, STEEL); // plate scrap under the chest
  // head low at the front, jaw unhinged
  px(c, -21, -19, 11, 10, SKIN_HI); px(c, -21, -19, 11, 3, SCALP);
  glowEyes(c, -20, -15, -15, 2);
  px(c, -20, -11, 8, 3, "#241206"); px(c, -18, -10, 1, 2, "#e8dcc0"); px(c, -15, -10, 1, 2, "#e8dcc0");
  // forearms tucked, or thrown forward mid-leap
  if (ext > 0.3) { px(c, -22, -14, 8, 3, SKIN); px(c, -24, -14, 3, 4, SKIN_HI); }
  else { px(c, -15, -9, 3, 9, SKIN); px(c, -10, -9, 3, 9, SKIN_HI); }
}

const VARIANTS = [
  {
    id: "A", name: "TWITCHER", ac: "#be4bdb", acglow: "rgba(190,75,219,.35)",
    desc: "Wiry and wrong-jointed, vibrating even when it stands still. Blur-steps out of the shot leaving afterimages, then closes in skittering dashes.",
    types: ["dodge: blur-step + ghosts", "advance: skitter-dash"],
    scale: 2.6, body: twitcherBody, dodge: "blur", adv: "dash", jit: 1.8, gait: 11,
  },
  {
    id: "B", name: "SPRINTER", ac: "#e8590c", acglow: "rgba(232,89,12,.35)",
    desc: "Set in a runner's crouch, knuckles down, waiting for a gun only it can hear. Explodes sideways off the line, then eats the ground in flat-out bursts.",
    types: ["dodge: burst sidestep", "advance: flat-out dashes"],
    scale: 2.9, body: sprinterBody, dodge: "blur", adv: "dash", jit: 1.2, gait: 13,
  },
  {
    id: "C", name: "PIT STALKER", ac: "#37b24d", acglow: "rgba(55,178,77,.35)",
    desc: "Spine bent flat, knuckles for forefeet. Drops flush to the dirt and the arrow sails over, then lopes on all fours in quick surges.",
    types: ["dodge: drops flat", "advance: all-fours surges"],
    scale: 2.9, body: stalkerBody, dodge: "flatten", adv: "dash", jit: 1.0, gait: 9,
  },
  {
    id: "D", name: "LEAPER", ac: "#fab005", acglow: "rgba(250,176,5,.35)",
    desc: "All haunch and unhinged jaw. Springs clean OVER the arrow, lands coiled, and comes on in long bounding arcs that swallow the distance.",
    types: ["dodge: springs over the shot", "advance: bounding arcs"],
    scale: 2.9, body: leaperBody, dodge: "spring", adv: "bound", jit: 0.9, gait: 8,
  },
];

// ---- encounter timeline (seconds, looped) ----
const FIRE1 = 1.5, ADV0 = 3.1, ADV1 = 5.5, FIRE2 = 5.9, PERIOD = 9.2;
const ease = (u) => u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u);

function archer(c, x, gy, drawT) {
  px(c, x - 4, gy - 12, 4, 12, "#3f6b2a"); px(c, x + 1, gy - 12, 4, 12, "#3f6b2a");
  px(c, x - 6, gy - 30, 12, 20, "#6b8e23"); px(c, x - 6, gy - 30, 3, 20, "#7fa32e");
  px(c, x - 6, gy - 16, 12, 3, STRAP);
  px(c, x - 5, gy - 41, 11, 11, "#e0a070"); px(c, x - 6, gy - 43, 12, 4, "#3a2c18");
  px(c, x + 2, gy - 37, 2, 2, "#1c1208");
  c.strokeStyle = "#9c6b3f"; c.lineWidth = 2.5;
  c.beginPath(); c.arc(x + 11, gy - 24, 11, -1.1, 1.1); c.stroke();
  c.strokeStyle = "#e9dcc0"; c.lineWidth = 1.4; c.beginPath();
  if (drawT > 0) { c.moveTo(x + 11, gy - 34); c.lineTo(x + 3, gy - 26); c.lineTo(x + 11, gy - 14); }
  else { c.moveTo(x + 11, gy - 34); c.lineTo(x + 11, gy - 14); }
  c.stroke();
  if (drawT > 0) { px(c, x + 3, gy - 26, 14, 2, "#e9dcc0"); }
}
function arrowSprite(c, x, y, ang = 0) {
  c.save(); c.translate(x, y); c.rotate(ang);
  px(c, -9, -1, 16, 2, "#e9dcc0"); px(c, 7, -2, 4, 4, "#9aa3ad"); px(c, -11, -2, 3, 4, "#c9b89a");
  c.restore();
}

function render(card, nowS) {
  const v = card.v, c = card.ctx, W = card.cw, H = card.ch, gy = H - 26;
  const t = (nowS + card.off) % PERIOD;
  c.clearRect(0, 0, W, H);
  // night sky + stars + moon
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0a0f1d"); g.addColorStop(1, "#131b2b");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 24; i++) px(c, (i * 97.3) % W, (i * 53.7) % (gy - 40), 1.5, 1.5, i % 4 ? "#39465e" : "#5a6a88");
  c.globalAlpha = 0.85; c.beginPath(); c.arc(W * 0.86, 30, 11, 0, Math.PI * 2); c.fillStyle = "#c9d4e4"; c.fill(); c.globalAlpha = 1;
  // ground + palisade sticks
  px(c, 0, gy, W, H - gy, "#141d0e"); px(c, 0, gy, W, 3, "#1c2a16");
  for (let i = 0; i < 4; i++) px(c, W - 20 - i * 9, gy - 34 + (i % 2) * 5, 6, 34, i % 2 ? "#33271a" : "#3f3220");
  // regular zombie, dim, for scale
  c.save(); c.globalAlpha = 0.3; c.translate(W * 0.72, gy - 17 * 2.4); c.scale(2.4, 2.4); zombie(c, 0, 0, 0); c.restore();
  c.fillStyle = "#3d4a5e"; c.font = "9px 'IBM Plex Mono',monospace"; c.textAlign = "center";
  c.fillText("regular", W * 0.72, gy + 14);

  // ---- state from the timeline ----
  const hx = W * 0.11, mx0 = W * 0.56, mx1 = W * 0.245;
  const arrowV = W * 1.5;
  const dodgeAt = FIRE1 + (mx0 - 34 - (hx + 14)) / arrowV;
  const hitAt = FIRE2 + (mx1 - 12 - (hx + 14)) / arrowV;
  let mx = mx0, sw = 0, reach = 0, flat = 0, coil = 0, air = 0;
  let dodgeT = 0, dashing = 0, hop = 0, fallP = 0, alpha = 1, label, labCol = "#8a97a8";

  if (t < FIRE1) { label = "it watches, coiled. distance = 40"; alpha = Math.min(1, t / 0.3); coil = 1; }
  if (t >= FIRE1 && t < ADV0) {
    coil = 1;
    const d = t - dodgeAt; // snap: full displacement in 80ms, settle over 0.4s
    dodgeT = d > 0 && d < 0.5 ? ease(Math.min(1, d / 0.08)) * ease(1 - d / 0.5) : 0;
    label = v.dodge === "spring" ? "bow.fire() at range → it JUMPS the arrow" : "bow.fire() at range → DODGED";
    labCol = v.ac;
  }
  if (t >= ADV0 && t < FIRE2) {
    coil = Math.max(0, 1 - (t - ADV0) * 4);
    const q = Math.min(1, (t - ADV0) / (ADV1 - ADV0));
    // burst movement: N explosive dashes with coiled pauses between
    const N = 3, seg = 1 / N, k = Math.min(N - 1, Math.floor(q / seg)), qq = (q - k * seg) / seg;
    const move = ease(Math.min(1, qq / 0.32));
    mx = mx0 + (mx1 - mx0) * ((k + move) / N);
    dashing = qq < 0.32 ? 1 : 0;
    if (v.adv === "bound") { hop = Math.sin(Math.min(1, qq / 0.32) * Math.PI) * 24; air = dashing; }
    sw = dashing ? Math.sin(t * v.gait * 2.2) : Math.sin(t * v.gait) * 0.2;
    reach = dashing ? 1 : 0.35;
    const dist = Math.max(7, Math.round(40 * (mx - hx) / (mx0 - hx)));
    label = `hold... hold... distance = ${dist}`;
  }
  if (t >= FIRE2) { mx = mx1; reach = 0.8; }
  if (t >= hitAt) {
    fallP = Math.min(1, (t - hitAt) / 1.0);
    label = fallP < 1 ? "distance < 10 → bow.fire()  ✓ HIT" : "DOWN.";
    labCol = fallP < 1 ? "#62d27a" : "#8a97a8";
    if (t > hitAt + 1.6) alpha = Math.max(0, 1 - (t - hitAt - 1.6) / 0.6);
  }

  // idle jitter — pent-up, vibrating
  let jx = 0, jy = 0;
  if (fallP === 0) {
    const amp = t < ADV0 ? v.jit : v.jit * 0.4;
    jx = (Math.sin(t * 29) + Math.sin(t * 41 + 2)) * 0.55 * amp;
    jy = Math.abs(Math.sin(t * 33)) * 0.4 * amp;
  }
  // dodge displacement per style
  let dx = 0, dy = 0;
  if (v.dodge === "blur") { dx = dodgeT * 30; }
  if (v.dodge === "flatten") { flat = dodgeT; }
  if (v.dodge === "spring") { dy = -dodgeT * 34; air = Math.max(air, dodgeT); }
  dy -= hop;

  // ---- the mutant ----
  const pose = { sw, reach, flat, coil, air };
  const drawMutant = (ox, oa) => {
    c.save(); c.globalAlpha = alpha * oa; c.translate(mx + jx + dx + ox, gy + jy + dy);
    if (fallP > 0) { c.rotate(1.35 * ease(fallP)); c.translate(0, -Math.sin(ease(fallP) * Math.PI) * 4); }
    c.scale(v.scale, v.scale * (1 - 0.72 * flat));
    v.body(c, pose); c.restore(); c.globalAlpha = 1;
  };
  const blurred = (v.dodge === "blur" && dodgeT > 0.05) || dashing;
  if (blurred) { drawMutant(22, 0.14); drawMutant(11, 0.26); } // afterimages trail behind the burst
  drawMutant(0, 1);
  if (dashing || dodgeT > 0.3) { // speed lines + kicked dust
    for (let i = 0; i < 4; i++) px(c, mx + 20 + i * 11, gy - 14 - (i % 3) * 13 + dy * 0.5, 13, 2, "rgba(190,200,215,0.12)");
    for (let i = 0; i < 5; i++) px(c, mx + 12 + i * 7, gy - 2 - (i % 3) * 3, 3, 3, "rgba(190,200,215,0.22)");
  }

  // ---- arrows ----
  const drawT = (f0) => (t > f0 - 0.35 && t < f0 + 0.1) ? 1 : 0;
  archer(c, hx, gy, drawT(FIRE1) + drawT(FIRE2));
  if (t >= FIRE1 && t < ADV0) { // the ranged arrow: dodged, flies on, sticks in the palisade
    const ax = hx + 14 + (t - FIRE1) * arrowV;
    if (ax < W - 26) arrowSprite(c, ax, gy - 24);
    else { c.save(); c.translate(W - 24, gy - 26); c.rotate(0.3); arrowSprite(c, 0, 0); c.restore(); }
  }
  if (t >= FIRE2 && t < hitAt) arrowSprite(c, hx + 14 + (t - FIRE2) * arrowV, gy - 24);
  if (t >= hitAt && t < hitAt + 0.45) { // impact debris
    const u = (t - hitAt) / 0.45;
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, r = u * 16;
      px(c, mx1 + Math.cos(a) * r, gy - 26 + Math.sin(a) * r * 0.7 - u * 6, 3, 3, i % 2 ? WOUND : SKIN);
    }
  }

  // ---- caption ----
  c.fillStyle = labCol; c.font = "11px 'IBM Plex Mono',monospace"; c.textAlign = "left";
  c.fillText(label || "", 14, H - 8);
}

// ---- build cards + run ----
const grid = document.getElementById("grid");
const cards = VARIANTS.map((v, i) => {
  const el = document.createElement("div");
  el.className = "card"; el.style.setProperty("--ac", v.ac); el.style.setProperty("--acglow", v.acglow);
  el.innerHTML = `<span class="id">SPECIMEN ${v.id}</span><canvas></canvas>
    <div class="meta"><h2><b>${v.id}</b> · ${v.name}</h2><p>${v.desc}</p>
    <div class="types">${v.types.map((s) => `<span>${s}</span>`).join("")}</div></div>`;
  grid.appendChild(el);
  return { v, el, canvas: el.querySelector("canvas"), off: i * 2.3 };
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
(function loop(now) { for (const card of cards) render(card, now / 1000); requestAnimationFrame(loop); })(0);
