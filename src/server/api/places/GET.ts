import type { Request, Response } from 'express';
import { coordinates } from '../../../lib/planning';
import { getAuth } from '../../../lib/auth/auth';

export default async function handler(req: Request, res: Response) {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 160) : '';
  if (!query) return res.json({ results: [] });
  const point = coordinates(query);
  if (/^-?[\d.]+\s*,\s*-?[\d.]+$/.test(query) && !point) return res.status(400).json({ error: 'Latitude must be between -90 and 90, and longitude between -180 and 180.' });
  if (point) return res.json({ results: [{ name: query, detail: 'Coordinates', category: 'Place', ...point }] });
  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return res.status(503).json({ error: 'Live place search is not configured. You can enter latitude, longitude instead.' });
  const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
  if (!session?.user) return res.status(401).json({ error: 'Sign in to search places.' });
  try {
    const destination = typeof req.query.destination === 'string' ? req.query.destination.slice(0, 160) : '';
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.primaryTypeDisplayName,places.location' },
      body: JSON.stringify({ textQuery: destination ? `${query} in ${destination}` : query, pageSize: 20 }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return res.status(502).json({ error: 'Place search is unavailable. Please try again later or enter coordinates.' });
    const data = await response.json();
    type GooglePlace = { displayName?: { text: string }; formattedAddress?: string; primaryTypeDisplayName?: { text: string }; location?: { latitude: number; longitude: number } };
    const results = ((data.places || []) as GooglePlace[]).filter(place => place.displayName).map(place => ({ name: place.displayName!.text, detail: place.formattedAddress || '', category: place.primaryTypeDisplayName?.text || 'Place', ...place.location }));
    res.json({ results });
  } catch { res.status(502).json({ error: 'Place search timed out. Please try again.' }); }
}
