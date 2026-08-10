/**
 * 综合模考（交互式）：事件循环 + async/await + Promise 链
 *
 * 运行：pnpm exam
 *
 * 范式严格参照 01-quiz / 01-quiz-2：
 *   · 题面 CODE（展示用字符串）和 run() 里的 rec() 逻辑逐行对应
 *   · 代码里的字母就是实际输出的字母 —— 你输入的就是你看到的
 *   · 答案零硬编码，全部由真实运行收集
 *   · 跑完给逐位对比 + 逐步推演
 *
 * 防蒙：靠题目本身的输出顺序反直觉（跳过、插队、交错），
 *       而不是搞字母翻译。蒙 ABC 在每道题都会挂。
 */

import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const line = '═'.repeat(60)
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** 包一层 rl.question，管道喂入或 stdin 提前关闭时返回空串而不是抛错。 */
async function ask(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  try {
    return await rl.question(prompt)
  } catch {
    return ''
  }
}

// ════════════════════════════════════════════════════════
//  题 1：await 把后半段切成微任务 —— 看似顺序，实则插队
//  （反直觉点：B 不是第二个输出。async 函数体同步跑、await 切微任务、
//   两条 await 链相互交错，蒙 ABCD 必错。）
// ════════════════════════════════════════════════════════

const Q1_CODE = `
async function f() {
  console.log('A')
  await Promise.resolve()
  console.log('B')
}
console.log('C')
f()
console.log('D')
`.trim()

async function q1(): Promise<string[]> {
  const out: string[] = []
  const rec = (s: string) => out.push(s)

  async function f() {
    rec('A') // ← console.log('A')
    await Promise.resolve()
    rec('B') // ← console.log('B')
  }
  rec('C') // ← console.log('C')
  f() // ← f()
  rec('D') // ← console.log('D')

  await sleep(30)
  return out
}

const Q1_EXPLAIN = `
  【同步阶段】一口气跑完
    · C（外层第一句）
    · f() 调用：async 函数体同步执行 → A
      撞上 await，把 B 切成微任务，函数立刻返回（不等 B）
    · D（外层最后一句）

  【同步栈清空】清空微任务队列
    · B

  实际顺序：C → A → D → B
  反直觉点：B 排在最后。因为它被 await 切成了微任务，
            要等同步代码（包括 D）全跑完才轮到它。
  蒙 ABCD / CDAB 都会挂 —— 必须知道 B 是微任务、垫底。
`

// ════════════════════════════════════════════════════════
//  题 2：链式恢复后再抛错
// ════════════════════════════════════════════════════════

const Q2_CODE = `
Promise.resolve()
  .then(() => { console.log('A'); throw new Error('x') })
  .catch(() => console.log('B'))
  .then(() => { console.log('C'); throw new Error('y') })
  .then(() => console.log('D'))
  .catch(() => console.log('E'))
  .finally(() => console.log('F'))
`.trim()

async function q2(): Promise<string[]> {
  const out: string[] = []
  const rec = (s: string) => out.push(s)

  await Promise.resolve()
    .then(() => {
      rec('A')
      throw new Error('x')
    })
    .catch(() => rec('B'))
    .then(() => {
      rec('C')
      throw new Error('y')
    })
    .then(() => rec('D'))
    .catch(() => rec('E'))
    .finally(() => rec('F'))

  return out
}

const Q2_EXPLAIN = `
  两条轨道：成功走 .then，失败走 .catch。

  · A 后 throw 'x'     → 切失败轨道
  · B（catch 正常返回）→ 切回成功轨道 ★ 恢复点
  · C 后 throw 'y'     → 再切失败轨道
  · D（成功轨道专用）→ 当前是失败轨道，跳过 ★ D 不打印
  · E（catch）         → 处理失败
  · F（finally）       → 两条轨道都跑

  实际顺序：A → B → C → E → F（D 被跳过）
  反直觉点：D 在代码里写着，却永远不执行。蒙 ABCDEF 必错。
`

// ════════════════════════════════════════════════════════
//  题 3：nextTick vs 微任务 vs 宏任务，await 一个 pending
// ════════════════════════════════════════════════════════

