/**
 * Database connection setup using Drizzle ORM with postgres.js (Neon-compatible)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getDatabaseUrl } from './config';
import * as schema from './schema';

// Create Postgres connection pool with SSL enabled (required by Neon)
const queryClient = postgres(getDatabaseUrl(), {
  ssl: 'require',
  max: 10,
});

// Create Drizzle instance
export const db = drizzle(queryClient, { schema });

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await queryClient`select 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closeConnection(): Promise<void> {
  await queryClient.end();
}
