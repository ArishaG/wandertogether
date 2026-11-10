import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { getTrustedOrigins } from '../lib/auth/trusted-origins';
import { db } from './db/client';
import { tripMembers, trips, user } from './db/schema';
import { isBlockedBetween } from './blocked-accounts';

export const INVITATION_TTL_DAYS = 14;

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

type TripRow = typeof trips.$inferSelect;
type SessionUser = { id: string; email: string; name?: string | null };
type TripState = {
  notifications?: { actor: string; action: string; target: string; timestamp: string }[];
  members?: { id?: string; name?: string; email?: string; availability?: string[]; hasSubmittedAvailability?: boolean }[];
};
// Either the root db or a transaction handle.
type Executor = Pick<typeof db, 'select' | 'insert' | 'update'>;

export function createInvitationToken() {
  return randomBytes(32).toString('base64url');
}

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/** Pending invitations past their expiry are reported as expired without a DB write. */
export function effectiveStatus(invitation: { status: string; expiresAt: Date }, now = new Date()): InvitationStatus {
  if (invitation.status === 'pending' && invitation.expiresAt.getTime() <= now.getTime()) return 'expired';
  return invitation.status as InvitationStatus;
}

export function getAppOrigin() {
  const origin = process.env.BETTER_AUTH_URL || getTrustedOrigins().find(value => value.startsWith('https://'));
  return origin ? new URL(origin).origin : null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function buildInvitationEmail(input: { inviter: string; tripName: string; destination?: string | null; acceptUrl: string; expiresAt: Date }) {
  const tripName = input.tripName.slice(0, 100);
  const inviter = input.inviter.slice(0, 100);
  const where = input.destination ? ` to ${input.destination.slice(0, 100)}` : '';
  const expires = input.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const subject = `${inviter} invited you to plan ${tripName} on Wander`;
  const text = `${inviter} invited you to plan ${tripName}${where} together on Wander.\n\nAccept the invitation: ${input.acceptUrl}\n\nYou'll be asked to sign in or create a free account first. This invitation expires on ${expires}.\n\nIf you weren't expecting this, you can ignore this email.`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f2328">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6b7280">Wander</p>
<h1 style="margin:0 0 12px;font-size:22px;line-height:28px">You're invited to plan ${escapeHtml(tripName)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:22px;color:#4b5563"><strong>${escapeHtml(inviter)}</strong> invited you to plan ${escapeHtml(tripName)}${escapeHtml(where)} together on Wander.</p>
<a href="${escapeHtml(input.acceptUrl)}" style="display:inline-block;background:#1f2328;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:10px">Accept invitation</a>
<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#6b7280">You'll be asked to sign in or create a free account first. This invitation expires on ${escapeHtml(expires)}.</p>
<p style="margin:12px 0 0;font-size:12px;line-height:18px;color:#9ca3af">Button not working? Paste this link into your browser:<br><span style="word-break:break-all">${escapeHtml(input.acceptUrl)}</span></p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#9ca3af">If you weren't expecting this, you can ignore this email.</p>
</td></tr></table></body></html>`;
  return { subject, text, html };
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.INVITATION_FROM_EMAIL && getAppOrigin());
}

export async function sendEmail(to: string, content: { subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.INVITATION_FROM_EMAIL;
  if (!key || !from) throw new Error('Email invitations are not configured yet. Share the invite link instead.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], ...content }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('The invitation email could not be sent. Try again or share the invite link.');
}

export class JoinBlockedError extends Error {}

/**
 * Adds the user to a trip (idempotent), logs a "joined" notification and
 * rebuilds state.members from trip_members. Throws JoinBlockedError when
 * account privacy settings forbid it.
 */
export async function addMemberToTrip(trip: TripRow, sessionUser: SessionUser, executor: Executor = db) {
  const existing = await executor.select({ id: tripMembers.id }).from(tripMembers).where(and(eq(tripMembers.tripId, trip.id), eq(tripMembers.userId, sessionUser.id))).limit(1);
  if (!existing.length) {
    const people = await executor.select({ id: user.id, email: user.email }).from(tripMembers).innerJoin(user, eq(tripMembers.userId, user.id)).where(eq(tripMembers.tripId, trip.id));
    if (await isBlockedBetween(people, sessionUser)) throw new JoinBlockedError('Joining this board is not allowed by account privacy settings.');
  }
  const state = trip.state as TripState;
  const notifications = existing.length ? (state.notifications ?? []) : [...(state.notifications ?? []), { actor: sessionUser.name || sessionUser.email, action: 'joined', target: 'the board', timestamp: new Date().toISOString() }];

  if (!existing.length) await executor.insert(tripMembers).values({ id: randomUUID(), tripId: trip.id, userId: sessionUser.id, role: 'member' });

  const memberRows = await executor.select({ userId: tripMembers.userId, role: tripMembers.role, accountName: user.name, email: user.email, image: user.image }).from(tripMembers).leftJoin(user, eq(tripMembers.userId, user.id)).where(eq(tripMembers.tripId, trip.id));
  const savedMembers = state.members ?? [];
  const members = memberRows.map(member => {
    const id = member.userId ?? 'member';
    const saved = savedMembers.find(item => item.id === id);
    const availability = saved?.availability ?? [];
    return { id, name: member.accountName ?? member.email ?? 'Member', email: member.email ?? '', image: member.image, role: member.role, availability, hasSubmittedAvailability: saved?.hasSubmittedAvailability === true || availability.length > 0 };
  });

  await executor.update(trips).set({ state: { ...state, notifications, members } }).where(eq(trips.id, trip.id));
  return { ...(state as object), id: trip.id, name: trip.name, destination: trip.destination, joinCode: trip.joinCode, notifications, members };
}
