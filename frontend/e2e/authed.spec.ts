import { test, expect } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { VIEWPORTS } from "../playwright.config";

// Provide credentials via env to capture signed-in pages, e.g.:
//   E2E_CLIENT_EMAIL=... E2E_CLIENT_PASSWORD=... \
//   E2E_ARTIST_EMAIL=... E2E_ARTIST_PASSWORD=... \
//   CLERK_SECRET_KEY=sk_test_... npm run test:visual
// The backend (port 3001) + DB must also be running for dashboard data to load.
const ACCOUNTS = [
  {
    role: "client",
    email: process.env.E2E_CLIENT_EMAIL,
    password: process.env.E2E_CLIENT_PASSWORD,
    pages: [
      { name: "dashboard", path: "/artists" },
      { name: "explore", path: "/explore" },
      { name: "appointments", path: "/appointments" },
      { name: "profile", path: "/profile" },
    ],
  },
  {
    role: "artist",
    email: process.env.E2E_ARTIST_EMAIL,
    password: process.env.E2E_ARTIST_PASSWORD,
    pages: [
      { name: "dashboard", path: "/dashboard" },
      { name: "portfolio", path: "/portfolio" },
      { name: "appointments", path: "/appointments" },
      { name: "profile", path: "/profile" },
    ],
  },
] as const;

for (const acct of ACCOUNTS) {
  test.describe(`${acct.role} (authed)`, () => {
    test.skip(
      !acct.email || !acct.password,
      `Set E2E_${acct.role.toUpperCase()}_EMAIL and E2E_${acct.role.toUpperCase()}_PASSWORD to capture ${acct.role} pages`
    );

    test.beforeEach(async ({ page }) => {
      await setupClerkTestingToken({ page });
      await page.goto("/login");
      await clerk.signIn({
        page,
        signInParams: { strategy: "password", identifier: acct.email!, password: acct.password! },
      });
    });

    for (const vp of VIEWPORTS) {
      for (const p of acct.pages) {
        test(`${p.name} renders without horizontal overflow @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(p.path);
          await page.waitForLoadState("load");
          await page.waitForTimeout(1500);

          await page.screenshot({
            path: `e2e/screenshots/${acct.role}-${p.name}-${vp.name}.png`,
            fullPage: true,
          });

          const overflowBy = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth
          );
          expect
            .soft(overflowBy, `${acct.role} ${p.name} should not scroll horizontally at ${vp.width}px`)
            .toBeLessThanOrEqual(1);
        });
      }
    }
  });
}
