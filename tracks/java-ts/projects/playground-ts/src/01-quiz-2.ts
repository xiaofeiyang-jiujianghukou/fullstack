/**
 * 事件循环预测题 · 第二关（交互式）
 *
 * 运行：pnpm quiz2
 *
 * 新考点：async/await 的展开时机、Node 特有的 process.nextTick。
 * 答案同样不硬编码 —— 由 runScenario() 真跑一遍收集。
 */

import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const CODE = `
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
`.trim()

// ─── 真实运行，收集输出顺序 ───────────────────────────

const actual: string[] = []
const rec = (label: string) => {
  actual.push(label)
}

function runScenario(): Promise<void> {
  rec('A')

  setTimeout(() => rec('B'), 0)

  process.nextTick(() => rec('C'))

  async function task() {
    rec('D')
    await null
    rec('E')
  }
  task()

  Promise.resolve().then(() => rec('F'))

  rec('G')

  return new Promise((resolve) => setTimeout(resolve, 50))
}

// ─── 交互 ────────────────────────────────────────────

const line = '─'.repeat(56)

console.log(`\n${line}\n  事件循环预测题 · 第二关\n${line}\n`)
console.log(CODE)
console.log(`\n${line}`)
console.log('  预测这 7 行的输出顺序，例如：ABCDEFG')
console.log('  （回车跳过）')
console.log(line)

const rl = createInterface({ input, output })
const raw = await rl.question('\n  你的预测 > ')
rl.close()

const guess = raw
  .toUpperCase()
  .split('')
  .filter((c) => c >= 'A' && c <= 'G')

// 放进一个干净的宏任务里跑，避免受上面 await 的上下文影响
await new Promise<void>((resolve) => {
  setTimeout(() => {
    void runScenario().then(resolve)
  }, 0)
})

// ─── 对比 ────────────────────────────────────────────

console.log(`\n${line}`)
console.log('  实际输出：' + actual.join(' → '))

if (guess.length === 0) {
  console.log('  （你跳过了预测）')
} else {
  console.log('  你的预测：' + guess.join(' → '))
  console.log(line)

  let firstWrong = -1
  for (let i = 0; i < actual.length; i++) {
    if (guess[i] !== actual[i]) {
      firstWrong = i
      break
    }
  }

  if (firstWrong === -1 && guess.length === actual.length) {
    console.log('  ✓ 全对。事件循环这块可以结业了。')
  } else if (firstWrong === -1) {
    console.log('  ~ 前面都对，但位数不够，漏写了几个。')
  } else {
    console.log(
      `  ✗ 第 ${firstWrong + 1} 位开始错了：你猜 ${guess[firstWrong] ?? '(空)'}，实际是 ${actual[firstWrong]}`,
    )
  }
}

console.log(`\n${line}\n  逐步推演\n${line}`)
console.log(`
  【同步阶段】一口气跑完，产出 A、D、G

    · A 直接输出。
    · setTimeout 只是登记宏任务 B，回调没执行。
    · process.nextTick 只是登记，回调没执行。
    · task() 是普通函数调用 —— ★ async 函数体是【同步执行】的，
      所以 D 立刻输出。直到撞上 await 才停下，
      把函数剩余部分（E）登记为微任务。
    · Promise.resolve().then 登记微任务 F。
    · G 输出。

    ★ 注意 await null：等的东西压根不是异步操作，
      但"把剩余代码转成微任务"这个动作照做不误。
      await 的语义不是"等异步完成"，而是"到此切一刀"。

  【同步栈清空】开始清队列

    · Node 有三条队列，优先级：nextTick > 微任务 > 宏任务
    · 先清 nextTick 队列 → C
    · 再清微任务队列，按登记先后 → E，然后 F
      （task() 在 Promise.resolve() 之前调用，所以 E 先登记）
    · 最后取宏任务 → B

  【为什么 C 排在 E、F 前面】

    process.nextTick 是 Node 独有的，自成一队，
    优先级比 Promise 微任务还高。浏览器里没有这个东西。
    这也是 Node 代码不能无脑照搬到浏览器的原因之一。

  【和第一关对照】

    第一关考的是"宏任务之间要清空微任务"。
    这一关考的是"async 函数体同步执行"+"nextTick 插队"。
    两关合起来，事件循环的调度规则就齐了。
`)
