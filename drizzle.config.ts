/**
 * Drizzle Kit configuration for database migrations
 *
 * Usage:
 * - Generate migrations: npx drizzle-kit generate
 * - Push schema to database: npx drizzle-kit push
 *
 * Configuration source:
 * - Reads DATABASE_URL from the environment (e.g. a Neon connection string)
 */
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: false,
});
