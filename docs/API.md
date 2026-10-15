# API Contract (draft)

NestJS API in `apps/api`. Shared types are in `packages/types` (`@irpc/types`).
Agree on changes in the group chat before editing this file.

## Conventions

- Base URL: `http://localhost:4000` locally (set `NEXT_PUBLIC_API_URL` in `apps/web`)
- Auth: `Authorization: Bearer <jwt>` on every route except `POST /auth/register`, `POST /auth/login`, `GET /prices`, `GET /rice-types`, `GET /settings`, `POST /sms/inbound`. `GET /auth/me` requires a token.
- Money and kg are decimal **strings** (`"1234.50"`), dates are ISO strings
- "Today" and date ranges use the Asia/Manila calendar date
- Errors: `{ "statusCode": 400, "message": "plain-language message" }`
- Order reference shown to users: `IRPC-0042` (`orderRef(id)` in `@irpc/types`)

## Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/register` | `RegisterRequest` | `AuthResponse` (`{ token, user: UserDto }`). Refused without `consent: true`. New accounts get role `USER`. |
| POST | `/auth/login` | `LoginRequest` | `AuthResponse` |
| GET | `/auth/me` | (requires token) | `UserDto` |

`UserDto` never contains the PIN or its hash.

## Prices, rice and settings (public)

| Method | Path | Returns |
|---|---|---|
| GET | `/prices` | `CurrentPrice[]`: for each `(item, riceTypeId)` pair, the row with the latest `effectiveAt` that is not in the future. Each rice type gets its own `RICE` price. |
| GET | `/rice-types` | `RiceTypeDto[]` (active types with stock and current price) |
| GET | `/settings` | `PublicSettingsDto` (`dryingRecovery`, `millingRecovery`, `sackKg`, `dryingCapacityKg`) |

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
| GET | `/admin/summary` | | `AdminSummaryDto` (see below) |
| GET | `/admin/orders?status=&type=` | | `OrderDto[]` |
| GET | `/admin/orders/:id` | | `AdminOrderDto` (`OrderDto` + `customer: UserDto` + `events`) |
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
| GET | `/admin/money?from=&to=` | | `MoneySummaryDto` (see below). Defaults: `from` = first day of the current month, `to` = today. |
| GET | `/admin/sms-logs` | | `SmsLogDto[]`, newest first |

## SMS

| Method | Path | Notes |
|---|---|---|
| POST | `/sms/inbound` | TextBee webhook. Commands: `PRESYO`, `STATUS <ref>` |

Every status change writes an `OrderEvent` and sends an SMS to the order's contact phone.

## Admin summary (`AdminSummaryDto`)

All counts exclude `REJECTED` and `CANCELLED` orders.

- `needsApproval`: orders in `PENDING`
- `arrivingToday`: SELL_PALAY in `ACCEPTED` and SERVICE in `SCHEDULED` whose `scheduledDate` is today
- `inDrying`: SERVICE orders in `DRYING`
- `readyForPickup`: orders in `READY_FOR_PICKUP`
- `dryingKgBookedToday`: sum of `requestedKg` for orders scheduled today that need drying: SERVICE with `serviceType` DRYING or DRYING_AND_MILLING, and SELL_PALAY with `palayCondition` FRESH
- `dryingCapacityKg`: from settings (default 56,000 kg = 5 × 10 t + 1 × 6 t)

## Money summary (`MoneySummaryDto`)

Counts only orders in `PAID` or `COMPLETED` whose `paidAt` falls between `from` and `to` (inclusive), using `finalAmount`.

- `boughtPalay` = sum of SELL_PALAY
- `soldRice` = sum of BUY_RICE
- `serviceFees` = sum of SERVICE
- `grossProfit` = `soldRice + serviceFees − boughtPalay`

This gross profit does not yet subtract electricity or labor; those come with batch costing (P2).

## Amount rules

The API computes and stores every estimate with `estimateOrderAmount()` from `@irpc/types`. The web app calls the same function for the checkout preview, using `GET /prices` and `GET /settings`, so both always agree. The stored `estimatedAmount` is authoritative.

- BUY_RICE: `kg × rice price` (price for that `riceTypeId`)
- SELL_PALAY: `kg × fresh or dry palay price` (estimate uses `requestedKg`; final uses weighed kg)
- SERVICE: drying fee on palay kg in + milling fee on rice kg out
  - Estimate: `requestedKg × drying fee` (if drying) + `estimated rice kg × milling fee` (if milling)
  - Estimated rice kg = `requestedKg × dryingRecovery × millingRecovery` for DRYING_AND_MILLING, `requestedKg × millingRecovery` for MILLING only
  - Final: `wetKg × dryingRate` + `riceKg × millingRate`
- Amounts are rounded to 2 decimals
- Prices are locked on the order when it is accepted
