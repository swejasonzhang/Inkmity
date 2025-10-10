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
  profileImage?: string;
  images?: string[];
}

interface ArtistCardProps {
  artist: Artist;
  onClick: (artist: Artist) => void;
}

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, onClick }) => {
  const [coverOk, setCoverOk] = useState(Boolean(artist.profileImage));
  const initials = useMemo(
    () =>
      (artist.username || "A")
        .split(" ")
        .map((s) => s[0]?.toUpperCase())
        .slice(0, 2)
        .join(""),
    [artist.username]
  );

  const ratingText =
    typeof artist.rating === "number" && !Number.isNaN(artist.rating)
      ? artist.rating.toFixed(1)
      : "0.0";

  const gallery = (artist.images || []).filter(Boolean).slice(0, 6);

  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(artist)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick(artist)}
      className="group w-full h-full min-h-[460px] sm:min-h-[480px] md:min-h-[500px] overflow-hidden rounded-2xl border bg-card shadow-lg transition hover:-translate-y-[1px] hover:shadow-xl focus:outline-none flex flex-col"
      style={{
        borderColor: "var(--border)",
      }}
    >
      <div className="relative w-full overflow-hidden">
        <div className="aspect-[4/3] w-full" style={{ background: "var(--elevated)" }}>
          {artist.profileImage && coverOk ? (
            <img
              src={artist.profileImage}
              alt={`${artist.username} cover`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setCoverOk(false)}
            />
          ) : (
            <div
              className="h-full w-full grid place-items-center"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--bg) 85%, var(--fg) 15%), color-mix(in oklab, var(--bg) 78%, var(--fg) 22%))",
              }}
            >
              <div
                className="h-14 w-14 rounded-full grid place-items-center border"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <span className="font-semibold text-lg" style={{ color: "var(--fg)" }}>
                  {initials}
                </span>
              </div>
            </div>
          )}
        </div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
          style={{
            background: "linear-gradient(to top, color-mix(in oklab, var(--bg) 92%, transparent), transparent)",
          }}
        />
        <div className="absolute bottom-2 right-3 flex flex-wrap items-center gap-1.5">
          {artist.style?.slice(0, 2).map((s) => (
            <span
              key={s}
              className="rounded-full px-2.5 py-0.5 text-[10px] font-medium backdrop-blur border"
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
      </div>

      <div className="px-4 pt-6 pb-4 flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                className="text-lg sm:text-xl font-extrabold tracking-wide truncate"
                style={{ color: "var(--fg)" }}
              >
                {artist.username}
              </h2>
              <p
                className="mt-1 text-xs sm:text-sm"
                style={{ color: "color-mix(in oklab, var(--fg) 75%, transparent)" }}
              >
                {artist.bio || "No bio available."}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <div
                className="text-xs sm:text-sm"
                style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}
              >
                Rating
              </div>
              <div
                className="font-semibold text-sm sm:text-base"
                style={{ color: "var(--fg)" }}
              >
                {ratingText}{" "}
                <span
                  className="text-xs"
                  style={{ color: "color-mix(in oklab, var(--fg) 55%, transparent)" }}
                >
                  ({artist.reviewsCount || 0})
                </span>
              </div>
            </div>
          </div>

          <div
            className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs"
            style={{ color: "color-mix(in oklab, var(--fg) 80%, transparent)" }}
          >
            <div>
              <span style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                Location
              </span>{" "}
              <span className="font-medium" style={{ color: "var(--fg)" }}>
                {artist.location || "Unknown"}
              </span>
            </div>
            <div
              className="h-3 w-px hidden sm:block"
              style={{ background: "color-mix(in oklab, var(--fg) 15%, transparent)" }}
            />
            <div>
              <span style={{ color: "color-mix(in oklab, var(--fg) 60%, transparent)" }}>
                Price
              </span>{" "}
              <span className="font-semibold" style={{ color: "var(--fg)" }}>
                {artist.priceRange ? `$${artist.priceRange.min}–$${artist.priceRange.max}` : "N/A"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex gap-1.5 overflow-x-auto no-scrollbar" onClick={stop}>
            {gallery.length ? (
              gallery.map((src, i) => (
                <img
                  key={`${src}-${i}`}
                  src={src}
                  alt={`${artist.username} portfolio ${i + 1}`}
                  className="h-20 w-28 flex-none rounded-md object-cover border"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  style={{ borderColor: "var(--border)" }}
                />
              ))
            ) : (
              <div
                className="text-xs"
                style={{ color: "color-mix(in oklab, var(--fg) 50%, transparent)" }}
              >
                No portfolio images yet.
              </div>
            )}

            <div className="pt-4 flex justify-end" onClick={stop}>
              <span
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition"
                style={{
                  border: `1px solid var(--border)`,
                  background: "color-mix(in oklab, var(--elevated) 85%, transparent)",
                  color: "var(--fg)",
                }}
              >
                View profile
                <svg
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-0.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M12.293 4.293a1 1 0 011.414 0L18 8.586a2 2 0 010 2.828l-4.293 4.293a1 1 0 01-1.414-1.414L15.586 11H4a1 1 0 110-2h11.586l-3.293-3.293a1 1 0 010-1.414z" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistCard;