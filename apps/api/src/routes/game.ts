import { Router, type IRouter } from 'express';
import { GetPublicGameResponse } from '@kanz/api-zod';
import { presentGame } from '../lib/present';
import { loadConfig, loadState } from '../lib/store';

// What the main screen polls: everything except what the audience mustn't see yet.
const router: IRouter = Router();

router.get('/game', async (_req, res): Promise<void> => {
  res.json(GetPublicGameResponse.parse(presentGame(await loadState(), await loadConfig(), false)));
});

export default router;
