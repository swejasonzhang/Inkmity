import { jest, describe, test, expect } from "@jest/globals";

const { buildNavItems } = await import("@/components/header/buildNavItems");

describe("buildNavItems", () => {
  test("should return nav items when dashboard is enabled", () => {
    const items = buildNavItems(false, jest.fn());
    expect(items).toHaveLength(6);
    expect(items[0].label).toBe("Landing");
    expect(items[1].label).toBe("Dashboard");
    expect(items[1].disabled).toBeUndefined();
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

  test("should include gallery badge", () => {
    const items = buildNavItems(false, jest.fn());
    const galleryItem = items.find(item => item.label === "Gallery");
    expect(galleryItem?.badge).toBeDefined();
    expect(galleryItem?.disabled).toBe(true);
  });
});
