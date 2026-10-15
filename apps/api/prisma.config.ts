import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: path.resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? ''
  },
});