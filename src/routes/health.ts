import type { Request, Response, Router } from 'express';
import { Router as createRouter } from 'express';

const router: Router = createRouter();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;
