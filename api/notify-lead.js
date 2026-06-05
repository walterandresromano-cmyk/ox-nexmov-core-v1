import webpush from "web-push";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL =
  process.env.VAPID_EMAIL || "mailto:soporte@oxnexmov.com.ar";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    dealerId,
    vehicleTitle,
    buyerName,
  } = req.body || {};

  const results = { push: "skipped" };

  // ── Push notification only (email via SMTP no activado aún) ────────
  if (dealerId && SERVICE_ROLE_KEY && VAPID_PUBLIC && VAPID_PRIVATE) {
    try {
      const subRes = await fetch(
        `${SUPABASE_URL}/rest/v1/push_subscriptions?dealer_id=eq.${encodeURIComponent(dealerId)}&select=endpoint,p256dh,auth`,
        {
          headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (subRes.ok) {
        const subs = await subRes.json();
        if (!subs || subs.length === 0) {
          results.push = "no-subscriptions";
        } else {
          const payload = JSON.stringify({
            title: "Nueva consulta en oX NEXMOV",
            body: `${buyerName || "Un comprador"} consultó por ${vehicleTitle || "tu vehículo"}.`,
            tag: "ox-lead",
            url: "https://www.oxnexmov.com.ar/dealer",
          });

          const pushResults = await Promise.allSettled(
            subs.map((sub) =>
              webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                payload
              )
            )
          );

          const sent = pushResults.filter((r) => r.status === "fulfilled").length;
          results.push = `sent:${sent}/${subs.length}`;
        }
      }
    } catch (err) {
      results.push = `error: ${err.message}`;
    }
  }

  return res.status(200).json({ ok: true, results });
}
