# IRPC Digital Platform (buyer portal and staff console)

Next.js 15.5 (App Router), TypeScript, Tailwind CSS 4. Switch between sample data and the NestJS API using the frontend environment file.

## Run

From the repository root (one workspace install and one root lockfile):

    npm install
    npm run build:types
    cp apps/web/.env.example apps/web/.env.local
    npm run dev:web       # http://localhost:3000
    npm run lint -w web
    npm test -w web        # sample order contract and transition checks
    npm run build -w web  # production build

## Routes
Buyer: /buyer, /buyer/offers, /buyer/offers/[id], /buyer/orders, /buyer/orders/[id], /buyer/orders/[id]/receipt,
/buyer/trace, /buyer/trace/[batchId], /buyer/prices, /buyer/me, /buyer/service

Staff: /staff, /staff/queue, /staff/intake, /staff/processing, /staff/costing, /staff/financials, /staff/sales,
/staff/sales/[id], /staff/forecast, /staff/pricing, /staff/traceability, /staff/traceability/[batchId],
/staff/users, /staff/audit

## Notes
- src/lib/store.tsx holds shared state, so actions cross portals (a buyer reservation shows up in staff sales, a price
  published by staff shows on the buyer price page). State resets on a full page reload.
- src/lib/api.ts is the data boundary. Pages use the store, which loads records and sends mutations through this client. Only the mock provider imports the fixtures in src/lib/data.ts.
- src/lib/orders.ts supplies display labels and service-specific progress paths from shared `ORDER_FLOW`; src/lib/mock-orders.ts constructs API-shaped requests/results and keeps demo transitions consistent with the contract.
- Customer lists and details use `/orders/mine` and `/orders/:id`; the frontend does not require an owner field on API orders. Batch links are shown only when data is available. See `docs/FRONTEND-INTEGRATION-NOTES.md` for contract questions to share with RR.
- No sign-in yet. Add authentication and role checks before real use.
- Design tokens are in src/app/globals.css (@theme).

## Mock or real API

Edit `apps/web/.env.local` (ignored by Git):

```dotenv
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_API_URL=http://localhost:4000
```

- `true`: a stateful in-memory mock. Creating, accepting, rejecting, cancelling, and confirming order weights changes subsequent reads. Navigation preserves changes; a full reload resets them.
- `false`: requests go to `NEXT_PUBLIC_API_URL`. Failed HTTP requests never fall back to fixtures. Restart `npm run dev:web` after changing this setting; rebuild production bundles because Next.js embeds public environment variables.

The client exports the order, price, rice type, auth, and admin functions corresponding to `docs/API.md`. `/sms/inbound` is a server-to-server webhook and is not called by the browser. Underspecified responses use local record types until RR supplies shared types. The mock financial summary is intentionally unavailable pending agreed calculation rules.

Protected calls send `Authorization: Bearer <jwt>`. `api.login` / `api.register` save the returned token in session storage; `setAuthToken(null)` clears it. Login UI is still a later task. For manual integration testing with a valid token supplied by the backend, set it in the browser console, then reload:

```js
sessionStorage.setItem("irpc.auth.token", "YOUR_TEST_JWT");
location.reload();
```

Never put tokens in `NEXT_PUBLIC_*` variables. The mock login uses the current demo profile phone and PIN `1234`; it does not enforce production authentication or staff roles.

## Check the API connection

In one terminal, from the repository root:

```sh
npm run dev:api
```

In another:

```sh
npm run check:api -w web
```

This checks the **real** `/health` endpoint even when `NEXT_PUBLIC_USE_MOCK=true`. The current API scaffold exposes health only. Prices, auth, and orders must be supplied by the backend team before an end-to-end real order flow can pass.

Real mode leaves legacy batch, forecasting, energy, user-management, and audit screens unavailable because their data endpoints are not in the agreed contract. The service queue and rice sales views use real order endpoints; demo-only booking/offer creation controls are hidden. Profile editing and public price history also await backend support.
