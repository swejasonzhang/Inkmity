import React, { useMemo, useState } from "react";

interface Artist {
  _id: string;
  username: string;
  bio?: string;
  location?: string;
  style?: string[];
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
}

interface ArtistCardProps {
  artist: Artist;
  onClick?: (artistWithGroups: Artist & { pastWorks: string[]; healedWorks: string[]; sketches: string[] }) => void;
}

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onClick }) => {
  const [avatarOk, setAvatarOk] = useState(Boolean(artist.profileImage));
  const [bgOk, setBgOk] = useState(Boolean(artist.coverImage));

  const portfolio = useMemo(() => (artist.portfolioImages || []).filter(Boolean), [artist.portfolioImages]);
  const pastWorks = artist.pastWorks?.length ? artist.pastWorks : portfolio;
  const healedWorks = artist.healedWorks?.length ? artist.healedWorks : [];
  const sketches = artist.sketches?.length ? artist.sketches : [];

  const initials = useMemo(
    () => (artist.username || "A").split(" ").map((s) => s[0]?.toUpperCase()).slice(0, 2).join(""),
    [artist.username]
  );

  const bioText =
    (artist.bio || "").trim() ||
    `Nice to meet you, I'm ${artist.username || "this artist"}, let's talk about your next tattoo.`;

  const openProfile = () => {
    if ((window as any).__INK_MODAL_JUST_CLOSED_AT__ && Date.now() - (window as any).__INK_MODAL_JUST_CLOSED_AT__ < 350) return;
    onClick?.({ ...artist, pastWorks, healedWorks, sketches });
  };

  const Grid: React.FC<{ images: string[]; eager?: number }> = ({ images, eager = 6 }) =>
    images.length ? (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

  return (
    <div
      className="group w-full h-full min-h[620px] min-h-[620px] overflow-hidden rounded-3xl border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl focus-within:ring-1 focus-within:ring-[color:var(--fg)]/20"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="relative w-full overflow-hidden">
        <div className="relative w-full h-52 sm:h-64 md:h-72" style={{ background: "var(--elevated)" }}>
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
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--bg) 85%, var(--fg) 15%), color-mix(in oklab, var(--bg) 78%, var(--fg) 22%))",
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(80% 80% at 50% 35%, transparent 0%, transparent 55%, color-mix(in oklab, var(--bg) 18%, transparent) 100%)" }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20" style={{ background: "linear-gradient(to top, color-mix(in oklab, var(--bg) 90%, transparent), transparent)" }} />
          <div className="absolute left-1/2 top-[44%] sm:top-1/2 -translate-x-1/2 -translate-y-[60%] sm:-translate-y-1/2 grid place-items-center gap-2">
            <div
              className="relative rounded-full overflow-hidden h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 shadow-2xl ring-2 ring-[color:var(--card)]"
              style={{ border: `1px solid var(--border)`, background: "var(--card)" }}
            >
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
                <span className="absolute inset-0 grid place-items-center text-2xl sm:text-3xl font-semibold" style={{ color: "var(--fg)" }}>
                  {initials}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-5 pb-6 flex-1 min-h-0 flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--fg)" }}>{artist.username}</h2>
          <button
            type="button"
            onClick={openProfile}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30 hover:-translate-y-0.5"
            style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--elevated) 88%, transparent)", color: "var(--fg)", whiteSpace: "nowrap" }}
            aria-label="View Full Portfolio"
            title="View Full Portfolio"
          >
            View Full Portfolio
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M12.293 4.293a1 1 0 011.414 0L18 8.586a2 2 0 010 2.828l-4.293 4.293a1 1 0 01-1.414-1.414L15.586 11H4a1 1 0 110-2h11.586l-3.293-3.293a1 1 0 010-1.414z" />
            </svg>
          </button>
          <p className="text-sm leading-relaxed max-w-prose" style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}>
            {bioText}
          </p>
        </div>

        {portfolio.length > 0 && (
          <div className="mt-2">
            <Grid images={portfolio} />
          </div>
        )}

        {healedWorks.length > 0 && (
          <div className="mt-2">
            <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--fg)" }}>Healed Works</h4>
            <Grid images={healedWorks} />
          </div>
        )}

        {sketches.length > 0 && (
          <div className="mt-2">
            <h4 className="text-sm font-semibold mb-2" style={{ color: "var(--fg)" }}>Sketches</h4>
            <Grid images={sketches} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistCard;