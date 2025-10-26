import { Injectable } from '@nestjs/common';
import ccxt from 'ccxt';
import type { Exchange } from 'ccxt';

import { env } from '../config/env';
import { findExchangeAccount } from '../config/exchangeAccounts';
import { logger } from '../lib/logger';

// 统一封装 ccxt 客户端访问，提供账户层面的交易、仓位、委托查询
export class AccountNotFoundError extends Error {
  constructor(accountId: string) {
    super(`未找到账号 ${accountId}`);
    this.name = 'AccountNotFoundError';
  }
}

export class UnsupportedExchangeError extends Error {
  constructor(exchangeId: string) {
    super(`暂不支持交易所 ${exchangeId}`);
    this.name = 'UnsupportedExchangeError';
  }
}

export class OperationNotSupportedError extends Error {
  constructor(operation: string, exchangeId: string) {
    super(`交易所 ${exchangeId} 不支持操作 ${operation}`);
    this.name = 'OperationNotSupportedError';
  }
}

interface FetchOptions {
  symbol?: string;
  since?: number;
  limit?: number;
}

type ExchangeCtor = new (params: Record<string, unknown>) => Exchange;

@Injectable()
export class ExchangeMonitoringService {
  // 缓存账号对应的 ccxt 客户端，避免重复初始化
  private readonly clientCache = new Map<string, Exchange>();

  async fetchAccountTransactions(accountId: string, options: FetchOptions = {}) {
    // 统一入口：命中缓存的 ccxt 客户端并对不支持的交易所方法抛出业务型错误
    const client = this.getOrCreateClient(accountId);

    const supportsFetchTransactions =
      typeof client.fetchTransactions === 'function' && client.has?.fetchTransactions !== false;
    if (!supportsFetchTransactions) {
      throw new OperationNotSupportedError('fetchTransactions', client.id);
    }

    try {
      const transactions = await client.fetchTransactions(
        options.symbol,
        options.since,
        options.limit
      );
      return transactions;
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error.message : error,
          accountId,
          exchangeId: client.id
        },
        '获取账户交易记录失败'
      );
      if (error instanceof ccxt.NotSupported) {
        throw new OperationNotSupportedError('fetchTransactions', client.id);
      }
      throw error;
    }
  }

  async fetchAccountPositions(accountId: string, symbol?: string) {
    // 支持按符号过滤仓位，缺省情况下查询全部仓位
    const client = this.getOrCreateClient(accountId);

    const supportsFetchPositions =
      typeof client.fetchPositions === 'function' && client.has?.fetchPositions !== false;
    if (!supportsFetchPositions) {
      throw new OperationNotSupportedError('fetchPositions', client.id);
    }

    const symbols = symbol ? [symbol] : undefined;

    try {
      const positions = await client.fetchPositions(symbols);
      return positions;
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error.message : error,
          accountId,
          exchangeId: client.id
        },
        '获取账户仓位失败'
      );
      if (error instanceof ccxt.NotSupported) {
        throw new OperationNotSupportedError('fetchPositions', client.id);
      }
      throw error;
    }
  }

  async fetchAccountOpenOrders(accountId: string, options: FetchOptions = {}) {
    // 暴露当前委托列表查询，用于投研监控或仓位复核
    const client = this.getOrCreateClient(accountId);

    const supportsFetchOpenOrders =
      typeof client.fetchOpenOrders === 'function' && client.has?.fetchOpenOrders !== false;
    if (!supportsFetchOpenOrders) {
      throw new OperationNotSupportedError('fetchOpenOrders', client.id);
    }

    try {
      const orders = await client.fetchOpenOrders(options.symbol, options.since, options.limit);
      return orders;
    } catch (error) {
      logger.error(
        {
          err: error instanceof Error ? error.message : error,
          accountId,
          exchangeId: client.id
        },
        '获取账户当前委托失败'
      );
      if (error instanceof ccxt.NotSupported) {
        throw new OperationNotSupportedError('fetchOpenOrders', client.id);
      }
      throw error;
    }
  }

  private getOrCreateClient(accountId: string): Exchange {
    const cached = this.clientCache.get(accountId);
    if (cached) {
      return cached;
    }

    const account = findExchangeAccount(accountId);
    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    const ExchangeCtor = this.resolveExchangeCtor(account.exchange);
    const instanceConfig: Record<string, unknown> = {
      apiKey: account.apiKey,
      secret: account.secret,
      password: account.password,
      uid: account.uid,
      timeout: env.EXCHANGE_HTTP_TIMEOUT_MS,
      enableRateLimit: true,
      options: {
        adjustForTimeDifference: true
      }
    };

    if (env.EXCHANGE_HTTP_PROXY) {
      instanceConfig.httpProxy = env.EXCHANGE_HTTP_PROXY;
    }

    const instance = new ExchangeCtor(instanceConfig);

    this.clientCache.set(accountId, instance);
    logger.debug({ accountId }, '已创建交易所客户端实例');
    return instance;
  }

  private resolveExchangeCtor(exchangeId: string): ExchangeCtor {
    const casted = ccxt as unknown as Record<string, ExchangeCtor>;
    const ctor = casted[exchangeId];
    if (!ctor) {
      throw new UnsupportedExchangeError(exchangeId);
    }

    return ctor;
  }
}
