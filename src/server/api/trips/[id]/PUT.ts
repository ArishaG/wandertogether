import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth.js';
import { describeBoardChanges, recordBoardChanges, type BoardSnapshot } from '../../../../lib/board-notifications';
import { db } from '../../../db/client.js';
import { tripMembers, trips, user } from '../../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user) return res.status(401).json({ error: 'Sign in to update this board.' });
    const tripId = String(req.params.id);
    const { name, destination, state } = (req.body || {}) as { name?: string; destination?: string | null; state?: BoardSnapshot };
    if (!state || typeof state !== 'object' || Array.isArray(state)) return res.status(400).json({ error: 'Trip state is required.' });
    const membership = await db.select({ id: tripMembers.id }).from(tripMembers).where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, session.user.id))).limit(1);
    if (!membership.length) return res.status(403).json({ error: 'You do not have access to this trip.' });

    const actorId = session.user.id;
    const actorName = session.user.name || session.user.email || 'A collaborator';
    const savedTrip = await db.transaction(async tx => {
      // Lock the version being compared so concurrent saves preserve notification history.
      const [storedTrip] = await tx.select().from(trips).where(eq(trips.id, tripId)).for('update');
      if (!storedTrip) return null;
      const storedState = storedTrip.state as BoardSnapshot;
      const memberRows = await tx.select({ userId: tripMembers.userId, role: tripMembers.role, accountName: user.name, email: user.email, image: user.image })
        .from(tripMembers).leftJoin(user, eq(tripMembers.userId, user.id)).where(eq(tripMembers.tripId, tripId));
      const members = memberRows.map(member => {
        const id = member.userId ?? 'member';
        const incoming = state.members?.find(person => person.id === id);
        const previous = storedState.members?.find(person => person.id === id);
        const submitted = id === actorId && incoming ? incoming : previous;
        const availability = submitted?.availability ?? [];
        return {
          id, name: member.accountName ?? member.email ?? 'Member', email: member.email ?? '', image: member.image, role: member.role,
          availability, hasSubmittedAvailability: submitted?.hasSubmittedAvailability === true || availability.length > 0,
        };
      });
      const nextName = name?.trim() || 'Untitled trip';
      const nextDestination = destination || null;
      const availability = state.availability || storedState.availability;
      const mergedState: BoardSnapshot & Record<string, unknown> = {
        ...storedState, ...state, name: nextName, destination: nextDestination, members,
        availability: availability ? { ...availability, proposedDays: [...new Set(members.flatMap(member => member.availability))].sort() } : availability,
      };
      const changes = describeBoardChanges({ ...storedState, name: storedTrip.name, destination: storedTrip.destination }, mergedState);
      // Client history is never trusted to supply an actor, timestamp, or event.
      mergedState.notifications = recordBoardChanges(storedState.notifications || [], changes, { id: actorId, name: actorName });
      delete mergedState.pendingInvitations;
      await tx.update(trips).set({ name: nextName, destination: nextDestination, state: mergedState }).where(eq(trips.id, tripId));
      return { ...mergedState, id: tripId, joinCode: storedTrip.joinCode };
    });
    if (!savedTrip) return res.status(404).json({ error: 'Trip not found.' });
    return res.json({ ok: true, trip: savedTrip });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to save trip.' });
  }
}
