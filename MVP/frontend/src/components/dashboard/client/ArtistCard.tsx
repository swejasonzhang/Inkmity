import React, { useMemo, useState } from "react";

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
  const [avatarOk, setAvatarOk] = useState(Boolean(artist.profileImage));
  const [bgOk, setBgOk] = useState(Boolean(artist.coverImage));

  const portfolio = useMemo(() => (artist.portfolioImages || []).filter(Boolean), [artist.portfolioImages]);
  const pastWorks = artist.pastWorks?.length ? artist.pastWorks : portfolio;
  const healedWorks = artist.healedWorks?.length ? artist.healedWorks : [];
  const sketches = artist.sketches?.length ? artist.sketches : [];

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
    onClick?.({ ...artist, pastWorks, healedWorks, sketches });
  };

  const Grid: React.FC<{ images: string[]; eager?: number }> = ({ images, eager = 6 }) =>
    images.length ? (
      <div className="grid grid-cols-3 gap-[0.375rem] sm:gap-2">
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative aspect-square w-full overflow-hidden rounded-xl border"
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

  const chip = (text: string, key?: string | number) => (
    <span
      key={key ?? text}
      className="rounded-full px-2.5 py-1 border"
      style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--elevated) 92%, transparent)", color: "var(--fg)" }}
    >
      {text}
    </span>
  );

  const shopLabel = artist.shopName || artist.shop || "";
  const years = typeof artist.yearsExperience === "number" && artist.yearsExperience >= 0 ? `${artist.yearsExperience} yr${artist.yearsExperience === 1 ? "" : "s"} exp` : "";
  const loc = artist.location?.trim() || "";

  const shellClass = fullScreen
    ? "group w-full h-full min-h-0 flex flex-col overflow-hidden rounded-3xl border bg-card/90 transition"
    : "group w-full h-full min-h-[46.25rem] sm:min-h-[46.25rem] md:min-h-[51.25rem] flex flex-col overflow-hidden rounded-3xl border bg-card/90 transition";

  return (
    <div className={shellClass} style={{ borderColor: "var(--border)" }} data-artist-card="true">
      <div className="relative w-full">
        <div className="relative w-full h-[24.125rem] sm:h-[14.375rem] md:h-[22.125rem] lg:h-[25.3125rem] overflow-hidden" style={{ background: "var(--elevated)" }}>
          {bgOk && artist.coverImage ? (
            <img
              src={artist.coverImage}
              alt={`${artist.username} background`}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setBgOk(false)}
            />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--bg) 85%, var(--fg) 15%), color-mix(in oklab, var(--bg) 78%, var(--fg) 22%))" }} />
          )}
          <div className="absolute inset-0" style={{ background: "radial-gradient(80% 80% at 50% 35%, transparent 0%, transparent 55%, color-mix(in oklab, var(--bg) 18%, transparent) 100%)" }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: "6rem", background: "linear-gradient(to top, color-mix(in oklab, var(--bg) 90%, transparent), transparent)" }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] sm:-translate-y-1/2 grid place-items-center gap-2">
            <div className="relative rounded-full overflow-hidden h-36 w-36 sm:h-40 sm:w-40 md:h-44 md:w-44 shadow-2xl ring-2 ring-[color:var(--card)]" style={{ border: `1px solid var(--border)`, background: "var(--card)" }}>
              {avatarOk && artist.profileImage ? (
                <img
                  src={artist.profileImage}
                  alt={`${artist.username} profile`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarOk(false)}
                />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-3xl sm:text-4xl font-semibold" style={{ color: "var(--fg)" }}>
                  {initials}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-7 pt-6 pb-8 flex-1 min-h-0 flex flex-col gap-7">
        <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: "var(--fg)" }}>
            {artist.username}
          </h2>
          <button
            type="button"
            onClick={openProfile}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30 hover:-translate-y-0.5 mt-1"
            style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--elevated) 88%, transparent)", color: "var(--fg)", whiteSpace: "nowrap" }}
            aria-label="View Full Portfolio"
            title="View Full Portfolio"
          >
            View Full Portfolio
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M12.293 4.293a1 1 0 011.414 0L18 8.586a2 2 0 010 2.828l-4.293 4.293a1 1 0 01-1.414-1.414L15.586 11H4a1 1 0 110-2h11.586l-3.293-3.293a1 1 0 010-1.414z" />
            </svg>
          </button>
          <p className="text-sm leading-relaxed max-w-prose mt-1.5 md:mt-2 md:text-base" style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}>
            {bioText}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs md:text-sm">
            {stylesPrimary.map((s, i) => chip(s, `${s}-${i}`))}
            {stylesOverflow > 0 && chip(`+${stylesOverflow} more`, "styles-overflow")}
            {shopLabel && chip(shopLabel, "shop")}
            {years && chip(years, "years")}
            {loc && chip(loc, "loc")}
          </div>
        </div>

        {portfolio.length > 0 && (
          <div className="mt-2">
            <Grid images={portfolio} />
          </div>
        )}

        {healedWorks.length > 0 && (
          <div className="mt-2">
            <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--fg)" }}>
              Healed Works
            </h4>
            <Grid images={healedWorks} />
          </div>
        )}

        {sketches.length > 0 && (
          <div className="mt-2">
            <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--fg)" }}>
              Sketches
            </h4>
            <Grid images={sketches} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistCard;