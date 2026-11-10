// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { avatarStyle, coordinates, relativeTime } from './planning';
import { connectionRoute } from './connection-route';

describe('planning report regressions', () => {
  it('renders actual elapsed time without fabricating legacy timestamps', () => {
    expect(relativeTime('2026-10-01T12:00:00Z', Date.parse('2026-10-01T14:00:00Z'))).toBe('2h ago');
    expect(relativeTime('Just now')).toBe('Time unavailable');
  });
  it('validates coordinates', () => {
    expect(coordinates('47.6062, -122.3321')).toEqual({ latitude: 47.6062, longitude: -122.3321 });
    expect(coordinates('91, 180')).toBeNull();
  });
  it('assigns repeatable colors by identity rather than shared initials', () => {
    expect(avatarStyle('alice')).toEqual(avatarStyle('alice'));
    expect(avatarStyle('alice')).not.toEqual(avatarStyle('amber'));
  });
  it('routes a full connection around an intervening widget', () => {
    const a = { left: 0, right: 100, top: 0, bottom: 100 };
    const b = { left: 300, right: 400, top: 0, bottom: 100 };
    const middle = { left: 140, right: 250, top: 0, bottom: 150 };
    const points = connectionRoute(a, b, [a, middle, b]);
    expect(points[0]).toEqual({ x: 100, y: 50 });
    expect(points.at(-1)).toEqual({ x: 300, y: 50 });
    expect(points.some(p => p.y < 0 || p.y > 150)).toBe(true);
    for (let i = 1; i < points.length; i++) expect(points[i].x === points[i - 1].x || points[i].y === points[i - 1].y).toBe(true);
  });
});
