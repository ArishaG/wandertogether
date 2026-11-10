// @vitest-environment node
import { expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
const fixture = vi.hoisted(() => ({ session: null as null | { user: { id: string; email: string } }, rows: [] as unknown[] }));
vi.mock('../../../../lib/auth/auth', () => ({ getAuth: () => ({ api: { getSession: async () => fixture.session } }) }));
const chain = (): unknown => new Proxy(() => {}, { get: (_t, key) => key === 'limit' ? async () => fixture.rows : chain, apply: () => chain() });
vi.mock('../../../db/client', () => ({ db: { select: () => chain() } }));
import previewHandler from './GET';
import acceptHandler from './accept/POST';

async function call(handler: (req: Request, res: Response) => unknown, token: string) {
  let status = 200, payload: any;
  const res = { status(code: number) { status = code; return this; }, json(value: unknown) { payload = value; return this; } };
  await handler({ params: { token }, headers: {} } as unknown as Request, res as unknown as Response);
  return { status, payload };
}
const token = 'a'.repeat(43);

it('rejects malformed or unknown invitation tokens', async () => {
  fixture.rows = [];
  expect((await call(previewHandler, 'bad token')).status).toBe(404);
  expect((await call(previewHandler, token)).status).toBe(404);
});

it('previews an invitation and reports expiry', async () => {
  fixture.rows = [{ status: 'pending', expiresAt: new Date(Date.now() - 1000), email: 'b@example.com', tripName: 'Lisbon', destination: 'Portugal', inviterName: 'Ana', inviterEmail: 'a@example.com' }];
  const { status, payload } = await call(previewHandler, token);
  expect(status).toBe(200);
  expect(payload.invitation).toMatchObject({ status: 'expired', tripName: 'Lisbon', inviterName: 'Ana' });
});

it('requires sign-in to accept, and refuses used or expired invitations', async () => {
  fixture.session = null;
  expect((await call(acceptHandler, token)).status).toBe(401);
  fixture.session = { user: { id: 'u2', email: 'b@example.com' } };
  fixture.rows = [{ id: 'i1', tripId: 't1', status: 'accepted', acceptedBy: 'someone-else', expiresAt: new Date(Date.now() + 1e6) }];
  expect((await call(acceptHandler, token)).status).toBe(410);
  fixture.rows = [{ id: 'i1', tripId: 't1', status: 'pending', acceptedBy: null, expiresAt: new Date(Date.now() - 1000) }];
  const expired = await call(acceptHandler, token);
  expect(expired.status).toBe(410);
  expect(expired.payload.status).toBe('expired');
});
