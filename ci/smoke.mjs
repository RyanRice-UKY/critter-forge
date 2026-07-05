// ci/smoke.mjs — boots the real game headless and fails on any page error.
// Run locally:  npm i playwright-core && python -m http.server 8931 &  then  node ci/smoke.mjs
// CI runs this against the runner's preinstalled Chrome (channel: 'chrome').
import { chromium } from "playwright-core";

const BASE = process.env.SMOKE_BASE || "http://localhost:8931";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e));
// resource 404s are judged by URL (console text omits it); anything else on the error console fails
page.on("response", (r) => { if (r.status() === 404 && !r.url().includes("favicon")) errors.push("404: " + r.url()); });
page.on("console", (m) => { if (m.type() === "error" && !String(m.text()).includes("Failed to load resource")) errors.push("console: " + m.text()); });

const fail = async (msg) => { console.error("SMOKE FAIL:", msg); if (errors.length) console.error(errors.join("\n")); await browser.close(); process.exit(1); };

// 1) title screen -> NEW GAME -> lesson loads
await page.goto(`${BASE}/survive.html`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => fail("survive.html did not load"));
const newGame = page.locator("text=/new game/i").first();
if (!(await newGame.count())) await fail("NEW GAME button not found on the title screen");
await newGame.click();
await page.waitForURL("**/lesson1.html*", { timeout: 30000 }).catch(() => fail("NEW GAME did not open lesson1.html"));

// 2) the game boots Pyodide (cold CDN cache on CI runners is slow; be patient)
await page.goto(`${BASE}/lesson1.html#1.5`, { waitUntil: "networkidle", timeout: 120000 }).catch(() => fail("lesson1.html#1.5 did not load"));
const ready = await page
  .waitForFunction(() => { const ps = document.querySelector("#pystat"); return ps && ps.textContent.includes("python ready"); }, null, { timeout: 180000 })
  .then(() => true)
  .catch(() => false);
if (!ready) await fail("Pyodide never reached 'python ready'");

// 3) the render loop is alive and error-free
await page.waitForTimeout(2000);
const prompt = await page.evaluate(() => document.querySelector("#prompt")?.textContent || "");
if (prompt.includes("render error")) await fail("render error in the prompt bar: " + prompt);
if (errors.length) await fail("page errors were thrown");

console.log("SMOKE OK: title screen, NEW GAME, Pyodide ready, no page errors");
await browser.close();
