import { Injectable } from '@nestjs/common';
import axios from 'axios';

import { env } from '../config/env';
import { logger } from '../lib/logger';

// 行情获取服务：先尝试 CoinMarketCap 实时接口，失败时回落到本地兜底价以保证监控不中断
export interface SpotPrice {
  symbol: string;
  price: number;
  currency: string;
  source: 'mock' | 'coinmarketcap';
  asOf: string;
}

// 预设常见币种的容错价格，规避第三方依赖失败导致的业务中断
const FALLBACK_PRICES: Record<string, number> = {
  BTC: 68000,
  ETH: 3500,
  SOL: 150,
  USDT: 1
};

@Injectable()
export class PriceService {
  async fetchSpotPrice(symbol: string, currency = 'USD'): Promise<SpotPrice> {
    const upperSymbol = symbol.toUpperCase();

    // 没有配置 API Key 时直接返回兜底数据，以支持纯本地演示环境
    if (!env.COINMARKETCAP_API_KEY) {
      return {
        symbol: upperSymbol,
        price: FALLBACK_PRICES[upperSymbol] ?? 0,
        currency,
        source: 'mock',
        asOf: new Date().toISOString()
      };
    }

    try {
      // 带超时控制调用 CoinMarketCap，优先返回目标计价货币行情，若缺失则退回 USD
      const response = await axios.get(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
        {
          params: {
            symbol: upperSymbol,
            convert: currency
          },
          headers: {
            'X-CMC_PRO_API_KEY': env.COINMARKETCAP_API_KEY
          },
          timeout: 5000
        }
      );

      const quote =
        response.data?.data?.[upperSymbol]?.quote?.[currency] ??
        response.data?.data?.[upperSymbol]?.quote?.USD;

      if (!quote) {
        throw new Error('未找到对应行情数据');
      }

      return {
        symbol: upperSymbol,
        price: Number(quote.price),
        currency,
        source: 'coinmarketcap',
        asOf: quote.last_updated ?? new Date().toISOString()
      };
    } catch (error) {
      // 请求失败时写日志并回退兜底价，确保上层功能有可用数据
      logger.warn(
        { err: error instanceof Error ? error.message : error, symbol: upperSymbol },
        '实时行情请求失败，使用兜底值'
      );

      return {
        symbol: upperSymbol,
        price: FALLBACK_PRICES[upperSymbol] ?? 0,
        currency,
        source: 'mock',
        asOf: new Date().toISOString()
      };
    }
  }
}
