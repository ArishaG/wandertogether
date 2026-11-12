import { coordinates } from '../lib/planning';
import type { PlaceResult } from '../lib/use-places';

const discovery = [
  'tourism.attraction', 'tourism.museum', 'tourism.gallery', 'tourism.viewpoint',
  'tourism.zoo', 'leisure.park', 'leisure.garden', 'historic.monument',
];
const categories: Record<string, string[]> = {
  attraction: discovery,
  activity: discovery,
  'things to do': discovery,
  museum: ['tourism.museum'],
  gallery: ['tourism.gallery'],
  park: ['leisure.park', 'leisure.garden'],
  restaurant: ['amenity.restaurant'],
  food: ['amenity.restaurant', 'amenity.cafe', 'amenity.fast_food'],
  cafe: ['amenity.cafe'],
  coffee: ['amenity.cafe'],
  beach: ['natural.beach'],
  hike: ['tourism.viewpoint', 'natural.peak'],
  landmark: ['historic.monument', 'historic.memorial', 'tourism.attraction'],
};
type PhotonFeature = {
  properties?: Partial<Record<'name' | 'street' | 'housenumber' | 'city' | 'locality' | 'district' | 'state' | 'postcode' | 'country' | 'osm_value' | 'osm_key', string>>;
  geometry?: { coordinates?: [number, number] };
};
const cache = new Map<string, { expires: number; request: Promise<PhotonFeature[]> }>();

function distanceMiles(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDifference = radians(b.latitude - a.latitude);
  const longitudeDifference = radians(b.longitude - a.longitude);
  const arc = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDifference / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

async function photon(params: URLSearchParams): Promise<PhotonFeature[]> {
  const endpoint = new URL('api/', process.env.PHOTON_BASE_URL || 'https://photon.komoot.io/');
  endpoint.search = params.toString();
  const key = endpoint.href;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.request;
  if (cache.size >= 256) cache.delete(cache.keys().next().value!);
  const request = (async () => {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error('Photon lookup failed');
    const data = await response.json();
    if (!Array.isArray(data.features)) throw new Error('Invalid Photon response');
    return data.features as PhotonFeature[];
  })();
  cache.set(key, { expires: Date.now() + 10 * 60_000, request });
  try { return await request; }
  catch (error) { cache.delete(key); throw error; }
}

function pointOf(feature?: PhotonFeature) {
  const point = feature?.geometry?.coordinates;
  return point ? coordinates(`${point[1]},${point[0]}`) : null;
}

export async function searchActivities(query: string, destination: string): Promise<PlaceResult[]> {
  const category = query.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/^tourist /, '').replace(/ies$/, 'y').replace(/ches$/, 'ch').replace(/s$/, '');
  const filters = destination && Object.hasOwn(categories, category) ? categories[category] : undefined;
  const params = new URLSearchParams({ limit: '25' });
  if (filters) params.set('include', filters.map(tag => `osm.${tag}`).join(','));
  else params.set('q', query);

  let center = coordinates(destination);
  if (!center && destination) {
    const [place] = await photon(new URLSearchParams({ q: destination, limit: '1' }));
    center = pointOf(place);
    if (!center) return [];
  }
  if (center) {
    const { latitude, longitude } = center;
    const latDelta = 0.23;
    const lonDelta = latDelta / Math.max(Math.cos(latitude * Math.PI / 180), 0.05);
    params.set('lat', String(latitude));
    params.set('lon', String(longitude));
    params.set('zoom', '11');
    if (longitude - lonDelta >= -180 && longitude + lonDelta <= 180) {
      params.set('bbox', [longitude - lonDelta, Math.max(-90, latitude - latDelta), longitude + lonDelta, Math.min(90, latitude + latDelta)].join(','));
    }
  }

  const features = await photon(params);
  const results = new Map<string, PlaceResult>();
  for (const feature of features) {
    const place = feature.properties;
    const point = pointOf(feature);
    if (!place?.name?.trim() || !point || (center && distanceMiles(center, point) > 16)) continue;
    if (['place', 'boundary', 'highway'].includes(place.osm_key ?? '')) continue;
    const street = [place.housenumber, place.street].filter(Boolean).join(' ');
    const detail = [...new Set([street, place.city || place.locality || place.district, place.state, place.postcode, place.country].filter(Boolean))].join(', ');
    const name = place.name.trim();
    const key = `${name.toLowerCase()}|${detail.toLowerCase()}`;
    if (results.has(key)) continue;
    const rawCategory = (place.osm_value || 'place').replaceAll('_', ' ');
    results.set(key, { name, detail: detail || `${point.latitude}, ${point.longitude}`, category: rawCategory[0].toUpperCase() + rawCategory.slice(1), ...point });
  }
  return [...results.values()].slice(0, 20);
}
