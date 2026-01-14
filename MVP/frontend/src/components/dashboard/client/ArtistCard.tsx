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
      <div className={`grid ${fullScreen ? "grid-cols-3" : "grid-cols-3"} ${fullScreen ? "gap-1" : "gap-0.5 sm:gap-1 md:gap-1"} w-full max-w-full`}>
        {(fullScreen ? images.slice(0, 3) : images).map((src, i) => (
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
      className={`rounded-full border ${fullScreen ? "px-3 py-1.5 text-sm" : ""}`}
      style={fullScreen ? {
        borderColor: "var(--border)", 
        background: "color-mix(in oklab, var(--elevated) 92%, transparent)", 
        color: "var(--fg)"
      } : {
        borderColor: "var(--border)", 
        background: "color-mix(in oklab, var(--elevated) 92%, transparent)", 
        color: "var(--fg)",
        padding: 'clamp(0.375rem, 0.6vh + 0.15vw, 0.625rem) clamp(0.5rem, 0.8vh + 0.2vw, 0.875rem)',
        fontSize: 'clamp(0.6875rem, 1vh + 0.25vw, 0.875rem)'
      } as React.CSSProperties}
    >
      {text}
    </span>
  );

  const shopLabel = artist.shopName || artist.shop || "";
  const years = typeof artist.yearsExperience === "number" && artist.yearsExperience >= 0 ? `${artist.yearsExperience} yr${artist.yearsExperience === 1 ? "" : "s"} exp` : "";
  const loc = artist.location?.trim() || "";

  const shellClass = fullScreen
    ? "group w-full h-full min-h-0 flex flex-col overflow-hidden rounded-3xl border bg-card/90 transition"
    : "group w-full h-full flex flex-col overflow-hidden rounded-3xl border bg-card/90 transition";

  return (
    <div
      className={fullScreen ? "h-full w-full min-h-0 flex items-center justify-center" : "h-full w-full"}
      style={
        fullScreen
          ? ({ padding: "6px" } as React.CSSProperties)
          : ({ minHeight: 0 } as React.CSSProperties)
      }
    >
      <div className={shellClass} style={{ borderColor: "var(--border)", minHeight: 0 }} data-artist-card="true" data-testid="artist-card">
        <div className={`relative w-full flex-shrink-0 flex items-center justify-center ${fullScreen ? "px-3 pt-2" : ""}`}>
          <div 
            className={`relative flex-shrink-0 w-full rounded-2xl overflow-hidden ${fullScreen ? "" : ""}`} 
            style={fullScreen ? {
              height: "16rem",
              background: "var(--elevated)"
            } : {
              height: 'clamp(10rem, 14vh + 2vw, 18rem)',
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
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--bg) 85%, var(--fg) 15%), color-mix(in oklab, var(--bg) 78%, var(--fg) 22%))" }} />
            )}
            <div className="absolute inset-0" style={{ background: "radial-gradient(80% 80% at 50% 35%, transparent 0%, transparent 55%, color-mix(in oklab, var(--bg) 18%, transparent) 100%)" }} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: "clamp(3rem, 4vw, 4.5rem)", background: "linear-gradient(to top, color-mix(in oklab, var(--bg) 90%, transparent), transparent)" }} />
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 ${fullScreen ? "-translate-y-1/2" : "-translate-y-[60%] sm:-translate-y-1/2"} grid place-items-center gap-2`}>
              <div 
                className={`relative rounded-full overflow-hidden shadow-2xl ring-2 ring-[color:var(--card)] ${fullScreen ? "" : ""}`} 
                style={fullScreen ? {
                  width: "10rem",
                  height: "10rem",
                  border: `1px solid var(--border)`, 
                  background: "var(--card)"
                } : {
                  width: 'clamp(7rem, 9vh + 1.5vw, 11rem)',
                  height: 'clamp(7rem, 9vh + 1.5vw, 11rem)',
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
                      fontSize: "2.25rem"
                    } : {
                      color: "var(--fg)",
                      fontSize: 'clamp(1.75rem, 2.5vh + 0.8vw, 2.75rem)'
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
            padding: 'clamp(0.75rem, 1.8vh + 0.5vw, 1.5rem) clamp(0.875rem, 1.8vh + 0.5vw, 1.5rem)',
            gap: 'clamp(0.5rem, 1.2vh + 0.3vw, 1rem)',
            width: '100%'
          } as React.CSSProperties}
        >
          <div 
            className={`flex flex-col items-center text-center w-full flex-1 ${fullScreen ? "gap-3" : ""}`}
            style={fullScreen ? {} : {
              gap: 'clamp(0.5rem, 1.2vh + 0.3vw, 1rem)',
              width: '100%',
              minWidth: 0
            } as React.CSSProperties}
          >
            <h2 
              className={`font-extrabold tracking-tight ${fullScreen ? "text-3xl" : ""}`} 
              style={fullScreen ? { color: "var(--fg)" } : {
                color: "var(--fg)",
                fontSize: 'clamp(1rem, 1.6vh + 0.6vw, 1.5rem)'
              } as React.CSSProperties}
            >
              {artist.username}
            </h2>
            <button
              type="button"
              onClick={openProfile}
              data-testid="view-portfolio-button"
              className={`inline-flex items-center gap-1 rounded-lg ${fullScreen ? "px-4 py-2 text-base" : ""} font-medium transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30 hover:-translate-y-0.5`}
              style={fullScreen ? {
                borderColor: "var(--border)", 
                background: "color-mix(in oklab, var(--elevated) 88%, transparent)", 
                color: "var(--fg)", 
                whiteSpace: "nowrap"
              } : {
                borderColor: "var(--border)", 
                background: "color-mix(in oklab, var(--elevated) 88%, transparent)", 
                color: "var(--fg)", 
                whiteSpace: "nowrap",
                padding: 'clamp(0.375rem, 0.8vh + 0.2vw, 0.75rem) clamp(0.625rem, 1.2vh + 0.3vw, 1rem)',
                fontSize: 'clamp(0.6875rem, 1.1vh + 0.3vw, 0.9375rem)'
              } as React.CSSProperties}
              aria-label="View Full Portfolio"
              title="View Full Portfolio"
            >
              View Full Portfolio
              <svg 
                className={fullScreen ? "h-5 w-5" : ""} 
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
              className={`${fullScreen ? "text-base" : ""} leading-snug w-full`} 
              style={fullScreen ? {
                color: "color-mix(in oklab, var(--fg) 75%, transparent)",
                marginTop: '0.25rem'
              } : {
                color: "color-mix(in oklab, var(--fg) 75%, transparent)",
                marginTop: 'clamp(0.125rem, 0.3vh + 0.1vw, 0.375rem)',
                fontSize: 'clamp(0.5625rem, 0.85vh + 0.2vw, 0.8125rem)',
                width: '100%',
                maxWidth: '100%'
              } as React.CSSProperties}
            >
              {bioText}
            </p>
            <div 
              className={`${fullScreen ? "mt-2" : ""} flex flex-wrap items-center justify-center ${fullScreen ? "text-sm" : ""}`}
              style={fullScreen ? {} : {
                marginTop: 'clamp(0.25rem, 0.6vh + 0.15vw, 0.625rem)',
                gap: 'clamp(0.375rem, 0.7vh + 0.2vw, 0.625rem)',
                fontSize: 'clamp(0.6875rem, 1vh + 0.25vw, 0.875rem)'
              } as React.CSSProperties}
            >
              {stylesPrimary.map((s, i) => chip(s, `${s}-${i}`))}
              {stylesOverflow > 0 && chip(`+${stylesOverflow} more`, "styles-overflow")}
              {shopLabel && chip(shopLabel, "shop")}
              {years && chip(years, "years")}
              {loc && chip(loc, "loc")}
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
              <Grid images={recentWorks} />
            </div>
          )}

          {!fullScreen && healedWorks.length > 0 && (
            <div className="w-full max-w-full flex-shrink-0" style={{ marginTop: 'clamp(0.375rem, 0.8vh + 0.2vw, 0.75rem)', paddingLeft: 'clamp(0.625rem, 1.2vh + 0.3vw, 1rem)', paddingRight: 'clamp(0.625rem, 1.2vh + 0.3vw, 1rem)', paddingBottom: 'clamp(0.5rem, 0.8vh + 0.2vw, 0.75rem)', width: '100%' } as React.CSSProperties}>
              <h4 
                className="font-semibold" 
                style={{ 
                  color: "var(--fg)",
                  fontSize: 'clamp(0.625rem, 0.9vh + 0.2vw, 0.75rem)',
                  marginBottom: 'clamp(0.25rem, 0.5vh + 0.15vw, 0.5rem)'
                } as React.CSSProperties}
              >
                Healed Works
              </h4>
              <Grid images={healedWorks} />
            </div>
          )}

          {!fullScreen && sketches.length > 0 && (
            <div className="w-full max-w-full flex-shrink-0" style={{ marginTop: 'clamp(0.375rem, 0.8vh + 0.2vw, 0.75rem)', paddingLeft: 'clamp(0.625rem, 1.2vh + 0.3vw, 1rem)', paddingRight: 'clamp(0.625rem, 1.2vh + 0.3vw, 1rem)', paddingBottom: 'clamp(0.5rem, 0.8vh + 0.2vw, 0.75rem)', width: '100%' } as React.CSSProperties}>
              <h4 
                className="font-semibold" 
                style={{ 
                  color: "var(--fg)",
                  fontSize: 'clamp(0.625rem, 0.9vh + 0.2vw, 0.75rem)',
                  marginBottom: 'clamp(0.25rem, 0.5vh + 0.15vw, 0.5rem)'
                } as React.CSSProperties}
              >
                Sketches
              </h4>
              <Grid images={sketches} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistCard;