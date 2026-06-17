import { jest, describe, test, expect } from "@jest/globals";

const { buildNavItems } = await import("@/components/header/buildNavItems");

describe("buildNavItems", () => {
  test("should return enabled nav items (no discovery link without a role) when signed in", () => {
    const items = buildNavItems(true, jest.fn());
    expect(items).toHaveLength(6);
    expect(items.every((i) => !i.disabled)).toBe(true);
  });

  test("should include core destinations in order", () => {
    const items = buildNavItems(true, jest.fn());
    const labels = items.map((i) => i.label);
    expect(labels).toEqual(["Artists", "Appointments", "Explore", "Tiers", "Contact", "About"]);
  });

  test("should lock EVERY nav link (with gate handler) when signed out", () => {
    const onGate = jest.fn();
    const items = buildNavItems(false, onGate);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.disabled).toBe(true);
      expect(item.onClick).toBe(onGate);
    }
  });

  test("should keep Tiers pointing at /tiers but disabled when signed out", () => {
    const signedOut = buildNavItems(false, jest.fn());
    const tiers = signedOut.find((i) => i.label === "Tiers")!;
    expect(tiers).toBeDefined();
    expect(tiers.to).toBe("/tiers");
    expect(tiers.disabled).toBe(true);
  });

  test("should label the client home as Artists pointing at /artists", () => {
    const items = buildNavItems(true, jest.fn(), "client");
    const labels = items.map((i) => i.label);
    expect(labels[0]).toBe("Artists");
    expect(items[0].to).toBe("/artists");
    expect(labels).toEqual(["Artists", "Appointments", "Explore", "Tiers", "Contact", "About"]);
  });

  test("should give artists a Portfolio link as their discovery destination", () => {
    const items = buildNavItems(true, jest.fn(), "artist");
    const labels = items.map((i) => i.label);
    expect(labels).not.toContain("Artists");
    const discover = items[1];
    expect(discover.label).toBe("Portfolio");
    expect(discover.to).toBe("/portfolio");
  });

  test("should NOT show Portfolio for a signed-out artist (stale cached role)", () => {
    const items = buildNavItems(false, jest.fn(), "artist");
    expect(items.map((i) => i.label)).not.toContain("Portfolio");
  });

  test("should NOT show Explore for providers (artist/studio), but show it for clients", () => {
    expect(buildNavItems(true, jest.fn(), "artist").map((i) => i.label)).not.toContain("Explore");
    expect(buildNavItems(true, jest.fn(), "studio").map((i) => i.label)).not.toContain("Explore");
    expect(buildNavItems(true, jest.fn(), "client").map((i) => i.label)).toContain("Explore");
  });
});
