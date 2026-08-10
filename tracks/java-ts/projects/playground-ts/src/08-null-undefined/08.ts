/**
 * 练习 8（交互版）：null / undefined —— strictNullChecks 心态反转
 *
 * 运行：pnpm 08
 *
 * Java 默认引用类型「可 null」，TS（strict 模式）默认「不可 null」——
 * 这是 Java 转 TS 最高频的坑。本题靠 tsc 真实类型检查判定：每题贴代码
 * → 你预测哪些标号报类型错 → 程序生成临时文件真跑 tsc → 逐个对比。
 *
 * 每次运行，每题的 call 顺序随机打乱，标号动态分配（讲解跟着走）。
 * 答案零硬编码，全部由 tsc 判定。
 */

import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { execFileSync } from 'node:child_process'
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = dirname(dirname(here))
const tmpFile = join(here, '__check.ts')
const tscBin = join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc')

const line = '═'.repeat(60)
const CIRCLE = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']

async function ask(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  try {
    return await rl.question(prompt)
  } catch {
    return ''
  }
}

interface Question {
  title: string
  hint: string
  defs: string
  calls: string[]
  // 每条 call 对应一句讲解（按 call 内容写，不含标号），与 calls 同序
  explainLines: string[]
  // 题末总结（不依赖标号）
  summary: string
}

/** Fisher-Yates 打乱，返回新数组。 */
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
  return a
}

/** 把 defs + calls 写进临时文件，跑项目 tsc，解析报错行号映射回每个 call。 */
function typeCheck(defs: string, calls: string[]): boolean[] {
  const header = [
    '// 临时文件，由 08-null-undefined.ts 自动生成，检查后立即删除',
    '// 请勿手动编辑；想复现可手动跑 pnpm check',
    '',
  ]
  const defLines = defs.split('\n')
  const before = [...header, ...defLines, '']
  const callStart = before.length + 1
  const code = [...before, ...calls].join('\n')
  writeFileSync(tmpFile, code, 'utf8')

  let out = ''
  try {
    execFileSync(process.execPath, [tscBin, '--noEmit', '--pretty', 'false'], {
      cwd: projectRoot,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    })
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string }
    out = (err.stdout ?? '') + (err.stderr ?? '')
  } finally {
    if (existsSync(tmpFile)) unlinkSync(tmpFile)
  }

  const errorLines = new Set<number>()
  for (const ln of out.split('\n')) {
    const m = ln.match(/__check\.ts\((\d+),\d+\):\s*error/)
    if (m) errorLines.add(Number(m[1]))
  }
  return calls.map((_, i) => errorLines.has(callStart + i))
}

async function round(rl: ReturnType<typeof createInterface>, q: Question): Promise<boolean> {
  // 运行时随机打乱 call 顺序，讲解同步打乱（标号始终对得上）
  const idx = shuffle(q.calls.map((_, i) => i))
  const calls = idx.map((i) => q.calls[i]!)
  const explainLines = idx.map((i) => q.explainLines[i]!)

  console.log(`\n${line}\n  ${q.title}\n${line}`)
  console.log(`  提示：${q.hint}`)
  console.log(q.defs.trimEnd())
  console.log(line)
  console.log('  预测下面哪些标号会报【类型错】（填编号如 13，全合法填 0）：')
  calls.forEach((c, i) => console.log(`    ${CIRCLE[i]}  ${c}`))
  console.log(line)

  const raw = (await ask(rl, '  报错的标号 > ')).trim()
  const guessSet = new Set(
    raw
      .split('')
      .filter((c) => c >= '0' && c <= '9')
      .map(Number),
  )
  const guessErrors = calls.map((_, i) => guessSet.has(i + 1))

  const errors = typeCheck(q.defs, calls)
  console.log(
    `\n  tsc 真实判定：${errors
      .map((e, i) => (e ? `${CIRCLE[i]}报错` : `${CIRCLE[i]}合法`))
      .join('  ')}`,
  )

  let allRight = true
  calls.forEach((_, i) => {
    const g = guessErrors[i]
    const a = errors[i]
    const detail =
      g && a
        ? '你猜报错，确实报错'
        : !g && !a
          ? '你猜合法，确实合法'
          : g && !a
            ? '你猜报错，实际合法'
            : '你猜合法，实际报错'
    if (g !== a) allRight = false
    console.log(`    ${CIRCLE[i]} ${g === a ? '✓' : '✗'} ${detail}`)
  })
  console.log('\n  逐条讲解：')
  calls.forEach((_, i) => {
    console.log(`    ${CIRCLE[i]} ${errors[i] ? '报错' : '合法'}  ${explainLines[i]}`)
  })
  console.log(q.summary)
  return allRight
}

// ════════════════════════════════════════════════════════
//  题目
// ════════════════════════════════════════════════════════

