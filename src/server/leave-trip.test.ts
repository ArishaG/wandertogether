// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
vi.mock('./db/client', () => ({ db: {} }));
import { planLeave } from './leave-trip';

const member = (userId: string, name: string, joinedAt: string | null) => ({ userId, name, joinedAt: joinedAt ? new Date(joinedAt) : null });
const alice = member('alice', 'Alice', '2026-11-01T00:00:00Z');
const bob = member('bob', 'Bob', '2026-11-03T00:00:00Z');
const cara = member('cara', 'Cara', '2026-11-02T00:00:00Z');

describe('planLeave', () => {
  it('deletes the board when the last member leaves and reports pending invitations', () => {
    expect(planLeave({ userId: 'alice', ownerId: 'alice', members: [alice], pendingInvitations: 2 }))
      .toEqual({ outcome: 'delete', pendingInvitations: 2 });
  });

  it('deletes the board when a non-owner is the only member left', () => {
    expect(planLeave({ userId: 'bob', ownerId: 'alice', members: [bob], pendingInvitations: 0 }))
      .toEqual({ outcome: 'delete', pendingInvitations: 0 });
  });

  it('lets a member leave without changing the owner', () => {
    expect(planLeave({ userId: 'bob', ownerId: 'alice', members: [alice, bob, cara], pendingInvitations: 1 }))
      .toEqual({ outcome: 'leave', remainingMembers: 2, newOwner: null });
  });

  it('hands ownership to the earliest-joined remaining member when the owner leaves', () => {
    expect(planLeave({ userId: 'alice', ownerId: 'alice', members: [alice, bob, cara], pendingInvitations: 0 }))
      .toEqual({ outcome: 'leave', remainingMembers: 2, newOwner: { id: 'cara', name: 'Cara' } });
  });

  it('prefers members with a known join date over ones without', () => {
    const legacy = member('dan', 'Dan', null);
    expect(planLeave({ userId: 'alice', ownerId: 'alice', members: [alice, legacy, bob], pendingInvitations: 0 }))
      .toMatchObject({ newOwner: { id: 'bob' } });
  });
});
