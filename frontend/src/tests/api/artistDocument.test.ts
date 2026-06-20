import { describe, test, expect, jest, afterEach } from "@jest/globals";
import handler, { buildArtistDocument, buildFallbackDocument } from "../../../api/artist";

describe("buildArtistDocument", () => {
  const artist = {
    username: "Jane Ink",
    handle: "@janeink",
    bio: "Fine-line and blackwork specialist.",
    styles: ["Fine line", "Blackwork"],
    location: "Brooklyn, NY",
    avatarUrl: "https://cdn.example.com/jane.jpg",
    rating: 4.8,
    reviewsCount: 12,
  };

  test("emits per-artist title, description, OG image and canonical", () => {
    const html = buildArtistDocument(artist, "janeink");
    expect(html).toContain("<title>Jane Ink (@janeink) — Tattoo Artist · Inkmity</title>");
    expect(html).toContain('content="Fine-line and blackwork specialist."');
    expect(html).toContain('property="og:image" content="https://cdn.example.com/jane.jpg"');
    expect(html).toContain('href="https://inkmity.com/artist/janeink"');
  });

  test("includes Person JSON-LD with aggregate rating", () => {
    const html = buildArtistDocument(artist, "janeink");
    expect(html).toContain('"@type":"Person"');
    expect(html).toContain('"aggregateRating"');
    expect(html).toContain('"ratingValue":4.8');
  });

  test("falls back to a generated description when bio is empty", () => {
    const html = buildArtistDocument({ ...artist, bio: "" }, "janeink");
    expect(html).toContain("See Jane Ink&#39;s tattoo portfolio");
    expect(html).toContain("Fine line, Blackwork");
  });

  test("escapes a malicious bio so it can't break out of tags or scripts", () => {
    const html = buildArtistDocument(
      { ...artist, bio: '"><img src=x onerror=alert(1)></script>' },
      "janeink"
    );
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("</script><");
    expect(html).toContain("&quot;&gt;&lt;img");
  });

  test("fallback document has generic Inkmity meta", () => {
    const html = buildFallbackDocument();
    expect(html).toContain("<h1>Inkmity</h1>");
    expect(html).toContain('property="og:image" content="https://inkmity.com/icon-512.png"');
  });
});

describe("artist meta handler", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  function mockRes() {
    const out: any = {};
    const res: any = {
      setHeader: jest.fn(),
      status: (c: number) => {
        out.code = c;
        return res;
      },
      send: (b: string) => {
        out.body = b;
      },
    };
    return { res, out };
  }

  test("serves per-artist HTML when the API responds", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ username: "Jane Ink", handle: "@janeink" }),
    })) as any;
    const { res, out } = mockRes();
    await handler({ query: { handle: "janeink" } }, res);
    expect(out.code).toBe(200);
    expect(out.body).toContain("Jane Ink (@janeink)");
  });

  test("serves the fallback document when the artist isn't found", async () => {
    global.fetch = jest.fn(async () => ({ ok: false })) as any;
    const { res, out } = mockRes();
    await handler({ query: { handle: "nope" } }, res);
    expect(out.body).toContain("<h1>Inkmity</h1>");
  });
});
