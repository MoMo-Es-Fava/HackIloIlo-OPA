# IRPC Digital Platform

Digital operating and traceability platform for the Iloilo Rice Processing Complex (IRPC), Pototan, Iloilo. Built for the Iloilo Startup Hackathon 2026.

## Tech stack

- Frontend: Next.js 15.5, TypeScript, Tailwind CSS 4 (`apps/web`); the planned Next.js 16 upgrade is deferred for team review.
- Backend: NestJS REST API (`apps/api`)
- Database: PostgreSQL 15 with Prisma ORM and migrations
- SMS: TextBee gateway through an Android phone
- Deployment: Docker for the NestJS API and PostgreSQL
- Shared types: `@irpc/types` (`packages/types`)

Roles: `USER` (farmers and buyers, one dashboard), `PLANT_STAFF`, `ADMIN`, `MAO_STAFF` (later).

## Repository layout

```text
apps/
  web/                         Next.js frontend
    src/
      app/                     Pages, layouts, and routing
      components/              Reusable UI components
      lib/                     Frontend utilities and API client
      styles/                  Tailwind and global styles
    public/                    Static assets
  api/                         NestJS backend
    src/
      modules/                 Feature modules
      common/                  Shared guards, decorators, and filters
      config/                  Backend configuration
      database/                Prisma connection and database services
      integrations/
        textbee/               SMS gateway integration
    prisma/
      migrations/              PostgreSQL migration history
    test/                      Backend tests
packages/
  types/                       @irpc/types: roles, order statuses, order flow, API shapes
infra/
  docker/                      Docker deployment files
docs/
  API.md                       API contract (draft)
```

## Setup

Requires Node.js 22 (see `.nvmrc`) and npm.

```bash
npm install
npm run build:types
```

This is an npm workspaces monorepo. Install packages for one app with `-w`:

```bash
npm install some-package -w api
```

## Running the API

```bash
cp apps/api/.env.example apps/api/.env   # then fill in values
npm run build:types
npm run dev:api                          # http://localhost:4000/health
```

Tests: `npm test -w api` and `npm run test:e2e -w api`.

## Running the web app

Run these commands from the repository root after the setup above:

```bash
npm run dev:web            # http://localhost:3000
npm run lint -w web
npm run build -w web       # production build
```

The web app uses the root `package-lock.json` and workspace install; do not install it separately. It currently uses sample data in memory. See `apps/web/README.md` for routes and frontend notes.

## Initializing Database

First install docker via: https://www.docker.com/products/docker-desktop/

```bash
npm install
docker compose -f infra/docker/docker-compose.yml up -d --build
docker ps   # confirm irpc_postgres is running
```

installing db dependencies

```bash
cd apps/api
npm install

npx prisma migrate dev --name init
npx prisma generate
```

## Demo accounts

`npx prisma db seed` (from `apps/api`) creates these accounts. They all share one demo PIN: `SEED_DEMO_PIN` in `.env`, or the default in `apps/api/prisma/seed.ts`. Log in with the phone number as `0917 000 000X`.

| Phone | Role | Account type |
|---|---|---|
| +639170000001 | Admin | Staff |
| +639170000002 | Plant staff | Staff |
| +639170000003 | User | Farmer (Pototan) |
| +639170000004 | User | Farmer (Dumangas) |
| +639170000005 | User | Cooperative (Pototan) |
| +639170000006 | User | Buyer (retailer) |
| +639170000007 | User | Buyer (food services) |

Re-running the seed resets these accounts' PINs and roles. Demo accounts are for local and demo use only.

## Live database test

`apps/api/test/live/orders-flow.mjs` runs 58 checks against a real, freshly seeded database: every order flow, stock reservation, farmer confirmation, staff entry for walk-ins, roles and privacy.

```bash
npm run docker                                   # Postgres
cd apps/api && npx prisma migrate deploy && npx prisma db seed
npm run build && node dist/main.js               # in another terminal, with JWT_SECRET set
node test/live/orders-flow.mjs http://localhost:4000 <demo PIN>
```

Use a fresh database: the script expects the seeded stock and prices.

## Using shared types

```ts
import { OrderStatus, canTransition, orderRef } from '@irpc/types';
```

Run `npm run build:types` after changing `packages/types/src/index.ts`.

## Branches

- One branch per feature (e.g. `SMS`, `setup/monorepo`), merged into `main` after review
- Never commit `.env` files; commit `.env.example` with blank values instead
