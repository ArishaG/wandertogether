import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth.js';
import { db } from '../../../db/client.js';
import { tripMembers, trips, user } from '../../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const { code } = req.body as { code?: string };
    if (!code?.trim()) return res.status(400).json({ error: 'Enter a board key.' });

    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user) return res.status(401).json({ error: 'Sign in or create an account before joining a board.' });

    const [trip] = await db.select().from(trips).where(eq(trips.joinCode, code.trim().toUpperCase())).limit(1);
    if (!trip) return res.status(404).json({ error: 'That board key was not found.' });

    const existing = await db.select({ id: tripMembers.id }).from(tripMembers).where(and(eq(tripMembers.tripId, trip.id), eq(tripMembers.userId, session.user.id))).limit(1);
    const state = trip.state as { notifications?: { actor: string; action: string; target: string; timestamp: string }[]; members?: { id?: string; name?: string; email?: string; availability?: string[] }[] };
    const notifications = existing.length ? (state.notifications ?? []) : [...(state.notifications ?? []), { actor: session.user.name || session.user.email, action: 'joined', target: 'the board', timestamp: 'Just now' }];

    if (!existing.length) await db.insert(tripMembers).values({ id: randomUUID(), tripId: trip.id, userId: session.user.id, role: 'member' });

    const memberRows = await db.select({ userId: tripMembers.userId, role: tripMembers.role, accountName: user.name, email: user.email }).from(tripMembers).leftJoin(user, eq(tripMembers.userId, user.id)).where(eq(tripMembers.tripId, trip.id));
    const savedMembers = state.members ?? [];
    const members = memberRows.map((member) => {
      const id = member.userId ?? 'member';
      const saved = savedMembers.find((item) => item.id === id);
      const availability = saved?.availability ?? [];
      return { id, name: member.accountName ?? member.email ?? 'Member', email: member.email ?? '', role: member.role, availability, hasSubmittedAvailability: Boolean(availability.length) };
    });

    await db.update(trips).set({ state: { ...state, notifications, members } }).where(eq(trips.id, trip.id));
    res.json({ trip: { ...(state as object), id: trip.id, name: trip.name, destination: trip.destination, joinCode: trip.joinCode, notifications, members } });
  } catch (error) { res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to join trip.' }); }
}
