import { Router, type IRouter } from 'express';
import { requireAdmin } from '../lib/auth';
import adminRouter from './admin';
import authRouter from './auth';
import gameRouter from './game';
import healthRouter from './health';
import setupRouter from './setup';

const router: IRouter = Router();

router.use(healthRouter);
router.use(gameRouter);
router.use(authRouter);
// Checked before any body is read, so uploads are refused without a session.
router.use('/admin', requireAdmin, adminRouter, setupRouter);

export default router;
