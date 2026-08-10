# JS this 绑定：从 Java 的编译期绑定到运行时的调用点

> 配套练习：
> - `projects/playground-ts/src/02-this-binding.ts`（五个真实案例，`pnpm 02`）
> - `projects/playground-ts/src/05-exam.ts` 题 5（this + Promise 链）

---

## 1. 观念切换：this 是调用时决定的

Java 里 `this` 编译期就绑定到「当前实例」，无论怎么调用都指向它，不可能丢。
JS 里 `this` 不是函数自带的属性，而是**运行时由调用方式决定**。

同一个函数，三种调法，三种 `this`：

```js
function who() { console.log(this) }
const obj = { who }

obj.who()   // this = obj   （方法调用，点号左边）
who()       // this = undefined（裸调用，没有点号；严格模式）
who.call(obj) // this = obj （显式绑定）
```

---

## 2. 判定口诀

> 普通函数的 this = 调用那一刻「点号左边是谁」。

只记这一句，能解掉 90% 的问题。点号左边没有东西，this 就是 undefined。

---

## 3. 四种调用方式

| 调用方式 | this | 例子 |
|---|---|---|
| 方法调用 `obj.method()` | 点号左边那个对象 | `counter.increment()` |
| 裸调用 `fn()` | `undefined`（严格模式）| `const m = obj.m; m()` |
| 显式绑定 `fn.call(o)` / `.apply` / `.bind(o)` | 传进去的对象 | `fn.bind(counter)` |
| 构造调用 `new F()` | 新建的实例 | `new Counter()` |

**严格模式**：ES 模块（`type: "module"`）和 class 内部**一律严格模式**，裸调用 this 恒为 `undefined`，不会回落全局对象。所以实际代码里「裸调用 = this 是 undefined」是常态。

---

## 4. 回调里为什么丢 this（最容易栽的坑）

```js
class Loader {
  data = 0
  load() {
    return Promise.resolve().then(function () {
      this.data++   // ← 这里 this 是谁？
    })
  }
}
```

`.then` 拿到这个回调后，内部是**裸调用** `fn()` —— 没有点号，this = `undefined`。
`undefined.data++` → TypeError，Promise 链直接进失败轨道。

**摘下来就丢**：`const m = obj.method; m()` 或者传给 `.then` / 事件监听器，
函数本身没变，但调用点变了，this 就变了。这是 Java 里不存在、JS 里天天踩的场景。

---

## 5. 箭头函数：词法锁定，摘不下来

箭头函数**没有自己的 this**，定义时就把外层的 this 锁死了（词法作用域）。

```js
loadArrow() {
  return Promise.resolve().then(() => {
    this.data++      // this = 定义时外层的 this，即实例
  })
}
```

无论摘下来、传给回调、当参数，this 都不丢。React 时代的主流写法。

---

## 6. 与 Java 对照

| 维度 | Java | JS 普通 function | JS 箭头函数 |
|---|---|---|---|
| this 决定时机 | 编译期 | 调用时（看调用点）| 定义时（词法锁定）|
| 摘下来当回调 | 不丢 | **丢**（undefined）| 不丢 |
| 绑定方式 | 编译器强制 | 运行时推导 | 闭包捕获 |

---

## 7. 实操结论

- 判断 this：先看**是不是箭头函数** → 不是就看**调用点有没有点号**。
- 回调里要用实例，三种解法：箭头函数 / `bind` / 调用时包一层 `() => obj.method()`。
- 现代 React 几乎不写 class，用函数组件 + hooks 从根本上绕开 this；但读老代码、
  Node 回调、事件监听器时一定会撞见它，口诀足够应付。
