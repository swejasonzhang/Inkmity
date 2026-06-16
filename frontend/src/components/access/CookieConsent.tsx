import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "inkmity-cookie-consent";

export default function CookieConsent() {
  const { userId } = useAuth();
  const storageKey = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const choice = localStorage.getItem(storageKey);
      if (!choice) {
        const t = window.setTimeout(() => setVisible(true), 700);
        return () => window.clearTimeout(t);
      }
      setVisible(false);
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  const decide = (value: "accepted" | "declined") => {
    try {
      localStorage.setItem(storageKey, value);
    } catch { }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-label="Cookie consent"
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed z-[2147483600] w-[min(92vw,22rem)]"
          style={{
            right: "var(--ink-edge-r)",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 3.6rem)",
          }}
        >
          <div className="rounded-2xl border border-app bg-card text-app p-4 shadow-[0_18px_44px_-12px_rgba(0,0,0,0.6)] ring-1 ring-[color-mix(in_srgb,var(--fg)_12%,transparent)]">
            <div className="flex items-start gap-3">
              <span className="inline-grid place-items-center rounded-xl border border-app/40 bg-elevated p-2 flex-shrink-0">
                <Cookie className="h-4 w-4 text-app" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">We use cookies</p>
                <p className="mt-1 text-xs text-subtle leading-relaxed">
                  We use cookies to keep you signed in and improve your experience. You can accept or
                  decline non-essential cookies.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => decide("declined")}
                className="flex-1 h-9 rounded-full border border-app bg-elevated text-app text-xs font-semibold transition hover:bg-elevated/70"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => decide("accepted")}
                className="flex-1 h-9 rounded-full text-xs font-bold transition hover:opacity-90"
                style={{ background: "var(--fg)", color: "var(--bg)" }}
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
