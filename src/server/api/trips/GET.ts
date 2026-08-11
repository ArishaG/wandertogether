import type { Request, Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { getAuth } from '../../../lib/auth/auth.js';
import { db } from '../../db/client.js';
import { trip } from '../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });

    const trips = await db.select().from(trip).where(eq(trip.ownerId, session.user.id)).orderBy(desc(trip.createdAt));
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load trips', message: String(error) });
  }
}
