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

// Each migration is applied once (guarded by the table it creates) and then verified.
const migrations = [
  {
    file: '0001_account_preferences.sql',
    table: 'account_preferences',
    verify: tx => tx`select user_id, preferences from account_preferences limit 0`,
  },
  {
    file: '0002_trip_invitations.sql',
    table: 'trip_invitations',
    verify: tx => tx`select id, trip_id, email, token_hash, status, expires_at, accepted_by from trip_invitations limit 0`,
  },
];

let sql;
let current = '';
try {
  sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1, connect_timeout: 10 });
  for (const migration of migrations) {
    current = migration.file;
    const text = await readFile(new URL(`../drizzle/${migration.file}`, import.meta.url), 'utf8');
    await sql.begin(async tx => {
      await tx`set local statement_timeout = '15s'`;
      await tx`select pg_advisory_xact_lock(hashtext(${`wander:${migration.file}`}))`;
      const [existing] = await tx`select to_regclass(${migration.table}) is not null as applied`;
      if (!existing.applied) await tx.unsafe(text);
      await migration.verify(tx);
    });
    console.log(`Migration verified: ${migration.file}`);
  }
} catch (error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code) ? ` (${error.code})` : '';
  console.error(`Migration ${current} failed${code}. Check the production database connection and permissions.`);
  process.exitCode = 1;
} finally {
  await sql?.end({ timeout: 5 });
}
