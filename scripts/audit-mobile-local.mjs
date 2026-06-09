/**
 * Audit against localhost:4174 to verify fixes before deploy
 */
import { chromium, devices } from "playwright";

const iPhone14 = devices["iPhone 14"];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ ...iPhone14, locale: "es-AR" });
const page = await ctx.newPage();

await page.goto("http://localhost:4174", { waitUntil: "networkidle", timeout: 20000 });
await page.waitForTimeout(1500);

const tooSmall = await page.evaluate(() => {
  const targets = document.querySelectorAll("button, a, [role='button'], input, select");
  const issues = [];
  for (const el of targets) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
      const text = (el.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.tagName).trim().slice(0, 50);
      issues.push({ tag: el.tagName, text, w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  return issues.slice(0, 30);
});

const smallFonts = await page.evaluate(() => {
  const all = document.querySelectorAll("p, span, li, a, button, label, h3, h4, h5, h6");
  const issues = [];
  for (const el of all) {
    const size = parseFloat(window.getComputedStyle(el).fontSize);
    if (size > 0 && size < 11) {
      const text = el.textContent.trim().slice(0, 40);
      if (text) issues.push({ tag: el.tagName, size: size.toFixed(2), text });
    }
  }
  return issues.slice(0, 20);
});

console.log(`\nTOUCH TARGETS < 44px: ${tooSmall.length} encontrados`);
tooSmall.forEach((t) => console.log(`  [${t.tag}] "${t.text}" → ${t.w}×${t.h}px`));

console.log(`\nFUENTES < 11px: ${smallFonts.length} encontradas`);
smallFonts.forEach((f) => console.log(`  [${f.tag}] ${f.size}px → "${f.text}"`));

await browser.close();
process.exit(0);
