import { test, expect } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";

const PUBLIC_PAGES = [
  { name: "landing", path: "/landing" },
  { name: "login", path: "/login" },
  { name: "signup", path: "/signup" },
];

async function settle(page: import("@playwright/test").Page) {
  await page.waitForLoadState("load");
  // Let fonts, the hero video poster, and entrance animations settle.
  await page.waitForTimeout(1200);
}

for (const vp of VIEWPORTS) {
  for (const p of PUBLIC_PAGES) {
    test(`${p.name} renders without horizontal overflow @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(p.path);
      await settle(page);

      // Always capture the screenshot first so we have it even if an assertion fails.
      await page.screenshot({ path: `e2e/screenshots/${p.name}-${vp.name}.png`, fullPage: true });

      const overflowBy = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect.soft(overflowBy, `${p.name} should not scroll horizontally at ${vp.width}px`).toBeLessThanOrEqual(1);
    });
  }
}
