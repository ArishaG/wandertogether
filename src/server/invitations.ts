import { getTrustedOrigins } from '../lib/auth/trusted-origins';

export async function sendInvitation(email: string, trip: { name: string; joinCode: string }, inviter: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.INVITATION_FROM_EMAIL;
  const origin = process.env.BETTER_AUTH_URL || getTrustedOrigins().find(value => value.startsWith('https://'));
  if (!key || !from || !origin) throw new Error('Email invitations are not configured yet. Share the invite link instead.');
  const url = `${new URL(origin).origin}/?join=${encodeURIComponent(trip.joinCode)}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [email], subject: `You're invited to plan ${trip.name.slice(0, 100)} on Wander`, text: `${inviter} invited you to plan ${trip.name} together.\n\nJoin: ${url}\n\nSign in or create a free Wander account, then join with board key ${trip.joinCode}.` }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('The invitation email could not be sent. Try again or share the invite link.');
}
