const LAUNCH_MODE = ((import.meta as any)?.env?.VITE_LAUNCH_MODE || "live").toLowerCase();
const PREVIEW_CODE = (import.meta as any)?.env?.VITE_PREVIEW_CODE || "";
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
