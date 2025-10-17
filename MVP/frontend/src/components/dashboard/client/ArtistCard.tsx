import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

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
  images?: string[];
  pastWorks?: string[];
  sketches?: string[];
  clerkId?: string;
}

interface ArtistCardProps {
  artist: Artist;
  onClick?: (artistWithGroups: Artist & { pastWorks: string[]; sketches: string[] }) => void;
  onUpdateProfileImage?: (file: File, artist: Artist) => void;
  onUpdateCoverImage?: (file: File, artist: Artist) => void;
  onMessage?: (
    artist: {
      _id: string;
      username: string;
      bio?: string;
      pastWorks: string[];
      sketches?: string[];
      clerkId?: string;
    },
    preloadedMessage: string
  ) => void;
}

const MOCK_GALLERY: string[] = [
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='560' height='320'><rect width='100%' height='100%' fill='%23E5E7EB'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%236B7280' font-size='20' font-family='sans-serif'>Mock Image 1</text></svg>`,
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='560' height='320'><rect width='100%' height='100%' fill='%23F3F4F6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-size='20' font-family='sans-serif'>Mock Image 2</text></svg>`,
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='560' height='320'><rect width='100%' height='100%' fill='%23D1D5DB'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23565C68' font-size='20' font-family='sans-serif'>Mock Image 3</text></svg>`,
];

