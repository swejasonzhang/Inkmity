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

## Signed-in pages — needs test accounts

`authed.spec.ts` skips unless credentials are provided. It signs in with
Clerk's official Playwright helper (`@clerk/testing`), so you need a Clerk
**secret key** plus a test client and artist account. The **backend** (port
3001) and its database must also be running so dashboard data loads.

```bash
CLERK_SECRET_KEY=sk_test_... \
E2E_CLIENT_EMAIL=...  E2E_CLIENT_PASSWORD=... \
E2E_ARTIST_EMAIL=...  E2E_ARTIST_PASSWORD=... \
npm run test:visual
```

Covers client (`/artists`, `/explore`, `/appointments`, `/profile`) and artist
(`/dashboard`, `/portfolio`, `/appointments`, `/profile`) pages.
