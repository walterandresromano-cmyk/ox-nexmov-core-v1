import webpush from "web-push";
import nodemailer from "nodemailer";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL =
  process.env.VAPID_EMAIL || "mailto:soporte@oxnexmov.com.ar";

// SMTP — configure via env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "oX NEXMOV <soporte@oxnexmov.com.ar>";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

function escapeHtml(str) {
  return String(str || "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml({ dealerName, vehicleTitle, buyerName, buyerEmail, buyerPhone, message, vehiclePrice }) {
  const lines = [
    `<p>Hola <strong>${escapeHtml(dealerName) || "Dealer"}</strong>,</p>`,
    `<p>Recibiste una nueva consulta en <strong>oX NEXMOV</strong>.</p>`,
    `<table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px">`,
    `<tr><td style="padding:8px;border:1px solid #ddd;background:#f9f9f9"><strong>Vehículo</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(vehicleTitle)}</td></tr>`,
    vehiclePrice ? `<tr><td style="padding:8px;border:1px solid #ddd;background:#f9f9f9"><strong>Precio publicado</strong></td><td style="padding:8px;border:1px solid #ddd">$${Number(vehiclePrice).toLocaleString("es-AR")}</td></tr>` : "",
    `<tr><td style="padding:8px;border:1px solid #ddd;background:#f9f9f9"><strong>Comprador</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(buyerName)}</td></tr>`,
    buyerEmail ? `<tr><td style="padding:8px;border:1px solid #ddd;background:#f9f9f9"><strong>Email</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(buyerEmail)}</td></tr>` : "",
    buyerPhone ? `<tr><td style="padding:8px;border:1px solid #ddd;background:#f9f9f9"><strong>Teléfono</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(buyerPhone)}</td></tr>` : "",
    message ? `<tr><td style="padding:8px;border:1px solid #ddd;background:#f9f9f9"><strong>Mensaje</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(message)}</td></tr>` : "",
    `</table>`,
    `<p style="margin-top:16px"><a href="https://www.oxnexmov.com.ar/dealer" style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold">Ver en mi panel</a></p>`,
    `<p style="margin-top:24px;font-size:12px;color:#888">oX NEXMOV — Marketplace de vehículos verificados</p>`,
  ].filter(Boolean).join("\n");
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto">${lines}</body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    dealerId,
    dealerEmail,
    dealerName,
    vehicleTitle,
    vehiclePrice,
    buyerName,
    buyerEmail,
    buyerPhone,
    message,
  } = req.body || {};

  const results = { push: "skipped", email: "skipped" };

  // ── Email via SMTP ──────────────────────────────────────────────
  if (dealerEmail && SMTP_HOST && SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });

      await transporter.sendMail({
        from: SMTP_FROM,
        to: dealerEmail,
        subject: `Nueva consulta: ${vehicleTitle || "tu vehículo"} — oX NEXMOV`,
        html: buildEmailHtml({ dealerName, vehicleTitle, buyerName, buyerEmail, buyerPhone, message, vehiclePrice }),
      });

      results.email = "sent";
    } catch (err) {
      results.email = `error: ${err.message}`;
      console.error("[notify-lead] SMTP error:", err.message);
    }
  } else if (!dealerEmail) {
    results.email = "no-dealer-email";
  } else {
    results.email = "smtp-not-configured";
  }

  // ── Web push ────────────────────────────────────────────────────
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

          const staleEndpoints = pushResults
            .map((r, i) => ({ result: r, sub: subs[i] }))
            .filter(({ result }) => {
              if (result.status !== "rejected") return false;
              const status = result.reason?.statusCode;
              return status === 410 || status === 404;
            })
            .map(({ sub }) => sub.endpoint);

          if (staleEndpoints.length > 0) {
            await fetch(
              `${SUPABASE_URL}/rest/v1/push_subscriptions?dealer_id=eq.${encodeURIComponent(dealerId)}&endpoint=in.(${staleEndpoints.map((e) => `"${e}"`).join(",")})`,
              {
                method: "DELETE",
                headers: {
                  apikey: SERVICE_ROLE_KEY,
                  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                },
              }
            ).catch(() => {});
            results.staleCleaned = staleEndpoints.length;
          }
        }
      }
    } catch (err) {
      results.push = `error: ${err.message}`;
      console.error("[notify-lead] push error:", err.message);
    }
  }

  return res.status(200).json({ ok: true, results });
}
