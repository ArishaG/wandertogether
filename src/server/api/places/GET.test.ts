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
