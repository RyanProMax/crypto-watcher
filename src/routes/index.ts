import { AccountsController } from './accounts';
import { HealthController } from './health';
import { WatchersController } from './watchers';

// 聚合所有 HTTP 控制器，供 NestJS 模块装配
const routes = [AccountsController, HealthController, WatchersController] as const;

export default routes;
