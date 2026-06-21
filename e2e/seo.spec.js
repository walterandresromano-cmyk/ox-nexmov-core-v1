import { test, expect } from "@playwright/test";
import { mockSupabase } from "./mocks.js";

// Tests de SEO: meta tags, og:tags, canonical, structured data
test.describe("SEO — meta tags por ruta", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page, { vehicles: [], dealers: [] });
  });

  test("home tiene title y meta description", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/oX NEXMOV/);
    const description = await page.locator('meta[name="description"]').getAttribute("content");
    expect(description).toBeTruthy();
    expect(description.length).toBeGreaterThan(30);
  });

  test("home tiene Open Graph tags", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /.+/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /https?:\/\//);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
  });

  test("home tiene JSON-LD WebSite y Organization", async ({ page }) => {
    await page.goto("/");
    const scripts = await page.locator('script[type="application/ld+json"]').all();
    expect(scripts.length).toBeGreaterThanOrEqual(2);

    let hasWebSite = false;
    let hasOrg = false;

    for (const script of scripts) {
      const text = await script.textContent();
      const data = JSON.parse(text);
      if (data["@type"] === "WebSite") hasWebSite = true;
      if (data["@type"] === "Organization") hasOrg = true;
    }

    expect(hasWebSite).toBe(true);
    expect(hasOrg).toBe(true);
  });

  test("/buscar tiene title correcto", async ({ page }) => {
    await page.goto("/buscar");
    await expect(page).toHaveTitle(/Buscar/);
  });

  test("/quienes-somos tiene title correcto", async ({ page }) => {
    await page.goto("/quienes-somos");
    await expect(page).toHaveTitle(/Quiénes somos/i);
  });

  test("el link canonical existe y tiene una URL válida", async ({ page }) => {
    await page.goto("/");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical).toBeTruthy();
    expect(canonical).toMatch(/^https?:\/\//);
  });
});

test.describe("SEO — Twitter Cards", () => {
  test("home tiene Twitter card summary_large_image", async ({ page }) => {
    await mockSupabase(page, { vehicles: [], dealers: [] });
    await page.goto("/");

    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image"
    );
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", /https?:\/\//);
  });
});
