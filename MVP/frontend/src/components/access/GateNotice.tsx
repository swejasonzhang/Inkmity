import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

export default function GateNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);
  const unmountTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if ((location.state as { gate?: boolean } | null)?.gate) {
      // Clear the flag so a refresh doesn't replay the notice.
      navigate(location.pathname, { replace: true, state: {} });
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(unmountTimer.current);
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
      hideTimer.current = window.setTimeout(() => setVisible(false), 2000);
      unmountTimer.current = window.setTimeout(() => setMounted(false), 2350);
    }
  }, [location.key]);

  useEffect(
    () => () => {
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(unmountTimer.current);
    },
    []
  );

  if (!mounted) return null;

  return (
    <div
      className={`md:hidden absolute bottom-full left-0 right-0 mb-2 flex justify-center transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
      }`}
    >
      <div className="flex items-center gap-2 rounded-xl border border-app bg-card px-4 py-2.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55)] ring-1 ring-[color-mix(in_srgb,var(--fg)_25%,transparent)]">
        <span className="inline-grid place-items-center rounded-lg border border-app/40 bg-elevated p-1.5">
          <Lock className="h-3.5 w-3.5 text-app" />
        </span>
        <span className="text-[13px] font-bold text-app whitespace-nowrap">Sign in to access this page</span>
      </div>
    </div>
  );
}
