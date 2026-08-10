/**
 * 练习 4：Promise 链式调用 —— 错误传播与恢复
 *
 * 运行：pnpm 04
 *
 * 新考点：.then / .catch / .finally 的链式机制，
 *         抛错如何"跳过"后续 .then，catch 如何"接住"并恢复链条。
 * 答案不硬编码 —— 由 runScenario() 真跑一遍收集。
 */

import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const CODE = `
Promise.resolve(1)
  .then(n => {
    console.log('A:', n)
    return n + 1
  })
  .then(n => {
    console.log('B:', n)
    throw new Error('boom')
  })
  .then(n => {
    console.log('C:', n)    // ← 这一行会到达吗？
  })
  .catch(err => {
    console.log('D:', err.message)
    return 'recovered'
  })
  .then(val => {
    console.log('E:', val)
  })
  .finally(() => {
    console.log('F')
  })
`.trim()

// ─── 真实运行，收集输出顺序 ────────────────────────────

const actual: string[] = []
const rec = (label: string) => actual.push(label)

async function runScenario(): Promise<void> {
  await Promise.resolve(1)
    .then(n => {
      rec('A')
      return n + 1
    })
    .then(n => {
      rec('B')
      void n
      throw new Error('boom')
    })
    .then(n => {
      rec('C')
      void n
    })
    .catch(_err => {
      rec('D')
      return 'recovered'
    })
    .then(_val => {
      rec('E')
    })
    .finally(() => {
      rec('F')
    })
}

// ─── 交互 ──────────────────────────────────────────────

const line = '─'.repeat(56)

console.log(`\n${line}\n  Promise 链式调用 · 错误传播与恢复\n${line}\n`)
console.log(CODE)
console.log(`\n${line}`)
console.log('  以上代码会输出哪几行？顺序是什么？')
console.log('  列出会打印的字母，例如：ABEF（跳过的不写）')
console.log('  （回车跳过）')
console.log(line)

const rl = createInterface({ input, output })
const raw = await rl.question('\n  你的预测 > ')
rl.close()

const guess = raw
  .toUpperCase()
  .split('')
  .filter(c => c >= 'A' && c <= 'F')

await runScenario()

// ─── 对比 ──────────────────────────────────────────────

console.log(`\n${line}`)
console.log('  实际输出顺序：' + actual.join(' → '))

if (guess.length === 0) {
  console.log('  （你跳过了预测）')
} else {
  console.log('  你的预测：    ' + guess.join(' → '))
  console.log(line)

  let firstWrong = -1
  for (let i = 0; i < actual.length; i++) {
    if (guess[i] !== actual[i]) {
      firstWrong = i
      break
    }
  }

  if (firstWrong === -1 && guess.length === actual.length) {
    console.log('  ✓ 全对。Promise 链式调用这块可以结业了。')
  } else if (firstWrong === -1) {
    console.log('  ~ 前面都对，但少写了几个字母。')
  } else {
    console.log(
      `  ✗ 第 ${firstWrong + 1} 位开始错了：你猜 ${guess[firstWrong] ?? '(空)'}，实际是 ${actual[firstWrong]}`,
    )
  }
}

console.log(`\n${line}\n  逐步推演\n${line}`)
console.log(`
  【Promise 链的两条轨道】

    成功轨道：.then(onFulfilled) 响应，处理完正常返回 → 继续成功轨道
    失败轨道：.catch(onRejected)  响应，处理完正常返回 → 切回成功轨道

    无论哪条轨道：
      · return X      → 值变成 X，轨道不变
      · throw err     → 切到失败轨道
      · return rejected promise → 切到失败轨道

  【一步步走】

    1. Promise.resolve(1)
       · 初始值 1，成功轨道

    2. .then(n => { ...A... return n+1 })
       · 成功轨道 ✓，A 打印（n = 1）
       · return 2 → 下一个 .then 收到 2

    3. .then(n => { ...B... throw new Error('boom') })
       · 成功轨道 ✓，B 打印（n = 2）
       · throw → 切到失败轨道，错误是 Error('boom')

    4. .then(n => { ...C... })
       · ★ 这是"成功轨道专用"的 .then，但当前是失败轨道 → 直接跳过
       · C 不打印

    5. .catch(err => { ...D... return 'recovered' })
       · 失败轨道 ✓，D 打印（err.message = 'boom'）
       · return 'recovered' → 切回成功轨道，值是 'recovered'
       · ★ .catch 不是终点，返回值会继续传下去

    6. .then(val => { ...E... })
       · 成功轨道 ✓，E 打印（val = 'recovered'）

    7. .finally(() => { ...F... })
       · 无论哪条轨道都跑 ✓，F 打印
       · ★ finally 的返回值被忽略，轨道和值保持不变

  【关键结论】

    · throw      = 上车"失败轨道"
    · .catch 正常返回 = 下车"失败轨道"，回"成功轨道"
    · .finally   = 两条轨道都停的站，但不改变值

  【等价的 async/await 写法】

    async function run() {
      try {
        const a = 1             // A: n = 1
        const b = a + 1         // B: n = 2，然后 throw
        throw new Error('boom')
        // C: 永远到不了
      } catch (err) {
        // D: err.message = 'boom'
        return 'recovered'      // E: val = 'recovered'
      } finally {
        // F: 永远跑
      }
    }

    两种写法完全等价。见到 .then/.catch 链时，
    脑子里还原成 async/await，一目了然。
`)
