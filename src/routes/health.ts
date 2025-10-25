import { Controller, Get } from '@nestjs/common';

// 提供基础健康检查，供部署环境快速探活
@Controller()
export class HealthController {
  @Get('health')
  check() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}
