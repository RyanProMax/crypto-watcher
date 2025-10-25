import 'reflect-metadata';

import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

// 入口模块：负责初始化 Nest 应用并启动 HTTP 服务，统一处理关机信号
async function bootstrap() {
  const app = await createApp();

  await app.listen(env.PORT);
  logger.info({ port: env.PORT }, 'Crypto Watcher 服务已启动');

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, '接收到退出信号，正在关闭服务');
    try {
      await app.close();
      logger.info('服务已安全退出');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, '关闭服务器时发生错误');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, '存在未捕获的 Promise 拒绝');
  });
  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, '存在未捕获的异常');
    void shutdown('uncaughtException');
  });
}

void bootstrap().catch((error) => {
  logger.error({ err: error }, '应用启动失败');
  process.exit(1);
});
