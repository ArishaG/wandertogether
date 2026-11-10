import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth';
import { db } from '../../../db/client';
import { trips, tripMembers, user } from '../../../db/schema';
import { sendInvitation } from '../../../invitations';
import { isBlockedBetween } from '../../../blocked-accounts';

export default async function handler(req: Request, res: Response) {
  const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
  if (!session?.user) return res.status(401).json({ error: 'Sign in to invite people.' });
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return res.status(400).json({ error: 'Enter a valid email address.' });
  const tripId = String(req.params.id);
  const [membership] = await db.select().from(tripMembers).where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, session.user.id))).limit(1);
  if (!membership) return res.status(403).json({ error: 'You must belong to this board to invite people.' });
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });
  const [recipient] = await db.select({ id: user.id, email: user.email }).from(user).where(eq(user.email, email)).limit(1);
  if (await isBlockedBetween([recipient || { id: 'not-registered', email }], session.user)) return res.status(403).json({ error: 'This invitation is not allowed by account privacy settings.' });
  try {
    await sendInvitation(email, trip, session.user.name || session.user.email);
    res.json({ ok: true });
  } catch (error) { res.status(503).json({ error: error instanceof Error ? error.message : 'Unable to send invitation.' }); }
}
