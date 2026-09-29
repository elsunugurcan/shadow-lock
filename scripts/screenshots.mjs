// Real screenshots of the running game for the README (starts the dev server, plays a few moments, saves JPEGs).
//   node scripts/screenshots.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium } from "playwright";

const PORT = 4612, URL = `http://localhost:${PORT}/`;
fs.mkdirSync("screenshots", { recursive: true });
const srv = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], { stdio: "ignore", detached: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) { try { if ((await fetch(URL)).ok) break; } catch {} await sleep(250); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 450, height: 800 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(URL);
await page.waitForFunction(() => !document.getElementById("loading"));
const save = (name) => page.screenshot({ path: `screenshots/${name}.jpg`, type: "jpeg", quality: 86 });
const room = (fn, arg) => page.evaluate(([fn, arg]) => new Function("r", "S", "arg", fn)(window.shadowlock.room(), window.shadowlock.S, arg), [fn, arg]);

/** waits until the falling piece is within `tol` degrees of its shadow, then taps */
async function tapWhenAligned(maxErr) {
  await page.waitForFunction((maxErr) => {
    const r = window.shadowlock.room();
    if (r.state !== "fall") return false;
    const period = 360 / r.shape.sym;
    let d = (r.ang - r.sockAng) % period; if (d < 0) d += period; if (d > period / 2) d = period - d;
    return d <= maxErr && r.prog > 0.25;
  }, maxErr, { polling: "raf", timeout: 20000 });
  await page.mouse.click(225, 500);
}

await sleep(3000);
await save("start");

await page.evaluate(() => { window.shadowlock.S.fade = 0; window.shadowlock.go("game"); });
await sleep(900);
await save("banner");
await page.waitForFunction(() => window.shadowlock.room().state === "fall", null, { timeout: 5000 });
await page.waitForFunction(() => window.shadowlock.room().prog > 0.45, null, { polling: "raf" });
await save("fall");

// a few clean locks to build a combo, then a perfect one
for (let i = 0; i < 4; i++) { await tapWhenAligned(3); await sleep(i === 3 ? 420 : 900); }
await save("perfect");

// level 3: the shadow turns too
await sleep(600);
await room("r.level = 3; r.cfg = arg; r.matched = 4; r.state = 'banner'; r.timer = 0.01;", { title: "MOVING DARK", shapes: 8, rot: 150, fall: 3.3, tol: 14, need: 10, hint: false, sockRot: -35, pulse: 0, flip: true });
await page.waitForFunction(() => window.shadowlock.room().state === "fall" && window.shadowlock.room().prog > 0.3, null, { polling: "raf" });
await save("level3");

// a miss: tap while it is clearly off
await page.waitForFunction(() => {
  const r = window.shadowlock.room(); if (r.state !== "fall") return false;
  const period = 360 / r.shape.sym; let d = (r.ang - r.sockAng) % period; if (d < 0) d += period; if (d > period / 2) d = period - d;
  return d > 30;
}, null, { polling: "raf" });
await page.mouse.click(225, 500);
await sleep(260);
await save("miss");

// result screen after a full clear
await page.evaluate(() => { const S = window.shadowlock.S; S.won = true; S.newBest = true; S.score = 1385; S.best = 1385; S.levelReached = 4; window.shadowlock.go("over"); });
await sleep(3200);
await save("over");

await browser.close();
try { process.kill(-srv.pid); } catch {}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log("screenshots/ ✓");
