# IRPC Digital Platform

Web platform for the Iloilo Rice Processing Complex (IRPC), Pototan, Iloilo. It includes a farmer and buyer portal, plant-staff operations workspace, and a separate admin workspace for managing user accounts.

## Project components

| Component | Location | Local address |
| --- | --- | --- |
| Web application | `apps/web` (Next.js 15, TypeScript, Tailwind CSS 4) | http://localhost:3000 |
| REST API | `apps/api` (NestJS) | http://localhost:4000 |
| PostgreSQL | Docker Compose, PostgreSQL 15 | `localhost:5432` |
| Prisma schema and migrations | `apps/api/prisma` | — |
| Shared types and workflows | `packages/types` (`@irpc/types`) | — |

The repository is an npm workspaces monorepo with one root `package-lock.json`. Run package installation and scripts from the repository root unless a command says otherwise.

### Main routes

- `/buyer` — farmer and rice-buyer workspace
- `/staff` — plant-staff operations dashboard
- `/admin` — admin user management dashboard
- `/login` and `/signup` — phone and PIN authentication
- `/health` on the API — public API health check

## Requirements

- Node.js 22 or later (`.nvmrc` specifies the project version)
- npm (included with Node.js)
- Docker Desktop or another Docker Engine with Docker Compose v2
- Git

The API and web app can run in Docker, or locally with PostgreSQL running in Docker.

## First-time setup

### 1. Add local environment files

From the repository root, copy the examples:

PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
```

macOS/Linux:

```sh
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Edit the root `.env` and set a private `JWT_SECRET` of at least 32 characters. Generate one with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep `.env` files private; never commit them. The root `.env` configures Docker Compose, local Prisma commands, and the local API. `apps/api/.env` supplies private API settings to the API container, including TextBee credentials. Compose overrides its database URL with the internal Postgres service URL.

The default local Postgres settings are database `irpc`, user `irpc`, password `changeme`, port `5432`. If you change these in the root `.env`, update `DATABASE_URL` there to match. For the API outside Docker, `DATABASE_URL` must use `localhost`; Compose supplies `postgres` as the hostname inside the container network.

### 2. Install dependencies

```sh
npm ci
npm run build:types
```

If changing Node versions, use Node 22 and reinstall with `npm ci`.

## Run everything with Docker Compose

This is the quickest way to start the full application. Ensure both environment files exist first; Compose expects `apps/api/.env` for the API service.

```sh
npm run docker
```

This builds and starts Postgres, API, and web containers. The API applies committed Prisma migrations during startup. Seed the database from the repository root:

```sh
npm run db:seed --workspace=api
```

Open http://localhost:3000. The API health endpoint is http://localhost:4000/health.

Useful Compose commands:

```sh
docker compose -f infra/docker/docker-compose.yml ps
docker compose -f infra/docker/docker-compose.yml logs -f api
docker compose -f infra/docker/docker-compose.yml logs -f web
docker compose -f infra/docker/docker-compose.yml down
```

`down` stops and removes the containers but keeps the database volume. To completely reset the local database, stop the stack and remove its volume:

```sh
docker compose -f infra/docker/docker-compose.yml down -v
```

**This deletes all database contents in the Compose volume.** Start the stack and run the seed again afterward.

## Run the web app and API locally

Use this workflow when you want hot reload for frontend and backend code while Postgres stays in Docker.

Start only Postgres:

```sh
docker compose -f infra/docker/docker-compose.yml up -d postgres
```

Apply migrations and seed the local database:

```sh
npm exec --workspace=api -- prisma migrate deploy
npm run db:seed --workspace=api
```

In one terminal, start the API:

```sh
npm run dev:api
```

In a second terminal, start the web app:

```sh
npm run dev:web
```

The web app defaults to the real API at `http://localhost:4000`. To use the older in-memory prototype data for supported screens, create `apps/web/.env.local` with `NEXT_PUBLIC_USE_MOCK=true`; restart the web server after changing it. Mock mode is for UI prototyping and is not suitable for testing real authentication or admin user management.

## Database and Prisma

The Prisma schema is `apps/api/prisma/schema.prisma`; migrations are committed under `apps/api/prisma/migrations`.

Apply existing migrations to a database:

```sh
npm exec --workspace=api -- prisma migrate deploy
```

After changing the Prisma schema during development, create a migration:

```sh
npm exec --workspace=api -- prisma migrate dev --name describe_the_change
```

Prisma Client is generated during dependency installation and the API Docker build. To regenerate it manually after a schema change:

```sh
npm exec --workspace=api -- prisma generate
```

