export type Flight = {
  id: string; airline: string; number: string; from: string; to: string;
  departureDate: string; departureTime: string; arrivalDate: string; arrivalTime: string;
  departureZone: string; arrivalZone: string; price: string; currency: string;
  link: string; notes: string; travelerIds: string[]; status: 'suggested' | 'booked'; reportedBy?: string; bookedTravelerIds?: string[];
};
export type PlanningTask = {
  id: string; title: string; section: string; assignee: string; due: string;
  done: boolean; completedBy: string[];
};
export type TableColumn = { id: string; name: string; type: 'text' | 'number' | 'date' | 'checkbox' | 'member' | 'link' };
export type PlanningTable = { columns: TableColumn[]; rows: { id: string; cells: Record<string, string> }[] };
export type PlanningWidgetFields = { title?: string; flights?: Flight[]; tasks?: PlanningTask[]; table?: PlanningTable };
export type PlanningMember = { id?: string; email: string; name?: string };
export const memberKey = (member: PlanningMember) => member.id || member.email;
export const safeWebUrl = (value: string) => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };

export function parseCsv(input: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(cell); cell = '';
      if (char !== ',') { if (char === '\r' && input[i + 1] === '\n') i++; rows.push(row); row = []; }
    } else cell += char;
  }
  if (quoted) throw new Error('A quoted CSV cell is not closed.');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(values => values.some(value => value.trim()));
}
export function exportCsv(rows: string[][]) {
  // Prevent formulas from executing when the exported data is opened in a spreadsheet.
  return rows.map(row => row.map(value => `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
}
export function planningDetails(widget: PlanningWidgetFields): string {
  if (widget.flights) return widget.flights.map(flight => `${flight.airline} ${flight.number}: ${flight.from} → ${flight.to}\n${flight.departureDate} ${flight.departureTime} ${flight.departureZone} → ${flight.arrivalDate} ${flight.arrivalTime} ${flight.arrivalZone}\n${flight.price} ${flight.currency} · ${flight.status} · Booked travelers: ${(flight.bookedTravelerIds || []).join(', ')}${flight.reportedBy ? ` (reported by ${flight.reportedBy})` : ''}\nTravelers: ${flight.travelerIds.join(', ')}\n${flight.link}\n${flight.notes}`).join('\n\n');
  if (widget.tasks) return widget.tasks.map(task => `${task.section}: ${task.title} · ${task.done ? 'Done' : 'To do'} · ${task.assignee || 'Unassigned'} · ${task.due || 'No due date'} · Completed by: ${task.completedBy.join(', ')}`).join('\n');
  if (widget.table) return [widget.table.columns.map(column => `${column.name} (${column.type})`).join(' | '), ...widget.table.rows.map(row => widget.table!.columns.map(column => row.cells[column.id] || '').join(' | '))].join('\n');
  return '';
}
