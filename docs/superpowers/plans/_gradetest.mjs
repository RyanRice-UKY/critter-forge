// Logic tests for trials/grade.js (run: node docs/superpowers/plans/_gradetest.mjs)
import { checkCase, seedToPython } from "../../../trials/grade.js";
let pass = 0, fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.error(`FAIL ${m}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`); } };

// exact var pass
eq(checkCase({ vars: { total: 21 } }, { vars: { total: 21 }, stdout: "", err: "" }).pass, true, "var pass");
// float tolerance
eq(checkCase({ vars: { gold: 2.05 } }, { vars: { gold: 2.0500000001 }, stdout: "", err: "" }).pass, true, "float tol");
// wrong float outside tolerance
eq(checkCase({ vars: { gold: 2.05 } }, { vars: { gold: 2.06 }, stdout: "", err: "" }).pass, false, "float wrong");
// missing var
eq(checkCase({ vars: { total: 21 } }, { vars: {}, stdout: "", err: "" }).pass, false, "missing var");
// wrong value reports expected vs got
const r = checkCase({ vars: { total: 21 } }, { vars: { total: 7 }, stdout: "", err: "" });
eq(r.pass, false, "wrong var"); eq(r.detail.includes("21") && r.detail.includes("7"), true, "detail mentions both");
// string var strict
eq(checkCase({ vars: { w: "axe" } }, { vars: { w: "axe" }, stdout: "", err: "" }).pass, true, "str pass");
eq(checkCase({ vars: { w: "axe" } }, { vars: { w: "bow" }, stdout: "", err: "" }).pass, false, "str wrong");
// stdout trimmed equality
eq(checkCase({ stdout: "pass" }, { vars: {}, stdout: "pass\n", err: "" }).pass, true, "stdout trim");
eq(checkCase({ stdout: "pass" }, { vars: {}, stdout: "halt\n", err: "" }).pass, false, "stdout wrong");
// vars AND stdout both required
eq(checkCase({ vars: { x: 1 }, stdout: "1" }, { vars: { x: 1 }, stdout: "1\n", err: "" }).pass, true, "both pass");
eq(checkCase({ vars: { x: 1 }, stdout: "1" }, { vars: { x: 1 }, stdout: "2\n", err: "" }).pass, false, "both stdout fail");
// python error always fails, detail carries the error
const e = checkCase({ vars: { x: 1 } }, { vars: {}, stdout: "", err: "NameError: name 'x' is not defined" });
eq(e.pass, false, "err fails"); eq(e.detail.includes("NameError"), true, "err detail");
// seedToPython: numbers bare, strings quoted
eq(seedToPython({ a: 3, w: "axe" }), 'a = 3\nw = "axe"', "seed basic");
eq(seedToPython({ g: 2.55 }), "g = 2.55", "seed float");

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
