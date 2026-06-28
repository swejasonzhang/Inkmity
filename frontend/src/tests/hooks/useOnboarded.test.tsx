import { jest, describe, test, expect, beforeEach, beforeAll } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";

const mockGetMe = jest.fn<(opts?: any) => Promise<any>>();
const mockGetToken = jest.fn<() => Promise<string>>();
const mockUseUser = jest.fn();

jest.unstable_mockModule("@/api", () => ({
  getMe: mockGetMe,
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useUser: () => mockUseUser(),
  useAuth: () => ({ getToken: mockGetToken }),
}));

let useOnboarded: typeof import("@/hooks/useOnboarded").useOnboarded;
let markOnboarded: typeof import("@/hooks/useOnboarded").markOnboarded;

beforeAll(async () => {
  const mod = await import("@/hooks/useOnboarded");
  useOnboarded = mod.useOnboarded;
  markOnboarded = mod.markOnboarded;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue("token");
  mockUseUser.mockReturnValue({
    user: { id: "user-onb-1" },
    isSignedIn: true,
    isLoaded: true,
  });
});

describe("useOnboarded", () => {
  test("stays null until clerk has loaded", () => {
    mockUseUser.mockReturnValue({ user: null, isSignedIn: false, isLoaded: false });
    const { result } = renderHook(() => useOnboarded());
    expect(result.current.onboarded).toBe(null);
    expect(result.current.clerkLoaded).toBe(false);
    expect(mockGetMe).not.toHaveBeenCalled();
  });

  test("resolves true when the user has completed onboarding", async () => {
    mockGetMe.mockResolvedValue({ onboardingComplete: true });
    const { result } = renderHook(() => useOnboarded());

    await waitFor(() => expect(result.current.onboarded).toBe(true));
    expect(mockGetMe).toHaveBeenCalledWith({ token: "token" });
  });

  test("resolves false when onboarding is incomplete", async () => {
    mockUseUser.mockReturnValue({
      user: { id: "user-incomplete" },
      isSignedIn: true,
      isLoaded: true,
    });
    mockGetMe.mockResolvedValue({ onboardingComplete: false });
    const { result } = renderHook(() => useOnboarded());

    await waitFor(() => expect(result.current.onboarded).toBe(false));
  });

  test("treats a 404 as not onboarded", async () => {
    mockUseUser.mockReturnValue({
      user: { id: "user-404" },
      isSignedIn: true,
      isLoaded: true,
    });
    mockGetMe.mockRejectedValue({ status: 404 });
    const { result } = renderHook(() => useOnboarded());

    await waitFor(() => expect(result.current.onboarded).toBe(false));
  });

  test("falls back to null on non-404 errors", async () => {
    mockUseUser.mockReturnValue({
      user: { id: "user-500" },
      isSignedIn: true,
      isLoaded: true,
    });
    mockGetMe.mockRejectedValue({ status: 500 });
    const { result } = renderHook(() => useOnboarded());

    await waitFor(() => expect(mockGetMe).toHaveBeenCalled());
    expect(result.current.onboarded).toBe(null);
  });

  test("resets to null when signed out", () => {
    mockUseUser.mockReturnValue({ user: null, isSignedIn: false, isLoaded: true });
    const { result } = renderHook(() => useOnboarded());
    expect(result.current.onboarded).toBe(null);
    expect(mockGetMe).not.toHaveBeenCalled();
  });

  test("short-circuits via cache after markOnboarded", async () => {
    markOnboarded("cached-user");
    mockUseUser.mockReturnValue({
      user: { id: "cached-user" },
      isSignedIn: true,
      isLoaded: true,
    });
    const { result } = renderHook(() => useOnboarded());

    await waitFor(() => expect(result.current.onboarded).toBe(true));
    expect(mockGetMe).not.toHaveBeenCalled();
  });
});
