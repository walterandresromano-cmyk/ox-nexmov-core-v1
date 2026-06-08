import nodemailer from "nodemailer";

const SUPABASE_URL    = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const NOTIFY_SECRET   = process.env.FOUNDERS_NOTIFY_SECRET || "";
const SMTP_HOST  = process.env.SMTP_HOST || "";
const SMTP_PORT  = Number(process.env.SMTP_PORT || "587");
const SMTP_USER  = process.env.SMTP_USER || "";
const SMTP_PASS  = process.env.SMTP_PASS || "";
const SMTP_FROM  = process.env.SMTP_FROM || "oX NEXMOV <soporte@oxnexmov.com.ar>";
const APP_URL    = "https://www.oxnexmov.com.ar";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml({ dealerName, message, version, deployDate }) {
  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
    <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 6px">oX NEXMOV — Grupo Fundadores</p>
    <h1 style="color:#f1f5f9;font-size:20px;margin:0">Nueva actualización publicada</h1>
  </div>
  <div style="background:#f8fafc;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
    <p>Hola <strong>${escapeHtml(dealerName)}</strong>,</p>
    <p>Como parte del <strong>Grupo de Concesionarias Fundadoras</strong> de oX NEXMOV, sos de los primeros en conocer cada actualización que publicamos.</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:20px 0">
      <p style="margin:0 0 8px;font-size:13px;color:#64748b">Actualización del ${escapeHtml(deployDate)}</p>
      <p style="margin:0;font-size:15px">${escapeHtml(message)}</p>
      ${version ? `<p style="margin:8px 0 0;font-size:12px;color:#94a3b8">Build: ${escapeHtml(version)}</p>` : ""}
    </div>
    <p style="margin-top:20px">
      <a href="${APP_URL}/dealer"
         style="background:#2563eb;color:#fff;padding:11px 22px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">
        Ir a mi panel
      </a>
    </p>
    <p style="margin-top:28px;font-size:12px;color:#94a3b8">
      Recibís este email porque formás parte del Grupo de Concesionarias Fundadoras de oX NEXMOV.<br>
      <a href="${APP_URL}" style="color:#64748b">oxnexmov.com.ar</a>
    </p>
  </div>
</body>
</html>`;
}

async function getFounderDealers() {
  const url = `${SUPABASE_URL}/rest/v1/dealers?is_founder=eq.true&select=id,name,profile_id`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase dealers: ${res.status}`);
  return res.json();
}

async function getProfileEmails(profileIds) {
  if (!profileIds.length) return {};
  const ids = profileIds.map((id) => `"${id}"`).join(",");
  const url = `${SUPABASE_URL}/rest/v1/profiles?id=in.(${ids})&select=id,email,full_name`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase profiles: ${res.status}`);
  const rows = await res.json();
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

async function createInAppNotification(dealerId, message, version) {
  const body = {
    dealer_id: dealerId,
    vehicle_id: null,
    action: "founder_update",
    message: `Nueva actualización: ${message}${version ? ` (${version})` : ""}`,
    is_read: false,
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/dealer_notifications`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secret = req.headers["x-notify-secret"] || "";
  if (!NOTIFY_SECRET || secret !== NOTIFY_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Supabase no configurado." });
  }

  const { message = "Mejoras y actualizaciones disponibles.", version = "" } = req.body || {};
  const deployDate = new Date().toLocaleDateString("es-AR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  let founders = [];
  try {
    founders = await getFounderDealers();
  } catch (err) {
    return res.status(500).json({ error: `Error consultando dealers: ${err.message}` });
  }

  if (!founders.length) {
    return res.status(200).json({ ok: true, notified: 0, message: "Sin dealers fundadores." });
  }

  const profileIds = founders.map((d) => d.profile_id).filter(Boolean);
  const profileMap = await getProfileEmails(profileIds).catch(() => ({}));

  const results = [];

  const smtpReady = SMTP_HOST && SMTP_USER && SMTP_PASS;
  const transporter = smtpReady
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

  for (const dealer of founders) {
    const profile = profileMap[dealer.profile_id] || {};
    const dealerName = dealer.name || profile.full_name || "Dealer";
    const email = profile.email || "";
    const result = { dealerId: dealer.id, dealerName, email, inApp: false, emailSent: false };

    result.inApp = await createInAppNotification(dealer.id, message, version).catch(() => false);

    if (email && transporter) {
      try {
        await transporter.sendMail({
          from: SMTP_FROM,
          to: email,
          subject: `Actualización oX NEXMOV — ${deployDate}`,
          html: buildEmailHtml({ dealerName, message, version, deployDate }),
        });
        result.emailSent = true;
      } catch (err) {
        result.emailError = err.message;
      }
    }

    results.push(result);
  }

  return res.status(200).json({
    ok: true,
    notified: results.length,
    deployDate,
    version,
    results,
  });
}
