/**
 * 练习 10（交互版）：interface vs type
 *
 * 运行：pnpm 10
 *
 * TS 有两种定义类型的语法：interface（描述对象形状）和 type（给任何类型
 * 起别名）。描述对象时两者等价，但能力范围不同：type 能做联合/交叉/原语
 * 别名/元组，interface 能声明合并、只能 extends 对象类型。
 *
 * 本题靠 tsc 真实判定：每题贴几个片段 → 你预测哪些报类型错 → 程序生成
 * 临时文件真跑 tsc → 对比。每次顺序随机打乱，答案零硬编码。
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
  explainLines: string[]
  summary: string
}

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

function typeCheck(defs: string, calls: string[]): boolean[] {
  const header = [
    '// 临时文件，由 10-interface-type.ts 自动生成，检查后立即删除',
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
  const idx = shuffle(q.calls.map((_, i) => i))
  const calls = idx.map((i) => q.calls[i]!)
  const explainLines = idx.map((i) => q.explainLines[i]!)

  console.log(`\n${line}\n  ${q.title}\n${line}`)
  console.log(`  提示：${q.hint}`)
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

const DEFS = `// 下面每个片段独立判断：interface 还是 type 报错？`

const QUESTIONS: Question[] = [
  {
    title: '题 1：type 的能力 vs interface 的限制',
    hint: 'type 能给任何类型起别名（原语/联合/元组）；interface 只能描述对象形状、只能 extends 对象类型。',
    defs: DEFS,
    calls: [
      `type ID = string`,
      `type T = string | number`,
      `type Pair = [number, string]`,
      `interface J extends string {}`,
    ],
    explainLines: [
      `type ID = string → 原语别名，type 能做，合法`,
      `type T = string | number → 联合类型，type 能做，合法`,
      `type Pair = [number, string] → 元组，type 能做，合法`,
      `interface J extends string → interface 只能 extends 对象类型，原语不行，报错`,
    ],
    summary: `
  ★ type 能给任何类型起别名（原语 / 联合 / 元组 / 交叉）；
    interface 只能描述对象形状，extends 也只能接对象类型。
`,
  },
  {
    title: '题 2：声明合并（interface 合并 vs type 重复）',
    hint: 'interface 同名会自动合并成员；type 同名是重复定义，直接报错。',
    defs: DEFS,
    calls: [
      `interface I1 { a: number }; interface I1 { b: number }`,
      `type T1 = { a: number }; type T1 = { b: number }`,
      `interface I2 { a: number }; interface I2 { b: number }; const x: I2 = { a: 1, b: 2 }`,
      `type T2 = { a: number }; const y: T2 = { a: 1, b: 2 }`,
    ],
    explainLines: [
      `interface I1 同名两次 → 自动合并成 {a,b}，合法`,
      `type T1 同名两次 → Duplicate identifier，报错`,
      `I2 合并后含 a,b，const x 两个字段都有，合法`,
      `T2 只有 a，const y 多了 b → 额外属性，报错`,
    ],
    summary: `
  ★ interface 同名声明自动合并（declaration merging）——这是 type 做不到的；
    type 同名重复定义直接报 Duplicate identifier。
`,
  },
  {
    title: '题 3：扩展（extends vs &，能否互通）',
    hint: 'interface 用 extends 扩展，type 用 & 交叉；两者可混用。但 interface 不能 extends 联合类型。',
    defs: DEFS,
    calls: [
      `interface A { a: number }; interface B extends A { b: number }`,
      `type A2 = { a: number }; type B2 = A2 & { b: number }`,
      `interface C { a: number }; type D = C & { b: number }`,
      `type U = string | number; interface E extends U { x: number }`,
    ],
    explainLines: [
      `interface B extends A → interface 用 extends 扩展，合法`,
      `type B2 = A2 & {...} → type 用 & 交叉，合法`,
      `type D = C & {...} → type 能交叉 interface，两者互通，合法`,
      `interface E extends U（联合）→ 只能 extends 对象类型，联合不行，报错`,
    ],
    summary: `
  ★ interface 用 extends、type 用 &；两者能混用（interface extends 对象 type、
    type & interface）。但 interface extends 联合类型会报错。
`,
  },
  {
    title: '题 4：综合',
    hint: '把前面的规则合在一起：type 灵活（别名/联合）、interface 可合并、type 不可重复。',
    defs: DEFS,
    calls: [
      `type ID = string; const id: ID = 'u1'`,
      `type Status = 'active' | 'inactive'`,
      `interface Counter { count: number }; interface Counter { reset(): void }`,
      `type Dup = string; type Dup = number`,
    ],
    explainLines: [
      `type ID 别名 + 使用，合法`,
      `type Status = 联合字面量，合法（enum 的现代替代）`,
      `interface Counter 同名两次 → 声明合并，合法`,
      `type Dup 重复定义 → 报错`,
    ],
    summary: `
  ★ 选型：描述对象形状用 interface（可合并、可扩展）；联合 / 交叉 / 原语别名 /
    元组 / 工具类型用 type。两者描述对象时等价，按场景选。
`,
  },
]

const rl = createInterface({ input, output })

console.log(`\n${line}\n  interface vs type（tsc 真实判定）\n${line}`)
console.log('  每题：看几个片段 → 预测哪些报类型错 → 程序生成临时文件真跑 tsc → 对比。')
console.log('  每次顺序随机打乱；答案由 tsc 判定，零硬编码。')
console.log('  核心：type 更强大（别名/联合/元组），interface 可合并、只能 extends 对象。\n')

let score = 0
for (const q of QUESTIONS) {
  if (await round(rl, q)) score++
}

rl.close()

console.log(`\n${line}\n  本轮：${score} / ${QUESTIONS.length} 全对\n${line}`)
if (score === QUESTIONS.length) {
  console.log('  interface vs type 你已经摸清。一句话总结：\n')
} else {
  console.log('  回看错题讲解。一句话总结（背下来）：\n')
}
console.log(`  描述对象形状：interface ≈ type（等价）
    type 更强大：联合 / 交叉 / 原语别名 / 元组 / 工具类型
    interface 独有：声明合并（同名自动合并）；type 同名重复报错
    扩展：interface 用 extends、type 用 &，可混用；interface 不能 extends 联合
`)
