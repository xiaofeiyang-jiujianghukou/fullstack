# playground-ts

阶段 1 练习场：JS/TS 语言基础。**无构建步骤**——Node 24 原生支持类型擦除，直接运行 `.ts` 文件。学语言不该被构建工具干扰，Vite 留到阶段 2 学 React 时引入。

## 使用

```bash
pnpm install     # 只装 typescript 与 @types/node，供编辑器和类型检查用
pnpm 01          # 运行练习 1（等价于 node src/01-event-loop.ts）
pnpm check       # 全量类型检查（tsc --noEmit）
```

## 练习

| 文件 | 主题 | 对照的 Java 直觉 |
|---|---|---|
| `src/01-event-loop.ts` | 事件循环与单线程异步 | 多线程抢占 → 单线程任务队列 |
| `src/02-this-binding.ts` | `this` 动态绑定（交互） | 编译期绑定实例 → 由调用点决定 |
| `src/03-structural-typing.ts` | 结构化类型系统 | 名义类型（看名字）→ 结构类型（看形状） |
| `src/01-quiz.ts` | 事件循环预测题（交互） | 预测输出顺序 → 真跑对比 |
| `src/01-quiz-2.ts` | async/await + nextTick（交互） | 同步 try/catch → 切一刀排队 |
| `src/04-promise-chain.ts` | Promise 链双轨道（交互） | 同步 throw → 失败轨道传播 |
| `src/06-cjs-esm/` | CJS vs ESM 顶层行为对比（交互） | 模块求值上下文不同，实测四象限 |
| `src/07-generics/` | 泛型 vs Java（交互，tsc 判定） | 名义约束 → 结构约束，推断更强 |
| `src/05-exam.ts` | 综合模考（交互，`pnpm exam`） | 事件循环 + async/await + Promise 链 |

**交互练习请先预测再运行**，猜错的地方才是真正的收获。
题 3 前置：先做 `src/06-cjs-esm/`（`pnpm 06`），再考 `pnpm exam`。

## 配置说明

`tsconfig.json` 开了 `erasableSyntaxOnly`，会禁用 `enum`、`namespace`、构造器参数属性等需要运行时转换的语法——因为 Node 只擦除类型、不做语法转换。这个限制是好事：写出的 TS 更贴近标准 JS。
