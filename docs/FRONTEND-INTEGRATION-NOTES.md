# Frontend integration notes for RR

Steps 2–3 keep `apps/api`, `packages/types`, and `docs/API.md` unchanged. These notes are a handoff draft to share in the group chat.

## Contract questions

- Resolved: contact fields, `UserDto`, and `AdminOrderDto` are now shared and consumed by the web client.
- `OrderDto` has no batch/offer association, and the contract has no batch/offer endpoints. Existing traceability links use a separate demo lookup; the API integration must hide unavailable links or use a separately agreed response.
- Resolved: auth, admin summary, money and SMS log responses use shared types.
- Resolved: checkout uses shared `estimateOrderAmount()` and `PublicSettingsDto`. Demo recovery ratios live only in the sample `/settings` response. Real checkout requires `/settings`; please register that endpoint alongside prices and rice types.
- `SERVICE` accepts drying, milling, or both. There is no Storage service or request `notes` field, so those unsupported inputs were removed from the existing demo form.

## Frontend behavior

- Prices, rice types, and orders use the shared DTOs directly. `OrderDto` records are not extended with UI fields.
- Numeric IDs go in URLs; `orderRef(id)` supplies the displayed `IRPC-…` reference. Quantities and amounts stay decimal strings in records; formatting converts them only for display or mock calculations.
- All service requests now belong to the same order collection as rice purchases and palay sales. The legacy queue and batch fixtures remain independent demo data for screens outside the order contract.
- The current demo account is `B-07`. The mock provider uses a separate `DemoOrderDetails` lookup to scope sample orders and supply customer/batch details. The real client uses `/orders/mine` and `/orders/:id`; pages no longer filter API orders using demo ownership metadata.
- New orders are pending with unlocked prices. Mock acceptance reserves rice stock and locks prices; service acceptance requires a date and moves to scheduled. Every transition appends an event. Rejection requires a reason; customer cancellation is limited to pending orders.
- Existing order screens retain Moser's merged design. This follow-up focuses on auth, shared types and checkout estimates.

## Step 3 API switch

- `NEXT_PUBLIC_USE_MOCK=true` selects the stateful mock provider; `false` selects HTTP at `NEXT_PUBLIC_API_URL`. Restart the frontend after changes. There is no automatic fallback to sample data on HTTP errors.
- All page data passes through `api.ts` (via the store). The existing demo types and stage vocabulary live in `demo-types.ts`; pages no longer import fixtures.
- The client supports JSON request bodies, JWT headers for protected routes, a 15-second timeout, plain-language errors, and refreshing reads after mutations. Mutations disable buttons until they finish. A successful write followed by a failed refresh is reported as saved, avoiding an accidental duplicate submission.
- Real mode supports the agreed price/rice/order routes. Screens for records without agreed endpoints are unavailable, rather than displaying samples as real data. Missing public price history and profile-update routes remain open questions.
- Current main registers health and auth, but not prices, rice types, settings or orders. `check:auth` exercises actual HTTP registration/login/me and reports unavailable endpoints explicitly. Account and auth pages work without price/order endpoints.
- Admin summary and money types are shared. Mock summary uses the agreed `dryingKgBookedToday` and `dryingCapacityKg` decimal-string fields. Mock money remains unsupported.
- Hiligaynon/English switching is wired for auth, Account, buyer navigation and Home action labels. Moser's approved wording was unavailable; provisional copy in `AuthForm.tsx`, `language.tsx`, Account, BuyerShell and Home needs her review. Remaining page translations are a follow-up with Moser. No messages have been posted to the team.

## Verification

2026-10-15 follow-up: 20 web tests passed; web lint and production build passed (existing font warning only). Against the actual local API from main, HTTP sign-up → login → `/auth/me` passed with mock SMS and a temporary JWT secret. `/prices`, `/rice-types`, and `/settings` returned 404, so the live check correctly exits nonzero. No backend source or credentials were changed. Browser interaction and Moser's wording review remain manual checks.

Auth browser checks: at 360 px, create an account with consent and Hiligaynon selected; verify Account shows the saved user; log out and log in with a spaced `09…` number; reject invalid PIN lengths and missing consent; verify the API's wrong-PIN/lockout message is unchanged; toggle languages and reload; open prices and verify an unavailable backend is never replaced with samples.

Run from the repository root:

```sh
npm run build:types
npm test -w web
npm run typecheck -w web
npm run lint -w web
npm run build -w web
```

Sample routes: `/buyer/orders/1001` (pending rice), `/buyer/orders/1003/receipt` (completed rice), `/buyer/orders/1004` (weighed palay), `/buyer/orders/1005` (rejected palay), and `/buyer/orders/1006` through `/buyer/orders/1009` (services).
