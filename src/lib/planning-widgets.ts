export type Flight = {
  id: string; airline: string; number: string; from: string; to: string;
  departureDate: string; departureTime: string; arrivalDate: string; arrivalTime: string;
  departureZone: string; arrivalZone: string; price: string; currency: string;
  link: string; notes: string; travelerIds: string[]; status: 'suggested' | 'booked'; reportedBy?: string; bookedTravelerIds?: string[];
};
export type PlanningTask = {
  id: string; title: string; section: string; assignee: string; due: string;
  done: boolean; completedBy: string[]; checklistId?: string;
};
export type TableColumn = { id: string; name: string; type: 'text' | 'number' | 'date' | 'checkbox' | 'member' | 'link' };
export type PlanningTable = { columns: TableColumn[]; rows: { id: string; cells: Record<string, string> }[] };
export type ChecklistGroup = { id: string; title: string };
export type PlanningWidgetFields = {
  title?: string; flights?: Flight[]; tasks?: PlanningTask[]; table?: PlanningTable;
  checklists?: ChecklistGroup[]; checklistFamilyId?: string; checklistExpanded?: boolean; checklistLayoutVersion?: number; checklistCombinedTitle?: string;
  checklistOptions?: { hideCompleted?: boolean };
  tableOptions?: { showTotals?: boolean };
  expenseBudget?: { enabled: boolean; amountCents: number };
  flightOptions?: { showDetails?: boolean; showPrices?: boolean };
};
export type PlanningMember = { id?: string; email: string; name?: string; image?: string | null };
export const memberKey = (member: PlanningMember) => member.id || member.email;
export const safeWebUrl = (value: string) => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };

export function checklistGroups(data: PlanningWidgetFields): ChecklistGroup[] {
  if (data.checklists?.length) return data.checklists;
  return [...new Set((data.tasks || []).map(task => task.section || 'Checklist'))].map(title => ({ id: `legacy:${title}`, title }));
}
export const taskGroup = (task: PlanningTask) => task.checklistId || `legacy:${task.section || 'Checklist'}`;

type ChecklistWidget = PlanningWidgetFields & { id: string; type: string; gridX: number; gridY: number; w: number; h: number };
export function splitChecklistWidgets<T extends ChecklistWidget>(widgets: T[], id: string): T[] {
  const source = widgets.find(widget => widget.id === id);
  if (!source) return widgets;
  const groups = checklistGroups(source);
  if (groups.length < 2 || source.checklistExpanded) return widgets;
  const bottom = Math.max(0, ...widgets.map(widget => widget.gridY + widget.h));
  const parts = groups.map((group, index) => ({ ...source, id: index ? crypto.randomUUID() : source.id,
    title: group.title, w: 2, h: 4, gridX: index ? (index - 1) % 3 * 2 : source.gridX,
    gridY: index ? bottom + Math.floor((index - 1) / 3) * 4 : source.gridY,
    checklists: [group], tasks: (source.tasks || []).filter(task => taskGroup(task) === group.id),
    checklistFamilyId: source.checklistFamilyId || source.id, checklistCombinedTitle: source.checklistCombinedTitle || source.title, checklistExpanded: true, checklistLayoutVersion: 2,
  } as T));
  const overlaps = (a: T, b: T) => a.gridX < b.gridX + b.w && a.gridX + a.w > b.gridX && a.gridY < b.gridY + b.h && a.gridY + a.h > b.gridY;
  const placed: T[] = [];
  for (let index = 0; index < parts.length; index++) {
    const nearby = { ...parts[index], gridX: source.gridX + index % 3 * 2, gridY: source.gridY + Math.floor(index / 3) * 4 };
    const occupied = [...widgets.filter(widget => widget.id !== source.id), ...placed];
    if (!occupied.some(widget => overlaps(nearby, widget))) parts[index] = nearby;
    placed.push(parts[index]);
  }
  return widgets.flatMap(widget => widget.id === id ? parts : [widget]);
}
export function combineChecklistWidgets<T extends ChecklistWidget>(widgets: T[], id: string): { widgets: T[]; mergedIds: string[]; targetId: string } {
  const source = widgets.find(widget => widget.id === id);
  if (!source?.checklistFamilyId) return { widgets, mergedIds: [], targetId: id };
  const parts = widgets.filter(widget => widget.type === 'checklist' && widget.checklistFamilyId === source.checklistFamilyId);
  const target = parts.find(widget => widget.id === source.checklistFamilyId) || source;
  const checklists = [...new Map(parts.flatMap(checklistGroups).map(group => [group.id, group])).values()];
  const tasks = [...new Map(parts.flatMap(widget => widget.tasks || []).map(task => [task.id, task])).values()];
  const mergedIds = parts.map(widget => widget.id);
  const combined = { ...target, title: target.checklistCombinedTitle || 'Shared checklist', checklists, tasks, checklistExpanded: false, w: 2, h: 5 };
  return { widgets: widgets.flatMap(widget => widget.id === target.id ? [combined] : mergedIds.includes(widget.id) ? [] : [widget]), mergedIds, targetId: target.id };
}

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
  if (widget.tasks) return checklistGroups(widget).map(group => group.title).join(', ') + '\n' + widget.tasks.map(task => `${task.section}: ${task.title} · ${task.done ? 'Done' : 'To do'} · ${task.assignee || 'Unassigned'} · ${task.due || 'No due date'} · Completed by: ${task.completedBy.join(', ')}`).join('\n');
  if (widget.table) return [widget.table.columns.map(column => `${column.name} (${column.type})`).join(' | '), ...widget.table.rows.map(row => widget.table!.columns.map(column => row.cells[column.id] || '').join(' | '))].join('\n');
  return '';
}