const ENV_API = (import.meta as any)?.env?.VITE_API_URL || import.meta.env?.VITE_API_URL || "";
const PRIMARY_BASE = String(ENV_API).replace(/\/$/, "");
const API_BASES = [PRIMARY_BASE, "/api"].filter(Boolean);
const joinUrl = (base: string, path: string) => `${base.replace(/\/$/, "")}/${String(path).replace(/^\//, "")}`;

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onClick }) => {
  const { getToken } = useAuth();

  const [avatarOk, setAvatarOk] = useState(Boolean(artist.profileImage));
  const [bgOk, setBgOk] = useState(Boolean(artist.coverImage));
  const [avgRating, setAvgRating] = useState<number | null>(
    typeof artist.rating === "number" ? Math.round(artist.rating * 10) / 10 : null
  );
  const [numRatings, setNumRatings] = useState<number | null>(
    typeof artist.reviewsCount === "number" ? artist.reviewsCount : null
  );
  const [ratingErr, setRatingErr] = useState<string | null>(null);
  const [ratingLoading, setRatingLoading] = useState<boolean>(false);

  const initials = useMemo(
    () =>
      (artist.username || "A")
        .split(" ")
        .map((s) => s[0]?.toUpperCase())
        .slice(0, 2)
        .join(""),
    [artist.username]
  );

  const hasRealImages = Boolean(artist.images && artist.images.filter(Boolean).length > 0);
  const allImages = (hasRealImages ? artist.images!.filter(Boolean) : MOCK_GALLERY).slice(0, 12);

  const pastWorks = artist.pastWorks?.length ? artist.pastWorks : allImages.filter((_, i) => i % 2 === 0);
  const sketches = artist.sketches?.length ? artist.sketches : allImages.filter((_, i) => i % 2 === 1);
  const highlights = allImages.slice(0, 3);

  const avatarSrc = avatarOk ? artist.profileImage : undefined;
  const coverSrc = bgOk ? artist.coverImage : undefined;

  useEffect(() => {
    let abort = false;
    const alreadyHas = avgRating !== null && numRatings !== null;
    if (alreadyHas) {
      setRatingErr(null);
      return;
    }
    const fetchRatings = async () => {
      setRatingLoading(true);
      setRatingErr(null);
      try {
        const token = await getToken();
        let lastErr: any = null;
        for (const base of API_BASES) {
          try {
            const url = joinUrl(base, `/users/${artist._id}`);
            const res = await fetch(url, {
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
            const ctype = res.headers.get("content-type") || "";
            if (!res.ok) {
              const txt = await res.text().catch(() => "");
              throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url}\n${txt.slice(0, 200)}`);
            }
            if (!ctype.toLowerCase().includes("application/json")) {
              const txt = await res.text().catch(() => "");
              throw new Error(`Non-JSON response @ ${url}\n${txt.slice(0, 200)}`);
            }
            const json = await res.json();
            const reviews: any[] = Array.isArray(json?.reviews) ? json.reviews : [];
            const count = reviews.length;
            let avg = 0;
            if (count > 0) {
              const sum = reviews.reduce((acc, r) => acc + Number(r?.rating || 0), 0);
              avg = Math.round((sum / count) * 10) / 10;
            } else if (typeof json?.rating === "number") {
              avg = Math.round(json.rating * 10) / 10;
            }
            if (!abort) {
              setAvgRating(count > 0 ? avg : avg || 0);
              setNumRatings(count > 0 ? count : Number(json?.reviewsCount ?? 0));
            }
            lastErr = null;
            break;
          } catch (e: any) {
            lastErr = e;
            continue;
          }
        }
        if (lastErr) throw lastErr;
      } catch (e: any) {
        if (!abort) setRatingErr(e?.message || "Failed to load rating");
      } finally {
        if (!abort) setRatingLoading(false);
      }
    };
    fetchRatings();
    return () => {
      abort = true;
    };
  }, [artist._id, getToken, avgRating, numRatings]);

  const ratingText =
    ratingLoading ? "…" : avgRating !== null && !Number.isNaN(avgRating) ? avgRating.toFixed(1) : "—";

  const countText =
    numRatings !== null
      ? `(${numRatings} ${numRatings === 1 ? "Review" : "Reviews"})`
      : "(— Reviews)";

  const openProfile = () => {
    if ((window as any).__INK_MODAL_JUST_CLOSED_AT__ && Date.now() - (window as any).__INK_MODAL_JUST_CLOSED_AT__ < 350) return;
    onClick?.({
      ...artist,
      pastWorks,
      sketches,
    });
  };

  return (
    <>
      <div
        className="group w-full h-full min-h[620px] min-h-[620px] overflow-hidden rounded-3xl border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl focus-within:ring-1 focus-within:ring-[color:var(--fg)]/20"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="relative w-full overflow-hidden">
          <div className="relative w-full h-52 sm:h-64 md:h-72" style={{ background: "var(--elevated)" }}>
            {coverSrc ? (
              <img
                src={coverSrc}
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
              style={{
                background:
                  "radial-gradient(80% 80% at 50% 35%, transparent 0%, transparent 55%, color-mix(in oklab, var(--bg) 18%, transparent) 100%)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
              style={{
                background:
                  "linear-gradient(to top, color-mix(in oklab, var(--bg) 90%, transparent), transparent)",
              }}
            />

            <div className="absolute left-1/2 top-[44%] sm:top-1/2 -translate-x-1/2 -translate-y-[60%] sm:-translate-y-1/2 grid place-items-center gap-2">
              <div
                className="relative rounded-full overflow-hidden h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 shadow-2xl ring-2 ring-[color:var(--card)]"
                style={{ border: `1px solid var(--border)`, background: "var(--card)" }}
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={`${artist.username} profile`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarOk(false)}
                  />
                ) : (
                  <span
                    className="absolute inset-0 grid place-items-center text-2xl sm:text-3xl font-semibold"
                    style={{ color: "var(--fg)" }}
                  >
                    {initials}
                  </span>
                )}
              </div>
            </div>

            {!!artist.style?.length && (
              <div className="absolute right-3 bottom-1 sm:bottom-3 flex flex-wrap items-center gap-1.5">
                {artist.style.slice(0, 3).map((s) => (
                  <span
                    key={s}
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-medium border backdrop-blur"
                    style={{
                      background: "color-mix(in oklab, var(--elevated) 70%, transparent)",
                      color: "var(--fg)",
                      borderColor: "var(--border)",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pt-5 pb-6 flex-1 min-h-0 flex flex-col gap-6">
          <div className="flex flex-col items-center text-center gap-3">
            <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--fg)" }}>
              {artist.username}
            </h2>

            <button
              type="button"
              onClick={openProfile}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fg)]/30 hover:-translate-y-0.5"
              style={{
                borderColor: "var(--border)",
                background: "color-mix(in oklab, var(--elevated) 88%, transparent)",
                color: "var(--fg)",
                whiteSpace: "nowrap",
              }}
              aria-label="View Full Portfolio"
              title="View Full Portfolio"
            >
              View Full Portfolio
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M12.293 4.293a1 1 0 011.414 0L18 8.586a2 2 0 010 2.828l-4.293 4.293a1 1 0 01-1.414-1.414L15.586 11H4a1 1 0 110-2h11.586l-3.293-3.293a1 1 0 010-1.414z" />
              </svg>
            </button>

            <p className="text-sm leading-relaxed max-w-prose" style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}>
              {artist.bio || "No bio available."}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs" style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}>
              <div>
                <span style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>Location</span>{" "}
                <span className="font-medium" style={{ color: "var(--fg)" }}>
                  {artist.location || "Unknown"}
                </span>
              </div>
              <span className="h-3 w-px" style={{ background: "color-mix(in oklab, var(--fg) 15%, transparent)" }} />
              <div>
                <span style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>Price</span>{" "}
                <span className="font-semibold" style={{ color: "var(--fg)" }}>
                  {artist.priceRange ? `$${artist.priceRange.min}–$${artist.priceRange.max}` : "N/A"}
                </span>
              </div>
              <span className="h-3 w-px" style={{ background: "color-mix(in oklab, var(--fg) 15%, transparent)" }} />
              <div>
                <span style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>Experience</span>{" "}
                <span className="font-medium" style={{ color: "var(--fg)" }}>
                  {typeof artist.yearsExperience === "number" ? `${artist.yearsExperience} yr${artist.yearsExperience === 1 ? "" : "s"}` : "N/A"}
                </span>
              </div>
            </div>

            <div className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>Rating</div>
            <div className="font-semibold text-base" style={{ color: "var(--fg)" }}>
              {ratingText}{" "}
              <span className="text-xs" style={{ color: "color-mix(in oklab, var(--fg) 55%, transparent)" }}>
                {countText}
              </span>
            </div>
            {ratingErr && (
              <div className="text-[11px]" style={{ color: "color-mix(in oklab, var(--fg) 55%, transparent)" }}>
                {ratingErr}
              </div>
            )}
          </div>

          <div className="w-full px-6 sm:px-8">
            <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 place-items-center">
              {highlights.map((src, i) => (
                <div key={`${src}-${i}`} className="w-full sm:w-auto">
                  <img
                    src={src}
                    alt={`${artist.username} highlight ${i + 1}`}
                    className="aspect-[7/5] w-full max-w-[420px] object-cover rounded-2xl border shadow-sm"
                    style={{ borderColor: "var(--border)", background: "var(--elevated)" }}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 text-center text-xs sm:text-sm">
              <span style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}>
                Want to see everything, check availability, or send a message?
              </span>{" "}
              <button
                type="button"
                onClick={openProfile}
                className="underline-offset-2 hover:underline font-medium"
                style={{ color: "var(--fg)" }}
                aria-label="Open full portfolio, booking, and messaging"
                title="Open full portfolio, booking, and messaging"
              >
                View Full Portfolio
              </button>
              <span style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}>
                {" "}to view all images, book/availability, and messaging.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ArtistCard;