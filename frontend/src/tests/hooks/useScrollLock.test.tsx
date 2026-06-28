import { describe, test, expect, afterEach } from "@jest/globals";
import { renderHook } from "@testing-library/react";
import { useScrollLock } from "@/hooks/useScrollLock";

const html = document.documentElement;

afterEach(() => {
  html.classList.remove("ink-modal-open");
});

describe("useScrollLock", () => {
  test("does nothing when inactive", () => {
    renderHook(() => useScrollLock(false));
    expect(html.classList.contains("ink-modal-open")).toBe(false);
  });

  test("locks the document while active and unlocks on unmount", () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(html.classList.contains("ink-modal-open")).toBe(true);

    unmount();
    expect(html.classList.contains("ink-modal-open")).toBe(false);
  });

  test("restores prior overflow on locked scrollable elements", () => {
    const scroller = document.createElement("div");
    scroller.style.overflow = "scroll";
    scroller.style.overflowY = "scroll";
    document.body.appendChild(scroller);

    const { unmount } = renderHook(() => useScrollLock(true));
    expect(scroller.style.overflow).toBe("hidden");

    unmount();
    expect(scroller.style.overflow).toBe("scroll");

    scroller.remove();
  });

  test("stays locked until the last active consumer unmounts (ref-counted)", () => {
    const first = renderHook(() => useScrollLock(true));
    const second = renderHook(() => useScrollLock(true));
    expect(html.classList.contains("ink-modal-open")).toBe(true);

    first.unmount();
    expect(html.classList.contains("ink-modal-open")).toBe(true);

    second.unmount();
    expect(html.classList.contains("ink-modal-open")).toBe(false);
  });
});
