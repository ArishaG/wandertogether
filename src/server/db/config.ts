/**
 * Database configuration loader
 */
import { env } from 'node:process';

/**
 * Read the Postgres connection string from the environment.
 *
 * Expects a standard `postgresql://user:password@host/db?sslmode=require`
 * URL — e.g. the connection string a Neon project gives you.
 *
 * @returns The database connection string
 * @throws Error if DATABASE_URL is not set
 */
export function getDatabaseUrl(): string {
  const url = env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add it to your .env file (local dev) or your ' +
        'deployment platform\'s environment variables (production).'
    );
  }

  return url;
}
