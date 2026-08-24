import type { Request, Response } from 'express';

type Activity = { id?: string; name: string; category?: string; detail?: string };
type ItineraryDay = { dayIndex: number; date: string; entries: { id: string; time: string; title: string; cost: string | null; status: string }[] };

function isDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function preferredTime(activity: Activity, position: number): string {
  const text = `${activity.name} ${activity.category ?? ''} ${activity.detail ?? ''}`.toLowerCase();
  if (/(dinner|restaurant|bar|nightlife|cocktail|show|theater|theatre)/.test(text)) return '6:30 PM';
  if (/(breakfast|brunch|coffee|bakery)/.test(text)) return '9:00 AM';
  if (/(museum|gallery|market|shopping|tour|landmark|park|garden|beach|hike)/.test(text)) return position % 2 === 0 ? '10:00 AM' : '2:00 PM';
  return ['10:00 AM', '1:00 PM', '4:00 PM', '7:00 PM'][position % 4];
}

function buildItinerary(start: string, end: string, activities: Activity[]): ItineraryDay[] {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const days: ItineraryDay[] = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    days.push({ dayIndex: days.length, date: cursor.toISOString().slice(0, 10), entries: [] });
    cursor.setDate(cursor.getDate() + 1);
  }

  activities.forEach((activity, index) => {
    const day = days[index % days.length];
    day.entries.push({ id: crypto.randomUUID(), time: preferredTime(activity, day.entries.length), title: activity.name, cost: null, status: 'planned' });
  });

  return days;
}

export default async function handler(req: Request, res: Response) {
  const { destination, start, end, activities } = req.body ?? {};
  if (typeof destination !== 'string' || !destination.trim() || !isDate(start) || !isDate(end) || !Array.isArray(activities) || activities.length === 0) {
    res.status(400).json({ error: 'Destination, confirmed dates, and at least one activity are required.' });
    return;
  }

  const safeActivities: Activity[] = activities
    .filter((activity: unknown): activity is Activity => Boolean(activity) && typeof (activity as Activity).name === 'string')
    .slice(0, 40)
    .map((activity) => ({ name: activity.name.slice(0, 160), category: activity.category?.slice(0, 80), detail: activity.detail?.slice(0, 240) }));

  if (!safeActivities.length) {
    res.status(400).json({ error: 'At least one valid activity is required.' });
    return;
  }

  res.status(200).json({ itinerary: buildItinerary(start, end, safeActivities), source: 'planned' });
}
