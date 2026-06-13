import { loadStripe, type Stripe } from "@stripe/stripe-js";

const env = import.meta.env as Record<string, string | undefined>;
const key = env?.VITE_STRIPE_PUBLISHABLE_KEY;

if (!key) {
  console.warn("Missing VITE_STRIPE_PUBLISHABLE_KEY — card payments will be unavailable.");
}

export const stripePromise: Promise<Stripe | null> = key
  ? loadStripe(key)
  : Promise.resolve(null);
