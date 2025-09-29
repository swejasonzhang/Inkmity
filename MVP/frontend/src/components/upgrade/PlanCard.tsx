import React from "react";

export type Cadence = "monthly" | "yearly";

type PlanCardProps = {
  label: string;
  blurb: string;
  perks: string[];
  popular?: boolean;
  locked?: boolean;
  isCurrent: boolean;
  priceMain: string;
  priceAlt: string;
  onCheckout: () => void;
  onManageBilling?: () => void;
  managing?: boolean;
};

const PlanCard: React.FC<PlanCardProps> = ({
  label,
  blurb,
  perks,
  popular,
  locked,
  isCurrent,
  priceMain,
  priceAlt,
  onCheckout,
  onManageBilling,
  managing,
}) => {
  const disabled = locked || isCurrent;

  return (
    <div
      className={[
        "rounded-3xl border p-8 md:p-10 flex flex-col",
        popular ? "border-white shadow-2xl" : "border-white/20",
        isCurrent && !locked ? "ring-2 ring-white" : "",
        "bg-gray-900",
      ].join(" ")}
    >
      <div className="h-7 md:h-8 mb-3 flex items-center justify-center">
        {popular ? (
          <div className="inline-flex items-center rounded-full border border-white/40 px-3 py-1 text-xs md:text-sm tracking-wide">
            Most Popular
          </div>
        ) : (
          <div className="invisible inline-flex items-center rounded-full border border-transparent px-3 py-1 text-xs md:text-sm">
            Most Popular
          </div>
        )}
      </div>

      <h3 className="text-2xl md:text-3xl font-bold">{label}</h3>

      <div className="mt-3">
        <div className="text-4xl md:text-5xl font-extrabold">{priceMain}</div>
        <div className="mt-1 h-5">
          {priceAlt ? (
            <div className="text-white/60 text-sm">{priceAlt}</div>
          ) : (
            <div className="h-5" />
          )}
        </div>
      </div>

      <p className="mt-3 text-white/80 text-base md:text-lg">{blurb}</p>

      <ul className="mt-6 space-y-3 text-base md:text-lg text-white/85">
        {perks.map((p) => (
          <li key={p} className="flex items-start gap-3">
            <span className="mt-2 h-2 w-2 rounded-full bg-white/80" />
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8 space-y-3">
        <button
          onClick={onCheckout}
          disabled={disabled || managing}
          className={[
            "w-full rounded-2xl border py-3.5 text-lg font-semibold transition",
            disabled
              ? "border-white/30 bg-gray-800 text-white/70 cursor-not-allowed"
              : managing
              ? "border-white bg-white text-black"
              : "border-white bg-black text-white hover:bg-gray-900",
          ].join(" ")}
        >
          {isCurrent ? "Current Plan" : managing ? "Redirecting…" : "Select"}
        </button>

        {isCurrent && !locked && onManageBilling && (
          <button
            onClick={onManageBilling}
            disabled={managing}
            className={[
              "w-full rounded-2xl border border-white/40 py-3 text-base font-semibold transition",
              managing
                ? "bg-white text-black"
                : "bg-gray-800 hover:bg-gray-700 text-white",
            ].join(" ")}
          >
            {managing ? "Opening Billing…" : "Manage Subscription"}
          </button>
        )}
      </div>
    </div>
  );
};

export default PlanCard;