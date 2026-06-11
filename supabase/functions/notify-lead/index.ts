// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
// Called from the frontend after a lead is created.
// Accepts { leadId } — derives dealer server-side, client never controls dealer_id.
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // ── Verify caller is authenticated ───────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  // ── Parse body — only leadId from client ─────────────────────────────────
  let leadId;
  try {
    const body = await req.json();
    leadId = Number(body?.leadId);
    if (!leadId || !Number.isFinite(leadId)) throw new Error();
  } catch {
    return json({ error: "leadId (number) is required" }, 400);
  }

  // ── Service-role client for all DB reads ─────────────────────────────────
  const service = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  // ── Verify ownership: lead.buyer_id must match this user ─────────────────
  const { data: buyerProfile } = await service
    .from("buyer_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!buyerProfile) return json({ error: "Buyer profile not found" }, 404);

  const { data: lead } = await service
    .from("vehicle_action_leads")
    .select("id, vehicle_id, vehicle_title_snapshot")
    .eq("id", leadId)
    .eq("buyer_id", buyerProfile.id)   // ownership check — rejects spoofed leadIds
    .single();

  if (!lead) return json({ error: "Lead not found" }, 404);

  // ── Derive dealer_id server-side: lead → vehicle.dealer_id ───────────────
  const { data: vehicle } = await service
    .from("vehicles")
    .select("dealer_id")
    .eq("id", lead.vehicle_id)
    .single();

  if (!vehicle?.dealer_id) return json({ sent: 0, reason: "no dealer on vehicle" });

  // ── Fetch push subscriptions directly by dealer_id ───────────────────────
  const { data: subs, error: subsErr } = await service
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")     // column is "auth", not "auth_key"
    .eq("dealer_id", vehicle.dealer_id);  // column is "dealer_id", not "user_id"

  if (subsErr) return json({ error: subsErr.message }, 500);
  if (!subs?.length) return json({ sent: 0, reason: "no subscriptions" });

  // ── Send push notifications ───────────────────────────────────────────────
  const vehicleTitle = lead.vehicle_title_snapshot || "un vehículo";

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: "Nueva consulta recibida",
          body:  `Alguien preguntó por ${vehicleTitle}`,
          url:   "/dealer",
          tag:   `lead-${lead.id}`,
          icon:  "/favicon.svg",
        })
      )
    )
  );

  // Clean up expired endpoints (410 Gone / 404 Not Found)
  const expiredEndpoints = subs
    .filter((_, i) => {
      const r = results[i];
      return r.status === "rejected" &&
        (r.reason?.statusCode === 410 || r.reason?.statusCode === 404);
    })
    .map((s) => s.endpoint);

  if (expiredEndpoints.length) {
    await service
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return json({ sent, total: subs.length });
});
