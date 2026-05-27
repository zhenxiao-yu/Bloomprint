/**
 * Dev-only visual capture. Screenshots key routes at desktop + mobile widths to .shots/
 * so the current UI can be reviewed. Requires the dev server running on :3000.
 *   node scripts/shots.mjs [route1 route2 ...]   (defaults to the full set)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000/en";
const OUT = "h:/Github/Bloomprint/.shots";
mkdirSync(OUT, { recursive: true });

const DEFAULT_ROUTES = [
  ["home", "/"],
  ["dashboard", "/dashboard"],
  ["plan", "/plan"],
  ["plans", "/plans"],
  ["pricing", "/pricing"],
  ["pro", "/pro"],
  ["account", "/account"],
  ["guide", "/guide"],
];

const routes = process.argv.length > 2
  ? process.argv.slice(2).map((r) => [r.replace(/\W+/g, "-").replace(/^-|-$/g, "") || "root", r])
  : DEFAULT_ROUTES;

const VIEWPORTS = [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
];

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let y = 0;
      const step = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        y += step;
        if (y >= document.body.scrollHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 60);
    });
  });
}

const browser = await chromium.launch();
for (const [vName, w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const [name, route] of routes) {
    try {
      // domcontentloaded + fixed settle: robust for client-rendered pages (e.g. the demo plan)
      // whose live polling never reaches networkidle.
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(3000);
      // Force scroll-reveal content visible so screenshots show the real page, not pre-reveal blanks.
      await page.addStyleTag({
        content: `.reveal,[class*="reveal"]{opacity:1 !important;transform:none !important;filter:none !important;}
                  *,*::before,*::after{animation-duration:.01ms !important;transition-duration:.01ms !important;}`,
      });
      await autoScroll(page);
      await page.waitForTimeout(600);
      const file = `${OUT}/${name}-${vName}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log("✓", file);
    } catch (e) {
      console.log("✗", name, vName, String(e).split("\n")[0]);
    }
  }
  await ctx.close();
}
await browser.close();
console.log("DONE");
