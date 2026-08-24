import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth.js';
import { db } from '../../../db/client.js';
import { tripMembers, trips, user } from '../../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    const tripId = String(req.params.id);
    const { name, destination, state } = req.body as { name?: string; destination?: string | null; state?: unknown };
    if (!session?.user) return res.status(401).json({ error: 'Sign in to update this board.' });
    const membership = await db.select({ id: tripMembers.id }).from(tripMembers).where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, session.user.id))).limit(1);
    if (!membership.length) return res.status(403).json({ error: 'You do not have access to this trip.' });
    if (!state) return res.status(400).json({ error: 'Trip state is required.' });
    const actorId = session.user.id;
    const actorName = session.user.name || session.user.email || 'A collaborator';
    const currentState = state as { notifications?: { actor: string; action: string; target: string; timestamp: string }[]; members?: { id?: string; name?: string; email?: string; availability?: string[]; hasSubmittedAvailability?: boolean }[] };
    const [storedTrip] = await db.select({ state: trips.state }).from(trips).where(eq(trips.id, tripId)).limit(1);
    const storedState = (storedTrip?.state ?? {}) as typeof currentState;
    const notifications = [...(storedState.notifications ?? currentState.notifications ?? []).filter((item) => !(item.actor === actorName && item.action === 'updated' && item.target === 'the board')), { actor: actorName, action: 'updated', target: 'the board', timestamp: 'Just now' }];
    const memberRows = await db.select({ userId: tripMembers.userId, role: tripMembers.role, accountName: user.name, email: user.email }).from(tripMembers).leftJoin(user, eq(tripMembers.userId, user.id)).where(eq(tripMembers.tripId, tripId));
    const persistedMembers = memberRows.map((member) => { const identity = member.userId ?? 'member'; const incoming = (currentState.members ?? []).find((item) => item.id === identity); const saved = (storedState.members ?? []).find((item) => item.id === identity); const availability = identity === actorId && incoming ? (incoming.availability ?? []) : (saved?.availability ?? incoming?.availability ?? []); const hasSubmittedAvailability = identity === actorId && incoming ? incoming.hasSubmittedAvailability === true || availability.length > 0 : saved?.hasSubmittedAvailability === true || incoming?.hasSubmittedAvailability === true || availability.length > 0; return { id: identity, name: member.accountName ?? member.email ?? 'Member', email: member.email ?? '', role: member.role, availability, hasSubmittedAvailability }; });
    const mergedMembers = persistedMembers;
    const mergedState = { ...storedState, ...currentState, members: mergedMembers, notifications };
    await db.update(trips).set({ name: name?.trim() || 'Untitled trip', destination: destination || null, state: mergedState }).where(eq(trips.id, tripId));
    res.json({
      ok: true,
      trip: {
        ...mergedState,
        id: tripId,
        name: name?.trim() || 'Untitled trip',
        destination: destination || null,
      },
    });
  } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to save trip.' }); }
}
