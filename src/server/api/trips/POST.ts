import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../../lib/auth/auth.js';
import { db } from '../../db/client.js';
import { trip } from '../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });

    const { name, destination, tripType } = req.body as { name?: string; destination?: string; tripType?: string };
    if (!name?.trim() || !destination?.trim() || !tripType?.trim()) {
      return res.status(400).json({ error: 'Name, destination, and trip type are required' });
    }

    const id = randomUUID();
    await db.insert(trip).values({
      id,
      ownerId: session.user.id,
      name: name.trim(),
      destination: destination.trim(),
      tripType: tripType.trim(),
    });
    const created = await db.select().from(trip).where(eq(trip.id, id)).limit(1);
    res.status(201).json(created[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create trip', message: String(error) });
  }
}
