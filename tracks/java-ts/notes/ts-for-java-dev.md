# TypeScript：Java 开发者视角

> 配套练习：`projects/playground-ts/src/02-this-binding.ts`、`src/03-structural-typing.ts`、`src/07-generics.ts`
> 状态：随阶段 1 推进持续填写

## 1. 结构化类型 vs 名义类型

- Java 判定类型相同的依据：
- TS 判定类型相同的依据：
- 这带来的**好处**（举一个你自己的例子）：
- 这带来的**风险**（举一个你自己的例子）：

### 品牌类型（branded type）

什么场景下值得用它把名义类型找回来：

> 详见 `src/03-structural-typing.ts` 的完整演示。

---

## 2. 泛型：与 Java 的三差异

概念和 Java 完全一样——**参数化类型**，也有**类型擦除**（运行时无泛型，纯编译期）。学习增量在三处差异：

```ts
function first<T>(arr: T[]): T { return arr[0] }
//        类型参数 ↑     用 T ↑   返回 T ↑
```

### 差异 1：推断无处不在

**Java** 声明侧常要写 `<String>`（或 `var`）：

```java
List<String> list = new ArrayList<>();
```

**TS** 调用处几乎从不写类型参数，整条链一路推断：

```ts
function first<T>(arr: T[]): T { return arr[0] }
const a = first([1, 2, 3])   // a 自动是 number，不用写 first<number>(...)
const b = first(['x', 'y'])  // b 自动是 string
```

体感：TS 泛型代码里很少看到 `<...>` 出现在调用处。

### 差异 2：约束是「结构性」的 ⭐ 最关键

结构类型系统（§1）在泛型上的直接体现。

**Java**（约束到具名类型）：

```java
<T extends Comparable<T>>   // T 必须是实现 Comparable 的具名类
```

**TS**（约束到「形状」）：

```ts
function len<T extends { length: number }>(x: T): number {
  return x.length
}
len("abc")    // ✓ string 有 length
len([1, 2])   // ✓ array 有 length
len({ length: 5 }) // ✓ 任意带 length 的对象（呼应结构类型）
len(123)      // ✗ number 没有 length → 编译报错
```

`extends { length: number }` = 「T 只要有 `length: number` 这个属性就行」，不管叫什么名字、是不是某类的子类。这种「约束到任意形状」是 Java 写不出来的。

> 一句话：Java 的 `extends` 是「**是不是**它的子类」，TS 的 `extends` 是「**长得像不像**这个形状」。

### 差异 3：泛型用在更多地方

Java 开发者容易把泛型等同于 `List<T>` / `Map<K,V>`。TS 里泛型遍布：

| 场景 | 例子 |
|---|---|
| 异步函数 | `function fetchJson<T>(url): Promise<T>` |
| 容器类型 | `type Box<T> = { value: T }` |
| 工具类型 | `Partial<T>` / `Readonly<T>` / `Pick<T,K>` / `Omit<T,K>` |
| React | `useState<T>` / `Component<Props>` |
| 回调签名 | `function map<T, U>(arr: T[], fn: (x: T) => U): U[]` |

`Promise<T>` 你在异步里已经见过——它就是个泛型，`T` 是 resolve 出来的值的类型。

### 速查

| 维度 | Java | TS |
|---|---|---|
| 类型擦除 | 是 | 是（相同）|
| 类型参数推断 | 有限 | 极强，调用处几乎不写 |
| 约束 `extends` | 名义（子类 / 实现接口）| 结构（有这些属性就行）|
| 主要用武之地 | 集合为主 | 函数 / Promise / 工具类型 / 组件，无处不在 |

> 配套练习：`src/07-generics.ts`（`pnpm 07`），靠 `tsc` 真实类型检查判定。

---

## 3. `this` 的动态绑定

- 判断 `this` 指向的口诀：
- 什么情况下会丢失 `this`：
- 三种解法及各自适用场景：

Java 里为什么不存在这个问题：

> 详见 `notes/js-this-binding.md` 与 `src/02-this-binding.ts`。

---

## 4. 其他与 Java 的关键差异

跑练习或看文档过程中遇到的，随手记：

| 主题 | Java | TS | 备注 |
|---|---|---|---|
| 泛型擦除 | 是 | 是 | 运行时（JS）无泛型，纯编译期；Node 靠擦除直接跑 `.ts` |
| `null` / `undefined` | | | |
| 接口的作用 | | | |
| 枚举 | | | |

### int ↔ String：语言层一样严，差异在「谁在转」

| 层 | Java | TS |
|---|---|---|
| 语言层赋值 `String s = 5` | 编译错误 | 编译错误（一样严）|
| 框架层（JDBC / MyBatis）| 运行时默默转，编译器看不见 | 无等价物，要你显式转 |
| DB 层（MySQL `'1' = 1` 隐式转换）| DB 行为，与语言无关 | 同 |

「Java 的 int 和 String 能转」其实是 **JDBC / MyBatis / MySQL 在背后转**，不是 Java 语言允许互赋（`String s = 5` 在 Java 里同样是编译错误）。

TS / 前端世界没有这条「隐式转换传送带」：数据从 API 边界进来就是 `any` / `unknown`，类型全靠自己在边界校验（`zod` / `valibot` 等运行时校验库）。语言层两边一样严，差异在「转换发生在哪、谁负责」。

---

## 5. 类型只存在于编译期

Node 靠"类型擦除"直接运行 `.ts`，这说明了什么？
`erasableSyntaxOnly` 禁掉了哪些语法，为什么这些语法不可擦除：

---

## 6. 遗留疑问
