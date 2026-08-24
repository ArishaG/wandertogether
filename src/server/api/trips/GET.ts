import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../../lib/auth/auth.js';
import { db } from '../../db/client.js';
import { tripMembers, trips } from '../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user) return res.status(401).json({ error: 'Sign in to view your trips.' });
    const rows = await db.select({ id: trips.id, name: trips.name, destination: trips.destination, joinCode: trips.joinCode, state: trips.state, role: tripMembers.role }).from(tripMembers).innerJoin(trips, eq(tripMembers.tripId, trips.id)).where(eq(tripMembers.userId, session.user.id));
    res.json({ trips: rows });
  } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load trips.' }); }
}
