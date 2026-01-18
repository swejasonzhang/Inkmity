import { describe, test, expect } from "@jest/globals";
import { render } from "@/__tests__/setup/test-utils";

const { default: AnalyticsPanel } = await import("@/components/dashboard/artist/AnalyticsPanel");

describe("AnalyticsPanel", () => {
  test("should render analytics panel", () => {
    const { container } = render(<AnalyticsPanel />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should render with KPIs", () => {
    const kpis = [
      { label: "Total Revenue", value: "$10,000" },
      { label: "Sessions", value: 25 },
    ];
    const { container } = render(<AnalyticsPanel kpis={kpis} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test("should render with weeks data", () => {
    const weeks = [
      {
        week: "Week 1",
        hoursTattooed: 20,
        sessions: 8,
        revenue: 5000,
        days: [],
      },
    ];
    const { container } = render(<AnalyticsPanel weeks={weeks} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
