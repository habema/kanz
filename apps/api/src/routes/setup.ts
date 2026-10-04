import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import express, { Router, type IRouter } from 'express';
import { GetGameSetupResponse, SaveGameConfigBody } from '@kanz/api-zod';
import { structureKey, validateConfig, type GameConfig } from '@kanz/game-core';
import { mediaDir, mediaTypes } from '../lib/media';
import { freshState, loadConfig, loadState, updateConfig, updateState } from '../lib/store';

// What /setup edits: the game configuration and its media. Mounted behind
// requireAdmin.
const router: IRouter = Router();

async function gameSetup() {
  const [{ config }, state] = await Promise.all([loadConfig(), loadState()]);
  return GetGameSetupResponse.parse({ config, started: state.plays.length > 0 });
}

router.get('/config', async (_req, res): Promise<void> => {
  res.json(await gameSetup());
});

router.put('/config', async (req, res): Promise<void> => {
  const input = SaveGameConfigBody.safeParse(req.body);
  if (!input.success) {
    const issues = input.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    res.status(400).json({ error: ['بيانات اللعبة غير صالحة:', ...issues].join('\n') });
    return;
  }
  const config = input.data as GameConfig;
  const errors = validateConfig(config);
  if (errors.length) {
    res.status(400).json({ error: errors.join('\n') });
    return;
  }
  const { configured } = await loadConfig();
  const result = await updateConfig((current, state) =>
    current.configured && state.plays.length > 0 && structureKey(config) !== structureKey(current.config)
      ? 'اللعبة جارية: لا يمكن تغيير الفئات أو ترتيب الخانات أو الكنز والكشكول أو عدد الفرق قبل بدء لعبة جديدة. تعديل النصوص مسموح.'
      : config,
  );
  if (result.error) {
    res.status(400).json({ error: result.error });
    return;
  }
  // The first save ends onboarding: anything played on the sample game goes.
  if (!configured) await updateState((s) => freshState(s.passwordHash, s.event.id + 1));
  res.json(await gameSetup());
});

router.post('/reset', async (_req, res): Promise<void> => {
  await updateState((state) => freshState(state.passwordHash, state.event.id + 1));
  res.json(await gameSetup());
});

// The body is the file itself and its Content-Type picks the extension. Names
// are content hashes, so files can be cached forever.
router.post('/media', express.raw({ type: () => true, limit: '100mb' }), async (req, res): Promise<void> => {
  const type = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  const ext = mediaTypes[type];
  if (!ext || !Buffer.isBuffer(req.body) || req.body.length === 0) {
    res.status(400).json({ error: 'نوع الملف غير مدعوم.' });
    return;
  }
  const name = `${createHash('sha256').update(req.body).digest('hex').slice(0, 24)}.${ext}`;
  await writeFile(path.join(mediaDir, name), req.body);
  res.json({ url: `/api/media/${name}` });
});

export default router;
