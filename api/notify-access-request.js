import nodemailer from "nodemailer";

const SMTP_HOST  = process.env.SMTP_HOST || "";
const SMTP_PORT  = Number(process.env.SMTP_PORT || "587");
const SMTP_USER  = process.env.SMTP_USER || "";
const SMTP_PASS  = process.env.SMTP_PASS || "";
const SMTP_FROM  = process.env.SMTP_FROM || "oX NEXMOV <soporte@oxnexmov.com.ar>";
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "soporte@oxnexmov.com.ar";

function escapeHtml(str) {
  return String(str || "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml({ name, email, company, phone }) {
  const date = new Date().toLocaleString("es-AR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
  <div style="background:#0f172a;padding:24px 32px;border-radius:12px 12px 0 0">
    <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin:0 0 6px">oX NEXMOV — Solicitud de acceso</p>
    <h1 style="color:#f1f5f9;font-size:20px;margin:0">Nueva solicitud de acceso al preview</h1>
  </div>
  <div style="background:#f8fafc;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">
    <p style="margin:0 0 16px;color:#475569;font-size:13px">${escapeHtml(date)}</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <tr><td style="padding:9px 12px;border:1px solid #e2e8f0;background:#f1f5f9;font-weight:600;width:140px">Nombre</td><td style="padding:9px 12px;border:1px solid #e2e8f0">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:9px 12px;border:1px solid #e2e8f0;background:#f1f5f9;font-weight:600">Email</td><td style="padding:9px 12px;border:1px solid #e2e8f0">${escapeHtml(email)}</td></tr>
      ${company ? `<tr><td style="padding:9px 12px;border:1px solid #e2e8f0;background:#f1f5f9;font-weight:600">Empresa</td><td style="padding:9px 12px;border:1px solid #e2e8f0">${escapeHtml(company)}</td></tr>` : ""}
      ${phone ? `<tr><td style="padding:9px 12px;border:1px solid #e2e8f0;background:#f1f5f9;font-weight:600">Teléfono</td><td style="padding:9px 12px;border:1px solid #e2e8f0">${escapeHtml(phone)}</td></tr>` : ""}
    </table>
    <p style="margin-top:20px">
      <a href="https://www.oxnexmov.com.ar/admin"
         style="background:#2563eb;color:#fff;padding:11px 22px;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">
        Ver en panel admin
      </a>
    </p>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, company, phone } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: "name y email son requeridos." });
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return res.status(200).json({ ok: true, emailSent: false, reason: "SMTP no configurado." });
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: ADMIN_EMAIL,
      subject: `Nueva solicitud de acceso — ${name} (${email})`,
      html: buildEmailHtml({ name, email, company, phone }),
    });
    return res.status(200).json({ ok: true, emailSent: true });
  } catch (err) {
    console.error("[notify-access-request] SMTP error:", err.message);
    return res.status(200).json({ ok: true, emailSent: false, reason: err.message });
  }
}
