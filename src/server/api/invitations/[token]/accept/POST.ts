import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '../../../../../lib/auth/auth';
import { db } from '../../../../db/client';
import { tripInvitations, trips } from '../../../../db/schema';
import { addMemberToTrip, effectiveStatus, hashInvitationToken, JoinBlockedError } from '../../../../invitations';

const gone: Record<string, string> = {
  expired: 'This invitation has expired. Ask for a new one.',
  revoked: 'This invitation is no longer valid. Ask for a new one.',
  accepted: 'This invitation has already been used.',
};

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user) return res.status(401).json({ error: 'Sign in or create an account to accept this invitation.' });
    const token = String(req.params.token || '');
    const [invitation] = await db.select().from(tripInvitations).where(eq(tripInvitations.tokenHash, hashInvitationToken(token))).limit(1);
    if (!invitation) return res.status(404).json({ error: 'This invitation link is not valid.' });

    const status = effectiveStatus(invitation);
    if (status === 'accepted' && invitation.acceptedBy === session.user.id) {
      // Re-opening an accepted link takes you back to the board.
      const [trip] = await db.select().from(trips).where(eq(trips.id, invitation.tripId)).limit(1);
      if (!trip) return res.status(404).json({ error: 'Trip not found.' });
      return res.json({ trip: await addMemberToTrip(trip, session.user) });
    }
    if (status !== 'pending') return res.status(410).json({ error: gone[status] ?? gone.revoked, status });

    const joined = await db.transaction(async tx => {
      // Claiming the row in the same transaction makes the link single-use.
      const claimed = await tx.update(tripInvitations)
        .set({ status: 'accepted', acceptedBy: session.user.id, acceptedAt: new Date() })
        .where(and(eq(tripInvitations.id, invitation.id), eq(tripInvitations.status, 'pending')))
        .returning({ id: tripInvitations.id });
      if (!claimed.length) return null;
      const [trip] = await tx.select().from(trips).where(eq(trips.id, invitation.tripId)).limit(1);
      if (!trip) throw new Error('Trip not found.');
      return addMemberToTrip(trip, session.user, tx);
    });
    if (!joined) return res.status(410).json({ error: gone.accepted, status: 'accepted' });
    res.json({ trip: joined });
  } catch (error) {
    if (error instanceof JoinBlockedError) return res.status(403).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to accept invitation.' });
  }
}
