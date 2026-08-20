/**
 * React 交互练习 runner（范式同 java-ts 的 07/10）
 *
 * 运行：pnpm quiz
 *
 * 每题：贴组件代码 → 你预测每个场景的结果 → 程序用 @testing-library/react
 * 真实渲染 + 模拟点击，收集真实输出 → 逐个对比。每次场景顺序随机打乱，
 * 答案零硬编码（全部由真实渲染收集）。
 */
import './dom-setup'
import React, { useState, useEffect } from 'react'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'

const line = '═'.repeat(60)
const CIRCLE = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']

async function ask(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  try {
    return await rl.question(prompt)
  } catch {
    return ''
  }
}

interface Check {
  desc: string
  run: () => string
}
interface Question {
  title: string
  hint: string
  code: string
  checks: Check[]
  explain: string
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

async function round(rl: ReturnType<typeof createInterface>, q: Question): Promise<boolean> {
  const idx = shuffle(q.checks.map((_, i) => i))
  const checks = idx.map((i) => q.checks[i]!)

  console.log(`\n${line}\n  ${q.title}\n${line}`)
  console.log(`  提示：${q.hint}`)
  console.log(q.code)
  console.log(line)
  console.log('  预测下面每个场景的结果（直接填值，回车跳过）：')

  const guesses: string[] = []
  for (let i = 0; i < checks.length; i++) {
    const g = (await ask(rl, `  ${CIRCLE[i]} ${checks[i]!.desc}\n  你的预测 > `)).trim()
    guesses.push(g)
  }

  console.log(`\n  真实渲染对比：`)
  let allRight = true
  checks.forEach((c, i) => {
    const actual = c.run()
    cleanup()
    const guess = guesses[i] ?? ''
    const ok = guess !== '' && guess === actual
    if (!ok) allRight = false
    console.log(`    ${CIRCLE[i]} ${ok ? '✓' : '✗'} 你猜「${guess || '(空)'}」实际「${actual}」`)
  })
  console.log(q.explain)
  return allRight
}

// ─── 题 1：useState 计数器 ───────────────────────────────

function Counter() {
  const [n, setN] = useState(0)
  return (
    <div>
      <p>count: {n}</p>
      <button onClick={() => setN(n + 1)}>+</button>
      <button onClick={() => setN(0)}>reset</button>
    </div>
  )
}
const readCount = () => screen.getByText(/count/).textContent!.replace('count: ', '')

const Q1: Question = {
  title: '题 1：useState 计数器',
  hint: 'count 初始 0；点 + 加 1；点 reset 归零。预测每个场景的 count 值。',
  code: `function Counter() {
  const [n, setN] = useState(0)
  return (
    <div>
      <p>count: {n}</p>
      <button onClick={() => setN(n + 1)}>+</button>
      <button onClick={() => setN(0)}>reset</button>
    </div>
  )
}`,
  checks: [
    {
      desc: '初始渲染时，count = ?',
      run: () => {
        render(<Counter />)
        return readCount()
      },
    },
    {
      desc: '点 + 三次后，count = ?',
      run: () => {
        render(<Counter />)
        const btn = screen.getByText('+')
        fireEvent.click(btn)
        fireEvent.click(btn)
        fireEvent.click(btn)
        return readCount()
      },
    },
    {
      desc: '点 + 两次，再点 reset，count = ?',
      run: () => {
        render(<Counter />)
        const plus = screen.getByText('+')
        fireEvent.click(plus)
        fireEvent.click(plus)
        fireEvent.click(screen.getByText('reset'))
        return readCount()
      },
    },
  ],
  explain: `
  ★ React 核心：状态变 → 组件函数重新执行 → UI 更新。
    · setN(n+1)：n 变 → 重渲染 → <p>count: {n}</p> 显示新值
    · setN(0)：无论当前几，直接设 0 → 重渲染显示 0
    改状态只能调 setN（不能直接 n = 5），React 才感知到。
`,
}

// ─── 题 2：props 父传子 ──────────────────────────────────

function Greeting({ name }: { name: string }) {
  return <p>你好，{name}</p>
}
function Parent() {
  const [name, setName] = useState('张三')
  return (
    <div>
      <Greeting name={name} />
      <button onClick={() => setName('李四')}>改名</button>
      <button onClick={() => setName('王五')}>再改</button>
    </div>
  )
}
const readName = () => screen.getByText(/你好/).textContent!.replace('你好，', '')

const Q2: Question = {
  title: '题 2：props 父传子',
  hint: 'Greeting 接收 name 显示「你好，{name}」。Parent 用 state 控制 name 传给 Greeting。预测每个场景显示的 name。',
  code: `function Greeting({ name }: { name: string }) {
  return <p>你好，{name}</p>
}
function Parent() {
  const [name, setName] = useState('张三')
  return (
    <div>
      <Greeting name={name} />
      <button onClick={() => setName('李四')}>改名</button>
      <button onClick={() => setName('王五')}>再改</button>
    </div>
  )
}`,
  checks: [
    {
      desc: '<Greeting name="赵六" /> 直接渲染，显示的 name = ?',
      run: () => {
        render(<Greeting name="赵六" />)
        return readName()
      },
    },
    {
      desc: '<Parent /> 初始渲染，显示的 name = ?',
      run: () => {
        render(<Parent />)
        return readName()
      },
    },
    {
      desc: '<Parent /> 点「改名」后，name = ?',
      run: () => {
        render(<Parent />)
        fireEvent.click(screen.getByText('改名'))
        return readName()
      },
    },
    {
      desc: '<Parent /> 点「改名」再点「再改」，name = ?',
      run: () => {
        render(<Parent />)
        fireEvent.click(screen.getByText('改名'))
        fireEvent.click(screen.getByText('再改'))
        return readName()
      },
    },
  ],
  explain: `
  ★ props 是父传子的只读数据：
    · <Greeting name="赵六" />：父直接传字面量
    · <Parent /> 里 name 是 state，传给 Greeting 作 props
    · 点按钮 setName → name(state)变 → Parent 重渲染 → 传给 Greeting 的
      props 变 → Greeting 跟着重渲染
  数据流：state(父) → props(子) → UI。单向，子组件不能改 props。
`,
}

// ─── 题 3：useEffect 副作用 + 依赖数组 ────────────────────

function DocTitle() {
  const [n, setN] = useState(0)
  const [m, setM] = useState(0)
  useEffect(() => {
    document.title = `count=${n}`
  }, [n])
  return (
    <div>
      <button onClick={() => setN(n + 1)}>+n</button>
      <button onClick={() => setM(m + 1)}>+m</button>
    </div>
  )
}
const readTitle = () => document.title

const Q3: Question = {
  title: '题 3：useEffect + 依赖数组',
  hint: 'useEffect 改 document.title，依赖数组是 [n]（只监听 n，不监听 m）。预测每个场景的 document.title。',
  code: `function DocTitle() {
  const [n, setN] = useState(0)
  const [m, setM] = useState(0)
  useEffect(() => {
    document.title = \`count=\${n}\`
  }, [n])
  return (
    <div>
      <button onClick={() => setN(n + 1)}>+n</button>
      <button onClick={() => setM(m + 1)}>+m</button>
    </div>
  )
}`,
  checks: [
    {
      desc: '初始渲染后，document.title = ?',
      run: () => {
        document.title = ''
        render(<DocTitle />)
        return readTitle()
      },
    },
    {
      desc: '点 +n 两次后，document.title = ?',
      run: () => {
        document.title = ''
        render(<DocTitle />)
        const btn = screen.getByText('+n')
        fireEvent.click(btn)
        fireEvent.click(btn)
        return readTitle()
      },
    },
    {
      desc: '点 +m 三次后，document.title = ?',
      run: () => {
        document.title = ''
        render(<DocTitle />)
        const btn = screen.getByText('+m')
        fireEvent.click(btn)
        fireEvent.click(btn)
        fireEvent.click(btn)
        return readTitle()
      },
    },
  ],
  explain: `
  ★ useEffect：组件渲染到屏幕【后】执行副作用；依赖数组控制何时重跑。
    · 初始挂载：effect 跑一次 → document.title = "count=0"
    · n 变（在依赖数组里）：effect 重跑 → title 更新
    · m 变（不在依赖数组）：effect【不重跑】→ title 不变 ★ 依赖数组核心
  对照 Java @PostConstruct（挂载后执行）+ 依赖变化才重新触发。
  清理函数：return () => ...，卸载或重跑前执行（取消订阅/清定时器）。
`,
}

// ─── 题 4：列表渲染 + key ────────────────────────────────

interface Item {
  id: number
  name: string
}
/** 每个子组件带自己的 state（计数器）——key 错了它就会挂错数据 */
function Row({ name }: { name: string }) {
  const [hits, setHits] = useState(0)
  return (
    <li onClick={() => setHits(hits + 1)}>
      {name}（点了 {hits} 次）
    </li>
  )
}
/** key=index 的列表 */
function ListBad() {
  const [items, setItems] = useState<Item[]>([
    { id: 1, name: '甲' },
    { id: 2, name: '乙' },
    { id: 3, name: '丙' },
  ])
  return (
    <ul>
      {items.map((it, i) => (
        <Row key={i} name={it.name} />
      ))}
      <button onClick={() => setItems([{ id: 0, name: '新' }, ...items])}>头部插入</button>
    </ul>
  )
}
/** key=id 的列表 */
function ListGood() {
  const [items, setItems] = useState<Item[]>([
    { id: 1, name: '甲' },
    { id: 2, name: '乙' },
    { id: 3, name: '丙' },
  ])
  return (
    <ul>
      {items.map((it) => (
        <Row key={it.id} name={it.name} />
      ))}
      <button onClick={() => setItems([{ id: 0, name: '新' }, ...items])}>头部插入</button>
    </ul>
  )
}
const readList = (ul: HTMLElement) => Array.from(ul.querySelectorAll('li')).map((li) => li.textContent!.replace('（点了 0 次）', ''))

const Q4: Question = {
  title: '题 4：列表渲染 + key（index vs id）',
  hint: 'Row 是带自己计数器 state 的子组件。两个列表都会在头部插入「新」。预测插入后列表显示的 4 行。',
  code: `function Row({ name }: { name: string }) {
  const [hits, setHits] = useState(0)          // ★ 子组件自己的 state
  return <li>{name}（点了 {hits} 次）</li>
}

// 列表 A：key = index（位置）
{items.map((it, i) => <Row key={i} name={it.name} />)}
//   items = [甲, 乙, 丙]，点「头部插入」后 = [新, 甲, 乙, 丙]

// 列表 B：key = it.id（业务 id，id：甲=1 乙=2 丙=3 新=0）
{items.map((it) => <Row key={it.id} name={it.name} />)}`,
  checks: [
    {
      desc: '列表 A（key=index）头部插入「新」后，列表 4 行依次是？\n     格式：名字用逗号连，如「甲,乙,丙,新」',
      run: () => {
        const { container } = render(<ListBad />)
        fireEvent.click(screen.getByText('头部插入'))
        return readList(container.querySelector('ul')!).join(',')
      },
    },
    {
      desc: '列表 B（key=id）头部插入「新」后，列表 4 行依次是？\n     格式：名字用逗号连，如「甲,乙,丙,新」',
      run: () => {
        const { container } = render(<ListGood />)
        fireEvent.click(screen.getByText('头部插入'))
        return readList(container.querySelector('ul')!).join(',')
      },
    },
  ],
  explain: `
  ★ key 决定 React 复用哪个组件实例（连同它的 state）：
    · key=id：新项 key=0 是新组件 → 渲染「新」；key=1/2/3 依旧对应甲/乙/丙 → 正常
    · key=index：插入后位置 0..3 = 新,甲,乙,丙。React 认为 key=0/1/2 的组件
      "还在"（复用，连同各自的 state），位置 3 才是新增 → 表面显示也对！
  ★ 那坑在哪？—— 子组件有 state 时：key=index 复用的旧组件带着【旧 state】。
    假如你先点第 1 行计数器再插入，「点了几次」会挂到别的数据头上（下轮加码验证）。
  结论：会变顺序的列表，key 用稳定业务 id；index 只适合纯展示、永不重排的列表。
`,
}

// ─── 主流程 ──────────────────────────────────────────────

const QUESTIONS: Question[] = [Q1, Q2, Q3, Q4]

const rl = createInterface({ input, output })
console.log(`\n${line}\n  React 交互练习 · 真实渲染判定\n${line}`)
console.log('  每题：看组件代码 → 预测每个场景结果 → 程序真实渲染+模拟点击 → 对比。')
console.log('  场景顺序随机打乱；答案由真实渲染收集，零硬编码。\n')

let score = 0
for (const q of QUESTIONS) {
  if (await round(rl, q)) score++
}

rl.close()
console.log(`\n${line}\n  本轮：${score} / ${QUESTIONS.length} 全对\n${line}`)
