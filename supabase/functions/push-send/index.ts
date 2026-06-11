// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
// Callable only by service_role, admin, or support — returns 403 otherwise.
// Deploy WITHOUT --no-verify-jwt.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push";

const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT     = Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@oxnexmov.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const TRUSTED_ROLES = new Set(["admin", "support", "soporte"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // ── Auth gate — trusted callers only ────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceRole =
    authHeader === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;

  if (!isServiceRole) {
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: profile } = await anonClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = String(profile?.role ?? "").toLowerCase();
    if (!TRUSTED_ROLES.has(role)) {
      return json({ error: "Forbidden — use notify-lead for lead notifications" }, 403);
    }
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { dealerId, title, body, url = "/dealer", tag = "ox-notification" } = payload;

  if (!dealerId) return json({ error: "dealerId is required" }, 400);

  // ── Fetch subscriptions by dealer_id ─────────────────────────────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")          // column is "auth", not "auth_key"
    .eq("dealer_id", dealerId);                // column is "dealer_id", not "user_id"

  if (subsErr) return json({ error: subsErr.message }, 500);
  if (!subs?.length) return json({ sent: 0, reason: "no subscriptions" });

  // ── Send ─────────────────────────────────────────────────────────────────
  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url, tag, icon: "/favicon.svg" })
      )
    )
  );

  // Remove expired subscriptions (410 Gone / 404 Not Found)
  const expiredEndpoints = subs
    .filter((_, i) => {
      const r = results[i];
      return r.status === "rejected" &&
        (r.reason?.statusCode === 410 || r.reason?.statusCode === 404);
    })
    .map((s) => s.endpoint);

  if (expiredEndpoints.length) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return json({ sent, total: subs.length });
});
