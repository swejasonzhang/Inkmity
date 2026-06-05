export const PAGE_SCROLL_LOCKED = false;

export function applyScrollLock(locked: boolean) {
  const html = document.documentElement;
  if (locked) html.classList.add("ink-no-scroll");
  else html.classList.remove("ink-no-scroll");
}
