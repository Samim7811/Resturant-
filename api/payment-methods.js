const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "Payment API environment is not configured."
      });
    }

    const restaurantResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/restaurants?slug=eq.golden-thali&select=id`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const restaurants = await restaurantResponse.json();

    if (!restaurantResponse.ok || !restaurants?.[0]?.id) {
      return res.status(404).json({
        error: "Restaurant not found."
      });
    }

    const restaurantId = restaurants[0].id;

    const paymentResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/payment_settings?restaurant_id=eq.${encodeURIComponent(restaurantId)}&select=provider,enabled,environment`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );

    const rows = await paymentResponse.json();

    if (!paymentResponse.ok) {
      return res.status(500).json({
        error: "Could not read payment availability."
      });
    }

    const settings = rows?.[0];

    const onlineEnabled =
      Boolean(settings?.enabled) &&
      ["cashfree", "phonepe"].includes(settings?.provider);

    return res.status(200).json({
      cash_payment: true,
      online_payment: onlineEnabled,
      provider: onlineEnabled ? settings.provider : null,
      environment: onlineEnabled ? settings.environment : null
    });

  } catch (error) {
    console.error("PAYMENT METHODS ERROR:", error);

    return res.status(500).json({
      error: "Payment methods API failed."
    });
  }
}
