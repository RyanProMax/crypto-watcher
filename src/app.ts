import express, { json } from 'express';
import helmet from 'helmet';
import httpLogger from 'pino-http';

import { logger } from './lib/logger';
import routes from './routes';

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use(json());
  app.use(
    httpLogger({
      logger,
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      }
    })
  );

  app.use('/api', routes);

  app.use((_req, res) => {
    res.status(404).json({ error: '未找到请求资源' });
  });

  return app;
}
