# Backend on Vercel

The project uses a Vite frontend and the Express handler in `api/[...path].ts`.
The function imports dist/server.bundle.mjs, produced by npm run build, so source aliases and extensionless imports do not reach Node directly. Vercel routing must resolve API functions before the frontend fallback. Deploy
this checkout with the included `vercel.json`; a frontend-only deployment does
not run the backend.

Required Vercel environment variables (set for each deployed environment):
- `DATABASE_URL`: the existing PostgreSQL connection string.
- `BETTER_AUTH_SECRET`: a stable, randomly generated secret of at least 32 characters.
- `BETTER_AUTH_URL`: your canonical site origin, such as `https://your-domain.example`.
- `BETTER_AUTH_TRUSTED_ORIGINS`: optional comma-separated additional exact origins.

Vercel's `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are also trusted. Keep
system environment variables enabled. Never use a wildcard for all vercel.app sites.
Secrets must not have a VITE_ prefix. Redeploy after environment changes.

Local development loads `.env` through Vite. The existing database already has
user, session, account, verification, trips, and trip_members tables; do not
recreate or reset it. No database migration is required by this repair.

Verification after deployment:
1. GET `/api/health` returns JSON with status `ok` (process health, not database readiness).
2. GET `/api/not-a-route` returns JSON with HTTP 404, not the frontend HTML.
3. GET `/api/auth/get-session` returns a session or null as JSON.
4. Sign in, create a trip, and reload to confirm persistence.

AI and maps routes additionally require their respective provider keys; this
repair does not provision those external services.

