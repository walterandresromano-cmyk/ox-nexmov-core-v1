import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "oX NEXMOV <soporte@oxnexmov.com.ar>";
const NOTIFY_EMAIL = process.env.DEALER_APPLICATION_EMAIL || "soporte@oxnexmov.com.ar";

function escapeHtml(str) {
  return String(str || "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildRow(label, value) {
  return `<tr>
    <td style="padding:8px;border:1px solid #ddd;background:#f5f9ff;font-weight:600;width:180px">${label}</td>
    <td style="padding:8px;border:1px solid #ddd">${escapeHtml(value)}</td>
  </tr>`;
}

function buildEmail(data) {
  const rows = [
    buildRow("Nombre comercial", data.commercialName),
    buildRow("Responsable", data.contactName),
    buildRow("Email", data.email),
    buildRow("WhatsApp", data.whatsapp),
    buildRow("Provincia", data.province),
    buildRow("Ciudad", data.city),
    buildRow("Plan solicitado", data.plan),
    buildRow("Vehículos aprox.", data.vehicleCount),
    buildRow("Mensaje", data.message),
  ].join("\n");

  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#0d1726">
  <h2 style="color:#2563eb">Nueva solicitud de alta dealer — oX NEXMOV</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    ${rows}
  </table>
  <p style="margin-top:24px;font-size:12px;color:#888">oX NEXMOV — panel de administración</p>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    commercialName,
    contactName,
    email,
    whatsapp,
    province,
    city,
    plan,
    vehicleCount,
    message,
  } = req.body || {};

  if (!commercialName || !email) {
    return res.status(400).json({ error: "Faltan campos obligatorios: nombre comercial y email." });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "El email no es válido." });
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // SMTP not configured — log and return success so the form works in dev
    console.warn("[dealer-application] SMTP not configured. Application data:", { commercialName, email, plan });
    return res.status(200).json({ ok: true, warn: "smtp-not-configured" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: SMTP_FROM,
      to: NOTIFY_EMAIL,
      replyTo: email,
      subject: `Nueva solicitud dealer — ${commercialName} — Plan ${plan || "no especificado"}`,
      html: buildEmail({ commercialName, contactName, email, whatsapp, province, city, plan, vehicleCount, message }),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[dealer-application] SMTP error:", err.message);
    return res.status(500).json({ error: "No se pudo enviar la solicitud. Intentá nuevamente." });
  }
}
