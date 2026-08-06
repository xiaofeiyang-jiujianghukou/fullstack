# 学习路线：有后端基础 → Java + TS 全栈

起点：已有后端基础。重点是补现代前端，并打通"数据库 → API → 前端 → 部署"的完整链路。周数是参考值，按实际节奏调整。

## 阶段 1：JS/TS 语言基础（约 2–3 周）

后端转全栈，先把语言层立住：

- JavaScript 核心：ES6+ 语法、原型与 `this`、Promise / async-await、事件循环（对比 Java 线程模型理解单线程异步）
- TypeScript：类型系统（对 Java 开发者非常亲切）、interface 与泛型、tsconfig 基础
- 工具链：Node.js LTS、pnpm、用 Vite 起手一个 TS 项目
- **产出**：`notes/` 至少两篇（如 js-async-model、ts-for-java-dev）；`projects/playground-ts/` 小练习

## 阶段 2：React 核心（约 3–4 周）

- 组件模型、JSX、props/state、核心 hooks（useState / useEffect / useMemo / 自定义 hook）
- 路由：React Router；数据获取：TanStack Query（对接自己写的 Spring Boot 接口）
- 状态管理：Zustand；UI 组件库：Ant Design
- **产出**：一个纯前端小应用，数据来自自建 API 或公开 API

## 阶段 3：前后端整合（约 2–3 周）

- CORS、JWT 鉴权的前后端配合、文件上传下载、统一错误处理约定
- springdoc-openapi 生成接口文档 → 前端用 openapi-typescript 生成类型，打通类型链路
- **产出**：`notes/fullstack-integration.md`，一个整合 demo

## 阶段 4：贯穿项目 + 部署（4 周起）

- 完整项目（建议：个人博客 + 后台管理，或书签/记账服务）：Spring Boot + PostgreSQL 后端，React + AntD 前端
- Docker 化：前后端各自 Dockerfile + Docker Compose（Nginx 反代 + 后端 + 数据库）
- CI 入门：GitHub Actions 自动构建
- **产出**：`projects/<项目名>/`，可访问的完整应用

## 阶段 5：进阶（按需）

- Next.js 与 SSR/SEO 场景、前端性能优化（打包分析、懒加载）、可观测性（日志、监控）

## 节奏约定

- 每个阶段结束时：`notes/` 至少一篇笔记，`projects/` 有可运行的代码
- 学习中形成的优缺点、性能与内存认知随手记入 [evaluation.md](evaluation.md)
- 踩到的坑记进本路线 `pitfalls.md`（第一次踩坑时创建）；跨栈通用的坑放根目录 `notes/`
