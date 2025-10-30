import { loadStripe, type Stripe } from "@stripe/stripe-js";

export const stripePromise: Promise<Stripe | null> = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string
);