import { Router, type IRouter } from 'express';
import {
  CreatePasswordBody,
  CreatePasswordResponse,
  GetAccessResponse,
  LoginBody,
  LoginResponse,
  LogoutResponse,
} from '@kanz/api-zod';
import {
  SESSION_COOKIE,
  clearLoginFailures,
  cookieOptions,
  hashPassword,
  loginBlocked,
  recordLoginFailure,
  signSession,
  verifyPassword,
} from '../lib/auth';
import { loadConfig, loadState, updateState } from '../lib/store';

const router: IRouter = Router();

async function access() {
  const [state, { configured }] = await Promise.all([loadState(), loadConfig()]);
  return { hasPassword: !!state.passwordHash, gameConfigured: configured };
}

router.get('/auth', async (_req, res): Promise<void> => {
  res.json(GetAccessResponse.parse(await access()));
});

router.post('/auth/setup', async (req, res): Promise<void> => {
  const input = CreatePasswordBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: 'استخدم كلمة مرور من ٦ أحرف على الأقل.' });
    return;
  }
  const passwordHash = await hashPassword(input.data.password);
  const result = await updateState((state) =>
    state.passwordHash ? 'كلمة مرور الإدارة موجودة بالفعل.' : { ...state, passwordHash },
  );
  if (!result.state) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.cookie(SESSION_COOKIE, signSession(passwordHash), cookieOptions);
  res.json(CreatePasswordResponse.parse(await access()));
});

router.post('/auth/login', async (req, res): Promise<void> => {
  const input = LoginBody.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: 'أدخل كلمة مرور الإدارة.' });
    return;
  }
  const ip = req.ip ?? '';
  if (loginBlocked(ip)) {
    res.status(429).json({ error: 'محاولات كثيرة خاطئة. حاول بعد ربع ساعة.' });
    return;
  }
  const { passwordHash } = await loadState();
  if (!passwordHash || !(await verifyPassword(input.data.password, passwordHash))) {
    recordLoginFailure(ip);
    res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
    return;
  }
  clearLoginFailures(ip);
  res.cookie(SESSION_COOKIE, signSession(passwordHash), cookieOptions);
  res.json(LoginResponse.parse(await access()));
});

router.post('/auth/logout', async (_req, res): Promise<void> => {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
  res.json(LogoutResponse.parse(await access()));
});

export default router;
