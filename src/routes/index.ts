import type { Router } from 'express';
import { Router as createRouter } from 'express';

import healthRouter from './health';
import watchersRouter from './watchers';

const router: Router = createRouter();

router.use('/', healthRouter);
router.use('/watchers', watchersRouter);

export default router;
