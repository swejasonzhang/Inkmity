import React from "react";
import { Link } from "react-router-dom";

type Cadence = "monthly" | "yearly";
type CancelWhen = "current_period_end" | "next_period_end";

type ControlsBarProps = {
  role: "client" | "artist";
  showManage: boolean;
  cadence: Cadence;
  setCadence: (c: Cadence) => void;
  cancelWhen: CancelWhen;
  setCancelWhen: (w: CancelWhen) => void;
  onManageBilling: () => void;
  onScheduleUnsubscribe: () => void;
  loadingKey: string | null;
};

const ControlsBar: React.FC<ControlsBarProps> = ({
  role,
  showManage,
  cadence,
  setCadence,
  cancelWhen,
  setCancelWhen,
  onManageBilling,
  onScheduleUnsubscribe,
  loadingKey,
}) => {
  return (
    <div className="flex flex-col gap-6 pb-6 md:pb-8 mb-6 md:mb-8">
      <div
        className="
          grid gap-3 items-center
          grid-cols-1
          md:grid-cols-[auto,1fr,auto]
        "
      >
        <div className="justify-self-start">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl border border-white px-4 py-2 text-base font-semibold bg-black hover:bg-gray-900 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <header className="text-center justify-self-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            {role === "artist"
              ? "Plans for Tattoo Artists"
              : "Plans for Tattoo Clients"}
          </h1>
          <p className="text-white/70 mt-3 text-base md:text-lg">
            {role === "artist"
              ? "Showcase your portfolio and get discovered by clients."
              : "Discover artists and find your next tattoo with powerful search."}
          </p>
        </header>

        <div className="justify-self-end">
          <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
            {showManage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onManageBilling}
                  disabled={loadingKey === "portal"}
                  className={[
                    "rounded-2xl border border-white px-4 py-2 text-base font-semibold bg-black hover:bg-gray-900 transition",
                    loadingKey === "portal" ? "opacity-70" : "",
                  ].join(" ")}
                >
                  {loadingKey === "portal"
                    ? "Opening Billing…"
                    : "Manage Subscription"}
                </button>

                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-black px-2 py-1">
                  <select
                    value={cancelWhen}
                    onChange={(e) =>
                      setCancelWhen(e.target.value as CancelWhen)
                    }
                    className="bg-transparent text-sm outline-none"
                  >
                    <option value="current_period_end">
                      Cancel at period end
                    </option>
                    <option value="next_period_end">
                      Cancel end of next period
                    </option>
                  </select>
                  <button
                    onClick={onScheduleUnsubscribe}
                    disabled={loadingKey === "schedule-cancel"}
                    className={[
                      "rounded-xl border border-white px-3 py-1.5 text-sm font-semibold bg-black hover:bg-gray-900 transition",
                      loadingKey === "schedule-cancel" ? "opacity-70" : "",
                    ].join(" ")}
                  >
                    {loadingKey === "schedule-cancel"
                      ? "Scheduling…"
                      : "Schedule Unsubscribe"}
                  </button>
                </div>
              </div>
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
                Yearly <span className="ml-1 text-xs opacity-80">(Save 30%)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsBar;