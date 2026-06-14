import { useEffect } from "react";

// Anything matching this is treated as "inside a modal" — scrolling is allowed
// here (subject to overscroll containment). Everything else is background.
const ALLOW = '[role="dialog"],[aria-modal="true"],[data-ink-modal],.ink-conv-scope';
// A genuinely-open modal. NOTE: this deliberately excludes .ink-conv-scope —
// the messages pill carries that class even when closed, so it is NOT a reliable
// "is a modal open" signal (it only gets role="dialog" while actually open).
const OPEN_MODAL = '[role="dialog"],[aria-modal="true"],[data-ink-modal]';

let lockCount = 0;
let lockedEls: { el: HTMLElement; prev: string }[] = [];
// Recorded scroll positions of every background scroller at lock time. The
// scroll-pinning backstop (onScrollCapture) restores these on any scroll, so
// nothing — wheel, touch, momentum, keyboard, or a compositor scroll that
// slipped past preventDefault, or a scroller whose inline overflow:hidden React
// re-rendered away — can actually move the background.
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

// First line of defense: cancel the wheel/touch gesture before it scrolls, so
// in the common case there's no flicker. Background gestures are killed; modal
// gestures are allowed but cannot chain out.
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

// Guaranteed backstop: whatever slips past blockScroll gets snapped back.
function onScrollCapture(e: Event) {
  const el = e.target as Element | null;
  if (!el || el === (document as unknown as Element) || el.nodeType !== 1) {
    if (window.scrollX !== pinnedWin.x || window.scrollY !== pinnedWin.y) {
      window.scrollTo(pinnedWin.x, pinnedWin.y);
    }
    return;
  }
  if (isInModal(el)) return; // modal scrollers are allowed to move
  const h = el as HTMLElement;
  let p = pinned.get(h);
  if (!p) {
    // A background scroller we didn't see at lock time (e.g. re-rendered): pin it now.
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

// Keep dev HMR from stranding stale listeners / module state. Without this,
// hot-swapping this file while a modal is open leaves the OLD listeners
// attached and the new lock logic never re-applies (looks like the fix
// "doesn't work" until a full page reload).
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
