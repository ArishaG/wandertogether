// @vitest-environment node
import { expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
const fixture = vi.hoisted(() => ({ publicProfile: false }));
vi.mock('../../db/client', () => ({ db: { select: () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => [{ name: 'Alice', image: 'https://example.com/avatar.jpg', preferences: { publicProfile: fixture.publicProfile, phone: 'private', blockedEmails: ['private@example.com'] } }] }) }) }) }) } }));
import handler from './GET';
async function request() {
  let status = 200, payload: any;
  const res = { setHeader: vi.fn(), status(code: number) { status = code; return this; }, json(value: unknown) { payload = value; return this; } };
  await handler({ params: { id: 'alice' } } as unknown as Request, res as unknown as Response);
  return { status, payload };
}
it('hides private profiles and exposes only name and image when public', async () => {
  fixture.publicProfile = false;
  expect((await request()).status).toBe(404);
  fixture.publicProfile = true;
  expect((await request()).payload).toEqual({ name: 'Alice', image: 'https://example.com/avatar.jpg' });
});
