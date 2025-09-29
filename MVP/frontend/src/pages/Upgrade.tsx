import React, { useEffect, useMemo, useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import PlanCard, { Cadence } from "../components/upgrade/PlanCard";
import ControlsBar from "../components/upgrade/ControlsBar";
import OneTimeOptions from "../components/upgrade/OneTimeOptions";

type Tier = "free" | "amateur" | "pro" | "elite";
type Role = "client" | "artist";

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
    yearly: 84,
    blurb: "More searches with access to gallery.",
    perks: ["10 searches per day", "Gallery unlocked", "Chatbot locked"],
    cta: "Upgrade to Amateur",
  },
  pro: {
    label: "Pro",
    monthly: 25,
    yearly: 210,
    blurb: "For active clients who want more power.",
    perks: ["25 searches per day", "Gallery unlocked", "Chatbot unlocked"],
    cta: "Upgrade to Pro",
    popular: true,
  },
  elite: {
    label: "Elite",
    monthly: 50,
    yearly: 420,
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
    yearly: 84,
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
    yearly: 210,
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
    yearly: 420,
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

  const currentTier: Tier = useMemo(() => {
    const t = String(user?.publicMetadata?.tier || "free").toLowerCase();
    return (["free", "amateur", "pro", "elite"] as const).includes(t as Tier)
      ? (t as Tier)
      : "free";
  }, [user?.publicMetadata?.tier]);

  const userCadenceRaw = String(
    user?.publicMetadata?.billingCadence || "monthly"
  ).toLowerCase() as Cadence;
  const initialCadence: Cadence =
    userCadenceRaw === "monthly" ? "yearly" : "monthly";

  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [cadence, setCadence] = useState<Cadence>(initialCadence);
  const [cancelWhen, setCancelWhen] = useState<
    "current_period_end" | "next_period_end"
  >("current_period_end");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [cadence]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const priceLabel = (plan: Plan) => {
    if (cadence === "monthly")
      return plan.monthly === 0 ? "$0/mo" : `$${plan.monthly}/mo`;
    const y = plan.yearly ?? Math.round(plan.monthly * 12 * 0.7);
    return y === 0 ? "$0/yr" : `$${y}/yr`;
  };

  const altPriceLabel = (plan: Plan) => {
    if (cadence === "monthly") {
      const y = plan.yearly ?? Math.round(plan.monthly * 12 * 0.7);
      return y === 0 ? "" : `or $${y}/yr`;
    } else {
      const y = plan.yearly ?? Math.round(plan.monthly * 12 * 0.7);
      const effMonthly = y / 12;
      return effMonthly === 0 ? "" : `or ~$${Math.round(effMonthly)}/mo`;
    }
  };

  const onCheckout = async (
    tier: Tier,
    productType: "subscription" | "onetime" = "subscription"
  ) => {
    if (pricing[tier].locked) return;
    scrollToTop();
    try {
      setLoadingKey(`${tier}:${productType}`);
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
      if (!res.ok)
        throw new Error((await res.text()) || "Failed to start checkout");
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      alert(e?.message || "Checkout failed");
    } finally {
      setLoadingKey(null);
    }
  };

  const onManageBilling = async () => {
    scrollToTop();
    try {
      setLoadingKey("portal");
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
      if (!res.ok)
        throw new Error((await res.text()) || "Failed to open billing portal");
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      alert(e?.message || "Could not open billing portal");
    } finally {
      setLoadingKey(null);
    }
  };

  const onScheduleUnsubscribe = async () => {
    scrollToTop();
    try {
      setLoadingKey("schedule-cancel");
      const token = await getToken();
      const res = await fetch("/api/billing/schedule-cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ when: cancelWhen }),
      });
      if (!res.ok)
        throw new Error(
          (await res.text()) || "Failed to schedule cancellation"
        );
      alert("Your subscription cancellation has been scheduled.");
    } catch (e: any) {
      alert(e?.message || "Could not schedule cancellation");
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <ControlsBar
          role={role}
          showManage={currentTier !== "free"}
          cadence={cadence}
          setCadence={setCadence}
          cancelWhen={cancelWhen}
          setCancelWhen={setCancelWhen}
          onManageBilling={onManageBilling}
          onScheduleUnsubscribe={onScheduleUnsubscribe}
          loadingKey={loadingKey}
        />

        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          {ORDER.map((tier) => {
            const plan = pricing[tier];
            const isCurrent = currentTier === tier;

            return (
              <PlanCard
                key={`${role}-${tier}`}
                label={plan.label}
                blurb={plan.blurb}
                perks={plan.perks}
                popular={plan.popular}
                locked={plan.locked}
                isCurrent={isCurrent}
                priceMain={priceLabel(plan)}
                priceAlt={altPriceLabel(plan)}
                onCheckout={() => onCheckout(tier, "subscription")}
                onManageBilling={
                  isCurrent && tier !== "free" ? onManageBilling : undefined
                }
                managing={
                  loadingKey === `${tier}:subscription` ||
                  loadingKey === "portal"
                }
              />
            );
          })}
        </div>

        <OneTimeOptions
          role={role}
          onDayPass={() => onCheckout("pro", "onetime")}
          onSpotlight={() => onCheckout("pro", "onetime")}
          loadingKey={loadingKey}
          currentCadence={cadence}
          onToggleCadence={() =>
            setCadence((c) => (c === "yearly" ? "monthly" : "yearly"))
          }
        />

        <p className="text-center text-sm md:text-base text-white/60 mt-10">
          You can change or cancel your subscription anytime.
        </p>
      </div>
    </div>
  );
};

export default Upgrade;
