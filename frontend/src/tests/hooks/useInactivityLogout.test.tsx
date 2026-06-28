import { jest, describe, test, expect, beforeEach, afterEach, beforeAll } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";

const mockSignOut = jest.fn<(opts?: any) => void>();
const mockUseAuth = jest.fn();

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useClerk: () => ({ signOut: mockSignOut }),
  useAuth: () => mockUseAuth(),
}));

let useInactivityLogout: typeof import("@/hooks/useInactivityLogout").useInactivityLogout;
let resetActivityTimer: typeof import("@/hooks/useInactivityLogout").resetActivityTimer;

const KEY = "lastActivityTimestamp";
const TIMEOUT = 7 * 24 * 60 * 60 * 1000;

beforeAll(async () => {
  const mod = await import("@/hooks/useInactivityLogout");
  useInactivityLogout = mod.useInactivityLogout;
  resetActivityTimer = mod.resetActivityTimer;
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe("useInactivityLogout", () => {
  test("does nothing until clerk is loaded", () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: false });
    renderHook(() => useInactivityLogout());
    expect(localStorage.getItem(KEY)).toBe(null);
  });

  test("clears the activity timestamp when signed out", () => {
    localStorage.setItem(KEY, String(Date.now()));
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: true });
    renderHook(() => useInactivityLogout());
    expect(localStorage.getItem(KEY)).toBe(null);
  });

  test("seeds an activity timestamp for a fresh signed-in session", () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });
    renderHook(() => useInactivityLogout());
    expect(localStorage.getItem(KEY)).not.toBe(null);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  test("signs out immediately when prior activity exceeds the timeout", () => {
    localStorage.setItem(KEY, String(Date.now() - TIMEOUT - 1000));
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });
    renderHook(() => useInactivityLogout());
    expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: "/login" });
    expect(localStorage.getItem(KEY)).toBe(null);
  });

  test("schedules a logout that fires after the remaining timeout", () => {
    localStorage.setItem(KEY, String(Date.now()));
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });
    renderHook(() => useInactivityLogout());

    expect(mockSignOut).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(TIMEOUT + 100);
    });
    expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: "/login" });
  });

  test("refreshes the timestamp on user activity (throttled)", () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });
    renderHook(() => useInactivityLogout());
    const initial = localStorage.getItem(KEY);

    act(() => {
      jest.advanceTimersByTime(61000);
      window.dispatchEvent(new Event("click"));
    });
    expect(localStorage.getItem(KEY)).not.toBe(initial);
  });

  test("resetActivityTimer writes a fresh timestamp", () => {
    resetActivityTimer();
    expect(localStorage.getItem(KEY)).not.toBe(null);
  });
});
