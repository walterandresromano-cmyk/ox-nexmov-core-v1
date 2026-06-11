// Deploy WITHOUT --no-verify-jwt.
// Callable only by service_role, admin, or support.
// Regular users (buyers, dealers) receive 403 — use notify-lead instead.

// deno-lint-ignore-file no-explicit-any
/// <reference lib="deno.window" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push";

const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT     = Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@oxnexmov.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

const TRUSTED_ROLES = new Set(["admin", "support", "soporte"]);

interface PushPayload {
  userId?: string;
  dealerId?: number;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface PushSub {
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // ── Auth gate — trusted callers only ────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const isServiceRole =
    authHeader === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;

  if (!isServiceRole) {
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
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
  let payload: PushPayload;
  try {
    payload = await req.json() as PushPayload;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const {
    userId,
    dealerId,
    title,
    body,
    url = "/dealer",
    tag = "ox-notification",
  } = payload;

  // ── Resolve target user ───────────────────────────────────────────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let resolvedUserId: string | null = userId ?? null;
  if (!resolvedUserId && dealerId) {
    const { data: dealer } = await supabase
      .from("dealers")
      .select("profile_id")
      .eq("id", dealerId)
      .single();
    resolvedUserId = dealer?.profile_id ?? null;
  }

  if (!resolvedUserId) return json({ sent: 0, reason: "no target user" });

  // ── Fetch subscriptions and send ─────────────────────────────────────────
  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", resolvedUserId);

  if (subsErr) return json({ error: subsErr.message }, 500);
  if (!subs?.length) return json({ sent: 0, reason: "no subscriptions" });

  const typedSubs = subs as PushSub[];

  const results = await Promise.allSettled(
    typedSubs.map((sub: PushSub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({ title, body, url, tag, icon: "/favicon.svg" })
      )
    )
  );

  // Remove expired subscriptions (410 Gone / 404 Not Found)
  const expiredEndpoints = typedSubs
    .filter((_: PushSub, i: number) => {
      const r = results[i] as PromiseRejectedResult;
      return r.status === "rejected" &&
        (r.reason?.statusCode === 410 || r.reason?.statusCode === 404);
    })
    .map((s: PushSub) => s.endpoint);

  if (expiredEndpoints.length) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return json({ sent, total: typedSubs.length });
});
