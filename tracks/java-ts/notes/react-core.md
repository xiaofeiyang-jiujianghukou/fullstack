# React 核心：Java 开发者视角

> 配套练习：`projects/react-playground/`（`pnpm quiz`，jsdom + @testing-library 真实渲染判定）
> 状态：随阶段 2 推进持续填写

## 0. 心智模型：先扔掉 Java 的直觉

Java（Spring）里一个页面对应一个 Controller 方法：请求来了 → 方法执行一次 → 返回 HTML，完事。**React 相反：组件是随时会被重新调用的函数**。

```
React：  state 变 → 组件函数重新执行（整棵子树） → React 对比新旧 UI → 最小化更新 DOM
Spring： 请求 → Controller 方法执行一次 → 返回视图，结束
```

两条由此推出的铁律：

1. **组件函数体内不要写副作用**（改全局变量、发请求、操作 DOM）——因为它会被反复执行，写几次跑几次。副作用归 `useEffect` 管。
2. **渲染 = f(state, props)**，同样的 state + props 必须渲染出同样的 UI。像纯函数，像 `toString()`——不该每次返回不一样的东西。

---

## 1. useState：状态与重渲染

```tsx
function Counter() {
  const [n, setN] = useState(0)   // 解构：值 + setter，元组返回
  return <p>count: {n}</p>
}
```

- `useState(0)`：首次渲染用 0；之后 React 内部记着最新值，**初始值不再生效**
- 改状态**只能调 `setN(...)`**。直接 `n = 5` 无效——React 感知不到，不会重渲染
- `setN` 触发重渲染：组件函数**从头重新执行**，`useState` 这行再跑到时返回的是**新值**（不是 0）
- 连续多次 `setN(n + 1)` 在同一次渲染里都基于同一个旧 `n`——要叠effect用函数式更新 `setN(prev => prev + 1)`（后续练习验证）

### Java 对照

| | Java | React |
|---|---|---|
| 状态放哪 | 实例字段 `private int n` | `useState` 挂在组件槽位上 |
| 谁持有 | 对象实例（堆上） | React 框架（组件多次重渲染仍是"同一个"） |
| 怎么改 | `this.n = 5` 直接赋值 | 只能 `setN(5)`，赋值无效 |
| 改完之后 | 主动调 view 刷新 | 自动重渲染 |
| 组件"实例" | new 出来的对象 | **没有实例**，只是被反复调用的函数 |

最容易错的一点：Java 程序员觉得组件函数里的局部变量跨调用会保留——**不会**，每次重渲染局部变量全部重算，只有 state 跨渲染保留。

> 配套练习：quiz 题 1（useState 计数器）

---

## 2. props：父传子的只读数据

```tsx
function Greeting({ name }: { name: string }) {   // 解构收 props
  return <p>你好，{name}</p>
}
// <Greeting name="赵六" />
```

- **单向数据流**：`state(父) → props(子) → UI`。父的 state 变 → 父重渲染 → 传给子的 props 变 → 子跟着重渲染
- **子不能改 props**（只读）。子想改，只能调父通过 props 传下来的回调：`onChange(v)` ——父在自己那边 setState
- props 变化不需要 setState 通知子组件，"props 变 → 子重渲染" 是自动的

### Java 对照

| | Java | React |
|---|---|---|
| 传数据给子 | setter：`child.setName(x)`，随时可调、子可改 | props：父渲染时塞入，子只读 |
| 子改父的数据 | 直接拿父引用调方法 | 只能调 props 里的回调函数 |
| 数据方向 | 双向都可（持有引用就行） | 单向：父 → 子 |
| 何时同步 | 手动调用 setter | 自动：父重渲染即重新传 |

一句话：props ≈ 构造器参数 + final 字段（只读），但会随父重渲染自动"重新传入"。

> 配套练习：quiz 题 2（props 父传子）

---

## 3. useEffect：副作用 + 依赖数组

```tsx
useEffect(() => {
  document.title = `count=${n}`
}, [n])        // 依赖数组：只有 n 变才重跑
```

- 执行时机：**渲染到屏幕之后**（不是渲染中，不是渲染前）
- 依赖数组控制重跑：
  - `[n]` → 挂载时跑一次；n 变了再跑；**别的 state 变不跑**
  - `[]` → 只在挂载时跑一次
  - 不写 → 每次渲染后都跑
- 清理函数：`return () => {...}`，在**卸载**或**下一次 effect 执行前**跑（取消订阅/清定时器）

### Java 对照

| | Java | React |
|---|---|---|
| 初始化逻辑 | `@PostConstruct`（构造后执行一次） | `useEffect(fn, [])`（挂载后执行一次） |
| 依赖变化重新执行 | 无对应，需观察者模式手写 | 依赖数组声明式指定 |
| 销毁清理 | `@PreDestroy` | cleanup 函数（return 出去的函数） |
| 执行阶段 | Bean 生命周期回调 | 渲染提交到屏幕**之后**（不阻塞渲染） |

