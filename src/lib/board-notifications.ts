export type BoardChange = {
  key: string;
  label: string;
  before: string;
  after: string;
};

export type BoardNotification = {
  id?: string;
  actorId?: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  changes?: BoardChange[];
};

type PollOption = { label?: string; votes?: number; voterIds?: string[]; voters?: { name: string }[] };
type TrackedWidget = {
  id: string; type?: string; title?: string; body?: string; noteColor?: string;
  gridX?: number; gridY?: number; w?: number; h?: number; multiSelect?: boolean; options?: PollOption[];
};
type SavedPlace = { id: string; name?: string; detail?: string; category?: string; dayIndex?: number | null };
type ItineraryDay = { date: string; entries: { title: string; time?: string; cost?: string | null; status?: string; duration?: number }[] };
export type BoardSnapshot = {
  name?: string;
  destination?: string | null;
  availability?: { start?: string | null; end?: string | null; status?: string; proposedDays?: string[] };
  members?: { id?: string; name?: string; email?: string; availability?: string[]; hasSubmittedAvailability?: boolean }[];
  widgets?: TrackedWidget[];
  locations?: SavedPlace[];
  itinerary?: ItineraryDay[];
  links?: { id: string; fromId: string; toId: string }[];
  notifications?: BoardNotification[];
};

const text = (value: unknown) => value === null || value === undefined || value === '' ? 'None' : String(value);
const dates = (days: string[] = []) => [...new Set(days)].sort().join(', ') || 'None';
const widgetName = (widget: TrackedWidget) => widget.title || (widget.type === 'vote' ? widget.body : '') || widget.type || 'Widget';
const placeText = (place: SavedPlace) => [place.name, place.detail, place.category, place.dayIndex == null ? '' : `Day ${place.dayIndex + 1}`].filter(Boolean).join('\n');
const widgetText = (widget: TrackedWidget) => [widget.title, widget.body, ...(widget.options || []).map(option => option.label)].filter(Boolean).join('\n') || widgetName(widget);
const itineraryText = (days: ItineraryDay[] = []) => days.map(day => [
  day.date,
  ...day.entries.map(entry => [entry.time, entry.title, entry.cost, entry.status, entry.duration ? `${entry.duration} hours` : ''].filter(Boolean).join(' · ')),
].join('\n')).join('\n\n') || 'None';

