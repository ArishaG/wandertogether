import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth.js';
import { db } from '../../../db/client.js';
import { tripMembers, trips } from '../../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user) return res.status(401).json({ error: 'Sign in to delete a board.' });

    const tripId = String(req.params.id);
    const [trip] = await db.select({ ownerId: trips.ownerId }).from(trips).where(eq(trips.id, tripId)).limit(1);
    if (!trip) return res.status(404).json({ error: 'Board not found.' });
    if (trip.ownerId !== session.user.id) return res.status(403).json({ error: 'Only the board owner can delete this board.' });

    await db.transaction(async (tx) => {
      await tx.delete(tripMembers).where(eq(tripMembers.tripId, tripId));
      await tx.delete(trips).where(eq(trips.id, tripId));
    });

    const [remaining] = await db.select({ id: trips.id }).from(trips).where(eq(trips.id, tripId)).limit(1);
    if (remaining) return res.status(500).json({ error: 'The board could not be removed. Please try again.' });

    res.json({ ok: true, id: tripId });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to delete board.' });
  }
}
