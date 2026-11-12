// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import type { BoardSnapshot } from '../../../../lib/board-notifications';

const fixture = vi.hoisted(() => ({
  stored: { id: 'trip', name: 'Trip', destination: 'Seattle', joinCode: 'ABC123', state: {} as BoardSnapshot },
}));
vi.mock('../../../../lib/auth/auth.js', () => ({ getAuth: () => ({ api: { getSession: async () => ({ user: { id: 'alice', name: 'Alice', email: 'alice@example.com' } }) } }) }));
vi.mock('../../../db/client.js', async () => {
  const { trips } = await import('../../../db/schema.js');
  const tx = {
    select: () => ({ from: (table: unknown) => table === trips
      ? { where: () => ({ for: async () => [fixture.stored] }) }
      : { leftJoin: () => ({ where: async () => [{ userId: 'alice', role: 'owner', accountName: 'Alice', email: 'alice@example.com' }] }) } }),
    update: () => ({ set: (values: typeof fixture.stored) => ({ where: async () => { fixture.stored = { ...fixture.stored, ...values }; } }) }),
  };
  return { db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 'membership' }] }) }) }),
    transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
  } };
});
import handler from './PUT';

beforeEach(() => {
  fixture.stored = {
    id: 'trip', name: 'Trip', destination: 'Seattle', joinCode: 'ABC123',
    state: {
      name: 'Trip', destination: 'Seattle', members: [{ id: 'alice', name: 'Alice', availability: [] }],
      widgets: [{ id: 'note', type: 'note', title: 'Packing', body: 'Coat' }],
      notifications: [{ actor: 'Bob', action: 'created', target: 'the trip', timestamp: '2026-11-01T00:00:00Z' }],
    },
  };
});
async function save(state: BoardSnapshot) {
  let status = 200, payload: any;
  const res = { status(code: number) { status = code; return this; }, json(value: unknown) { payload = value; return this; } };
  await handler({ params: { id: 'trip' }, headers: {}, body: { name: 'Trip', destination: 'Seattle', state } } as unknown as Request, res as Response);
  return { status, payload };
}
it('attributes the real change to the signed-in user and ignores client-supplied history', async () => {
  const state = structuredClone(fixture.stored.state);
  state.widgets![0].body = 'Coat and umbrella';
  state.notifications = [{ actor: 'Someone else', action: 'updated', target: 'the board', timestamp: '2099-01-01' }];
  const result = await save(state);
  expect(result.status).toBe(200);
  const events = result.payload.trip.notifications;
  expect(events).toHaveLength(2);
  expect(events[0].actor).toBe('Bob');
  expect(events[1]).toMatchObject({ actorId: 'alice', actor: 'Alice', changes: [expect.objectContaining({ before: 'Coat', after: 'Coat and umbrella' })] });
  await save(state);
  expect(fixture.stored.state.notifications).toHaveLength(2);
});
it('does not generate an update for a save with no tracked changes', async () => {
  const result = await save(structuredClone(fixture.stored.state));
  expect(result.status).toBe(200);
  expect(result.payload.trip.notifications).toHaveLength(1);
});
