import { describe, test, expect, afterEach } from "@jest/globals";
import { PAGE_SCROLL_LOCKED, applyScrollLock } from "@/lib/scrollLock";

afterEach(() => {
  document.documentElement.classList.remove("ink-no-scroll");
});

describe("scrollLock", () => {
  test("exports PAGE_SCROLL_LOCKED as false", () => {
    expect(PAGE_SCROLL_LOCKED).toBe(false);
  });

  test("adds the lock class when locked", () => {
    applyScrollLock(true);
    expect(document.documentElement.classList.contains("ink-no-scroll")).toBe(true);
  });

  test("removes the lock class when unlocked", () => {
    document.documentElement.classList.add("ink-no-scroll");
    applyScrollLock(false);
    expect(document.documentElement.classList.contains("ink-no-scroll")).toBe(false);
  });

  test("is idempotent across repeated calls", () => {
    applyScrollLock(true);
    applyScrollLock(true);
    expect(document.documentElement.classList.contains("ink-no-scroll")).toBe(true);
    applyScrollLock(false);
    applyScrollLock(false);
    expect(document.documentElement.classList.contains("ink-no-scroll")).toBe(false);
  });
});
