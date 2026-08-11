import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>计数器</h1>
      <p>当前 count：{count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>{' '}
      <button onClick={() => setCount(0)}>重置</button>
    </div>
  )
}

export default App
