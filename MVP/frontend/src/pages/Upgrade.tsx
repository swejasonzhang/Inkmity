import React, { useMemo, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";

type Tier = "free" | "amateur" | "pro" | "elite";

const PRICING: Record<
  Tier,
  {
    label: string;
    price: string;
    blurb: string;
    slots: string;
    benefits: string[];
    cta: string;
    popular?: boolean;
  }
> = {
  free: {
    label: "Free",
    price: "$0/mo",
    blurb: "Get started and explore Inkmity.",
    slots: "Show up to 3 portfolio photos",
    benefits: ["Basic profile", "Messaging", "3 portfolio photos"],
    cta: "Current Plan",
  },
  amateur: {
    label: "Amateur",
    price: "$9/mo",
    blurb: "A bigger spotlight for growing artists.",
    slots: "Show up to 5 portfolio photos",
    benefits: [
      "Everything in Free",
      "Priority discovery",
      "5 portfolio photos",
    ],
    cta: "Upgrade to Amateur",
  },
  pro: {
    label: "Pro",
    price: "$19/mo",
    blurb: "Serious visibility with advanced tools.",
    slots: "Unlimited portfolio photos",
    benefits: [
      "Everything in Amateur",
      "Advanced discovery boosts",
      "Unlimited portfolio photos",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  elite: {
    label: "Elite",
    price: "$39/mo",
    blurb: "Maximum reach and premium placement.",
    slots: "Unlimited portfolio photos",
    benefits: [
      "Everything in Pro",
      "Top-tier placement",
      "Early feature access",
    ],
    cta: "Upgrade to Elite",
  },
};

const ORDER: Tier[] = ["free", "amateur", "pro", "elite"];

const Upgrade: React.FC = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<Tier | null>(null);

  const currentTier: Tier = useMemo(() => {
    const t = String(user?.publicMetadata?.tier || "free").toLowerCase();
    return (["free", "amateur", "pro", "elite"] as const).includes(t as Tier)
      ? (t as Tier)
      : "free";
  }, [user?.publicMetadata?.tier]);

  const onCheckout = async (tier: Tier) => {
    if (tier === "free") return;
    try {
      setLoadingPlan(tier);
      const token = await getToken();
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          tier,
          successUrl: `${window.location.origin}/upgrade?status=success`,
          cancelUrl: `${window.location.href}`,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create checkout session");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      alert(e?.message || "Checkout failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <header className="text-center mb-14">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
            Choose your plan
          </h1>
          <p className="text-white/70 mt-4 text-lg md:text-xl">
            Unlock more visibility and showcase more of your work.
          </p>
        </header>

        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          {ORDER.map((tier) => {
            const card = PRICING[tier];
            const isCurrent = currentTier === tier;
            const isLocked = tier === "free";
            const highlight = card.popular;

            return (
              <div
                key={tier}
                className={[
                  "rounded-3xl border p-8 md:p-10 flex flex-col",
                  highlight ? "border-white shadow-2xl" : "border-white/20",
                  isCurrent && !isLocked ? "ring-2 ring-white" : "",
                  "bg-gray-900",
                ].join(" ")}
              >
                {highlight && (
                  <div className="mb-4 inline-flex items-center self-start rounded-full border border-white/40 px-3 py-1 text-xs md:text-sm tracking-wide">
                    Most Popular
                  </div>
                )}

                <h3 className="text-2xl md:text-3xl font-bold">{card.label}</h3>
                <div className="mt-3 text-4xl md:text-5xl font-extrabold">
                  {card.price}
                </div>
                <p className="mt-3 text-white/80 text-base md:text-lg">
                  {card.blurb}
                </p>

                <div className="mt-5 text-base md:text-lg text-white/80">
                  <span className="font-semibold">{card.slots}</span>
                </div>

                <ul className="mt-6 space-y-3 text-base md:text-lg text-white/85">
                  {card.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-white/80" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  {isLocked ? (
                    <button
                      disabled
                      className="w-full rounded-2xl border border-white/30 bg-gray-800 py-3.5 text-white/70 text-lg cursor-not-allowed"
                    >
                      {card.cta}
                    </button>
                  ) : (
                    <button
                      onClick={() => onCheckout(tier)}
                      disabled={loadingPlan === tier || isCurrent}
                      className={[
                        "w-full rounded-2xl border py-3.5 text-lg font-semibold transition",
                        loadingPlan === tier
                          ? "border-white bg-white text-black"
                          : isCurrent
                          ? "border-white/30 bg-gray-800 text-white/70 cursor-not-allowed"
                          : "border-white bg-black text-white hover:bg-gray-900",
                      ].join(" ")}
                    >
                      {isCurrent
                        ? "Current Plan"
                        : loadingPlan === tier
                        ? "Redirecting…"
                        : card.cta}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm md:text-base text-white/60 mt-8">
          You can change or cancel your subscription anytime.
        </p>
      </div>
    </div>
  );
};

export default Upgrade;