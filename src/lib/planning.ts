export function relativeTime(timestamp: string, now = Date.now()): string {
  const time = Date.parse(timestamp);
  if (!Number.isFinite(time)) return 'Time unavailable';
  const minutes = Math.max(0, Math.floor((now - time) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return new Date(time).toLocaleDateString();
}

export function coordinates(value: string): { latitude: number; longitude: number } | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]), longitude = Number(match[2]);
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null;
}

export function avatarStyle(identity: string) {
  const colors = ['#657954', '#92744d', '#776786', '#547887', '#9b6670', '#557d73'];
  const hash = Array.from(identity).reduce((n, c) => ((n * 31 + c.charCodeAt(0)) >>> 0), 0);
  return { backgroundColor: colors[hash % colors.length], color: '#fff' };
}
