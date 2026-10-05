/** Exact deployment origins; never trust unrelated tenants on a shared host. */
export function getTrustedOrigins(): string[] {
  const origins = [
    process.env.BETTER_AUTH_URL,
    ...((process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',')),
    ...[process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
      .filter(Boolean).map(host => `https://${host}`),
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:5173', 'http://127.0.0.1:5173'] : []),
  ];
  return [...new Set(origins.filter((value): value is string => !!value?.trim())
    .map(value => new URL(value.trim()).origin))];
}
