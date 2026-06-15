# Inkmity — Production Deployment & Go-Live Checklist

This covers taking the marketplace (auth + Connect payments + booking + rewards)
live: the **backend on Render** (long-running) and the **frontend on Vercel**
(static SPA). See §4 for why the split, and the env-var tables for each host.

## Architecture recap

- **Frontend**: Vite/React static site (Vercel).
- **Backend**: Express + Socket.io — must run on a **long-running** host (not
  serverless), because of WebSockets and the Stripe webhook raw-body handler.
- **Money flow**: Stripe Connect with the **platform as merchant of record**
  (separate charges + transfers). Clients pay the deposit + a **platform fee on
  top**; the deposit charge saves the card (`setup_future_usage`). On payment
  success the platform **transfers** each party's cut — artist only (solo) or
  artist + studio (per the studio commission split) — under a per-booking
  `transfer_group`, keeping its fee by not transferring it.
- **Balance on completion**: when both client and artist verify completion, the
  saved card is charged **off-session** for the remaining balance (artist sets
  the final price first), then the same split transfer runs.
- **Chargeback clawback**: `charge.dispute.created` reverses the artist/studio
  transfers so a dispute hits the payees, not the platform.

## 1. Stripe (live mode)

1. Toggle the dashboard to **live mode** and grab the live `sk_live_…` /
   `pk_live_…` keys.
2. **Enable Connect** → Settings → Connect. Use **Express** accounts. Fill in the
   platform branding/business profile Stripe requires before live onboarding.
3. Create a **webhook endpoint**: `https://<inkmity-api>/billing/webhook`
   (note: `/billing/webhook`, mounted with the raw body — not `/api/...`).
   Subscribe to **all** of these (the handler switches on each):
   - `payment_intent.succeeded`  ← confirms booking, runs split payouts
   - `payment_intent.payment_failed`
   - `checkout.session.completed`  ← deposit via Checkout, runs split payouts
   - `account.updated`  ← keeps artist **and studio** `chargesEnabled`/`payoutsEnabled` in sync
   - `charge.dispute.created`  ← clawback: reverses artist/studio transfers
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. **Connect capabilities**: connected accounts (artists *and* studios) need
   the `transfers` capability (to receive split payouts) and `card_payments`
   (so `charges_enabled` is true, which the readiness gates check).

## 2. Clerk (production instance)

1. Create/switch to the **production instance**; add the production frontend
   domain to the allowed origins.
2. Use the production `CLERK_SECRET_KEY` (backend) and publishable key
   (`VITE_CLERK_PUBLISHABLE_KEY` frontend, `CLERK_PUBLISHABLE_KEY` backend).

## 3. Database

- MongoDB Atlas cluster; put the SRV string in `MONGO_URI`. Allow Render egress
  IPs (or `0.0.0.0/0` for a first pass) in Atlas network access.

## 4. Deploy

The backend and frontend deploy to **different hosts** — this is deliberate:

- **Backend → Render.** Express + Socket.io needs a long-running process, and the
  Stripe webhook relies on a raw-body handler. Serverless platforms break both,
  so the backend must run on an always-on host (Render `starter` plan or above;
  the `free` plan sleeps after ~15m idle and drops WebSockets / delays webhooks).
  `render.yaml` ships `plan: starter` (always-on) for production.
- **Frontend → Vercel.** The Vite/React app is a static SPA — Vercel's CDN,
  preview deploys, and zero-config builds fit it well.

### Backend (Render)

`render.yaml` is a blueprint for the **backend only** (`inkmity-api`). After
connecting the repo in Render:

1. Render creates `inkmity-api` from `render.yaml` (`rootDir: backend`).
2. Set every `sync:false` env var in the service's **Environment** tab — see the
   list below. Secrets are never committed.
3. Set `APP_URL` and `FRONTEND_URL` to the deployed **Vercel** frontend origin.

### Frontend (Vercel)

1. Import the repo in Vercel and set the project **Root Directory** to `frontend`
   (it auto-detects Vite; `frontend/vercel.json` adds the SPA fallback rewrite).
2. Set the `VITE_*` env vars below; point `VITE_API_URL` / `VITE_SOCKET_URL` at
   the deployed `inkmity-api` URL.
3. Add the production domain in Clerk's allowed origins and Stripe's redirect
   allowlist.

### Required env vars

