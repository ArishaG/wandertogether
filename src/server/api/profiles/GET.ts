import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { accountPreferences, user } from '../../db/schema';
import type { AccountPreferences } from '../../../lib/account-preferences';
export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  const [profile] = await db.select({ name: user.name, image: user.image, preferences: accountPreferences.preferences }).from(user).innerJoin(accountPreferences, eq(user.id, accountPreferences.userId)).where(eq(user.id, String(req.params.id))).limit(1);
  if (!(profile?.preferences as AccountPreferences)?.publicProfile) return res.status(404).json({ error: 'This profile is private or unavailable.' });
  res.json({ name: profile.name, image: profile.image });
}
