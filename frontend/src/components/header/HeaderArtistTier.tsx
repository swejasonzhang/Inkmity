import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Award } from "lucide-react";
import { getArtistAnalytics, type ArtistAnalytics } from "@/api";

const pillStyle: React.CSSProperties = {
  borderColor: "var(--border)",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--elevated) 95%, var(--fg) 5%), color-mix(in srgb, var(--elevated) 85%, var(--fg) 15%))",
  color: "var(--fg)",
};

const SHIMMER_MS = 2000;

export default function HeaderArtistTier() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [data, setData] = useState<ArtistAnalytics | null>(null);
  const [ready, setReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);

  const authed = isLoaded && isSignedIn;

  const load = useCallback(async () => {
    try {
      const token = (await getToken()) ?? undefined;
      setData(await getArtistAnalytics(token));
    } catch {
    } finally {
      setReady(true);
    }
  }, [getToken]);

  useEffect(() => {
    if (!authed) return;
    load();
    const onRefresh = () => load();
    window.addEventListener("rewards:refresh", onRefresh);
    return () => window.removeEventListener("rewards:refresh", onRefresh);
  }, [load, authed]);

  useEffect(() => {
    if (!authed) return;
    const t = window.setTimeout(() => setMinElapsed(true), SHIMMER_MS);
    return () => window.clearTimeout(t);
  }, [authed]);

  if (!authed) return null;

  if (!ready || !minElapsed) {
    return (
      <div className="hidden md:flex items-center gap-2 rounded-full border h-11 md:h-12 px-4 min-w-[128px] flex-shrink-0" style={pillStyle}>
        <span className="ink-shimmer h-4 w-4 rounded-full" />
        <div className="flex flex-col gap-1">
          <span className="ink-shimmer h-3 w-12 rounded" />
          <span className="ink-shimmer h-2 w-8 rounded" />
        </div>
      </div>
    );
  }

  const label = data?.tier?.label ?? "Tiers";

  return (
    <Link
      to="/tiers"
      className="hidden md:flex items-center gap-2 rounded-full border h-11 md:h-12 px-4 min-w-[128px] flex-shrink-0 transition hover:brightness-110"
      style={pillStyle}
      title={`${label} • view artist tiers`}
      aria-label={`Artist tier ${label}, view tiers`}
    >
      <Award className="h-4 w-4" />
      <div className="flex flex-col leading-none">
        <span className="text-[12px] lg:text-[13px] font-bold leading-tight">{label}</span>
        <span className="text-[9px] lg:text-[10px] opacity-70 leading-tight">View tiers</span>
      </div>
    </Link>
  );
}
