import React from "react";

type Cadence = "monthly" | "yearly";

type OneTimeOptionsProps = {
  role: "client" | "artist";
  loadingKey: string | null;
  onDayPass: () => void;
  onSpotlight: () => void;
  cadence: Cadence;
  onSwitchCadence: (c: Cadence) => void;
};

const OneTimeOptions: React.FC<OneTimeOptionsProps> = ({
  role,
  onDayPass,
  onSpotlight,
  loadingKey,
  cadence,
  onSwitchCadence,
}) => {
  const nextCadence: Cadence = cadence === "yearly" ? "monthly" : "yearly";
  const switchLabel =
    nextCadence === "yearly" ? "Switch to Yearly" : "Switch to Monthly";

  return (
    <section className="mt-14">
      <div className="mx-auto max-w-6xl flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold">
          One-time Options
        </h2>
        <p className="text-white/70 mt-2">
          Not ready for a subscription? Grab a one-time boost.
        </p>

        <div className="grid gap-6 mt-8 sm:grid-cols-2 place-items-center place-content-center min-h-[50vh] w-full">
          {role === "client" ? (
            <div className="rounded-3xl border border-white/20 bg-gray-900 p-8 md:p-10 flex flex-col items-center text-center w-full max-w-[520px]">
              <h3 className="text-xl md:text-2xl font-bold">Day Pass</h3>
              <div className="mt-2 text-3xl md:text-4xl font-extrabold">
                $5 / 24 hours
              </div>
              <ul className="mt-5 space-y-2 text-white/85">
                <li className="flex items-start gap-3 justify-center">
                  <span className="mt-2 h-2 w-2 rounded-full bg-white/80" />
                  <span>Up to 30 artists in 24 hours</span>
                </li>
                <li className="flex items-start gap-3 justify-center">
                  <span className="mt-2 h-2 w-2 rounded-full bg-white/80" />
                  <span>Gallery unlocked</span>
                </li>
                <li className="flex items-start gap-3 justify-center">
                  <span className="mt-2 h-2 w-2 rounded-full bg-white/80" />
                  <span>Chatbot locked</span>
                </li>
              </ul>
              <div className="mt-auto pt-6 w-full max-w-sm mx-auto">
                <button
                  onClick={onDayPass}
                  disabled={loadingKey === "pro:onetime"}
                  className={[
                    "w-full rounded-2xl border py-3 font-semibold transition",
                    loadingKey === "pro:onetime"
                      ? "border-white bg-white text-black"
                      : "border-white bg-black text-white hover:bg-gray-900",
                  ].join(" ")}
                >
                  {loadingKey === "pro:onetime"
                    ? "Redirecting…"
                    : "Get Day Pass"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/20 bg-gray-900 p-8 md:p-10 flex flex-col items-center text-center w-full max-w-[520px]">
              <h3 className="text-xl md:text-2xl font-bold">Spotlight Boost</h3>
              <div className="mt-2 text-3xl md:text-4xl font-extrabold">
                $15 / 7 days
              </div>
              <ul className="mt-5 space-y-2 text-white/85">
                <li className="flex items-start gap-3 justify-center">
                  <span className="mt-2 h-2 w-2 rounded-full bg-white/80" />
                  <span>Featured bump for 7 days</span>
                </li>
                <li className="flex items-start gap-3 justify-center">
                  <span className="mt-2 h-2 w-2 rounded-full bg-white/80" />
                  <span>Higher visibility in discovery</span>
                </li>
              </ul>
              <div className="mt-auto pt-6 w-full max-w-sm mx-auto">
                <button
                  onClick={onSpotlight}
                  disabled={loadingKey === "pro:onetime"}
                  className={[
                    "w-full rounded-2xl border py-3 font-semibold transition",
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

          <div className="rounded-3xl border border-white/20 bg-gray-900 p-8 md:p-10 w-full max-w-[520px] flex flex-col items-center text-center">
            <h3 className="text-xl md:text-2xl font-bold">Yearly Saver</h3>
            <div className="mt-2 text-white/80">
              Pay once a year and save ~30% vs paying monthly. Toggle at the top
              and pick your plan.
            </div>
            <div className="mt-5 text-white/70 text-sm">
              Example: Pro is <span className="font-semibold">$25/mo</span>{" "}
              monthly or <span className="font-semibold">$210/yr</span> yearly.
            </div>
            <div className="mt-6 w-full max-w-sm mx-auto">
              <button
                onClick={() => onSwitchCadence(nextCadence)}
                className="w-full rounded-2xl border border-white px-4 py-2 bg-black hover:bg-gray-900 transition"
              >
                {switchLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OneTimeOptions;