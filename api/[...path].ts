// Vercel Serverless Function entry point.
//
// Vercel serves the static build (dist/client) directly and only falls back
// to filesystem-routed functions like this one for paths that don't match a
// static file — which is every /api/* request. It re-exports the same
// Express app used by the standalone server (src/server/entry.ts) so the
// route table stays in one place.
export { default } from '../src/server/entry';
