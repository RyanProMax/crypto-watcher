import { config as loadEnv } from 'dotenv';
import createPino from 'pino';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
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
  ALERT_WEBHOOK_URL: z.string().url().optional()
});

const logger = createPino({ name: 'env' });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  for (const issue of parsed.error.issues) {
    logger.error({ path: issue.path, message: issue.message }, '环境变量校验失败');
  }
  throw new Error('环境变量加载失败，请检查 .env 配置');
}

export const env = parsed.data;
