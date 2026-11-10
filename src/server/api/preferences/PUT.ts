import type { Request, Response } from 'express';
import { getAuth } from '../../../lib/auth/auth';
import { parsePreferences } from '../../../lib/account-preferences';
import { db } from '../../db/client';
import { accountPreferences } from '../../db/schema';

export default async function handler(req: Request, res: Response) {
  const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
  if (!session?.user) return res.status(401).json({ error: 'Sign in to update account settings.' });
  const preferences = parsePreferences(req.body);
  if (!preferences) return res.status(400).json({ error: 'Check your phone number and blocked email addresses.' });
  await db.insert(accountPreferences).values({ userId: session.user.id, preferences }).onConflictDoUpdate({ target: accountPreferences.userId, set: { preferences } });
  res.json({ preferences });
}
