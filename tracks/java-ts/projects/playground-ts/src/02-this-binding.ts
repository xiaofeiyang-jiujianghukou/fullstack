/**
 * 练习 2（交互版）：this —— Java 开发者最容易栽的坑
 *
 * 运行：pnpm 02
 *
 * 每题先展示代码，你预测输出，程序再真跑对比。
 * 预测格式：结果是值就填值（如 1），抛错就填 e（error）。
 * 答案零硬编码 —— 全部由真实运行收集，展示的代码 = 运行的行为。
 *
 * Java 里 this 编译期绑定实例，不可能变；JS 里 this 由「调用点」决定。
 * 口诀：普通函数 this = 调用那一刻「点号左边是谁」。
 */

import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const line = '═'.repeat(60)

async function ask(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  try {
    return await rl.question(prompt)
  } catch {
    return ''
  }
}

class Counter {
  count = 0
  increment() {
    this.count++
    return this.count
  }
  incrementArrow = () => {
    this.count++
    return this.count
  }
}

/** 真跑一段代码：成功返回其返回值字符串，抛错统一返回 'e'。 */
function safe(fn: () => unknown): string {
  try {
    return String(fn())
  } catch {
    return 'e'
  }
}

const runCallback = (fn: () => number) => fn()

const INTRO_CODE = `
class Counter {
  count = 0
  increment() { this.count++; return this.count }
  incrementArrow = () => { this.count++; return this.count }
}
const counter = new Counter()
`.trim()

// 每个案例：code 是展示用的真实代码，run 是逐行对应的真实运行。
// 注意共享同一个 counter —— 状态按顺序流动（1 → 2 → 3 → 4）。
const counter = new Counter()
let detached: (() => number) | undefined
let detachedArrow: (() => number) | undefined

const CASES: { title: string; code: string; run: () => string; explain: string }[] = [
  {
    title: '方法调用',
    code: `counter.increment()   // 输出？`,
    run: () => safe(() => counter.increment()),
    explain: `
  点号左边是 counter → this = counter。
  count 0 → 1，返回 1。这是唯一一种「跟 Java 差不多」的调法。
  `,
  },
  {
    title: '把方法摘下来，裸调用',
    code: `const detached = counter.increment
detached()          // 输出？`,
    run: () => {
      detached = counter.increment
      return safe(() => detached!())
    },
    explain: `
  detached() 没有点号 → this = undefined。
  undefined.count++ → TypeError。口诀：点号左边是谁？
  函数没变，调用点变了，this 就没了 —— Java 里不存在这种场景。
  `,
  },
  {
    title: '箭头函数属性，摘下来',
    code: `const detachedArrow = counter.incrementArrow
detachedArrow()     // 输出？`,
    run: () => {
      detachedArrow = counter.incrementArrow
      return safe(() => detachedArrow!())
    },
    explain: `
  箭头函数没有自己的 this，定义时锁定外层（counter）。
  count 1 → 2，返回 2。摘下来当回调也不丢。
  `,
  },
  {
    title: '显式绑定',
    code: `counter.increment.bind(counter)()   // 输出？`,
    run: () => safe(() => counter.increment.bind(counter)()),
    explain: `
  bind(counter) 把 this 显式钉在 counter 上。
  count 2 → 3，返回 3。call / apply / bind 是「手动指定 this」的手段。
  `,
  },
  {
    title: '作为回调传递（真实场景）',
    code: `function runCallback(fn) { return fn() }
runCallback(counter.increment)   // 输出？`,
    run: () => safe(() => runCallback(counter.increment)),
    explain: `
  runCallback 内部是 fn() 裸调用 → this = undefined → TypeError。
  和案例 ② 同一个坑：回调函数被引擎/库内部裸调，this 就丢了。
  `,
  },
  {
    title: '改传箭头函数属性',
    code: `runCallback(counter.incrementArrow)   // 输出？`,
    run: () => safe(() => runCallback(counter.incrementArrow)),
    explain: `
  箭头锁定外层 this，传给回调也不丢。
  count 3 → 4，返回 4。
  `,
  },
]

// ─── 交互 ───────────────────────────────────────────────

const rl = createInterface({ input, output })

console.log(`\n${line}\n  this 动态绑定 · 交互练习\n${line}`)
console.log('  先看类定义，然后每个案例：看代码 → 预测输出 → 程序真跑对比。')
console.log('  预测格式：值是数字就填数字（如 1），抛错就填 e，回车跳过。\n')
console.log(INTRO_CODE)
console.log('  注意：counter 只有一个，count 一路累加；②⑤ 在 count 改变前就抛错，count 不变。')
console.log(line)

let score = 0

for (const c of CASES) {
  console.log(`\n${line}\n  案例：${c.title}\n${line}`)
  console.log(c.code)
  console.log(line)

  const guess = (await ask(rl, '  预测输出 > ')).trim().toLowerCase()
  const actual = c.run()

  console.log(`  实际输出：${actual === 'e' ? 'e（抛错 TypeError）' : actual}`)
  if (guess === '') {
    console.log('  （你跳过了预测）')
  } else if (guess === actual) {
    console.log('  ✓ 全对')
    score++
  } else {
    console.log(`  ✗ 你猜 ${guess}，实际是 ${actual === 'e' ? 'e（抛错）' : actual}`)
  }
  console.log(c.explain)
}

rl.close()

console.log(`${line}\n  本轮：${score} / ${CASES.length} 全对\n${line}`)
if (score === CASES.length) {
  console.log('  this 的坑你已经摸清了。判断流程：')
} else {
  console.log('  回看错的那几题。判断流程（背下来）：')
}
console.log(`
  1. 这个函数是不是箭头函数？是 → this 锁在定义处，不丢。
  2. 不是 → 看调用点：有没有点号？点号左边是谁，this 就是谁。
  3. 回调里要用实例，三种解法：箭头函数 / bind / 包一层 () => obj.method()。
`)
