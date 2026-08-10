# JS 异步模型：从多线程到事件循环

> 配套练习：
> - `projects/playground-ts/src/01-quiz.ts`（事件循环第一关）
> - `projects/playground-ts/src/01-quiz-2.ts`（async/await + process.nextTick）
> - `projects/playground-ts/src/04-promise-chain.ts`（Promise 链式调用）
> - `projects/playground-ts/src/06-cjs-esm/`（CJS vs ESM 顶层 nextTick 对比，实测四象限）
> - `projects/playground-ts/src/05-exam.ts`（综合模考）

---

## 1. 与 Java 线程模型的对照

| 维度 | Java | JS |
|---|---|---|
| 并发单位 | 线程（Thread），多线程并行 | 单线程，靠事件循环调度 |
| 调度者 | JVM + OS 线程调度器 | JS 引擎的事件循环（Event Loop） |
| 阻塞的影响范围 | 只阻塞当前线程，其他线程继续跑 | 阻塞主线程 = 阻塞整个程序（UI 卡死/接口不响应） |
| 异步写法 | `Future.get()`（阻塞等待）/ `CompletableFuture`（回调链） | `Promise` / `async-await`（语法糖，等价于 Promise） |
| `await` 语义 | `Future.get()` 真等结果，阻塞当前线程 | `await` 把函数"切一刀"，让出主线程，结果回来再继续 |

---

## 2. 事件循环：宏任务与微任务

### 来源

| 类型 | 来源 |
|---|---|
| **宏任务**（Macro Task） | `setTimeout` / `setInterval` / I/O 回调 / 渲染（浏览器） |
| **微任务**（Micro Task） | `Promise.then` / `queueMicrotask` / `MutationObserver`（浏览器） |
| **nextTick**（Node 独有） | `process.nextTick`，优先级比微任务还高 |

### 清空规则

```
每个宏任务执行完毕后：
  1. 清空 nextTick 队列（Node 独有，比微任务先）
  2. 清空微任务队列（所有 .then 回调）
  3. 取下一个宏任务执行
  重复……
```

关键：**两个宏任务之间，微任务队列必须清空**。一个宏任务执行期间新登记的微任务，也会在这次清空中一并跑完，不会等到下一轮。

注：这里的「nextTick 优先」是**宏任务边界**层面的事。在微任务执行中**新登记**的 nextTick，要等这轮微任务清空后才轮到（实测：微任务里登记的 nextTick 排在所有已排队微任务之后）。ESM 顶层求值本身跑在微任务上下文里，所以顶层登记的 promise 会抢在 nextTick 前面——详见 §6。

### async 函数体的执行时机

```js
async function task() {
  console.log('D')   // ← 同步执行，task() 调用时立即跑
  await null
  console.log('E')   // ← await 把这里切成微任务，异步跑
}
task()
console.log('G')     // G 比 E 先打印
```

`await` 的语义不是"等异步完成"，而是**"到此切一刀"**——把函数剩余部分登记为微任务，然后让出主线程。

### await 的入队时机

```
await X：先问"X 现在是完成态吗？"

  X 是已完成的值（null / 已 resolved 的 Promise）
    → 后半段【当场】排进微任务队列（同步阶段就排好了）

  X 是 pending 的 Promise
    → 后半段挂在 X 上，等 X resolve 后才入队
    → 后半段会落到比宏任务还晚的位置
```

---

## 3. Promise 链：两条轨道

Promise 链有两条轨道，任何时刻链条只在其中一条上：

```
成功轨道 ───→ .then(onFulfilled) 响应
失败轨道 ───→ .catch(onRejected) 响应（= .then(undefined, onRejected)）
```

### 切换规则

| 操作 | 效果 |
|---|---|
| `.then` / `.catch` 里 `return X` | 值变成 X，轨道不变 |
| `.then` / `.catch` 里 `throw err` | 切到**失败轨道** |
| `.then` / `.catch` 里 `return rejectedPromise` | 切到**失败轨道** |
| `.catch` 正常 return（不 throw）| 切回**成功轨道** |
| `.finally(fn)` | 两条轨道都停的站，fn 的返回值被忽略，轨道/值不变 |

### 典型模式

```js
Promise.resolve(1)
  .then(n => { return n + 1 })   // 成功轨道：n = 1 → 2
  .then(n => { throw Error() })  // 成功轨道：n = 2，然后切到失败轨道
  .then(n => { /* 跳过 */ })     // 成功轨道专用，当前失败轨道，跳过
  .catch(err => { return 'ok' }) // 失败轨道：处理，切回成功轨道
  .then(val => { /* val='ok' */}) // 成功轨道，正常执行
  .finally(() => { /* 必跑 */ }) // 任意轨道
```

### 与 async/await 等价

```js
// Promise 链写法              等价的 async/await
promise                        try {
  .then(a => ...)                  const x = await promise; // a
  .then(b => ...)                  // b
  .catch(e => ...)             } catch(e) { ... }
  .finally(f => ...)           } finally { // f }
```

见到 `.then`/`.catch` 链时，脑子里还原成 async/await 更直观。

---

## 4. 单线程的代价

