/**
 * jsdom 全局环境设置 —— 在 Node 里模拟 DOM，让 @testing-library/react 能渲染 React。
 *
 * 必须在任何 @testing-library/react 的 import 之前执行（它 import 时就检查 document）。
 * 用法：在入口脚本第一行 `import './dom-setup'`。
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
})

// Node 24 的 navigator 等是只读 getter，用 defineProperty 安全覆盖
const setGlobal = (name: string, value: unknown) => {
  try {
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
  } catch {
    // 某些全局无法覆盖则跳过
  }
}
setGlobal('window', dom.window)
setGlobal('document', dom.window.document)
setGlobal('navigator', dom.window.navigator)
setGlobal('HTMLElement', dom.window.HTMLElement)
setGlobal('Event', dom.window.Event)
setGlobal('MouseEvent', dom.window.MouseEvent)
setGlobal('Node', dom.window.Node)
setGlobal('getComputedStyle', dom.window.getComputedStyle.bind(dom.window))
setGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0) as unknown as number,
)
setGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
