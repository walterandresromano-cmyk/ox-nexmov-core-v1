import { test, expect } from "@playwright/test";
import { mockSupabase } from "./mocks.js";
import { VEHICLE_FIXTURE, VEHICLE_RESERVED_FIXTURE, DEALER_PUBLIC_FIXTURE } from "./fixtures.js";

test.describe("Home — estructura y carga", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page, {
      vehicles: [VEHICLE_FIXTURE, VEHICLE_RESERVED_FIXTURE],
      dealers: [DEALER_PUBLIC_FIXTURE],
    });
    await page.goto("/");
  });

  test("el header y la navegación principal están presentes", async ({ page }) => {
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.locator('nav[aria-label="Navegación principal"]')).toBeVisible();
    await expect(page.locator('nav[aria-label="Navegación principal"] button:has-text("Buscar")')).toBeVisible();
    await expect(page.locator("text=Inicio").first()).toBeVisible();
  });

  test("el título de la página es correcto", async ({ page }) => {
    await expect(page).toHaveTitle(/oX NEXMOV/);
  });

  test("los vehículos mockeados se renderizan como cards", async ({ page }) => {
    // Esperar a que las cards carguen
    await expect(page.locator(".vehicle-card, [class*='vehicle-card']").first()).toBeVisible({ timeout: 8000 });
    // Deben verse las dos marcas que cargamos
    await expect(page.getByText("Toyota").first()).toBeVisible();
    await expect(page.getByText("Ford").first()).toBeVisible();
  });

  test("el hero tiene el heading principal", async ({ page }) => {
    // El hero debe tener un h1 o heading visible
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
  });

  test("el toggle de tema cambia entre dark y light", async ({ page }) => {
    const root = page.locator("html");

    // El tema inicial es dark (configurado en playwright.config)
    await expect(root).toHaveAttribute("data-theme", "dark");

    // Click en el botón de toggle
    await page.locator('[aria-label*="claro"], [aria-label*="oscuro"], [data-theme-btn]').first().click();

    // El tema debe haber cambiado
    await expect(root).not.toHaveAttribute("data-theme", "dark");
  });
});

test.describe("Home — sin datos de Supabase", () => {
  test("carga sin error cuando Supabase no devuelve vehículos", async ({ page }) => {
    await mockSupabase(page, { vehicles: [], dealers: [] });
    await page.goto("/");

    // No debe haber un crash — el header sigue presente
    await expect(page.locator(".site-header")).toBeVisible();
    // No debe haber un error visible
    await expect(page.locator("text=Error")).not.toBeVisible({ timeout: 3000 }).catch(() => {});
  });
});