JS 主线程是单线程，任何同步的耗时操作都会**阻塞整个事件循环**：定时器延迟、UI 卡顿、HTTP 请求不响应。

这是前端"不能在主线程做重计算"的物理原因：不是性能习惯，是架构约束。
解法：Web Worker（浏览器）/ Worker Threads（Node）把计算移到独立线程。

---

## 5. Node 与浏览器的差异

| 特性 | Node | 浏览器 |
|---|---|---|
| `process.nextTick` | ✅ 有，优先级高于微任务 | ❌ 无 |
| 宏任务来源 | `setTimeout` / I/O / `setImmediate` | `setTimeout` / I/O / 渲染帧 |
| 微任务来源 | `Promise.then` / `queueMicrotask` | 同左 + `MutationObserver` |

`process.nextTick` 的存在是 Node 代码不能无脑搬进浏览器的原因之一。

---

## 6. ESM 顶层的 nextTick 延迟（容易踩的坑）

经典规则是 `process.nextTick` 优先级**高于**微任务：

```js
// CJS 下（node -e / require）—— 顶层是普通同步上下文
process.nextTick(() => console.log('N'))
Promise.resolve().then(() => console.log('P'))
// 输出：N → P   （nextTick 先，符合经典规则）
```

但在 **ESM 模式**下（`package.json` 里 `"type": "module"`，或文件后缀 `.mjs`），同样的顶层代码：

```js
// ESM 下（pnpm exam / node --input-type=module）—— 顶层在微任务上下文里
process.nextTick(() => console.log('N'))
Promise.resolve().then(() => console.log('P'))
// 输出：P → N   （微任务先，反过来了！）
```

### 为什么

ESM 模块的依赖图是**异步构建**的，模块的实例化和顶层求值发生在一条 promise 链里。也就是说，ESM 顶层代码不是在"普通同步上下文"里跑，而是在一个**微任务上下文**里求值。

在这个特殊上下文里，顶层登记的 `process.nextTick` 回调会被推迟到当前模块求值链结束之后，导致 `Promise.then` 的微任务反而先执行。CJS 模块是同步加载的，顶层就是普通同步上下文，nextTick 按经典规则先于微任务。

### 实验证据

```bash
# CJS（经典规则：nextTick 先）
node -e "process.nextTick(()=>console.log('N'));Promise.resolve().then(()=>console.log('P'))"
# → N → P

# ESM（反转：微任务先）
node --input-type=module -e "process.nextTick(()=>console.log('N'));Promise.resolve().then(()=>console.log('P'))"
# → P → N
```

### 实测矩阵（Node v24，同一段代码：A 同步 / B 宏任务 / C 微任务 / D nextTick / F await pending）

| 跑法 | CJS | ESM |
|---|---|---|
| 顶层裸写 | A E G D C B F（经典规则）| A E G **C D** B F（promise 抢跑）|
| 包进 `main()` 再顶层调用 | A E G D C B F | A E G **C D** B F（**包了没用**）|
| `main()` 挪进 `setTimeout` | A E G D C B F | A E G D C B F（恢复经典规则）|

配套练习 `src/06-cjs-esm/`（`pnpm 06`）把这几行真实跑给你看。

### 结论与避坑

- **包进 `main()` 并不能恢复经典规则**（2026-08 实测）：`main()` 只是在模块顶层那个微任务上下文里同步执行了一遍，nextTick 照样被 promise 抢跑。**只有把代码挪进一个宏任务**（`setTimeout(() => main(), 0)` / `setImmediate`），才回到"宏任务边界"，nextTick 恢复优先。
- 看到 nextTick 与 Promise 顺序与预期不符时，**先确认文件是 CJS 还是 ESM**。
- 这是模块系统的副作用，不是事件循环规则变了——事件循环的队列优先级（nextTick > 微任务 > 宏任务）始终不变，变的是"顶层登记发生在哪个上下文"。该优先级在**宏任务边界**清算。
- 实操：**别在 ESM 顶层裸写依赖 nextTick 优先级的代码**；要排序就用 promise/await 自己排，别赌 nextTick。

---

## 7. 附：CJS 与 ESM 速查

| 维度 | CommonJS（CJS） | ES Modules（ESM） |
|---|---|---|
| 语法 | `require()` / `module.exports` | `import` / `export` |
| 加载时机 | 运行时，`require` 是普通函数调用 | 编译时静态解析依赖图，求值在微任务上下文 |
| 顶层 `this` | `module.exports`（对象） | `undefined` |
| `__dirname` / `__filename` | 可用 | 不可用，需从 `import.meta.url` 推导 |
| Node 如何识别 | `.cjs`，或默认 | `.mjs`，或 `package.json: "type": "module"` |
| 互相引用 | `require` ESM 不行（要 `await import()`） | `import` CJS 可，但只能整体导入 |

历史：Node 2009 年诞生时 JS 还没有官方模块系统，自创了 CJS 用了十几年。2015 年 ESM 成为语言标准，但生态已有海量 CJS 包，无法一刀切，于是永久双轨。**新项目用 ESM**（未来方向），**读老项目要懂 CJS**。

