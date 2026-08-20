/**
 * 题 4 的组件（从 runner.tsx 抽出，供 selftest 复用；runner 内仍有一份同构副本用于展示）。
 * ListBad：key=index；ListGood：key=id。Row 带自己的 state（计数器）。
 */
// tsx 运行器走 classic JSX，需显式 import React（tsconfig.quiz.json 已配 jsx: react 对齐）
import React, { useState } from 'react'

export interface Item {
  id: number
  name: string
}

export function Row({ name }: { name: string }) {
  const [hits, setHits] = useState(0)
  return (
    <li onClick={() => setHits(hits + 1)}>
      {name}（点了 {hits} 次）
    </li>
  )
}

export function ListBad() {
  const [items, setItems] = useState<Item[]>([
    { id: 1, name: '甲' },
    { id: 2, name: '乙' },
    { id: 3, name: '丙' },
  ])
  return (
    <div>
      <ul>
        {items.map((it, i) => (
          <Row key={i} name={it.name} />
        ))}
      </ul>
      <button onClick={() => setItems([{ id: 0, name: '新' }, ...items])}>头部插入</button>
    </div>
  )
}

export function ListGood() {
  const [items, setItems] = useState<Item[]>([
    { id: 1, name: '甲' },
    { id: 2, name: '乙' },
    { id: 3, name: '丙' },
  ])
  return (
    <div>
      <ul>
        {items.map((it) => (
          <Row key={it.id} name={it.name} />
        ))}
      </ul>
      <button onClick={() => setItems([{ id: 0, name: '新' }, ...items])}>头部插入</button>
    </div>
  )
}
