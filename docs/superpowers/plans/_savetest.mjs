// Logic test for core/save.js (run: node docs/superpowers/plans/_savetest.mjs)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
// no localStorage in Node → Save falls back to its in-memory store
// eval is safe here: it loads our own local core/save.js (a plain browser script,
// not an ES module) into this test's scope; no external or user input is executed.
eval(readFileSync(join(here, "../../../core/save.js"), "utf8"));
const Save = globalThis.Save;
let pass = 0, fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.error(`FAIL ${m}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); } };

// fresh state
const s = Save.load();
eq(s.xp, 0, "fresh xp"); eq(s.chapters[1].unlocked, true, "ch1 unlocked"); eq(s.chapters[2].unlocked, false, "ch2 locked");

// levels
eq(Save.level(0), 1, "lv1 at 0"); eq(Save.level(49), 1, "lv1 at 49"); eq(Save.level(50), 2, "lv2 at 50");
eq(Save.level(1660), 10, "lv10 at 1660"); eq(Save.level(2060), 11, "lv11 at 2060");
eq(Save.levelProgress(25), 0.5, "halfway to lv2");

// addXP + leveled flag
let r = Save.addXP(30); eq(r.level, 1, "still lv1"); eq(r.leveled, false, "no levelup");
r = Save.addXP(30); eq(r.xp, 60, "xp 60"); eq(r.level, 2, "lv2"); eq(r.leveled, true, "levelup fired");

// checkpoint + chapter completion unlocks next
Save.checkpoint(1, "clearing"); eq(Save.load().chapters[1].scene, "clearing", "checkpoint");
Save.completeChapter(1); eq(Save.load().chapters[1].done, true, "ch1 done"); eq(Save.load().chapters[2].unlocked, true, "ch2 unlocked");

// onChange fires
let fired = 0; Save.onChange(() => fired++); Save.addXP(5); eq(fired, 1, "onChange");

// concept familiarity
eq(Save.conceptUses("print"), 0, "fresh concept");
Save.bumpConcept("print"); Save.bumpConcept("print"); eq(Save.conceptUses("print"), 2, "bumped twice");
eq(Save.conceptUses("walk"), 0, "other concept untouched");

// trial completion: once-only XP, done flag
eq(Save.isTrialDone("stock-quiver"), false, "trial not done");
const beforeXP = Save.load().xp;
eq(Save.completeTrial("stock-quiver", 25), true, "first completion counts");
eq(Save.isTrialDone("stock-quiver"), true, "trial done");
eq(Save.load().xp, beforeXP + 25, "xp awarded");
eq(Save.completeTrial("stock-quiver", 25), false, "repeat does not count");
eq(Save.load().xp, beforeXP + 25, "no double xp");

// reset
Save.reset(); eq(Save.load().xp, 0, "reset xp"); eq(Save.load().chapters[2].unlocked, false, "reset locks ch2");
eq(Save.conceptUses("print"), 0, "reset clears concepts");
eq(Save.isTrialDone("stock-quiver"), false, "reset clears trials");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
