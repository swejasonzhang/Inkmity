import { useMemo, useState } from "react";

type KPI = { label: string; value: string | number; sublabel?: string };
type DayData = { day: string; hours: number };
type WeekPoint = { week: string; hoursTattooed: number; sessions: number; revenue: number; days: DayData[] };
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
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const weeks: WeekPoint[] =
    props.weeks ?? [
      { 
        week: "Week 1", 
        hoursTattooed: 22, 
        sessions: 9, 
        revenue: 6000,
        days: [
          { day: "M", hours: 4 },
          { day: "T", hours: 3 },
          { day: "W", hours: 5 },
          { day: "Th", hours: 4 },
          { day: "F", hours: 6 },
        ]
      },
      { 
        week: "Week 2", 
        hoursTattooed: 24, 
        sessions: 10, 
        revenue: 6550,
        days: [
          { day: "M", hours: 5 },
          { day: "T", hours: 4 },
          { day: "W", hours: 6 },
          { day: "Th", hours: 5 },
          { day: "F", hours: 4 },
        ]
      },
      { 
        week: "Week 3", 
        hoursTattooed: 21, 
        sessions: 9, 
        revenue: 5980,
        days: [
          { day: "M", hours: 3 },
          { day: "T", hours: 5 },
          { day: "W", hours: 4 },
          { day: "Th", hours: 5 },
          { day: "F", hours: 4 },
        ]
      },
      { 
        week: "Week 4", 
        hoursTattooed: 23, 
        sessions: 10, 
        revenue: 6200,
        days: [
          { day: "M", hours: 4 },
          { day: "T", hours: 5 },
          { day: "W", hours: 5 },
          { day: "Th", hours: 4 },
          { day: "F", hours: 5 },
        ]
      },
    ];

  const styleMix: StyleRow[] = (
    props.styleMix ?? [
      { style: "Flash", share: 0.34 },
      { style: "Custom", share: 0.46 },
      { style: "Black & Grey", share: 0.12 },
      { style: "Color", share: 0.08 },
    ]
  ).sort((a, b) => b.share - a.share);

  const leadSources: LeadRow[] = (
    props.leadSources ?? [
      { source: "Instagram", share: 0.52 },
      { source: "Referral", share: 0.23 },
      { source: "Walk-in", share: 0.17 },
      { source: "Other", share: 0.08 },
    ]
  ).sort((a, b) => b.share - a.share);

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
      { label: "Hours", sublabel: "(week 4)", value: weeks[weeks.length - 1]?.hoursTattooed ?? 0 },
      { label: "Sessions", sublabel: "(week 4)", value: weeks[weeks.length - 1]?.sessions ?? 0 },
      { label: "Revenue/hr", value: `$${mtd.revenuePerHour}` },
      { label: "Supplies/hr", value: `$${mtd.suppliesCostPerHour}` },
      { label: "Avg session", value: `${mtd.avgSessionLenHrs}h` },
      { label: "Utilization", value: `${Math.round(mtd.utilization * 100)}%` },
    ];

  const maxHours = useMemo(
    () => Math.max(1, ...weeks.flatMap((w) => w.days.map((d) => d.hours || 0))),
    [weeks]
  );

  const styleTotal = Math.max(1, styleMix.reduce((a, s) => a + s.share, 0));
  const leadTotal = Math.max(1, leadSources.reduce((a, s) => a + s.share, 0));
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="w-full h-full overflow-hidden flex items-center justify-center p-4">
      <div className="w-full h-full max-w-full mx-auto flex flex-col gap-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 flex-shrink-0">
          {kpis.map((k, i) => (
            <div key={i} className="rounded-xl border border-app bg-elevated px-4 py-5 flex flex-col items-center justify-center text-center">
              <div className="text-xs text-muted">
                {k.label}
                {k.sublabel && <div className="mt-0.5">{k.sublabel}</div>}
              </div>
              <div className="mt-2 text-3xl font-bold text-app">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0">
          <div className="rounded-xl border border-app bg-elevated p-4 flex flex-col h-full overflow-visible">
            <div className="flex items-baseline justify-center flex-shrink-0">
              <div className="text-sm font-semibold text-app">Hours on needle (last 4 weeks)</div>
            </div>
            <div className="mt-3 flex w-full items-end justify-between gap-6 px-2 flex-1 min-h-0 pb-8 pt-10 relative">
              {weeks.map((w, weekIdx) => (
                <div key={weekIdx} className="flex-1 flex flex-col items-center h-full justify-end">
                  <div className="flex items-end justify-center gap-1.5 h-full w-full">
                    {w.days.map((day, dayIdx) => {
                      const heightPercent = Math.max(10, (day.hours / maxHours) * 100);
                      const barId = `${weekIdx}-${dayIdx}`;
                      const isHovered = hoveredBar === barId;
                      return (
                        <div
                          key={dayIdx}
                          className="flex-1 rounded-t-md bg-gradient-to-t from-zinc-400 to-zinc-300 dark:from-zinc-600 dark:to-zinc-500 transition-all duration-200 ease-out cursor-pointer relative group"
                          style={{ 
                            height: `${heightPercent}%`,
                            transform: isHovered ? 'scaleY(1.05) translateY(-2px)' : 'scaleY(1)',
                            transformOrigin: 'bottom',
                            opacity: isHovered ? 1 : 0.7
                          }}
                          onMouseEnter={() => setHoveredBar(barId)}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          {isHovered && (
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black text-[10px] px-2 py-1 rounded whitespace-nowrap font-medium shadow-lg z-10">
                              {day.day}: {day.hours}h
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-black dark:border-t-white"></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-[10px] text-muted text-center font-medium">{w.week}</div>
                  <div className="text-[10px] text-app font-semibold">{w.hoursTattooed}h</div>
                </div>
              ))}
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2 text-xs flex-shrink-0">
              <div className="rounded-lg bg-card border border-app px-3 py-3 flex flex-col items-center justify-center text-center">
                <div className="text-muted">Monthly revenue</div>
                <div className="mt-2 font-semibold text-app">${weeks[weeks.length - 1]?.revenue.toLocaleString()}</div>
              </div>
              <div className="rounded-lg bg-card border border-app px-3 py-3 flex flex-col items-center justify-center text-center">
                <div className="text-muted">No-show rate</div>
                <div className="mt-2 font-semibold text-app">{pct(mtd.noShowRate!)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 flex-shrink-0">
          <div className="rounded-xl border border-app bg-elevated p-4">
            <div className="text-sm font-semibold text-app text-center">Style mix</div>
            <div className="mt-3 space-y-3">
              {styleMix.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-28 text-[11px] text-muted">{s.style}</div>
                  <div className="flex-1 h-3 rounded-full bg-card border border-app overflow-hidden">
                    <div
                      className="h-full text-app [background:color-mix(in_oklab,currentColor_35%,transparent)] transition-[width] duration-500"
                      style={{ width: `${(s.share / styleTotal) * 100}%` }}
                      title={pct(s.share)}
                    />
                  </div>
                  <div className="w-12 text-right text-[11px] text-app">{pct(s.share)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-app bg-elevated p-4">
            <div className="text-sm font-semibold text-app text-center">Lead sources</div>
            <div className="mt-3 space-y-3">
              {leadSources.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-28 text-[11px] text-muted">{s.source}</div>
                  <div className="flex-1 h-3 rounded-full bg-card border border-app overflow-hidden">
                    <div
                      className="h-full text-app [background:color-mix(in_oklab,currentColor_35%,transparent)] transition-[width] duration-500"
                      style={{ width: `${(s.share / leadTotal) * 100}%` }}
                      title={pct(s.share)}
                    />
                  </div>
                  <div className="w-12 text-right text-[11px] text-app">{pct(s.share)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}