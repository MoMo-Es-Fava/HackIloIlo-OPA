# Frontend integration notes for RR

Step 2 keeps `apps/api`, `packages/types`, and `docs/API.md` unchanged. These notes are a handoff draft to share in the group chat.

## Contract questions

- `OrderDto` does not include contact/customer information, although `CreateOrderRequest` accepts a contact and the admin detail endpoint promises a customer. Please confirm the typed admin customer response for names and receipts.
- `OrderDto` has no batch/offer association, and the contract has no batch/offer endpoints. Existing traceability links use a separate demo lookup; the API integration must hide unavailable links or use a separately agreed response.
- There is no shared user DTO yet. Please confirm the `/auth/me` response, including ID type, account type, role, phone, and language.
- The service estimate needs a milling recovery setting, but its public response is not defined. The mock explicitly assumes 65% recovery; drying and milling prices come from `CurrentPrice[]`. The API must provide the authoritative estimate.
- `SERVICE` accepts drying, milling, or both. There is no Storage service or request `notes` field, so those unsupported inputs were removed from the existing demo form.

## Frontend behavior

- Prices, rice types, and orders use the shared DTOs directly. `OrderDto` records are not extended with UI fields.
- Numeric IDs go in URLs; `orderRef(id)` supplies the displayed `IRPC-…` reference. Quantities and amounts stay decimal strings in records; formatting converts them only for display or mock calculations.
- All service requests now belong to the same order collection as rice purchases and palay sales. The legacy queue and batch fixtures remain independent demo data for screens outside the order contract.
- The current demo account is `B-07`. A separate `DemoOrderDetails` lookup scopes sample orders to that account and supplies customer/batch details for existing screens. This lookup is not an API response or authentication mechanism. Step 3 should use `/orders/mine` for real customer scoping.
- New orders are pending with unlocked prices. Mock acceptance reserves rice stock and locks prices; service acceptance requires a date and moves to scheduled. Every transition appends an event. Rejection requires a reason; customer cancellation is limited to pending orders.
- The existing service-only queue and rice sales table have been adapted to these states. A unified admin inbox, farmer weight-confirmation UI, and the full Sell palay form remain later steps.

## Verification

Run from the repository root:

```sh
npm run build:types
npm test -w web
npm run typecheck -w web
npm run lint -w web
npm run build -w web
```

Sample routes: `/buyer/orders/1001` (pending rice), `/buyer/orders/1003/receipt` (completed rice), `/buyer/orders/1004` (weighed palay), `/buyer/orders/1005` (rejected palay), and `/buyer/orders/1006` through `/buyer/orders/1009` (services).
