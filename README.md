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
# for seeding the db with data
npx prisma db seed
```

## Using shared types

```ts
import { OrderStatus, canTransition, orderRef } from '@irpc/types';
```

Run `npm run build:types` after changing `packages/types/src/index.ts`.

## Branches

- One branch per feature (e.g. `SMS`, `setup/monorepo`), merged into `main` after review
- Never commit `.env` files; commit `.env.example` with blank values instead
