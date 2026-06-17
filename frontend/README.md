# Inkmity — Frontend

React 19 + Vite + TypeScript single-page app for [Inkmity](../README.md): Tailwind CSS, Radix UI / shadcn, Framer Motion, Clerk auth, Stripe, Socket.io client. Deploys to Vercel (`vercel.json`).

## Quick start

```bash
npm install
# create .env.development (see the root README "Environment variables")
npm run dev        # app on http://localhost:5173 (Vite)
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and produce a production build |
| `npm run lint` | ESLint |
| `npm test` | Jest + Testing Library suites |
| `npm run preview` | Preview the production build |

> Verify builds with `tsc -b` (not `tsc --noEmit`) — project references make `--noEmit` a false green.

## Layout

| Path | Contents |
|------|----------|
| `src/pages/` | Route-level pages (Dashboard, Gallery/Explore, Appointments, Portfolio, …) |
| `src/components/` | UI by area — `dashboard/` (client/artist/shared), `calendar/`, `header/`, `ui/` (shadcn), `access/`, `landing/`, `legal/` |
| `src/hooks/` | React hooks (role, theme, realtime, scroll-lock, …) |
| `src/api/` | Typed API client (`index.ts`) |
| `src/lib/` | Browser utilities (socket, cloudinary, launch) |
| `src/tests/` | Jest + Testing Library tests mirroring `src/` |

## Routing

- Clients land on `/artists`, providers on `/dashboard` (both render the Dashboard); `/` redirects by role.
- `/explore` is the Explore feed (trending ideas + most-loved work).
