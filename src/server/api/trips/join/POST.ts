import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth.js';
import { db } from '../../../db/client.js';
import { trips } from '../../../db/schema.js';
import { addMemberToTrip, JoinBlockedError } from '../../../invitations';

export default async function handler(req: Request, res: Response) {
  try {
    const { code } = req.body as { code?: string };
    if (!code?.trim()) return res.status(400).json({ error: 'Enter a board key.' });

    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user) return res.status(401).json({ error: 'Sign in or create an account before joining a board.' });

    const [trip] = await db.select().from(trips).where(eq(trips.joinCode, code.trim().toUpperCase())).limit(1);
    if (!trip) return res.status(404).json({ error: 'That board key was not found.' });

    res.json({ trip: await addMemberToTrip(trip, session.user) });
  } catch (error) {
    if (error instanceof JoinBlockedError) return res.status(403).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to join trip.' });
  }
}
