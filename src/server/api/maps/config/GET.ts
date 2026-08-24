/**
 * Google Maps API Configuration Endpoint
 *
 * Returns the Google Maps API key for client-side map rendering.
 * The API key is stored securely in the secrets manager.
 */

import { getSecret } from '#airo/secrets';

import type { Request, Response } from 'express';

export default function handler(_req: Request, res: Response) {
  const apiKey = getSecret('GOOGLE_MAPS_API_KEY');

  if (!apiKey) {
    res.status(500).json({ error: 'Google Maps API key not configured' });
    return;
  }

  res.json({ apiKey });
}
