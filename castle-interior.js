// castle-interior.js — four interior styles for the keep, each with the four
// vendors (Craftsman, Worker for Hire, Blacksmith, Armorsmith). Pick one.

const TAU = Math.PI * 2;
const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
const circle = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// a little pixel person behind a counter
function person(c, x, y, cloth, skin = "#d8a878", hair = "#3a2c18") {
  px(c, x - 7, y - 22, 14, 20, cloth); px(c, x - 6, y - 33, 12, 12, skin); px(c, x - 7, y - 35, 14, 4, hair);
}
const LABEL = { craft: "CRAFTSMAN", hire: "FOR HIRE", smith: "BLACKSMITH", armor: "ARMORSMITH" };

function vendor(c, x, fy, type, now, woodTop) {
  // person stands behind the stall
  const cloth = { craft: "#8a6d3b", hire: "#3d5a3d", smith: "#3a3a42", armor: "#5b626b" }[type];
  person(c, x, fy - 12, cloth);
  // counter
  px(c, x - 30, fy - 12, 60, 16, woodTop || "#6b4f2a"); px(c, x - 30, fy - 14, 60, 4, "#8a6d3b");
  // type-specific props on / beside the counter
  if (type === "craft") { px(c, x - 22, fy - 22, 6, 8, "#9c6b3f"); px(c, x - 14, fy - 20, 6, 6, "#9c6b3f"); c.strokeStyle = "#adb5bd"; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 6, fy - 22); c.lineTo(x + 20, fy - 14); c.stroke(); }
  else if (type === "hire") { px(c, x + 16, fy - 40, 3, 28, "#5a4424"); px(c, x + 10, fy - 44, 18, 12, "#caa24a"); c.fillStyle = "#3a2c10"; c.font = "8px 'IBM Plex Mono'"; c.textAlign = "center"; c.fillText("HIRE", x + 19, fy - 35); px(c, x - 26, fy - 26, 8, 10, "#6e4f2c"); }
  else if (type === "smith") { px(c, x - 4, fy - 6, 18, 8, "#2b2b30"); px(c, x - 2, fy - 12, 8, 6, "#3a3a40"); const fl = 0.6 + 0.4 * Math.sin(now * 12); c.shadowColor = "#ff6b3d"; c.shadowBlur = 14 * fl; circle(c, x - 22, fy - 4, 7 * fl, "#ff6b3d"); c.shadowBlur = 0; c.strokeStyle = "#777"; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 8, fy - 20); c.lineTo(x + 14, fy - 10); c.stroke(); px(c, x + 13, fy - 12, 6, 4, "#555"); }
  else if (type === "armor") { px(c, x + 14, fy - 40, 4, 28, "#4a4a4a"); px(c, x + 8, fy - 38, 16, 14, "#9aa3ad"); px(c, x + 11, fy - 36, 10, 2, "#c3ccd6"); px(c, x + 11, fy - 48, 10, 8, "#9aa3ad"); /* breastplate + helmet */ px(c, x - 24, fy - 24, 10, 10, "#7a828c"); }
  // label
  c.fillStyle = "#aebccd"; c.font = "10px 'IBM Plex Mono', monospace"; c.textAlign = "center"; c.fillText(LABEL[type], x, fy + 18);
}

function vendors(c, W, fy, now, woodTop) {
  const types = ["craft", "hire", "smith", "armor"];
  types.forEach((t, i) => vendor(c, W * (0.2 + 0.2 * i), fy, t, now, woodTop));
  // the player, just entered, at the left
  person(c, W * 0.07, fy, "#6b8e23", "#e0a070");
}

