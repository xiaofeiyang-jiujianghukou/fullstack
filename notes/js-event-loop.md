# JS 事件循环与异步模型

跨路线通用参考（所有全栈路线的前端都是 JS）。面向有后端/多线程背景的读者，全程与 Java 对照。

配套交互练习：`tracks/java-ts/projects/playground-ts/`（`pnpm quiz`、`pnpm quiz2`）
个人学习笔记：`tracks/java-ts/notes/js-async-model.md`

---

## 速查

**调度规则**

```
┌─→ 取【一个】宏任务，执行
│        ↓
│   清空【整个】微任务队列（期间新产生的微任务，本轮一并清完）
│        ↓
│   （浏览器）渲染页面
│        ↓
└───────┘  下一轮
```

Node 多一条队列，优先级：**`process.nextTick` > 微任务 > 宏任务**

**队列成员**

| 宏任务（规范称 task） | 微任务（microtask） |
|---|---|
| `setTimeout` / `setInterval` | `Promise.then / catch / finally` |
| I/O 完成回调 | **`await` 之后的代码** |
| UI 事件（click、scroll） | `queueMicrotask` |
| `setImmediate`（Node） | `MutationObserver`（浏览器） |
| **script 本身**（首次执行的整个脚本） | `process.nextTick`（Node，独立队列，优先级更高） |

**核心判断**

- 普通函数调用**永远不产生任务**，只是压栈出栈
- `async` 函数体是**同步执行**的，直到撞上第一个 `await`
- `await` 之后的代码 = `.then` 里的代码 = 微任务
- 微任务是「清空」，宏任务是「取一个」

---

## 1. 为什么需要事件循环

JS 是单线程的——只有一个线程既要执行代码，又要渲染页面、响应交互。

后端可以「一个请求一个线程」，遇到 IO 就阻塞等待，反正还有别的线程在跑。前端不行：唯一的线程一旦阻塞，页面就冻结。

所以 JS 选了另一条路：**遇到耗时操作不等待，登记一个回调就继续往下走；结果就绪后，把回调放进队列排队执行**。事件循环就是那个不停从队列取任务来执行的调度器。

**一句话**：Java 靠多线程实现并发，JS 靠任务队列实现并发。前者是真并行，后者只是快速轮转——**任何时刻只有一段 JS 在跑**。

---

## 2. 调用栈 vs 任务队列

最容易混淆的两个机制：

```
调用栈 (Call Stack)              任务队列 (Task Queue)
────────────────────            ─────────────────────
函数调用进出的地方                 等待被执行的回调
同步执行，立即压栈                 得等栈清空才被取出
loop()、console.log() 在这        setTimeout 的回调在这
```

**判断标准很硬：普通函数调用不产生任务。** 只有这几类东西才往队列里塞：

- 往宏任务队列塞：`setTimeout`、`setInterval`、I/O 回调、UI 事件
- 往微任务队列塞：`Promise.then`、`queueMicrotask`、`await` 之后的代码

同一个函数可以有两种到达方式：

```js
loop()                            // 同步调用 —— 在栈上执行
Promise.resolve().then(loop)      // 登记 —— 进微任务队列排队
```

---

## 3. 宏任务与微任务

### 为什么要分两种

最初只有一条队列，循环是：`取一个任务 → 执行 → 渲染 → 取下一个`。**任务之间会穿插渲染**，这是合理设计——一个任务跑得久，至少任务之间能让页面更新。

Promise 出现后，如果 `.then` 用宏任务实现：

```js
fetchUser()
  .then(user => 处理)      // 任务A，之后可能渲染
  .then(data => 再处理)    // 任务B，之后可能渲染
  .then(r => 更新界面)     // 任务C
```

三步会被拆散，中间可能穿插渲染（界面闪烁），还可能被别的任务插队。

于是需要一种机制：**「这些活儿属于当前这轮工作的收尾，必须一口气做完，做完前不许渲染、不许插队。」** 这就是微任务。

### 定义

