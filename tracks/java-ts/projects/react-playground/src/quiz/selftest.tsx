/**
 * 开发自测脚本（不进 quiz 主流程）：验证题 4 的真实渲染行为。
 * 运行：pnpm exec tsx src/quiz/selftest.tsx
 */
import './dom-setup'
// tsx 运行器 classic JSX 需要 React 在作用域内（tsconfig.quiz.json 已配 jsx: react 对齐）
import React from 'react'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { ListBad, ListGood } from './q4-components'

// 1) 基础：插入后两列表显示什么
cleanup()
let r = render(<ListBad />)
fireEvent.click(screen.getByText('头部插入'))
console.log('A(key=index):', Array.from(r.container.querySelectorAll('li')).map((li) => li.textContent))
cleanup()
r = render(<ListGood />)
fireEvent.click(screen.getByText('头部插入'))
console.log('B(key=id):   ', Array.from(r.container.querySelectorAll('li')).map((li) => li.textContent))
cleanup()

// 2) 进阶：先点第 1 行 3 次，再头部插入，看「点了 3 次」跟着谁走
function BadStateful() {
  return <ListBad />
}
r = render(<BadStateful />)
const first = r.container.querySelectorAll('li')[0]!
fireEvent.click(first)
fireEvent.click(first)
fireEvent.click(first)
fireEvent.click(screen.getByText('头部插入'))
console.log('A 点击后再插:', Array.from(r.container.querySelectorAll('li')).map((li) => li.textContent))
cleanup()
r = render(<ListGood />)
const first2 = r.container.querySelectorAll('li')[0]!
fireEvent.click(first2)
fireEvent.click(first2)
fireEvent.click(first2)
fireEvent.click(screen.getByText('头部插入'))
console.log('B 点击后再插:', Array.from(r.container.querySelectorAll('li')).map((li) => li.textContent))
cleanup()
