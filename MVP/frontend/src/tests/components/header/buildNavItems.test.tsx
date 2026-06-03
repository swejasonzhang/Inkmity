import { jest, describe, test, expect } from "@jest/globals";

const { buildNavItems } = await import("@/components/header/buildNavItems");

describe("buildNavItems", () => {
  test("should return nav items when dashboard is enabled", () => {
    const items = buildNavItems(false, jest.fn());
    expect(items).toHaveLength(6);
    expect(items[0].label).toBe("Dashboard");
    expect(items[0].disabled).toBeUndefined();
  });

  test("should disable dashboard when dashboardDisabled is true", () => {
    const items = buildNavItems(true, jest.fn());
    const dashboardItem = items.find(item => item.label === "Dashboard");
    expect(dashboardItem?.disabled).toBe(true);
  });

  test("should include onClick handler for dashboard", () => {
    const onDashboardGate = jest.fn();
    const items = buildNavItems(false, onDashboardGate);
    const dashboardItem = items.find(item => item.label === "Dashboard");
    expect(dashboardItem?.onClick).toBeDefined();
  });

  test("should include core public destinations", () => {
    const items = buildNavItems(false, jest.fn());
    const labels = items.map(i => i.label);
    expect(labels).toEqual(["Dashboard", "Artists", "Gallery", "Appointments", "Contact", "About"]);
  });

  test("should show Artists directory for clients", () => {
    const items = buildNavItems(false, jest.fn(), "client");
    const discover = items[1];
    expect(discover.label).toBe("Artists");
    expect(discover.to).toBe("/artists");
  });

  test("should replace Artists with Portfolio for artists", () => {
    const items = buildNavItems(false, jest.fn(), "artist");
    const labels = items.map(i => i.label);
    expect(labels).not.toContain("Artists");
    const discover = items[1];
    expect(discover.label).toBe("Portfolio");
    expect(discover.to).toBe("/profile");
  });
});
