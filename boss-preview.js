import { drawPixelEnemy } from "./enemy-art.js";

const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
const dpr = window.devicePixelRatio || 1;
function resize() { const b = cv.getBoundingClientRect(); cv.width = b.width * dpr; cv.height = b.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = b.width; H = b.height; }
let W, H; resize(); window.addEventListener("resize", resize);

// roster: [type, sizePx, label, hitPhase]
const ROSTER = [
  { type: "sprinter", size: 30, label: "SPRINTER · fast, low HP" },
  { type: "walker", size: 42, label: "WALKER · baseline" },
  { type: "brute", size: 60, label: "BRUTE · high HP" },
  { type: "cyclops", size: 104, label: "CYCLOPS · boss" },
];

function frame(nowMs) {
  const now = nowMs / 1000;
  ctx.clearRect(0, 0, W, H);
  // floor
  ctx.strokeStyle = "rgba(120,160,210,.12)";
  ctx.beginPath(); ctx.moveTo(0, H * 0.82); ctx.lineTo(W, H * 0.82); ctx.stroke();

  const slots = ROSTER.length;
  ROSTER.forEach((r, i) => {
    const x = W * ((i + 0.5) / slots);
    const y = H * 0.5;
    // periodic hit flash so you can see the white-out
    const hit = Math.max(0, Math.sin(now * 1.2 + i * 1.7) - 0.85) * 6;
    // ground shadow
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.ellipse(x, y + r.size * 0.95, r.size * 0.8, r.size * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    drawPixelEnemy(ctx, x, y, r.size, r.type, now, hit, i * 1.3);
    // label
    ctx.fillStyle = "#9aa7b8"; ctx.font = "12px 'IBM Plex Mono', monospace"; ctx.textAlign = "center";
    ctx.fillText(r.label, x, H * 0.9);
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