- **宏任务 = 一个独立的工作单元**
- **微任务 = 当前工作单元的收尾动作**

**Java 类比**：微任务很像 Spring 的 `TransactionSynchronization.afterCommit` 钩子——属于**这次事务**的收尾，紧接着执行完，而不是作为新事务重新排队。

### 术语澄清

**规范里没有「宏任务」这个词。** HTML 规范只定义了 `task` 和 `microtask`，「macrotask / 宏任务」是社区为对称造的俗称。查规范请搜 `task queue`。

---

## 4. 微任务饿死宏任务

「取一个」vs「全部清空」的区别，带来一个危险后果：

**微任务里不断产生新微任务 → 队列永远清不空 → 宏任务永远轮不到 → 页面彻底卡死。**

```js
let count = 0
setTimeout(() => console.log('宏任务终于执行了！'), 0)

function loop() {
  if (++count < 1_000_000) {
    Promise.resolve().then(loop)   // 微任务里再生微任务
  } else {
    console.log('微任务跑完了，共', count, '次')
  }
}
loop()
```

实测输出（Node 24）：

```
同步代码结束                    (0ms)
微任务跑完了，共 1000000 次      (31ms)
宏任务终于执行了！               (32ms)   ← 最后
```

100 万次微任务只花 31ms，说明调度本身极轻量。但反过来看更要紧：**在浏览器里这 31ms 是完全冻结的**——不渲染、不响应点击。真实代码里每个微任务哪怕只做一点事，时间就会爆炸，页面直接假死。

而宏任务里不断产生宏任务不会这样——每个之间还能渲染，页面仍有反应。这也是**把重计算切成 `setTimeout` 分片**能缓解卡顿的原理。

---

## 5. async / await

### 词源（最常见的误解）

- **sync** = synchronous = 同步
- **async** = **a**synchronous = **异步**（`a-` 是否定前缀，同 atypical、asymmetric）

`async function` 是**异步函数**，含义是「不保证立刻给你结果」。

### 两者是搭档，不是对立

**`async`——声明/标记**，加在函数上做两件事：

1. 让函数**永远返回 Promise**（哪怕 `return 1`，拿到的也是 `Promise<number>`）
2. 解锁在函数内使用 `await` 的权限

有点像 Java 方法签名上的 `throws`——本身不干活，只改变函数的契约。

**`await`——真正干活的操作符**，写在 Promise 前，意为「停在这里，等它有结果，把结果取出来」。

### 核心：「等」的到底是谁

**只有那个函数在等，线程一秒都没等。**

```js
async function loadUser() {
  console.log('1  开始请求')
  const user = await fetch('/api/user')   // 在这里"等"
  console.log('3  数据回来了')
}

loadUser()
console.log('2  我先跑了')
```

输出 **1 → 2 → 3**。`2` 抢在 `3` 前面，证明等待期间线程回去执行别的代码了。

两种「等」必须分清：

| | 谁在等 | 后果 |
|---|---|---|
| **用户在等** | 网络就是慢，数据 2 秒才回 | 物理限制，躲不掉 |
| **线程在等** | 主线程停着什么都不干 | **灾难**——页面冻结 2 秒 |

`await` 消除的是第二种。

### await 的真身就是 .then

```js
// 完全等价
async function f() {
  const a = await getA()
  console.log(a)
}

function f() {
  return getA().then(a => console.log(a))
}
```

`async/await` 是 Promise 的**语法糖**，让异步代码长得像同步代码。这直接解释了「为什么 await 之后是微任务」——它本来就是 `.then`。

### 一个细节

```js
await null    // 等的压根不是异步操作
```

「把剩余代码转成微任务」这个动作照做不误。**`await` 的语义不是「等异步完成」，而是「到此切一刀」。**

---

## 6. 与 Java 对照

```java
String result = future.get();   // 线程停在这，站着干等
```
```js
const result = await promise;   // 函数暂停，线程立刻去干别的
```

