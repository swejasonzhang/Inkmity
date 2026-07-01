import { computeArtistTier } from "@/lib/artistTier";

export type ArtistFilters = {
  search?: string;
  price?: string;
  location?: string;
  style?: string;
  availability?: string;
  experience?: string;
  booking?: string;
  travel?: string;
};

export type ArtistSort =
  | "highest_rated"
  | "most_reviews"
  | "experience_desc"
  | "experience_asc"
  | "newest"
  | (string & {});

/**
 * Filters and sorts the artist discovery list. Extracted from ClientDashboard so
 * the (non-trivial) matching + ranking rules can be tested in isolation.
 */
export function filterAndSortArtists<T extends Record<string, any>>(
  artists: T[],
  filters: ArtistFilters = {},
  sort: ArtistSort = "highest_rated"
): T[] {
  const {
    search = "",
    price = "all",
    location = "all",
    style = "all",
    availability = "all",
    experience = "all",
    booking = "all",
    travel = "all",
  } = filters;

  const txt = (search || "").trim().toLowerCase();

  const inPrice = (a: any) => {
    if (price === "all") return true;
    const r = a?.priceRange || {};
    const min = Number(r.min ?? 0);
    const max = Number(r.max ?? Number.POSITIVE_INFINITY);
    const [loRaw, hiRaw] = price.split("-");
    const lo = loRaw.endsWith("+") ? Number(loRaw.replace("+", "")) : Number(loRaw);
    const hi = hiRaw ? Number(hiRaw) : Number.POSITIVE_INFINITY;
    return max >= lo && min <= hi;
  };

  const inLocation = (a: any) =>
    location === "all" || (a.location || "").toLowerCase() === location.toLowerCase();

  const inStyle = (a: any) => {
    if (style === "all") return true;
    const arr = Array.isArray(a.styles)
      ? a.styles
      : typeof a.styles === "string"
      ? a.styles.split(/[;,/]+/)
      : [];
    return arr.map((s: any) => String(s).trim().toLowerCase()).includes(style.toLowerCase());
  };

  const inAvail = (a: any) => availability === "all" || a.availabilityCode === availability;

  const inExp = (a: any) => {
    if (experience === "all") return true;
    const y = Number(a.yearsExperience ?? -1);
    if (!Number.isFinite(y) || y < 0) return false;
    if (experience === "amateur") return y <= 2;
    if (experience === "experienced") return y >= 3 && y <= 5;
    if (experience === "professional") return y >= 6 && y <= 10;
    if (experience === "veteran") return y >= 10;
    return true;
  };

  const inBooking = (a: any) => booking === "all" || a.bookingPreference === booking;
  const inTravel = (a: any) => travel === "all" || a.travelFrequency === travel;

  const inSearch = (a: any) => {
    if (!txt) return true;
    const hay = [a.username, a.bio, a.location, ...(Array.isArray(a.styles) ? a.styles : [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(txt);
  };

  const out = artists.filter(
    (a) =>
      inPrice(a) &&
      inLocation(a) &&
      inStyle(a) &&
      inAvail(a) &&
      inExp(a) &&
      inBooking(a) &&
      inTravel(a) &&
      inSearch(a)
  );

  switch (sort) {
    case "highest_rated":
      return [...out].sort(
        (a: any, b: any) =>
          computeArtistTier(b.bookingsCount, b.rating).rank -
            computeArtistTier(a.bookingsCount, a.rating).rank ||
          (b.rating ?? 0) - (a.rating ?? 0) ||
          (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0)
      );
    case "most_reviews":
      return [...out].sort((a: any, b: any) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0));
    case "experience_desc":
      return [...out].sort((a: any, b: any) => (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0));
    case "experience_asc":
      return [...out].sort((a: any, b: any) => (a.yearsExperience ?? 0) - (b.yearsExperience ?? 0));
    case "newest":
      return [...out].sort(
        (a: any, b: any) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
    default:
      return out;
  }
}
