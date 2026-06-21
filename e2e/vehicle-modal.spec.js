import { test, expect } from "@playwright/test";
import { mockSupabase } from "./mocks.js";
import { VEHICLE_FIXTURE, DEALER_PUBLIC_FIXTURE } from "./fixtures.js";

const openModal = async (page) => {
  await page.locator(".vehicle-card").first().getByRole("button", { name: "Ver detalle" }).click();
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
};

test.describe("Modal de detalle de vehículo", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page, {
      vehicles: [VEHICLE_FIXTURE],
      dealers: [DEALER_PUBLIC_FIXTURE],
    });
    await page.goto("/");
    // Esperar a que la card aparezca
    await page.locator(".vehicle-card").first().waitFor({ timeout: 8000 });
  });

  test("clic en 'Ver detalle' abre el modal", async ({ page }) => {
    await openModal(page);
  });

  test("el modal tiene los datos del vehículo", async ({ page }) => {
    await openModal(page);
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog.getByText("Toyota").first()).toBeVisible();
    await expect(dialog.getByText("Corolla").first()).toBeVisible();
  });

  test("el modal tiene botón 'Cerrar' accesible", async ({ page }) => {
    await openModal(page);
    const closeBtn = page.locator('[role="dialog"] [aria-label="Cerrar"]').first();
    await expect(closeBtn).toBeVisible();
  });

  test("cerrar el modal elimina el dialog del DOM", async ({ page }) => {
    await openModal(page);
    await page.locator('[role="dialog"] [aria-label="Cerrar"]').first().click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test("el modal muestra el precio del vehículo", async ({ page }) => {
    await openModal(page);
    // El precio 8.500.000 debe aparecer en algún formato
    await expect(page.locator('[role="dialog"]').getByText(/500\.000/)).toBeVisible();
  });

  test("Escape cierra el modal", async ({ page }) => {
    await openModal(page);
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe("ContactGate — modal de contacto", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page, {
      vehicles: [VEHICLE_FIXTURE],
      dealers: [DEALER_PUBLIC_FIXTURE],
    });
    await page.goto("/");
    await page.locator(".vehicle-card").first().waitFor({ timeout: 8000 });
  });

  test("el botón de contactar es accesible desde el modal", async ({ page }) => {
    await openModal(page);
    // Buscar tab/botón de contacto dentro del dialog
    const contactBtn = page.locator('[role="dialog"]').getByText(/Contactar|Consultar/i).first();
    await expect(contactBtn).toBeVisible({ timeout: 3000 });
  });
});
