import { randomUUID } from 'crypto';

import { logger } from '../lib/logger';

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

class WatcherRegistry {
  private readonly watchers = new Map<string, WatcherConfig>();

  constructor() {
    this.seedDefaults();
  }

  list(): WatcherConfig[] {
    return Array.from(this.watchers.values());
  }

  get(id: string): WatcherConfig | undefined {
    return this.watchers.get(id);
  }

  remove(id: string): boolean {
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

    this.watchers.set(watcher.id, watcher);
    logger.info({ watcherId: watcher.id }, '创建新的价格监控');
    return watcher;
  }

  update(id: string, input: UpdateWatcherInput): WatcherConfig | undefined {
    const existing = this.watchers.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: WatcherConfig = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };

    this.watchers.set(id, updated);
    logger.info({ watcherId: id }, '更新价格监控配置');
    return updated;
  }

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

export const watcherRegistry = new WatcherRegistry();