const Q3_CODE = `
console.log('A')                                   // start
setTimeout(() => console.log('B'))                 // timeout
Promise.resolve().then(() => console.log('C'))     // promise
process.nextTick(() => console.log('D'))           // nextTick
async function a() {
  console.log('E')                                 // a-body
  await new Promise(r => setTimeout(r, 0))         // pending
  console.log('F')                                 // a-after
}
a()
console.log('G')                                   // end
`.trim()

async function q3(): Promise<string[]> {
  const out: string[] = []
  const rec = (s: string) => out.push(s)

  rec('A') // start
  setTimeout(() => rec('B'), 0) // timeout
  Promise.resolve().then(() => rec('C')) // promise
  process.nextTick(() => rec('D')) // nextTick
  async function a() {
    rec('E') // a-body
    await new Promise<void>((r) => setTimeout(r, 0))
    rec('F') // a-after
  }
  a()
  rec('G') // end

  await sleep(30)
  return out
}

const Q3_EXPLAIN = `
  【同步阶段】
    A（start）
    a() 调用：函数体同步执行 → E（a-body）
      撞上 await pending Promise：F（a-after）挂在那个 Promise 上，
      要等里面的 setTimeout 触发 resolve 才入队
    G（end）
    期间登记：宏任务 B、微任务 C、nextTick D

  【同步栈清空】ESM 顶层 = 微任务上下文（06 练习验证过）
    · C（promise）先于 D（nextTick）   ← 与经典规则相反，这是特例

    为什么：ESM 模块求值本身跑在一条微任务链里，顶层代码在微任务
    上下文求值，顶层登记的 promise 会抢在 nextTick 前面。
    经典规则（nextTick > 微任务）只在【宏任务边界】成立。
    同一段代码 CJS 下输出 D → C（经典规则），见 06-cjs-esm 练习。

  【取宏任务】
    · B（外层 timeout）
    · 还有第二个宏任务：a() 里那个 setTimeout resolve 了 Promise
      → F 此时才入队 → 清微任务 → F

  实际顺序（ESM，本程序跑出来的）：A → E → G → C → D → B → F
  反直觉点 1：C 在 D 前 —— ESM 顶层特例（CJS 下会反过来）。
  反直觉点 2：F 排在 B 后面 —— await pending，后半段落到最后。
  蒙 ABCDEFG 必错，错位能错好几个。
`

// ════════════════════════════════════════════════════════
//  题 4：多个 await 串行，每个都切一刀
// ════════════════════════════════════════════════════════

const Q4_CODE = `
async function seq() {
  console.log('A')
  await 1
  console.log('B')
  await 2
  console.log('C')
}
seq()
Promise.resolve().then(() => console.log('D'))
Promise.resolve().then(() => console.log('E'))
console.log('F')
`.trim()

async function q4(): Promise<string[]> {
  const out: string[] = []
  const rec = (s: string) => out.push(s)

  async function seq() {
    rec('A')
    await 1
    rec('B')
    await 2
    rec('C')
  }
  seq()
  Promise.resolve().then(() => rec('D'))
  Promise.resolve().then(() => rec('E'))
  rec('F')

  await sleep(30)
  return out
}

const Q4_EXPLAIN = `
  【同步阶段】
    seq() 调用：函数体同步 → A
      撞上 await 1（已完成），把 B 及之后切成微任务 M1，入队
    D 的 .then 入队（M2）
    E 的 .then 入队（M3）
    F

    微任务队列：[M1(B→await→C), M2(D), M3(E)]

  【清空微任务】按入队顺序执行，新产生的微任务排到队尾
    · M1：B 输出，撞上 await 2，把 C 切成 M4 入队
      队列变成：[M2(D), M3(E), M4(C)]
    · M2：D
    · M3：E
    · M4：C

  实际顺序：A → F → B → D → E → C
  反直觉点：C 排在 D、E 后面。直觉上 seq 里 B→C 连着，
            但中间每个 await 都让出位置，D、E 就插进来了。
`

// ════════════════════════════════════════════════════════
//  题 5：this + Promise 链（两道单选）
// ════════════════════════════════════════════════════════

