/** Only initialize database configuration when a database operation is requested. */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getDatabaseUrl } from './config';
import * as schema from './schema';

let queryClient: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getDatabase() {
  if (!database) {
    queryClient = postgres(getDatabaseUrl(), {
      ssl: 'require',
      max: 5,
      connect_timeout: 10,
      idle_timeout: 20,
    });
    database = drizzle(queryClient, { schema });
  }
  return database;
}

export const db = new Proxy({} as ReturnType<typeof getDatabase>, {
  get(_target, property) {
    const instance = getDatabase();
    const value = Reflect.get(instance, property, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export async function testConnection(): Promise<boolean> {
  try {
    getDatabase();
    await queryClient!`select 1`;
    return true;
  } catch {
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  await queryClient?.end();
  queryClient = undefined;
  database = undefined;
}
