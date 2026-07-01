import { describe, test, expect } from "@jest/globals";
import { mapReview, sortReviews } from "@/lib/reviews";

describe("mapReview", () => {
  test("maps the common API fields", () => {
    const r = mapReview({ _id: "r1", authorName: "Sam", rating: 5, createdAt: "2026-01-01", title: "Great", comment: "loved it" });
    expect(r).toMatchObject({ _id: "r1", authorName: "Sam", rating: 5, title: "Great", body: "loved it" });
  });

  test("author falls back through reviewerName, reviewer.username, reviewer.email, then 'Client'", () => {
    expect(mapReview({ reviewerName: "Rev" }).authorName).toBe("Rev");
    expect(mapReview({ reviewer: { username: "uname" } }).authorName).toBe("uname");
    expect(mapReview({ reviewer: { email: "e@x.com" } }).authorName).toBe("e@x.com");
    expect(mapReview({}).authorName).toBe("Client");
  });

  test("coerces rating to a number, defaulting to 0", () => {
    expect(mapReview({ rating: "4" }).rating).toBe(4);
    expect(mapReview({}).rating).toBe(0);
  });

  test("body prefers comment over body and defaults to empty", () => {
    expect(mapReview({ body: "from body" }).body).toBe("from body");
    expect(mapReview({ comment: "from comment", body: "ignored" }).body).toBe("from comment");
    expect(mapReview({}).body).toBe("");
  });

  test("photos is the array when present else undefined; blank title becomes undefined", () => {
    expect(mapReview({ photos: ["a.jpg"] }).photos).toEqual(["a.jpg"]);
    expect(mapReview({ photos: "nope" }).photos).toBeUndefined();
    expect(mapReview({ title: "" }).title).toBeUndefined();
  });
});

describe("sortReviews", () => {
  const reviews = [
    { rating: 3, createdAt: "2026-02-01" },
    { rating: 5, createdAt: "2026-01-01" },
    { rating: 1, createdAt: "2026-03-01" },
  ];

  test("high sorts rating descending, low sorts ascending", () => {
    expect(sortReviews(reviews, "high").map((r) => r.rating)).toEqual([5, 3, 1]);
    expect(sortReviews(reviews, "low").map((r) => r.rating)).toEqual([1, 3, 5]);
  });

  test("recent sorts newest first", () => {
    expect(sortReviews(reviews, "recent").map((r) => r.createdAt)).toEqual([
      "2026-03-01",
      "2026-02-01",
      "2026-01-01",
    ]);
  });

  test("does not mutate the input array", () => {
    const snapshot = [...reviews];
    sortReviews(reviews, "high");
    expect(reviews).toEqual(snapshot);
  });
});
