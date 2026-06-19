import { describe, test, expect } from "@jest/globals";
import { titleCase, displayNameFromUsername, formatCurrency } from "@/lib/format";

describe("titleCase", () => {
  test("returns empty string for empty/undefined input", () => {
    expect(titleCase()).toBe("");
    expect(titleCase("")).toBe("");
  });

  test("capitalizes each word", () => {
    expect(titleCase("hello world")).toBe("Hello World");
  });

  test("keeps small words lowercase unless they lead", () => {
    expect(titleCase("the lord of the rings")).toBe("The Lord of the Rings");
  });

  test("capitalizes across hyphens", () => {
    expect(titleCase("black-grey style")).toBe("Black-Grey Style");
  });

  test("collapses surrounding and internal whitespace", () => {
    expect(titleCase("  neo   traditional  ")).toBe("Neo Traditional");
  });
});

describe("displayNameFromUsername", () => {
  test("returns empty string for empty/undefined input", () => {
    expect(displayNameFromUsername()).toBe("");
    expect(displayNameFromUsername("")).toBe("");
  });

  test("turns separators into spaces and title-cases", () => {
    expect(displayNameFromUsername("jane_doe")).toBe("Jane Doe");
    expect(displayNameFromUsername("ink-master")).toBe("Ink Master");
  });

  test("collapses repeated separators and trims", () => {
    expect(displayNameFromUsername("__a--b__")).toBe("A B");
  });
});

describe("formatCurrency", () => {
  test("formats cents as USD with thousands separators", () => {
    expect(formatCurrency(150000)).toBe("$1,500.00");
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(999)).toBe("$9.99");
  });

  test("treats non-finite input as zero", () => {
    expect(formatCurrency(NaN)).toBe("$0.00");
    expect(formatCurrency(Infinity)).toBe("$0.00");
  });
});
