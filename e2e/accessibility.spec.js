import { test, expect } from "@playwright/test";
import { mockSupabase } from "./mocks.js";
import { VEHICLE_FIXTURE } from "./fixtures.js";

test.describe("Accesibilidad — atributos ARIA", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page, { vehicles: [], dealers: [] });
    await page.goto("/");
  });

  test("la nav principal tiene aria-label", async ({ page }) => {
    await expect(page.locator('nav[aria-label="Navegación principal"]')).toBeVisible();
  });

  test("el botón del tema tiene aria-label descriptivo", async ({ page }) => {
    const themeBtn = page.locator('[data-theme-btn]').first();
    await expect(themeBtn).toHaveAttribute("aria-label");
    const label = await themeBtn.getAttribute("aria-label");
    expect(label).toMatch(/claro|oscuro/i);
  });

  test("las imágenes del logo tienen alt", async ({ page }) => {
    const logo = page.locator(".brand-logo-img");
    await expect(logo).toHaveAttribute("alt");
  });

  test("el botón de acceso (sin login) tiene aria-label", async ({ page }) => {
    // Cuando no hay sesión, debe aparecer el botón de login con aria-label
    const loginBtn = page.locator('[aria-label="Acceso operativo"]');
    await expect(loginBtn).toBeVisible();
  });
});

test.describe("Accesibilidad — modales", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page, { vehicles: [VEHICLE_FIXTURE], dealers: [] });
    await page.goto("/");
    await page.locator(".vehicle-card").first().waitFor({ timeout: 8000 });
  });

  test("el modal del vehículo tiene role=dialog y aria-modal", async ({ page }) => {
    await page.locator(".vehicle-card").first().getByRole("button", { name: "Ver detalle" }).click();
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  test("el botón cerrar del modal tiene aria-label='Cerrar'", async ({ page }) => {
    await page.locator(".vehicle-card").first().getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    const closeBtn = page.locator('[role="dialog"] [aria-label="Cerrar"]').first();
    await expect(closeBtn).toBeVisible();
  });
});

test.describe("Accesibilidad — navegación teclado", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page, { vehicles: [], dealers: [] });
    await page.goto("/");
  });

  test("se puede navegar por el header con Tab", async ({ page }) => {
    // Primer Tab desde el body
    await page.keyboard.press("Tab");
    // El primer elemento enfocable debe ser el logo/marca
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });

  test("los botones de nav son accesibles por teclado", async ({ page }) => {
    // Focus en el primer nav button
    await page.locator('nav[aria-label="Navegación principal"] button').first().focus();
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });
});
