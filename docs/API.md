# API Contract (draft)

NestJS API in `apps/api`. Shared types are in `packages/types` (`@irpc/types`).
Agree on changes in the group chat before editing this file.

## Conventions

- Base URL: `http://localhost:4000` locally (set `NEXT_PUBLIC_API_URL` in `apps/web`)
- Auth: `Authorization: Bearer <jwt>` on every route except `POST /auth/register`, `POST /auth/login`, `GET /prices`, `GET /rice-types`, `POST /sms/inbound`. `GET /auth/me` requires a token.
- Money and kg are decimal **strings** (`"1234.50"`), dates are ISO strings
- Errors: `{ "statusCode": 400, "message": "plain-language message" }`
- Order reference shown to users: `IRPC-0042` (`orderRef(id)` in `@irpc/types`)

## Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/register` | `{ name, phone, pin, accountType, language, municipality?, consent: true }` | `{ token, user }` |
| POST | `/auth/login` | `{ phone, pin }` | `{ token, user }` |
| GET | `/auth/me` | (requires token) | `user` |

## Prices and rice (public)

| Method | Path | Returns |
|---|---|---|
| GET | `/prices` | `CurrentPrice[]`: for each `(item, riceTypeId)` pair, the row with the latest `effectiveAt` that is not in the future. Each rice type gets its own `RICE` price. |
| GET | `/rice-types` | `RiceTypeDto[]` (active types with stock and current price) |

## Orders (role: USER)

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/orders` | `CreateOrderRequest` | `OrderDto` (status `PENDING`, `estimatedAmount` set) |
| GET | `/orders/mine?active=true` | | `OrderDto[]` |
| GET | `/orders/:id` | | `OrderDto` with `events` (own orders only) |
| POST | `/orders/:id/confirm-weight` | | `OrderDto` (sets `weightConfirmedAt`) |
| POST | `/orders/:id/cancel` | | `OrderDto` (only while `PENDING`) |

## Admin and plant staff (roles: ADMIN, PLANT_STAFF)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/admin/summary` | | counts for the Today page: needs approval, arriving today, in drying, ready for pickup, kg booked today |
| GET | `/admin/orders?status=&type=` | | `OrderDto[]` |
| GET | `/admin/orders/:id` | | `OrderDto` with `events` and customer |
| PATCH | `/admin/orders/:id/accept` | `{ scheduledDate? }` | `OrderDto`. In one transaction: locks prices, writes an `OrderEvent`, and moves the order out of `PENDING`. BUY_RICE and SELL_PALAY go to `ACCEPTED` (BUY_RICE also reserves stock). **SERVICE goes to `SCHEDULED`**, locking `dryingRate` and `millingRate`; `scheduledDate` is required for SERVICE. For every type, the confirmed date is saved to the order's `scheduledDate` (defaults to `preferredDate` when omitted for BUY_RICE and SELL_PALAY) and included in the acceptance SMS. Use `ACCEPT_STATUS[type]` from `@irpc/types`. |
| PATCH | `/admin/orders/:id/reject` | `{ reason }` | `OrderDto` |
| PATCH | `/admin/orders/:id/status` | `{ status, note? }` | `OrderDto` (must follow `ORDER_FLOW`; cannot be used to leave `PENDING`, use accept/reject instead) |
| POST | `/admin/orders/:id/weigh-in` | `{ wetKg?, dryKg?, riceKg? }` | `OrderDto` (recalculates `finalAmount`, asks farmer to confirm) |

## Admin only (role: ADMIN)

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/admin/prices` | `{ item, riceTypeId?, pricePerKg, basis, notifyUsers }` | `CurrentPrice` (new row; old rows kept as history) |
| GET | `/admin/prices/history?item=` | | price rows, newest first |
| POST | `/admin/rice-types/:id/stock` | `{ changeKg, reason }` | `RiceTypeDto` |
| GET | `/admin/money?from=&to=` | | `{ boughtPalay, soldRice, serviceFees, grossProfit }` |
| GET | `/admin/sms-logs` | | SMS log rows |

## SMS

| Method | Path | Notes |
|---|---|---|
| POST | `/sms/inbound` | TextBee webhook. Commands: `PRESYO`, `STATUS <ref>` |

Every status change writes an `OrderEvent` and sends an SMS to the order's contact phone.

## Amount rules

- BUY_RICE: `kg × rice price`
- SELL_PALAY: `kg × fresh or dry palay price` (estimate uses `requestedKg`; final uses weighed kg)
- SERVICE: `wetKg × drying fee` + `riceKg × milling fee` (estimate uses `requestedKg` and the milling recovery setting)
- Prices are locked on the order when it is accepted
