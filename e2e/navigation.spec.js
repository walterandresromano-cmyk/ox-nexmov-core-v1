import { test, expect } from "@playwright/test";
import { mockSupabase } from "./mocks.js";

test.describe("Navegación por URL", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page, { vehicles: [], dealers: [] });
  });

  test("/buscar muestra la sección de búsqueda", async ({ page }) => {
    await page.goto("/buscar");
    await expect(page).toHaveTitle(/Buscar/);
    await expect(page.locator(".site-header")).toBeVisible();
  });

  test("/quienes-somos carga la página Quiénes somos", async ({ page }) => {
    await page.goto("/quienes-somos");
    await expect(page).toHaveTitle(/Quiénes somos/);
  });

  test("/faq carga las preguntas frecuentes", async ({ page }) => {
    await page.goto("/faq");
    await expect(page).toHaveTitle(/frecuentes/i);
  });

  test("/sumate carga la sección de red de vendedores", async ({ page }) => {
    await page.goto("/sumate");
    await expect(page).toHaveTitle(/Sumate/i);
  });

  test("/legal/terminos carga los términos", async ({ page }) => {
    await page.goto("/legal/terminos");
    await expect(page).toHaveTitle(/Términos/i);
  });

  test("/legal/privacidad carga la política", async ({ page }) => {
    await page.goto("/legal/privacidad");
    await expect(page).toHaveTitle(/privacidad/i);
  });

  test("ruta desconocida muestra página de error o redirige", async ({ page }) => {
    await page.goto("/ruta-que-no-existe");
    // Debe seguir vivo (header visible) aunque no tenga contenido
    await expect(page.locator(".site-header")).toBeVisible();
  });
});

test.describe("Navegación por clic en header", () => {
  test.beforeEach(async ({ page }) => {
    await mockSupabase(page, { vehicles: [], dealers: [] });
    await page.goto("/");
  });

  test("clic en 'Buscar' navega a /buscar", async ({ page }) => {
    // Solo desktop nav — en mobile el dock es diferente
    await page.locator('nav[aria-label="Navegación principal"] button:has-text("Buscar")').click();
    await expect(page).toHaveURL(/\/buscar/);
    await expect(page).toHaveTitle(/Buscar/);
  });

  test("clic en el logo lleva al home", async ({ page }) => {
    // Ir a buscar primero
    await page.goto("/buscar");
    // Volver con el logo del header (puede haber uno en el footer también)
    await page.locator('.site-header [aria-label="Ir al inicio de oX NEXMOV"]').click();
    await expect(page).toHaveURL("/");
  });

  test("el botón activo tiene aria-current=page", async ({ page }) => {
    // En home, el botón 'Inicio' debe tener aria-current="page"
    const inicioBtn = page.locator('nav[aria-label="Navegación principal"] button:has-text("Inicio")');
    await expect(inicioBtn).toHaveAttribute("aria-current", "page");

    // Ir a Buscar
    await page.locator('nav[aria-label="Navegación principal"] button:has-text("Buscar")').click();
    await expect(page).toHaveURL(/\/buscar/);

    // Ahora Buscar debe ser la activa
    const buscarBtn = page.locator('nav[aria-label="Navegación principal"] button:has-text("Buscar")');
    await expect(buscarBtn).toHaveAttribute("aria-current", "page");
  });
});
