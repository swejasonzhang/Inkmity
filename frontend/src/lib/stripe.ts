import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Read defensively: import.meta.env is undefined under jest, and a missing key
// should fail the payment step gracefully rather than crash the whole app.
const key = (import.meta as any)?.env?.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
if (!key && (import.meta as any)?.env) {
  console.warn("Missing VITE_STRIPE_PUBLISHABLE_KEY — card payments will be unavailable.");
}

export const stripePromise: Promise<Stripe | null> = key
  ? loadStripe(key)
  : Promise.resolve(null);