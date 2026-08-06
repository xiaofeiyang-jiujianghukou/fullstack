# Java + TS 路线技术栈

后端沿用已有的 Java 功底，前端用 TypeScript 生态——国内企业最主流的全栈组合。

| 层 | 选型 | 说明 |
|---|---|---|
| 后端语言 | Java 21 (LTS) | |
| 后端框架 | Spring Boot 3.x | Web + Spring Data JPA（或按团队习惯换 MyBatis-Plus） |
| 数据库 | PostgreSQL | 学习期统一用它，覆盖大多数场景 |
| API 风格 | REST + OpenAPI | springdoc-openapi 出接口文档，前端据此生成类型 |
| 前端语言 | TypeScript | 对 Java 开发者上手成本低 |
| 前端框架 | React 18 + Vite | 起步不用 Next.js，先掌握 React 本体 |
| UI 组件库 | Ant Design | 与后台管理场景高度契合 |
| 数据/状态 | TanStack Query + Zustand | 服务端状态与客户端状态分开管理 |
| 构建/包管理 | Maven（后端）、pnpm（前端） | 各自统一，不混用 |
| 部署 | Docker + Docker Compose + Nginx | 学习期以本地/单机部署为主 |

## 约束

- 本路线内项目默认遵循此栈；要偏离，先在本路线目录记录理由
- 项目结构：`projects/<项目名>/backend` + `projects/<项目名>/frontend`
- Java 统一用 21 LTS，Node 统一用当前 LTS
