import Stripe from "stripe";

// Allow test environment to use mock key
if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== "test") {
  throw new Error("STRIPE_SECRET_KEY not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  apiVersion: "2024-06-20",
});