// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTrustedOrigins } from './trusted-origins';
afterEach(() => vi.unstubAllEnvs());
describe('deployment auth origins', () => {
  it('trusts only configured Vercel deployments in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BETTER_AUTH_URL', 'https://travel.example');
    vi.stubEnv('BETTER_AUTH_TRUSTED_ORIGINS', 'https://other.example');
    vi.stubEnv('VERCEL_URL', 'project-123.vercel.app');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'project.vercel.app');
    expect(getTrustedOrigins()).toEqual(['https://travel.example', 'https://other.example', 'https://project-123.vercel.app', 'https://project.vercel.app']);
    expect(getTrustedOrigins()).not.toContain('https://unrelated.vercel.app');
  });
});
