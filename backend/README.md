# Inkmity — Backend

Node.js + Express 5 API for [Inkmity](../README.md): MongoDB (Mongoose), Socket.io realtime, Clerk auth, Stripe Connect payments, Cloudinary uploads. Deploys to Render (`../render.yaml`).

## Quick start

```bash
npm install
# create .env.development (see the root README "Environment variables")
npm run dev        # API on http://localhost:3001 (nodemon)
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the API with nodemon + `.env.development` |
| `npm start` | Run the API in production mode (`.env.production`) |
| `npm test` | Jest suites (DB integration tests run when `DATABASE_AVAILABLE=true`) |
| `npm run test:coverage` | Tests with coverage |

## Layout

| Path | Contents |
|------|----------|
| `routes/` | Express route definitions, one file per resource |
| `controllers/` | Request handlers (booking, billing, user, artwork, studio, documents, …) |
| `services/` | Business logic (payouts, balance capture, documents, socket, studio, …) |
| `models/` | Mongoose schemas (Artist, Booking, Billing, IntakeForm, SignedDocument, …) |
| `middleware/` | Auth, rate limiting |
| `lib/` | Third-party clients (Stripe) |
| `config/` | Central config (`config/index.js`) reading env vars |
| `tests/` | Jest controller/service/integration tests |

## Notes

- Stripe webhooks need the raw body — handled in `server.js`; this is why the backend runs as a long-lived process on Render, not serverless.
- Payments: clients are charged via Checkout/PaymentIntents with a `transfer_group`; balance is captured at completion; tips are destination charges routed 100% to the artist.
- Legal document templates live in `services/documentsService.js` (versioned + content-hashed). They are **not** attorney-reviewed.
