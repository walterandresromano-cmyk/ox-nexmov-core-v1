// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
// Saves a Web Push subscription for the authenticated dealer.
// Resolves dealer_id from dealers WHERE profile_id = auth.uid().
// Deploy WITHOUT --no-verify-jwt.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  const authHeader = req.headers.get("Authorization") ?? "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  // Resolve dealer_id — only dealers can subscribe
  const { data: dealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!dealer?.id) {
    return json({ error: "Only dealers can register push subscriptions" }, 403);
  }

  // Parse PushSubscription from browser
  let sub;
  try {
    sub = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return json({ error: "Missing subscription fields" }, 400);
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        dealer_id:  dealer.id,
        endpoint:   sub.endpoint,
        p256dh:     sub.keys.p256dh,
        auth:       sub.keys.auth,          // column is "auth", not "auth_key"
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dealer_id,endpoint" }
    );

  if (error) return json({ error: error.message, step: "upsert" }, 500);

  return json({ ok: true });
});
