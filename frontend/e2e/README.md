# Visual / responsive snapshots (Playwright)

Captures full-page screenshots and asserts no horizontal overflow across
**mobile (375px)**, **tablet (768px)**, and **desktop (1440px)** viewports.

Playwright auto-starts the Vite dev server (`npm run dev`, port 5173), which
reads your local `.env.development`. Screenshots land in `e2e/screenshots/`
(git-ignored).

## Public pages — no setup needed

```bash
npm run test:visual -- responsive.spec.ts
```

Covers `/landing`, `/login`, `/signup`.

## Signed-in pages — needs the dev backend

`authed.spec.ts` skips unless `E2E_AUTHED=1`. It signs in through the app's own
**dev quick-login** (the "Login as Client/Artist" buttons on `/login`), which
mints a Clerk ticket via the backend — the session the app actually recognizes.
No passwords or secret keys are passed in.

Requirements:
- The dev **backend** running on port 3001 (`cd backend && npm run dev`), with a
  `sk_test` Clerk key — the dev-login endpoint is gated to the test instance.
- The test accounts seeded once: `cd backend && node --env-file-if-exists=.env.development scripts/seedTestAuthUsers.js`.

```bash
E2E_AUTHED=1 npm run test:visual -- authed.spec.ts --workers=2
```

Covers client (`/artists`, `/explore`, `/appointments`, `/profile`) and artist
(`/dashboard`, `/portfolio`, `/appointments`, `/profile`) pages. Each test hard-
asserts it stayed on an authed route (not bounced to `/login` or `/onboarding`),
so a pass means a real signed-in capture. Use `--workers=2` to avoid memory
pressure from parallel full-page screenshots.
