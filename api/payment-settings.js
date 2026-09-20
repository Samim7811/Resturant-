const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

async function getUser(req) {
  const auth = req.headers.authorization || "";

  if (!auth.startsWith("Bearer ")) {
    return null;
  }

  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: auth
      }
    }
  );

  if (!response.ok) return null;

  return await response.json();
}

async function getRestaurantId(userId) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=restaurant_id`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!response.ok) return null;

  const rows = await response.json();
  return rows?.[0]?.restaurant_id || null;
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: "Payment API environment variables are not configured."
    });
  }

  try {
    const user = await getUser(req);

    if (!user?.id) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    const restaurantId = await getRestaurantId(user.id);

    if (!restaurantId) {
      return res.status(403).json({
        error: "Admin profile is not connected to a restaurant."
      });
    }

    if (req.method === "GET") {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/payment_settings?restaurant_id=eq.${encodeURIComponent(restaurantId)}&select=id,restaurant_id,provider,enabled,environment,app_id,merchant_id,salt_index,payment_link,created_at,updated_at`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        }
      );

      const rows = await response.json();

      if (!response.ok) {
        return res.status(500).json({
          error: rows?.message || "Could not load payment settings."
        });
      }

      return res.status(200).json(rows?.[0] || null);
    }

    if (req.method === "POST") {
      const body = req.body || {};

      const payload = {
        restaurant_id: restaurantId,
        provider: body.provider || "manual",
        enabled: body.enabled === true,
        environment: body.environment || "sandbox",
        app_id: body.app_id || null,
        merchant_id: body.merchant_id || null,
        salt_index: body.salt_index || null,
        payment_link: body.payment_link || null,
        updated_at: new Date().toISOString()
      };

      if (body.secret_key) {
        payload.secret_key = body.secret_key;
      }

      if (body.salt_key) {
        payload.salt_key = body.salt_key;
      }

      if (body.webhook_secret) {
        payload.webhook_secret = body.webhook_secret;
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/payment_settings?on_conflict=restaurant_id`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal"
          },
          body: JSON.stringify(payload)
        }
      );

      const text = await response.text();

      if (!response.ok) {
        return res.status(500).json({
          error: text || "Could not save payment settings."
        });
      }

      return res.status(200).json({
        ok: true,
        message: "Payment settings saved securely."
      });
    }

    return res.status(405).json({
      error: "Method not allowed"
    });

  } catch (error) {
    console.error("PAYMENT SETTINGS API ERROR:", error);

    return res.status(500).json({
      error: "Payment settings API failed."
    });
  }
}
