import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import React from "react";
import { render, screen, act, waitFor } from "@/tests/setup/test-utils";

const mockGetToken = jest.fn<() => Promise<string | null>>();
const mockGetArtistAnalytics = jest.fn<() => Promise<any>>();
let authState = { getToken: mockGetToken, isLoaded: true, isSignedIn: true };

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => authState,
}));

jest.unstable_mockModule("@/api", () => ({
  getArtistAnalytics: mockGetArtistAnalytics,
}));

jest.unstable_mockModule("react-router-dom", () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const { default: HeaderArtistTier } = await import(
  "@/components/header/HeaderArtistTier"
);

describe("HeaderArtistTier", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    authState = { getToken: mockGetToken, isLoaded: true, isSignedIn: true };
    mockGetToken.mockResolvedValue("tok");
    mockGetArtistAnalytics.mockResolvedValue({
      tier: { key: "rising", label: "Rising" },
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test("renders nothing when not authed", () => {
    authState = { getToken: mockGetToken, isLoaded: false, isSignedIn: false };
    const { container } = render(<HeaderArtistTier />);
    expect(container.firstChild).toBeNull();
  });

  test("shows the shimmer skeleton before the min delay elapses", () => {
    const { container } = render(<HeaderArtistTier />);
    expect(container.querySelector(".ink-shimmer")).toBeInTheDocument();
  });

  test("renders the artist tier pill linking to /tiers", async () => {
    render(<HeaderArtistTier />);
    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() => expect(screen.getByText("Rising")).toBeInTheDocument());
    const link = screen.getByRole("link", { name: /Artist tier Rising/i });
    expect(link).toHaveAttribute("href", "/tiers");
  });

  test("falls back to the Tiers label when analytics has no tier", async () => {
    mockGetArtistAnalytics.mockResolvedValue({});
    render(<HeaderArtistTier />);
    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Artist tier Tiers/i })).toBeInTheDocument()
    );
  });

  test("reloads on the rewards:refresh event", async () => {
    render(<HeaderArtistTier />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetArtistAnalytics).toHaveBeenCalledTimes(1);
    await act(async () => {
      window.dispatchEvent(new Event("rewards:refresh"));
      await Promise.resolve();
    });
    expect(mockGetArtistAnalytics).toHaveBeenCalledTimes(2);
  });
});
