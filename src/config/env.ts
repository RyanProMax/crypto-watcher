import { config as loadEnv } from 'dotenv';
import pick from 'lodash/pick';
import createPino from 'pino';
import { z } from 'zod';

// 负责加载并校验环境变量，确保运行时配置可靠可观测

loadEnv();

const zodObjectRule = {
  PORT: z
    .coerce.number()
    .int()
    .min(1)
    .max(65535)
    .default(4000),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .default('info'),
  COINMARKETCAP_API_KEY: z.string().optional(),
  COINBASE_API_KEY: z.string().optional(),
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  EXCHANGE_ACCOUNTS: z.string().optional()
};

const envSchema = z.object(zodObjectRule);

const logger = createPino({ name: 'env' });

const parsed = envSchema.safeParse(process.env);

logger.info(`环境变量配置 ${JSON.stringify(pick(process.env, Object.keys(zodObjectRule)))}`);

if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    logger.error({ path: issue.path, message: issue.message }, '环境变量校验失败');
  }
  throw new Error('环境变量加载失败，请检查 .env 配置');
}

export const env = parsed.data;
