# IRPC Digital Platform

Folder skeleton only. No application code, dependencies, database schema, or deployment configuration has been added.

## Planned tech stack

- Frontend: Next.js 16, TypeScript, Tailwind CSS
- Backend: NestJS REST API with Farmer, Buyer, Miller, and IRPC Admin roles
- Database: PostgreSQL 15 with Prisma ORM and migrations
- SMS: TextBee gateway for alerts and farmer SMS commands through an Android phone
- Deployment: Docker for the NestJS API and PostgreSQL

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
  types/
    src/                       Shared frontend/backend API types
infra/
  docker/                      Docker deployment files
docs/                          Requirements and architecture notes
```

Empty directories contain `.gitkeep` placeholders so Git retains the structure. The skeleton is not runnable yet.
