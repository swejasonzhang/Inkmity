# Inkmity

> A modern platform for discovering tattoo artists across the US — browse by style, message with full context, book with transparent pricing, and earn rewards as you go.

Inkmity connects tattoo clients, artists, and studios in one place: portfolio-driven discovery with tier-boosted ranking, real-time messaging, and an end-to-end on-platform booking flow. Payments run through the platform as merchant of record — deposit up front, balance captured only once both parties verify completion, payouts split between artist and studio (with chargeback clawback). It also includes signed legal documents (client waiver + artist/studio agreements), reward tiers with platform-funded credits (loyalty/birthday/consultation), verified badges and tier-based payout speed, an appointment waitlist, and in-app sketch approval. It is in active development; launch timing will be announced as the product matures.

---

## Repository structure

| Path | Description |
|------|-------------|
| [`MVP/`](MVP) | The main application — full React + Express stack (the active product). |
| [`MVP/frontend/`](MVP/frontend) | React 19 + Vite + TypeScript single-page app. |
| [`MVP/backend/`](MVP/backend) | Node.js + Express 5 API, MongoDB, Socket.io. |
| [`Waitlist/`](Waitlist) | The earlier standalone waitlist / landing site. |

The MVP is the project to run. See [`MVP/README.md`](MVP/README.md) for in-depth, app-specific documentation.

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
cd MVP/backend
npm install
# create .env.development (see "Environment variables" below)
npm run dev        # starts the API on http://localhost:3001
```

### 2. Frontend

```bash
cd MVP/frontend
npm install
# create .env.development (see "Environment variables" below)
npm run dev        # starts the app on http://localhost:5173
```

### Environment variables

These files are git-ignored and must be created locally. **Never commit real keys.**

**`MVP/backend/.env.development`**
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

**`MVP/frontend/.env.development`**
```
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
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

## License & usage

Private intellectual property. Not licensed for personal or commercial use, redistribution, or copying without explicit written permission from the author.

---

## Contact

**Jason Zhang**
- GitHub: https://github.com/swejasonzhang
- LinkedIn: https://www.linkedin.com/in/swejasonzhang/
- Email: swejasonzhang@gmail.com
