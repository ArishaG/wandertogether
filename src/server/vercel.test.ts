// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
afterEach(() => vi.unstubAllEnvs());
it('serves health and JSON 404 without a database configured on Vercel', async () => {
  vi.stubEnv('VERCEL', '1');
  vi.stubEnv('DATABASE_URL', '');
  const { default: app } = await import('./entry');
  const server = await new Promise<Server>(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    const address = server.address() as { port: number };
    const base = `http://127.0.0.1:${address.port}`;
    const health = await fetch(`${base}/api/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ status: 'ok' });
    const missing = await fetch(`${base}/api/not-a-route`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'API route not found' });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}, 30000);


