import { describe, test, expect, beforeEach } from "@jest/globals";
import { renderHook } from "@testing-library/react";
import { usePageMeta } from "@/hooks/usePageMeta";

describe("usePageMeta", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });

  test("sets a brand-suffixed document title", () => {
    renderHook(() => usePageMeta({ title: "About" }));
    expect(document.title).toBe("About · Inkmity");
  });

  test("falls back to the default title when title is empty", () => {
    renderHook(() => usePageMeta({ title: "" }));
    expect(document.title).toBe("Inkmity — Book Tattoo Artists, Explore Styles, Chat & Schedule");
  });

  test("upserts description plus og/twitter mirrors", () => {
    renderHook(() => usePageMeta({ title: "Contact", description: "Reach the team." }));
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("Reach the team.");
    expect(document.querySelector('meta[property="og:description"]')?.getAttribute("content")).toBe("Reach the team.");
    expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute("content")).toBe("Contact · Inkmity");
  });

  test("derives canonical and og:url from the given path", () => {
    renderHook(() => usePageMeta({ title: "Tiers", path: "/tiers" }));
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://inkmity.com/tiers");
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe("https://inkmity.com/tiers");
  });

  test("reuses existing tags rather than duplicating on update", () => {
    const { rerender } = renderHook((props: { t: string }) => usePageMeta({ title: props.t }), {
      initialProps: { t: "A" },
    });
    rerender({ t: "B" });
    expect(document.querySelectorAll('meta[property="og:title"]').length).toBe(1);
    expect(document.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(document.title).toBe("B · Inkmity");
  });
});
