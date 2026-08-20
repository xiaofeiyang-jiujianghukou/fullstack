/**
 * 冒烟脚本：直接调 round() 逻辑不现实，改为验证「题 4 的 checks 全部能真实运行且返回非空」。
 * 运行：pnpm exec tsx src/quiz/smoke.tsx
 */
import './dom-setup'
import React from 'react'
import { render, fireEvent, screen, cleanup } from '@testing-library/react'
import { ListBad, ListGood } from './q4-components'

const readNames = () => {
  const ul = document.querySelector('ul')!
  return Array.from(ul.querySelectorAll('li')).map((li) => li.textContent!.split('（')[0]!).join(',')
}

// check A：key=index 头部插入
render(<ListBad />)
fireEvent.click(screen.getByText('头部插入'))
const a = readNames()
cleanup()
// check B：key=id 头部插入
render(<ListGood />)
fireEvent.click(screen.getByText('头部插入'))
const b = readNames()
cleanup()

console.log('check A 返回:', a)
console.log('check B 返回:', b)
console.log(a && b ? '冒烟通过 ✓（题 4 两个 check 真实运行正常）' : '冒烟失败 ✗')
