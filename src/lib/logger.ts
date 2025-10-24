import createPino from 'pino';

import { env } from '../config/env';

export const logger = createPino({
  name: 'crypto-watcher',
  level: env.LOG_LEVEL,
  transport:
    env.LOG_LEVEL === 'debug'
      ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
      : undefined
});