| | Java `future.get()` | JS `await` |
|---|---|---|
| 谁被挂起 | **线程** | **只有这个函数** |
| 线程能否干别的 | 不能，占着 | 能，立刻回事件循环 |
| 1000 并发请求 | 传统模型要 1000 个线程 | 0 个额外线程 |

**与 Java 21 虚拟线程的关系**：虚拟线程解决的正是同一个问题——让「阻塞」变廉价，阻塞时释放底层载体线程。

**两者殊途同归**，区别在于：JS 让你显式写 `await`（异步可见），Java 虚拟线程让你继续写阻塞代码（异步被隐藏）。这个对比在选型讨论中很有价值，见 `tracks/java-ts/evaluation.md` 的待验证项。

---

## 7. 常见陷阱

### 串行 vs 并发（最高频的性能问题）

```js
// ❌ 串行：总耗时 = A + B = 3 秒
const a = await fetchA()   // 等 1 秒
const b = await fetchB()   // 再等 2 秒

// ✓ 并发：总耗时 = max(A, B) = 2 秒
const [a, b] = await Promise.all([fetchA(), fetchB()])
```

**判断标准：B 不依赖 A 的结果，就绝不该串行 await。**

### 其他

- 长时间同步计算会卡死整个页面（不只是「当前请求」）——切片或丢给 Web Worker
- `setTimeout(fn, 0)` 不是「立即执行」，是「尽快排队」
- Node 的 `process.nextTick` 在浏览器不存在，代码不能无脑互搬

---

## 8. 练习题解析

> ⚠️ **剧透警告**：本节包含 `pnpm quiz` / `pnpm quiz2` 的答案。没做过题的话，先去做题，再回来对照。

### 第一关（`pnpm quiz`）

```js
console.log('A  同步开始')
setTimeout(() => {
  console.log('B  setTimeout 回调')
  Promise.resolve().then(() => console.log('C  B 里面的 Promise'))
}, 0)
Promise.resolve().then(() => {
  console.log('D  Promise 回调')
  setTimeout(() => console.log('E  D 里面的 setTimeout'), 0)
})
queueMicrotask(() => console.log('F  queueMicrotask'))
console.log('G  同步结束')
```

**答案：A → G → D → F → B → C → E**

1. 同步跑完 → A、G（登记回调是同步动作，瞬间完成）
2. 清空微任务 → D、F（D 内部登记的 setTimeout E 排到宏任务队尾）
3. 取一个宏任务 → B（内部登记微任务 C）
4. ★ **每个宏任务后强制清空一次微任务** → C
5. 取下一个宏任务 → E

**考点**：C 紧跟 B，而不是等 E 之后。

### 第二关（`pnpm quiz2`）

```js
console.log('A  同步开始')
setTimeout(() => console.log('B  setTimeout'), 0)
process.nextTick(() => console.log('C  nextTick'))
async function task() {
  console.log('D  async 函数体')
  await null
  console.log('E  await 之后')
}
task()
Promise.resolve().then(() => console.log('F  Promise.then'))
console.log('G  同步结束')
```

**答案：A → D → G → C → E → F → B**

1. 同步阶段 → A、**D**、G（★ async 函数体同步执行，撞到 `await` 才停）
2. 清 nextTick 队列 → C（优先级最高）
3. 清微任务队列，按登记先后 → E、F（`task()` 先于 `Promise.resolve()` 调用）
4. 取宏任务 → B

**考点**：D 在 G 之前；C 在所有微任务之前。

---

## 9. 典型错误心智模型

以下是后端背景读者最常见的三处偏差：

| 错误想法 | 实际 |
|---|---|
| 「`setTimeout` / `.then` 会阻塞，后面的代码要等」 | 登记回调是**同步瞬时**动作，同步代码一口气跑到底 |
| 「按代码书写顺序执行」 | 由**登记时机 + 队列类型**决定，与书写位置和嵌套无关 |
| 「嵌套里注册的任务会紧接着执行」 | 排到对应队列的**末尾**去等 |

根因都是同一个：**用「执行流」思维看代码（这行完了下一行），而 JS 需要「队列调度」思维。**
