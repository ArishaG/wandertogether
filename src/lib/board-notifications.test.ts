// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { describeBoardChanges, recordBoardChanges, type BoardSnapshot } from './board-notifications';

const base: BoardSnapshot = {
  name: 'Weekend away', destination: 'Seattle',
  availability: { start: '2026-11-20', end: '2026-11-22', status: 'confirmed' },
  members: [{ id: 'alice', name: 'Alice', availability: ['2026-11-20'] }],
  widgets: [{ id: 'note', type: 'note', title: 'Packing', body: 'Bring a coat', gridX: 0, gridY: 0, w: 2, h: 2 }],
  locations: [], itinerary: [], links: [],
};

describe('accurate board notifications', () => {
  it('ignores no-op saves, history edits, reordered availability, and metadata refreshes', () => {
    const changed = structuredClone(base);
    changed.members![0].availability = ['2026-11-20', '2026-11-20'];
    changed.members![0].name = 'New display name';
    changed.notifications = [{ actor: 'Forged', action: 'updated', target: 'the board', timestamp: 'invalid' }];
    expect(describeBoardChanges(base, changed)).toEqual([]);
  });

  it('captures exact before/after text and widget moves separately', () => {
    const changed = structuredClone(base);
    changed.widgets![0].body = 'Bring a coat and umbrella';
    changed.widgets![0].gridX = 2;
    const changes = describeBoardChanges(base, changed);
    expect(changes).toContainEqual({ key: 'widget:note:body', label: 'Packing text', before: 'Bring a coat', after: 'Bring a coat and umbrella' });
    expect(changes.find(change => change.key === 'widget:note:position')?.after).toBe('Column 3, row 1');
  });

  it('records availability, confirmed dates, and specific saved activity addresses', () => {
    const changed = structuredClone(base);
    changed.availability!.end = '2026-11-23';
    changed.members![0].availability = ['2026-11-21'];
    changed.locations = [{ id: 'museum', name: 'Seattle Art Museum', detail: '1300 1st Avenue', category: 'Museum' }];
    const changes = describeBoardChanges(base, changed);
    expect(changes.find(change => change.key === 'date-end')?.after).toBe('2026-11-23');
    expect(changes.find(change => change.key === 'availability:alice')).toMatchObject({ before: '2026-11-20', after: '2026-11-21' });
    expect(changes.find(change => change.key === 'place:museum')?.after).toContain('1300 1st Avenue');
  });

  it('records poll votes and itinerary times', () => {
    const previous = { ...base, widgets: [{ id: 'poll', type: 'vote', body: 'Lunch?', options: [{ label: 'Cafe', votes: 0 }] }] };
    const changed = structuredClone(previous);
    changed.widgets[0].options[0].votes = 1;
    const changes = describeBoardChanges(previous, { ...changed, itinerary: [{ date: '2026-11-20', entries: [{ title: 'Lunch at the cafe', time: '12:30 PM' }] }] });
    expect(changes.find(change => change.key === 'widget:poll:votes')?.after).toBe('Cafe: 1 vote');
    expect(changes.find(change => change.key === 'itinerary')?.after).toContain('12:30 PM');
  });

  it('preserves old events and batches consecutive typing with the original before value', () => {
    const original = [{ actor: 'Bob', action: 'created', target: 'the trip', timestamp: '2026-11-01T10:00:00Z' }];
    const first = recordBoardChanges(original, [{ key: 'note', label: 'Note text', before: 'A', after: 'AB' }], { id: 'alice', name: 'Alice' }, new Date('2026-11-01T11:00:00Z'));
    const next = recordBoardChanges(first, [{ key: 'note', label: 'Note text', before: 'AB', after: 'ABC' }], { id: 'alice', name: 'Alice' }, new Date('2026-11-01T11:00:01Z'));
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual(original[0]);
    expect(next[1].changes?.[0]).toMatchObject({ before: 'A', after: 'ABC' });
    expect(recordBoardChanges(next, [], { id: 'alice', name: 'Alice' })).toBe(next);
    expect(recordBoardChanges(next, [{ key: 'note', label: 'Note text', before: 'ABC', after: 'ABCD' }], { id: 'bob', name: 'Bob' }, new Date('2026-11-01T11:00:02Z'))).toHaveLength(3);
  });
});
