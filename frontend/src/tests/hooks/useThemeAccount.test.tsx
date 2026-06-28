import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useTheme, setThemeAccount, isThemedPath } from "@/hooks/useTheme";

const BASE_KEY = "inkmity-theme";

function makeWrapper(path: string) {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  setThemeAccount(null);
});

afterEach(() => {
  setThemeAccount(null);
  localStorage.clear();
});

describe("isThemedPath", () => {
  test("recognizes the themed route prefixes", () => {
    for (const p of [
      "/dashboard",
      "/artists",
      "/profile",
      "/appointments",
      "/portfolio",
      "/explore",
      "/artist/jane",
    ]) {
      expect(isThemedPath(p)).toBe(true);
    }
  });

  test("rejects unrelated routes", () => {
    expect(isThemedPath("/")).toBe(false);
    expect(isThemedPath("/about")).toBe(false);
    expect(isThemedPath("/contact")).toBe(false);
  });
});

describe("setThemeAccount", () => {
  test("switches to the per-user stored theme", () => {
    localStorage.setItem(`${BASE_KEY}:u1`, "light");
    setThemeAccount("u1");

    const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper("/dashboard") });
    expect(result.current.theme).toBe("light");
  });

  test("is a no-op when the account does not change", () => {
    setThemeAccount("u2");
    localStorage.setItem(`${BASE_KEY}:u2`, "light");
    setThemeAccount("u2");

    const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper("/dashboard") });
    expect(result.current.theme).toBe("dark");
  });

  test("falls back to dark for an account with no stored preference", () => {
    setThemeAccount("u3");
    const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper("/dashboard") });
    expect(result.current.theme).toBe("dark");
  });
});
