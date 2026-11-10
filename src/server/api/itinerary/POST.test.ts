// @vitest-environment node
import { expect, it } from 'vitest';
import type { Request, Response } from 'express';
import handler from './POST';

async function request(body: unknown) {
  let status = 200, payload: any;
  const res = { status(value: number) { status = value; return this; }, json(value: unknown) { payload = value; return this; } };
  await handler({ body } as Request, res as Response);
  return { status, payload };
}
it('generates a multi-day itinerary with fewer activities than days', async () => {
  const result = await request({ destination: 'Sydney', start: '2026-11-01', end: '2026-11-04', activities: [{ name: 'Opera House' }] });
  expect(result.status).toBe(200);
  expect(result.payload.itinerary).toHaveLength(4);
  expect(result.payload.itinerary.flatMap((day: any) => day.entries)).toHaveLength(1);
  expect(result.payload.itinerary[3].date).toBe('2026-11-04');
});
it('rejects invalid or reversed dates instead of crashing or looping', async () => {
  for (const [start, end] of [['2026-11-04', '2026-11-01'], ['2026-02-30', '2026-03-01']]) {
    expect((await request({ destination: 'Sydney', start, end, activities: [{ name: 'Opera House' }] })).status).toBe(400);
  }
});