const Q5_CODE = `
class Loader {
  data = 0
  load() {
    return Promise.resolve().then(function () {
      this.data++            // 普通函数，this 是？
      return this.data
    })
  }
  loadArrow() {
    return Promise.resolve().then(() => {
      this.data++
      return this.data
    })
  }
}
const l = new Loader()
l.load().then(v => console.log('load:', v))
       .catch(e => console.log('load-err:', e.message))
l.loadArrow().then(v => console.log('loadArrow:', v))
             .catch(e => console.log('loadArrow-err:', e.message))
`.trim()

async function q5(): Promise<{
  loadOk: boolean
  loadVal?: number
  loadArrowOk: boolean
  loadArrowVal?: number
}> {
  class Loader {
    data = 0
    load() {
      return Promise.resolve().then(function (this: unknown) {
        const self = this as { data: number }
        self.data++
        return self.data
      })
    }
    loadArrow() {
      return Promise.resolve().then(() => {
        this.data++
        return this.data
      })
    }
  }
  const l = new Loader()

  let loadOk = false
  let loadVal: number | undefined
  await l.load()
    .then((v) => {
      loadOk = true
      loadVal = v
    })
    .catch(() => {})

  let loadArrowOk = false
  let loadArrowVal: number | undefined
  await l.loadArrow()
    .then((v) => {
      loadArrowOk = true
      loadArrowVal = v
    })
    .catch(() => {})

  return { loadOk, loadVal, loadArrowOk, loadArrowVal }
}

const Q5_EXPLAIN = `
  【load() —— 普通 function 作 .then 回调】
    普通函数的 this 由"调用点"决定。.then 内部调用这个回调时，
    没有把它当对象方法调用（没有点号左边），所以 this 是 undefined。
    undefined.data++ → TypeError，进失败轨道。
    结果：load-err（this 丢失）

  【loadArrow() —— 箭头函数作 .then 回调】
    箭头函数没有自己的 this，沿用定义时外层的 this（即实例 l）。
    this.data++ 正常。结果：loadArrow: 1

  ★ 对照 Java：Java 的 this 编译期绑定到实例，不可能丢。
    JS 普通 function 的 this 由运行时调用点决定，摘下来当回调就丢。
    箭头函数用词法 this 锁定，是 React 时代的主流写法。
`

// ════════════════════════════════════════════════════════
//  通用：顺序题的交互
// ════════════════════════════════════════════════════════

function compare(actual: string[], guess: string[]): boolean {
  if (guess.length !== actual.length) return false
  for (let i = 0; i < actual.length; i++) {
    if (guess[i] !== actual[i]) return false
  }
  return true
}

function firstDiff(actual: string[], guess: string[]): number {
  for (let i = 0; i < actual.length; i++) {
    if (guess[i] !== actual[i]) return i
  }
  return -1
}

async function askOrder(
  rl: ReturnType<typeof createInterface>,
  id: string,
  hint: string,
  code: string,
  run: () => Promise<string[]>,
  explain: string,
): Promise<boolean> {
  console.log(`\n${line}\n  ${id}\n${line}`)
  console.log(`  提示：${hint}`)
  console.log(code)
  console.log(line)

  const raw = await ask(rl, '  你的预测 > ')
  const guess = raw
    .toUpperCase()
    .split('')
    .filter((c) => c >= 'A' && c <= 'Z')

  const actual = await run()

  console.log(`\n  实际输出：${actual.join(' → ')}`)
  if (guess.length === 0) {
    console.log('  （你跳过了本题）')
    console.log(explain)
    return false
  }
  console.log(`  你的预测：${guess.join(' → ')}`)

  if (compare(actual, guess)) {
    console.log('  ✓ 全对')
  } else {
    const diff = firstDiff(actual, guess)
    if (diff === -1) {
      console.log(`  ~ 前面都对，但少写了 ${actual.length - guess.length} 个`)
    } else {
      console.log(
        `  ✗ 第 ${diff + 1} 位错：你猜 ${guess[diff] ?? '(空)'}，实际是 ${actual[diff]}`,
      )
    }
  }
  console.log(explain)
  return compare(actual, guess)
}

