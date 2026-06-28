import { describe, test, expect, beforeEach } from "@jest/globals";
import {
  getCachedRole,
  setCachedRole,
  clearCachedRole,
  getCachedUsername,
  setCachedUsername,
  clearCachedUsername,
} from "@/lib/roleCache";

beforeEach(() => {
  localStorage.clear();
});

describe("role cache", () => {
  test("returns null when nothing stored", () => {
    expect(getCachedRole()).toBeNull();
  });

  test("round-trips a valid role", () => {
    setCachedRole("artist");
    expect(getCachedRole()).toBe("artist");
    setCachedRole("studio");
    expect(getCachedRole()).toBe("studio");
    setCachedRole("client");
    expect(getCachedRole()).toBe("client");
  });

  test("ignores an invalid stored role", () => {
    localStorage.setItem("inkmity-role", "wizard");
    expect(getCachedRole()).toBeNull();
  });

  test("clearCachedRole removes role and username", () => {
    setCachedRole("artist");
    setCachedUsername("Jane");
    clearCachedRole();
    expect(getCachedRole()).toBeNull();
    expect(getCachedUsername()).toBeNull();
  });
});

describe("username cache", () => {
  test("returns null when nothing stored", () => {
    expect(getCachedUsername()).toBeNull();
  });

  test("round-trips a non-empty username", () => {
    setCachedUsername("Jane Doe");
    expect(getCachedUsername()).toBe("Jane Doe");
  });

  test("does not store blank/whitespace usernames", () => {
    setCachedUsername("   ");
    expect(getCachedUsername()).toBeNull();
    setCachedUsername("");
    expect(getCachedUsername()).toBeNull();
  });

  test("treats a whitespace-only stored value as null", () => {
    localStorage.setItem("inkmity-username-v2", "   ");
    expect(getCachedUsername()).toBeNull();
  });

  test("clearCachedUsername removes the username", () => {
    setCachedUsername("Jane");
    clearCachedUsername();
    expect(getCachedUsername()).toBeNull();
  });
});
