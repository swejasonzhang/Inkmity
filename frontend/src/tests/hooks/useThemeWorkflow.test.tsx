import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

const STORAGE_KEY = "inkmity-theme";
const WHITE_LOGO = "/assets/WhiteLogo.png";
const BLACK_LOGO = "/assets/BlackLogo.png";

function makeWrapper(path: string) {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );
}

function resetThemeToDark() {
  localStorage.setItem(STORAGE_KEY, "dark");
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: "dark" }));
}

function cleanDom() {
  const html = document.documentElement;
  html.removeAttribute("data-ink");
  html.removeAttribute("data-ink-themed");
  html.classList.remove("ink-light");
  html.removeAttribute("style");
}

describe("useTheme workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    resetThemeToDark();
    cleanDom();
    const scope = document.createElement("div");
    scope.id = "dashboard-scope";
    scope.className = "ink-scope";
    document.body.appendChild(scope);
  });

  afterEach(() => {
    document.getElementById("dashboard-scope")?.remove();
    cleanDom();
  });

  const getScope = () => document.getElementById("dashboard-scope") as HTMLElement;

  test("applies dark theme to the DOM on mount of a themed route", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper("/dashboard") });
    const html = document.documentElement;

    expect(result.current.theme).toBe("dark");
    expect(html.getAttribute("data-ink")).toBe("dark");
    expect(html.getAttribute("data-ink-themed")).toBe("true");
    expect(html.classList.contains("ink-light")).toBe(false);
    expect(result.current.logoSrc).toBe(WHITE_LOGO);
    expect(result.current.canToggleTheme).toBe(true);
  });

  test("toggles dark -> light and light -> dark, both directions fully apply", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper("/dashboard") });
    const html = document.documentElement;
    const scope = getScope();

    act(() => result.current.toggleTheme());

    expect(result.current.theme).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(html.getAttribute("data-ink")).toBe("light");
    expect(html.classList.contains("ink-light")).toBe(true);
    expect(scope.getAttribute("data-ink")).toBe("light");
    expect(scope.classList.contains("ink-light")).toBe(true);
    expect(result.current.logoSrc).toBe(BLACK_LOGO);

    act(() => result.current.toggleTheme());

    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
    expect(html.getAttribute("data-ink")).toBe("dark");
    expect(html.classList.contains("ink-light")).toBe(false);
    expect(scope.getAttribute("data-ink")).toBe("dark");
    expect(scope.classList.contains("ink-light")).toBe(false);
    expect(result.current.logoSrc).toBe(WHITE_LOGO);
  });

  test("never pins theme variables as inline styles on <html> (inline-mirror regression guard)", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper("/dashboard") });
    const html = document.documentElement;

    act(() => result.current.toggleTheme());
    act(() => result.current.toggleTheme());

    expect(html.style.getPropertyValue("--bg")).toBe("");
    expect(html.style.getPropertyValue("--fg")).toBe("");
    expect(html.style.getPropertyValue("--card")).toBe("");
  });

  test("persists the selected theme across a remount", () => {
    const first = renderHook(() => useTheme(), { wrapper: makeWrapper("/dashboard") });
    act(() => first.result.current.toggleTheme());
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
    first.unmount();

    const second = renderHook(() => useTheme(), { wrapper: makeWrapper("/dashboard") });
    expect(second.result.current.theme).toBe("light");
    expect(document.documentElement.getAttribute("data-ink")).toBe("light");
  });

  test("non-themed routes stay dark and ignore toggle (no carry-over)", () => {
    const { result } = renderHook(() => useTheme(), { wrapper: makeWrapper("/contact") });

    expect(result.current.canToggleTheme).toBe(false);
    expect(result.current.theme).toBe("dark");

    act(() => result.current.toggleTheme());

    expect(result.current.theme).toBe("dark");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("ink-light")).toBe(false);
  });

  test("a themed selection does not leak its variables onto a non-themed route", () => {
    const themed = renderHook(() => useTheme(), { wrapper: makeWrapper("/dashboard") });
    act(() => themed.result.current.toggleTheme());
    expect(themed.result.current.theme).toBe("light");
    themed.unmount();

    getScope().remove();

    const plain = renderHook(() => useTheme(), { wrapper: makeWrapper("/about") });
    expect(plain.result.current.theme).toBe("dark");
    expect(document.documentElement.getAttribute("data-ink")).toBe("dark");
    expect(document.documentElement.hasAttribute("data-ink-themed")).toBe(false);
    expect(document.documentElement.classList.contains("ink-light")).toBe(false);
  });
});
