/**
 * 练习 7（交互版）：泛型 —— TS 与 Java 的差异
 *
 * 运行：pnpm 07
 *
 * 泛型没有「输出顺序」，它的产物是「类型」。所以本题靠 tsc 真实类型
 * 检查来判定：每题贴代码（函数定义 + 几个标号调用）→ 你预测哪些调用
 * 报类型错 → 程序生成临时 .ts 文件、真跑项目的 tsc、解析报错行号 →
 * 逐个对比。
 *
 * 答案零硬编码 —— 全部由 tsc 真实判定收集。展示的代码 = 检查的代码。
 *
 * 覆盖三差异：① 推断无处不在 ② 结构性约束 ③ 泛型用在更多地方（容器）。
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
  explain: string
}

/**
 * 真实类型检查：把 defs + calls 写进临时文件，跑项目的 tsc，
 * 解析 __check.ts 的报错行号，映射回每个 call。返回每个 call 是否报错。
 */
function typeCheck(defs: string, calls: string[]): boolean[] {
  const header = [
    '// 临时文件，由 07-generics.ts 自动生成，类型检查后立即删除',
    '// 请勿手动编辑；想复现可手动跑 pnpm check',
    '',
  ]
  const defLines = defs.split('\n')
  const before = [...header, ...defLines, '']
  const callStart = before.length + 1 // 第 1 个 call 的行号（1-based）
  // calls 里已是完整语句（带类型注解的声明）或纯表达式，原样作行，不再包裹。
  // 若包裹 const __N = ... 会和带注解的声明拼成语法错。
  const callLines = calls
  const code = [...before, ...callLines].join('\n')
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
  console.log(`\n${line}\n  ${q.title}\n${line}`)
  console.log(`  提示：${q.hint}`)
  console.log(q.defs.trimEnd())
  console.log(line)
  console.log('  预测下面哪些标号会报【类型错】（填编号如 13，全合法填 0）：')
  q.calls.forEach((c, i) => console.log(`    ${CIRCLE[i]}  ${c}`))
  console.log(line)

  const raw = (await ask(rl, '  报错的标号 > ')).trim()
  const guessSet = new Set(
    raw
      .split('')
      .filter((c) => c >= '0' && c <= '9')
      .map(Number),
  )
  // 填 0 = 全合法（没有任何 i+1 等于 0，guessErrors 自然全 false）
  const guessErrors = q.calls.map((_, i) => guessSet.has(i + 1))

  const errors = typeCheck(q.defs, q.calls)
  console.log(`\n  tsc 真实判定：${errors
    .map((e, i) => (e ? `${CIRCLE[i]}报错` : `${CIRCLE[i]}合法`))
    .join('  ')}`)

  let allRight = true
  q.calls.forEach((_, i) => {
    const g = guessErrors[i]
    const a = errors[i]
    const tag =
      g === a ? '✓' : '✗'
    const detail =
      g && a
        ? '你猜报错，确实报错'
        : !g && !a
          ? '你猜合法，确实合法'
          : g && !a
            ? '你猜报错，实际合法'
            : '你猜合法，实际报错'
    if (g !== a) allRight = false
    console.log(`    ${CIRCLE[i]} ${tag} ${detail}`)
  })
  console.log(q.explain)
  return allRight
}

// ════════════════════════════════════════════════════════
//  题目
// ════════════════════════════════════════════════════════

