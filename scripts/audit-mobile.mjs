/**
 * Auditoría mobile de oxnexmov.com.ar
 * Simula iPhone 14 (390x844, deviceScaleFactor 3, touch)
 * Captura screenshots de Home, Search y abre un modal de vehículo
 */
import { chromium, devices } from "playwright";
import path from "path";
import fs from "fs";

const iPhone14 = devices["iPhone 14"];
const OUT = "scripts/audit-screenshots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  ...iPhone14,
  locale: "es-AR",
});
const page = await ctx.newPage();

// ── Errores de consola ──────────────────────────────────────────────────────
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));

async function shot(name, selector) {
  if (selector) {
    const el = page.locator(selector).first();
    if (await el.count()) {
      await el.screenshot({ path: `${OUT}/${name}.png` });
      return;
    }
  }
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
}

// ── 1. HOME ──────────────────────────────────────────────────────────────────
console.log("1. Home...");
await page.goto("https://www.oxnexmov.com.ar", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);
await shot("01-home-full");

// Hero viewport
await page.screenshot({ path: `${OUT}/02-home-hero-viewport.png` });

// Scroll a la sección de búsqueda del hero
const searchBox = page.locator("input[placeholder], .ox-home-search-v3 input").first();
if (await searchBox.count()) {
  await searchBox.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/03-home-search-visible.png` });
}

// Verificar header/nav
const header = page.locator("header, nav, .site-header, .ox-header").first();
if (await header.count()) {
  await header.screenshot({ path: `${OUT}/04-home-header.png` });
}

// Scroll hasta los featured cards
await page.evaluate(() => window.scrollBy(0, 600));
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/05-home-cards-scroll.png` });

// ── 2. SEARCH ────────────────────────────────────────────────────────────────
console.log("2. Search...");
await page.goto("https://www.oxnexmov.com.ar/search", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/06-search-full.png` });

// Scroll para ver las cards
await page.evaluate(() => window.scrollBy(0, 300));
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/07-search-cards.png` });

// Intentar abrir filtros mobile si existe
const filterBtn = page.locator("button:has-text('Filtros'), button:has-text('filtros'), .mobile-filter-toggle").first();
if (await filterBtn.count()) {
  await filterBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/08-search-filters-open.png` });
  // Cerrar
  const closeBtn = page.locator("button:has-text('Cerrar'), button:has-text('Aplicar')").first();
  if (await closeBtn.count()) await closeBtn.click();
}

// ── 3. MODAL DE VEHÍCULO ─────────────────────────────────────────────────────
console.log("3. Vehicle modal...");
// Hacer click en la primera card
const card = page.locator(".vehicle-card, [class*='vehicle-card']").first();
if (await card.count()) {
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/09-modal-open.png` });

  // Thumbnail strip
  const thumbStrip = page.locator(".detail-thumb-strip").first();
  if (await thumbStrip.count()) {
    await thumbStrip.screenshot({ path: `${OUT}/10-modal-thumbstrip.png` });
  }

  // Scroll dentro del modal para ver el panel de info
  const modalInfo = page.locator(".vehicle-detail-info").first();
  if (await modalInfo.count()) {
    await modalInfo.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/11-modal-info-panel.png` });
  }
}

// ── 4. Métricas de accessibility tree ───────────────────────────────────────
console.log("4. Checking touch targets...");
await page.goto("https://www.oxnexmov.com.ar", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);

// Verificar tamaños de botones/links (touch targets mínimos = 44×44px)
const tooSmall = await page.evaluate(() => {
  const targets = document.querySelectorAll("button, a, [role='button'], input, select");
  const issues = [];
  for (const el of targets) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
      const text = (el.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.tagName).trim().slice(0, 40);
      issues.push({ tag: el.tagName, text, w: Math.round(r.width), h: Math.round(r.height) });
    }
  }
  return issues.slice(0, 20);
});

// Verificar overflow horizontal
const hasOverflow = await page.evaluate(() => {
  const bodyW = document.body.scrollWidth;
  const viewW = window.innerWidth;
  return { bodyScrollWidth: bodyW, viewportWidth: viewW, hasHorizontalOverflow: bodyW > viewW };
});

// Verificar font sizes (mínimo 16px para inputs, 14px para texto)
const smallFonts = await page.evaluate(() => {
  const all = document.querySelectorAll("p, span, li, a, button, label, h3, h4, h5, h6");
  const issues = [];
  for (const el of all) {
    const size = parseFloat(window.getComputedStyle(el).fontSize);
    if (size > 0 && size < 11) {
      const text = el.textContent.trim().slice(0, 30);
      if (text) issues.push({ tag: el.tagName, size, text });
    }
  }
  return issues.slice(0, 10);
});

// Verificar images sin alt
const missingAlt = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("img:not([alt])")).length;
});

// Verificar viewport meta
const viewportMeta = await page.evaluate(() => {
  const m = document.querySelector('meta[name="viewport"]');
  return m ? m.getAttribute("content") : null;
});

console.log("\n=== REPORTE TÉCNICO ===\n");
console.log("VIEWPORT META:", viewportMeta);
console.log("HORIZONTAL OVERFLOW:", JSON.stringify(hasOverflow));
console.log(`\nTOUCH TARGETS < 44px: ${tooSmall.length} encontrados`);
tooSmall.forEach((t) => console.log(`  [${t.tag}] "${t.text}" → ${t.w}×${t.h}px`));
console.log(`\nFUENTES < 11px: ${smallFonts.length} encontradas`);
smallFonts.forEach((f) => console.log(`  [${f.tag}] ${f.size}px → "${f.text}"`));
console.log(`\nIMÁGENES SIN ALT: ${missingAlt}`);
console.log(`\nERRORES DE CONSOLA: ${errors.length}`);
errors.slice(0, 5).forEach((e) => console.log("  ERROR:", e.slice(0, 120)));

console.log("\nScreenshots guardados en:", OUT);

await browser.close();
