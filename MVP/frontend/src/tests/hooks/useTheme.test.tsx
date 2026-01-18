import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import { renderHook } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

jest.unstable_mockModule("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/dashboard" }),
  useNavigate: () => jest.fn(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

jest.unstable_mockModule("@clerk/clerk-react", () => ({
  useUser: () => ({
    user: { id: "user-123" },
    isSignedIn: true,
    isLoaded: true,
  }),
}));

describe("useTheme", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  test("should return dark theme by default", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: BrowserRouter,
    });
    expect(result.current.theme).toBe("dark");
  });

  test("should provide toggleTheme function", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: BrowserRouter,
    });
    expect(typeof result.current.toggleTheme).toBe("function");
  });

  test("should provide logoSrc", () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: BrowserRouter,
    });
    expect(result.current.logoSrc).toBeDefined();
  });
});
