import React, { useMemo, useState } from "react";
import { Star, MapPin, Clock, DollarSign, Store, Image as ImageIcon } from "lucide-react";
import { formatActivityStatus } from "@/utils/activity";

interface Artist {
  _id: string;
  username: string;
  bio?: string;
  location?: string;
  style?: string[] | string;
  styles?: string[] | string;
  priceRange?: { min: number; max: number };
  rating?: number;
  reviewsCount?: number;
  yearsExperience?: number;
  profileImage?: string;
  coverImage?: string;
  portfolioImages?: string[];
  pastWorks?: string[];
  healedWorks?: string[];
  sketches?: string[];
  clerkId?: string;
  bookingPreference?: "open" | "waitlist" | "closed" | "referral" | "guest";
  travelFrequency?: "rare" | "sometimes" | "often" | "touring" | "guest_only";
  shop?: string;
  shopName?: string;
}

interface ArtistCardProps {
  artist: Artist;
  onClick?: (artistWithGroups: Artist & { pastWorks: string[]; healedWorks: string[]; sketches: string[] }) => void;
  fullScreen?: boolean;
}

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onClick, fullScreen = false }) => {
  const profileImageUrl = artist.profileImage || (artist as any).avatar?.url || (artist as any).avatarUrl || null;
  const [avatarOk, setAvatarOk] = useState(Boolean(profileImageUrl));
  const [bgOk, setBgOk] = useState(Boolean(artist.coverImage));

  const portfolio = useMemo(() => (artist.portfolioImages || []).filter(Boolean), [artist.portfolioImages]);
  const recentWorks = portfolio.slice(0, 3);
  const pastWorks = (artist.pastWorks || []).filter(Boolean);
  const healedWorks = (artist.healedWorks || []).filter(Boolean);
  const sketches = (artist.sketches || []).filter(Boolean);

  const initials = useMemo(() => (artist.username || "A").split(" ").map(s => s[0]?.toUpperCase()).slice(0, 2).join(""), [artist.username]);

  const bioText = (artist.bio || "").trim() || `Nice to meet you, I'm ${artist.username || "this artist"}, let's talk about your next tattoo.`;

  const stylesClean = useMemo(() => {
    const raw = (artist as any).styles ?? artist.style ?? [];
    const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[;,/]+/) : [];
    return arr.map(s => String(s).trim()).filter(Boolean);
  }, [artist]);

  const stylesPrimary = stylesClean.slice(0, 3);
  const stylesOverflow = Math.max(0, stylesClean.length - stylesPrimary.length);

  const openProfile = () => {
    if ((window as any).__INK_MODAL_JUST_CLOSED_AT__ && Date.now() - (window as any).__INK_MODAL_JUST_CLOSED_AT__ < 350) return;
    onClick?.({ ...artist, portfolioImages: portfolio, pastWorks, healedWorks, sketches });
  };

  const Grid: React.FC<{ images: string[]; eager?: number }> = ({ images, eager = 6 }) =>
    images.length ? (
      <div className={`grid grid-cols-3 ${fullScreen ? "gap-1.5" : "gap-1.5"} w-full max-w-full`}>
        {(fullScreen ? images.slice(0, 3) : images).map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)]"
            style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
          >
            <img
              src={src}
              alt={`Work ${i + 1}`}
              className="h-full w-full object-cover"
              loading={i < eager ? "eager" : "lazy"}
              decoding="async"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </div>
    ) : null;

  const chipClass = `inline-flex items-center gap-1 rounded-full border whitespace-nowrap ${fullScreen ? "px-2.5 py-1 text-xs" : ""}`;
  const chipStyle: React.CSSProperties = fullScreen
    ? {
      borderColor: "var(--border)",
      background: "color-mix(in srgb, var(--elevated) 92%, transparent)",
      color: "var(--fg)"
    }
    : {
      borderColor: "var(--border)",
      background: "color-mix(in srgb, var(--elevated) 92%, transparent)",
      color: "var(--fg)",
      padding: 'clamp(0.3rem, 0.5vh + 0.12vw, 0.5rem) clamp(0.45rem, 0.7vh + 0.18vw, 0.75rem)',
      fontSize: 'clamp(0.625rem, 0.9vh + 0.22vw, 0.8125rem)'
    };

  const chip = (text: string, key?: string | number) => (
    <span key={key ?? text} className={chipClass} style={chipStyle}>{text}</span>
  );

  const metaChip = (Icon: React.ComponentType<{ className?: string }>, text: string, key: string) => (
    <span key={key} className={chipClass} style={chipStyle}>
      <Icon className={`flex-shrink-0 opacity-70 ${fullScreen ? "h-3.5 w-3.5" : "h-3 w-3"}`} />
      <span className="truncate">{text}</span>
    </span>
  );

  const shopLabel = artist.shopName || artist.shop || "";
  const years = typeof artist.yearsExperience === "number" && artist.yearsExperience >= 0 ? `${artist.yearsExperience} yr${artist.yearsExperience === 1 ? "" : "s"} exp` : "";
  const loc = artist.location?.trim() || "";

  const fmtPrice = (n: number) => (n >= 1000 ? `$${Math.round(n / 100) / 10}k` : `$${n}`);
  const pr = artist.priceRange;
  const priceText =
    pr && (Number(pr.min) > 0 || Number(pr.max) > 0)
      ? `${fmtPrice(Number(pr.min || 0))}–${fmtPrice(Number(pr.max || 0))}`
      : "";
  const portfolioCount = portfolio.length;

  const ratingValue = typeof artist.rating === "number" ? artist.rating : Number(artist.rating ?? 0);
  const reviewsCount = Number(artist.reviewsCount ?? 0);
  const hasRating = Number.isFinite(ratingValue) && ratingValue > 0;

  const isOnline = (artist as any).isOnline === true;
  const lastActiveRaw = (artist as any).lastActive;
  const lastActiveText = lastActiveRaw ? formatActivityStatus(false, lastActiveRaw) : "";
  const showStatus = isOnline || (!!lastActiveText && lastActiveText !== "Never active");

  const shellClass = fullScreen
    ? "group w-full h-full min-h-0 flex flex-col overflow-hidden rounded-3xl border transition"
    : "group w-full h-full flex flex-col overflow-hidden rounded-3xl border cursor-pointer";

  return (
    <div
      className={fullScreen ? "h-full w-full min-h-0 flex items-center justify-center" : "h-full w-full"}
      style={
        fullScreen
          ? ({ padding: "6px" } as React.CSSProperties)
          : ({ minHeight: 0 } as React.CSSProperties)
      }
    >
      <div className={shellClass} style={{ borderColor: "var(--border)", minHeight: 0, background: "linear-gradient(155deg, color-mix(in srgb, var(--card) 86%, var(--fg) 14%) 0%, var(--card) 42%, color-mix(in srgb, var(--card) 80%, var(--fg) 20%) 100%)" }} data-artist-card="true" data-testid="artist-card" onClick={!fullScreen ? openProfile : undefined}>
        <div className={`relative w-full flex-shrink-0 flex items-center justify-center ${fullScreen ? "px-3 pt-2" : ""}`}>
          <div
            className={`relative flex-shrink-0 w-full rounded-2xl overflow-hidden ${fullScreen ? "" : ""}`}
            style={fullScreen ? {
              height: "clamp(8.5rem, 26vh, 15rem)",
              background: "var(--elevated)"
            } : {
              aspectRatio: '16 / 10',
              maxHeight: 'clamp(9.5rem, 14vh + 2.5vw, 16rem)',
              background: "var(--elevated)"
            } as React.CSSProperties}
          >
            {bgOk && artist.coverImage ? (
              <img
                src={artist.coverImage}
                alt={`${artist.username} background`}
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setBgOk(false)}
              />
            ) : (
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--bg) 85%, var(--fg) 15%), color-mix(in srgb, var(--bg) 78%, var(--fg) 22%))" }} />
            )}
            <div className="absolute inset-0" style={{ background: "radial-gradient(80% 80% at 50% 35%, transparent 0%, transparent 55%, color-mix(in srgb, var(--bg) 18%, transparent) 100%)" }} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: "clamp(3rem, 4vw, 4.5rem)", background: "linear-gradient(to top, color-mix(in srgb, var(--bg) 90%, transparent), transparent)" }} />
            {hasRating && (
              <div
                className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm"
                style={{
                  borderColor: "var(--border)",
                  background: "color-mix(in srgb, var(--bg) 68%, transparent)",
                  color: "var(--fg)",
                }}
              >
                <Star className="h-3 w-3 fill-current" aria-hidden />
                {ratingValue.toFixed(1)}
                {reviewsCount > 0 && <span className="font-normal opacity-60">({reviewsCount})</span>}
              </div>
            )}
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 ${fullScreen ? "-translate-y-1/2" : "-translate-y-[60%] sm:-translate-y-1/2"} grid place-items-center gap-2`}>
              <div
                className={`relative rounded-full overflow-hidden shadow-2xl ring-2 ring-[color:var(--card)] ${fullScreen ? "" : ""}`}
                style={fullScreen ? {
                  width: "clamp(4.25rem, 11vh, 6.75rem)",
                  height: "clamp(4.25rem, 11vh, 6.75rem)",
                  border: `1px solid var(--border)`,
                  background: "var(--card)"
                } : {
                  width: 'clamp(4rem, 5.5vh + 1vw, 6.5rem)',
                  height: 'clamp(4rem, 5.5vh + 1vw, 6.5rem)',
                  border: `1px solid var(--border)`,
                  background: "var(--card)"
                } as React.CSSProperties}
              >
                {avatarOk && profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={`${artist.username} profile`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarOk(false)}
                  />
                ) : (
                  <span
                    className="absolute inset-0 grid place-items-center font-semibold"
                    style={fullScreen ? {
                      color: "var(--fg)",
                      fontSize: "clamp(1.25rem, 4vh, 1.9rem)"
                    } : {
                      color: "var(--fg)",
                      fontSize: 'clamp(1.1rem, 1.8vh + 0.5vw, 1.85rem)'
                    } as React.CSSProperties}
                  >
                    {initials}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div
          className={`${fullScreen ? "px-3 pt-2 pb-2 flex-1 min-h-0 flex flex-col items-center justify-center" : "flex flex-col items-center flex-1 min-h-0 w-full"}`}
          style={fullScreen ? {} : {
            padding: 'clamp(0.5rem, 1.2vh + 0.4vw, 1rem) clamp(0.625rem, 1.2vh + 0.4vw, 1rem)',
            gap: 'clamp(0.375rem, 0.9vh + 0.25vw, 0.75rem)',
            width: '100%'
          } as React.CSSProperties}
        >
          <div
            className={`flex flex-col items-center text-center w-full flex-1 ${fullScreen ? "gap-2 justify-center" : ""}`}
            style={fullScreen ? {} : {
              gap: 'clamp(0.5rem, 1.2vh + 0.3vw, 1rem)',
              width: '100%',
              minWidth: 0
            } as React.CSSProperties}
          >
            <div className="flex flex-col items-center gap-1.5">
              <h2
                className="font-extrabold tracking-tight"
                style={fullScreen ? { color: "var(--fg)", fontSize: "clamp(1.15rem, 2.6vh + 0.4vw, 1.6rem)" } : {
                  color: "var(--fg)",
                  fontSize: 'clamp(0.875rem, 1.1vh + 0.4vw, 1.15rem)'
                } as React.CSSProperties}
              >
                {artist.username}
              </h2>
              {showStatus && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-none"
                  style={{
                    borderColor: "var(--border)",
                    background: "color-mix(in srgb, var(--elevated) 70%, transparent)",
                    color: isOnline ? "var(--fg)" : "color-mix(in srgb, var(--fg) 70%, transparent)",
                  }}
                  title={isOnline ? "Currently active" : lastActiveText}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-white" : ""}`}
                    style={isOnline ? undefined : { background: "color-mix(in srgb, var(--fg) 40%, transparent)" }}
                  />
                  {isOnline ? "Online" : lastActiveText}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openProfile(); }}
              data-testid="view-portfolio-button"
              className={`ink-gloss inline-flex items-center gap-1.5 rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30 hover:opacity-90 shadow-sm`}
              style={fullScreen ? {
                background: "var(--fg)",
                color: "var(--bg)",
                whiteSpace: "nowrap",
                padding: "clamp(0.4rem, 0.9vh + 0.2vw, 0.6rem) clamp(0.85rem, 1.6vh, 1.15rem)",
                fontSize: "clamp(0.75rem, 1.5vh, 0.95rem)"
              } : {
                background: "var(--fg)",
                color: "var(--bg)",
                whiteSpace: "nowrap",
                padding: 'clamp(0.375rem, 0.8vh + 0.2vw, 0.75rem) clamp(0.75rem, 1.4vh + 0.35vw, 1.125rem)',
                fontSize: 'clamp(0.6875rem, 1.1vh + 0.3vw, 0.9375rem)'
              } as React.CSSProperties}
              aria-label="View Full Portfolio"
              title="View Full Portfolio"
            >
              View Full Portfolio
              <svg
                className={fullScreen ? "h-4 w-4" : ""}
                style={fullScreen ? {} : {
                  width: 'clamp(0.875rem, 1.4vh + 0.35vw, 1.125rem)',
                  height: 'clamp(0.875rem, 1.4vh + 0.35vw, 1.125rem)'
                } as React.CSSProperties}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12.293 4.293a1 1 0 011.414 0L18 8.586a2 2 0 010 2.828l-4.293 4.293a1 1 0 01-1.414-1.414L15.586 11H4a1 1 0 110-2h11.586l-3.293-3.293a1 1 0 010-1.414z" />
              </svg>
            </button>
            <p
              className={`${fullScreen ? "line-clamp-3" : ""} leading-snug w-full`}
              style={fullScreen ? {
                color: "color-mix(in srgb, var(--fg) 75%, transparent)",
                marginTop: '0.25rem',
                fontSize: "clamp(0.75rem, 1.5vh, 0.9rem)"
              } : {
                color: "color-mix(in srgb, var(--fg) 75%, transparent)",
                marginTop: 'clamp(0.125rem, 0.3vh + 0.1vw, 0.375rem)',
                fontSize: 'clamp(0.5625rem, 0.85vh + 0.2vw, 0.8125rem)',
                width: '100%',
                maxWidth: '100%'
              } as React.CSSProperties}
            >
              {bioText}
            </p>
            <div
              className={`${fullScreen ? "mt-1" : ""} flex flex-wrap items-center justify-center ${fullScreen ? "text-xs gap-1.5" : ""}`}
              style={fullScreen ? {} : {
                marginTop: 'clamp(0.25rem, 0.6vh + 0.15vw, 0.625rem)',
                gap: 'clamp(0.375rem, 0.7vh + 0.2vw, 0.625rem)',
                fontSize: 'clamp(0.6875rem, 1vh + 0.25vw, 0.875rem)'
              } as React.CSSProperties}
            >
              {stylesPrimary.map((s, i) => chip(s, `${s}-${i}`))}
              {stylesOverflow > 0 && chip(`+${stylesOverflow} more`, "styles-overflow")}
              {loc && metaChip(MapPin, loc, "loc")}
              {years && metaChip(Clock, years, "years")}
              {priceText && metaChip(DollarSign, priceText, "price")}
              {shopLabel && metaChip(Store, shopLabel, "shop")}
            </div>
          </div>

          {recentWorks.length > 0 && (
            <div
              className={`${fullScreen ? "mt-2 w-full max-w-full mx-auto px-2" : "flex-shrink-0 w-full max-w-full mt-auto"}`}
              style={fullScreen ? {} : {
                marginTop: 'auto',
                paddingLeft: 'clamp(0.625rem, 1.2vh + 0.3vw, 1rem)',
                paddingRight: 'clamp(0.625rem, 1.2vh + 0.3vw, 1rem)',
                paddingTop: 'clamp(0.5rem, 0.8vh + 0.2vw, 0.75rem)',
                paddingBottom: 'clamp(0.5rem, 0.8vh + 0.2vw, 0.75rem)',
                width: '100%'
              } as React.CSSProperties}
            >
              {!fullScreen && (
                <div
                  className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: "color-mix(in srgb, var(--fg) 55%, transparent)" }}
                >
                  <span className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--fg) 14%, transparent)" }} />
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    Recent work{portfolioCount > 0 ? ` · ${portfolioCount}` : ""}
                  </span>
                  <span className="h-px flex-1" style={{ background: "color-mix(in srgb, var(--fg) 14%, transparent)" }} />
                </div>
              )}
              <Grid images={recentWorks} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistCard;