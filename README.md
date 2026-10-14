# IRPC Digital Platform

Digital operating and traceability platform for the Iloilo Rice Processing Complex (IRPC), Pototan, Iloilo. Built for the Iloilo Startup Hackathon 2026.

## Tech stack

- Frontend: Next.js 16, TypeScript, Tailwind CSS (`apps/web`)
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

## Creating the web app

`apps/web` only contains placeholder folders. Remove them first, then generate the app in place:

```bash
rm -rf apps/web && npx create-next-app@latest apps/web --ts --tailwind --app --src-dir --eslint --use-npm
```

Then set `"name": "web"` in `apps/web/package.json`, add `"@irpc/types": "*"` to its dependencies, delete `apps/web/package-lock.json`, and run `npm install` from the repo root.

## Using shared types

```ts
import { OrderStatus, canTransition, orderRef } from '@irpc/types';
```

Run `npm run build:types` after changing `packages/types/src/index.ts`.

## Branches

- One branch per feature (e.g. `SMS`, `setup/monorepo`), merged into `main` after review
- Never commit `.env` files; commit `.env.example` with blank values instead