const QUESTIONS: Question[] = [
  {
    title: '题 1：推断无处不在（差异 1）',
    hint: 'first<T> 不用写类型参数，调用处自动推断。把结果赋给明确类型的变量，看推断出什么。',
    defs: `
function first<T>(arr: T[]): T {
  return arr[0]!
}
`,
    calls: [
      `const __1: string = first([1, 2, 3])`,
      `const __2: string = first(['x', 'y'])`,
      `const __3: boolean = first([true, false])`,
      `const __4: number = first([1, 'a'])`,
    ],
    explain: `
  first([1,2,3])  → T 推断为 number，__1 要 string → 报错 ✗
  first(['x','y']) → T 推断为 string，__2 要 string → 合法 ✓
  first([true,false]) → T 推断为 boolean，__3 要 boolean → 合法 ✓
  first([1,'a'])  → 数组元素是 number|string，T 推断为联合类型 → __4 要 number → 报错 ✗

  对照 Java：Java 要写 first.<String>... 或声明侧 List<String>；
  TS 调用处从不写 <...>，全靠参数反推 T。这就是「推断无处不在」。
`,
  },
  {
    title: '题 2：约束是结构性的（差异 2 ⭐）',
    hint: 'T extends { length: number } 不是「是不是某类子类」，而是「有没有 length 属性」。',
    defs: `
function len<T extends { length: number }>(x: T): number {
  return x.length
}
`,
    calls: [
      `len("abc")`,
      `len([1, 2])`,
      `len(123)`,
      `len({ length: 5 })`,
    ],
    explain: `
  "abc"        string 有 length ✓
  [1, 2]       number[] 有 length ✓
  123          number 没有 length → 报错 ✗
  { length: 5 } 结构匹配（有 length: number）→ 合法 ✓ ★

  ★ 第 ④ 个是关键：{ length: 5 } 不是任何具名类的实例，只是个「形状
    合适」的对象字面量，照样通过约束。这种「约束到任意形状」Java 写
    不出来——Java 只能约束到预先定义的接口/类。
  呼应 03-structural-typing：泛型约束用的就是结构类型那套规则。
`,
  },
  {
    title: '题 3：约束 + 推断保类型安全',
    hint: 'keep 返回 T（不是 number 也不是 any）。T 被实参推断后，返回值的类型也跟着确定。',
    defs: `
function keep<T extends { length: number }>(x: T): T {
  return x
}
`,
    calls: [
      `const __1: string = keep("abc")`,
      `const __2: number[] = keep([1, 2])`,
      `const __3: string = keep([1, 2])`,
      `keep(123)`,
    ],
    explain: `
  keep("abc")   T=string → 返回 string，__1 要 string ✓
  keep([1,2])   T=number[] → 返回 number[]，__2 要 number[] ✓
  keep([1,2])   T=number[]，__3 却要 string → 报错 ✗（类型安全拦住了误用）
  keep(123)     number 不满足 { length: number } 约束 → 报错 ✗

  这就是泛型的价值：一次定义（keep），对每个具体类型既「保留它的类型」
  又「约束它的形状」，编译期就拦下 keep([1,2]) 当 string 用的错误。
`,
  },
  {
    title: '题 4：泛型用在容器（差异 3）',
    hint: 'Box<T> 是个泛型容器（type alias 也能泛型）。wrap<T> 推断出 Box<具体类型>。',
    defs: `
type Box<T> = { value: T }
function wrap<T>(x: T): Box<T> {
  return { value: x }
}
`,
    calls: [
      `const __1: Box<string> = { value: 'hi' }`,
      `const __2: Box<string> = { value: 1 }`,
      `const __3: Box<number> = wrap(5)`,
      `const __4: Box<string> = wrap(5)`,
    ],
    explain: `
  { value: 'hi' }   形状匹配 Box<string> ✓
  { value: 1 }      value 是 number，Box<string> 要 string → 报错 ✗
  wrap(5)           T 推断 number → Box<number>，__3 要 Box<number> ✓
  wrap(5)           推断 Box<number>，__4 却要 Box<string> → 报错 ✗

  泛型不止用于集合。type alias、函数、Promise<T> 都是泛型。
  这也是为什么 TS 代码里 Box<number> / Promise<string> / useState<T>
  到处都是——参数化类型是日常工具，不是 Java 里 List 专属的语法。
`,
  },
]

// ════════════════════════════════════════════════════════
//  主流程
// ════════════════════════════════════════════════════════

const rl = createInterface({ input, output })

console.log(`\n${line}\n  泛型 · TS 与 Java 的差异（tsc 真实判定）\n${line}`)
console.log('  每题：看函数定义 + 几个标号调用 → 预测哪些会报类型错 → 程序生成')
console.log('  临时文件真跑 tsc → 逐个对比。答案由 tsc 判定，零硬编码。')
console.log('  覆盖：① 推断 ② 结构性约束 ③ 泛型用在容器。\n')

let score = 0
for (const q of QUESTIONS) {
  if (await round(rl, q)) score++
}

rl.close()

console.log(`\n${line}\n  本轮：${score} / ${QUESTIONS.length} 全对\n${line}`)
if (score === QUESTIONS.length) {
  console.log('  泛型三差异你已经摸清。一句话总结：\n')
} else {
  console.log('  回看错题讲解。一句话总结（背下来）：\n')
}
console.log(`  TS 泛型 = Java 泛型的概念
    + 推断更强（调用处几乎不写 <...>）
    + 约束结构性（extends 看形状，不看名字）
    + 用在更多地方（不止集合，函数/Promise/工具类型/组件都是）
`)
