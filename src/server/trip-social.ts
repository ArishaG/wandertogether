import type { Request, Response } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { getAuth } from '../lib/auth/auth';
import { calendarDay, canPostForDay, confirmedTripDates, isTripDay, MAX_PHOTO_BYTES } from '../lib/trip-social';
import { db } from './db/client';
import { tripMembers, tripPhotos, trips, user } from './db/schema';

async function getMemberTrip(req: Request, res: Response) {
  res.set('Cache-Control', 'private, no-store');
  const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
  if (!session?.user) {
    res.status(401).json({ error: 'Sign in to open the trip album.' });
    return null;
  }

  const [trip] = await db.select({ id: trips.id, name: trips.name, state: trips.state })
    .from(trips)
    .innerJoin(tripMembers, eq(tripMembers.tripId, trips.id))
    .where(and(eq(trips.id, String(req.params.id)), eq(tripMembers.userId, session.user.id)))
    .limit(1);
  if (!trip) {
    res.status(404).json({ error: 'This trip album is unavailable to you.' });
    return null;
  }
  return { ...trip, userId: session.user.id, ...confirmedTripDates(trip.state) };
}

function photoKey(tripId: string, day: string, userId: string) {
  return and(eq(tripPhotos.tripId, tripId), eq(tripPhotos.day, day), eq(tripPhotos.userId, userId));
}

export async function getTripPhotoFeed(req: Request, res: Response) {
  const trip = await getMemberTrip(req, res);
  if (!trip) return;

  const { day } = req.query;
  if (day !== undefined && !isTripDay(day)) {
    res.status(400).json({ error: 'Choose a valid trip day.' });
    return;
  }

  const [photoDays, photos] = await Promise.all([
    db.selectDistinct({ day: tripPhotos.day }).from(tripPhotos)
      .where(eq(tripPhotos.tripId, trip.id)).orderBy(asc(tripPhotos.day)),
    day ? db.select({ authorId: tripPhotos.userId, authorName: user.name })
      .from(tripPhotos).innerJoin(user, eq(user.id, tripPhotos.userId))
      .where(and(eq(tripPhotos.tripId, trip.id), eq(tripPhotos.day, day)))
      .orderBy(asc(user.name), asc(tripPhotos.userId)) : [],
  ]);
  res.json({
    tripName: trip.name, start: trip.start, end: trip.end, day: day ?? null,
    photoDays: photoDays.map(photo => photo.day),
    photos: photos.map(photo => ({ ...photo, authorName: photo.authorName || 'Trip member' })),
  });
}

export async function getTripPhoto(req: Request, res: Response) {
  const trip = await getMemberTrip(req, res);
  if (!trip) return;

  const { day, authorId } = req.params;
  if (!isTripDay(day) || typeof authorId !== 'string') {
    res.status(400).json({ error: 'Invalid photo selection.' });
    return;
  }
  const [photo] = await db.select({ jpeg: tripPhotos.jpeg }).from(tripPhotos)
    .where(photoKey(trip.id, day, authorId)).limit(1);
  if (!photo) {
    res.status(404).json({ error: 'Photo not found.' });
    return;
  }
  res.type('image/jpeg').set('X-Content-Type-Options', 'nosniff').send(Buffer.from(photo.jpeg, 'base64'));
}

export async function putTripPhoto(req: Request, res: Response) {
  const trip = await getMemberTrip(req, res);
  if (!trip) return;

  const { day } = req.params;
  let today: string;
  try {
    const timeZone = req.query.timeZone;
    if (typeof timeZone !== 'string' || !timeZone || timeZone.length > 100) throw new RangeError();
    today = calendarDay(timeZone);
  } catch {
    res.status(400).json({ error: 'Choose a valid time zone.' });
    return;
  }
  if (!isTripDay(day) || !canPostForDay(day, trip.start, trip.end, today)) {
    res.status(400).json({ error: 'Photos can be added for confirmed trip days that have started.' });
    return;
  }

  const bytes: unknown = req.body;
  if (!Buffer.isBuffer(bytes) || bytes.length < 5 || bytes.length > MAX_PHOTO_BYTES ||
    bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff ||
    bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
    res.status(400).json({ error: 'Upload a valid JPEG photo within the size limit.' });
    return;
  }
  const jpeg = bytes.toString('base64');
  await db.insert(tripPhotos).values({ tripId: trip.id, day, userId: trip.userId, jpeg })
    .onConflictDoUpdate({ target: [tripPhotos.tripId, tripPhotos.day, tripPhotos.userId], set: { jpeg } });
  res.status(204).end();
}

export async function deleteTripPhoto(req: Request, res: Response) {
  const trip = await getMemberTrip(req, res);
  if (!trip) return;
  const { day } = req.params;
  if (!isTripDay(day)) {
    res.status(400).json({ error: 'Choose a valid trip day.' });
    return;
  }
  await db.delete(tripPhotos).where(photoKey(trip.id, day, trip.userId));
  res.status(204).end();
}
