
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

  const styleTotal = Math.max(1, styleMix.reduce((a, s) => a + s.share, 0));
  const leadTotal = Math.max(1, leadSources.reduce((a, s) => a + s.share, 0));
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="w-full h-full overflow-hidden flex items-center justify-center p-4">
      <div className="w-full h-full max-w-full mx-auto flex flex-col gap-4">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 flex-shrink-0 analytics-kpi-grid">
          {kpis.map((k, i) => (
            <div key={i} className="rounded-xl border border-app bg-elevated px-2 sm:px-3 md:px-4 py-3 sm:py-4 md:py-5 flex flex-col items-center justify-center text-center min-w-0 overflow-hidden">
              <div className="text-[10px] sm:text-xs text-muted truncate w-full">
                {k.label}
                {k.sublabel && <div className="mt-0.5 text-[9px] sm:text-[10px] truncate">{k.sublabel}</div>}
              </div>
              <div className="mt-1 sm:mt-2 text-xl sm:text-2xl md:text-3xl font-bold text-app whitespace-nowrap w-full">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0">
          <div className="rounded-xl border border-app bg-elevated p-2 sm:p-3 md:p-4 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-center flex-shrink-0 mb-1 sm:mb-2">
              <div className="text-[10px] sm:text-xs md:text-sm font-semibold text-app truncate text-center">Hours on needle (last 4 weeks)</div>
            </div>

            <div className="flex-1 flex justify-center items-center gap-1 sm:gap-1.5 md:gap-2 overflow-hidden min-h-0">
              <div className="flex-1 h-full rounded-lg bg-card border border-app px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 flex flex-col items-center justify-center text-center min-w-0 overflow-hidden">
                <div className="text-muted text-[9px] sm:text-[10px] md:text-xs lg:text-sm truncate w-full">Monthly revenue</div>
                <div className="mt-1 sm:mt-2 md:mt-3 font-semibold text-app text-sm sm:text-base md:text-lg lg:text-xl whitespace-nowrap w-full">${weeks[weeks.length - 1]?.revenue.toLocaleString()}</div>
              </div>
              <div className="flex-1 h-full rounded-lg bg-card border border-app px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 flex flex-col items-center justify-center text-center min-w-0 overflow-hidden">
                <div className="text-muted text-[9px] sm:text-[10px] md:text-xs lg:text-sm truncate w-full">No-show rate</div>
                <div className="mt-1 sm:mt-2 md:mt-3 font-semibold text-app text-sm sm:text-base md:text-lg lg:text-xl truncate w-full">{pct(mtd.noShowRate!)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-3 flex-shrink-0">
          <div className="rounded-xl border border-app bg-elevated p-3 sm:p-4 overflow-hidden">
            <div className="text-xs sm:text-sm font-semibold text-app text-center truncate">Style mix</div>
            <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
              {styleMix.map((s, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-20 sm:w-24 md:w-28 text-[10px] sm:text-[11px] text-muted truncate">{s.style}</div>
                  <div className="flex-1 h-2.5 sm:h-3 rounded-full bg-card border border-app overflow-hidden min-w-0">
                    <div
                      className="h-full text-app [background:color-mix(in_oklab,currentColor_35%,transparent)] transition-[width] duration-500"
                      style={{ width: `${(s.share / styleTotal) * 100}%` }}
                      title={pct(s.share)}
                    />
                  </div>
                  <div className="w-10 sm:w-12 text-right text-[10px] sm:text-[11px] text-app truncate">{pct(s.share)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-app bg-elevated p-3 sm:p-4 overflow-hidden">
            <div className="text-xs sm:text-sm font-semibold text-app text-center truncate">Lead sources</div>
            <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-3">
              {leadSources.map((s, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-20 sm:w-24 md:w-28 text-[10px] sm:text-[11px] text-muted truncate">{s.source}</div>
                  <div className="flex-1 h-2.5 sm:h-3 rounded-full bg-card border border-app overflow-hidden min-w-0">
                    <div
                      className="h-full text-app [background:color-mix(in_oklab,currentColor_35%,transparent)] transition-[width] duration-500"
                      style={{ width: `${(s.share / leadTotal) * 100}%` }}
                      title={pct(s.share)}
                    />
                  </div>
                  <div className="w-10 sm:w-12 text-right text-[10px] sm:text-[11px] text-app truncate">{pct(s.share)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}