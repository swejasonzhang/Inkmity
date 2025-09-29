import React from "react";
import type { Cadence } from "./PlanCard";

type OneTimeOptionsProps = {
  role: "client" | "artist";
  loadingKey: string | null;
  onDayPass: () => void;
  onSpotlight: () => void;
  currentCadence: Cadence;
  onToggleCadence: () => void;
};

const OneTimeOptions: React.FC<OneTimeOptionsProps> = ({
  role,
  onDayPass,
  onSpotlight,
  loadingKey,
  currentCadence,
  onToggleCadence,
}) => {
  const isYearly = currentCadence === "yearly";

  const switchLabel = isYearly ? "Switch to Monthly" : "Switch to Yearly";

  const saverTitle = isYearly ? "Monthly Flex" : "Yearly Saver";

  const saverTopLine = isYearly
    ? "Prefer to pay month-to-month instead of upfront? Switch to Monthly (flex) below."
    : "Pay once a year and save ~30% vs paying monthly. Toggle Yearly and pick your plan.";

  const saverExampleLine = isYearly ? (
    <>
      Example: Pro is <span className="font-semibold">$210/yr</span>{" "}
      (~<span className="font-semibold">$18/mo</span>) yearly or{" "}
      <span className="font-semibold">$25/mo</span> monthly.
    </>
  ) : (
    <>
      Example: Pro is <span className="font-semibold">$25/mo</span> monthly or{" "}
      <span className="font-semibold">$210/yr</span> yearly.
    </>
  );

  return (
    <section className="mt-14">
      <h2 className="text-2xl md:text-3xl font-extrabold text-center">
        One-time Options
      </h2>
      <p className="text-center text-white/70 mt-2">
        Not ready for a subscription? Grab a one-time boost.
      </p>

      <div className="grid gap-6 mt-8 sm:grid-cols-2">
        {role === "client" ? (
          <div className="rounded-3xl border border-white/20 bg-gray-900 p-8 md:p-10 flex flex-col items-center text-center">
            <div className="flex-1 w-full flex flex-col items-center justify-center gap-3">
              <h3 className="text-xl md:text-2xl font-bold">Day Pass</h3>
              <div className="text-3xl md:text-4xl font-extrabold">
                $5 / 24 hours
              </div>
              <ul className="mt-2 space-y-2 text-white/85">
                <li className="flex items-center gap-3 justify-center">
                  <span className="h-2 w-2 rounded-full bg-white/80" />
                  <span>Up to 30 artists in 24 hours</span>
                </li>
                <li className="flex items-center gap-3 justify-center">
                  <span className="h-2 w-2 rounded-full bg-white/80" />
                  <span>Gallery unlocked</span>
                </li>
                <li className="flex items-center gap-3 justify-center">
                  <span className="h-2 w-2 rounded-full bg-white/80" />
                  <span>Chatbot locked</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 w-full flex justify-center">
              <button
                onClick={onDayPass}
                disabled={loadingKey === "pro:onetime"}
                className={[
                  "w-full rounded-2xl border py-3 font-semibold transition max-w-sm",
                  loadingKey === "pro:onetime"
                    ? "border-white bg-white text-black"
                    : "border-white bg-black text-white hover:bg-gray-900",
                ].join(" ")}
              >
                {loadingKey === "pro:onetime" ? "Redirecting…" : "Get Day Pass"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/20 bg-gray-900 p-8 md:p-10 flex flex-col items-center text-center">
            <div className="flex-1 w-full flex flex-col items-center justify-center gap-3">
              <h3 className="text-xl md:text-2xl font-bold">Spotlight Boost</h3>
              <div className="text-3xl md:text-4xl font-extrabold">
                $15 / 7 days
              </div>
              <ul className="mt-2 space-y-2 text-white/85">
                <li className="flex items-center gap-3 justify-center">
                  <span className="h-2 w-2 rounded-full bg-white/80" />
                  <span>Featured bump for 7 days</span>
                </li>
                <li className="flex items-center gap-3 justify-center">
                  <span className="h-2 w-2 rounded-full bg-white/80" />
                  <span>Higher visibility in discovery</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 w-full flex justify-center">
              <button
                onClick={onSpotlight}
                disabled={loadingKey === "pro:onetime"}
                className={[
                  "w-full rounded-2xl border py-3 font-semibold transition max-w-sm",
                  loadingKey === "pro:onetime"
                    ? "border-white bg-white text-black"
                    : "border-white bg-black text-white hover:bg-gray-900",
                ].join(" ")}
              >
                {loadingKey === "pro:onetime"
                  ? "Redirecting…"
                  : "Get Spotlight Boost"}
              </button>
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-white/20 bg-gray-900 p-8 md:p-10 flex flex-col items-center text-center">
          <div className="flex-1 w-full flex flex-col items-center justify-center gap-3">
            <h3 className="text-xl md:text-2xl font-bold">{saverTitle}</h3>
            <div className="text-white/80">{saverTopLine}</div>
            <div className="text-white/70 text-sm">{saverExampleLine}</div>
          </div>

          <div className="mt-6 w-full flex justify-center">
            <button
              onClick={onToggleCadence}
              className="rounded-2xl border border-white px-4 py-2 bg-black hover:bg-gray-900 transition min-w-[200px]"
            >
              {switchLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OneTimeOptions;