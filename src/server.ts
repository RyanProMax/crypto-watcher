import { createServer } from 'http';

import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

const app = createApp();
const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Crypto Watcher 服务已启动');
});

const shutdown = (signal: string) => {
  logger.info({ signal }, '接收到退出信号，正在关闭服务');
  server.close((error) => {
    if (error) {
      logger.error({ err: error }, '关闭服务器时发生错误');
      process.exit(1);
    }
    logger.info('服务已安全退出');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, '存在未捕获的 Promise 拒绝');
});
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, '存在未捕获的异常');
  shutdown('uncaughtException');
});
