# Pricing endpoints

Only three routes are declared (relative to any application-wide prefix):

- `GET /prices`: current prices, one latest record per category/rice type.
- `GET /rice-types`: rice types from the shared database.
- `POST /admin/prices`: validate and insert a price; requires an authenticated IRPC admin.

Example request body for a rice price:

```json
{
  "item": "RICE",
  "riceTypeId": 1,
  "pricePerKg": "50.00",
  "basis": "MARKET",
  "notifyUsers": false
}
```

Items come from `@irpc/types`: `PALAY_FRESH`, `PALAY_DRY`, `RICE`, `DRYING_FEE`,
and `MILLING_FEE`. Amounts are positive PHP/kg decimal strings. Rice type IDs are
positive integers; only `RICE` accepts one. Basis is `MARKET` or `NFA`.
Responses use the shared `CurrentPrice` and `RiceTypeDto` definitions. Notification
requests return 503 until a notification service is connected, before any write.

## Shared dependencies

The merged repository now has a NestJS application, but no Prisma schema or admin
guard. This module is not registered in `AppModule` until those dependencies exist.
Once they are available, import
`PricesModule.register({ imports: [...], repository: SharedPricesRepository,
adminGuard: SharedAdminGuard })`, substituting the real exported providers.

The repository adapter must implement `PricesRepository`, use a Prisma decimal
column for pricePerKg, enforce rice-type foreign keys, and insert rather than update
prices. Current-price queries select the latest nonfuture effectiveAt per
(item, riceTypeId), with a deterministic tie breaker. The supplied guard must authenticate the
request and enforce IRPC admin access; a role check alone is insufficient.

If the application uses global authentication guards, apply its established
public-route convention to the two GET routes if public prices are intended.
Missing dependency providers should prevent startup rather than allow writes.

No authentication system, database schema, bookings, SMS, or frontend is added here.
