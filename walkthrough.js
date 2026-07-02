// walkthrough.js — guided, line-by-line code explainers. A popup shows a piece
// of code; each step points an arrow at the line(s) being explained and walks
// the player through reading it. Shown once per concept (tracked in
// localStorage) and skipped entirely in intermediate mode (future toggle:
// Save mode === "intermediate").

export function walkthroughsEnabled() {
  try { const Sv = window.Save; return !(Sv && Sv.load().mode === "intermediate"); } catch (e) { return true; }
}
const SEEN_KEY = "sts-walkthroughs";
export function walkthroughSeen(id) {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}")[id] === true; } catch (e) { return false; }
}
export function markWalkthroughSeen(id) {
  try { const m = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); m[id] = true; localStorage.setItem(SEEN_KEY, JSON.stringify(m)); } catch (e) {}
}

// { id, title, code, steps: [{ lines: [from, to?] (1-based), text }] } → Promise (resolves when closed)
export function showWalkthrough({ id, title, code, steps }) {
  return new Promise((resolve) => {
    const back = document.createElement("div"); back.className = "wt-back";
    const lines = code.split("\n");
    back.innerHTML =
      `<div class="wt">
        <div class="wt-head"><span>${esc(title)}</span><button class="wt-x">✕</button></div>
        <div class="wt-code">${lines.map((l, i) => `<div class="wt-line" data-i="${i}"><span class="wt-arrow">➤</span><span class="wt-num">${i + 1}</span><code>${esc(l) || " "}</code></div>`).join("")}</div>
        <div class="wt-explain"></div>
        <div class="wt-foot">
          <div class="wt-dots">${steps.map((_, i) => `<span data-d="${i}"></span>`).join("")}</div>
          <button class="wt-prev">◂ back</button><button class="wt-next">next ▸</button>
        </div>
      </div>`;
    document.body.appendChild(back);
    let idx = 0;
    const show = () => {
      const st = steps[idx], from = st.lines[0] - 1, to = (st.lines[1] || st.lines[0]) - 1;
      back.querySelectorAll(".wt-line").forEach((el) => { const i = +el.dataset.i; el.classList.toggle("hl", i >= from && i <= to); });
      back.querySelector(".wt-explain").textContent = st.text;
      back.querySelectorAll(".wt-dots span").forEach((d) => d.classList.toggle("on", +d.dataset.d === idx));
      back.querySelector(".wt-prev").style.visibility = idx === 0 ? "hidden" : "visible";
      back.querySelector(".wt-next").textContent = idx === steps.length - 1 ? "got it ✓" : "next ▸";
      const hl = back.querySelector(".wt-line.hl"); if (hl) hl.scrollIntoView({ block: "nearest" });
    };
    const done = () => { back.remove(); if (id) markWalkthroughSeen(id); resolve(); };
    back.querySelector(".wt-next").onclick = () => { if (idx >= steps.length - 1) done(); else { idx++; show(); } };
    back.querySelector(".wt-prev").onclick = () => { if (idx > 0) { idx--; show(); } };
    back.querySelector(".wt-x").onclick = done;
    show();
  });
}
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
