import { useEffect, useState } from 'react';
export type PlaceResult = { name: string; detail: string; category: string; latitude?: number; longitude?: number };
export function usePlaces(query: string, destination = '', nearby?: { latitude: number; longitude: number } | null) {
  const [state, setState] = useState<{ results: PlaceResult[]; loading: boolean; error: string }>({ results: [], loading: false, error: '' });
  useEffect(() => {
    if (!query.trim()) { setState({ results: [], loading: false, error: '' }); return; }
    const controller = new AbortController();
    setState({ results: [], loading: true, error: '' });
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, destination });
        if (nearby) { params.set('lat', String(nearby.latitude)); params.set('lng', String(nearby.longitude)); }
        const response = await fetch(`/api/places?${params}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Place search is unavailable.');
        setState({ results: payload.results || [], loading: false, error: '' });
      } catch (error) {
        if (!controller.signal.aborted) setState({ results: [], loading: false, error: error instanceof Error ? error.message : 'Search failed.' });
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, destination, nearby?.latitude, nearby?.longitude]);
  return state;
}
