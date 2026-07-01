import { describe, test, expect, afterEach, jest } from "@jest/globals";
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

  test("prevents wheel scrolling outside any modal", () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    const outside = document.createElement("div");
    document.body.appendChild(outside);

    const evt = new Event("wheel", { cancelable: true, bubbles: true });
    Object.defineProperty(evt, "target", { value: outside });
    document.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);

    outside.remove();
    unmount();
  });

  test("allows wheel scrolling inside a modal that has no inner scroller", () => {
    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    document.body.appendChild(modal);

    const { unmount } = renderHook(() => useScrollLock(true));
    const evt = new Event("wheel", { cancelable: true, bubbles: true });
    Object.defineProperty(evt, "target", { value: modal });
    document.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);

    modal.remove();
    unmount();
  });

  test("touchmove outside a modal is prevented", () => {
    const { unmount } = renderHook(() => useScrollLock(true));
    const outside = document.createElement("div");
    document.body.appendChild(outside);

    const evt = new Event("touchmove", { cancelable: true, bubbles: true });
    Object.defineProperty(evt, "target", { value: outside });
    document.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true);

    outside.remove();
    unmount();
  });

  test("scroll capture re-pins a drifting non-modal element", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    const { unmount } = renderHook(() => useScrollLock(true));
    el.scrollTop = 50;
    const evt = new Event("scroll", { bubbles: true });
    Object.defineProperty(evt, "target", { value: el });
    document.dispatchEvent(evt);
    expect(el.scrollTop).toBe(0);

    el.remove();
    unmount();
  });

  test("scroll capture ignores elements inside a modal", () => {
    const modal = document.createElement("div");
    modal.setAttribute("data-ink-modal", "");
    const inner = document.createElement("div");
    modal.appendChild(inner);
    document.body.appendChild(modal);

    const { unmount } = renderHook(() => useScrollLock(true));
    inner.scrollTop = 80;
    const evt = new Event("scroll", { bubbles: true });
    Object.defineProperty(evt, "target", { value: inner });
    document.dispatchEvent(evt);
    expect(inner.scrollTop).toBe(80);

    modal.remove();
    unmount();
  });

  test("scroll capture on the document pins the window position", () => {
    window.scrollTo = jest.fn() as any;
    const { unmount } = renderHook(() => useScrollLock(true));
    Object.defineProperty(window, "scrollY", { value: 120, configurable: true });
    const evt = new Event("scroll", { bubbles: true });
    Object.defineProperty(evt, "target", { value: document });
    document.dispatchEvent(evt);
    expect(window.scrollTo).toHaveBeenCalled();
    unmount();
  });
});
