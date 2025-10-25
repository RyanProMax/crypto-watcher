import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import helmet from 'helmet';
import httpLogger from 'pino-http';

import { AppModule } from './app.module';
import { logger } from './lib/logger';

// 构建 Nest 应用：挂载安全头、JSON 解析、请求日志等中间件
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  app.useLogger(false);
  app.enableShutdownHooks();
  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use(json());
  app.use(
    httpLogger({
      logger,
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      }
    })
  );

  return app;
}
