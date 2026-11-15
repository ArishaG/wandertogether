// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
vi.mock('../../../lib/auth/auth', () => ({ getAuth: () => ({ api: { getSession: async () => ({ user: { id: 'test-user' } }) } }) }));
import handler from './GET';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
async function request(query: Record<string, string>) {
  let status = 200, payload: any;
  const res = { status(code: number) { status = code; return this; }, json(value: unknown) { payload = value; return this; } };
  await handler({ query } as unknown as Request, res as Response);
  return { status, payload };
}
it('supports coordinates without a key', async () => {
  expect((await request({ q: '47.6,-122.3' })).payload.results[0]).toMatchObject({ latitude: 47.6, longitude: -122.3 });
});
it('reports missing configuration instead of inventing places', async () => {
  vi.stubEnv('GOOGLE_MAPS_API_KEY', ''); vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
  const result = await request({ q: 'Museum' });
  expect(result.status).toBe(503);
  expect(result.payload.error).toContain('not configured');
});
it('uses the requested destination', async () => {
  vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key');
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ places: [{ displayName: { text: 'Nearby park' }, location: { latitude: 47.7, longitude: -122.2 } }, { displayName: { text: 'London park' }, location: { latitude: 51.5, longitude: -0.1 } }] }) });
  vi.stubGlobal('fetch', fetchMock);
  const result = await request({ q: 'Parks', destination: 'Seattle' });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).textQuery).toBe('Parks in Seattle');
  expect(result.payload.results.map((place: any) => place.name)).toEqual(['Nearby park', 'London park']);
});

it('returns named activities and street addresses from Photon without a Google key', async () => {
  vi.stubEnv('GOOGLE_MAPS_API_KEY', '');
  vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
  const feature = (name: string, latitude: number) => ({
    properties: { name, street: '1st Avenue', housenumber: '1300', city: 'Seattle', osm_value: 'museum' },
    geometry: { coordinates: [-122.34, latitude] },
  });
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [feature('Seattle', 47.6)] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [feature('Seattle Art Museum', 47.61), feature('Distant museum', 48.5)] }) });
  vi.stubGlobal('fetch', fetchMock);

  const result = await request({ q: 'attractions', destination: 'Seattle, WA', mode: 'activities' });
  expect(result.status).toBe(200);
  expect(result.payload.results).toEqual([{
    name: 'Seattle Art Museum', category: 'Museum', detail: '1300 1st Avenue, Seattle', latitude: 47.61, longitude: -122.34,
  }]);
  const searchUrl = new URL(fetchMock.mock.calls[1][0]);
  expect(searchUrl.searchParams.getAll('include')).toEqual([expect.stringContaining('osm.tourism.attraction,osm.tourism.museum')]);
  expect(searchUrl.searchParams.has('bbox')).toBe(true);
});
it('searches destinations through the keyless geocoder', async () => {
  vi.stubEnv('GOOGLE_MAPS_API_KEY', ''); vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [
    { geometry: { coordinates: [-122.15, 47.53] }, properties: { name: 'Newcastle', osm_key: 'place', osm_value: 'city', county: 'King County', state: 'Washington', country: 'United States' } },
    { geometry: { coordinates: [-122.15, 47.53] }, properties: { name: 'Newcastle', osm_key: 'place', osm_value: 'town', state: 'Washington', country: 'United States' } },
    { geometry: { coordinates: [-71.5, 43.7] }, properties: { name: 'New Hampshire', osm_key: 'place', osm_value: 'state', country: 'United States' } },
  ] }) });
  vi.stubGlobal('fetch', fetchMock);
  const result = await request({ q: 'newcastle', mode: 'destination' });
  const url = new URL(fetchMock.mock.calls[0][0]);
  expect(url.searchParams.get('q')).toBe('newcastle');
  expect(url.searchParams.getAll('osm_tag')).toContain('!place:house');
  expect(result.status).toBe(200);
  expect(result.payload.results).toEqual([
    { name: 'Newcastle, Washington, United States', detail: 'City · King County', category: 'City', latitude: 47.53, longitude: -122.15 },
    { name: 'New Hampshire, United States', detail: 'State or region · United States', category: 'State or region', latitude: 43.7, longitude: -71.5 },
  ]);
});
it('reports destination search outages instead of falling back to a fixed list', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
  const result = await request({ q: 'outage test', mode: 'destination' });
  expect(result.status).toBe(502);
  expect(result.payload.error).toContain('unavailable');
});
it('retries a throttled destination search once and caches the answer', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ features: [{ properties: { name: 'Kyoto', osm_value: 'city', country: 'Japan' } }] }) });
  vi.stubGlobal('fetch', fetchMock);
  const first = await request({ q: 'kyoto', mode: 'destination' });
  const second = await request({ q: '  Kyoto ', mode: 'destination' });
  expect(first.payload.results.map((place: any) => place.name)).toEqual(['Kyoto, Japan']);
  expect(second.payload).toEqual(first.payload);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