一个反 Java 直觉的点：effect 不在渲染里跑而在**渲染后**跑——为了副作用不阻塞 UI 上屏。所以渲染中读不到 effect 刚写入的值（如 document.title），要等下一次渲染。

> 配套练习：quiz 题 3（useEffect 依赖数组）

---

## 4. 渲染与更新的完整链路（把三者串起来）

```
用户点按钮
  → 事件处理器调 setN
  → React 标记组件"脏了"，调度重渲染
  → 组件函数重新执行：useState 返回新值，props 重新传给子组件
  → React 对比新旧两棵树（diff/协调 reconciliation）
  → 最小化更新真实 DOM
  → 屏幕更新后，跑 useEffect（依赖数组判定要不要跑）
```

注意顺序：**render（函数执行）→ commit（DOM 更新）→ effect**。effect 永远在 DOM 更新之后。

---

## 5. 列表渲染 + key

### 是什么

JSX 里写不了 `for` 循环（JSX 是表达式，语句放不进去）。渲染一组数据的标准做法：用数组的 `.map()`，把每个数据项变成一个 JSX 元素：

```tsx
const todos = [
  { id: 1, text: '学 React' },
  { id: 2, text: '学 Spring' },
]

function TodoList() {
  return (
    <ul>
      {todos.map(t => <li key={t.id}>{t.text}</li>)}
    </ul>
  )
}
```

`key` 是 React 专用的特殊 props：在兄弟列表里标记每个元素的唯一身份。它不渲染到 DOM，纯粹给 diff 算法看。

### 怎么用（三条规则）

1. **兄弟范围内唯一**——同一个列表里不重复；两个不同列表可以用一样的 key
2. **必须稳定**——同一个数据项每次渲染的 key 要相同，所以 `key={Math.random()}` 是大忌
3. **index 当 key 有条件地允许**——仅当列表纯展示、永不插入/删除/排序时

### 为什么需要它（优势的核心）

回忆渲染链路：state 变 → 组件函数重新执行 → React 拿到**新的元素树** → 和旧树 diff → 最小化更新 DOM。问题在 diff 怎么对比列表。假设头部插入一项：

```
旧：[A, B, C]
新：[X, A, B, C]

没有 key：按位置对比——位置0: A→X 更新、位置1: B→A 更新……四行全被判"内容变了"，挨个更新 DOM
有 key：  按身份对比——X 是新的插进来；A/B/C 的 key 还在 → 三个 DOM 节点原样复用，零操作
```

key 的价值 = **让 diff 从「按位置」升级为「按身份」，把 O(n) 次无谓更新降为只动真正变化的节点**。列表越大、操作越频繁，收益越大。

### 劣势 / 坑

- **index 当 key + 有状态子组件 + 列表重排 = 隐性 bug**：React 按 index 复用组件实例时连着 state 一起复用——state 挂在"位置"上而不是"数据"上，行内输入框内容、勾选状态会挂到别的数据头上。不报错、不崩溃，排查成本高
- **依赖稳定 id**：后端不返回主键、或主键会变时方案失效——key 的选择其实是个后端 API 设计问题（DTO 要不要暴露稳定 id）
- **大列表依然慢**：`.map()` 每次重渲染全量重算，diff 也全量跑。万级行要上虚拟化（react-window / TanStack Virtual，只渲染视口内的行）

### 适用场景

- 几十~几百行的动态列表：`.map()` + 稳定业务 id，标准答案
- 纯静态列表：key 给不给都行（挂载后不再变）
- 超大 / 无限滚动：虚拟化 + key

### 与谁搭配

- **useMemo**：过滤/排序等计算包起来，避免无关重渲染时重算（下一个知识点）
- **受控组件**：行内放 `<input>` 时，key 正确是受控状态正确的前提
- **TanStack Query**：真实项目 list 来自服务端，Query 管取数缓存、map+key 管渲染
- **Java 后端**：对应 DTO 的稳定主键——前端 key 方案的地基在后端

### Java 对照

| | Java/Thymeleaf | React |
|---|---|---|
| 遍历渲染 | `th:each` | `{arr.map(...)}` |
| 节点身份 | 无（整段 HTML 重画） | key（diff 按它复用 DOM） |
| 更新粒度 | 整段 | 按 key 增量 |

Thymeleaf 每次都是服务端整段重新生成 HTML；React 靠 key 做增量 DOM 更新——两者渲染模型的本质分野。

> 配套练习：quiz 题 4（key=index vs key=id 的行为差异）

---

## 6. 待学清单（后续填）

- 受控组件：`value` + `onChange` 把表单纳管进 state
- `useMemo` / `useCallback`：跳过昂贵的重计算/稳定引用
- 自定义 hook：把状态逻辑抽出复用（对照 Java 抽工具类/模板方法）
- TanStack Query：服务端状态管理，接 Spring Boot 接口
