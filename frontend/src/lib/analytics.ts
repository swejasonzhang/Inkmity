const ENV: any = (import.meta as any)?.env ?? {};
const DOMAIN = (ENV.VITE_PLAUSIBLE_DOMAIN as string) || "";
const API_HOST = (ENV.VITE_PLAUSIBLE_API_HOST as string) || "https://plausible.io";

let initialized = false;

export const analyticsEnabled = !!DOMAIN;

// Plausible is cookieless and privacy-first, so it runs without gating on the
// cookie-consent banner. No-op unless VITE_PLAUSIBLE_DOMAIN is configured.
export function initAnalytics() {
  if (initialized || !DOMAIN || typeof document === "undefined") return;
  initialized = true;

  const w = window as any;
  w.plausible =
    w.plausible ||
    function (...args: any[]) {
      (w.plausible.q = w.plausible.q || []).push(args);
    };

  const script = document.createElement("script");
  script.defer = true;
  script.setAttribute("data-domain", DOMAIN);
  script.src = `${API_HOST}/js/script.js`;
  document.head.appendChild(script);
}

export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  if (!DOMAIN) return;
  const p = (window as any).plausible;
  if (typeof p === "function") p(name, props ? { props } : undefined);
}
