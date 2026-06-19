import { test, expect } from "@playwright/test";
import { VIEWPORTS } from "../playwright.config";

// Signed-in capture. Uses the app's dev quick-login (the "Login as Client/Artist"
// buttons on /login), which mints a Clerk ticket via the backend — the session
// the app actually recognizes. Requires the dev backend on :3001 with the test
// accounts seeded (backend/scripts/seedTestAuthUsers.js). Enable with:
//   E2E_AUTHED=1 npm run test:visual -- authed.spec.ts
const ENABLED = process.env.E2E_AUTHED === "1";

const ACCOUNTS = [
  {
    role: "client",
    button: "Login as Client",
    pages: [
      { name: "dashboard", path: "/artists" },
      { name: "explore", path: "/explore" },
      { name: "appointments", path: "/appointments" },
      { name: "profile", path: "/profile" },
    ],
  },
  {
    role: "artist",
    button: "Login as Artist",
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
    test.skip(!ENABLED, "Set E2E_AUTHED=1 with the dev backend running to capture signed-in pages");

    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
      await page.getByRole("button", { name: acct.button }).click();
      // Dev quick-login redirects away from /login once the session is active.
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
    });

    for (const vp of VIEWPORTS) {
      for (const p of acct.pages) {
        test(`${p.name} renders without horizontal overflow @ ${vp.name} (${vp.width}px)`, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(p.path);
          await page.waitForLoadState("load");

          // Hard guard: a real signed-in page, not a redirect back to auth/onboarding.
          await expect(page, `${acct.role} ${p.name} should stay on an authed route`).not.toHaveURL(
            /\/(login|onboarding)(\?|#|$)/
          );

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
