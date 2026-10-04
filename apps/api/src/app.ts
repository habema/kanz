import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import router from './routes';
import { logger } from './lib/logger';
import { mediaDir } from './lib/media';

const app: Express = express();
app.disable('x-powered-by');
// nginx passes the client's address (rate-limiting logins needs it).
app.set('trust proxy', 1);

app.use(
  pinoHttp({
    logger,
    // The screens poll every second; only log those requests when they fail.
    customLogLevel: (req, res, err) =>
      err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : req.method === 'GET' ? 'debug' : 'info',
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url?.split('?')[0] }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

// Uploaded media. Names are content hashes, so they never change; the CSP
// keeps an uploaded SVG from running scripts if opened directly.
app.use(
  '/api/media',
  express.static(mediaDir, {
    immutable: true,
    maxAge: '1y',
    setHeaders: (res) => {
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);
app.use('/api', router);

export default app;
