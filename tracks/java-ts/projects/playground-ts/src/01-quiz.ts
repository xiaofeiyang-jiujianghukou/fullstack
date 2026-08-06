/**
 * 事件循环预测题（交互式）
 *
 * 运行：pnpm quiz
 *
 * 程序会先展示代码并等你输入预测，再真实运行并逐位对比。
 * 答案不在本文件里硬编码 —— 下面的 runScenario() 是真跑一遍收集来的。
 */

import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const CODE = `
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
`.trim()

// ─── 真实运行，收集输出顺序 ───────────────────────────

const actual: string[] = []
const rec = (label: string) => {
  actual.push(label)
}

function runScenario(): Promise<void> {
  rec('A')

  setTimeout(() => {
    rec('B')
    Promise.resolve().then(() => rec('C'))
  }, 0)

  Promise.resolve().then(() => {
    rec('D')
    setTimeout(() => rec('E'), 0)
  })

  queueMicrotask(() => rec('F'))

  rec('G')

  // 等足够久，确保所有宏任务与微任务都跑完
  return new Promise((resolve) => setTimeout(resolve, 50))
}

// ─── 交互 ────────────────────────────────────────────

const line = '─'.repeat(56)

console.log(`\n${line}\n  事件循环预测题\n${line}\n`)
console.log(CODE)
console.log(`\n${line}`)
console.log('  预测这 7 行的输出顺序，直接连着敲字母，例如：ABCDEFG')
console.log('  （想直接看答案就敲回车跳过）')
console.log(line)

const rl = createInterface({ input, output })
const raw = await rl.question('\n  你的预测 > ')
rl.close()

const guess = raw
  .toUpperCase()
  .split('')
  .filter((c) => c >= 'A' && c <= 'G')

await runScenario()

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
    console.log('  ✓ 全对。事件循环你已经拿下了。')
  } else if (firstWrong === -1) {
    console.log('  ~ 前面都对，但位数不够，漏写了几个。')
  } else {
    const pos = firstWrong + 1
    console.log(
      `  ✗ 第 ${pos} 位开始错了：你猜 ${guess[firstWrong] ?? '(空)'}，实际是 ${actual[firstWrong]}`,
    )
  }
}

console.log(`\n${line}\n  为什么是这个顺序\n${line}`)
console.log(`
  1. 同步代码一口气跑完 —— 先输出 A、G。
     setTimeout / Promise.then / queueMicrotask 只是「登记回调」，
     登记本身是同步的，回调本身一个都还没执行。

  2. 同步栈清空 → 清空微任务队列。
     按登记顺序：Promise.then 的 D，然后 queueMicrotask 的 F。
     注意 D 内部又登记了一个 setTimeout（E），它排到宏任务队列末尾。

  3. 取第一个宏任务执行 —— B。
     B 内部登记了一个 Promise 微任务（C）。

  4. ★ 关键：每执行完一个宏任务，都要把微任务队列清空一次。
     所以 C 紧跟着 B 出现，而不是等 E 跑完。
     这一条是本题真正的考点，也是最多人猜错的地方。

  5. 再取下一个宏任务 —— E。

  一句话总结：
    同步 → 清空微任务 → 一个宏任务 → 清空微任务 → 一个宏任务 → ……

  对照 Java：这里从头到尾只有一个线程。所谓"并发"只是回调在排队，
  谁先谁后完全由队列规则决定，不存在抢占，也不存在真正的并行。
`)
