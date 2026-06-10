import { loadStripe, type Stripe } from "@stripe/stripe-js";

const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
if (!key) throw new Error("Missing VITE_STRIPE_PUBLISHABLE_KEY");

export const stripePromise: Promise<Stripe | null> = loadStripe(key);