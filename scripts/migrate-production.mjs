import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

if (process.env.VERCEL_ENV !== 'production') {
  console.log('Skipping production database migration.');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('Production migration requires DATABASE_URL.');
  process.exit(1);
}

let sql;
try {
  sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, connect_timeout: 10 });
  const migration = await readFile(new URL('../drizzle/0001_account_preferences.sql', import.meta.url), 'utf8');
  await sql.begin(async tx => {
    await tx`set local statement_timeout = '15s'`;
    await tx`select pg_advisory_xact_lock(hashtext('wander:0001_account_preferences'))`;
    const [existing] = await tx`select to_regclass('account_preferences') is not null as applied`;
    if (!existing.applied) await tx.unsafe(migration);
    await tx`select user_id, preferences from account_preferences limit 0`;
  });
  console.log('Account preferences migration verified.');
} catch (error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? ` (${error.code})` : '';
  console.error(`Account preferences migration failed${code}. Check the production database connection and permissions.`);
  process.exitCode = 1;
} finally {
  await sql?.end({ timeout: 5 });
}
