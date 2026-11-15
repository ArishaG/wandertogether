import type { Request, Response } from 'express';
import { getAuth } from '../../../../../lib/auth/auth.js';
import { NotAMemberError, previewLeave } from '../../../../leave-trip';

/** Describes what leaving would do, for the confirmation dialog. Changes nothing. */
export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: req.headers as unknown as Headers });
    if (!session?.user) return res.status(401).json({ error: 'Sign in to manage your boards.' });
    const preview = await previewLeave(String(req.params.id), session.user.id);
    if (!preview) return res.status(404).json({ error: 'Board not found.' });
    res.json(preview);
  } catch (error) {
    if (error instanceof NotAMemberError) return res.status(403).json({ error: error.message });
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to check this board.' });
  }
}
