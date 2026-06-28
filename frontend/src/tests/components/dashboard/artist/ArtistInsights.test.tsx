import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";
import { BarChart3 } from "lucide-react";
import type { ArtistAnalytics } from "@/api";

const mockGetArtistAnalytics = jest.fn<() => Promise<ArtistAnalytics>>();
const mockGetToken = jest.fn<() => Promise<string>>();

jest.unstable_mockModule("@/api", () => ({
  getArtistAnalytics: mockGetArtistAnalytics,
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

const { default: ArtistInsights } = await import("@/components/dashboard/artist/ArtistInsights");

const baseAnalytics: ArtistAnalytics = {
  tier: { key: "pro", label: "Pro", rank: 2, verified: true, payoutSpeed: "instant" },
  rating: 4.8,
  reviewsCount: 12,
  bookingsCount: 30,
  bookings: { total: 30, completed: 20, noShow: 2, cancelled: 3, completionRate: 0.9 },
  earnings: { paidOutCents: 250000 },
  payoutSpeed: "two_day",
};

describe("ArtistInsights", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
    mockGetArtistAnalytics.mockResolvedValue(baseAnalytics);
  });

  test("renders the Insights header", () => {
    render(<ArtistInsights />);
    expect(screen.getByText("Insights")).toBeInTheDocument();
  });

  test("renders analytics cells after loading", async () => {
    render(<ArtistInsights />);
    await waitFor(() => expect(screen.getByText("$2.5k")).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByText("Paid out")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("4.8★")).toBeInTheDocument();
  });

  test("shows verified tier badge and payout speed label", async () => {
    render(<ArtistInsights />);
    await waitFor(() => expect(screen.getByText("Pro")).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByText("2-day payouts")).toBeInTheDocument();
  });

  test("falls back to Instant payouts label for unknown payout speed", async () => {
    mockGetArtistAnalytics.mockResolvedValue({ ...baseAnalytics, payoutSpeed: "weird" });
    render(<ArtistInsights />);
    await waitFor(() => expect(screen.getByText("Instant payouts")).toBeInTheDocument(), { timeout: 5000 });
  });

  test("shows em dash for completion and rating when there is no data", async () => {
    mockGetArtistAnalytics.mockResolvedValue({
      ...baseAnalytics,
      rating: 0,
      bookings: { total: 0, completed: 0, noShow: 0, cancelled: 0, completionRate: 0 },
    });
    render(<ArtistInsights />);
    await waitFor(() => expect(screen.getByText("Paid out")).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  test("hides tier badge when not verified", async () => {
    mockGetArtistAnalytics.mockResolvedValue({
      ...baseAnalytics,
      tier: { ...baseAnalytics.tier, verified: false, label: "Rising" },
    });
    render(<ArtistInsights />);
    await waitFor(() => expect(screen.getByText("Paid out")).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.queryByText("Rising")).not.toBeInTheDocument();
  });

  test("renders provided stats cells", async () => {
    render(<ArtistInsights stats={[{ label: "Upcoming", value: 5, Icon: BarChart3 }]} />);
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("5")).toBeInTheDocument(), { timeout: 5000 });
  });

  test("handles analytics fetch failure gracefully", async () => {
    mockGetArtistAnalytics.mockRejectedValue(new Error("boom"));
    render(<ArtistInsights />);
    await waitFor(() => expect(mockGetArtistAnalytics).toHaveBeenCalled(), { timeout: 5000 });
    expect(screen.getByText("Insights")).toBeInTheDocument();
  });

  test("formats large paid-out amounts in thousands", async () => {
    mockGetArtistAnalytics.mockResolvedValue({
      ...baseAnalytics,
      earnings: { paidOutCents: 1500000 },
    });
    render(<ArtistInsights />);
    await waitFor(() => expect(screen.getByText("$15k")).toBeInTheDocument(), { timeout: 5000 });
  });
});
