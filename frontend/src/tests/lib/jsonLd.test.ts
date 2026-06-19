import { describe, test, expect } from "@jest/globals";
import { jsonLdSafe } from "@/lib/jsonLd";

describe("jsonLdSafe", () => {
  test("escapes </script> so user content can't break out of a script tag", () => {
    const out = jsonLdSafe({ bio: "</script><img src=x onerror=alert(1)>" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<img");
    expect(out).toContain("\\u003c");
  });

  test("escapes <, >, and &", () => {
    expect(jsonLdSafe("<&>")).toBe('"\\u003c\\u0026\\u003e"');
  });

  test("still round-trips back to the original via JSON.parse", () => {
    const data = { name: "A & B <tag>", n: 3, nested: { x: ">" } };
    expect(JSON.parse(jsonLdSafe(data))).toEqual(data);
  });
});
