# Repository Guidelines

## 项目结构与模块组织
所有运行时代码放在 `src/`。`src/server.ts` 负责创建 HTTP 服务，`src/app.ts` 组织 Express 中间件并挂载路由。环境配置集中在 `src/config/`，日志封装位于 `src/lib/logger.ts`。与行情聚合相关的逻辑放在 `src/services/`（例如 `priceService.ts` 与 `watcherRegistry.ts`），HTTP 路由位于 `src/routes/`，新增端点时同步更新 `routes/index.ts`。`.env.example` 记录启动所需的全部变量，新增配置必须同步维护该文件。

## 构建与开发命令
- `npm install`：安装运行与开发依赖，生成 `package-lock.json`。
- `npm run dev`：使用 `ts-node-dev` 热重载本地服务，读取 `.env` 配置。
- `npm run build`：将 TypeScript 编译到 `dist/` 目录，供生产环境运行。
- `npm run lint` / `npm run lint:fix`：使用 ESLint 联合 Prettier 校验与修复代码风格。

## 代码风格与命名约定
代码统一使用 TypeScript，遵循 `eslint`+`@typescript-eslint` 规则与 Prettier 默认格式；提交前必须运行 `npm run lint` 与 `npm run format`。模块文件命名采用 `camel-case.ts`，导出的类保持 `PascalCase`，函数和常量使用 `camelCase`。异步函数需显式标记 `async` 并保证返回 `Promise`。新增环境变量时在 `src/config/env.ts` 中通过 Zod 校验，未通过验证的配置会阻止应用启动。

## 提交与拉取请求规范
遵循 Conventional Commits，例如 `feat(routes): add price endpoint` 或 `fix(service): handle api timeout`。确保单次提交只聚焦一个问题，格式化或配置调整独立提交。拉取请求需要：1) 描述问题背景与解决方案；2) 链接相关任务或问题单；3) 附上手动验证步骤或接口示例；4) 若新增配置或外部依赖，更新 `.env.example` 与文档。CI 通过后再请求评审。

## 安全与配置提示
任何密钥只放在本地 `.env`，禁止提交到仓库。开发环境使用只读或最小权限的交易所秘钥，并每季度轮换。对外发送的 Webhook 在 `priceService` 或后续通知模块中必须校验 HMAC，避免伪造请求。服务部署前请确认端口、日志级别与告警渠道均通过环境变量配置。
