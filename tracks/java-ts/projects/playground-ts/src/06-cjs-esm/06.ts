/**
 * 练习 6：CJS vs ESM —— 顶层 nextTick 的行为差异（实战对比）
 *
 * 运行：pnpm 06
 *
 * 同一段代码，四份真实文件，四种跑法。程序读取真实文件展示、再真实运行
 * 它收集输出，与你的预测逐位对比。展示的代码 = 运行的文件，绝无两套。
 *
 * 目标：一次搞懂 CJS 和 ESM 在这一块的区别（求值上下文不同）
 *       和联系（事件循环队列优先级始终不变）。
 *
 * 这是模考题 3 的前置练习 —— 题 3 考的正是这里验证过的 ESM 顶层行为。
 */

import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const line = '═'.repeat(60)

async function ask(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  try {
    return await rl.question(prompt)
  } catch {
    return ''
  }
}

function compare(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}
function firstDiff(a: string[], b: string[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return i
  return -1
}

/** 读真实文件展示，并用 node 真实运行它，返回输出顺序。展示 = 运行。 */
function runReal(file: string): { code: string; actual: string[] } {
  const path = join(here, file)
  const code = readFileSync(path, 'utf8').trim()
  const raw = execFileSync(process.execPath, [path], { encoding: 'utf8' })
  const actual = raw
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return { code, actual }
}

async function round(
  rl: ReturnType<typeof createInterface>,
  title: string,
  file: string,
  explain: string,
): Promise<boolean> {
  const { code, actual } = runReal(file)
  console.log(`\n${line}\n  ${title}\n${line}`)
  console.log(code)
  console.log(line)
  console.log(`  预测这 ${actual.length} 行输出的顺序，连着敲字母（回车跳过）`)

  const guess = (await ask(rl, '  你的预测 > '))
    .toUpperCase()
    .split('')
    .filter((c) => c >= 'A' && c <= 'G')

  console.log(`\n  实际输出：${actual.join(' → ')}`)
  if (guess.length === 0) {
    console.log('  （你跳过了预测）')
  } else {
    console.log(`  你的预测：${guess.join(' → ')}`)
    if (compare(actual, guess)) {
      console.log('  ✓ 全对')
    } else {
      const d = firstDiff(actual, guess)
      if (d === -1) {
        console.log(`  ~ 前面都对，但少写了 ${actual.length - guess.length} 个`)
      } else {
        console.log(`  ✗ 第 ${d + 1} 位错：你猜 ${guess[d] ?? '(空)'}，实际是 ${actual[d]}`)
      }
    }
  }
  console.log(explain)
  return compare(actual, guess)
}

const rl = createInterface({ input, output })

console.log(`\n${line}\n  CJS vs ESM · 顶层 nextTick 行为对比\n${line}`)
console.log('  同一段代码，四个文件、四种跑法。')
console.log('  每轮：看代码 → 预测输出（字母就是代码里看到的）→ 程序真跑 → 逐位对比。')
console.log('  文件就在 src/06-cjs-esm/ 下，想自己验证可以随时 node 直接跑。\n')

let score = 0

if (await round(
  rl,
  '① demo.cjs —— CJS：顶层裸写（经典同步上下文）',
  'demo.cjs',
  `
  【同步阶段】A、E、G 同步打印；登记 timeout B、promise C、nextTick D；F 挂起。
  【清空】经典规则：nextTick(D) → 微任务(C) → 宏任务(B) → 最后 F。

  实际：A E G D C B F
  教科书顺序：nextTick 最优先、微任务次之、宏任务垫底，
  await pending 的后半段（F）落在两个宏任务之后。
  `,
)) score++

if (await round(
  rl,
  '② demo.mjs —— ESM：顶层裸写（微任务上下文）',
  'demo.mjs',
  `
  【同步阶段】一样，A E G；同样登记 B/C/D、F 挂起。
  【清空】顺序反了：微任务(C) → nextTick(D)。

  实际：A E G C D B F
  区别就在这一步：CJS 顶层是同步上下文，ESM 顶层是微任务上下文。
  同代码、两种模块系统，C/D 完全对调。
  `,
)) score++

if (await round(
  rl,
  '③ main.mjs —— ESM：包进 main() 再调用（伪解验证）',
  'main.mjs',
  `
  实际：A E G C D B F —— 和 ② 一模一样，包了没用。

  伪解：很多人以为「包个 main() 就回到普通同步上下文了」。
  实验证明不行 —— main() 只是在模块顶层那个微任务上下文里同步跑了
  一遍，nextTick 照样被 promise 抢跑。包不包函数，跟上下文无关。
  `,
)) score++

if (await round(
  rl,
  '④ main-timeout.mjs —— ESM：main() 挪进 setTimeout（真解）',
  'main-timeout.mjs',
  `
  实际：A E G D C B F —— 经典规则回来了！

  main() 被 setTimeout 放进宏任务队列，main 跑完 → 回到【宏任务边界】
  → nextTick(D) 重新抢在微任务(C) 前面。
  联系就在这里：队列优先级从未变过，变的只是「代码登记在哪个上下文」。
  `,
)) score++

rl.close()

console.log(`\n${line}\n  一次说清：区别 和 联系\n${line}`)
console.log(`
  区别（为什么同代码结果不同）
    · CJS 顶层 = 普通同步上下文 → 经典规则（D 先）
    · ESM 顶层 = 微任务上下文   → promise 抢跑（C 先）
      因为 ESM 模块依赖图异步构建，顶层代码在一条微任务链里求值。

  联系（两套行为背后是同一个事件循环）
    · nextTick > 微任务 > 宏任务 这个优先级从未变过 —— 它只在【宏任务边界】清算。
    · ESM 顶层本身就是微任务上下文，所以顶层登记的 promise 抢跑 nextTick。
    · 把代码挪进一个宏任务（setTimeout / setImmediate），回到宏任务边界，
      nextTick 立刻恢复优先。

  实操结论
    · 别在 ESM 顶层裸写依赖 nextTick 优先级的代码 —— 要排序就用 promise/await 自己排。
    · 读老 CJS 代码时记住：顶层是同步上下文，行为是经典规则。
    · 遇到「nextTick 和 promise 谁先」对不上号，先问一句：这段代码跑在哪个上下文？

  深层机制（进阶）
    · 在微任务执行中【新登记】的 nextTick，要等这轮微任务清空后才轮到。
      所以 nextTick 的「优先」是宏任务边界层面的事，不是任何时刻都最优先。
`)

console.log(`${line}\n  本轮：${score} / 4 全对\n${line}`)
if (score === 4) {
  console.log('  四象限一次拿满，CJS/ESM 这一块你已经通了。\n')
} else if (score >= 2) {
  console.log('  主干清晰，回看错的那几轮讲解。\n')
} else {
  console.log('  建议对照 js-async-model.md §6 再走一遍。\n')
}
