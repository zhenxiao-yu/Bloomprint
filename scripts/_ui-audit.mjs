import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const OUT = "h:/Github/Bloomprint/.shots";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 1100 } });
const page = await ctx.newPage();
await page.goto("http://localhost:3000/toolbox/gardenAi", { waitUntil: "domcontentloaded", timeout: 30000 });
try {
  const ta = page.locator("#garden-q");
  await ta.waitFor({ timeout: 15000 });
  await ta.fill("Why are my tomato leaves turning yellow?");
  await page.getByRole("button", { name: /Ask|提问/ }).first().click();
  await page.waitForTimeout(6000); // live DeepSeek round-trip
} catch (e) { console.log("interact failed", String(e).split("\n")[0]); }
await page.screenshot({ path: `${OUT}/garden-ai.png`, fullPage: true });
console.log("✓ garden-ai");
await ctx.close();
await browser.close();
console.log("DONE");
