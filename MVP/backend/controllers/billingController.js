import { stripe } from "../lib/stripe.js";

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

async function findCustomerId({ customerId, clerkUserId, email }) {
  if (customerId) return customerId;

  if (clerkUserId) {
    const foundByMeta = await stripe.customers.search({
      query: `metadata['clerkUserId']:'${clerkUserId}'`,
      limit: 1,
    });
    if (foundByMeta.data[0]?.id) return foundByMeta.data[0].id;
  }

  if (email) {
    const foundByEmail = await stripe.customers.search({
      query: `email:'${email}'`,
      limit: 1,
    });
    if (foundByEmail.data[0]?.id) return foundByEmail.data[0].id;
  }

  return undefined;
}

export async function createCheckoutSession(req, res) {
  try {
    const {
      role,
      tier,
      cadence = "monthly",
      productType,
      successUrl,
      cancelUrl,
      clerkUserId, 
      customerId, 
      email, 
    } = req.body || {};

    if (!role || !tier) return res.status(400).send("Missing role/tier.");
    if (productType !== "onetime" && productType !== "subscription") {
      return res.status(400).send("Bad productType.");
    }

    const key = `${role}:${tier}:${cadence}`;
    const priceId =
      productType === "subscription"
        ? PRICE_BY_KEY[key]
        : process.env.PRICE_ONETIME_TOKEN;

    if (!priceId) return res.status(400).send("No price configured.");

    const foundCustomerId = await findCustomerId({
      customerId,
      clerkUserId,
      email,
    });

    const session = await stripe.checkout.sessions.create({
      mode: productType === "subscription" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        successUrl || `${process.env.APP_URL}/upgrade?status=success`,
      cancel_url:
        cancelUrl || `${process.env.APP_URL}/upgrade?status=cancelled`,

      customer: foundCustomerId,
      customer_creation: foundCustomerId ? undefined : "always",

      client_reference_id: clerkUserId,
      allow_promotion_codes: true,
      metadata: { role, tier, cadence, productType, clerkUserId },
      subscription_data:
        productType === "subscription"
          ? { metadata: { role, tier, cadence, productType, clerkUserId } }
          : undefined,
    });

    return res.json({ url: session.url });
  } catch (e) {
    console.error("createCheckoutSession error:", e?.message, e);
    return res.status(500).send("Failed to create checkout session");
  }
}

export async function createPortalSession(req, res) {
  try {
    const { customerId, clerkUserId, email, returnUrl } = req.body || {};

    const foundCustomerId = await findCustomerId({
      customerId,
      clerkUserId,
      email,
    });
    if (!foundCustomerId) return res.status(400).send("Missing customerId.");

    const session = await stripe.billingPortal.sessions.create({
      customer: foundCustomerId,
      return_url: returnUrl || `${process.env.APP_URL}/upgrade`,
    });

    return res.json({ url: session.url });
  } catch (e) {
    console.error("createPortalSession error:", e?.message, e);
    return res.status(500).send("Failed to open billing portal");
  }
}

export async function scheduleCancel(req, res) {
  try {
    const { when, subscriptionId, customerId, clerkUserId, email } =
      req.body || {};
    if (when !== "current_period_end" && when !== "next_period_end") {
      return res.status(400).send("Bad 'when' value.");
    }

    let subId = subscriptionId;

    if (!subId) {
      const foundCustomerId = await findCustomerId({
        customerId,
        clerkUserId,
        email,
      });
      if (!foundCustomerId)
        return res.status(400).send("Missing subscriptionId or customer.");

      const subs = await stripe.subscriptions.list({
        customer: foundCustomerId,
        status: "all",
        limit: 10,
      });
      const activeLike = subs.data.find((s) =>
        ["active", "trialing", "past_due", "unpaid"].includes(s.status)
      );
      if (!activeLike)
        return res
          .status(404)
          .send("No active subscription found for customer.");
      subId = activeLike.id;
    }

    if (when === "current_period_end") {
      await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    } else {
      const sub = await stripe.subscriptions.retrieve(subId);
      if (!sub.current_period_end) {
        return res.status(400).send("Subscription missing current period end.");
      }
      const interval = sub.items?.data?.[0]?.plan?.interval; 
      const seconds = interval === "year" ? 365 * 24 * 3600 : 30 * 24 * 3600;
      await stripe.subscriptions.update(subId, {
        cancel_at: sub.current_period_end + seconds,
      });
    }

    return res.json({ ok: true, subscriptionId: subId });
  } catch (e) {
    console.error("scheduleCancel error:", e?.message, e);
    return res.status(500).send("Failed to schedule cancellation");
  }
}