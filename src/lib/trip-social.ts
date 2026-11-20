export const MAX_PHOTO_BYTES = 350 * 1024;

export type TripPhoto = { authorId: string; authorName: string };
export type TripPhotoFeed = {
  tripName: string;
  start: string | null;
  end: string | null;
  day: string | null;
  photoDays: string[];
  photos: TripPhoto[];
};

export function isTripDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function calendarDay(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}

export function confirmedTripDates(state: unknown) {
  const dates = (state as { availability?: { status?: unknown; start?: unknown; end?: unknown } } | null)?.availability;
  if (dates?.status === 'confirmed' && isTripDay(dates.start) && isTripDay(dates.end) && dates.start <= dates.end) {
    return { start: dates.start, end: dates.end };
  }
  return { start: null, end: null };
}

export function canPostForDay(day: string, start: string | null, end: string | null, today: string) {
  return start !== null && end !== null && day >= start && day <= end && day <= today;
}
