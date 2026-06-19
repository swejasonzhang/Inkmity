import { describe, test, expect } from "@jest/globals";
import { cn, validateEmail, validatePassword } from "@/lib/utils";

describe("cn", () => {
  test("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  test("lets later tailwind utilities win on conflict", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  test("ignores falsy values", () => {
    const skip: string | false = false;
    expect(cn("a", skip, null, undefined, "c")).toBe("a c");
  });
});

describe("validateEmail", () => {
  test("accepts well-formed addresses", () => {
    expect(validateEmail("name@example.com")).toBe(true);
    expect(validateEmail("a.b+c@sub.domain.co")).toBe(true);
  });

  test("rejects malformed addresses", () => {
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("no-at-sign")).toBe(false);
    expect(validateEmail("missing@tld")).toBe(false);
    expect(validateEmail("a@b.c")).toBe(false);
    expect(validateEmail("spaces in@email.com")).toBe(false);
  });
});

describe("validatePassword", () => {
  test("accepts 6+ chars with an uppercase letter and a digit", () => {
    expect(validatePassword("Abc123")).toBe(true);
    expect(validatePassword("Password1")).toBe(true);
  });

  test("rejects when a requirement is missing", () => {
    expect(validatePassword("abc123")).toBe(false);
    expect(validatePassword("Abcdef")).toBe(false);
    expect(validatePassword("Ab1")).toBe(false);
    expect(validatePassword("")).toBe(false);
  });
});
