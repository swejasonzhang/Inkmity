import React, { useMemo, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

type Tier = "free" | "amateur" | "pro" | "elite";
type Role = "client" | "artist";
type Cadence = "monthly" | "yearly";

type Plan = {
  label: string;
  monthly: number;
  yearly?: number;
  blurb: string;
  perks: string[];
  cta: string;
  popular?: boolean;
  locked?: boolean;
};

type PricingTable = Record<Tier, Plan>;

const CLIENT_PLANS: PricingTable = {
  free: {
    label: "Free",
    monthly: 0,
    yearly: 0,
    blurb: "Explore artists and get a feel for Inkmity.",
    perks: ["5 searches per day", "Gallery locked", "Chatbot locked"],
    cta: "Current Plan",
    locked: true,
  },
  amateur: {
    label: "Amateur",
    monthly: 10,
    yearly: 96,
    blurb: "More searches with access to gallery.",
    perks: ["10 searches per day", "Gallery unlocked", "Chatbot locked"],
    cta: "Upgrade to Amateur",
  },
  pro: {
    label: "Pro",
    monthly: 25,
    yearly: 240,
    blurb: "For active clients who want more power.",
    perks: ["25 searches per day", "Gallery unlocked", "Chatbot unlocked"],
    cta: "Upgrade to Pro",
    popular: true,
  },
  elite: {
    label: "Elite",
    monthly: 50,
    yearly: 480,
    blurb: "Unlimited access and first look at new features.",
    perks: [
      "Unlimited searches",
      "Gallery unlocked",
      "Chatbot unlocked",
      "Future features: first look",
    ],
    cta: "Upgrade to Elite",
  },
};

const ARTIST_PLANS: PricingTable = {
  free: {
    label: "Free",
    monthly: 0,
    yearly: 0,
    blurb: "Create a profile and start being discoverable.",
    perks: ["3 portfolio images", "No featured placement"],
    cta: "Current Plan",
    locked: true,
  },
  amateur: {
    label: "Amateur",
    monthly: 10,
    yearly: 96,
    blurb: "Grow your presence with more uploads.",
    perks: [
      "5 portfolio images",
      "Featured placement (Top 100)",
      "7% commission",
    ],
    cta: "Upgrade to Amateur",
  },
  pro: {
    label: "Pro",
    monthly: 25,
    yearly: 240,
    blurb: "Boost visibility and lower commission.",
    perks: [
      "10 portfolio images",
      "Featured placement (Top 50)",
      "5% commission",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  elite: {
    label: "Elite",
    monthly: 50,
    yearly: 480,
    blurb: "Premium placement with 0% commission.",
    perks: [
      "15 portfolio images",
      "Featured placement (Top 25)",
      "0% commission",
    ],
    cta: "Upgrade to Elite",
  },
};

const ORDER: Tier[] = ["free", "amateur", "pro", "elite"];

const Upgrade: React.FC = () => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const role: Role = useMemo(() => {
    const r = String(user?.publicMetadata?.role || "client").toLowerCase();
    return r === "artist" ? "artist" : "client";
  }, [user?.publicMetadata?.role]);

  const pricing = role === "artist" ? ARTIST_PLANS : CLIENT_PLANS;

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [cadence, setCadence] = useState<Cadence>("monthly");

  const currentTier: Tier = useMemo(() => {
    const t = String(user?.publicMetadata?.tier || "free").toLowerCase();
    return (["free", "amateur", "pro", "elite"] as const).includes(t as Tier)
      ? (t as Tier)
      : "free";
  }, [user?.publicMetadata?.tier]);

  const priceLabel = (plan: Plan) => {
    if (cadence === "monthly")
      return plan.monthly === 0 ? "$0/mo" : `$${plan.monthly}/mo`;
    const y = plan.yearly ?? plan.monthly * 12;
    return y === 0 ? "$0/yr" : `$${y}/yr`;
  };

  const onCheckout = async (
    tier: Tier,
    productType: "subscription" | "onetime" = "subscription"
  ) => {
    if (pricing[tier].locked) return;
    try {
      setLoadingPlan(`${tier}:${productType}`);
      const token = await getToken();
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          role,
          tier,
          cadence,
          productType,
          successUrl: `${window.location.origin}/upgrade?status=success`,
          cancelUrl: `${window.location.href}`,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to start checkout");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      alert(e?.message || "Checkout failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  const onManageBilling = async () => {
    try {
      setLoadingPlan("portal");
      const token = await getToken();
      const res = await fetch("/api/billing/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/upgrade`,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to open billing portal");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      alert(e?.message || "Could not open billing portal");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl border border-white px-4 py-2 text-base font-semibold bg-black hover:bg-gray-900 transition"
          >
            ← Back to Dashboard
          </Link>

          <div className="flex items-center gap-3">
            {currentTier !== "free" && (
              <button
                onClick={onManageBilling}
                disabled={loadingPlan === "portal"}
                className={[
                  "rounded-2xl border border-white px-4 py-2 text-base font-semibold bg-black hover:bg-gray-900 transition",
                  loadingPlan === "portal" ? "opacity-70" : "",
                ].join(" ")}
              >
                {loadingPlan === "portal"
                  ? "Opening Billing…"
                  : "Manage / Cancel Subscription"}
              </button>
            )}

            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-black p-1">
              <button
                onClick={() => setCadence("monthly")}
                className={[
                  "px-4 py-2 rounded-xl text-sm font-semibold",
                  cadence === "monthly" ? "bg-white text-black" : "text-white",
                ].join(" ")}
              >
                Monthly
              </button>
              <button
                onClick={() => setCadence("yearly")}
                className={[
                  "px-4 py-2 rounded-xl text-sm font-semibold",
                  cadence === "yearly" ? "bg-white text-black" : "text-white",
                ].join(" ")}
              >
                Yearly{" "}
                <span className="ml-1 text-xs opacity-80">(Save 20%)</span>
              </button>
            </div>
          </div>
        </div>

        <header className="text-center mb-14">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
            {role === "artist"
              ? "Plans for Tattoo Artists"
              : "Plans for Tattoo Clients"}
          </h1>
          <p className="text-white/70 mt-4 text-lg md:text-xl">
            {role === "artist"
              ? "Showcase your portfolio and get discovered by clients."
              : "Discover artists and find your next tattoo with powerful search."}
          </p>
        </header>

        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          {ORDER.map((tier) => {
            const plan = pricing[tier];
            const isCurrent = currentTier === tier;
            const highlight = plan.popular;
            const disabled = plan.locked || isCurrent;

            return (
              <div
                key={`${role}-${tier}`}
                className={[
                  "rounded-3xl border p-8 md:p-10 flex flex-col",
                  highlight ? "border-white shadow-2xl" : "border-white/20",
                  isCurrent && !plan.locked ? "ring-2 ring-white" : "",
                  "bg-gray-900",
                ].join(" ")}
              >
                {highlight && (
                  <div className="mb-4 inline-flex items-center self-start rounded-full border border-white/40 px-3 py-1 text-xs md:text-sm tracking-wide">
                    Most Popular
                  </div>
                )}

                <h3 className="text-2xl md:text-3xl font-bold">{plan.label}</h3>
                <div className="mt-3 text-4xl md:text-5xl font-extrabold">
                  {priceLabel(plan)}
                </div>
                <p className="mt-3 text-white/80 text-base md:text-lg">
                  {plan.blurb}
                </p>

                <ul className="mt-6 space-y-3 text-base md:text-lg text-white/85">
                  {plan.perks.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-white/80" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8 space-y-3">
                  <button
                    onClick={() => onCheckout(tier, "subscription")}
                    disabled={
                      disabled || loadingPlan === `${tier}:subscription`
                    }
                    className={[
                      "w-full rounded-2xl border py-3.5 text-lg font-semibold transition",
                      disabled
                        ? "border-white/30 bg-gray-800 text-white/70 cursor-not-allowed"
                        : loadingPlan === `${tier}:subscription`
                        ? "border-white bg-white text-black"
                        : "border-white bg-black text-white hover:bg-gray-900",
                    ].join(" ")}
                  >
                    {isCurrent
                      ? "Current Plan"
                      : loadingPlan === `${tier}:subscription`
                      ? "Redirecting…"
                      : plan.cta}
                  </button>

                  {isCurrent && tier !== "free" && (
                    <button
                      onClick={onManageBilling}
                      disabled={loadingPlan === "portal"}
                      className={[
                        "w-full rounded-2xl border border-white/40 py-3 text-base font-semibold transition",
                        loadingPlan === "portal"
                          ? "bg-white text-black"
                          : "bg-gray-800 hover:bg-gray-700 text-white",
                      ].join(" ")}
                    >
                      {loadingPlan === "portal"
                        ? "Opening Billing…"
                        : "Manage / Cancel Subscription"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <section className="mt-14">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center">
            One-time Options
          </h2>
          <p className="text-center text-white/70 mt-2">
            Not ready for a subscription? Grab a one-time boost.
          </p>

          <div className="grid gap-6 mt-8 sm:grid-cols-2">
            {role === "client" ? (
              <div className="rounded-3xl border border-white/20 bg-gray-900 p-8 md:p-10 flex flex-col">
                <h3 className="text-xl md:text-2xl font-bold">Day Pass</h3>
                <div className="mt-2 text-3xl md:text-4xl font-extrabold">
                  $3 / 24 hours
                </div>
                <ul className="mt-5 space-y-2 text-white/85">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-white/80" />
                    <span>Unlimited searches for 24 hours</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-white/80" />
                    <span>Gallery & chatbot unlocked</span>
                  </li>
                </ul>
                <div className="mt-auto pt-6">
                  <button
                    onClick={() => onCheckout("pro", "onetime")}
                    disabled={loadingPlan === "pro:onetime"}
                    className={[
                      "w-full rounded-2xl border py-3 font-semibold transition",
                      loadingPlan === "pro:onetime"
                        ? "border-white bg-white text-black"
                        : "border-white bg-black text-white hover:bg-gray-900",
                    ].join(" ")}
                  >
                    {loadingPlan === "pro:onetime"
                      ? "Redirecting…"
                      : "Get Day Pass"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/20 bg-gray-900 p-8 md:p-10 flex flex-col">
                <h3 className="text-xl md:text-2xl font-bold">
                  Spotlight Boost
                </h3>
                <div className="mt-2 text-3xl md:text-4xl font-extrabold">
                  $15 / 7 days
                </div>
                <ul className="mt-5 space-y-2 text-white/85">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-white/80" />
                    <span>Featured bump for 7 days</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-white/80" />
                    <span>Higher visibility in discovery</span>
                  </li>
                </ul>
                <div className="mt-auto pt-6">
                  <button
                    onClick={() => onCheckout("pro", "onetime")}
                    disabled={loadingPlan === "pro:onetime"}
                    className={[
                      "w-full rounded-2xl border py-3 font-semibold transition",
                      loadingPlan === "pro:onetime"
                        ? "border-white bg-white text-black"
                        : "border-white bg-black text-white hover:bg-gray-900",
                    ].join(" ")}
                  >
                    {loadingPlan === "pro:onetime"
                      ? "Redirecting…"
                      : "Get Spotlight Boost"}
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-white/20 bg-gray-900 p-8 md:p-10">
              <h3 className="text-xl md:text-2xl font-bold">Yearly Saver</h3>
              <div className="mt-2 text-white/80">
                Pay once a year and save ~20% vs paying monthly. Toggle “Yearly”
                at the top and pick your plan.
              </div>
              <div className="mt-5 text-white/70 text-sm">
                Example: {role === "client" ? "Pro" : "Pro"} is{" "}
                <span className="font-semibold">$25/mo</span> monthly or{" "}
                <span className="font-semibold">$240/yr</span> yearly.
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setCadence("yearly")}
                  className="rounded-2xl border border-white px-4 py-2 bg-black hover:bg-gray-900 transition"
                >
                  Switch to Yearly
                </button>
              </div>
            </div>
          </div>
        </section>

        <p className="text-center text-sm md:text-base text-white/60 mt-10">
          You can change or cancel your subscription anytime.
        </p>
      </div>
    </div>
  );
};

export default Upgrade;
