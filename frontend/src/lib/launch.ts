const ENV = (import.meta as any)?.env || {};
const LAUNCH_MODE = (ENV.VITE_LAUNCH_MODE || (ENV.PROD ? "testing" : "live")).toLowerCase();
const PREVIEW_CODE = ENV.VITE_PREVIEW_CODE || "inkmity-vip-2026";
const PREVIEW_KEY = "inkmity_preview";

export const isTestingMode = LAUNCH_MODE === "testing";

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
