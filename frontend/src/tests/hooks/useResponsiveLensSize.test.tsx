import { describe, test, expect, afterEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import useResponsiveLensSize from "@/hooks/useResponsiveLensSize";

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
}

describe("useResponsiveLensSize", () => {
  afterEach(() => {
    setWidth(1024);
  });

  test("returns the largest size on wide viewports", () => {
    setWidth(1440);
    const { result } = renderHook(() => useResponsiveLensSize());
    expect(result.current).toBe(104);
  });

  test("maps each breakpoint to its size", () => {
    setWidth(400);
    const tiny = renderHook(() => useResponsiveLensSize());
    expect(tiny.result.current).toBe(56);

    setWidth(600);
    const small = renderHook(() => useResponsiveLensSize());
    expect(small.result.current).toBe(68);

    setWidth(900);
    const medium = renderHook(() => useResponsiveLensSize());
    expect(medium.result.current).toBe(84);
  });

  test("recomputes on window resize", () => {
    setWidth(1440);
    const { result } = renderHook(() => useResponsiveLensSize());
    expect(result.current).toBe(104);

    act(() => {
      setWidth(400);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(56);
  });

  test("removes its resize listener on unmount", () => {
    setWidth(1024);
    const { result, unmount } = renderHook(() => useResponsiveLensSize());
    expect(result.current).toBe(104);

    unmount();

    act(() => {
      setWidth(400);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(104);
  });
});