Seed demo data:

```sh
npm run db:seed --workspace=api
```

The seed is safe to rerun: it preserves existing PINs, profile details, current stock, and manually created price rows, while keeping fixture roles and account types correct. It creates demo users, rice types, settings, prices, and sample orders spread across more than a month. Set `SEED_DEMO_PIN` in the root `.env` before the first seed if you want a PIN other than `1234`; rerunning the seed will not reset PINs that already exist.

To remove only seeded demo data:

```sh
npm run db:unseed --workspace=api
```

To remove **all** application data, including non-seed records:

```sh
npm run db:unseed --workspace=api -- --all
```

Treat `--all` and `docker compose down -v` as destructive operations.

## Demo accounts

On a fresh seed, demo accounts use PIN `1234` unless `SEED_DEMO_PIN` is set. Sign in with the listed phone number in either `0917 000 0001` format or international `+639170000001` format.

| Phone | Role | Account type |
| --- | --- | --- |
| `0917 000 0001` | Admin | — |
| `0917 000 0002` | Plant staff | — |
| `0917 000 0003`, `0004`, and `0008`–`0015` | User | Farmer |
| `0917 000 0005` | User | Cooperative |
| `0917 000 0006`, `0007`, and `0016`–`0023` | User | Buyer |

The seeded demo PIN is for local development and demonstrations only. Admin-created users can sign in with the phone and PIN assigned by an admin. Public sign-up uses SMS verification.

## SMS configuration

The default `SMS_PROVIDER=mock` logs SMS messages in the API console and does not send a real text. This is useful for local testing; the sign-up verification code appears in the API logs.

To send real SMS through TextBee, set `SMS_PROVIDER=textbee` in the root `.env` (for Compose) and in `apps/api/.env`, then fill `TEXTBEE_API_KEY` and `TEXTBEE_DEVICE_ID` in `apps/api/.env`. `TEXTBEE_API_URL` defaults to `https://api.textbee.dev/api/v1`. Restart or rebuild the API after changing configuration. Do not put TextBee credentials in `NEXT_PUBLIC_*` variables or commit them.

## Configuration reference

| Variable | Used by | Purpose |
| --- | --- | --- |
| `POSTGRES_DB` | Compose | Postgres database name; default `irpc` |
| `POSTGRES_USER` | Compose | Postgres role; default `irpc` |
| `POSTGRES_PASSWORD` | Compose | Postgres password; default `changeme` for local use only |
| `POSTGRES_PORT` | Compose | Host port for Postgres; default `5432` |
| `DATABASE_URL` | Prisma and local API | PostgreSQL connection URL |
| `JWT_SECRET` | API | JWT signing secret; use at least 32 private random characters |
| `WEB_ORIGIN` | API | Allowed browser origin; local default `http://localhost:3000` |
| `SMS_PROVIDER` | API | `mock` or `textbee` |
| `TEXTBEE_API_URL` | API | TextBee API base URL |
| `TEXTBEE_API_KEY` | API | Private TextBee API key |
| `TEXTBEE_DEVICE_ID` | API | Android device registered with TextBee |
| `TEXTBEE_WEBHOOK_SECRET` | API | Secret reserved for inbound webhook verification |
| `SEED_DEMO_PIN` | Prisma seed | PIN assigned when demo accounts are first created |
| `NEXT_PUBLIC_API_URL` | Web build | API URL reachable by the user's browser; local default `http://localhost:4000` |
| `NEXT_PUBLIC_USE_MOCK` | Web build | `false` for the real API; `true` for supported in-memory demo screens |

For a deployed environment, replace all development passwords and secrets, use HTTPS, and set `NEXT_PUBLIC_API_URL` and `WEB_ORIGIN` to the actual public origins.

## Development commands

```sh
npm run dev:web
npm run dev:api
npm run build:types
npm run build
npm run lint
npm test
npm run test:e2e --workspace=api
```

`npm test` runs workspace test scripts. API e2e tests are configured under `apps/api/test`; run them against the test setup rather than a production database.

## Repository layout

```text
apps/
  api/       NestJS REST API, Prisma schema/migrations, seed and API tests
  web/       Next.js web app, routes, components and API client
packages/
  types/     Shared roles, status enums, request/response types and workflows
infra/
  docker/    Docker Compose and API/web Dockerfiles
docs/        API and integration documentation
```

## Contributing

- Keep local `.env` files and credentials out of Git; update `.env.example` files when configuration changes.
- Build shared types with `npm run build:types` after changing `packages/types`.
- Add Prisma schema changes through migrations; do not rely on `db push` for shared environments.
