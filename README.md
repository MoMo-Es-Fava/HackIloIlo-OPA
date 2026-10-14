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

## Creating the apps

`apps/web` and `apps/api` only contain placeholder folders. Remove the placeholders first, then generate each app in place:

```bash
# Frontend (Lunele)
rm -rf apps/web && npx create-next-app@latest apps/web --ts --tailwind --app --src-dir --eslint --use-npm

# Backend (RR)
rm -rf apps/api && npx @nestjs/cli new api --directory apps/api --package-manager npm --skip-git
```

Then set `"name": "web"` and `"name": "api"` in each app's `package.json`, and add `"@irpc/types": "*"` to both apps' dependencies. In `apps/web/next.config.ts`, nothing extra is needed because `@irpc/types` is compiled to `dist`.

## Using shared types

```ts
import { OrderStatus, canTransition, orderRef } from '@irpc/types';
```

Run `npm run build:types` after changing `packages/types/src/index.ts`.

## Branches

- One branch per feature (e.g. `SMS`, `setup/monorepo`), merged into `main` after review
- Never commit `.env` files; commit `.env.example` with blank values instead
