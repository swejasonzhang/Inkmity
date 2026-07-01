const ENV = (import.meta as any)?.env || {};
const LAUNCH_MODE = (ENV.VITE_LAUNCH_MODE || (ENV.PROD ? "testing" : "live")).toLowerCase();
const PREVIEW_CODE = ENV.VITE_PREVIEW_CODE || "inkmity-vip-2026";
const PREVIEW_KEY = "inkmity_preview";

export const isTestingMode = LAUNCH_MODE === "testing";

export type PreviewDecision = {
  granted: boolean;
  store?: string;
  cleanUrl?: string;
};

export function decidePreviewAccess(params: {
  isTestingMode: boolean;
  previewCode: string;
  storedCode: string | null;
  href: string;
}): PreviewDecision {
  const { isTestingMode, previewCode, storedCode, href } = params;
  if (!isTestingMode) return { granted: true };
  try {
    const url = new URL(href);
    const param = url.searchParams.get("preview");
    if (param && previewCode && param === previewCode) {
      url.searchParams.delete("preview");
      return { granted: true, store: param, cleanUrl: url.pathname + url.search + url.hash };
    }
    return { granted: !!previewCode && storedCode === previewCode };
  } catch {
    return { granted: false };
  }
}

export function resolvePreviewAccess(): boolean {
  if (!isTestingMode) return true;
  if (typeof window === "undefined") return false;

  const decision = decidePreviewAccess({
    isTestingMode,
    previewCode: PREVIEW_CODE,
    storedCode: localStorage.getItem(PREVIEW_KEY),
    href: window.location.href,
  });

  if (decision.store) localStorage.setItem(PREVIEW_KEY, decision.store);
  if (decision.cleanUrl) {
    window.history.replaceState({}, document.title, decision.cleanUrl);
  }
  return decision.granted;
}
