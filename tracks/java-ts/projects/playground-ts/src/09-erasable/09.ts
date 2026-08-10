/**
 * 练习 9（交互版）：类型只在编译期 —— erasableSyntaxOnly
 *
 * 运行：pnpm 09
 *
 * TS 的类型只在编译期，运行时（JS）是纯类型擦除后的代码。Node 跑 .ts
 * 只擦除类型、不做语法转换，所以项目 tsconfig 开了 erasableSyntaxOnly，
 * 禁掉一切「需要编译生成运行时代码」的语法（enum / 参数属性 / namespace）。
 *
 * 本题靠 tsc 真实判定：每题贴几个语法片段 → 你预测哪些触发 erasableSyntaxOnly
 * 错误 → 程序生成临时文件真跑 tsc → 逐个对比。每次片段顺序随机打乱。
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

/** 把 defs + calls 写进临时文件，跑项目 tsc，解析报错行号映射回每个 call。 */
function typeCheck(defs: string, calls: string[]): boolean[] {
  const header = [
    '// 临时文件，由 09-erasable.ts 自动生成，检查后立即删除',
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
  console.log('  预测下面哪些标号会触发 erasableSyntaxOnly 错误（填编号如 13，全合法填 0）：')
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

const DEFS = `// 下面每个片段独立判断：是否触发 erasableSyntaxOnly？`

const QUESTIONS: Question[] = [
  {
    title: '题 1：纯类型 vs 不可擦除',
    hint: '纯类型语法（interface/type/注解）擦掉就消失；enum 要生成运行时对象。',
    defs: DEFS,
    calls: [
      `interface I1 { x: number }`,
      `type T1 = string`,
      `enum E1 { A, B }`,
      `const y1: number = 1`,
    ],
    explainLines: [
      `interface I1 → 纯类型声明，擦除后消失，合法`,
      `type T1 = string → 类型别名，纯类型，合法`,
      `enum E1 → enum 要编译生成运行时对象，不可擦除，报错`,
      `const y1: number = 1 → 注解 :number 擦掉剩赋值，合法`,
    ],
    summary: `
  ★ 纯类型语法（interface / type / 类型注解）擦掉就消失，合法；
    enum 要生成运行时对象，被禁。
`,
  },
  {
    title: '题 2：参数属性 + namespace',
    hint: 'class 的参数属性（constructor(public x)）和 namespace 都要生成运行时代码。',
    defs: DEFS,
    calls: [
      `class C1 { constructor(public z: number) {} }`,
      `class C2 { z: number; constructor(z: number) { this.z = z } }`,
      `namespace N1 { export const v = 1 }`,
      `type T2 = { a: number }`,
    ],
    explainLines: [
      `constructor(public z) → 参数属性，要生成 this.z = z，报错`,
      `显式声明 z + this.z = z → 纯赋值，无参数属性，合法`,
      `namespace N1 → 要生成立即执行函数，报错`,
      `type T2 = { a: number } → 类型别名，合法`,
    ],
    summary: `
  ★ 参数属性（constructor(public x)）和 namespace 都要生成运行时代码，被禁。
    class 字段要显式声明 + 赋值（见 03-structural-typing 的写法）。
`,
  },
  {
    title: '题 3：enum 家族（const enum / declare enum）',
    hint: '普通 enum 和 const enum 都被禁；但 declare enum 只声明不生成代码。union 字面量是合法替代。',
    defs: DEFS,
    calls: [
      `enum E2 { A, B }`,
      `const enum CE1 { A, B }`,
      `declare enum DE1 { A, B }`,
      `type Color1 = 'red' | 'blue'`,
    ],
    explainLines: [
      `enum E2 → 普通 enum，要生成对象，报错`,
      `const enum CE1 → const enum 也被禁（内联也需编译期生成），报错`,
      `declare enum DE1 → 只声明不生成代码，可擦除，合法`,
      `type Color1 = union 字面量 → 纯类型，enum 的现代替代，合法`,
    ],
    summary: `
  ★ enum / const enum 都被禁；declare enum（只声明）合法。
    替代方案：union 字面量类型 'red' | 'blue'，纯类型、可擦除。
`,
  },
  {
    title: '题 4：综合判断',
    hint: '把前几题的规则合在一起：类型注解/interface 合法；enum + 参数属性 报错。',
    defs: DEFS,
    calls: [
      `const arr1: number[] = [1, 2]`,
      `enum Direction1 { Up, Down }`,
      `class P1 { constructor(public name: string) {} }`,
      `interface Shape1 { area(): number }`,
    ],
    explainLines: [
      `const arr1: number[] → 注解擦掉剩赋值，合法`,
      `enum Direction1 → 要生成对象，报错`,
      `constructor(public name) → 参数属性，要生成赋值，报错`,
      `interface Shape1 → 纯类型，合法`,
    ],
    summary: `
  ★ 一句话：凡是要让编译器「生成运行时代码」的语法都被禁；
    只写类型、擦掉就消失的都合法。
`,
  },
]

// ════════════════════════════════════════════════════════
//  主流程
// ════════════════════════════════════════════════════════

const rl = createInterface({ input, output })

console.log(`\n${line}\n  类型只在编译期 · erasableSyntaxOnly（tsc 真实判定）\n${line}`)
console.log('  每题：看几个语法片段 → 预测哪些触发 erasableSyntaxOnly 错误 → 程序生成')
console.log('  临时文件真跑 tsc → 对比。每次顺序随机打乱；答案由 tsc 判定，零硬编码。')
console.log('  核心：Node 只擦除类型不做转换，所以要生成运行时代码的语法都被禁。\n')

let score = 0
for (const q of QUESTIONS) {
  if (await round(rl, q)) score++
}

rl.close()

console.log(`\n${line}\n  本轮：${score} / ${QUESTIONS.length} 全对\n${line}`)
if (score === QUESTIONS.length) {
  console.log('  erasableSyntaxOnly 的边界你已经摸清。一句话总结：\n')
} else {
  console.log('  回看错题讲解。一句话总结（背下来）：\n')
}
console.log(`  TS 类型只在编译期；Node 跑 .ts 只擦除类型、不转换语法。
    所以只写「擦掉就消失」的语法（interface / type / 注解）；
    enum / const enum / 参数属性 / namespace 要生成运行时代码，被禁。
    enum 的替代：union 字面量 'red' | 'blue'。
`)