export function describeBoardChanges(before: BoardSnapshot, after: BoardSnapshot): BoardChange[] {
  const changes: BoardChange[] = [];
  const add = (key: string, label: string, oldValue: unknown, newValue: unknown) => {
    const oldText = text(oldValue), newText = text(newValue);
    if (oldText !== newText) changes.push({ key, label, before: oldText, after: newText });
  };
  add('name', 'Trip name', before.name, after.name);
  add('destination', 'Destination', before.destination, after.destination);
  add('date-start', 'Trip start date', before.availability?.start, after.availability?.start);
  add('date-end', 'Trip end date', before.availability?.end, after.availability?.end);
  add('date-status', 'Trip date confirmation', before.availability?.status, after.availability?.status);

  for (const member of after.members || []) {
    const previous = before.members?.find(person => person.id === member.id);
    // Joining has its own notification. Profile refreshes do not change availability.
    if (previous) add(`availability:${member.id}`, `${member.name || member.email || 'Member'}'s availability`, dates(previous.availability), dates(member.availability));
  }

  const oldWidgets = new Map((before.widgets || []).map(widget => [widget.id, widget]));
  const newWidgets = new Map((after.widgets || []).map(widget => [widget.id, widget]));
  for (const [id, widget] of newWidgets) {
    const previous = oldWidgets.get(id);
    const name = widgetName(widget);
    if (!previous) { add(`widget:${id}`, `Added ${name}`, '', widgetText(widget)); continue; }
    add(`widget:${id}:title`, `${name} title`, previous.title, widget.title);
    add(`widget:${id}:body`, `${name} text`, previous.body, widget.body);
    add(`widget:${id}:color`, `${name} color`, previous.noteColor, widget.noteColor);
    add(`widget:${id}:position`, `Moved ${name}`, `Column ${(previous.gridX || 0) + 1}, row ${(previous.gridY || 0) + 1}`, `Column ${(widget.gridX || 0) + 1}, row ${(widget.gridY || 0) + 1}`);
    add(`widget:${id}:size`, `Resized ${name}`, `${previous.w} × ${previous.h}`, `${widget.w} × ${widget.h}`);
    if (widget.type === 'vote') {
      add(`widget:${id}:options`, `${name} poll options`, (previous.options || []).map(option => option.label).join('\n'), (widget.options || []).map(option => option.label).join('\n'));
      add(`widget:${id}:multiple`, `${name} multiple choices`, previous.multiSelect ? 'Allowed' : 'Not allowed', widget.multiSelect ? 'Allowed' : 'Not allowed');
      const votes = (options: PollOption[] = []) => options.map(option => {
        const voters = option.voters?.length ? option.voters.map(voter => voter.name).sort()
          : option.voterIds?.map(id => after.members?.find(member => member.id === id)?.name || before.members?.find(member => member.id === id)?.name || 'Member').sort();
        return `${option.label}: ${option.votes || 0} vote${option.votes === 1 ? '' : 's'}${voters?.length ? ` (${voters.join(', ')})` : ''}`;
      }).join('\n');
      // Option text changes are already listed above. Compare votes only for existing options.
      if (JSON.stringify(previous.options?.map(option => option.label)) === JSON.stringify(widget.options?.map(option => option.label))) {
        add(`widget:${id}:votes`, `${name} votes`, votes(previous.options), votes(widget.options));
      }
    }
  }
  for (const [id, widget] of oldWidgets) if (!newWidgets.has(id)) add(`widget:${id}`, `Removed ${widgetName(widget)}`, widgetText(widget), '');

  const oldPlaces = new Map((before.locations || []).map(place => [place.id, place]));
  const newPlaces = new Map((after.locations || []).map(place => [place.id, place]));
  for (const [id, place] of newPlaces) {
    const previous = oldPlaces.get(id);
    add(`place:${id}`, previous ? `Updated ${place.name || 'activity'}` : `Saved ${place.name || 'activity'}`, previous ? placeText(previous) : '', placeText(place));
  }
  for (const [id, place] of oldPlaces) if (!newPlaces.has(id)) add(`place:${id}`, `Removed ${place.name || 'activity'}`, placeText(place), '');

  add('itinerary', 'Itinerary', itineraryText(before.itinerary), itineraryText(after.itinerary));
  const oldLinks = new Map((before.links || []).map(link => [link.id, link]));
  const newLinks = new Map((after.links || []).map(link => [link.id, link]));
  const linkText = (link: { fromId: string; toId: string }) => [link.fromId, link.toId].map(id => {
    const widget = newWidgets.get(id) || oldWidgets.get(id);
    return widget ? widgetName(widget) : 'Removed widget';
  }).join(' → ');
  for (const [id, link] of newLinks) if (!oldLinks.has(id)) add(`link:${id}`, 'Connected widgets', '', linkText(link));
  for (const [id, link] of oldLinks) if (!newLinks.has(id)) add(`link:${id}`, 'Disconnected widgets', linkText(link), '');
  return changes;
}

export function recordBoardChanges(
  history: BoardNotification[],
  changes: BoardChange[],
  actor: { id: string; name: string },
  now = new Date(),
): BoardNotification[] {
  if (!changes.length) return history;
  const last = history.at(-1);
  // Batch consecutive autosaves from the same person while they are editing.
  if (last?.changes?.length && last.actorId === actor.id && last.action === 'updated'
    && changes.length === last.changes.length && changes.every(change => last.changes!.some(previous => previous.key === change.key))
    && now.getTime() - Date.parse(last.timestamp) >= 0 && now.getTime() - Date.parse(last.timestamp) < 10_000) {
    const combined = new Map(last.changes.map(change => [change.key, change]));
    for (const change of changes) {
      const previous = combined.get(change.key);
      combined.set(change.key, { ...change, before: previous?.before ?? change.before });
    }
    const details = [...combined.values()].filter(change => change.before !== change.after);
    if (!details.length) return history.slice(0, -1);
    return [...history.slice(0, -1), { ...last, actor: actor.name, timestamp: now.toISOString(), changes: details }];
  }
  return [...history, {
    id: crypto.randomUUID(), actorId: actor.id, actor: actor.name,
    action: 'updated', target: 'the board', timestamp: now.toISOString(), changes,
  }];
}
