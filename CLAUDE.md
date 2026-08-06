# 全栈工作空间

全栈学习和工作、交流、共享的空间。所有围绕全栈工作的技术、规则、限制、分享、学习、进阶都在这里展开。

## 目标

对所有主流全栈技术形成相对资深的理解：宏观选型把控、优缺点判断、性能与内存问题的认知。以"路线"为单位推进，一条路线一个目录，多路线并行积累，横向对比。

## 背景

- 用户有后端基础；第一条路线是 `tracks/java-ts/`（学习中）
- 跨路线选型对比集中在 `docs/tech-radar.md`

## 目录约定

- `tracks/<路线>/` — 一条全栈技术路线，标准结构见 `docs/track-template.md`（README / roadmap / stack / evaluation / notes / projects）
- `docs/` — 全局规则、跨路线对比（tech-radar.md）、新路线模板（track-template.md）
- `notes/` — 跨路线通用笔记（HTTP、SQL、浏览器、部署等语言无关知识），文件名 kebab-case
- `shared/` — 可复用模板、代码片段、配置

## 协作规则

- 全程中文交流，代码标识符与技术术语保留英文
- 知识归档：语言无关的通用知识 → 根 `notes/`；路线专属 → `tracks/<路线>/notes/`
- 对某个栈的优缺点、性能、内存结论 → 该路线 `evaluation.md`，成熟后同步 `docs/tech-radar.md`
- 新开路线按 `docs/track-template.md` 建骨架，并在 tech-radar 总览表登记
- 路线内项目遵循该路线 `stack.md`，要偏离先记录理由
- 根目录不散落文件，一切归入对应目录