**Backend (`inkmity-api`)**
| Var | Notes |
|---|---|
| `NODE_ENV` | `production` (boots fail-fast if secrets missing) |
| `MONGO_URI` | Atlas connection string |
| `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` | Clerk production |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | Stripe live |
| `STRIPE_WEBHOOK_SECRET` | from the `/billing/webhook` endpoint |
| `APP_URL`, `FRONTEND_URL` | deployed frontend origin (Connect return + Stripe redirects + CORS) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | uploads |
| `RESEND_API_KEY`, `FROM_EMAIL` | email |
| `PLATFORM_FEE_BASE_CENTS` | optional, default `1000` ($10 base) |
| `PLATFORM_FEE_PCT` | optional, default `0.05` (5%) |
| `PLATFORM_FEE_CAP_CENTS` | optional, default `5000` ($50 cap) |
| `STUDIO_DEFAULT_COMMISSION_PCT` | optional, default `0.30` (studio's cut; overridable per artist) |
| `ADMIN_CLERK_IDS` | comma-separated Clerk IDs allowed to verify studios |
| `SENTRY_DSN` | optional — error tracking off until set (free Sentry tier) |
| `ANTHROPIC_API_KEY` | optional — AI assistant; route returns 503 and stays $0 until set (assistant is locked in the UI) |
| `RATE_LIMIT_MAX` | optional, default `1000` req/15min/IP — raise if real users behind shared NAT hit 429s |

**Frontend (Vercel)**
| Var | Notes |
|---|---|
| `VITE_API_URL` | backend URL |
| `VITE_SOCKET_URL` | backend URL (Socket.io) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk production |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe live publishable |
| `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | uploads |

## 5. Observability (Sentry + logs)

Wiring is already in the backend; it stays dormant (and free) until you opt in.

1. **Errors** — create a Sentry project (sentry.io → Node, free Developer tier)
   and set `SENTRY_DSN` in Render. `instrument.js` loads via `--import` before app
   code; with no DSN it no-ops. Performance tracing defaults to off
   (`SENTRY_TRACES_SAMPLE_RATE=0`) to stay inside the free quota — raise later if
   you want transaction traces.
2. **Logs** — `pino-http` emits structured JSON request logs (status-aware levels,
   auth/cookie/stripe-signature redacted, `/health` skipped) to Render's log
   stream. No setup required; view them in the Render dashboard.

## 6. Post-deploy smoke test

1. `GET https://<inkmity-api>/health` → `{ status: "healthy", database: "connected" }`.
2. Sign up as an **artist** → dashboard shows the "Finish payment setup" banner →
   complete Stripe Express onboarding → banner flips to "Payouts active"
   (driven by the `account.updated` webhook).
3. Sign up as a **client**, get the artist to enable bookings, book a tattoo
   session, pay the deposit. Confirm in Stripe: the PaymentIntent has a
   `transfer_group` and saved the card; on success a **Transfer** to the
   artist's connected account appears (and a second transfer to the studio if
   the artist is a studio member).
4. **Completion**: artist sets the final price, both parties verify completion,
   and confirm the saved card is charged off-session for the balance with a
   matching transfer.
5. **Dispute (optional)**: open a test dispute on a charge and confirm the
   artist/studio transfers are reversed (`charge.dispute.created`).
6. Confirm the rewards panel shows the client's tier/fee and updates after
   completed bookings.
7. If `SENTRY_DSN` is set, trigger a test error and confirm it lands in Sentry;
   confirm request logs appear in the Render log stream.

> **Studio bookings** require the studio to be **verified** (admin sets
> `verificationStatus: verified`) and payout-ready, or the booking is blocked.

## Scaling & concurrency

The API is built to handle concurrent load on a single always-on instance:

- **Stateless requests** + **Mongo connection pooling** (`maxPoolSize`, tunable via
  `MONGO_MAX_POOL`/`MONGO_MIN_POOL`) so many requests share a bounded pool.
- **Indexed hot paths**: compound indexes on bookings (artist/client/status/date),
  messages, and billing; list/read queries use `.lean()` for low overhead.
- **gzip compression** + **Helmet** + a global **rate limiter** (`trust proxy` is
  set so per-IP limits work behind Render's proxy).
- Load test (`npm run test:load`) exercises 100 concurrent requests and 200
  rapid sequential requests against the in-memory DB.

**Vertical scaling** (a bigger Render plan) is the simplest next step. Before
running **multiple backend instances** (horizontal), move three pieces of
in-process state to a shared store, or requests will see inconsistent state:

1. **Socket.io** → add the Redis adapter (`@socket.io/redis-adapter`) so realtime
   events fan out across instances.
2. **Rate limiter** → back `express-rate-limit` with a Redis store (per-instance
   counters otherwise let limits be exceeded N×).
3. **Cache** (`utils/cache.js`) → move to Redis so all instances share it.

MongoDB Atlas scales independently; raise its tier and the pool size together.

## Tuning knobs

- **Platform fee**: `PLATFORM_FEE_BASE_CENTS` / `PLATFORM_FEE_PCT` / `PLATFORM_FEE_CAP_CENTS` (fee = base + pct of price, capped).
- **Reward tiers**: `backend/config/index.js` → `rewards.tiers` (thresholds + rates).
- **DB pool**: `MONGO_MAX_POOL` (default 20) / `MONGO_MIN_POOL` (default 2).
- **Rate limits**: `RATE_LIMIT_MAX` (default 1000/15min/IP), `AUTH_RATE_LIMIT_MAX`
  (default 5), `ASSISTANT_RATE_LIMIT_MAX` (default 30), `RATE_LIMIT_WINDOW_MS`.
