// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ records: [] as { userId: string; preferences: { blockedEmails: string[] } }[] }));
vi.mock('./db/client', () => ({ db: { select: () => ({ from: () => ({ where: async () => fixture.records }) }) } }));
import { isBlockedBetween } from './blocked-accounts';
const alice = { id: 'alice', email: 'alice@example.com' };
const bob = { id: 'bob', email: 'bob@example.com' };
beforeEach(() => { fixture.records = []; });
it('allows accounts without a block and ignores self membership', async () => {
  expect(await isBlockedBetween([bob, alice], alice)).toBe(false);
});
it('honors the joining or inviting account block list', async () => {
  fixture.records = [{ userId: 'alice', preferences: { blockedEmails: ['bob@example.com'] } }];
  expect(await isBlockedBetween([bob], alice)).toBe(true);
});
it('honors the other account block list', async () => {
  fixture.records = [{ userId: 'bob', preferences: { blockedEmails: ['alice@example.com'] } }];
  expect(await isBlockedBetween([bob], alice)).toBe(true);
});
