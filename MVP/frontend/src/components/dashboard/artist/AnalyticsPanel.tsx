import { useMemo } from "react";

type KPI = { label: string; value: string | number; sublabel?: string };
type WeekPoint = { week: string; hoursTattooed: number; sessions: number; revenue: number };
type StyleRow = { style: string; share: number };
type LeadRow = { source: string; share: number };

type Props = {
  kpis?: KPI[];
  weeks?: WeekPoint[];
  styleMix?: StyleRow[];
  leadSources?: LeadRow[];
  mtd?: {
    noShowRate?: number;
    depositCapture?: number;
    avgSessionLenHrs?: number;
    revenuePerHour?: number;
    suppliesCostPerHour?: number;
    tipRate?: number;
    repeatClientRate?: number;
    bookingLeadDaysMedian?: number;
    touchUpRate?: number;
    aftercareIssuesRate?: number;
    utilization?: number;
  };
};

export default function AnalyticsPanel(props: Props) {
  const weeks: WeekPoint[] =
    props.weeks ?? [
      { week: "W-6", hoursTattooed: 18, sessions: 8, revenue: 5100 },
      { week: "W-5", hoursTattooed: 20, sessions: 9, revenue: 5600 },
      { week: "W-4", hoursTattooed: 16, sessions: 7, revenue: 4700 },
      { week: "W-3", hoursTattooed: 22, sessions: 9, revenue: 6000 },
      { week: "W-2", hoursTattooed: 24, sessions: 10, revenue: 6550 },
      { week: "W-1", hoursTattooed: 21, sessions: 9, revenue: 5980 },
    ];

  const styleMix: StyleRow[] =
    props.styleMix ?? [
      { style: "Flash", share: 0.34 },
      { style: "Custom", share: 0.46 },
      { style: "Black & Grey", share: 0.12 },
      { style: "Color", share: 0.08 },
    ];

  const leadSources: LeadRow[] =
    props.leadSources ?? [
      { source: "Instagram", share: 0.52 },
      { source: "Referral", share: 0.23 },
      { source: "Walk-in", share: 0.17 },
      { source: "Other", share: 0.08 },
    ];

  const mtd = {
    noShowRate: 0.06,
    depositCapture: 0.88,
    avgSessionLenHrs: 2.6,
    revenuePerHour: 275,
    suppliesCostPerHour: 28,
    tipRate: 0.21,
    repeatClientRate: 0.57,
    bookingLeadDaysMedian: 9,
    touchUpRate: 0.05,
    aftercareIssuesRate: 0.03,
    utilization: 0.64,
    ...(props.mtd ?? {}),
  };

  const kpis: KPI[] =
    props.kpis ?? [
      { label: "Hours (last week)", value: weeks[weeks.length - 1]?.hoursTattooed ?? 0 },
      { label: "Sessions (last week)", value: weeks[weeks.length - 1]?.sessions ?? 0 },
      { label: "Revenue/hr", value: `$${mtd.revenuePerHour}` },
      { label: "Supplies/hr", value: `$${mtd.suppliesCostPerHour}` },
      { label: "Avg session", value: `${mtd.avgSessionLenHrs}h` },
      { label: "Utilization", value: `${Math.round(mtd.utilization * 100)}%` },
    ];

  const maxHours = useMemo(
    () => Math.max(1, ...weeks.map((w) => w.hoursTattooed || 0)),
    [weeks]
  );

  const styleTotal = Math.max(1, styleMix.reduce((a, s) => a + s.share, 0));
  const leadTotal = Math.max(1, leadSources.reduce((a, s) => a + s.share, 0));
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-full max-w-screen-2xl mx-auto flex flex-col gap-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((k, i) => (
            <div
              key={i}
              className="rounded-2xl border border-app bg-elevated px-6 py-5 text-center"
            >
              <div className="text-sm text-muted-foreground">{k.label}</div>
              <div className="mt-1 text-3xl sm:text-4xl font-bold">{k.value}</div>
              {k.sublabel && (
                <div className="mt-1 text-sm text-muted-foreground">{k.sublabel}</div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-app bg-elevated p-6">
            <div className="flex items-baseline justify-between">
              <div className="text-base font-semibold">Hours on needle (last 6 weeks)</div>
              <div className="text-sm text-muted-foreground">Max {maxHours}h</div>
            </div>
            <div className="mt-5 flex items-end gap-4 h-56 justify-center">
              {weeks.map((w, i) => {
                const h = Math.max(8, Math.round((w.hoursTattooed / maxHours) * 192));
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div
                      className="w-10 rounded-t-lg bg-gradient-to-t from-white/10 to-white/40 border border-white/10"
                      style={{ height: `${h}px` }}
                      title={`${w.week}: ${w.hoursTattooed}h, ${w.sessions} sessions`}
                    />
                    <div className="mt-2 text-[11px] text-muted-foreground">{w.week}</div>
                    <div className="text-[11px] opacity-80">{w.sessions}x</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-card border border-app px-3 py-2 text-center">
                <div className="text-muted-foreground">Last week revenue</div>
                <div className="font-semibold">
                  ${weeks[weeks.length - 1]?.revenue.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg bg-card border border-app px-3 py-2 text-center">
                <div className="text-muted-foreground">No-show rate</div>
                <div className="font-semibold">{pct(mtd.noShowRate!)}</div>
              </div>
              <div className="rounded-lg bg-card border border-app px-3 py-2 text-center">
                <div className="text-muted-foreground">Deposit capture</div>
                <div className="font-semibold">{pct(mtd.depositCapture!)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-app bg-elevated p-6">
            <div className="text-base font-semibold">Shop ops — this month</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-card border border-app px-3 py-2 text-center">
                <div className="text-muted-foreground">Tip rate</div>
                <div className="font-semibold">{pct(mtd.tipRate!)}</div>
              </div>
              <div className="rounded-lg bg-card border border-app px-3 py-2 text-center">
                <div className="text-muted-foreground">Repeat clients</div>
                <div className="font-semibold">{pct(mtd.repeatClientRate!)}</div>
              </div>
              <div className="rounded-lg bg-card border border-app px-3 py-2 text-center">
                <div className="text-muted-foreground">Median lead time</div>
                <div className="font-semibold">{mtd.bookingLeadDaysMedian} days</div>
              </div>
              <div className="rounded-lg bg-card border border-app px-3 py-2 text-center">
                <div className="text-muted-foreground">Avg session length</div>
                <div className="font-semibold">{mtd.avgSessionLenHrs} h</div>
              </div>
              <div className="rounded-lg bg-card border border-app px-3 py-2 text-center">
                <div className="text-muted-foreground">Touch-up rate</div>
                <div className="font-semibold">{pct(mtd.touchUpRate!)}</div>
              </div>
              <div className="rounded-lg bg-card border border-app px-3 py-2 text-center">
                <div className="text-muted-foreground">Aftercare issues</div>
                <div className="font-semibold">{pct(mtd.aftercareIssuesRate!)}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-card border border-app px-3 py-2">
                <div className="text-muted-foreground text-center">Utilization</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-3 rounded-full bg-elevated border border-app overflow-hidden">
                    <div
                      className="h-full bg-white/40"
                      style={{ width: pct(mtd.utilization!) }}
                    />
                  </div>
                  <div className="w-12 text-right font-semibold">{pct(mtd.utilization!)}</div>
                </div>
              </div>
              <div className="rounded-lg bg-card border border-app px-3 py-2">
                <div className="text-muted-foreground text-center">Net $/hr</div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 max-w-full">
                  <span className="text-[12px] text-muted-foreground whitespace-nowrap">Rev</span>
                  <span className="font-semibold whitespace-nowrap">${mtd.revenuePerHour}</span>
                  <span className="text-[12px] text-muted-foreground whitespace-nowrap">– Supplies</span>
                  <span className="font-semibold whitespace-nowrap">${mtd.suppliesCostPerHour}</span>
                  <span className="text-[12px] text-muted-foreground">=</span>
                  <span className="font-bold whitespace-nowrap">
                    ${Math.max(0, (mtd.revenuePerHour ?? 0) - (mtd.suppliesCostPerHour ?? 0)).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-app bg-elevated p-6">
            <div className="text-base font-semibold">Style mix</div>
            <div className="mt-4 space-y-3">
              {styleMix.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-28 text-[12px] text-muted-foreground">{s.style}</div>
                  <div className="flex-1 h-3 rounded-full bg-card border border-app overflow-hidden">
                    <div
                      className="h-full bg-white/40"
                      style={{ width: `${(s.share / styleTotal) * 100}%` }}
                      title={pct(s.share)}
                    />
                  </div>
                  <div className="w-12 text-right text-[12px]">{pct(s.share)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-app bg-elevated p-6">
            <div className="text-base font-semibold">Lead sources</div>
            <div className="mt-4 space-y-3">
              {leadSources.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-28 text-[12px] text-muted-foreground">{s.source}</div>
                  <div className="flex-1 h-3 rounded-full bg-card border border-app overflow-hidden">
                    <div
                      className="h-full bg-white/40"
                      style={{ width: `${(s.share / leadTotal) * 100}%` }}
                      title={pct(s.share)}
                    />
                  </div>
                  <div className="w-12 text-right text-[12px]">{pct(s.share)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-app bg-elevated p-6">
          <div className="text-base font-semibold">Notes to watch</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-card border border-app px-3 py-2">
              <div className="text-muted-foreground">Minimum charge adherence</div>
              <div className="mt-1 text-[12px] opacity-80">
                Spot audit last week: 100% (no below-min tickets)
              </div>
            </div>
            <div className="rounded-lg bg-card border border-app px-3 py-2">
              <div className="text-muted-foreground">Healed photo returns</div>
              <div className="mt-1 text-[12px] opacity-80">
                Ask at checkout; offer 10% off next for healed pics
              </div>
            </div>
            <div className="rounded-lg bg-card border border-app px-3 py-2">
              <div className="text-muted-foreground">Aftercare sales</div>
              <div className="mt-1 text-[12px] opacity-80">
                Add upsell: balm/film bundles near checkout
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}