const ENV = (import.meta as any)?.env || {};
// Production builds lock by default (Coming Soon); local dev stays open.
// Override either way with VITE_LAUNCH_MODE=live | testing on the host.
const LAUNCH_MODE = (ENV.VITE_LAUNCH_MODE || (ENV.PROD ? "testing" : "live")).toLowerCase();
// Owner bypass code; override with VITE_PREVIEW_CODE on the host if you want a different one.
const PREVIEW_CODE = ENV.VITE_PREVIEW_CODE || "inkmity-vip-2026";
const PREVIEW_KEY = "inkmity_preview";

export const isTestingMode = LAUNCH_MODE === "testing";

// Soft gate for the public while we test. Visiting `?preview=<code>` stores the
// code locally and unlocks the site for this browser. Not a security boundary
// (the code ships in the bundle and the API stays open) — just keeps casual
// visitors out until launch.
export function resolvePreviewAccess(): boolean {
  if (!isTestingMode) return true;
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    const param = url.searchParams.get("preview");
    if (param && PREVIEW_CODE && param === PREVIEW_CODE) {
      localStorage.setItem(PREVIEW_KEY, param);
      url.searchParams.delete("preview");
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
      return true;
    }
    return !!PREVIEW_CODE && localStorage.getItem(PREVIEW_KEY) === PREVIEW_CODE;
  } catch {
    return false;
  }
}
