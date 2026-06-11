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
    expect(labels).toEqual(["Dashboard", "Appointments", "Explore", "Tiers", "Contact", "About"]);
  });

  test("should lock auth links (with gate handler) when signed out, leaving public links open", () => {
    const onGate = jest.fn();
    const items = buildNavItems(false, onGate);
    const byLabel = (label: string) => items.find((i) => i.label === label)!;

    for (const label of ["Dashboard", "Appointments"]) {
      expect(byLabel(label).disabled).toBe(true);
      expect(byLabel(label).onClick).toBe(onGate);
    }
    for (const label of ["Explore", "Tiers", "Contact", "About"]) {
      expect(byLabel(label).disabled).toBeUndefined();
      expect(byLabel(label).onClick).toBeUndefined();
    }
  });

  test("should expose Tiers as a public link pointing at /tiers", () => {
    const signedOut = buildNavItems(false, jest.fn());
    const tiers = signedOut.find((i) => i.label === "Tiers")!;
    expect(tiers).toBeDefined();
    expect(tiers.to).toBe("/tiers");
    expect(tiers.disabled).toBeUndefined();
  });

  test("should NOT show an Artists link for clients (dashboard already lists artists)", () => {
    const items = buildNavItems(true, jest.fn(), "client");
    const labels = items.map((i) => i.label);
    expect(labels).not.toContain("Artists");
    expect(labels).toEqual(["Dashboard", "Appointments", "Explore", "Tiers", "Contact", "About"]);
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
