# Inkmity — Production Deployment & Go-Live Checklist

This covers taking the marketplace (auth + Connect payments + booking + rewards)
live on **Render** (or Railway — same env vars, different dashboard).

## Architecture recap

- **Frontend**: Vite/React static site.
- **Backend**: Express + Socket.io — must run on a **long-running** host (not
  serverless), because of WebSockets and the Stripe webhook raw-body handler.
- **Money flow**: Stripe Connect (Express accounts). Clients pay deposit + a
  **platform fee on top**; the deposit transfers to the artist's connected
  account, the platform keeps the fee as the Connect application fee. The final
  payment transfers 100% to the artist.

## 1. Stripe (live mode)

1. Toggle the dashboard to **live mode** and grab the live `sk_live_…` /
   `pk_live_…` keys.
2. **Enable Connect** → Settings → Connect. Use **Express** accounts. Fill in the
   platform branding/business profile Stripe requires before live onboarding.
3. Create a **webhook endpoint**: `https://<inkmity-api>/billing/webhook`
   (note: `/billing/webhook`, mounted with the raw body — not `/api/...`).
   Subscribe to at least:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.completed`
   - `account.updated`  ← keeps artist `chargesEnabled`/`payoutsEnabled` in sync
   Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## 2. Clerk (production instance)

1. Create/switch to the **production instance**; add the production frontend
   domain to the allowed origins.
2. Use the production `CLERK_SECRET_KEY` (backend) and publishable key
   (`VITE_CLERK_PUBLISHABLE_KEY` frontend, `CLERK_PUBLISHABLE_KEY` backend).

## 3. Database

- MongoDB Atlas cluster; put the SRV string in `MONGO_URI`. Allow Render egress
  IPs (or `0.0.0.0/0` for a first pass) in Atlas network access.

## 4. Deploy (Render blueprint)

`render.yaml` defines both services. After connecting the repo:

1. Render creates `inkmity-api` (backend) and `inkmity-web` (frontend).
2. Set every `sync:false` env var in each service's **Environment** tab — see
   the list below. Secrets are never committed.
3. Set `APP_URL` and `FRONTEND_URL` to the deployed `inkmity-web` URL, and
   `VITE_API_URL` / `VITE_SOCKET_URL` to the deployed `inkmity-api` URL.

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
| `PLATFORM_FEE_PCT` | optional, default `0.10` |
| `PLATFORM_FEE_MIN_CENTS` | optional, default `500` |

**Frontend (`inkmity-web`)**
| Var | Notes |
|---|---|
| `VITE_API_URL` | backend URL |
| `VITE_SOCKET_URL` | backend URL (Socket.io) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk production |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe live publishable |
| `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET` | uploads |

## 5. Post-deploy smoke test

1. `GET https://<inkmity-api>/health` → `{ status: "healthy", database: "connected" }`.
2. Sign up as an **artist** → dashboard shows the "Finish payment setup" banner →
   complete Stripe Express onboarding → banner flips to "Payouts active"
   (driven by the `account.updated` webhook).
3. Sign up as a **client**, get the artist to enable bookings, book a tattoo
   session, pay the deposit. Confirm in Stripe: the PaymentIntent shows the
   `application_fee_amount` and a transfer to the artist's connected account.
4. Confirm the rewards panel shows the client's tier/fee and updates after
   completed bookings.

## Tuning knobs

- **Platform fee**: `PLATFORM_FEE_PCT` / `PLATFORM_FEE_MIN_CENTS`.
- **Reward tiers**: `backend/config/index.js` → `rewards.tiers` (thresholds + rates).
