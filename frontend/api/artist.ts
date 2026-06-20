// Vercel serverless function: serves per-artist meta to social scrapers.
// Only bot user-agents are routed here (see vercel.json `has` rule); real users
// and JS-rendering crawlers (Google) get the SPA untouched. Bots don't run JS,
// so this returns a small self-contained HTML document with the right <head>.

const SITE = "https://inkmity.com";
const API_BASE = process.env.SSR_API_URL || "https://inkmity-api.onrender.com";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonLdSafe(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function buildArtistDocument(artist: any, handle: string): string {
  const h = String(handle || "").replace(/^@/, "").trim();
  const name = String(artist?.username || h || "Tattoo Artist");
  const url = `${SITE}/artist/${encodeURIComponent(h)}`;
  const bio = String(artist?.bio || "").trim();
  const styles = Array.isArray(artist?.styles) ? artist.styles.filter(Boolean).slice(0, 3) : [];
  const description =
    bio ||
    `See ${name}'s tattoo portfolio${styles.length ? ` — ${styles.join(", ")}` : ""}${artist?.location ? ` in ${artist.location}` : ""
    }, plus reviews and booking on Inkmity.`;
  const title = `${name} (@${h}) — Tattoo Artist · Inkmity`;
  const image =
    artist?.avatarUrl ||
    artist?.avatar?.url ||
    (Array.isArray(artist?.portfolioImages) ? artist.portfolioImages.find(Boolean) : null) ||
    `${SITE}/icon-512.png`;

  const rating = Number(artist?.rating || 0);
  const reviewsCount = Number(artist?.reviewsCount || 0);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    alternateName: `@${h}`,
    jobTitle: "Tattoo Artist",
    url,
    ...(bio ? { description: bio } : {}),
    ...(image ? { image } : {}),
    ...(artist?.location ? { homeLocation: { "@type": "Place", name: artist.location } } : {}),
    ...(rating > 0 && reviewsCount
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating, reviewCount: reviewsCount } }
      : {}),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(url)}" />
<meta property="og:type" content="profile" />
<meta property="og:site_name" content="Inkmity" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:image" content="${esc(image)}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
<script type="application/ld+json">${jsonLdSafe(jsonLd)}</script>
</head>
<body>
<h1>${esc(name)}</h1>
<p>${esc(description)}</p>
<a href="${esc(url)}">View ${esc(name)} on Inkmity</a>
</body>
</html>`;
}

export function buildFallbackDocument(): string {
  const title = "Inkmity — Book Tattoo Artists, Explore Styles, Chat & Schedule";
  const description =
    "Discover tattoo artists by style, message with full context, and book with transparent pricing and rewards.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${SITE}/icon-512.png" />
<meta property="og:url" content="${SITE}/" />
<meta name="twitter:card" content="summary" />
</head>
<body><h1>Inkmity</h1><p>${esc(description)}</p></body>
</html>`;
}

export default async function handler(req: any, res: any) {
  const handle = String(req?.query?.handle || "").replace(/^@/, "").trim();
  let html: string | null = null;

  if (handle) {
    try {
      const r = await fetch(`${API_BASE}/users/artists/by-handle/${encodeURIComponent(handle)}`);
      if (r.ok) {
        const artist = await r.json();
        html = buildArtistDocument(artist, handle);
      }
    } catch {
      // fall through to the generic document
    }
  }
  if (!html) html = buildFallbackDocument();

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");
  res.status(200).send(html);
}
