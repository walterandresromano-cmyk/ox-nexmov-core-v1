// Helpers para mockear llamadas a la API de Supabase en los tests de Playwright

const SUPABASE_URL = "https://rogqhxlqqgxgzqaycbdp.supabase.co";

/**
 * Intercepta todas las llamadas REST a Supabase para evitar dependencia de red.
 * Llama a esta función al inicio de cada test o en beforeEach.
 */
export async function mockSupabase(page, { vehicles = [], dealers = [], stats = null } = {}) {
  // Vehicles list
  await page.route(`${SUPABASE_URL}/rest/v1/vehicles*`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(vehicles),
    });
  });

  // Dealers list
  await page.route(`${SUPABASE_URL}/rest/v1/dealers*`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(dealers),
    });
  });

  // Auth session (devuelve sin sesión activa)
  await page.route(`${SUPABASE_URL}/auth/v1/**`, (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Invalid JWT" }),
      });
    } else {
      route.continue();
    }
  });

  // Profiles (no hay sesión en tests públicos)
  await page.route(`${SUPABASE_URL}/rest/v1/profiles*`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  // Analytics (silenciar para no ensuciar la DB de test)
  await page.route(`${SUPABASE_URL}/rest/v1/site_analytics*`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.route(`${SUPABASE_URL}/rest/v1/vehicle_views*`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  // Favoritos
  await page.route(`${SUPABASE_URL}/rest/v1/buyer_favorites*`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  // Notificaciones
  await page.route(`${SUPABASE_URL}/rest/v1/buyer_notifications*`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route(`${SUPABASE_URL}/rest/v1/dealer_notifications*`, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
}
