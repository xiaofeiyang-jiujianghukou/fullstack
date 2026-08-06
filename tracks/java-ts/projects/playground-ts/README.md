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
| `src/02-this-binding.ts` | `this` 的动态绑定 | 编译期绑定实例 → 由调用点决定 |
| `src/03-structural-typing.ts` | 结构化类型系统 | 名义类型（看名字）→ 结构类型（看形状） |

**练习 1 请先预测再运行**，猜错的地方才是真正的收获。

## 配置说明

`tsconfig.json` 开了 `erasableSyntaxOnly`，会禁用 `enum`、`namespace`、构造器参数属性等需要运行时转换的语法——因为 Node 只擦除类型、不做语法转换。这个限制是好事：写出的 TS 更贴近标准 JS。
