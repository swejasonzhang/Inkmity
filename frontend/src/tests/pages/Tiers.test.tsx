import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { render, screen, act, waitFor } from "@/tests/setup/test-utils";

const usePageMeta = jest.fn();
const useRole = jest.fn<() => { role: string; isLoaded: boolean }>(() => ({
  role: "client",
  isLoaded: true,
}));
const getToken = jest.fn<() => Promise<string | null>>().mockResolvedValue("tok");
const getMe = jest.fn<() => Promise<any>>();
const getMyRewards = jest.fn<() => Promise<any>>();
const fetchArtistById = jest.fn<() => Promise<any>>();

jest.unstable_mockModule("@/hooks/usePageMeta", () => ({ usePageMeta }));
jest.unstable_mockModule("@/hooks/useRole", () => ({ useRole }));
jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => ({ getToken }),
}));
jest.unstable_mockModule("@/api", () => ({
  getMe,
  getMyRewards,
  fetchArtistById,
}));
jest.unstable_mockModule("@/components/header/Header", () => ({
  default: () => <header data-testid="header" />,
}));
jest.unstable_mockModule("@/components/VideoBackground", () => ({
  default: () => <div data-testid="video-bg" />,
}));
jest.unstable_mockModule("@/components/dashboard/client/RewardsPanel", () => ({
  default: () => <div data-testid="rewards-panel" />,
}));

const { default: Tiers } = await import("@/pages/Tiers");

describe("Tiers page", () => {
  beforeEach(() => {
    useRole.mockReturnValue({ role: "client", isLoaded: true });
    getMyRewards.mockResolvedValue({ tier: { key: "silver" } });
    getMe.mockResolvedValue({ _id: "a1" });
    fetchArtistById.mockResolvedValue({ bookingsCount: 12, rating: 4.5 });
  });

  test("renders client reward tiers", async () => {
    await act(async () => {
      render(<Tiers />);
    });

    expect(
      screen.getByRole("heading", { name: "Reward Tiers" })
    ).toBeInTheDocument();
    expect(screen.getByText("Bronze")).toBeInTheDocument();
    expect(screen.getByText("Silver")).toBeInTheDocument();
    expect(screen.getByText("Gold")).toBeInTheDocument();
    expect(screen.getByText("Platinum")).toBeInTheDocument();
    expect(usePageMeta).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Pricing & Tiers" })
    );

    await waitFor(() => expect(getMyRewards).toHaveBeenCalled());
  });

  test("renders artist tiers when role is artist", async () => {
    useRole.mockReturnValue({ role: "artist", isLoaded: true });

    await act(async () => {
      render(<Tiers />);
    });

    expect(
      screen.getByRole("heading", { name: "Artist Tiers" })
    ).toBeInTheDocument();
    expect(screen.getByText("Rising")).toBeInTheDocument();
    expect(screen.getByText("Established")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Elite")).toBeInTheDocument();

    await waitFor(() => expect(getMe).toHaveBeenCalled());
  });
});
