import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../../lib/auth/auth';
import { defaultPreferences } from '../../../lib/account-preferences';
import { db } from '../../db/client';
import { accountPreferences } from '../../db/schema';

export default async function handler(req: Request, res: Response) {
  const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
  if (!session?.user) return res.status(401).json({ error: 'Sign in to view account settings.' });
  const [record] = await db.select().from(accountPreferences).where(eq(accountPreferences.userId, session.user.id)).limit(1);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ preferences: { ...defaultPreferences, ...(record?.preferences as object || {}) } });
}
