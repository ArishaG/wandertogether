// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { exportCsv, parseCsv, safeWebUrl } from './planning-widgets';
import { describeBoardChanges } from './board-notifications';

describe('planning widget data', () => {
  it('imports quoted commas, newlines, escaped quotes, and CRLF', () => {
    expect(parseCsv('Name,Notes\r\n"Room, one","Two\nlines with ""quotes"""\r\n')).toEqual([['Name', 'Notes'], ['Room, one', 'Two\nlines with "quotes"']]);
    expect(() => parseCsv('Name\n"unfinished')).toThrow();
  });
  it('exports spreadsheet-safe CSV and rejects executable links', () => {
    expect(parseCsv(exportCsv([['a,b', 'two\nlines', '=HYPERLINK("bad")']]))).toEqual([['a,b', 'two\nlines', '\'=HYPERLINK("bad")']]);
    expect(safeWebUrl('javascript:alert(1)')).toBe('');
    expect(safeWebUrl('https://example.com/flights')).toBe('https://example.com/flights');
  });
  it('records checklist and table content changes in notifications', () => {
    const task = { id: 'task', title: 'Pack', section: 'Packing', assignee: 'everyone', due: '', done: false, completedBy: [] as string[] };
    const before = { widgets: [{ id: 'list', type: 'checklist', tasks: [task] }] };
    const after = { widgets: [{ id: 'list', type: 'checklist', tasks: [{ ...task, completedBy: ['alice'] }] }] };
    expect(describeBoardChanges(before, after)[0].after).toContain('alice');
    const table = { columns: [{ id: 'cost', name: 'Cost', type: 'number' as const }], rows: [{ id: 'row', cells: { cost: '20' } }] };
    expect(describeBoardChanges({ widgets: [{ id: 'table', table }] }, { widgets: [{ id: 'table', type: 'table', table: { ...table, rows: [{ id: 'row', cells: { cost: '40' } }] } }] })[0].after).toContain('40');
  });
});
