export type DiscoverArtist = Record<string, any>;

export function normalizeYears(y: unknown): number | undefined {
  if (typeof y === "number" && Number.isFinite(y)) return Math.trunc(y);
  if (typeof y === "string") {
    const n = Number(y.toString().replace(/[^\d]/g, ""));
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return undefined;
}

export function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string") {
    const cleaned = v.replace(/[, ]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function matchesExperience(years: number | undefined, filter: string): boolean {
  if (filter === "all") return true;
  if (years === undefined) return false;
  if (filter === "amateur") return years >= 0 && years <= 2;
  if (filter === "experienced") return years >= 3 && years <= 5;
  if (filter === "professional") return years >= 6 && years <= 10;
  if (filter === "veteran") return years >= 10;
  return true;
}

export function matchesAvailability(a: DiscoverArtist, filter: string, now: Date): boolean {
  const isNow = a.isAvailableNow === true;
  const nextRaw = a.nextAvailableDate as string | undefined;
  const waitlist = a.acceptingWaitlist === true || a.isClosed === true;
  if (filter === "waitlist") return waitlist;
  const next = nextRaw ? new Date(nextRaw) : null;
  if (!next && !isNow) {
    if (filter === "all") return true;
    return false;
  }
  const msDay = 24 * 60 * 60 * 1000;
  const diffDays = isNow ? 0 : Math.ceil(((next as Date).getTime() - now.getTime()) / msDay);
  if (filter === "all") return true;
  if (filter === "7d") return diffDays <= 7;
  if (filter === "lt1m") return diffDays <= 30;
  if (filter === "1to3m") return diffDays > 30 && diffDays <= 90;
  if (filter === "lte6m") return diffDays <= 180;
  return true;
}

export function matchesKeyword(a: DiscoverArtist, q: string): boolean {
  if (!q) return true;
  const styles: string[] = Array.isArray(a.styles) ? a.styles : [];
  const bio = a.bio as string | undefined;
  return (
    !!a.username?.toLowerCase().includes(q) ||
    !!(a.location as string | undefined)?.toLowerCase().includes(q) ||
    (bio ? bio.toLowerCase().includes(q) : false) ||
    styles.some((s) => s.toLowerCase().includes(q))
  );
}

export function scoreUpcomingArtists<T extends DiscoverArtist>(artists: T[], now: number): T[] {
  const scored = artists.map((a) => {
    const created = new Date(a.createdAt ?? 0).getTime();
    const ageDays = created > 0 ? (now - created) / (1000 * 60 * 60 * 24) : 365;
    const reviews = Number(a.reviewsCount ?? 0);
    const years = Number(a.yearsExperience ?? 0);
    const recency = Math.min(ageDays, 365) / 365;
    const reviewed = Math.min(reviews, 50) / 50;
    const experience = Math.min(years, 10) / 10;
    const score = recency * 0.5 + reviewed * 0.3 + experience * 0.2;
    return { a, score };
  });
  return scored
    .sort((x, y) => x.score - y.score)
    .slice(0, 12)
    .map((s) => s.a);
}
