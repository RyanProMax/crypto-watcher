import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { logger } from '../lib/logger';
import { fetchSpotPrice } from '../services/priceService';
import { watcherRegistry } from '../services/watcherRegistry';

const router = Router();

const createWatcherSchema = z.object({
  symbol: z.string().min(1, 'symbol 不能为空'),
  exchange: z.string().min(1, 'exchange 不能为空'),
  threshold: z.coerce.number().positive('threshold 必须是正数'),
  direction: z.enum(['above', 'below']),
  frequency: z.enum(['realtime', '1m', '5m', '15m']).default('realtime')
});

const updateWatcherSchema = z
  .object({
    threshold: z.coerce.number().positive().optional(),
    direction: z.enum(['above', 'below']).optional(),
    frequency: z.enum(['realtime', '1m', '5m', '15m']).optional(),
    active: z.coerce.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: '至少提供一个可更新字段'
  });

router.get('/', (_req: Request, res: Response) => {
  return res.json({ data: watcherRegistry.list() });
});

router.get('/:id', (req: Request, res: Response) => {
  const watcher = watcherRegistry.get(req.params.id);
  if (!watcher) {
    return res.status(404).json({ error: '监控配置不存在' });
  }

  return res.json({ data: watcher });
});

router.post('/', (req: Request, res: Response) => {
  const parseResult = createWatcherSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.format() });
  }

  const watcher = watcherRegistry.create(parseResult.data);
  return res.status(201).json({ data: watcher });
});

router.patch('/:id', (req: Request, res: Response) => {
  const parseResult = updateWatcherSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.format() });
  }

  const watcher = watcherRegistry.update(req.params.id, parseResult.data);
  if (!watcher) {
    return res.status(404).json({ error: '监控配置不存在' });
  }

  return res.json({ data: watcher });
});

router.delete('/:id', (req: Request, res: Response) => {
  const removed = watcherRegistry.remove(req.params.id);
  if (!removed) {
    return res.status(404).json({ error: '监控配置不存在' });
  }

  return res.status(204).send();
});

router.get('/:id/price', async (req: Request, res: Response) => {
  const watcher = watcherRegistry.get(req.params.id);
  if (!watcher) {
    return res.status(404).json({ error: '监控配置不存在' });
  }

  try {
    const quote = await fetchSpotPrice(watcher.symbol);
    return res.json({ data: quote });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : error, watcherId: watcher.id },
      '获取实时行情失败'
    );
    return res.status(502).json({ error: '行情服务暂不可用' });
  }
});

export default router;
