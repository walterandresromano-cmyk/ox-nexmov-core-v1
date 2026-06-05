const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}`);
  return res.json();
}

async function supabasePost(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase POST ${path} → ${res.status}`);
  return res;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Server not configured" });
  }

  const token = String(req.headers.authorization || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return res.status(401).json({ error: "Missing token" });

  let step = "auth";
  try {
    // Verify token and get user
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!userRes.ok) return res.status(401).json({ step, error: "Invalid token" });
    const user = await userRes.json();
    const userId = user?.id;
    if (!userId) return res.status(401).json({ step, error: "Invalid user" });

    // Resolve dealer.id (bigint) via dealers.profile_id = auth user uuid
    step = "dealer_lookup";
    const dealerRows = await supabaseGet(
      `/rest/v1/dealers?profile_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`
    );
    const dealerId = dealerRows?.[0]?.id;
    if (!dealerId)
      return res.status(404).json({ step, error: "Dealer not found" });

    // Validate subscription payload
    step = "payload_validation";
    const subscription = req.body;
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ step, error: "Invalid subscription payload" });
    }

    // Store subscription — dealer_id is bigint
    step = "db_insert";
    await supabasePost("/rest/v1/push_subscriptions", {
      dealer_id: dealerId,
      endpoint,
      p256dh,
      auth,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ step, error: err.message || "Internal error" });
  }
}
