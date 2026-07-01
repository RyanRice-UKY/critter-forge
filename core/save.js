// core/save.js — Survive the Stack save + XP system. Plain script, exposes window.Save.
// One localStorage key holds the whole save. Dependency-free so it can be unit-tested in Node.
(function (root) {
  "use strict";
  const KEY = "sts-save-v1";
  // XP needed to REACH each level (index = level - 1); beyond the table it's +400/level.
  const THRESH = [0, 50, 120, 220, 360, 540, 760, 1020, 1320, 1660];

  const store = (() => {
    try { const t = "__sts_t"; root.localStorage.setItem(t, "1"); root.localStorage.removeItem(t); return root.localStorage; }
    catch (e) { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; }
  })();

  function fresh() {
    const chapters = {};
    for (let i = 1; i <= 6; i++) chapters[i] = { unlocked: i === 1, scene: null, done: false };
    return { v: 1, name: null, xp: 0, gold: 0, chapters, badges: [], concepts: [], updated: Date.now() };
  }

  let cache = null;
  const listeners = [];

  function load() {
    if (cache) return cache;
    try { const raw = store.getItem(KEY); cache = raw ? Object.assign(fresh(), JSON.parse(raw)) : fresh(); }
    catch (e) { cache = fresh(); }
    return cache;
  }
  function persist() { cache.updated = Date.now(); try { store.setItem(KEY, JSON.stringify(cache)); } catch (e) {} for (const fn of listeners) fn(cache); }
  function write(patch) { Object.assign(load(), patch); persist(); return cache; }

  function level(xp) {
    let lv = 1;
    for (let i = 1; i < THRESH.length; i++) if (xp >= THRESH[i]) lv = i + 1;
    if (xp >= THRESH[THRESH.length - 1]) lv = THRESH.length + Math.floor((xp - THRESH[THRESH.length - 1]) / 400);
    return lv;
  }
  // progress within the current level, 0..1 (for drawing the XP bar)
  function levelProgress(xp) {
    const lv = level(xp);
    const lo = lv <= THRESH.length ? THRESH[lv - 1] : THRESH[THRESH.length - 1] + (lv - THRESH.length) * 400;
    const hi = lv < THRESH.length ? THRESH[lv] : lo + 400;
    return Math.max(0, Math.min(1, (xp - lo) / (hi - lo)));
  }
  function addXP(n) {
    const s = load(), before = level(s.xp);
    s.xp += Math.max(0, n | 0);
    const after = level(s.xp); persist();
    return { xp: s.xp, level: after, leveled: after > before };
  }

  function checkpoint(ch, sceneName) { const s = load(); if (s.chapters[ch]) { s.chapters[ch].scene = sceneName; persist(); } }
  function completeChapter(ch) {
    const s = load();
    if (s.chapters[ch]) s.chapters[ch].done = true;
    if (s.chapters[ch + 1]) s.chapters[ch + 1].unlocked = true;
    persist();
  }
  function hasSave() { try { return store.getItem(KEY) != null; } catch (e) { return false; } }
  function reset() { cache = fresh(); persist(); return cache; }
  function onChange(fn) { listeners.push(fn); }

  root.Save = { load, write, addXP, level, levelProgress, checkpoint, completeChapter, hasSave, reset, onChange, _fresh: fresh };
})(typeof window !== "undefined" ? window : globalThis);
