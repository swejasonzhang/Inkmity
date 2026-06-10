import { describe, test, expect } from "@jest/globals";
import { sortWaitlistByPriority } from "../../services/waitlistService.js";

describe("sortWaitlistByPriority", () => {
  test("higher tier comes first", () => {
    const sorted = sortWaitlistByPriority([
      { _id: "a", priorityRank: 1, createdAt: "2026-01-01" },
      { _id: "b", priorityRank: 3, createdAt: "2026-01-02" },
      { _id: "c", priorityRank: 0, createdAt: "2026-01-01" },
    ]);
    expect(sorted.map((e) => e._id)).toEqual(["b", "a", "c"]);
  });

  test("same tier falls back to earliest join (FIFO)", () => {
    const sorted = sortWaitlistByPriority([
      { _id: "late", priorityRank: 2, createdAt: "2026-03-10" },
      { _id: "early", priorityRank: 2, createdAt: "2026-03-01" },
    ]);
    expect(sorted.map((e) => e._id)).toEqual(["early", "late"]);
  });

  test("does not mutate the input array", () => {
    const input = [
      { _id: "a", priorityRank: 0, createdAt: "2026-01-02" },
      { _id: "b", priorityRank: 1, createdAt: "2026-01-01" },
    ];
    sortWaitlistByPriority(input);
    expect(input.map((e) => e._id)).toEqual(["a", "b"]);
  });
});
