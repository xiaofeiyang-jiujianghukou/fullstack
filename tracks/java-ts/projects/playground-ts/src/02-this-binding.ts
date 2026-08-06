/**
 * 练习 2：this —— Java 开发者最容易栽的坑
 *
 * 运行：pnpm 02
 *
 * Java 里 this 永远指向「当前实例」，由编译期绑定，不可能出错。
 * JS 里 this 取决于「函数怎么被调用」，同一个函数在不同调用方式下 this 不同。
 */

class Counter {
  count = 0

  // 普通方法：this 由调用点决定
  increment() {
    this.count++
    return this.count
  }

  // 箭头函数属性：this 在定义时就锁定为实例（词法绑定）
  incrementArrow = () => {
    this.count++
    return this.count
  }
}

const counter = new Counter()

// ① 正常调用：this === counter
console.log('① 方法调用：', counter.increment()) // 1

// ② 把方法「摘下来」单独调用 —— 这是 Java 里不存在的场景
const detached = counter.increment
try {
  detached() // this 变成 undefined（class 内部是严格模式）
} catch (err) {
  console.log('② 摘下来调用：', (err as Error).message)
}

// ③ 箭头函数属性：摘下来也没事
const detachedArrow = counter.incrementArrow
console.log('③ 箭头函数属性：', detachedArrow()) // 2

// ④ 显式绑定：Java 里没有对应物
const bound = counter.increment.bind(counter)
console.log('④ bind 之后：', bound()) // 3

// ⑤ 真实场景：回调。这是 React 里最常踩的形态
function runCallback(fn: () => number) {
  return fn() // 调用点在这里，与 counter 无关了
}
try {
  runCallback(counter.increment) // 同样丢失 this
} catch (err) {
  console.log('⑤ 作为回调传递：', (err as Error).message)
}
console.log('⑤ 改传箭头函数属性：', runCallback(counter.incrementArrow)) // 4

/**
 * 判断 this 的口诀：看「点号左边是谁」。
 *   counter.increment()  → 点号左边是 counter，this = counter
 *   detached()           → 没有点号，this = undefined
 *
 * 实践中的解法（React 时代基本只用后两种）：
 *   1. 箭头函数属性（如上 incrementArrow）
 *   2. 调用时包一层：() => counter.increment()
 *   3. 直接用函数组件 + hooks，从根本上绕开 this
 *
 * 记住这个坑的形状即可 —— 现代 React 几乎不写 class，
 * 但你在读老代码、Node 回调、事件监听器里一定会撞见它。
 */
