# Weekly price SMS

Verified signup enrolls the account and creates its first pending price notification.
The same TextBee `SmsService` used by signup sends it and writes the normal `SmsLog`.
The signup response does not wait for delivery. A worker wakes immediately after
enrollment and every minute while the NestJS API is running.

The next notification cycle begins Sunday at 08:00 Asia/Manila. Week identifiers
run Sunday–Saturday, regardless of the server timezone. A Sunday signup before
08:00 gets its signup message and is excluded from that morning's scheduled send.
A Saturday signup gets its next message the following Sunday. Missed Sunday runs
catch up during that week when the API restarts; old weekly messages are not sent.

## Database setup

Apply the new migration with the existing deployment procedure and regenerate
Prisma. From `apps/api`, with DATABASE_URL configured for the intended database:

```powershell
npx prisma migrate deploy
npx prisma generate
```

`User.phoneVerifiedAt` starts null for existing accounts. Only accounts whose
phone verification is known to have succeeded should receive a timestamp. This
migration does not assume seeded or legacy accounts are verified. Future signup
sets it automatically. Eligibility requires active status, non-null consent, and
a verification timestamp, irrespective of role. Signup currently records the
existing consent field; review that consent text before using for subscriptions.

## Processing and results

- Current prices come from `CatalogService`, including effective-date filtering.
- English/Hiligaynon and rice names reuse the existing SMS price builder.
- `WeeklyPriceNotification` has a unique user/week constraint. An atomic status
  change reserves each send so concurrent API replicas cannot send the same row.
- Each worker processes at most 20 records sequentially per tick. When no prices
  exist, rows remain PENDING until prices are published.
- QUEUED means TextBee accepted the request, not confirmed phone delivery.
- MOCKED records simulate sends and do not represent delivery. Use
  `SMS_PROVIDER=textbee` and the existing private credentials for real messages.
- FAILED and SENDING rows require checking TextBee history before retrying.
  A process crash or timeout can occur after TextBee accepted the SMS. Automatic
  retries could duplicate it, so these rows are never resent automatically.
- No historical verification status is inferred from OTP records or SMS logs.

Keep the API and Android gateway running. No new SMS provider or database is needed.
