# Inkmity

> A modern platform for discovering tattoo artists across the US — browse by style, message with full context, book with transparent pricing, and earn rewards as you go.

Inkmity connects tattoo clients, artists, and studios in one place: portfolio-driven discovery with tier-boosted ranking, real-time messaging, and an end-to-end on-platform booking flow. Payments run through the platform as merchant of record — deposit up front, balance captured only once both parties verify completion, payouts split between artist and studio (with chargeback clawback). It also includes signed legal documents (client waiver + artist/studio agreements), reward tiers with platform-funded credits (loyalty/birthday/consultation), an appointment waitlist, and in-app sketch approval. It is in active development — see the [Roadmap](#roadmap) for what's coming next.

---

## Repository structure

| Path | Description |
|------|-------------|
| [`frontend/`](frontend) | React 19 + Vite + TypeScript single-page app (deploys to Vercel). |
| [`backend/`](backend) | Node.js + Express 5 API, MongoDB, Socket.io (deploys to Render). |

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the full production deployment guide.

---

## Features

**For clients**
- Discover artists by technique, healed results, budget, location, and travel radius
- Real-time messaging with shared references and sketch approval
- End-to-end booking: time selection, intake form, deposit, confirmation
- Transparent up-front pricing and verified reviews
- Rewards that accrue as you book

**For artists**
- One inbox for every client conversation
- Automated deposits collected at booking
- Client intake forms (health info, references, placement) delivered ahead of the session
- A fast portfolio that helps clients find you

**Platform**
- Clerk authentication with role-based access (client / artist)
- Stripe payments (deposits, final payments, webhooks)
- Cloudinary image uploads
- Light/dark theming, fully responsive, accessible
- Jest test suites on both frontend and backend

---

## What makes Inkmity different

Most tattoo apps stop at discovery — they hand off a lead and disappear. Inkmity carries the
relationship from the first reference to the healed result, with money and trust handled in one place.

- **Booking, not just leads.** The entire transaction runs on-platform — deposit through final balance — instead of dumping you into someone's DMs.
- **Paid only when it's done right.** The balance is captured after *both* client and artist confirm the session is complete, with payouts split between artist and studio (and chargeback clawback).
- **Built for skin, not just bookings.** Signed waivers, health intake, and clear consent are part of the flow — protecting clients, artists, and studios from the first message.
- **One thread, full context.** References, sketch approvals, and every message live in a single conversation. No lost DMs, no screenshots.
- **Discovery by real style.** Search by technique, healed results, budget, and travel radius — not a feed of pretty pictures.
- **Transparent by default.** Up-front quotes, verified reviews, and clear cancellation terms shown before you pay.

---

## How Inkmity makes money

One way, in the open — **a single transparent platform fee on completed bookings**, shown before you pay. No lead fees, no per-listing charges, no surprise costs.

- **The essentials are always free.** Discovery, booking, messaging, sketch approval, intake, and reviews cost nothing — and the free tier deliberately includes tools other platforms lock behind a paid plan.
- **We only earn when you book.** The fee applies to completed bookings and drops as low as 5% as a client books more (see [Tiers](frontend/src/pages/Tiers.tsx)). Our incentive is aligned with keeping artists' books full.
- **We bring the clients.** Artists focus on tattooing, not chasing leads — Inkmity owns discovery and client acquisition.
- **We carry the risk.** Inkmity acts as merchant of record and mediator, so payments, paperwork, and protections sit with the platform rather than individual clients or artists.
- **Premium is optional, never essential.** Future monthly subscriptions are planned only as power-user extras (non-essential conveniences) — they will never gate the core experience or hide a must-have behind a plan.

---

## Roadmap

> **In progress — not live yet.** These are the bets that make Inkmity more than a booking tool. They're
> being built; this section is a statement of direction, not a list of shipped features.

- **AI booking assistant** — turn saved references into a ready-to-send brief and get matched to the right artist instantly.
- **In-app automatic translation** — clients and artists who don't share a language can still message, brief, and book without friction.
- **Going global** — worldwide artists, local currencies, and timezone-aware scheduling, built to work in every city rather than one country.
- **The collection journey** — every healed piece becomes a personal, lasting record of your work, your artists, and your story.
- **Aftercare that checks in** — guided, artist-backed healing reminders timed to each piece.
- **Follow your artists** — see when the artists you love open books or drop flash, and get first dibs on slots.
- **Studios, fully wired** — deeper commission splits, multi-chair scheduling, and studio payouts in one place.
- **Earned status & insight** — loyalty tiers, verified badges, faster payouts, and real analytics that reward the people who show up.

…and more on the way — we ship, listen, and build in the direction artists and clients pull us.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, Radix UI / shadcn, Framer Motion |
| Backend | Node.js, Express 5, Socket.io |
| Database | MongoDB (Mongoose) |
| Auth | Clerk |
| Payments | Stripe |
| Media | Cloudinary |
| Email | Nodemailer |
| Tooling | ESLint, Jest, nodemon |

---

## Getting started

### Prerequisites
- Node.js v18+
- npm
- A MongoDB connection string, plus Clerk, Stripe, and Cloudinary accounts

### 1. Backend

```bash
cd backend
npm install
# create .env.development (see "Environment variables" below)
npm run dev        # starts the API on http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
# create .env.development (see "Environment variables" below)
npm run dev        # starts the app on http://localhost:5173
```

### Environment variables

These files are git-ignored and must be created locally. **Never commit real keys.**

**`backend/.env.development`**
```
APP_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
MONGO_URI=your-mongodb-connection-string
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CURRENCY=usd
```

**`frontend/.env.development`**
```
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
VITE_GOOGLE_MAPS_API_KEY=...   # Maps JavaScript API + Places API enabled
```

---

## Scripts

| Command | Location | What it does |
|---------|----------|--------------|
| `npm run dev` | frontend / backend | Start dev server (Vite / nodemon) |
| `npm run build` | frontend | Type-check and produce a production build |
| `npm test` | frontend / backend | Run the Jest test suites |
| `npm start` | backend | Run the API in production mode |

---

## Deployment

The two halves deploy to different hosts, by design:

| Part | Host | Why |
|------|------|-----|
| `backend/` | **Render** | Express + Socket.io needs a long-running process, and the Stripe webhook needs a raw-body handler — both break on serverless. |
| `frontend/` | **Vercel** | The Vite/React app is a static SPA; Vercel handles the CDN, preview deploys, and zero-config builds. |

`render.yaml` is the backend blueprint (`rootDir: backend`); `frontend/vercel.json`
adds the SPA fallback (set the Vercel project root directory to `frontend`). The
full checklist — Stripe Connect, Clerk production instance, env vars, and a
post-deploy smoke test — is in [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## License & usage

Private intellectual property. Not licensed for personal or commercial use, redistribution, or copying without explicit written permission from the author.

---

## Contact

**Jason Zhang**
- GitHub: https://github.com/swejasonzhang
- LinkedIn: https://www.linkedin.com/in/swejasonzhang/
- Email: swejasonzhang@gmail.com
