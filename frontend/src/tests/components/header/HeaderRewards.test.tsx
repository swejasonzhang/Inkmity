import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import React from "react";
import { render, screen, act, waitFor } from "@/tests/setup/test-utils";

const mockGetToken = jest.fn<() => Promise<string | null>>();
const mockGetMyRewards = jest.fn<() => Promise<any>>();
let authState = { getToken: mockGetToken, isLoaded: true, isSignedIn: true };

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useAuth: () => authState,
}));

jest.unstable_mockModule("@/api", () => ({
  getMyRewards: mockGetMyRewards,
}));

jest.unstable_mockModule("react-router-dom", () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const { default: HeaderRewards } = await import(
  "@/components/header/HeaderRewards"
);

describe("HeaderRewards", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    authState = { getToken: mockGetToken, isLoaded: true, isSignedIn: true };
    mockGetToken.mockResolvedValue("tok");
    mockGetMyRewards.mockResolvedValue({
      tier: { key: "bronze", label: "Bronze" },
      nextTier: { label: "Silver", bookingsToNextTier: 3 },
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test("renders nothing when not authed", () => {
    authState = { getToken: mockGetToken, isLoaded: true, isSignedIn: false };
    const { container } = render(<HeaderRewards />);
    expect(container.firstChild).toBeNull();
  });

  test("shows the shimmer skeleton before the min delay elapses", () => {
    const { container } = render(<HeaderRewards />);
    expect(container.querySelector(".ink-shimmer")).toBeInTheDocument();
  });

  test("renders the tier pill linking to /tiers after load", async () => {
    render(<HeaderRewards />);
    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() =>
      expect(screen.getByText("Bronze")).toBeInTheDocument()
    );
    const link = screen.getByRole("link", { name: /Rewards tier Bronze/i });
    expect(link).toHaveAttribute("href", "/tiers");
    expect(link).toHaveAttribute(
      "title",
      expect.stringContaining("3 more booking(s)")
    );
  });

  test("reloads on the rewards:refresh event", async () => {
    render(<HeaderRewards />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetMyRewards).toHaveBeenCalledTimes(1);
    await act(async () => {
      window.dispatchEvent(new Event("rewards:refresh"));
      await Promise.resolve();
    });
    expect(mockGetMyRewards).toHaveBeenCalledTimes(2);
  });

  test("renders nothing when the rewards request returns no data", async () => {
    mockGetMyRewards.mockResolvedValue(null);
    const { container } = render(<HeaderRewards />);
    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
    });
    await waitFor(() =>
      expect(container.querySelector(".ink-shimmer")).not.toBeInTheDocument()
    );
    expect(container.firstChild).toBeNull();
  });
});
