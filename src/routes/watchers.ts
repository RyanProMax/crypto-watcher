import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post
} from '@nestjs/common';
import { z } from 'zod';

import { logger } from '../lib/logger';
import { PriceService } from '../services/priceService';
import { WatcherRegistry } from '../services/watcherRegistry';

// 价格监控配置接口：负责创建、查询、更新和删除本地监控规则
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

@Controller('watchers')
export class WatchersController {
  constructor(
    private readonly watcherRegistry: WatcherRegistry,
    private readonly priceService: PriceService
  ) {}

  @Get()
  list() {
    return { data: this.watcherRegistry.list() };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    const watcher = this.watcherRegistry.get(id);
    if (!watcher) {
      throw new NotFoundException('监控配置不存在');
    }

    return { data: watcher };
  }

  @Post()
  create(@Body() body: unknown) {
    const parseResult = createWatcherSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.format());
    }

    const watcher = this.watcherRegistry.create(parseResult.data);
    return { data: watcher };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    const parseResult = updateWatcherSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException(parseResult.error.format());
    }

    const watcher = this.watcherRegistry.update(id, parseResult.data);
    if (!watcher) {
      throw new NotFoundException('监控配置不存在');
    }

    return { data: watcher };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    const removed = this.watcherRegistry.remove(id);
    if (!removed) {
      throw new NotFoundException('监控配置不存在');
    }
  }

  // 为特定监控规则取实时行情，便于前端确认阈值
  @Get(':id/price')
  async getPrice(@Param('id') id: string) {
    const watcher = this.watcherRegistry.get(id);
    if (!watcher) {
      throw new NotFoundException('监控配置不存在');
    }

    try {
      const quote = await this.priceService.fetchSpotPrice(watcher.symbol);
      return { data: quote };
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error.message : error, watcherId: watcher.id },
        '获取实时行情失败'
      );
      throw new HttpException('行情服务暂不可用', HttpStatus.BAD_GATEWAY);
    }
  }
}