const QUESTIONS: Question[] = [
  {
    title: '题 1：默认不可空（心态反转）',
    hint: 'strict 模式下 string 类型默认不接受 null/undefined。要可空得显式写 | null。',
    defs: `
let s: string = 'hi'
`,
    calls: [
      `s = null`,
      `s = undefined`,
      `let n: string | null = null`,
      `let u: string | undefined`,
    ],
    explainLines: [
      `s = null → null 不能赋给 string，报错`,
      `s = undefined → undefined 也不能，报错`,
      `let n: string | null = null → 显式允许 null，合法`,
      `let u: string | undefined → 类型允许 undefined，合法`,
    ],
    summary: `
  ★ 心态反转：Java 的 String 默认可 null；TS 的 string 默认【不可】null。
    要可空必须显式 | null / | undefined。这是 strictNullChecks 的核心。
`,
  },
  {
    title: '题 2：可空变量的属性访问',
    hint: '类型是 string | null 的变量，直接 .length 会被拦。用 ?. 安全访问。',
    defs: `
declare const n: string | null
`,
    calls: [
      `n.length`,
      `n?.length`,
      `n.charAt(0)`,
      `n?.charAt(0) ?? ''`,
    ],
    explainLines: [
      `n.length → n 可能 null，直接访问属性，报错`,
      `n?.length → optional chaining，null 短路成 undefined，合法`,
      `n.charAt(0) → 同理可能 null，报错`,
      `n?.charAt(0) ?? '' → ?. 兜 null，?? 再兜 undefined，合法`,
    ],
    summary: `
  两个工具（Java 无对应物，类似 Optional.map/.orElse 但更轻）：
    ?.  安全访问：左边 null/undefined 就短路
    ??  空值兜底：左边 null/undefined 就取右边
`,
  },
  {
    title: '题 3：null ≠ undefined（两个不同的空）',
    hint: '参数是 string | null。注意 undefined 不在这个联合里；缺参数也是错。',
    defs: `
function greet(name: string | null): string {
  return name ?? 'guest'
}
`,
    calls: [
      `greet(null)`,
      `greet(undefined)`,
      `greet('abc')`,
      `greet()`,
    ],
    explainLines: [
      `greet(null) → 参数允许 null，合法`,
      `greet(undefined) → 参数 string|null，【不含 undefined】，报错`,
      `greet('abc') → string，合法`,
      `greet() → 缺参数（无默认值、非可选参数），报错`,
    ],
    summary: `
  ★ null ≠ undefined：参数写了 | null 就只接受 null，不接受 undefined。
    Java 只有一个 null，TS 拆成两个，必须分别处理。
`,
  },
  {
    title: '题 4：默认值参数（undefined 触发默认，null 不行）',
    hint: 'name: string = "world" 有默认值。想想 undefined 和 null 各会怎样。',
    defs: `
function greet(name: string = 'world'): string {
  return 'hi ' + name
}
`,
    calls: [
      `greet()`,
      `greet(null)`,
      `greet(undefined)`,
      `greet('abc')`,
    ],
    explainLines: [
      `greet() → 用默认值 'world'，合法`,
      `greet(null) → name 是 string，null 不行，报错`,
      `greet(undefined) → 【显式 undefined 触发默认值】，合法`,
      `greet('abc') → string，合法`,
    ],
    summary: `
  ★ 有默认值的参数：传 undefined 走默认值（合法），传 null 反而类型不匹配（报错）。
    这是 null ≠ undefined 在「默认值」场景的又一次体现。
`,
  },
]

// ════════════════════════════════════════════════════════
//  主流程
// ════════════════════════════════════════════════════════

const rl = createInterface({ input, output })

console.log(`\n${line}\n  null / undefined · strictNullChecks（tsc 真实判定）\n${line}`)
console.log('  每题：看代码 → 预测哪些标号报类型错 → 程序生成临时文件真跑 tsc → 对比。')
console.log('  每次 call 顺序随机打乱；答案由 tsc 判定，零硬编码。')
console.log('  核心：TS 默认不可空，null ≠ undefined。\n')

let score = 0
for (const q of QUESTIONS) {
  if (await round(rl, q)) score++
}

rl.close()

console.log(`\n${line}\n  本轮：${score} / ${QUESTIONS.length} 全对\n${line}`)
if (score === QUESTIONS.length) {
  console.log('  strictNullChecks 你已经摸清。一句话总结：\n')
} else {
  console.log('  回看错题讲解。一句话总结（背下来）：\n')
}
console.log(`  TS 默认【不可空】（Java 默认可空，心态反转）
    null ≠ undefined（两个不同的空，要分别处理）
    可空变量直接 .属性 会报错 → 用 ?. 访问、?? 兜底
`)
