import { jest, describe, test, expect } from "@jest/globals";

const { buildNavItems } = await import("@/components/header/buildNavItems");

describe("buildNavItems", () => {
  test("should return all enabled nav items when signed in", () => {
    const items = buildNavItems(true, jest.fn());
    expect(items).toHaveLength(6);
    expect(items.every((i) => !i.disabled)).toBe(true);
  });

  test("should include core destinations in order", () => {
    const items = buildNavItems(true, jest.fn());
    const labels = items.map((i) => i.label);
    expect(labels).toEqual(["Dashboard", "Artists", "Appointments", "Gallery", "Contact", "About"]);
  });

  test("should lock auth links (with gate handler) when signed out, leaving Contact/About open", () => {
    const onGate = jest.fn();
    const items = buildNavItems(false, onGate);
    const byLabel = (label: string) => items.find((i) => i.label === label)!;

    for (const label of ["Dashboard", "Artists", "Appointments", "Gallery"]) {
      expect(byLabel(label).disabled).toBe(true);
      expect(byLabel(label).onClick).toBe(onGate);
    }
    for (const label of ["Contact", "About"]) {
      expect(byLabel(label).disabled).toBeUndefined();
      expect(byLabel(label).onClick).toBeUndefined();
    }
  });

  test("should show Artists directory for clients", () => {
    const items = buildNavItems(true, jest.fn(), "client");
    const discover = items[1];
    expect(discover.label).toBe("Artists");
    expect(discover.to).toBe("/artists");
  });

  test("should replace Artists with Portfolio for artists", () => {
    const items = buildNavItems(true, jest.fn(), "artist");
    const labels = items.map((i) => i.label);
    expect(labels).not.toContain("Artists");
    const discover = items[1];
    expect(discover.label).toBe("Portfolio");
    expect(discover.to).toBe("/portfolio");
  });
});
