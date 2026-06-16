import { useEffect } from "react";

const ALLOW = '[role="dialog"],[aria-modal="true"],[data-ink-modal],.ink-conv-scope';
const OPEN_MODAL = '[role="dialog"],[aria-modal="true"],[data-ink-modal]';

let lockCount = 0;
let lockedEls: { el: HTMLElement; prev: string }[] = [];
let pinned = new Map<HTMLElement, { top: number; left: number }>();
let pinnedWin = { x: 0, y: 0 };

function isInModal(el: Element | null): Element | null {
  return el && "closest" in el ? el.closest(ALLOW) : null;
}

function nearestScrollerWithin(start: HTMLElement | null, boundary: Element): HTMLElement | null {
  let el = start;
  const stop = boundary.parentElement;
  while (el && el !== stop && el !== document.body) {
    if (el.scrollHeight > el.clientHeight + 1) {
      const oy = getComputedStyle(el).overflowY;
      if (oy === "auto" || oy === "scroll") return el;
    }
    el = el.parentElement;
  }
  return null;
}

function blockScroll(e: Event) {
  const t = e.target as Element | null;
  const modal = isInModal(t);
  if (!modal) {
    e.preventDefault();
    return;
  }
  const scroller = nearestScrollerWithin(t as HTMLElement, modal);
  if (!scroller) {
    e.preventDefault();
    return;
  }
  if (e.type === "wheel") {
    const dy = (e as WheelEvent).deltaY;
    const atTop = scroller.scrollTop <= 0;
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    if ((dy < 0 && atTop) || (dy > 0 && atBottom)) e.preventDefault();
  }
}

function onScrollCapture(e: Event) {
  const el = e.target as Element | null;
  if (!el || el === (document as unknown as Element) || el.nodeType !== 1) {
    if (window.scrollX !== pinnedWin.x || window.scrollY !== pinnedWin.y) {
      window.scrollTo(pinnedWin.x, pinnedWin.y);
    }
    return;
  }
  if (isInModal(el)) return;
  const h = el as HTMLElement;
  let p = pinned.get(h);
  if (!p) {
    p = { top: 0, left: 0 };
    pinned.set(h, p);
  }
  if (h.scrollTop !== p.top) h.scrollTop = p.top;
  if (h.scrollLeft !== p.left) h.scrollLeft = p.left;
}

function lock() {
  lockedEls = [];
  pinned = new Map();
  document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
    if (el.closest(ALLOW)) return;
    const oy = getComputedStyle(el).overflowY;
    if (oy === "auto" || oy === "scroll") {
      lockedEls.push({ el, prev: el.style.overflow });
      pinned.set(el, { top: el.scrollTop, left: el.scrollLeft });
      el.style.overflow = "hidden";
    }
  });
  pinnedWin = { x: window.scrollX, y: window.scrollY };
  document.documentElement.classList.add("ink-modal-open");
  document.addEventListener("wheel", blockScroll, { passive: false, capture: true });
  document.addEventListener("touchmove", blockScroll, { passive: false, capture: true });
  document.addEventListener("scroll", onScrollCapture, { passive: true, capture: true });
}

function unlock() {
  lockedEls.forEach(({ el, prev }) => {
    el.style.overflow = prev;
  });
  lockedEls = [];
  pinned = new Map();
  document.documentElement.classList.remove("ink-modal-open");
  document.removeEventListener("wheel", blockScroll, true);
  document.removeEventListener("touchmove", blockScroll, true);
  document.removeEventListener("scroll", onScrollCapture, true);
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    if (lockCount === 1) lock();
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) unlock();
    };
  }, [active]);
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (lockCount > 0) unlock();
    lockCount = 0;
  });
  if (typeof document !== "undefined" && document.querySelector(OPEN_MODAL)) {
    lockCount = 1;
    lock();
  }
}
