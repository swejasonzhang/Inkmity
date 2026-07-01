import { describe, test, expect } from "@jest/globals";
import { filterAndSortArtists } from "@/lib/artistFilter";

const A = (over: any = {}) => ({ username: "Artist", styles: [], ...over });

describe("filterAndSortArtists — filtering", () => {
  test("returns everyone when no filters and no search are applied", () => {
    const list = [A({ username: "a" }), A({ username: "b" })];
    expect(filterAndSortArtists(list, {}, "none")).toHaveLength(2);
  });

  test("search matches username, bio, location, and styles (case-insensitive)", () => {
    const list = [
      A({ username: "Dragon Ink" }),
      A({ username: "Bob", bio: "loves dragons" }),
      A({ username: "Cy", location: "Dragon City" }),
      A({ username: "Dee", styles: ["Dragonwork"] }),
      A({ username: "Nope" }),
    ];
    const out = filterAndSortArtists(list, { search: "dragon" }, "none");
    expect(out.map((a) => a.username).sort()).toEqual(["Bob", "Cy", "Dee", "Dragon Ink"]);
  });

  test("location is an exact, case-insensitive match", () => {
    const list = [A({ username: "a", location: "Brooklyn" }), A({ username: "b", location: "Queens" })];
    expect(filterAndSortArtists(list, { location: "brooklyn" }, "none").map((a) => a.username)).toEqual(["a"]);
  });

  test("style matches array or delimited-string styles", () => {
    const list = [
      A({ username: "arr", styles: ["Blackwork", "Fineline"] }),
      A({ username: "str", styles: "Traditional; Blackwork" }),
      A({ username: "no", styles: ["Color"] }),
    ];
    expect(filterAndSortArtists(list, { style: "blackwork" }, "none").map((a) => a.username).sort()).toEqual(["arr", "str"]);
  });

  test("experience buckets map to the right year ranges (and exclude unknowns)", () => {
    const list = [
      A({ username: "amateur", yearsExperience: 1 }),
      A({ username: "experienced", yearsExperience: 4 }),
      A({ username: "professional", yearsExperience: 8 }),
      A({ username: "veteran", yearsExperience: 15 }),
      A({ username: "unknown" }),
    ];
    expect(filterAndSortArtists(list, { experience: "amateur" }, "none").map((a) => a.username)).toEqual(["amateur"]);
    expect(filterAndSortArtists(list, { experience: "experienced" }, "none").map((a) => a.username)).toEqual(["experienced"]);
    expect(filterAndSortArtists(list, { experience: "professional" }, "none").map((a) => a.username)).toEqual(["professional"]);
    expect(filterAndSortArtists(list, { experience: "veteran" }, "none").map((a) => a.username)).toEqual(["veteran"]);
  });

  test("price filter keeps artists whose range overlaps the selected band", () => {
    const list = [
      A({ username: "cheap", priceRange: { min: 50, max: 150 } }),
      A({ username: "mid", priceRange: { min: 200, max: 400 } }),
      A({ username: "pricey", priceRange: { min: 500, max: 900 } }),
    ];
    expect(filterAndSortArtists(list, { price: "100-300" }, "none").map((a) => a.username).sort()).toEqual(["cheap", "mid"]);
    expect(filterAndSortArtists(list, { price: "400+" }, "none").map((a) => a.username).sort()).toEqual(["mid", "pricey"]);
  });

  test("booking, travel, and availability are exact-match filters", () => {
    const list = [
      A({ username: "a", bookingPreference: "open", travelFrequency: "often", availabilityCode: "soon" }),
      A({ username: "b", bookingPreference: "waitlist", travelFrequency: "rare", availabilityCode: "later" }),
    ];
    expect(filterAndSortArtists(list, { booking: "open" }, "none").map((a) => a.username)).toEqual(["a"]);
    expect(filterAndSortArtists(list, { travel: "rare" }, "none").map((a) => a.username)).toEqual(["b"]);
    expect(filterAndSortArtists(list, { availability: "soon" }, "none").map((a) => a.username)).toEqual(["a"]);
  });

  test("multiple filters combine with AND", () => {
    const list = [
      A({ username: "match", location: "NYC", bookingPreference: "open" }),
      A({ username: "wrongBooking", location: "NYC", bookingPreference: "waitlist" }),
      A({ username: "wrongLoc", location: "LA", bookingPreference: "open" }),
    ];
    expect(
      filterAndSortArtists(list, { location: "nyc", booking: "open" }, "none").map((a) => a.username)
    ).toEqual(["match"]);
  });
});

describe("filterAndSortArtists — sorting", () => {
  test("most_reviews sorts by review count descending", () => {
    const list = [A({ username: "a", reviewsCount: 2 }), A({ username: "b", reviewsCount: 9 }), A({ username: "c", reviewsCount: 5 })];
    expect(filterAndSortArtists(list, {}, "most_reviews").map((a) => a.username)).toEqual(["b", "c", "a"]);
  });

  test("experience_desc and experience_asc order by years", () => {
    const list = [A({ username: "a", yearsExperience: 3 }), A({ username: "b", yearsExperience: 10 }), A({ username: "c", yearsExperience: 1 })];
    expect(filterAndSortArtists(list, {}, "experience_desc").map((a) => a.username)).toEqual(["b", "a", "c"]);
    expect(filterAndSortArtists(list, {}, "experience_asc").map((a) => a.username)).toEqual(["c", "a", "b"]);
  });

  test("newest sorts by createdAt descending", () => {
    const list = [
      A({ username: "old", createdAt: "2026-01-01" }),
      A({ username: "new", createdAt: "2026-06-01" }),
      A({ username: "mid", createdAt: "2026-03-01" }),
    ];
    expect(filterAndSortArtists(list, {}, "newest").map((a) => a.username)).toEqual(["new", "mid", "old"]);
  });

  test("highest_rated (same tier) ranks a higher rating first", () => {
    const list = [
      A({ username: "lowRating", rating: 4.0, reviewsCount: 100, bookingsCount: 0 }),
      A({ username: "highRating", rating: 5.0, reviewsCount: 1, bookingsCount: 0 }),
    ];
    expect(filterAndSortArtists(list, {}, "highest_rated").map((a) => a.username)[0]).toBe("highRating");
  });

  test("does not mutate the input array", () => {
    const list = [A({ username: "a", reviewsCount: 1 }), A({ username: "b", reviewsCount: 2 })];
    const snapshot = [...list];
    filterAndSortArtists(list, {}, "most_reviews");
    expect(list).toEqual(snapshot);
  });
});
