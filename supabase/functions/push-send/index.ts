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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Service-role client — bypasses RLS to read push_subscriptions and dealers
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let payload: {
    userId?: string;
    dealerId?: number;
    title: string;
    body: string;
    url?: string;
    tag?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { userId, dealerId, title, body, url = "/dealer", tag = "ox-notification" } = payload;

  // Resolve profile_id from dealerId when userId is not directly supplied
  let resolvedUserId = userId ?? null;
  if (!resolvedUserId && dealerId) {
    const { data: dealer } = await supabase
      .from("dealers")
      .select("profile_id")
      .eq("id", dealerId)
      .single();
    resolvedUserId = dealer?.profile_id ?? null;
  }

  if (!resolvedUserId) return json({ sent: 0, reason: "no target user" });

  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", resolvedUserId);

  if (subsErr) return json({ error: subsErr.message }, 500);
  if (!subs?.length) return json({ sent: 0, reason: "no subscriptions" });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        JSON.stringify({ title, body, url, tag, icon: "/favicon.svg" })
      )
    )
  );

  // Clean up expired / gone subscriptions
  const expiredEndpoints = subs
    .filter((_, i) => {
      const r = results[i];
      return (
        r.status === "rejected" &&
        (r.reason?.statusCode === 410 || r.reason?.statusCode === 404)
      );
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
