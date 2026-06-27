// journal.js — Command Journal book UI (browser only).
import { JOURNAL_SECTIONS, allEntries, findUnlocks, createJournalStore } from "./journal-data.js";

const el = {};
let store, pyodide = null, selectedId = null, toastTimer = null;

function cacheDom() {
  for (const id of ["journalIcon", "journalBook", "jbookList", "jbookDetail", "journalToast"])
    el[id] = document.getElementById(id);
}

function renderList() {
  let html = "";
  for (const sec of JOURNAL_SECTIONS) {
    html += `<div class="sec">${sec.name}</div>`;
    for (const e of sec.entries) {
      const unlocked = store.has(e.id);
      if (!unlocked) { html += `<div class="cmd lock">🔒 ${e.label}</div>`; continue; }
      const on = e.id === selectedId ? " on" : "";
      html += `<div class="cmd${on}" data-id="${e.id}">${e.label}</div>`;
    }
  }
  el.jbookList.innerHTML = html;
  el.jbookList.querySelectorAll(".cmd[data-id]").forEach((node) =>
    node.addEventListener("click", () => { selectedId = node.dataset.id; renderList(); renderDetail(); }));
}

function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

function renderDetail() {
  const e = allEntries().find((x) => x.id === selectedId);
  if (!e) { el.jbookDetail.innerHTML = `<p class="empty">Use a command in the game, then click it here to learn how it works.</p>`; return; }
  const parts = e.parts.map(([t, d]) => `• <b>${esc(t)}</b> — ${esc(d)}`).join("<br>");
  const usage = e.usage.map(esc).join("\n");
  el.jbookDetail.innerHTML =
    `<div class="ttl">${esc(e.label)}</div>` +
    `<div>${esc(e.summary)}</div>` +
    `<div class="lbl">Syntax</div><div class="code">${esc(e.syntax)}</div>` +
    `<div class="lbl">The parts</div><div>${parts}</div>` +
    `<div class="lbl">Ways to use it</div><div class="code">${usage}</div>` +
    `<div class="lbl">Try it yourself</div>` +
    `<textarea class="try" rows="3" spellcheck="false">${esc(e.tryCode)}</textarea>` +
    `<button class="runbtn" id="jTryRun">▸ Run</button>` +
    `<div class="out" id="jTryOut"></div>`;
  // Sandbox wiring is added in Task 4.
  if (window.Journal && window.Journal._wireTryRun) window.Journal._wireTryRun();
}

function toast(label) {
  el.journalToast.textContent = `📖 New entry: ${label}`;
  el.journalToast.classList.add("show");
  el.journalIcon.classList.add("has-new");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.journalToast.classList.remove("show"), 2000);
}

window.Journal = {
  init({ pyodide: py } = {}) {
    cacheDom();
    pyodide = py || null;
    store = createJournalStore(window.localStorage);
    store.load();
    selectedId = store.unlocked()[0] || null;
    renderList(); renderDetail();
    el.journalIcon.addEventListener("click", () => this.open());
    el.journalBook.addEventListener("click", (ev) => { if (ev.target === el.journalBook) this.close(); });
  },
  setPyodide(py) { pyodide = py; },
  _getPyodide() { return pyodide; },
  has: (id) => store.has(id),
  open() { el.journalIcon.classList.remove("has-new"); el.journalBook.hidden = false; renderList(); renderDetail(); },
  close() { el.journalBook.hidden = true; },
  noticeLine(line) {
    if (!store) return; // init() may not have run yet (play() logs before Pyodide loads)
    for (const id of findUnlocks(line)) {
      if (store.unlock(id)) {
        const e = allEntries().find((x) => x.id === id);
        toast(e.label);
        if (!selectedId) selectedId = id;
        if (!el.journalBook.hidden) { renderList(); renderDetail(); }
      }
    }
  },
  async runSandbox(src) {
    const py = pyodide;
    if (!py) return { out: "", err: "Python is still loading — try again in a moment." };
    // Truly isolated: a fresh globals dict (`ns`) so nothing leaks to/from the lesson.
    // Harmless stubs make movement commands "work" educationally; sample vars keep
    // example snippets from NameError. A Python try/finally ALWAYS restores stdout,
    // so the lesson's own stdout capture can never be left broken.
    const preamble =
      "import sys, io\n" +
      "_buf = io.StringIO(); _old = sys.stdout; sys.stdout = _buf\n" +
      "class _You:\n" +
      "    def walk(self, place='somewhere'): print(f'You walk to the {place}.')\n" +
      "    def wake_up(self): print('You wake up.')\n" +
      "class _Bow:\n" +
      "    def fire(self, *a, **k): print('You loose an arrow.')\n" +
      "you = _You(); bow = _Bow()\n" +
      "gold = 2.55; hp = 5; sticks = 10; string = 3; arrows = 12; coins = 3\n";
    // JSON.stringify yields a valid Python string literal (\n, \", \\, \uXXXX all match).
    const code =
      preamble +
      "_SRC = " + JSON.stringify(src) + "\n" +
      "try:\n    exec(_SRC, globals())\nfinally:\n    __cf_out = _buf.getvalue()\n    sys.stdout = _old\n";
    let ns;
    try {
      ns = py.toPy({});
      await py.runPythonAsync(code, { globals: ns });
      const out = ns.get("__cf_out");
      return { out: out || "(no output)", err: "" };
    } catch (e) {
      let partial = "";
      try { partial = (ns && ns.get("__cf_out")) || ""; } catch (_) {}
      return { out: partial, err: String(e.message || e).split("\n").slice(-3).join("\n") };
    } finally {
      if (ns) ns.destroy();
    }
  },
  _wireTryRun() {
    const btn = document.getElementById("jTryRun");
    const ta = document.querySelector("#journalBook textarea.try");
    const out = document.getElementById("jTryOut");
    if (!btn || !ta || !out) return;
    btn.onclick = async () => {
      out.className = "out"; out.textContent = "running…";
      const r = await this.runSandbox(ta.value);
      if (r.err) { out.className = "out err"; out.textContent = (r.out ? r.out + "\n" : "") + r.err; }
      else { out.className = "out"; out.textContent = r.out; }
    };
  },
};