const STYLES = [
  {
    id: "hall", name: "Stone Great Hall", ac: "#9aa7b8",
    desc: "Cold grey flagstones, hanging house banners and flickering wall torches. The classic medieval keep — solemn and grand.",
    draw(c, W, H, now) {
      const fy = H * 0.78;
      c.fillStyle = "#20242c"; c.fillRect(0, 0, W, fy); // stone wall
      for (let y = 0; y < fy; y += 26) for (let x = 0; x < W; x += 34) px(c, x + 1, y + 1, 32, 24, ((x / 34 + y / 26) | 0) % 2 ? "#262b33" : "#22272e");
      // banners
      for (const bx of [W * 0.32, W * 0.68]) { c.fillStyle = bx < W / 2 ? "#7a1f1f" : "#1f3a7a"; c.beginPath(); c.moveTo(bx - 16, 4); c.lineTo(bx + 16, 4); c.lineTo(bx + 16, 60); c.lineTo(bx, 72); c.lineTo(bx - 16, 60); c.closePath(); c.fill(); px(c, bx - 3, 22, 6, 6, "#ffd43b"); }
      // wall torches
      for (const tx of [W * 0.12, W * 0.5, W * 0.88]) { px(c, tx - 1, 40, 3, 14, "#5a4424"); const fl = 0.6 + 0.4 * Math.sin(now * 13 + tx); c.shadowColor = "#ffb14d"; c.shadowBlur = 16 * fl; circle(c, tx, 38, 5 * fl + 2, "#ffb14d"); circle(c, tx, 37, 3 * fl, "#ffe066"); c.shadowBlur = 0; }
      // floor
      for (let x = 0; x < W; x += 30) px(c, x, fy, 30, H - fy, (x / 30 | 0) % 2 ? "#3a3f47" : "#33373f");
      vendors(c, W, fy, now, "#5a626b");
    },
  },
  {
    id: "bazaar", name: "Bustling Bazaar", ac: "#ffa94d",
    desc: "Warm timber floors, striped awnings over every stall and swaying lanterns. A lively, friendly market crammed inside the walls.",
    draw(c, W, H, now) {
      const fy = H * 0.78;
      const g = c.createLinearGradient(0, 0, 0, fy); g.addColorStop(0, "#2a2018"); g.addColorStop(1, "#3a2c1c"); c.fillStyle = g; c.fillRect(0, 0, W, fy);
      // hanging lanterns
      for (let i = 0; i < 6; i++) { const lx = W * (0.12 + i * 0.15) + Math.sin(now * 1.5 + i) * 3, ly = 26; px(c, lx - 1, 0, 2, ly - 8, "#2a2018"); c.shadowColor = "#ffb14d"; c.shadowBlur = 12; px(c, lx - 5, ly - 8, 10, 12, "#e8590c"); circle(c, lx, ly - 2, 3, "#ffe066"); c.shadowBlur = 0; }
      // striped awnings over each stall
      ["#e03131", "#1971c2", "#2f9e44", "#9c36b5"].forEach((col, i) => { const ax = W * (0.2 + 0.2 * i); for (let s = -34; s < 34; s += 11) px(c, ax + s, fy - 66, 11, 14, ((s / 11) | 0) % 2 ? col : "#f1f3f5"); px(c, ax - 36, fy - 52, 72, 4, "#5a4424"); });
      // wood floor
      for (let x = 0; x < W; x += 26) px(c, x, fy, 26, H - fy, (x / 26 | 0) % 2 ? "#6e4f2c" : "#7a5a30");
      vendors(c, W, fy, now, "#7a5a30");
    },
  },
  {
    id: "outpost", name: "Survivor Outpost", ac: "#82c91e",
    desc: "The keep, repurposed against the dead — corrugated scrap walls, tarps, sandbags and a barrel fire. Gritty and on-theme.",
    draw(c, W, H, now) {
      const fy = H * 0.78;
      c.fillStyle = "#23262a"; c.fillRect(0, 0, W, fy);
      for (let x = 0; x < W; x += 18) px(c, x, 0, 16, fy, (x / 18 | 0) % 2 ? "#2a2e33" : "#262a2f"); // corrugated metal
      // tarp
      c.fillStyle = "#3a5a3a"; c.beginPath(); c.moveTo(W * 0.3, 6); c.lineTo(W * 0.7, 6); c.lineTo(W * 0.66, 40); c.lineTo(W * 0.34, 40); c.closePath(); c.fill();
      // barrel fire
      const fx = W * 0.5, fl = 0.6 + 0.4 * Math.sin(now * 14); px(c, fx - 9, fy - 26, 18, 24, "#3a3a3a"); c.shadowColor = "#ff6b3d"; c.shadowBlur = 18 * fl; circle(c, fx, fy - 28, 8 * fl, "#ff6b3d"); circle(c, fx, fy - 29, 5 * fl, "#ffd43b"); c.shadowBlur = 0;
      // sandbags
      for (let i = 0; i < 8; i++) px(c, W * 0.1 + i * 20, fy - 8, 18, 8, i % 2 ? "#7a6a44" : "#6b5e3c");
      // concrete floor
      for (let x = 0; x < W; x += 30) px(c, x, fy, 30, H - fy, (x / 30 | 0) % 2 ? "#3a3d40" : "#34373a");
      vendors(c, W, fy, now, "#555");
    },
  },
  {
    id: "royal", name: "Royal Keep", ac: "#ffd43b",
    desc: "Opulence within — a red carpet down the centre, stone columns, gold trim and glowing braziers. Regal and high-stakes.",
    draw(c, W, H, now) {
      const fy = H * 0.78;
      c.fillStyle = "#1b1f2a"; c.fillRect(0, 0, W, fy);
      px(c, 0, 40, W, 5, "#a8832a"); px(c, 0, 44, W, 2, "#ffd43b"); // gold trim
      // columns
      for (let i = 0; i < 5; i++) { const cx = W * (0.1 + i * 0.2); px(c, cx - 9, 0, 18, fy, "#3a3f4a"); px(c, cx - 11, 0, 22, 8, "#4a505c"); px(c, cx - 11, fy - 10, 22, 10, "#4a505c"); }
      // braziers
      for (const bx of [W * 0.3, W * 0.7]) { px(c, bx - 4, fy - 30, 8, 22, "#a8832a"); const fl = 0.6 + 0.4 * Math.sin(now * 12 + bx); c.shadowColor = "#ffb14d"; c.shadowBlur = 18 * fl; circle(c, bx, fy - 32, 7 * fl, "#ffb14d"); circle(c, bx, fy - 33, 4 * fl, "#ffe066"); c.shadowBlur = 0; }
      // floor + red carpet
      for (let x = 0; x < W; x += 30) px(c, x, fy, 30, H - fy, (x / 30 | 0) % 2 ? "#2d3038" : "#272a31");
      px(c, W * 0.4, fy, W * 0.2, H - fy, "#7a1f1f"); px(c, W * 0.4, fy, W * 0.2, 3, "#a8832a");
      vendors(c, W, fy, now, "#5a4a2a");
    },
  },
];

const dpr = window.devicePixelRatio || 1;
const cards = [];
const grid = document.getElementById("grid");
STYLES.forEach((st, i) => {
  const card = document.createElement("div"); card.className = "card"; card.style.setProperty("--ac", st.ac);
  card.innerHTML = `<div class="id">INTERIOR ${String(i + 1).padStart(2, "0")}</div><canvas></canvas><div class="meta"><h2><b>${st.name}</b></h2><p>${st.desc}</p></div>`;
  grid.appendChild(card);
  const cv = card.querySelector("canvas");
  const fit = () => { const b = cv.getBoundingClientRect(); cv.width = b.width * dpr; cv.height = b.height * dpr; cv.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0); cv._w = b.width; cv._h = b.height; };
  fit();
  cards.push({ cv, fit, draw: st.draw });
});
function frame(ms) { const now = ms / 1000; for (const c of cards) c.draw(c.cv.getContext("2d"), c.cv._w, c.cv._h, now); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
window.addEventListener("resize", () => cards.forEach((c) => c.fit()));
