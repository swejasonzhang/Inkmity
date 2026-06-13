import { loadStripe, type Stripe } from "@stripe/stripe-js";

const key = (import.meta as any)?.env?.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
if (!key && (import.meta as any)?.env) {
  console.warn("Missing VITE_STRIPE_PUBLISHABLE_KEY — card payments will be unavailable.");
}

export const stripePromise: Promise<Stripe | null> = key
  ? loadStripe(key)
  : Promise.resolve(null);