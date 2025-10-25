import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';
import cloneDeep from 'lodash/cloneDeep';
import merge from 'lodash/merge';

import { logger } from '../lib/logger';

// 内存态监控仓库：负责管理价格预警规则的生命周期
export type WatchDirection = 'above' | 'below';

export interface WatcherConfig {
  id: string;
  symbol: string;
  exchange: string;
  threshold: number;
  direction: WatchDirection;
  frequency: 'realtime' | '1m' | '5m' | '15m';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWatcherInput {
  symbol: string;
  exchange: string;
  threshold: number;
  direction: WatchDirection;
  frequency?: WatcherConfig['frequency'];
}

export interface UpdateWatcherInput {
  threshold?: number;
  direction?: WatchDirection;
  frequency?: WatcherConfig['frequency'];
  active?: boolean;
}

@Injectable()
export class WatcherRegistry {
  private readonly watchers = new Map<string, WatcherConfig>();

  constructor() {
    // 启动时注入样例配置，帮助接口消费者快速验证业务流程
    this.seedDefaults();
  }

  list(): WatcherConfig[] {
    return Array.from(this.watchers.values()).map((item) => cloneDeep(item));
  }

  get(id: string): WatcherConfig | undefined {
    const watcher = this.watchers.get(id);
    return watcher ? cloneDeep(watcher) : undefined;
  }

  remove(id: string): boolean {
    // 删除配置信息时同步打点，便于排查误删
    const removed = this.watchers.delete(id);
    if (removed) {
      logger.debug({ watcherId: id }, '已删除监听配置');
    }
    return removed;
  }

  create(input: CreateWatcherInput): WatcherConfig {
    const now = new Date().toISOString();
    const watcher: WatcherConfig = {
      id: randomUUID(),
      symbol: input.symbol.toUpperCase(),
      exchange: input.exchange.toLowerCase(),
      threshold: input.threshold,
      direction: input.direction,
      frequency: input.frequency ?? 'realtime',
      active: true,
      createdAt: now,
      updatedAt: now
    };

    // 统一写入内存 Map，保证读取一致性并产生审计日志
    this.watchers.set(watcher.id, watcher);
    logger.info({ watcherId: watcher.id }, '创建新的价格监控');
    return cloneDeep(watcher);
  }

  update(id: string, input: UpdateWatcherInput): WatcherConfig | undefined {
    const existing = this.watchers.get(id);
    if (!existing) {
      return undefined;
    }

    // 合并更新字段并刷新更新时间戳，用于前端增量刷新
    const updated: WatcherConfig = merge({}, existing, input, {
      updatedAt: new Date().toISOString()
    });

    this.watchers.set(id, updated);
    logger.info({ watcherId: id }, '更新价格监控配置');
    return cloneDeep(updated);
  }

  // 创建演示用的默认数据，便于本地验证接口
  private seedDefaults(): void {
    const now = new Date().toISOString();
    const defaults: WatcherConfig[] = [
      {
        id: randomUUID(),
        symbol: 'BTC',
        exchange: 'binance',
        threshold: 65000,
        direction: 'above',
        frequency: 'realtime',
        active: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: randomUUID(),
        symbol: 'ETH',
        exchange: 'coinbase',
        threshold: 3200,
        direction: 'below',
        frequency: '1m',
        active: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const watcher of defaults) {
      this.watchers.set(watcher.id, watcher);
    }
  }
}
