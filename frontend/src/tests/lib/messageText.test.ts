import { describe, test, expect } from "@jest/globals";
import { extractUrls, faviconUrl, splitMessageParts } from "@/lib/messageText";

describe("extractUrls", () => {
  test("finds http and https URLs in a message", () => {
    expect(extractUrls("see https://a.com and http://b.io/x")).toEqual([
      "https://a.com",
      "http://b.io/x",
    ]);
  });

  test("dedupes repeated URLs", () => {
    expect(extractUrls("https://a.com then https://a.com again")).toEqual(["https://a.com"]);
  });

  test("strips trailing punctuation", () => {
    expect(extractUrls("look at https://a.com/page.")).toEqual(["https://a.com/page"]);
  });

  test("returns [] when there are no URLs or the text is empty", () => {
    expect(extractUrls("just some words")).toEqual([]);
    expect(extractUrls("")).toEqual([]);
  });
});

describe("faviconUrl", () => {
  test("returns a favicon URL for the link's domain", () => {
    expect(faviconUrl("https://instagram.com/artist")).toBe(
      "https://www.google.com/s2/favicons?domain=instagram.com&sz=16"
    );
  });

  test("returns null for an unparseable URL", () => {
    expect(faviconUrl("not a url")).toBeNull();
  });
});

describe("splitMessageParts", () => {
  test("splits a message into ordered text and link parts", () => {
    expect(splitMessageParts("hi https://a.com bye")).toEqual([
      { type: "text", value: "hi " },
      { type: "link", value: "https://a.com" },
      { type: "text", value: " bye" },
    ]);
  });

  test("plain text is a single text part", () => {
    expect(splitMessageParts("hello there")).toEqual([{ type: "text", value: "hello there" }]);
  });

  test("empty text yields no parts", () => {
    expect(splitMessageParts("")).toEqual([]);
  });
});
