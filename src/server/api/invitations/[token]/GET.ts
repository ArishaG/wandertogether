import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { tripInvitations, trips, user } from '../../../db/schema';
import { effectiveStatus, hashInvitationToken } from '../../../invitations';

/** Public preview of an invitation, shown on /invite/:token before signing in. */
export default async function handler(req: Request, res: Response) {
  try {
    const token = String(req.params.token || '');
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return res.status(404).json({ error: 'This invitation link is not valid.' });
    const [row] = await db
      .select({ status: tripInvitations.status, expiresAt: tripInvitations.expiresAt, email: tripInvitations.email, tripName: trips.name, destination: trips.destination, inviterName: user.name, inviterEmail: user.email })
      .from(tripInvitations)
      .innerJoin(trips, eq(tripInvitations.tripId, trips.id))
      .leftJoin(user, eq(tripInvitations.invitedBy, user.id))
      .where(eq(tripInvitations.tokenHash, hashInvitationToken(token)))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'This invitation link is not valid.' });
    res.json({
      invitation: {
        status: effectiveStatus(row),
        email: row.email,
        tripName: row.tripName,
        destination: row.destination,
        inviterName: row.inviterName || row.inviterEmail || 'Someone',
        expiresAt: row.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to load invitation.' });
  }
}
