import axios from 'axios';

import { env } from '../config/env';
import { logger } from '../lib/logger';

interface SpotPrice {
  symbol: string;
  price: number;
  currency: string;
  source: 'mock' | 'coinmarketcap';
  asOf: string;
}

const FALLBACK_PRICES: Record<string, number> = {
  BTC: 68000,
  ETH: 3500,
  SOL: 150,
  USDT: 1
};

export async function fetchSpotPrice(symbol: string, currency = 'USD'): Promise<SpotPrice> {
  const upperSymbol = symbol.toUpperCase();

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
