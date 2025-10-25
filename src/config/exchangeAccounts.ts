import { z } from 'zod';

import { logger } from '../lib/logger';

import { env } from './env';

// 解析 EXCHANGE_ACCOUNTS JSON 配置，提供内存中的交易所账号索引

const exchangeAccountSchema = z.object({
  id: z.string().min(1),
  exchange: z.string().min(1),
  apiKey: z.string().min(1),
  secret: z.string().min(1),
  password: z.string().optional(),
  uid: z.string().optional(),
  address: z.string().optional()
});

export type ExchangeAccount = z.infer<typeof exchangeAccountSchema>;

function parseAccounts(): ExchangeAccount[] {
  if (!env.EXCHANGE_ACCOUNTS) {
    return [];
  }

  try {
    const raw = JSON.parse(env.EXCHANGE_ACCOUNTS);
    const result = z.array(exchangeAccountSchema).safeParse(raw);

    if (!result.success) {
      for (const issue of result.error.issues) {
        logger.error({ path: issue.path, message: issue.message }, '交易所账号配置校验失败');
      }
      throw new Error('交易所账号配置无效');
    }

    return result.data;
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.message : error },
      '解析交易所账号配置失败'
    );
    throw new Error('无法解析交易所账号配置');
  }
}

const accounts = parseAccounts();

export function listExchangeAccounts(): ExchangeAccount[] {
  return accounts;
}

export function findExchangeAccount(accountId: string): ExchangeAccount | undefined {
  return accounts.find((item) => item.id === accountId);
}
