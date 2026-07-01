import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@/tests/setup/test-utils";

const mockGetMyRewards = jest.fn<() => Promise<any>>();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken: async () => "token" }),
}));

jest.unstable_mockModule("@/components/ui/progress", () => ({
  Progress: ({ value }: { value: number }) => (
    <div data-testid="progress" data-value={value} />
  ),
}));

jest.unstable_mockModule("@/api", () => ({
  getMyRewards: mockGetMyRewards,
  formatPlatformFee: (fee: any) => ({ short: fee?.short ?? "5%", cap: fee?.cap ?? "$50" }),
}));

const asData = (d: any) => d;

const { default: RewardsPanel } = await import(
  "@/components/dashboard/client/RewardsPanel"
);

const summaryWithNext = {
  tier: { label: "Bronze" },
  nextTier: { label: "Silver", bookingsToNextTier: 3 },
  completedBookings: 2,
  platformFee: { short: "5%", cap: "$50" },
};

describe("RewardsPanel", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test("renders nothing while loading uncontrolled data", () => {
    mockGetMyRewards.mockReturnValue(new Promise(() => {}));
    const { container } = render(<RewardsPanel />);
    expect(container.firstChild).toBeNull();
  });

  test("fetches and renders tier, fee, and next-tier progress", async () => {
    mockGetMyRewards.mockResolvedValue(summaryWithNext);
    render(<RewardsPanel />);
    expect(await screen.findByText("Bronze")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();
    expect(screen.getByText("2 completed bookings")).toBeInTheDocument();
    expect(screen.getByText("Silver")).toBeInTheDocument();
    expect(screen.getByTestId("progress")).toHaveAttribute("data-value", "40");
  });

  test("shows the top-tier message when there is no next tier", () => {
    render(
      <RewardsPanel
        data={asData({
          tier: { label: "Diamond" },
          nextTier: null,
          completedBookings: 1,
          platformFee: { short: "3%", cap: "$40" },
        })}
      />
    );
    expect(screen.getByText("Diamond")).toBeInTheDocument();
    expect(screen.getByText("1 completed booking")).toBeInTheDocument();
    expect(screen.getByText(/reached the top tier/i)).toBeInTheDocument();
  });

  test("renders nothing when controlled data has no tier", () => {
    const { container } = render(<RewardsPanel data={null} />);
    expect(container.firstChild).toBeNull();
    expect(mockGetMyRewards).not.toHaveBeenCalled();
  });

  test("renders nothing when the fetch fails", async () => {
    mockGetMyRewards.mockRejectedValue(new Error("nope"));
    const { container } = render(<RewardsPanel />);
    await waitFor(() => expect(mockGetMyRewards).toHaveBeenCalled());
    expect(container.firstChild).toBeNull();
  });
});
