# IRPC Digital Platform (buyer portal and staff console)

Next.js 15.5 (App Router), TypeScript, Tailwind CSS 4. Sample data only, kept in memory.

## Run

From the repository root (one workspace install and one root lockfile):

    npm install
    npm run build:types
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
- src/lib/data.ts exports `OrderDto[]`, `CurrentPrice[]`, and `RiceTypeDto[]` fixtures from `@irpc/types`. Orders cover all three types and multiple statuses, with decimal strings and ISO dates.
- src/lib/orders.ts supplies display labels and service-specific progress paths from shared `ORDER_FLOW`; src/lib/mock-orders.ts constructs API-shaped requests/results and keeps demo transitions consistent with the contract.
- Customer ownership and batch links are demo metadata stored separately from `OrderDto`. See `docs/FRONTEND-INTEGRATION-NOTES.md` at the repository root for questions to share with RR before API integration.
- No sign-in yet. Add authentication and role checks before real use.
- Design tokens are in src/app/globals.css (@theme).