async function askQ5(rl: ReturnType<typeof createInterface>): Promise<boolean> {
  console.log(`\n${line}\n  题 5：this + Promise 链\n${line}`)
  console.log(`  提示：普通 function vs 箭头函数里的 this。下面两问各选一个。`)
  console.log(Q5_CODE)
  console.log(line)

  /** 归一化输入：e / err / fail 一律视为「失败」选项（02 练习里 e 表示抛错）。 */
  const normalize = (s: string, failOpt: string) => {
    const t = s.trim().toLowerCase()
    if (t === 'e' || t === 'err' || t === 'fail') return failOpt
    return t
  }

  const result = await q5()
  let correct = 0

  console.log('\n  Q1：l.load() 走哪条轨道？')
  console.log('    [1] 成功 → 打印 load: <值>')
  console.log('    [2] 失败 → 打印 load-err: <信息>')
  const a1 = normalize(await ask(rl, '  你的选择 > （失败/抛错也可填 e）'), '2')
  const q1Correct = (a1 === '1' && result.loadOk) || (a1 === '2' && !result.loadOk)
  if (q1Correct) {
    correct++
    console.log(`  ✓ 正确。实际：${result.loadOk ? `成功，load: ${result.loadVal}` : '失败（this 丢失）'}`)
  } else {
    console.log(`  ✗ 不对。实际：${result.loadOk ? `成功，load: ${result.loadVal}` : '失败（this 丢失）'}`)
  }

  console.log('\n  Q2：l.loadArrow() 的输出值是？')
  console.log('    [1] loadArrow: 1')
  console.log('    [2] loadArrow: 2')
  console.log('    [3] 失败 → loadArrow-err: ...')
  const a2 = normalize(await ask(rl, '  你的选择 > （失败/抛错也可填 e）'), '3')
  const expectVal = result.loadArrowOk ? String(result.loadArrowVal) : '3'
  const q2Correct = a2 === expectVal
  if (q2Correct) {
    correct++
    console.log(`  ✓ 正确。实际：${result.loadArrowOk ? `loadArrow: ${result.loadArrowVal}` : '失败'}`)
  } else {
    console.log(`  ✗ 不对。实际：${result.loadArrowOk ? `loadArrow: ${result.loadArrowVal}` : '失败'}`)
  }

  console.log(Q5_EXPLAIN)
  return correct === 2
}

// ════════════════════════════════════════════════════════
//  主流程
// ════════════════════════════════════════════════════════

const rl = createInterface({ input, output })

console.log(`\n${line}\n  综合模考 · 事件循环 + async/await + Promise 链\n${line}`)
console.log('  规则：每题贴代码 → 你预测输出顺序（字母就是代码里看到的）')
console.log('       → 程序真跑收集 → 逐位对比 + 讲解。题目本身反直觉，蒙 ABC 必错。')
console.log('  前置：题 3 考 ESM 顶层行为，先做 06-cjs-esm 练习。\n')

let score = 0

if (await askOrder(rl, '题 1：await 切微任务',
  'async 函数体同步跑，await 把后半段切成微任务。B 真的排在第二个吗？',
  Q1_CODE, q1, Q1_EXPLAIN)) score++

if (await askOrder(rl, '题 2：链式恢复后再抛错',
  'catch 恢复后还能再抛错。代码里的 D 会执行吗？',
  Q2_CODE, q2, Q2_EXPLAIN)) score++

if (await askOrder(rl, '题 3：ESM 顶层特例 —— nextTick vs 微任务 vs 宏任务',
  '本题是 ESM 顶层代码（type:module）。06 练习验证过的「ESM 顶层 promise 会抢跑 nextTick」还记得吗？另外 a-after 落在哪？',
  Q3_CODE, q3, Q3_EXPLAIN)) score++

if (await askOrder(rl, '题 4：多个 await 串行，每个都切一刀',
  'seq 里 B 和 C 中间，D、E 会插进来吗？',
  Q4_CODE, q4, Q4_EXPLAIN)) score++

if (await askQ5(rl)) score++

rl.close()

console.log(`\n${line}\n  模考结束：${score} / 5 全对\n${line}`)
if (score === 5) {
  console.log('  事件循环 + async/await + Promise 链 三块可以结业了。\n')
} else if (score >= 3) {
  console.log('  主干清晰，重点回看错题的讲解。\n')
} else {
  console.log('  建议重看 js-async-model.md 再来一次。\n')
}
