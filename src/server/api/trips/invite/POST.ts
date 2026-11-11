import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { getAuth } from '../../../../lib/auth/auth';
import { db } from '../../../db/client';
import { tripInvitations, trips, tripMembers, user } from '../../../db/schema';
import { buildInvitationEmail, createInvitationToken, getAppOrigin, hashInvitationToken, INVITATION_TTL_DAYS, isEmailConfigured, sendEmail } from '../../../invitations';
import { isBlockedBetween } from '../../../blocked-accounts';

const RESEND_COOLDOWN_MS = 60_000;

export default async function handler(req: Request, res: Response) {
  const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
  if (!session?.user) return res.status(401).json({ error: 'Sign in to invite people.' });
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return res.status(400).json({ error: 'Enter a valid email address.' });
  const tripId = String(req.params.id);
  try {
    const [membership] = await db.select().from(tripMembers).where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, session.user.id))).limit(1);
    if (!membership) return res.status(403).json({ error: 'You must belong to this board to invite people.' });
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
    if (!trip) return res.status(404).json({ error: 'Trip not found.' });
    if (!isEmailConfigured()) return res.status(503).json({ error: 'Email invitations are not configured yet. Share the invite link instead.' });

    const [recipient] = await db.select({ id: user.id, email: user.email }).from(user).where(eq(user.email, email)).limit(1);
    if (await isBlockedBetween([recipient || { id: 'not-registered', email }], session.user)) return res.status(403).json({ error: 'This invitation is not allowed by account privacy settings.' });
    if (recipient) {
      const [alreadyMember] = await db.select({ id: tripMembers.id }).from(tripMembers).where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, recipient.id))).limit(1);
      if (alreadyMember) return res.status(409).json({ error: 'That person is already on this board.' });
    }

    const pendingForEmail = and(eq(tripInvitations.tripId, tripId), eq(tripInvitations.email, email), eq(tripInvitations.status, 'pending'));
    const [recent] = await db.select({ id: tripInvitations.id }).from(tripInvitations).where(and(pendingForEmail, gt(tripInvitations.createdAt, new Date(Date.now() - RESEND_COOLDOWN_MS)))).limit(1);
    if (recent) return res.status(429).json({ error: 'An invitation was just sent to that address. Wait a minute before resending.' });

    // Resending replaces any earlier link so only the newest email works.
    await db.update(tripInvitations).set({ status: 'revoked' }).where(pendingForEmail);
    const token = createInvitationToken();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    const id = randomUUID();
    await db.insert(tripInvitations).values({ id, tripId, email, invitedBy: session.user.id, tokenHash: hashInvitationToken(token), expiresAt });

    const acceptUrl = `${getAppOrigin()}/invite/${token}`;
    try {
      await sendEmail(email, buildInvitationEmail({ to: email, inviter: session.user.name || session.user.email, tripName: trip.name, destination: trip.destination, acceptUrl, expiresAt }));
    } catch (error) {
      await db.update(tripInvitations).set({ status: 'revoked' }).where(eq(tripInvitations.id, id));
      return res.status(503).json({ error: error instanceof Error ? error.message : 'Unable to send invitation.' });
    }
    res.json({ ok: true, invitation: { id, email, status: 'pending', expiresAt: expiresAt.toISOString() } });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to send invitation.' });
  }
}
