// trials/grade.js — pure trial-case checking, shared by the browser Trial screen
// (Pyodide results) and the Node verify harness (system python results).
// No DOM, no engine imports: safe everywhere.

// expect = { vars?: {name: number|string|boolean}, stdout?: string }
// result = { vars: object, stdout: string, err: string }
export function checkCase(expect, result) {
  if (result.err) return { pass: false, detail: result.err };
  for (const [k, want] of Object.entries(expect.vars || {})) {
    if (!(k in (result.vars || {}))) return { pass: false, detail: `variable ${k} was never set` };
    const got = result.vars[k];
    if (typeof want === "number") {
      if (typeof got !== "number" || Math.abs(got - want) > 1e-6) return { pass: false, detail: `${k}: expected ${want}, got ${fmt(got)}` };
    } else if (got !== want) return { pass: false, detail: `${k}: expected ${fmt(want)}, got ${fmt(got)}` };
  }
  if (expect.stdout != null) {
    const got = String(result.stdout || "").trim(), want = String(expect.stdout).trim();
    if (got !== want) return { pass: false, detail: `printed ${fmt(got) || "nothing"}, expected ${fmt(want)}` };
  }
  return { pass: true, detail: "" };
}

// { a: 3, w: "axe" } → 'a = 3\nw = "axe"' (numbers and strings only; strings JSON-quoted, valid Python)
export function seedToPython(seed) {
  return Object.entries(seed || {}).map(([k, v]) => `${k} = ${typeof v === "string" ? JSON.stringify(v) : v}`).join("\n");
}

const fmt = (v) => (typeof v === "string" ? JSON.stringify(v) : String(v));
