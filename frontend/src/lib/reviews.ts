// Pure review normalization + sorting extracted from ArtistReviews. The mapping
// (author fallback chain, body from comment/body, photos coercion) is what makes
// raw API reviews renderable, and is now testable in isolation.

export type Review = {
  _id: string;
  authorName: string;
  rating: number;
  createdAt: string | Date;
  title?: string;
  body: string;
  photos?: string[];
};

export type ReviewSort = "recent" | "high" | "low";

/** Normalizes a raw review from the API into the shape the UI renders. */
export function mapReview(raw: any): Review {
  const author =
    raw?.authorName ||
    raw?.reviewerName ||
    raw?.reviewer?.username ||
    raw?.reviewer?.email ||
    "Client";
  return {
    _id: String(raw?._id ?? (raw?.createdAt ?? "") + (raw?.rating ?? "") + (raw?.authorName ?? "")),
    authorName: String(author),
    rating: Number(raw?.rating ?? 0),
    createdAt: raw?.createdAt ?? new Date().toISOString(),
    title: raw?.title || undefined,
    body: String(raw?.comment ?? raw?.body ?? ""),
    photos: Array.isArray(raw?.photos) ? raw.photos : undefined,
  };
}

/** Orders reviews by rating (high/low) or recency (default). Does not mutate input. */
export function sortReviews<T extends { rating: number; createdAt: string | Date }>(
  reviews: T[],
  sort: ReviewSort
): T[] {
  const arr = reviews.slice(0);
  switch (sort) {
    case "high":
      arr.sort((a, b) => b.rating - a.rating);
      break;
    case "low":
      arr.sort((a, b) => a.rating - b.rating);
      break;
    case "recent":
    default:
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }
  return arr;
}
