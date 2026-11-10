import { useEffect, useState } from 'react';
export function useNearbyOrigin(enabled: boolean) {
  const [nearby, setNearby] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    if (!navigator.geolocation) { setError('Enter your starting coordinates to search nearby.'); return; }
    navigator.geolocation.getCurrentPosition(position => {
      if (active) setNearby({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    }, () => { if (active) setError('Allow location access, or enter starting coordinates to search within 400 miles.'); }, { timeout: 10000, maximumAge: 300000 });
    return () => { active = false; };
  }, [enabled]);
  return { nearby, setNearby, error };
}
