import { useEffect } from "react";

const SELECTOR = '[role="dialog"],[aria-modal="true"]';
let lockCount = 0;
let lockedEls: { el: HTMLElement; prev: string }[] = [];

function lockScrollers() {
  lockedEls = [];
  document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
    if (el.scrollHeight <= el.clientHeight + 1) return;
    if (el.closest(SELECTOR)) return;
    const oy = getComputedStyle(el).overflowY;
    if (oy === "auto" || oy === "scroll") {
      lockedEls.push({ el, prev: el.style.overflow });
      el.style.overflow = "hidden";
    }
  });
  document.documentElement.classList.add("ink-modal-open");
}

function unlockScrollers() {
  lockedEls.forEach(({ el, prev }) => {
    el.style.overflow = prev;
  });
  lockedEls = [];
  document.documentElement.classList.remove("ink-modal-open");
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    if (lockCount === 1) lockScrollers();
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) unlockScrollers();
    };
  }, [active]);
}
