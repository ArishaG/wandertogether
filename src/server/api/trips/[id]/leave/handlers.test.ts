// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

const mocks = vi.hoisted(() => ({
  session: { user: { id: 'alice', name: 'Alice', email: 'alice@example.com' } } as { user: { id: string; name: string; email: string } } | null,
  previewLeave: vi.fn(),
  leaveTrip: vi.fn(),
}));
vi.mock('../../../../../lib/auth/auth.js', () => ({ getAuth: () => ({ api: { getSession: async () => mocks.session } }) }));
vi.mock('../../../../leave-trip', () => {
  class NotAMemberError extends Error {}
  return { NotAMemberError, previewLeave: mocks.previewLeave, leaveTrip: mocks.leaveTrip };
});
import getHandler from './GET';
import postHandler from './POST';
import { NotAMemberError } from '../../../../leave-trip';

async function call(handler: typeof getHandler) {
  let status = 200, payload: any;
  const res = { status(code: number) { status = code; return this; }, json(value: unknown) { payload = value; return this; } };
  await handler({ params: { id: 'trip' }, headers: {} } as unknown as Request, res as Response);
  return { status, payload };
}

beforeEach(() => {
  mocks.session = { user: { id: 'alice', name: 'Alice', email: 'alice@example.com' } };
  mocks.previewLeave.mockReset();
  mocks.leaveTrip.mockReset();
});

it('requires sign-in for both preview and leave', async () => {
  mocks.session = null;
  expect((await call(getHandler)).status).toBe(401);
  expect((await call(postHandler)).status).toBe(401);
  expect(mocks.leaveTrip).not.toHaveBeenCalled();
});

it('previews what leaving will do without changing anything', async () => {
  mocks.previewLeave.mockResolvedValue({ tripName: 'Lisbon', outcome: 'leave', remainingMembers: 2, newOwner: { id: 'bob', name: 'Bob' } });
  const result = await call(getHandler);
  expect(mocks.previewLeave).toHaveBeenCalledWith('trip', 'alice');
  expect(result.payload).toMatchObject({ outcome: 'leave', newOwner: { name: 'Bob' } });
  expect(mocks.leaveTrip).not.toHaveBeenCalled();
});

it('leaves the board as the signed-in user', async () => {
  mocks.leaveTrip.mockResolvedValue({ outcome: 'delete', pendingInvitations: 1 });
  const result = await call(postHandler);
  expect(mocks.leaveTrip).toHaveBeenCalledWith('trip', expect.objectContaining({ id: 'alice' }));
  expect(result.payload).toEqual({ ok: true, outcome: 'delete', pendingInvitations: 1 });
});

it('returns 404 for a missing board and 403 for non-members', async () => {
  mocks.leaveTrip.mockResolvedValueOnce(null);
  expect((await call(postHandler)).status).toBe(404);
  mocks.previewLeave.mockRejectedValueOnce(new NotAMemberError('You are not a member of this board.'));
  const forbidden = await call(getHandler);
  expect(forbidden.status).toBe(403);
  expect(forbidden.payload.error).toContain('not a member');
});
