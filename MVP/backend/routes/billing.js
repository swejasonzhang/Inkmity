const express = require("express");
const Stripe = require("stripe");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const PRICE_BY_TIER = {
  amateur: process.env.STRIPE_PRICE_AMATEUR,
  pro: process.env.STRIPE_PRICE_PRO,
  elite: process.env.STRIPE_PRICE_ELITE,
};

router.post("/create-checkout-session", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const { tier, successUrl, cancelUrl } = req.body || {};
    if (!tier || !PRICE_BY_TIER[tier]) {
      return res.status(400).send("Unknown or unsupported tier.");
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: PRICE_BY_TIER[tier], quantity: 1 }],
      success_url:
        successUrl || `${process.env.APP_URL}/upgrade?status=success`,
      cancel_url:
        cancelUrl || `${process.env.APP_URL}/upgrade?status=cancelled`,
    });

    return res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .send(e && e.message ? e.message : "Failed to create checkout session");
  }
});

module.exports = router;