import type { Request, Response } from 'express';
import { getAuth } from '../../../../../lib/auth/auth.js';
import { leaveTrip, NotAMemberError } from '../../../../leave-trip';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user) return res.status(401).json({ error: 'Sign in to leave a board.' });
    const result = await leaveTrip(String(req.params.id), session.user);
    if (!result) return res.status(404).json({ error: 'Board not found.' });
    res.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof NotAMemberError) return res.status(403).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to leave this board.' });
  }
}
