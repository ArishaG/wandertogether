import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getAuth } from '../../../lib/auth/auth.js';
import { db } from '../../db/client.js';
import { tripMembers, trips } from '../../db/schema.js';

const makeCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user) return res.status(401).json({ error: 'Sign in to create a trip.' });
    const { name, destination, state } = req.body as { name?: string; destination?: string | null; state?: unknown };
    if (!name?.trim() || !state) return res.status(400).json({ error: 'Trip name and state are required.' });
    let joinCode = makeCode();
    while ((await db.select({ id: trips.id }).from(trips).where(eq(trips.joinCode, joinCode)).limit(1)).length) joinCode = makeCode();
    const id = randomUUID();
    const initialState = state as { members?: unknown[] };
    const owner = { id: session.user.id, name: session.user.name || session.user.email, email: session.user.email, role: 'owner', availability: [], hasSubmittedAvailability: false };
    await db.insert(trips).values({ id, ownerId: session.user.id, name: name.trim(), destination: destination || null, joinCode, state: { ...initialState, members: [owner] } });
    await db.insert(tripMembers).values({ id: randomUUID(), tripId: id, userId: session.user.id, role: 'owner' });
    res.status(201).json({ id, joinCode });
  } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create trip.' }); }
}
