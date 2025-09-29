import express from "express";
import Stripe from "stripe";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const PRICE_BY_KEY = {
  "client:amateur:monthly": process.env.PRICE_CLIENT_AMATEUR_MONTHLY,
  "client:amateur:yearly": process.env.PRICE_CLIENT_AMATEUR_YEARLY,
  "client:pro:monthly": process.env.PRICE_CLIENT_PRO_MONTHLY,
  "client:pro:yearly": process.env.PRICE_CLIENT_PRO_YEARLY,
  "client:elite:monthly": process.env.PRICE_CLIENT_ELITE_MONTHLY,
  "client:elite:yearly": process.env.PRICE_CLIENT_ELITE_YEARLY,

  "artist:amateur:monthly": process.env.PRICE_ARTIST_AMATEUR_MONTHLY,
  "artist:amateur:yearly": process.env.PRICE_ARTIST_AMATEUR_YEARLY,
  "artist:pro:monthly": process.env.PRICE_ARTIST_PRO_MONTHLY,
  "artist:pro:yearly": process.env.PRICE_ARTIST_PRO_YEARLY,
  "artist:elite:monthly": process.env.PRICE_ARTIST_ELITE_MONTHLY,
  "artist:elite:yearly": process.env.PRICE_ARTIST_ELITE_YEARLY,
};

router.post("/create-checkout-session", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const {
      role,
      tier,
      cadence,
      productType,
      successUrl,
      cancelUrl,
      clerkUserId,
    } = req.body || {};

    if (!role || !tier) return res.status(400).send("Missing role/tier.");
    if (productType !== "onetime" && productType !== "subscription") {
      return res.status(400).send("Bad productType.");
    }

    const key = `${role}:${tier}:${cadence || "monthly"}`;
    const priceId =
      productType === "subscription"
        ? PRICE_BY_KEY[key]
        : process.env.PRICE_ONETIME_TOKEN;

    if (!priceId) return res.status(400).send("No price configured.");

    const session = await stripe.checkout.sessions.create({
      mode: productType === "subscription" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        successUrl || `${process.env.APP_URL}/upgrade?status=success`,
      cancel_url:
        cancelUrl || `${process.env.APP_URL}/upgrade?status=cancelled`,
      client_reference_id: clerkUserId,
      customer_creation: "always",
      metadata: { role, tier, cadence: cadence || "monthly", productType },
    });

    return res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return res.status(500).send("Failed to create checkout session");
  }
});

export default router;