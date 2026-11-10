// @vitest-environment node
import { expect, it, vi } from 'vitest';
vi.mock('./db/client', () => ({ db: {} }));
import { buildInvitationEmail, createInvitationToken, effectiveStatus, hashInvitationToken } from './invitations';

it('creates unguessable URL-safe tokens and stores only a stable hash', () => {
  const a = createInvitationToken();
  const b = createInvitationToken();
  expect(a).not.toBe(b);
  expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(hashInvitationToken(a)).toMatch(/^[0-9a-f]{64}$/);
  expect(hashInvitationToken(a)).toBe(hashInvitationToken(a));
  expect(hashInvitationToken(a)).not.toBe(a);
});

it('reports pending invitations past expiry as expired', () => {
  const now = new Date('2026-11-10T00:00:00Z');
  expect(effectiveStatus({ status: 'pending', expiresAt: new Date('2026-11-11T00:00:00Z') }, now)).toBe('pending');
  expect(effectiveStatus({ status: 'pending', expiresAt: new Date('2026-11-09T00:00:00Z') }, now)).toBe('expired');
  expect(effectiveStatus({ status: 'accepted', expiresAt: new Date('2026-11-09T00:00:00Z') }, now)).toBe('accepted');
});

it('builds an email with an accept link and escapes user-controlled text', () => {
  const email = buildInvitationEmail({ inviter: 'Ana <script>', tripName: 'Tokyo & "Kyoto"', destination: 'Japan', acceptUrl: 'https://wander.example/invite/abc', expiresAt: new Date('2026-11-24T00:00:00Z') });
  expect(email.subject).toBe('Ana <script> invited you to plan Tokyo & "Kyoto" on Wander');
  expect(email.html).toContain('href="https://wander.example/invite/abc"');
  expect(email.html).toContain('Accept invitation');
  expect(email.html).toContain('Ana &lt;script&gt;');
  expect(email.html).toContain('Tokyo &amp; &quot;Kyoto&quot;');
  expect(email.html).not.toContain('<script>');
  expect(email.text).toContain('https://wander.example/invite/abc');
  expect(email.text).toContain('November 24, 2026');
});
