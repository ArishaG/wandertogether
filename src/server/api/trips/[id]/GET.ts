import type { Request, Response } from 'express';
import { and, desc, eq, gt } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth.js';
import { db } from '../../../db/client.js';
import { tripInvitations, tripMembers, trips, user } from '../../../db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const tripId = String(req.params.id);
    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });

    if (!session?.user) return res.status(401).json({ error: 'Sign in to access this board.' });
    const memberRows = await db.select({ userId: tripMembers.userId, role: tripMembers.role, accountName: user.name, email: user.email, image: user.image }).from(tripMembers).leftJoin(user, eq(tripMembers.userId, user.id)).where(eq(tripMembers.tripId, tripId));
    const isMember = memberRows.some((member) => member.userId === session.user.id);
    if (!isMember) return res.status(403).json({ error: 'You do not have access to this trip.' });

    const pendingInvitations = await db.select({ id: tripInvitations.id, email: tripInvitations.email, expiresAt: tripInvitations.expiresAt, createdAt: tripInvitations.createdAt }).from(tripInvitations).where(and(eq(tripInvitations.tripId, tripId), eq(tripInvitations.status, 'pending'), gt(tripInvitations.expiresAt, new Date()))).orderBy(desc(tripInvitations.createdAt));
    const state = trip.state as { notifications?: { actor: string; action: string; target: string; timestamp: string }[]; members?: { id?: string; name?: string; email?: string; availability?: string[]; hasSubmittedAvailability?: boolean }[] };
    res.json({
      trip: {
        ...(state as object),
        notifications: (state.notifications || []).map(event => event.actor === 'You' && event.action === 'created' ? { ...event, actor: memberRows.find(member => member.role === 'owner')?.accountName || 'Trip owner' } : event),
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        joinCode: trip.joinCode,
        pendingInvitations: pendingInvitations.map(item => ({ id: item.id, email: item.email, expiresAt: item.expiresAt.toISOString() })),
        members: memberRows.map((member) => {
          const id = member.userId ?? 'member';
          const saved = (state.members ?? []).find((item) => item.id === id);
          const availability = saved?.availability ?? [];
          return { id, name: member.accountName ?? member.email ?? 'Member', email: member.email ?? '', image: member.image, role: member.role, availability, hasSubmittedAvailability: saved?.hasSubmittedAvailability === true || availability.length > 0 };
        }),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load trip.' });
  }
}
