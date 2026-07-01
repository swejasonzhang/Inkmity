import { describe, test, expect } from "@jest/globals";
import {
  normalizeYears,
  toNumber,
  matchesExperience,
  matchesAvailability,
  matchesKeyword,
  scoreUpcomingArtists,
} from "@/lib/artistDiscovery";

describe("normalizeYears", () => {
  test("truncates finite numbers", () => {
    expect(normalizeYears(4.9)).toBe(4);
    expect(normalizeYears(0)).toBe(0);
  });
  test("strips non-digits from strings", () => {
    expect(normalizeYears("7 years")).toBe(7);
    expect(normalizeYears("12")).toBe(12);
  });
  test("returns undefined for non-string/number or non-finite input", () => {
    expect(normalizeYears(NaN)).toBeUndefined();
    expect(normalizeYears(null)).toBeUndefined();
    expect(normalizeYears(undefined)).toBeUndefined();
  });
  test("a string with no digits collapses to 0 (Number('') === 0)", () => {
    // documents existing behavior: such an artist reads as 0 years experience
    expect(normalizeYears("abc")).toBe(0);
  });
});

describe("toNumber", () => {
  test("parses numbers and comma/space-formatted strings", () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber("1, 200")).toBe(1200);
  });
  test("falls back for junk", () => {
    expect(toNumber("nope", -1)).toBe(-1);
    expect(toNumber(Infinity, 5)).toBe(5);
    expect(toNumber(undefined)).toBe(0);
  });
});

describe("matchesExperience", () => {
  test("'all' always matches; undefined years never match a specific bracket", () => {
    expect(matchesExperience(undefined, "all")).toBe(true);
    expect(matchesExperience(undefined, "veteran")).toBe(false);
  });
  test("brackets are applied at their boundaries", () => {
    expect(matchesExperience(2, "amateur")).toBe(true);
    expect(matchesExperience(3, "amateur")).toBe(false);
    expect(matchesExperience(5, "experienced")).toBe(true);
    expect(matchesExperience(6, "professional")).toBe(true);
    expect(matchesExperience(10, "veteran")).toBe(true);
    expect(matchesExperience(9, "veteran")).toBe(false);
  });
});

describe("matchesAvailability", () => {
  const NOW = new Date("2026-06-30T00:00:00Z");
  const inDays = (n: number) => new Date(NOW.getTime() + n * 86400000).toISOString();

  test("waitlist filter matches only waitlisting/closed artists", () => {
    expect(matchesAvailability({ acceptingWaitlist: true }, "waitlist", NOW)).toBe(true);
    expect(matchesAvailability({ isClosed: true }, "waitlist", NOW)).toBe(true);
    expect(matchesAvailability({ isAvailableNow: true }, "waitlist", NOW)).toBe(false);
  });

  test("'available now' counts as zero days out", () => {
    expect(matchesAvailability({ isAvailableNow: true }, "7d", NOW)).toBe(true);
  });

  test("artists with no date and not-now are excluded from specific windows but kept for 'all'", () => {
    expect(matchesAvailability({}, "all", NOW)).toBe(true);
    expect(matchesAvailability({}, "7d", NOW)).toBe(false);
  });

  test("date windows bucket by days until next availability", () => {
    expect(matchesAvailability({ nextAvailableDate: inDays(5) }, "7d", NOW)).toBe(true);
    expect(matchesAvailability({ nextAvailableDate: inDays(20) }, "7d", NOW)).toBe(false);
    expect(matchesAvailability({ nextAvailableDate: inDays(20) }, "lt1m", NOW)).toBe(true);
    expect(matchesAvailability({ nextAvailableDate: inDays(60) }, "1to3m", NOW)).toBe(true);
    expect(matchesAvailability({ nextAvailableDate: inDays(20) }, "1to3m", NOW)).toBe(false);
    expect(matchesAvailability({ nextAvailableDate: inDays(150) }, "lte6m", NOW)).toBe(true);
  });
});

describe("matchesKeyword", () => {
  const artist = {
    username: "InkByAda",
    location: "Brooklyn",
    bio: "fine line specialist",
    styles: ["Blackwork", "Fine Line"],
  };
  test("an empty query matches everyone", () => {
    expect(matchesKeyword(artist, "")).toBe(true);
  });
  test("matches across username, location, bio and styles (query pre-lowercased)", () => {
    expect(matchesKeyword(artist, "ada")).toBe(true);
    expect(matchesKeyword(artist, "brooklyn")).toBe(true);
    expect(matchesKeyword(artist, "line")).toBe(true); // bio + style
    expect(matchesKeyword(artist, "blackwork")).toBe(true);
  });
  test("returns false when nothing contains the query", () => {
    expect(matchesKeyword(artist, "dragon")).toBe(false);
  });
});

describe("scoreUpcomingArtists", () => {
  const NOW = Date.UTC(2026, 5, 30);
  const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

  test("surfaces newer, less-reviewed artists first and caps at 12", () => {
    const many = Array.from({ length: 15 }, (_v, i) => ({
      id: `a${i}`,
      createdAt: daysAgo(i * 20),
      reviewsCount: i * 3,
      yearsExperience: i,
    }));
    const ranked = scoreUpcomingArtists(many, NOW);
    expect(ranked).toHaveLength(12);
    expect(ranked[0].id).toBe("a0"); // newest + fewest reviews scores lowest → first
  });

  test("a brand-new artist with no history outranks an established one", () => {
    const fresh = { id: "fresh", createdAt: daysAgo(1), reviewsCount: 0, yearsExperience: 0 };
    const veteran = { id: "vet", createdAt: daysAgo(400), reviewsCount: 200, yearsExperience: 15 };
    expect(scoreUpcomingArtists([veteran, fresh], NOW).map((a) => a.id)).toEqual(["fresh", "vet"]);
  });
});
