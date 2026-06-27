// journal-verify.mjs — catalog integrity + matcher disambiguation for the
// Command Journal. Run: node journal-verify.mjs
import { JOURNAL_SECTIONS, allEntries, findUnlocks } from "./journal-data.js";

let fails = 0;
const ok = (cond, msg) => { if (!cond) { console.log("FAIL:", msg); fails++; } };
const eqSet = (got, want, msg) =>
  ok(got.length === want.length && want.every((w) => got.includes(w)),
     `${msg} — got [${got}] want [${want}]`);

// --- catalog integrity ---
const order = JOURNAL_SECTIONS.map((s) => s.name);
eqSet(order, ["Output", "Movement", "Math & variables", "Control flow"], "section names present");
ok(JSON.stringify(order) === JSON.stringify(["Output","Movement","Math & variables","Control flow"]),
   "section order is fixed");

const entries = allEntries();
const ids = entries.map((e) => e.id);
ok(new Set(ids).size === ids.length, "entry ids are unique");
for (const e of entries) {
  ok(e.id && e.label && e.section, `entry ${e.id} has id/label/section`);
  ok(e.match instanceof RegExp, `entry ${e.id} has RegExp match`);
  ok(typeof e.summary === "string" && e.summary.length > 0, `entry ${e.id} has summary`);
  ok(typeof e.syntax === "string" && e.syntax.length > 0, `entry ${e.id} has syntax`);
  ok(Array.isArray(e.parts) && e.parts.length > 0, `entry ${e.id} has parts`);
  ok(Array.isArray(e.usage) && e.usage.length > 0, `entry ${e.id} has usage`);
  ok(typeof e.tryCode === "string" && e.tryCode.length > 0, `entry ${e.id} has tryCode`);
}

// --- matcher disambiguation (the bug-prone part) ---
eqSet(findUnlocks('print("Hello")'), ["print"], "print string");
eqSet(findUnlocks("print(gold)"), ["print"], "print var (no =)");
eqSet(findUnlocks('you.walk("tree")'), ["you.walk"], "walk");
eqSet(findUnlocks("bow.fire()"), ["bow.fire"], "fire");
eqSet(findUnlocks("you.wake_up()"), ["you.wake_up"], "wake_up");
eqSet(findUnlocks("gold = 2.55"), ["variables"], "assignment only");
eqSet(findUnlocks("sticks = sticks + 10"), ["variables", "plus"], "add");
eqSet(findUnlocks("string = string - 3"), ["variables", "minus"], "sub");
eqSet(findUnlocks("reward = arrows * coins"), ["variables", "times"], "mul");
eqSet(findUnlocks("chips = change / 2"), ["variables", "divide"], "div (single slash)");
eqSet(findUnlocks("pieces = reward // price"), ["variables", "floordiv"], "floor div (no plain divide)");
eqSet(findUnlocks("change = reward % price"), ["variables", "modulo"], "modulo");
eqSet(findUnlocks("gold += 1.75"), ["plusassign"], "plus-assign only (not + or =)");
eqSet(findUnlocks("for i in range(4):"), ["for"], "for loop");
eqSet(findUnlocks('if secret == "x":'), ["ifelse", "equals"], "if + equals");
eqSet(findUnlocks("secret_string == watchword"), ["equals"], "equals only");
eqSet(findUnlocks("secret = input()"), ["variables", "input"], "input + assignment");

console.log(fails === 0 ? "\nALL JOURNAL CHECKS OK" : `\n${fails} FAILURES`);
process.exit(fails ? 1 : 0);
