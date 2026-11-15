import { and, asc, eq, gt, isNotNull } from 'drizzle-orm';
import type { BoardNotification } from '../lib/board-notifications';
import { db } from './db/client';
import { tripInvitations, tripMembers, trips, user } from './db/schema';

export type LeaveMember = { userId: string; name: string; joinedAt: Date | null };

export type LeavePlan =
  | { outcome: 'delete'; pendingInvitations: number }
  | { outcome: 'leave'; remainingMembers: number; newOwner: { id: string; name: string } | null };

/**
 * Decides what leaving a board does:
 * - the last member leaving deletes the board (and its pending invitations);
 * - the owner leaving hands ownership to the member who joined earliest;
 * - anyone else simply leaves.
 * `members` must include the leaving user.
 */
export function planLeave({ userId, ownerId, members, pendingInvitations }: {
  userId: string;
  ownerId: string;
  members: LeaveMember[];
  pendingInvitations: number;
}): LeavePlan {
  const others = members.filter(member => member.userId !== userId);
  if (!others.length) return { outcome: 'delete', pendingInvitations };
  if (ownerId !== userId) return { outcome: 'leave', remainingMembers: others.length, newOwner: null };
  const [earliest] = [...others].sort((a, b) => (a.joinedAt?.getTime() ?? Infinity) - (b.joinedAt?.getTime() ?? Infinity));
  return { outcome: 'leave', remainingMembers: others.length, newOwner: { id: earliest.userId, name: earliest.name } };
}

export class NotAMemberError extends Error {}

type Executor = Pick<typeof db, 'select'>;

async function loadPlanInputs(executor: Executor, tripId: string) {
  const rows = await executor
    .select({ userId: tripMembers.userId, name: user.name, email: user.email, joinedAt: tripMembers.createdAt })
    .from(tripMembers).innerJoin(user, eq(tripMembers.userId, user.id))
    .where(and(eq(tripMembers.tripId, tripId), isNotNull(tripMembers.userId)))
    .orderBy(asc(tripMembers.createdAt), asc(tripMembers.id));
  const members: LeaveMember[] = rows.map(row => ({ userId: row.userId!, name: row.name || row.email, joinedAt: row.joinedAt }));
  const pending = await executor.select({ id: tripInvitations.id }).from(tripInvitations)
    .where(and(eq(tripInvitations.tripId, tripId), eq(tripInvitations.status, 'pending'), gt(tripInvitations.expiresAt, new Date())));
  return { members, pendingInvitations: pending.length };
}

/** What would happen if this user left — used for the confirmation dialog. */
export async function previewLeave(tripId: string, userId: string) {
  const [trip] = await db.select({ id: trips.id, name: trips.name, ownerId: trips.ownerId }).from(trips).where(eq(trips.id, tripId)).limit(1);
  if (!trip) return null;
  const inputs = await loadPlanInputs(db, tripId);
  if (!inputs.members.some(member => member.userId === userId)) throw new NotAMemberError('You are not a member of this board.');
  return { tripName: trip.name, ...planLeave({ userId, ownerId: trip.ownerId, ...inputs }) };
}

type TripState = {
  members?: { id?: string; role?: string; availability?: string[] }[];
  availability?: { proposedDays?: string[] } & Record<string, unknown>;
  notifications?: BoardNotification[];
};

/**
 * Removes the user from the board. The decision is re-made inside the
 * transaction with the trip row locked, so two people leaving at the same
 * moment can't both see "someone else is still here" and orphan the board.
 */
export async function leaveTrip(tripId: string, leaving: { id: string; name?: string | null; email: string }) {
  return db.transaction(async tx => {
    const [trip] = await tx.select().from(trips).where(eq(trips.id, tripId)).for('update');
    if (!trip) return null;
    const inputs = await loadPlanInputs(tx, tripId);
    if (!inputs.members.some(member => member.userId === leaving.id)) throw new NotAMemberError('You are not a member of this board.');
    const plan = planLeave({ userId: leaving.id, ownerId: trip.ownerId, ...inputs });

    if (plan.outcome === 'delete') {
      // Pending invitations are removed by the trip_invitations foreign-key cascade.
      await tx.delete(tripMembers).where(eq(tripMembers.tripId, tripId));
      await tx.delete(trips).where(eq(trips.id, tripId));
      return plan;
    }

    await tx.delete(tripMembers).where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, leaving.id)));
    if (plan.newOwner) {
      await tx.update(tripMembers).set({ role: 'owner' }).where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, plan.newOwner.id)));
    }

    // Their notes, votes and saved places stay; only their membership and availability go.
    const state = trip.state as TripState & Record<string, unknown>;
    const now = new Date().toISOString();
    const notifications: BoardNotification[] = [
      ...(state.notifications ?? []),
      { actorId: leaving.id, actor: leaving.name || leaving.email, action: 'left', target: 'the board', timestamp: now },
      ...(plan.newOwner ? [{ actorId: plan.newOwner.id, actor: plan.newOwner.name, action: 'is now', target: 'the board owner', timestamp: now }] : []),
    ];
    const members = (state.members ?? [])
      .filter(member => member.id !== leaving.id)
      .map(member => (plan.newOwner && member.id === plan.newOwner.id ? { ...member, role: 'owner' } : member));
    const availability = state.availability
      ? { ...state.availability, proposedDays: [...new Set(members.flatMap(member => member.availability ?? []))].sort() }
      : state.availability;
    await tx.update(trips).set({
      ...(plan.newOwner ? { ownerId: plan.newOwner.id } : {}),
      state: { ...state, members, availability, notifications },
    }).where(eq(trips.id, tripId));
    return plan;
  });
}
