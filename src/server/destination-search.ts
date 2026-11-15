// Destination search ("Where are you headed?") backed by Photon, a free
// OpenStreetMap geocoder that needs no API key: https://photon.komoot.io
// Only places someone would travel to are requested: settlements, regions,
// countries, islands, parks and natural features — not shops or buildings.

// Same setting as activity-search.ts, so one self-hosted Photon serves both.
const photonUrl = () => new URL('api/', process.env.PHOTON_BASE_URL || 'https://photon.komoot.io/');

const NATURAL_FEATURES = ['peak', 'volcano', 'valley', 'water', 'bay', 'beach', 'glacier', 'cape', 'peninsula', 'island', 'reef', 'hot_spring', 'canyon', 'desert'];
const INCLUDE_TAGS = ['place', 'boundary:national_park', 'boundary:protected_area', 'boundary:administrative', 'leisure:nature_reserve', ...NATURAL_FEATURES.map(value => `natural:${value}`)];
const EXCLUDE_TAGS = ['place:house', 'place:farm', 'place:isolated_dwelling', 'place:plot', 'place:allotments', 'place:neighbourhood', 'place:city_block', 'place:square'];

const CATEGORY_LABELS: Record<string, string> = {
  nature_reserve: 'Nature reserve',
  national_park: 'National park',
  protected_area: 'Protected area',
  administrative: 'Region',
  state: 'State or region',
  province: 'Province',
  peak: 'Mountain',
  water: 'Lake',
};

export type DestinationResult = { name: string; detail: string; category: string; latitude?: number; longitude?: number };

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: { name?: string; osm_key?: string; osm_value?: string; county?: string; state?: string; country?: string };
};

const categoryLabel = (value = '') => CATEGORY_LABELS[value] || (value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ') : 'Place');

export function toDestination(feature: PhotonFeature): DestinationResult | null {
  const props = feature.properties || {};
  if (!props.name) return null;
  // "Newcastle, Washington, United States" — skip parts that repeat the name.
  const name = [props.name, props.state, props.country].filter((part, index, parts) => part && parts.indexOf(part) === index).join(', ');
  const category = categoryLabel(props.osm_value);
  const area = [props.county, props.state, props.country].find(part => part && part !== props.name);
  const [longitude, latitude] = feature.geometry?.coordinates || [];
  return {
    name,
    detail: area ? `${category} · ${area}` : category,
    category,
    ...(typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : {}),
  };
}

// The public Photon server throttles bursts, and every user's searches leave
// from the same few server IPs, so cache recent answers and retry once.
const CACHE_LIMIT = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; results: DestinationResult[] }>();
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPhoton(params: URLSearchParams) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`${photonUrl()}?${params}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Wander trip planner' },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok || attempt > 0 || ![429, 502, 503, 504].includes(response.status)) return response;
    await wait(600);
  }
}

export async function searchDestinations(query: string, limit = 8): Promise<DestinationResult[]> {
  const key = `${query.trim().toLowerCase().replace(/\s+/g, ' ')}|${limit}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.results;
  const params = new URLSearchParams({ q: query, limit: String(limit * 2), lang: 'en' });
  [...INCLUDE_TAGS, ...EXCLUDE_TAGS.map(tag => `!${tag}`)].forEach(tag => params.append('osm_tag', tag));
  const response = await fetchPhoton(params);
  if (!response.ok) throw new Error(`Destination search failed with ${response.status}`);
  const data = (await response.json()) as { features?: PhotonFeature[] };
  const seen = new Set<string>();
  const results: DestinationResult[] = [];
  for (const feature of data.features || []) {
    const result = toDestination(feature);
    if (!result || seen.has(result.name.toLowerCase())) continue;
    seen.add(result.name.toLowerCase());
    results.push(result);
    if (results.length === limit) break;
  }
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, { at: Date.now(), results });
  return results;
}
